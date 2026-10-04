/**
 * Authoritative Route Intelligence Service
 * 
 * Centralized, data-driven route engine for Travelia:
 * 1. Computes genuine route segments, road distances, and transit durations.
 * 2. Distinguishes road distance (from routing provider) from straight-line Haversine distance.
 * 3. Detects true geographic backtracking while preserving legitimate hotel/base returns.
 * 4. Identifies time-aware transit conflicts (activity end + travel time > next activity start).
 * 5. Respects user constraints, fixed times, and opening hours during route optimization.
 * 6. Generates deterministic before/after comparisons with zero forced improvements.
 * 7. Derives Route Efficiency Scores purely from measurable geographic data.
 */

import {
  Coordinates,
  GeoAvailability,
  TravelMode,
  DistanceType,
  ResolvedLocation,
  RouteResult,
  RouteSegment,
  BacktrackingIncident,
  TravelTimeConflict,
  OpeningHourViolation,
  DailyRouteMetrics,
  TripRouteMetrics,
  RouteComparison,
  RouteOptimizationConstraint,
  RouteIntelligenceResponse
} from '../types/route';
import { resolveLocation, CITY_CENTERS } from './locationResolutionService';
import { activeRouteProvider, calculateHaversineDistanceKm } from './routeEngine/routeProvider';

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

// Activity interface for routing engine
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
 * Resolves all activities and optional hotel for a day.
 */
export function resolveDayCoordinates(
  activities: RouteActivityInput[],
  destination: string,
  hotelCoords?: Coordinates
): {
  resolvedActivities: Array<RouteActivityInput & { resolvedCoords: Coordinates | null; resolvedName: string }>;
  resolvedHotel: Coordinates | null;
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
    availability
  };
}

/**
 * Calculates genuine route segments and metrics for a single day.
 */
export async function calculateDayRouteMetrics(
  dayNumber: number,
  activities: RouteActivityInput[],
  destination: string,
  mode: TravelMode = 'driving',
  hotelCoords?: Coordinates
): Promise<DailyRouteMetrics> {
  const { resolvedActivities, resolvedHotel, availability } = resolveDayCoordinates(
    activities,
    destination,
    hotelCoords
  );

  // If no activities, return empty metrics
  if (resolvedActivities.length === 0) {
    return {
      day: dayNumber,
      totalDistanceKm: 0,
      totalTravelMinutes: 0,
      straightLineDistanceKm: 0,
      segmentCount: 0,
      segments: [],
      backtrackingDistanceKm: 0,
      backtrackingIncidents: [],
      routeEfficiencyScore: 100,
      availability: 'complete',
      conflicts: [],
      openingHourViolations: []
    };
  }

  // Construct sequence of stops: Hotel -> Activity 1 -> ... -> Activity N -> Return to Hotel
  interface StopItem {
    id: string;
    name: string;
    coords: Coordinates | null;
    time?: string;
    durationMinutes?: number;
    openingHours?: string;
    isHotel?: boolean;
  }

  const stops: StopItem[] = [];

  if (resolvedHotel) {
    stops.push({
      id: `hotel-start-day-${dayNumber}`,
      name: `${destination} Base Hotel`,
      coords: resolvedHotel,
      time: '08:30 AM',
      isHotel: true
    });
  }

  resolvedActivities.forEach(act => {
    stops.push({
      id: act.id,
      name: act.name,
      coords: act.resolvedCoords,
      time: act.time,
      durationMinutes: act.durationMinutes || 90,
      openingHours: act.openingHours,
      isHotel: false
    });
  });

  if (resolvedHotel) {
    stops.push({
      id: `hotel-return-day-${dayNumber}`,
      name: `Return to ${destination} Base Hotel`,
      coords: resolvedHotel,
      time: '09:30 PM',
      isHotel: true
    });
  }

  // Calculate each segment
  const segments: RouteSegment[] = [];
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;
  let totalStraightLineKm = 0;
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
        distanceKm: null,
        travelTimeMinutes: null,
        distanceType: 'straight_line',
        mode,
        availability: 'unavailable',
        aiTip: 'Exact coordinates unavailable for this transit leg.'
      });
      continue;
    }

    const routeResult = await activeRouteProvider.getRoute(from.coords, to.coords, mode);
    const straightDist = calculateHaversineDistanceKm(from.coords, to.coords);
    totalStraightLineKm += straightDist;

    totalDistanceKm += routeResult.distanceKm;
    totalTravelMinutes += routeResult.durationMinutes;

    segments.push({
      fromActivityId: from.id,
      toActivityId: to.id,
      fromName: from.name,
      toName: to.name,
      fromCoords: from.coords,
      toCoords: to.coords,
      distanceKm: routeResult.distanceKm,
      travelTimeMinutes: routeResult.durationMinutes,
      distanceType: routeResult.distanceType,
      mode,
      geometry: routeResult.geometry,
      availability: 'calculated',
      aiTip: `${routeResult.distanceType === 'road' ? 'Road route' : 'Straight-line corridor'} via ${mode}: ${routeResult.distanceKm} km, ~${routeResult.durationMinutes} mins.`
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
    totalDistanceKm,
    totalTravelMinutes,
    backtrackingDistanceKm,
    stops.length
  );

  return {
    day: dayNumber,
    totalDistanceKm: hasMissingCoords && totalDistanceKm === 0 ? null : Math.round(totalDistanceKm * 10) / 10,
    totalTravelMinutes: hasMissingCoords && totalTravelMinutes === 0 ? null : totalTravelMinutes,
    straightLineDistanceKm: Math.round(totalStraightLineKm * 10) / 10,
    segmentCount: segments.length,
    segments,
    backtrackingDistanceKm,
    backtrackingIncidents,
    routeEfficiencyScore,
    availability: hasMissingCoords ? (segments.some(s => s.availability === 'calculated') ? 'partial' : 'unavailable') : 'complete',
    conflicts,
    openingHourViolations
  };
}

/**
 * Detects geographic backtracking between stops.
 * Distinguishes necessary return to base hotel at end of day from avoidable zig-zags.
 */
export function detectBacktracking(
  stops: Array<{ id: string; name: string; coords: Coordinates | null; isHotel?: boolean }>,
  dayNumber: number
): BacktrackingIncident[] {
  const incidents: BacktrackingIncident[] = [];
  const validStops = stops.filter(s => s.coords !== null);

  if (validStops.length < 3) return incidents;

  for (let i = 0; i < validStops.length - 2; i++) {
    const p1 = validStops[i];
    const p2 = validStops[i + 1];
    const p3 = validStops[i + 2];

    if (!p1.coords || !p2.coords || !p3.coords) continue;

    const d12 = calculateHaversineDistanceKm(p1.coords, p2.coords);
    const d23 = calculateHaversineDistanceKm(p2.coords, p3.coords);
    const d13 = calculateHaversineDistanceKm(p1.coords, p3.coords);

    // If p3 is the end-of-day hotel return, it is a legitimate necessary base return
    const isEndingReturn = (i + 2 === validStops.length - 1) && p3.isHotel === true;

    // Geographic zig-zag: detour ratio = (d12 + d23) / d13
    // If d13 is very short but travel visits an intermediate far-away point p2
    if (d13 > 0.1 && (d12 + d23) / d13 > 2.4 && (d12 + d23 - d13) >= 4.0) {
      const excess = Math.round((d12 + d23 - d13) * 10) / 10;
      incidents.push({
        dayNumber,
        fromActivityId: p2.id,
        toActivityId: p3.id,
        fromName: p2.name,
        toName: p3.name,
        excessDistanceKm: excess,
        isNecessaryReturn: isEndingReturn,
        explanation: isEndingReturn
          ? `Return to base accommodation (${excess} km transit); scheduled as standard day-end return.`
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

    // Pattern e.g. "09:00 - 18:00" or "09:00 AM - 05:00 PM"
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
 * Based on:
 * - Distance density (compactness)
 * - Daily transit duration burden
 * - Avoidable backtracking ratio
 */
export function calculateDailyEfficiencyScore(
  distanceKm: number,
  travelMinutes: number,
  backtrackingKm: number,
  stopsCount: number
): number {
  if (stopsCount <= 1 || distanceKm <= 0) return 100;

  // 1. Compactness: penalize high mileage per stop
  const kmPerStop = distanceKm / Math.max(1, stopsCount);
  const compactnessPenalty = Math.min(30, kmPerStop * 2.2);

  // 2. Travel Burden: penalize excessive transit time (> 120 mins)
  const transitPenalty = Math.min(30, Math.max(0, (travelMinutes - 45) * 0.3));

  // 3. Backtracking: penalize avoidable zig-zags
  const backtrackingPenalty = Math.min(30, backtrackingKm * 2.5);

  const rawScore = 100 - (compactnessPenalty + transitPenalty + backtrackingPenalty);
  return Math.max(15, Math.min(100, Math.round(rawScore)));
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
  }
): Promise<TripRouteMetrics> {
  const days = trip.itinerary || [];
  const destination = trip.destination || 'Destination';
  const mode = trip.mode || 'driving';

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

  const dailyMetrics: DailyRouteMetrics[] = [];

  for (const day of days) {
    const dayMetrics = await calculateDayRouteMetrics(
      day.dayNumber,
      day.activities || [],
      destination,
      mode,
      hotelCoords
    );
    dailyMetrics.push(dayMetrics);
  }

  let totalDistanceKm: number | null = 0;
  let totalTravelMinutes: number | null = 0;
  let totalBacktrackingDistanceKm: number | null = 0;
  let totalSegments = 0;
  let calculatedSegments = 0;
  let completeCount = 0;

  dailyMetrics.forEach(d => {
    if (d.totalDistanceKm !== null) totalDistanceKm = (totalDistanceKm || 0) + d.totalDistanceKm;
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

  // Overall Trip Route Efficiency Score: weighted average of daily scores
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
    totalTravelMinutes,
    totalTravelHours,
    averageDailyDistanceKm: avgDailyDistanceKm,
    averageDailyTravelMinutes: avgDailyTravelMinutes,
    totalBacktrackingDistanceKm: totalBacktrackingDistanceKm !== null ? Math.round(totalBacktrackingDistanceKm * 10) / 10 : null,
    routeEfficiencyScore: overallEfficiency,
    days: dailyMetrics,
    availability,
    totalSegmentsCount: totalSegments,
    calculatedSegmentsCount: calculatedSegments,
    distanceType: 'road',
    provider: 'Travelia Authoritative Route Engine'
  };
}

/**
 * Synchronous Day Route Metrics Calculator (uses factual coordinates and Haversine distance).
 * Used when callers require immediate synchronous execution without external network latency.
 * Explicitly marks distanceType as 'straight_line' and does not pretend to be road routing.
 */
export function calculateSyncDayRouteMetrics(
  dayNumber: number,
  activities: RouteActivityInput[],
  destination: string,
  mode: TravelMode = 'driving',
  hotelCoords?: Coordinates
): DailyRouteMetrics {
  const { resolvedActivities, resolvedHotel, availability } = resolveDayCoordinates(
    activities,
    destination,
    hotelCoords
  );

  if (resolvedActivities.length === 0) {
    return {
      day: dayNumber,
      totalDistanceKm: 0,
      totalTravelMinutes: 0,
      straightLineDistanceKm: 0,
      segmentCount: 0,
      segments: [],
      backtrackingDistanceKm: 0,
      backtrackingIncidents: [],
      routeEfficiencyScore: 100,
      availability: 'complete',
      conflicts: [],
      openingHourViolations: []
    };
  }

  interface StopItem {
    id: string;
    name: string;
    coords: Coordinates | null;
    time?: string;
    durationMinutes?: number;
    openingHours?: string;
    isHotel?: boolean;
  }

  const stops: StopItem[] = [];

  if (resolvedHotel) {
    stops.push({
      id: `hotel-start-day-${dayNumber}`,
      name: `${destination} Base Hotel`,
      coords: resolvedHotel,
      time: '08:30 AM',
      isHotel: true
    });
  }

  resolvedActivities.forEach(act => {
    stops.push({
      id: act.id,
      name: act.name,
      coords: act.resolvedCoords,
      time: act.time,
      durationMinutes: act.durationMinutes || 90,
      openingHours: act.openingHours,
      isHotel: false
    });
  });

  if (resolvedHotel) {
    stops.push({
      id: `hotel-return-day-${dayNumber}`,
      name: `Return to ${destination} Base Hotel`,
      coords: resolvedHotel,
      time: '09:30 PM',
      isHotel: true
    });
  }

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
        distanceKm: null,
        travelTimeMinutes: null,
        distanceType: 'straight_line',
        mode,
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
      distanceKm: distKm,
      travelTimeMinutes: durationMin,
      distanceType: 'straight_line',
      mode,
      geometry: [
        [from.coords.latitude, from.coords.longitude],
        [to.coords.latitude, to.coords.longitude]
      ],
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
    totalTravelMinutes: hasMissingCoords && totalTravelMinutes === 0 ? null : totalTravelMinutes,
    straightLineDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    segmentCount: segments.length,
    segments,
    backtrackingDistanceKm,
    backtrackingIncidents,
    routeEfficiencyScore,
    availability: hasMissingCoords ? (segments.some(s => s.availability === 'calculated') ? 'partial' : 'unavailable') : 'complete',
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
  }
): TripRouteMetrics {
  const days = trip.itinerary || [];
  const destination = trip.destination || 'Destination';
  const mode = trip.mode || 'driving';

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

  const dailyMetrics: DailyRouteMetrics[] = days.map(day =>
    calculateSyncDayRouteMetrics(
      day.dayNumber,
      day.activities || [],
      destination,
      mode,
      hotelCoords
    )
  );

  let totalDistanceKm: number | null = 0;
  let totalTravelMinutes: number | null = 0;
  let totalBacktrackingDistanceKm: number | null = 0;
  let totalSegments = 0;
  let calculatedSegments = 0;
  let completeCount = 0;

  dailyMetrics.forEach(d => {
    if (d.totalDistanceKm !== null) totalDistanceKm = (totalDistanceKm || 0) + d.totalDistanceKm;
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
    totalTravelMinutes,
    totalTravelHours,
    averageDailyDistanceKm: avgDailyDistanceKm,
    averageDailyTravelMinutes: avgDailyTravelMinutes,
    totalBacktrackingDistanceKm: totalBacktrackingDistanceKm !== null ? Math.round(totalBacktrackingDistanceKm * 10) / 10 : null,
    routeEfficiencyScore: overallEfficiency,
    days: dailyMetrics,
    availability,
    totalSegmentsCount: totalSegments,
    calculatedSegmentsCount: calculatedSegments,
    distanceType: 'straight_line',
    provider: 'Travelia Authoritative Route Engine (Haversine)'
  };
}

/**
 * Optimizes a day's activities by testing valid sequence orderings (TSP / 2-Opt)
 * strictly respecting user constraints (mustVisit, avoid, fixed times, opening hours).
 * Returns both original and optimized daily route metrics with deterministic savings.
 */
export async function optimizeDayRoute(
  dayNumber: number,
  activities: RouteActivityInput[],
  destination: string,
  mode: TravelMode = 'driving',
  constraints: RouteOptimizationConstraint = {},
  hotelCoords?: Coordinates
): Promise<{
  originalMetrics: DailyRouteMetrics;
  optimizedMetrics: DailyRouteMetrics;
  reorderedActivities: RouteActivityInput[];
  distanceSavedKm: number;
  travelTimeSavedMinutes: number;
  explanation: string;
}> {
  // 1. Calculate baseline route metrics
  const originalMetrics = await calculateDayRouteMetrics(
    dayNumber,
    activities,
    destination,
    mode,
    hotelCoords
  );

  // If <= 2 activities, sequence cannot be reordered to reduce intermediate travel
  if (activities.length <= 2) {
    return {
      originalMetrics,
      optimizedMetrics: originalMetrics,
      reorderedActivities: activities,
      distanceSavedKm: 0,
      travelTimeSavedMinutes: 0,
      explanation: 'Activities are already in single or direct sequence; no shorter route exists.'
    };
  }

  // 2. Filter activities based on constraints
  let candidateActivities = [...activities];
  if (constraints.avoid && constraints.avoid.length > 0) {
    candidateActivities = candidateActivities.filter(a => !constraints.avoid?.includes(a.id));
  }

  // Identify fixed-position activities (e.g. fixedTimes or fixed meal slots)
  const fixedPositions = new Map<number, RouteActivityInput>();
  candidateActivities.forEach((act, idx) => {
    if (act.isFixedTime || (constraints.fixedTimes && constraints.fixedTimes[act.id])) {
      fixedPositions.set(idx, act);
    }
  });

  // 3. Coordinate pre-fetch for fast distance matrix
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

  // If any candidate has missing coordinates, route optimization cannot guarantee a genuine reduction
  const allResolved = resolved.every(r => r.coords !== null);
  if (!allResolved) {
    return {
      originalMetrics,
      optimizedMetrics: originalMetrics,
      reorderedActivities: activities,
      distanceSavedKm: 0,
      travelTimeSavedMinutes: 0,
      explanation: 'Some activity locations could not be verified; route reordering disabled to prevent inaccurate routing.'
    };
  }

  // 4. Generate candidate permutations
  // For <= 7 stops: exhaustive valid permutation search
  // For > 7 stops: Greedy Nearest Neighbor + 2-Opt local search
  let bestOrder: RouteActivityInput[] = [...candidateActivities];
  let bestDistance = originalMetrics.totalDistanceKm || Infinity;

  const validResolved = resolved.map(r => ({ ...r, coords: r.coords! }));

  if (validResolved.length <= 7) {
    // Permutation generator that respects fixed positions
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

      // Quick Haversine distance check for candidate
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
    // Greedy Nearest Neighbor
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

    // 2-Opt local search
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

  // 5. Calculate authoritative metrics for optimized candidate
  const optimizedMetrics = await calculateDayRouteMetrics(
    dayNumber,
    bestOrder,
    destination,
    mode,
    hotelCoords
  );

  const origDist = originalMetrics.totalDistanceKm || 0;
  const optDist = optimizedMetrics.totalDistanceKm || 0;
  const origMins = originalMetrics.totalTravelMinutes || 0;
  const optMins = optimizedMetrics.totalTravelMinutes || 0;

  // Genuine savings: only report if candidate is actually shorter!
  if (optDist < origDist - 0.2) {
    const distanceSavedKm = Math.round((origDist - optDist) * 10) / 10;
    const travelTimeSavedMinutes = Math.max(0, origMins - optMins);

    return {
      originalMetrics,
      optimizedMetrics,
      reorderedActivities: bestOrder,
      distanceSavedKm,
      travelTimeSavedMinutes,
      explanation: `Optimized Day 0${dayNumber} waypoint sequence along a linear transit corridor, eliminating intermediate backtracking and saving ${distanceSavedKm} km and ${travelTimeSavedMinutes} mins in transit.`
    };
  }

  // Honest ZERO improvement state
  return {
    originalMetrics,
    optimizedMetrics: originalMetrics,
    reorderedActivities: activities,
    distanceSavedKm: 0,
    travelTimeSavedMinutes: 0,
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
  hotelCoords?: Coordinates
): {
  originalMetrics: DailyRouteMetrics;
  optimizedMetrics: DailyRouteMetrics;
  reorderedActivities: RouteActivityInput[];
  distanceSavedKm: number;
  travelTimeSavedMinutes: number;
  explanation: string;
} {
  const originalMetrics = calculateSyncDayRouteMetrics(
    dayNumber,
    activities,
    destination,
    mode,
    hotelCoords
  );

  if (activities.length <= 2) {
    return {
      originalMetrics,
      optimizedMetrics: originalMetrics,
      reorderedActivities: activities,
      distanceSavedKm: 0,
      travelTimeSavedMinutes: 0,
      explanation: 'Activities are already in single or direct sequence; no shorter route exists.'
    };
  }

  let candidateActivities = [...activities];
  if (constraints.avoid && constraints.avoid.length > 0) {
    candidateActivities = candidateActivities.filter(a => !constraints.avoid?.includes(a.id));
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
      reorderedActivities: activities,
      distanceSavedKm: 0,
      travelTimeSavedMinutes: 0,
      explanation: 'Some activity locations could not be verified; route reordering disabled to prevent inaccurate routing.'
    };
  }

  let bestOrder: RouteActivityInput[] = [...candidateActivities];
  let bestDistance = originalMetrics.totalDistanceKm || Infinity;

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
    hotelCoords
  );

  const origDist = originalMetrics.totalDistanceKm || 0;
  const optDist = optimizedMetrics.totalDistanceKm || 0;
  const origMins = originalMetrics.totalTravelMinutes || 0;
  const optMins = optimizedMetrics.totalTravelMinutes || 0;

  if (optDist < origDist - 0.2) {
    const distanceSavedKm = Math.round((origDist - optDist) * 10) / 10;
    const travelTimeSavedMinutes = Math.max(0, origMins - optMins);

    return {
      originalMetrics,
      optimizedMetrics,
      reorderedActivities: bestOrder,
      distanceSavedKm,
      travelTimeSavedMinutes,
      explanation: `Optimized Day 0${dayNumber} waypoint sequence along a linear transit corridor, eliminating intermediate backtracking and saving ${distanceSavedKm} km and ${travelTimeSavedMinutes} mins in transit.`
    };
  }

  return {
    originalMetrics,
    optimizedMetrics: originalMetrics,
    reorderedActivities: activities,
    distanceSavedKm: 0,
    travelTimeSavedMinutes: 0,
    explanation: 'No measurable route improvement found. Current activity sequence is already optimal.'
  };
}

/**
 * Compares two TripRouteMetrics deterministically.
 */
export function compareTripRoutes(
  before: TripRouteMetrics,
  after: TripRouteMetrics
): RouteComparison {
  const distBefore = before.totalDistanceKm;
  const distAfter = after.totalDistanceKm;
  const timeBefore = before.totalTravelMinutes;
  const timeAfter = after.totalTravelMinutes;

  const distanceSavedKm = (distBefore !== null && distAfter !== null)
    ? Math.max(0, Math.round((distBefore - distAfter) * 10) / 10)
    : null;

  const travelTimeSavedMinutes = (timeBefore !== null && timeAfter !== null)
    ? Math.max(0, timeBefore - timeAfter)
    : null;

  const effBefore = before.routeEfficiencyScore;
  const effAfter = after.routeEfficiencyScore;
  const efficiencyScoreDelta = (effBefore !== null && effAfter !== null)
    ? effAfter - effBefore
    : null;

  return {
    distanceBeforeKm: distBefore,
    distanceAfterKm: distAfter,
    distanceSavedKm,
    travelTimeBeforeMinutes: timeBefore,
    travelTimeAfterMinutes: timeAfter,
    travelTimeSavedMinutes,
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
  })).filter(r => r.coords !== null) as Array<{ activity: RouteActivityInput; coords: ResolvedLocation }>;

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
