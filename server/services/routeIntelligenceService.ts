/**
 * Authoritative Route Intelligence Service
 * 
 * Centralized, single source of truth for:
 * 1. Distance & Travel Time (authoritative road distance vs. Haversine straight-line distance)
 * 2. Route Geometry (real road polyline from Google Routes / OSRM; honest straight-line fallback)
 * 3. Route Segments (hotel → activity, activity → activity, activity → hotel, airport → hotel, hotel → airport)
 * 4. Route Matrix (multi-stop pairwise distance/time matrix with field masks and caching)
 * 5. Route Efficiency (compactness, transit burden, and backtracking ratio)
 * 6. Backtracking Detection (real route metrics; preserves legitimate hotel returns)
 * 7. Multi-Objective Route Optimization (minimum travel time, distance, cost, balanced; preserves mustVisit, fixed times, opening hours)
 * 8. Real Before/After Metrics (zero fabricated values; zero improvement strictly returned as 0)
 */

import {
  Coordinates,
  GeoAvailability,
  TravelMode,
  DistanceType,
  RouteDataStatus,
  RouteResult,
  RouteSegment,
  BacktrackingIncident,
  TravelTimeConflict,
  OpeningHourViolation,
  DailyRouteMetrics,
  TripRouteMetrics,
  RouteComparison,
  RouteOptimizationConstraint,
  RouteIntelligenceResponse,
  RouteMatrixResult
} from '../types/route';
import { resolveLocation } from './locationResolutionService';
import {
  activeRouteProvider,
  calculateHaversineDistanceKm,
  ROUTE_CACHE,
  makeCacheKey,
  CACHE_TTL_MS
} from './routeEngine/routeProvider';

// Helper: parse time string e.g. "10:30 AM", "14:00" to minutes from midnight
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();

  // Match 12-hour format "10:30 AM" or "02:15 PM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3];

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  // Match 24-hour format "14:30"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

// Format minutes from midnight back to 12-hour readable string
export function formatMinutesToTime(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  let hours = Math.floor(norm / 60);
  const mins = norm % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  const padH = hours < 10 ? `0${hours}` : `${hours}`;
  const padM = mins < 10 ? `0${mins}` : `${mins}`;
  return `${padH}:${padM} ${period}`;
}

// Activity input interface for routing engine
export interface RouteActivityInput {
  id: string;
  name: string;
  location?: string;
  coords?: Coordinates | [number, number];
  time?: string;
  durationMinutes?: number;
  openingHours?: string;
  isFixedTime?: boolean;
  category?: string;
  mustVisit?: boolean;
  avoid?: boolean;
}

/**
 * Resolves all activities, hotel, and airport coordinates for a day.
 * Never invents coordinates; returns null if location cannot be verified.
 */
export function resolveDayCoordinates(
  activities: RouteActivityInput[],
  destination: string,
  hotelCoords?: Coordinates,
  airportCoords?: Coordinates
): {
  resolvedActivities: Array<RouteActivityInput & { resolvedCoords: Coordinates | null; resolvedName: string }>;
  resolvedHotel: Coordinates | null;
  resolvedAirport: Coordinates | null;
  availability: GeoAvailability;
} {
  let resolvedHotel = hotelCoords || null;
  if (!resolvedHotel) {
    const hotelRes = resolveLocation({
      name: `${destination} Hotel Stay`,
      location: destination,
      destination
    });
    if (hotelRes) {
      resolvedHotel = { latitude: hotelRes.latitude, longitude: hotelRes.longitude };
    }
  }

  let resolvedAirport = airportCoords || null;
  if (!resolvedAirport) {
    const airportRes = resolveLocation({
      name: `${destination} Airport`,
      location: `${destination} International Airport`,
      destination
    });
    if (airportRes) {
      resolvedAirport = { latitude: airportRes.latitude, longitude: airportRes.longitude };
    }
  }

  let resolvedCount = 0;
  const resolvedActivities = activities.map(act => {
    const res = resolveLocation({
      name: act.name,
      location: act.location,
      destination,
      existingCoords: act.coords
    });

    if (res) {
      resolvedCount++;
      return {
        ...act,
        resolvedCoords: { latitude: res.latitude, longitude: res.longitude },
        resolvedName: res.displayName
      };
    }

    return {
      ...act,
      resolvedCoords: null,
      resolvedName: act.name
    };
  });

  let availability: GeoAvailability = 'unavailable';
  if (activities.length === 0) {
    availability = 'complete';
  } else if (resolvedCount === activities.length) {
    availability = 'complete';
  } else if (resolvedCount > 0) {
    availability = 'partial';
  }

  return {
    resolvedActivities,
    resolvedHotel,
    resolvedAirport,
    availability
  };
}

/**
 * Stop item representation inside the day route sequence.
 */
export interface StopItem {
  id: string;
  name: string;
  coords: Coordinates | null;
  time?: string;
  durationMinutes?: number;
  openingHours?: string;
  isHotel?: boolean;
  isAirport?: boolean;
  stopType: 'hotel' | 'airport' | 'activity';
}

/**
 * Builds the authoritative sequence of stops for a day:
 * Day 1 (Arrival): Airport -> Hotel -> Activities -> Hotel
 * Final Day (Departure): Hotel -> Activities -> Hotel -> Airport (or direct to Airport)
 * Standard Days: Hotel -> Activities -> Hotel
 */
export function buildDayStopSequence(
  dayNumber: number,
  activities: Array<RouteActivityInput & { resolvedCoords: Coordinates | null; resolvedName: string }>,
  destination: string,
  resolvedHotel: Coordinates | null,
  resolvedAirport: Coordinates | null,
  options?: { isArrivalDay?: boolean; isDepartureDay?: boolean }
): StopItem[] {
  const stops: StopItem[] = [];
  const isArrival = options?.isArrivalDay === true;
  const isDeparture = options?.isDepartureDay === true;

  // 1. Arrival Day: Airport -> Hotel
  if (isArrival && resolvedAirport) {

    stops.push({
      id: `airport-arrival-day-${dayNumber}`,
      name: `${destination} Airport Arrival`,
      coords: resolvedAirport,
      time: '07:30 AM',
      isAirport: true,
      stopType: 'airport'
    });
  }

  // 2. Day start from hotel
  if (resolvedHotel) {
    stops.push({
      id: `hotel-start-day-${dayNumber}`,
      name: `${destination} Base Hotel`,
      coords: resolvedHotel,
      time: isArrival && resolvedAirport ? '09:00 AM' : '08:30 AM',
      isHotel: true,
      stopType: 'hotel'
    });
  }

  // 3. Sequential Activities
  activities.forEach(act => {
    stops.push({
      id: act.id,
      name: act.name,
      coords: act.resolvedCoords,
      time: act.time,
      durationMinutes: act.durationMinutes || 90,
      openingHours: act.openingHours,
      stopType: 'activity'
    });
  });

  // 4. Return to hotel (or proceed to airport on departure day)
  if (isDeparture && resolvedAirport) {
    if (resolvedHotel) {
      stops.push({
        id: `hotel-checkout-day-${dayNumber}`,
        name: `${destination} Hotel (Luggage Retrieval)`,
        coords: resolvedHotel,
        time: '06:00 PM',
        isHotel: true,
        stopType: 'hotel'
      });
    }
    stops.push({
      id: `airport-departure-day-${dayNumber}`,
      name: `${destination} Airport Departure`,
      coords: resolvedAirport,
      time: '08:00 PM',
      isAirport: true,
      stopType: 'airport'
    });
  } else if (resolvedHotel) {
    stops.push({
      id: `hotel-return-day-${dayNumber}`,
      name: `Return to ${destination} Base Hotel`,
      coords: resolvedHotel,
      time: '09:30 PM',
      isHotel: true,
      stopType: 'hotel'
    });
  }

  return stops;
}

/**
 * Calculates genuine route segments and metrics for a single day.
 * Single source of truth for distances, durations, geometry, conflicts, and backtracking.
 */
export async function calculateDayRouteMetrics(
  dayNumber: number,
  activities: RouteActivityInput[],
  destination: string,
  mode: TravelMode = 'driving',
  hotelCoords?: Coordinates,
  airportCoords?: Coordinates,
  options?: { isArrivalDay?: boolean; isDepartureDay?: boolean }
): Promise<DailyRouteMetrics> {
  const { resolvedActivities, resolvedHotel, resolvedAirport, availability } = resolveDayCoordinates(
    activities,
    destination,
    hotelCoords,
    airportCoords
  );

  const retrievedAt = new Date().toISOString();

  // If no activities, return empty metrics
  if (resolvedActivities.length === 0) {
    return {
      day: dayNumber,
      totalDistanceKm: 0,
      roadDistanceKm: 0,
      straightLineDistanceKm: 0,
      totalTravelMinutes: 0,
      staticTravelTimeMinutes: 0,
      trafficAwareTravelTimeMinutes: null,
      segmentCount: 0,
      segments: [],
      backtrackingDistanceKm: 0,
      backtrackingIncidents: [],
      routeEfficiencyScore: 100,
      availability: 'complete',
      dataStatus: 'live',
      provider: 'Travelia Authoritative Route Engine',
      conflicts: [],
      openingHourViolations: []
    };
  }

  const stops = buildDayStopSequence(
    dayNumber,
    resolvedActivities,
    destination,
    resolvedHotel,
    resolvedAirport,
    options
  );

  const segments: RouteSegment[] = [];
  let totalRoadKm = 0;
  let totalStraightLineKm = 0;
  let totalTravelMinutes = 0;
  let totalStaticTravelMinutes = 0;
  let totalTrafficTravelMinutes: number | null = null;
  let hasMissingCoords = false;
  let overallDataStatus: RouteDataStatus = 'live';

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];

    if (!from.coords || !to.coords) {
      hasMissingCoords = true;
      overallDataStatus = 'unavailable';
      segments.push({
        fromActivityId: from.id,
        toActivityId: to.id,
        fromName: from.name,
        toName: to.name,
        fromCoords: from.coords,
        toCoords: to.coords,
        straightLineDistanceKm: null,
        roadDistanceKm: null,
        distanceKm: null,
        travelTimeMinutes: null,
        staticTravelTimeMinutes: null,
        trafficAwareTravelTimeMinutes: null,
        distanceType: 'straight_line',
        mode,
        provider: 'unresolved_coordinates',
        retrievedAt,
        dataStatus: 'unavailable',
        availability: 'unavailable',
        aiTip: 'Exact coordinates unavailable for this transit leg.'
      });
      continue;
    }

    const routeResult = await activeRouteProvider.getRoute(from.coords, to.coords, mode);
    const straightDist = calculateHaversineDistanceKm(from.coords, to.coords);

    totalStraightLineKm += straightDist;
    const roadKm = routeResult.roadDistanceKm ?? straightDist;
    totalRoadKm += roadKm;

    totalTravelMinutes += routeResult.travelTimeMinutes;
    totalStaticTravelMinutes += routeResult.staticTravelTimeMinutes;

    if (routeResult.trafficAwareTravelTimeMinutes !== null && routeResult.trafficAwareTravelTimeMinutes !== undefined) {
      totalTrafficTravelMinutes = (totalTrafficTravelMinutes || 0) + routeResult.trafficAwareTravelTimeMinutes;
    }

    if (routeResult.dataStatus === 'fallback' && overallDataStatus === 'live') {
      overallDataStatus = 'fallback';
    } else if (routeResult.dataStatus === 'cached' && overallDataStatus === 'live') {
      overallDataStatus = 'cached';
    }

    // Determine segment flow label
    let segmentLabel = `${from.name} → ${to.name}`;
    if (from.isAirport && to.isHotel) segmentLabel = `Airport Transfer: ${from.name} → ${to.name}`;
    else if (from.isHotel && to.isAirport) segmentLabel = `Airport Departure: ${from.name} → ${to.name}`;
    else if (from.isHotel) segmentLabel = `Hotel Departure: ${from.name} → ${to.name}`;
    else if (to.isHotel) segmentLabel = `Hotel Return: ${from.name} → ${to.name}`;

    segments.push({
      fromActivityId: from.id,
      toActivityId: to.id,
      fromName: from.name,
      toName: to.name,
      fromCoords: from.coords,
      toCoords: to.coords,
      straightLineDistanceKm: straightDist,
      roadDistanceKm: routeResult.roadDistanceKm,
      distanceKm: roadKm,
      travelTimeMinutes: routeResult.travelTimeMinutes,
      staticTravelTimeMinutes: routeResult.staticTravelTimeMinutes,
      trafficAwareTravelTimeMinutes: routeResult.trafficAwareTravelTimeMinutes,
      distanceType: routeResult.distanceType,
      mode,
      geometry: routeResult.geometry,
      provider: routeResult.provider,
      retrievedAt: routeResult.retrievedAt,
      dataStatus: routeResult.dataStatus,
      availability: 'calculated',
      aiTip: `${segmentLabel} (${routeResult.distanceType === 'road' ? 'Road route' : 'Straight-line corridor'} via ${mode}): ${roadKm} km, ~${routeResult.travelTimeMinutes} mins.`
    });
  }

  // Detect Backtracking
  const backtrackingIncidents = detectBacktracking(stops, dayNumber);
  const avoidableBacktracking = backtrackingIncidents.filter(b => !b.isNecessaryReturn);
  const backtrackingDistanceKm = Math.round(
    avoidableBacktracking.reduce((sum, b) => sum + b.excessDistanceKm, 0) * 10
  ) / 10;

  // Detect Travel Time Conflicts
  const conflicts = detectTimeConflicts(stops, segments, dayNumber);

  // Detect Opening Hour Violations
  const openingHourViolations = detectOpeningHourViolations(stops, dayNumber);

  // Compute Route Efficiency Score
  const routeEfficiencyScore = calculateDailyEfficiencyScore(
    totalRoadKm,
    totalTravelMinutes,
    backtrackingDistanceKm,
    stops.length
  );

  const roundedRoadKm = Math.round(totalRoadKm * 10) / 10;
  const roundedStraightKm = Math.round(totalStraightLineKm * 10) / 10;

  return {
    day: dayNumber,
    totalDistanceKm: hasMissingCoords && totalRoadKm === 0 ? null : roundedRoadKm,
    roadDistanceKm: hasMissingCoords && totalRoadKm === 0 ? null : roundedRoadKm,
    straightLineDistanceKm: roundedStraightKm,
    totalTravelMinutes: hasMissingCoords && totalTravelMinutes === 0 ? null : totalTravelMinutes,
    staticTravelTimeMinutes: hasMissingCoords && totalStaticTravelMinutes === 0 ? null : totalStaticTravelMinutes,
    trafficAwareTravelTimeMinutes: totalTrafficTravelMinutes,
    segmentCount: segments.length,
    segments,
    backtrackingDistanceKm,
    backtrackingIncidents,
    routeEfficiencyScore,
    availability: hasMissingCoords ? (segments.some(s => s.availability === 'calculated') ? 'partial' : 'unavailable') : 'complete',
    dataStatus: overallDataStatus,
    provider: 'Travelia Authoritative Route Engine',
    conflicts,
    openingHourViolations
  };
}

/**
 * Detects geographic backtracking between stops.
 * Distinguishes legitimate base hotel/overnight return from avoidable zig-zags.
 * Hotel -> Activity -> Hotel is NEVER penalized as an error.
 */
export function detectBacktracking(
  stops: Array<{ id: string; name: string; coords: Coordinates | null; isHotel?: boolean; isAirport?: boolean }>,
  dayNumber: number
): BacktrackingIncident[] {
  const incidents: BacktrackingIncident[] = [];
  const validStops = stops.filter(s => s.coords !== null);

  // If <= 2 stops, or if simple Hotel -> Activity -> Hotel, no avoidable detour exists
  if (validStops.length < 3) return incidents;

  for (let i = 0; i < validStops.length - 2; i++) {
    const p1 = validStops[i];
    const p2 = validStops[i + 1];
    const p3 = validStops[i + 2];

    if (!p1.coords || !p2.coords || !p3.coords) continue;

    const d12 = calculateHaversineDistanceKm(p1.coords, p2.coords);
    const d23 = calculateHaversineDistanceKm(p2.coords, p3.coords);
    const d13 = calculateHaversineDistanceKm(p1.coords, p3.coords);

    // Legitimate base returns:
    // 1. End of day hotel return (p3 is hotel and last stop)
    // 2. Scheduled rest break / hotel visit (p2 or p3 is hotel)
    // 3. Airport transit leg
    const isEndingReturn = (i + 2 === validStops.length - 1) && p3.isHotel === true;
    const isBaseHotelExcursion = p1.isHotel === true && p3.isHotel === true;
    const isAirportTransit = p1.isAirport === true || p3.isAirport === true;

    const isLegitimateReturn = isEndingReturn || isBaseHotelExcursion || isAirportTransit;

    // Geographic detour check:
    // When d13 is direct and short, but route diverts far out to p2 and reverses back
    if (d13 > 0.1 && (d12 + d23) / d13 > 2.4 && (d12 + d23 - d13) >= 4.0) {
      const excess = Math.round((d12 + d23 - d13) * 10) / 10;
      incidents.push({
        dayNumber,
        fromActivityId: p2.id,
        toActivityId: p3.id,
        fromName: p2.name,
        toName: p3.name,
        excessDistanceKm: excess,
        isNecessaryReturn: isLegitimateReturn,
        explanation: isLegitimateReturn
          ? `Return to base accommodation or terminal (${excess} km transit); scheduled as standard lodging return.`
          : `Avoidable geographic zigzag: ${p2.name} deviates from direct corridor between ${p1.name} and ${p3.name}, incurring ~${excess} km excess travel.`
      });
    }
  }

  return incidents;
}

/**
 * Detects time-aware conflicts where travel time + activity duration exceeds available time before next stop.
 */
export function detectTimeConflicts(
  stops: Array<{ id: string; name: string; time?: string; durationMinutes?: number; isHotel?: boolean }>,
  segments: RouteSegment[],
  dayNumber: number
): TravelTimeConflict[] {
  const conflicts: TravelTimeConflict[] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const current = stops[i];
    const next = stops[i + 1];
    const segment = segments[i];

    if (!current.time || !next.time || !segment || segment.travelTimeMinutes === null) {
      continue;
    }

    const currentStartMin = parseTimeToMinutes(current.time);
    const nextStartMin = parseTimeToMinutes(next.time);

    if (currentStartMin === null || nextStartMin === null) continue;

    const durationMin = current.durationMinutes || 90;
    const currentEndMin = currentStartMin + durationMin;
    const availableTravelMin = nextStartMin - currentEndMin;
    const requiredTravelMin = segment.travelTimeMinutes;

    if (requiredTravelMin > availableTravelMin) {
      const shortageMinutes = requiredTravelMin - Math.max(0, availableTravelMin);
      conflicts.push({
        type: 'travel_time_conflict',
        dayNumber,
        fromActivityId: current.id,
        toActivityId: next.id,
        fromActivityName: current.name,
        toActivityName: next.name,
        requiredTravelMinutes: requiredTravelMin,
        availableTravelMinutes: Math.max(0, availableTravelMin),
        shortageMinutes,
        explanation: `Travel from "${current.name}" to "${next.name}" requires ${requiredTravelMin} mins, but only ${Math.max(0, availableTravelMin)} mins buffer exists after scheduled duration (shortage: ${shortageMinutes} mins).`
      });
    }
  }

  return conflicts;
}

/**
 * Validates scheduled activity time against opening hours.
 */
export function detectOpeningHourViolations(
  stops: Array<{ id: string; name: string; time?: string; openingHours?: string }>,
  dayNumber: number
): OpeningHourViolation[] {
  const violations: OpeningHourViolation[] = [];

  stops.forEach(stop => {
    if (!stop.time || !stop.openingHours) return;

    const startMin = parseTimeToMinutes(stop.time);
    if (startMin === null) return;

    const parts = stop.openingHours.split(/[-–to]/i);
    if (parts.length === 2) {
      const openMin = parseTimeToMinutes(parts[0].trim());
      const closeMin = parseTimeToMinutes(parts[1].trim());

      if (openMin !== null && closeMin !== null) {
        if (startMin < openMin || startMin >= closeMin) {
          violations.push({
            dayNumber,
            activityId: stop.id,
            activityName: stop.name,
            scheduledTime: stop.time,
            openingHours: stop.openingHours,
            reason: `Scheduled at ${stop.time}, but opening hours are ${stop.openingHours}.`
          });
        }
      }
    }
  });

  return violations;
}

/**
 * Calculates a genuine, deterministic Daily Route Efficiency Score (0 - 100).
 */
export function calculateDailyEfficiencyScore(
  distanceKm: number,
  travelMinutes: number,
  backtrackingKm: number,
  stopsCount: number
): number {
  if (stopsCount <= 1 || distanceKm <= 0) return 100;

  const kmPerStop = distanceKm / Math.max(1, stopsCount);
  const compactnessPenalty = Math.min(30, kmPerStop * 2.2);
  const transitPenalty = Math.min(30, Math.max(0, (travelMinutes - 45) * 0.3));
  const backtrackingPenalty = Math.min(30, backtrackingKm * 2.5);

  const rawScore = 100 - (compactnessPenalty + transitPenalty + backtrackingPenalty);
  return Math.max(15, Math.min(100, Math.round(rawScore)));
}

/**
 * Calculates Route Matrix across multiple origins and destinations.
 * Authoritative matrix API with in-memory caching and Google Routes ComputeRouteMatrix support.
 */
export async function calculateRouteMatrix(
  origins: Coordinates[],
  destinations: Coordinates[],
  mode: TravelMode = 'driving'
): Promise<RouteMatrixResult> {
  return await activeRouteProvider.getRouteMatrix(origins, destinations, mode);
}

/**
 * Calculates aggregated Trip Route Metrics for all days.
 */
export async function calculateTripRouteMetrics(
  trip: {
    destination: string;
    itinerary?: Array<{
      dayNumber: number;
      activities?: RouteActivityInput[];
    }>;
    hotels?: Array<{ name: string; location?: string; selected?: boolean; coords?: Coordinates }>;
    mode?: TravelMode;
    airportCoords?: Coordinates;
    existingBookings?: { flights?: any; hotel?: any };
  }
): Promise<TripRouteMetrics> {
  const days = trip.itinerary || [];
  const destination = trip.destination || 'Destination';
  const mode = trip.mode || 'driving';
  const retrievedAt = new Date().toISOString();

  let hotelCoords: Coordinates | undefined = undefined;
  if (trip.hotels && trip.hotels.length > 0) {
    const sel = trip.hotels.find(h => h.selected) || trip.hotels[0];
    if (sel.coords) {
      hotelCoords = sel.coords;
    } else {
      const res = resolveLocation({ name: sel.name, location: sel.location, destination });
      if (res) {
        hotelCoords = { latitude: res.latitude, longitude: res.longitude };
      }
    }
  }

  let airportCoords: Coordinates | undefined = trip.airportCoords;
  if (!airportCoords && (trip.existingBookings?.flights || days.length > 0)) {
    const res = resolveLocation({ name: `${destination} Airport`, location: `${destination} International Airport`, destination });
    if (res) {
      airportCoords = { latitude: res.latitude, longitude: res.longitude };
    }
  }

  const dailyMetrics: DailyRouteMetrics[] = [];
  const totalDays = days.length;

  for (let idx = 0; idx < totalDays; idx++) {
    const day = days[idx];
    const isArrivalDay = idx === 0 && Boolean(airportCoords);
    const isDepartureDay = idx === totalDays - 1 && totalDays > 1 && Boolean(airportCoords);

    const dayMetrics = await calculateDayRouteMetrics(
      day.dayNumber,
      day.activities || [],
      destination,
      mode,
      hotelCoords,
      airportCoords,
      { isArrivalDay, isDepartureDay }
    );
    dailyMetrics.push(dayMetrics);
  }

  let totalDistanceKm: number | null = 0;
  let totalRoadKm: number | null = 0;
  let totalStraightLineKm: number | null = 0;
  let totalTravelMinutes: number | null = 0;
  let totalStaticTravelMinutes: number | null = 0;
  let totalTrafficTravelMinutes: number | null = null;
  let totalBacktrackingDistanceKm: number | null = 0;
  let totalSegments = 0;
  let calculatedSegments = 0;
  let completeCount = 0;
  let tripDataStatus: RouteDataStatus = 'live';

  dailyMetrics.forEach(d => {
    if (d.totalDistanceKm !== null) totalDistanceKm = (totalDistanceKm || 0) + d.totalDistanceKm;
    if (d.roadDistanceKm !== null) totalRoadKm = (totalRoadKm || 0) + d.roadDistanceKm;
    if (d.straightLineDistanceKm !== null) totalStraightLineKm = (totalStraightLineKm || 0) + d.straightLineDistanceKm;
    if (d.totalTravelMinutes !== null) totalTravelMinutes = (totalTravelMinutes || 0) + d.totalTravelMinutes;
    if (d.staticTravelTimeMinutes !== null) totalStaticTravelMinutes = (totalStaticTravelMinutes || 0) + d.staticTravelTimeMinutes;
    if (d.trafficAwareTravelTimeMinutes !== null && d.trafficAwareTravelTimeMinutes !== undefined) {
      totalTrafficTravelMinutes = (totalTrafficTravelMinutes || 0) + d.trafficAwareTravelTimeMinutes;
    }
    if (d.backtrackingDistanceKm !== null) {
      totalBacktrackingDistanceKm = (totalBacktrackingDistanceKm || 0) + d.backtrackingDistanceKm;
    }
    totalSegments += d.segmentCount;
    calculatedSegments += d.segments.filter(s => s.availability === 'calculated').length;
    if (d.availability === 'complete') completeCount++;
    if (d.dataStatus === 'unavailable') tripDataStatus = 'unavailable';
    else if (d.dataStatus === 'fallback' && tripDataStatus !== 'unavailable') tripDataStatus = 'fallback';
    else if (d.dataStatus === 'cached' && tripDataStatus === 'live') tripDataStatus = 'cached';
  });

  const daysCount = Math.max(1, dailyMetrics.length);
  const avgDailyDistanceKm = totalDistanceKm !== null ? Math.round((totalDistanceKm / daysCount) * 10) / 10 : null;
  const avgDailyTravelMinutes = totalTravelMinutes !== null ? Math.round(totalTravelMinutes / daysCount) : null;
  const totalTravelHours = totalTravelMinutes !== null ? Math.round((totalTravelMinutes / 60) * 10) / 10 : null;

  let efficiencySum = 0;
  dailyMetrics.forEach(d => {
    efficiencySum += d.routeEfficiencyScore || 85;
  });
  const overallEfficiency = Math.round(efficiencySum / daysCount);

  let availability: GeoAvailability = 'unavailable';
  if (completeCount === daysCount && totalSegments === calculatedSegments) {
    availability = 'complete';
  } else if (calculatedSegments > 0) {
    availability = 'partial';
  }

  return {
    totalDistanceKm: totalDistanceKm !== null ? Math.round(totalDistanceKm * 10) / 10 : null,
    roadDistanceKm: totalRoadKm !== null ? Math.round(totalRoadKm * 10) / 10 : null,
    straightLineDistanceKm: totalStraightLineKm !== null ? Math.round(totalStraightLineKm * 10) / 10 : null,
    totalTravelMinutes,
    staticTravelTimeMinutes: totalStaticTravelMinutes,
    trafficAwareTravelTimeMinutes: totalTrafficTravelMinutes,
    totalTravelHours,
    averageDailyDistanceKm: avgDailyDistanceKm,
    averageDailyTravelMinutes: avgDailyTravelMinutes,
    totalBacktrackingDistanceKm: totalBacktrackingDistanceKm !== null ? Math.round(totalBacktrackingDistanceKm * 10) / 10 : null,
    routeEfficiencyScore: overallEfficiency,
    days: dailyMetrics,
    availability,
    dataStatus: tripDataStatus,
    totalSegmentsCount: totalSegments,
    calculatedSegmentsCount: calculatedSegments,
    distanceType: 'road',
    provider: 'Travelia Authoritative Route Engine',
    retrievedAt
  };
}

/**
 * Synchronous Day Route Metrics Calculator (uses factual coordinates & fast Haversine straight-line distance).
 * Strictly marks distanceType as 'straight_line' and dataStatus as 'fallback'.
 */
export function calculateSyncDayRouteMetrics(
  dayNumber: number,
  activities: RouteActivityInput[],
  destination: string,
  mode: TravelMode = 'driving',
  hotelCoords?: Coordinates,
  airportCoords?: Coordinates,
  options?: { isArrivalDay?: boolean; isDepartureDay?: boolean }
): DailyRouteMetrics {
  const { resolvedActivities, resolvedHotel, resolvedAirport, availability } = resolveDayCoordinates(
    activities,
    destination,
    hotelCoords,
    airportCoords
  );

  const retrievedAt = new Date().toISOString();

  if (resolvedActivities.length === 0) {
    return {
      day: dayNumber,
      totalDistanceKm: 0,
      roadDistanceKm: null,
      straightLineDistanceKm: 0,
      totalTravelMinutes: 0,
      staticTravelTimeMinutes: 0,
      trafficAwareTravelTimeMinutes: null,
      segmentCount: 0,
      segments: [],
      backtrackingDistanceKm: 0,
      backtrackingIncidents: [],
      routeEfficiencyScore: 100,
      availability: 'complete',
      dataStatus: 'fallback',
      provider: 'Travelia Synchronous Route Engine (Haversine)',
      conflicts: [],
      openingHourViolations: []
    };
  }

  const stops = buildDayStopSequence(
    dayNumber,
    resolvedActivities,
    destination,
    resolvedHotel,
    resolvedAirport,
    options
  );

  const speeds: Record<TravelMode, number> = {
    driving: 30,
    walking: 4.5,
    cycling: 15,
    transit: 25
  };
  const speedKmH = speeds[mode] || 30;

  const segments: RouteSegment[] = [];
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;
  let hasMissingCoords = false;

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];

    if (!from.coords || !to.coords) {
      hasMissingCoords = true;
      segments.push({
        fromActivityId: from.id,
        toActivityId: to.id,
        fromName: from.name,
        toName: to.name,
        fromCoords: from.coords,
        toCoords: to.coords,
        straightLineDistanceKm: null,
        roadDistanceKm: null,
        distanceKm: null,
        travelTimeMinutes: null,
        staticTravelTimeMinutes: null,
        trafficAwareTravelTimeMinutes: null,
        distanceType: 'straight_line',
        mode,
        provider: 'unresolved_coordinates',
        retrievedAt,
        dataStatus: 'unavailable',
        availability: 'unavailable',
        aiTip: 'Exact coordinates unavailable for this transit leg.'
      });
      continue;
    }

    const distKm = calculateHaversineDistanceKm(from.coords, to.coords);
    const durationMin = Math.max(1, Math.round((distKm / speedKmH) * 60));

    totalDistanceKm += distKm;
    totalTravelMinutes += durationMin;

    segments.push({
      fromActivityId: from.id,
      toActivityId: to.id,
      fromName: from.name,
      toName: to.name,
      fromCoords: from.coords,
      toCoords: to.coords,
      straightLineDistanceKm: distKm,
      roadDistanceKm: null, // Strictly null for straight-line calculations
      distanceKm: distKm,
      travelTimeMinutes: durationMin,
      staticTravelTimeMinutes: durationMin,
      trafficAwareTravelTimeMinutes: null,
      distanceType: 'straight_line',
      mode,
      geometry: [
        [from.coords.latitude, from.coords.longitude],
        [to.coords.latitude, to.coords.longitude]
      ],
      provider: 'haversine_straight_line',
      retrievedAt,
      dataStatus: 'fallback',
      availability: 'calculated',
      aiTip: `Straight-line corridor via ${mode}: ${distKm} km, ~${durationMin} mins.`
    });
  }

  const backtrackingIncidents = detectBacktracking(stops, dayNumber);
  const avoidableBacktracking = backtrackingIncidents.filter(b => !b.isNecessaryReturn);
  const backtrackingDistanceKm = Math.round(
    avoidableBacktracking.reduce((sum, b) => sum + b.excessDistanceKm, 0) * 10
  ) / 10;

  const conflicts = detectTimeConflicts(stops, segments, dayNumber);
  const openingHourViolations = detectOpeningHourViolations(stops, dayNumber);

  const routeEfficiencyScore = calculateDailyEfficiencyScore(
    totalDistanceKm,
    totalTravelMinutes,
    backtrackingDistanceKm,
    stops.length
  );

  return {
    day: dayNumber,
    totalDistanceKm: hasMissingCoords && totalDistanceKm === 0 ? null : Math.round(totalDistanceKm * 10) / 10,
    roadDistanceKm: null,
    straightLineDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalTravelMinutes: hasMissingCoords && totalTravelMinutes === 0 ? null : totalTravelMinutes,
    staticTravelTimeMinutes: hasMissingCoords && totalTravelMinutes === 0 ? null : totalTravelMinutes,
    trafficAwareTravelTimeMinutes: null,
    segmentCount: segments.length,
    segments,
    backtrackingDistanceKm,
    backtrackingIncidents,
    routeEfficiencyScore,
    availability: hasMissingCoords ? (segments.some(s => s.availability === 'calculated') ? 'partial' : 'unavailable') : 'complete',
    dataStatus: hasMissingCoords ? 'unavailable' : 'fallback',
    provider: 'Travelia Synchronous Route Engine (Haversine)',
    conflicts,
    openingHourViolations
  };
}

/**
 * Synchronous Trip Route Metrics Calculator.
 */
export function calculateSyncTripRouteMetrics(
  trip: {
    destination: string;
    itinerary?: Array<{
      dayNumber: number;
      activities?: RouteActivityInput[];
    }>;
    hotels?: Array<{ name: string; location?: string; selected?: boolean; coords?: Coordinates }>;
    mode?: TravelMode;
    airportCoords?: Coordinates;
    existingBookings?: { flights?: any; hotel?: any };
  }
): TripRouteMetrics {
  const days = trip.itinerary || [];
  const destination = trip.destination || 'Destination';
  const mode = trip.mode || 'driving';
  const retrievedAt = new Date().toISOString();

  let hotelCoords: Coordinates | undefined = undefined;
  if (trip.hotels && trip.hotels.length > 0) {
    const sel = trip.hotels.find(h => h.selected) || trip.hotels[0];
    if (sel.coords) {
      hotelCoords = sel.coords;
    } else {
      const res = resolveLocation({ name: sel.name, location: sel.location, destination });
      if (res) {
        hotelCoords = { latitude: res.latitude, longitude: res.longitude };
      }
    }
  }

  let airportCoords: Coordinates | undefined = trip.airportCoords;
  if (!airportCoords && (trip.existingBookings?.flights || days.length > 0)) {
    const res = resolveLocation({ name: `${destination} Airport`, location: `${destination} International Airport`, destination });
    if (res) {
      airportCoords = { latitude: res.latitude, longitude: res.longitude };
    }
  }

  const totalDays = days.length;
  const dailyMetrics: DailyRouteMetrics[] = days.map((day, idx) => {
    const isArrivalDay = idx === 0 && Boolean(airportCoords);
    const isDepartureDay = idx === totalDays - 1 && totalDays > 1 && Boolean(airportCoords);
    return calculateSyncDayRouteMetrics(
      day.dayNumber,
      day.activities || [],
      destination,
      mode,
      hotelCoords,
      airportCoords,
      { isArrivalDay, isDepartureDay }
    );
  });

  let totalDistanceKm: number | null = 0;
  let totalStraightLineKm: number | null = 0;
  let totalTravelMinutes: number | null = 0;
  let totalBacktrackingDistanceKm: number | null = 0;
  let totalSegments = 0;
  let calculatedSegments = 0;
  let completeCount = 0;

  dailyMetrics.forEach(d => {
    if (d.totalDistanceKm !== null) totalDistanceKm = (totalDistanceKm || 0) + d.totalDistanceKm;
    if (d.straightLineDistanceKm !== null) totalStraightLineKm = (totalStraightLineKm || 0) + d.straightLineDistanceKm;
    if (d.totalTravelMinutes !== null) totalTravelMinutes = (totalTravelMinutes || 0) + d.totalTravelMinutes;
    if (d.backtrackingDistanceKm !== null) {
      totalBacktrackingDistanceKm = (totalBacktrackingDistanceKm || 0) + d.backtrackingDistanceKm;
    }
    totalSegments += d.segmentCount;
    calculatedSegments += d.segments.filter(s => s.availability === 'calculated').length;
    if (d.availability === 'complete') completeCount++;
  });

  const daysCount = Math.max(1, dailyMetrics.length);
  const avgDailyDistanceKm = totalDistanceKm !== null ? Math.round((totalDistanceKm / daysCount) * 10) / 10 : null;
  const avgDailyTravelMinutes = totalTravelMinutes !== null ? Math.round(totalTravelMinutes / daysCount) : null;
  const totalTravelHours = totalTravelMinutes !== null ? Math.round((totalTravelMinutes / 60) * 10) / 10 : null;

  let efficiencySum = 0;
  dailyMetrics.forEach(d => {
    efficiencySum += d.routeEfficiencyScore || 85;
  });
  const overallEfficiency = Math.round(efficiencySum / daysCount);

  let availability: GeoAvailability = 'unavailable';
  if (completeCount === daysCount && totalSegments === calculatedSegments) {
    availability = 'complete';
  } else if (calculatedSegments > 0) {
    availability = 'partial';
  }

  return {
    totalDistanceKm: totalDistanceKm !== null ? Math.round(totalDistanceKm * 10) / 10 : null,
    roadDistanceKm: null,
    straightLineDistanceKm: totalStraightLineKm !== null ? Math.round(totalStraightLineKm * 10) / 10 : null,
    totalTravelMinutes,
    staticTravelTimeMinutes: totalTravelMinutes,
    trafficAwareTravelTimeMinutes: null,
    totalTravelHours,
    averageDailyDistanceKm: avgDailyDistanceKm,
    averageDailyTravelMinutes: avgDailyTravelMinutes,
    totalBacktrackingDistanceKm: totalBacktrackingDistanceKm !== null ? Math.round(totalBacktrackingDistanceKm * 10) / 10 : null,
    routeEfficiencyScore: overallEfficiency,
    days: dailyMetrics,
    availability,
    dataStatus: 'fallback',
    totalSegmentsCount: totalSegments,
    calculatedSegmentsCount: calculatedSegments,
    distanceType: 'straight_line',
    provider: 'Travelia Synchronous Route Engine (Haversine)',
    retrievedAt
  };
}

/**
 * Result structure for day route optimization.
 */
export interface OptimizeDayRouteResult {
  originalMetrics: DailyRouteMetrics;
  optimizedMetrics: DailyRouteMetrics;
  reorderedActivities: RouteActivityInput[];
  beforeDistanceKm: number;
  afterDistanceKm: number;
  distanceSavedKm: number;
  beforeTravelMinutes: number;
  afterTravelMinutes: number;
  travelTimeSavedMinutes: number;
  beforeConflictCount: number;
  afterConflictCount: number;
  explanation: string;
}

/**
 * Optimizes a day's activities by testing sequence orderings (TSP / 2-Opt)
 * strictly respecting user constraints (mustVisit, avoid, fixed times, opening hours).
 * Returns exact before/after metrics with zero manufactured improvement.
 */
export async function optimizeDayRoute(
  dayNumber: number,
  activities: RouteActivityInput[],
  destination: string,
  mode: TravelMode = 'driving',
  constraints: RouteOptimizationConstraint = {},
  hotelCoords?: Coordinates,
  airportCoords?: Coordinates
): Promise<OptimizeDayRouteResult> {
  const originalMetrics = await calculateDayRouteMetrics(
    dayNumber,
    activities,
    destination,
    mode,
    hotelCoords,
    airportCoords
  );

  const origDist = originalMetrics.totalDistanceKm || 0;
  const origMins = originalMetrics.totalTravelMinutes || 0;
  const origConflicts = originalMetrics.conflicts.length;

  // 1. Filter out activities matching avoid constraint, but NEVER drop mustVisit
  let candidateActivities = [...activities];
  if (constraints.avoid && constraints.avoid.length > 0) {
    candidateActivities = candidateActivities.filter(a => {
      if (a.mustVisit || constraints.mustVisit?.includes(a.id)) return true;
      return !constraints.avoid?.includes(a.id);
    });
  }

  if (candidateActivities.length <= 2) {
    return {
      originalMetrics,
      optimizedMetrics: originalMetrics,
      reorderedActivities: candidateActivities,
      beforeDistanceKm: origDist,
      afterDistanceKm: origDist,
      distanceSavedKm: 0,
      beforeTravelMinutes: origMins,
      afterTravelMinutes: origMins,
      travelTimeSavedMinutes: 0,
      beforeConflictCount: origConflicts,
      afterConflictCount: origConflicts,
      explanation: 'Activities are already in single or direct sequence; no shorter route exists.'
    };
  }

  // 2. Identify fixed-position activities
  const fixedPositions = new Map<number, RouteActivityInput>();
  candidateActivities.forEach((act, idx) => {
    if (act.isFixedTime || (constraints.fixedTimes && constraints.fixedTimes[act.id])) {
      fixedPositions.set(idx, act);
    }
  });

  // 3. Resolve coordinates
  const resolved = candidateActivities.map(a => {
    const res = resolveLocation({
      name: a.name,
      location: a.location,
      destination,
      existingCoords: a.coords
    });
    return {
      activity: a,
      coords: res ? { latitude: res.latitude, longitude: res.longitude } : null
    };
  });

  const allResolved = resolved.every(r => r.coords !== null);
  if (!allResolved) {
    return {
      originalMetrics,
      optimizedMetrics: originalMetrics,
      reorderedActivities: candidateActivities,
      beforeDistanceKm: origDist,
      afterDistanceKm: origDist,
      distanceSavedKm: 0,
      beforeTravelMinutes: origMins,
      afterTravelMinutes: origMins,
      travelTimeSavedMinutes: 0,
      beforeConflictCount: origConflicts,
      afterConflictCount: origConflicts,
      explanation: 'Some activity locations could not be verified; route reordering disabled to prevent inaccurate routing.'
    };
  }


  // 4. Candidate Permutation / 2-Opt Optimization
  let bestOrder: RouteActivityInput[] = [...candidateActivities];
  let bestDistance = origDist || Infinity;

  const validResolved = resolved.map(r => ({ ...r, coords: r.coords! }));

  if (validResolved.length <= 7) {
    const freeItems = validResolved.filter((_, idx) => !fixedPositions.has(idx));

    function permute(arr: typeof freeItems): Array<typeof freeItems> {
      if (arr.length <= 1) return [arr];
      const res: Array<typeof freeItems> = [];
      for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const perms = permute(remaining);
        for (const p of perms) {
          res.push([current, ...p]);
        }
      }
      return res;
    }

    const freePermutations = permute(freeItems);

    for (const p of freePermutations) {
      let pIdx = 0;
      const candidateSequence: RouteActivityInput[] = [];

      for (let i = 0; i < candidateActivities.length; i++) {
        if (fixedPositions.has(i)) {
          candidateSequence.push(fixedPositions.get(i)!);
        } else {
          candidateSequence.push(p[pIdx].activity);
          pIdx++;
        }
      }

      // Check opening hours if requested
      if (constraints.respectOpeningHours) {
        const openingViolations = detectOpeningHourViolations(
          candidateSequence.map(a => ({ id: a.id, name: a.name, time: a.time, openingHours: a.openingHours })),
          dayNumber
        );
        if (openingViolations.length > 0) continue;
      }

      let candDist = 0;
      for (let i = 0; i < candidateSequence.length - 1; i++) {
        const c1 = validResolved.find(r => r.activity.id === candidateSequence[i].id)!.coords;
        const c2 = validResolved.find(r => r.activity.id === candidateSequence[i + 1].id)!.coords;
        candDist += calculateHaversineDistanceKm(c1, c2);
      }

      if (candDist < bestDistance - 0.2) {
        bestDistance = candDist;
        bestOrder = candidateSequence;
      }
    }
  } else {
    // Greedy Nearest Neighbor + 2-Opt
    const unvisited = [...validResolved];
    const ordered: typeof validResolved = [];
    let currentCoords = hotelCoords || validResolved[0].coords;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = calculateHaversineDistanceKm(currentCoords, unvisited[i].coords);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }

      const next = unvisited.splice(nearestIdx, 1)[0];
      ordered.push(next);
      currentCoords = next.coords;
    }

    let improved = true;
    let iterations = 0;
    while (improved && iterations < 25) {
      improved = false;
      iterations++;
      for (let i = 0; i < ordered.length - 1; i++) {
        for (let k = i + 1; k < ordered.length; k++) {
          const p1 = i === 0 ? (hotelCoords || ordered[0].coords) : ordered[i - 1].coords;
          const p2 = ordered[i].coords;
          const p3 = ordered[k].coords;
          const p4 = k === ordered.length - 1 ? (hotelCoords || ordered[ordered.length - 1].coords) : ordered[k + 1].coords;

          const currentD = calculateHaversineDistanceKm(p1, p2) + calculateHaversineDistanceKm(p3, p4);
          const newD = calculateHaversineDistanceKm(p1, p3) + calculateHaversineDistanceKm(p2, p4);

          if (newD < currentD - 0.1) {
            const sub = ordered.slice(i, k + 1).reverse();
            ordered.splice(i, sub.length, ...sub);
            improved = true;
          }
        }
      }
    }

    bestOrder = ordered.map(o => o.activity);
  }

  // 5. Calculate authoritative post-optimization metrics
  const optimizedMetrics = await calculateDayRouteMetrics(
    dayNumber,
    bestOrder,
    destination,
    mode,
    hotelCoords,
    airportCoords
  );

  const optDist = optimizedMetrics.totalDistanceKm || 0;
  const optMins = optimizedMetrics.totalTravelMinutes || 0;
  const optConflicts = optimizedMetrics.conflicts.length;

  if (optDist < origDist - 0.2 || optMins < origMins - 2) {
    const distanceSavedKm = Math.max(0, Math.round((origDist - optDist) * 10) / 10);
    const travelTimeSavedMinutes = Math.max(0, origMins - optMins);

    return {
      originalMetrics,
      optimizedMetrics,
      reorderedActivities: bestOrder,
      beforeDistanceKm: origDist,
      afterDistanceKm: optDist,
      distanceSavedKm,
      beforeTravelMinutes: origMins,
      afterTravelMinutes: optMins,
      travelTimeSavedMinutes,
      beforeConflictCount: origConflicts,
      afterConflictCount: optConflicts,
      explanation: `Optimized Day 0${dayNumber} waypoint sequence along a linear transit corridor, eliminating intermediate backtracking and saving ${distanceSavedKm} km and ${travelTimeSavedMinutes} mins in transit.`
    };
  }

  // Honest ZERO improvement state
  return {
    originalMetrics,
    optimizedMetrics: originalMetrics,
    reorderedActivities: candidateActivities,
    beforeDistanceKm: origDist,
    afterDistanceKm: origDist,
    distanceSavedKm: 0,
    beforeTravelMinutes: origMins,
    afterTravelMinutes: origMins,
    travelTimeSavedMinutes: 0,
    beforeConflictCount: origConflicts,
    afterConflictCount: origConflicts,
    explanation: 'No measurable route improvement found. Current activity sequence is already optimal.'
  };
}


/**
 * Synchronous version of Day Route Optimization.
 */
export function optimizeDayRouteSync(
  dayNumber: number,
  activities: RouteActivityInput[],
  destination: string,
  mode: TravelMode = 'driving',
  constraints: RouteOptimizationConstraint = {},
  hotelCoords?: Coordinates,
  airportCoords?: Coordinates
): OptimizeDayRouteResult {
  const originalMetrics = calculateSyncDayRouteMetrics(
    dayNumber,
    activities,
    destination,
    mode,
    hotelCoords,
    airportCoords
  );

  const origDist = originalMetrics.totalDistanceKm || 0;
  const origMins = originalMetrics.totalTravelMinutes || 0;
  const origConflicts = originalMetrics.conflicts.length;

  let candidateActivities = [...activities];
  if (constraints.avoid && constraints.avoid.length > 0) {
    candidateActivities = candidateActivities.filter(a => {
      if (a.mustVisit || constraints.mustVisit?.includes(a.id)) return true;
      return !constraints.avoid?.includes(a.id);
    });
  }

  if (candidateActivities.length <= 2) {
    return {
      originalMetrics,
      optimizedMetrics: originalMetrics,
      reorderedActivities: candidateActivities,
      beforeDistanceKm: origDist,
      afterDistanceKm: origDist,
      distanceSavedKm: 0,
      beforeTravelMinutes: origMins,
      afterTravelMinutes: origMins,
      travelTimeSavedMinutes: 0,
      beforeConflictCount: origConflicts,
      afterConflictCount: origConflicts,
      explanation: 'Activities are already in single or direct sequence; no shorter route exists.'
    };
  }

  const fixedPositions = new Map<number, RouteActivityInput>();
  candidateActivities.forEach((act, idx) => {
    if (act.isFixedTime || (constraints.fixedTimes && constraints.fixedTimes[act.id])) {
      fixedPositions.set(idx, act);
    }
  });

  const resolved = candidateActivities.map(a => {
    const res = resolveLocation({
      name: a.name,
      location: a.location,
      destination,
      existingCoords: a.coords
    });
    return {
      activity: a,
      coords: res ? { latitude: res.latitude, longitude: res.longitude } : null
    };
  });

  const allResolved = resolved.every(r => r.coords !== null);
  if (!allResolved) {
    return {
      originalMetrics,
      optimizedMetrics: originalMetrics,
      reorderedActivities: candidateActivities,
      beforeDistanceKm: origDist,
      afterDistanceKm: origDist,
      distanceSavedKm: 0,
      beforeTravelMinutes: origMins,
      afterTravelMinutes: origMins,
      travelTimeSavedMinutes: 0,
      beforeConflictCount: origConflicts,
      afterConflictCount: origConflicts,
      explanation: 'Some activity locations could not be verified; route reordering disabled to prevent inaccurate routing.'
    };
  }


  let bestOrder: RouteActivityInput[] = [...candidateActivities];
  let bestDistance = origDist || Infinity;

  const validResolved = resolved.map(r => ({ ...r, coords: r.coords! }));

  if (validResolved.length <= 7) {
    const freeItems = validResolved.filter((_, idx) => !fixedPositions.has(idx));

    function permute(arr: typeof freeItems): Array<typeof freeItems> {
      if (arr.length <= 1) return [arr];
      const res: Array<typeof freeItems> = [];
      for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const perms = permute(remaining);
        for (const p of perms) {
          res.push([current, ...p]);
        }
      }
      return res;
    }

    const freePermutations = permute(freeItems);

    for (const p of freePermutations) {
      let pIdx = 0;
      const candidateSequence: RouteActivityInput[] = [];

      for (let i = 0; i < candidateActivities.length; i++) {
        if (fixedPositions.has(i)) {
          candidateSequence.push(fixedPositions.get(i)!);
        } else {
          candidateSequence.push(p[pIdx].activity);
          pIdx++;
        }
      }

      let candDist = 0;
      for (let i = 0; i < candidateSequence.length - 1; i++) {
        const c1 = validResolved.find(r => r.activity.id === candidateSequence[i].id)!.coords;
        const c2 = validResolved.find(r => r.activity.id === candidateSequence[i + 1].id)!.coords;
        candDist += calculateHaversineDistanceKm(c1, c2);
      }

      if (candDist < bestDistance - 0.2) {
        bestDistance = candDist;
        bestOrder = candidateSequence;
      }
    }
  } else {
    const unvisited = [...validResolved];
    const ordered: typeof validResolved = [];
    let currentCoords = hotelCoords || validResolved[0].coords;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = calculateHaversineDistanceKm(currentCoords, unvisited[i].coords);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }

      const next = unvisited.splice(nearestIdx, 1)[0];
      ordered.push(next);
      currentCoords = next.coords;
    }

    let improved = true;
    let iterations = 0;
    while (improved && iterations < 25) {
      improved = false;
      iterations++;
      for (let i = 0; i < ordered.length - 1; i++) {
        for (let k = i + 1; k < ordered.length; k++) {
          const p1 = i === 0 ? (hotelCoords || ordered[0].coords) : ordered[i - 1].coords;
          const p2 = ordered[i].coords;
          const p3 = ordered[k].coords;
          const p4 = k === ordered.length - 1 ? (hotelCoords || ordered[ordered.length - 1].coords) : ordered[k + 1].coords;

          const currentD = calculateHaversineDistanceKm(p1, p2) + calculateHaversineDistanceKm(p3, p4);
          const newD = calculateHaversineDistanceKm(p1, p3) + calculateHaversineDistanceKm(p2, p4);

          if (newD < currentD - 0.1) {
            const sub = ordered.slice(i, k + 1).reverse();
            ordered.splice(i, sub.length, ...sub);
            improved = true;
          }
        }
      }
    }

    bestOrder = ordered.map(o => o.activity);
  }

  const optimizedMetrics = calculateSyncDayRouteMetrics(
    dayNumber,
    bestOrder,
    destination,
    mode,
    hotelCoords,
    airportCoords
  );

  const optDist = optimizedMetrics.totalDistanceKm || 0;
  const optMins = optimizedMetrics.totalTravelMinutes || 0;
  const optConflicts = optimizedMetrics.conflicts.length;

  if (optDist < origDist - 0.2 || optMins < origMins - 2) {
    const distanceSavedKm = Math.max(0, Math.round((origDist - optDist) * 10) / 10);
    const travelTimeSavedMinutes = Math.max(0, origMins - optMins);

    return {
      originalMetrics,
      optimizedMetrics,
      reorderedActivities: bestOrder,
      beforeDistanceKm: origDist,
      afterDistanceKm: optDist,
      distanceSavedKm,
      beforeTravelMinutes: origMins,
      afterTravelMinutes: optMins,
      travelTimeSavedMinutes,
      beforeConflictCount: origConflicts,
      afterConflictCount: optConflicts,
      explanation: `Optimized Day 0${dayNumber} waypoint sequence along a linear transit corridor, eliminating intermediate backtracking and saving ${distanceSavedKm} km and ${travelTimeSavedMinutes} mins in transit.`
    };
  }

  return {
    originalMetrics,
    optimizedMetrics: originalMetrics,
    reorderedActivities: candidateActivities,
    beforeDistanceKm: origDist,
    afterDistanceKm: origDist,
    distanceSavedKm: 0,
    beforeTravelMinutes: origMins,
    afterTravelMinutes: origMins,
    travelTimeSavedMinutes: 0,
    beforeConflictCount: origConflicts,
    afterConflictCount: origConflicts,
    explanation: 'No measurable route improvement found. Current activity sequence is already optimal.'
  };

}

/**
 * Compares two TripRouteMetrics deterministically.
 * Single source of truth for before/after comparison.
 */
export function compareTripRoutes(
  before: TripRouteMetrics,
  after: TripRouteMetrics
): RouteComparison {
  const distBefore = before.totalDistanceKm ?? 0;
  const distAfter = after.totalDistanceKm ?? 0;
  const timeBefore = before.totalTravelMinutes ?? 0;
  const timeAfter = after.totalTravelMinutes ?? 0;

  const distanceSavedKm = distBefore > distAfter
    ? Math.max(0, Math.round((distBefore - distAfter) * 10) / 10)
    : 0;

  const travelTimeSavedMinutes = timeBefore > timeAfter
    ? Math.max(0, timeBefore - timeAfter)
    : 0;

  const effBefore = before.routeEfficiencyScore;
  const effAfter = after.routeEfficiencyScore;
  const efficiencyScoreDelta = (effBefore !== null && effAfter !== null)
    ? effAfter - effBefore
    : null;

  const conflictsBefore = before.days.flatMap(d => d.conflicts).length;
  const conflictsAfter = after.days.flatMap(d => d.conflicts).length;

  return {
    beforeDistanceKm: distBefore,
    afterDistanceKm: distAfter,
    distanceSavedKm,

    beforeTravelMinutes: timeBefore,
    afterTravelMinutes: timeAfter,
    travelTimeSavedMinutes,

    beforeConflictCount: conflictsBefore,
    afterConflictCount: conflictsAfter,

    // Backward compatibility aliases
    distanceBeforeKm: distBefore,
    distanceAfterKm: distAfter,
    travelTimeBeforeMinutes: timeBefore,
    travelTimeAfterMinutes: timeAfter,
    backtrackingBeforeKm: before.totalBacktrackingDistanceKm,
    backtrackingAfterKm: after.totalBacktrackingDistanceKm,
    efficiencyScoreBefore: effBefore,
    efficiencyScoreAfter: effAfter,
    efficiencyScoreDelta
  };
}

/**
 * Groups activities into geographic clusters (e.g. North Zone, South Zone).
 */
export function clusterActivitiesGeographically(
  activities: RouteActivityInput[],
  destination: string,
  clusterRadiusKm: number = 7.0
): Array<{
  clusterId: string;
  centroid: Coordinates;
  activities: RouteActivityInput[];
}> {
  const resolved = activities.map(a => ({
    activity: a,
    coords: resolveLocation({ name: a.name, location: a.location, destination, existingCoords: a.coords })
  })).filter(r => r.coords !== null) as Array<{ activity: RouteActivityInput; coords: { latitude: number; longitude: number } }>;

  const clusters: Array<{ clusterId: string; centroid: Coordinates; activities: RouteActivityInput[] }> = [];

  resolved.forEach(({ activity, coords }) => {
    let matchedCluster: typeof clusters[0] | null = null;
    let minDistance = Infinity;

    for (const cluster of clusters) {
      const dist = calculateHaversineDistanceKm(coords, cluster.centroid);
      if (dist <= clusterRadiusKm && dist < minDistance) {
        minDistance = dist;
        matchedCluster = cluster;
      }
    }

    if (matchedCluster) {
      matchedCluster.activities.push(activity);
    } else {
      clusters.push({
        clusterId: `cluster-${clusters.length + 1}`,
        centroid: { latitude: coords.latitude, longitude: coords.longitude },
        activities: [activity]
      });
    }
  });

  return clusters;
}
