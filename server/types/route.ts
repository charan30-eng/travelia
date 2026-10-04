/**
 * Travelia Route Intelligence Core Types
 * Authoritative type definitions for data-driven routing, geographic coordinates,
 * road segments, backtracking detection, and route optimization.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type GeoAvailability = 'complete' | 'partial' | 'unavailable';

export type TravelMode = 'driving' | 'walking' | 'cycling' | 'transit';

export type DistanceType = 'road' | 'straight_line';

export type RouteDataStatus = 'live' | 'cached' | 'fallback' | 'unavailable';

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  displayName: string;
  source: 'stored' | 'geocoded' | 'user';
  confidence: number; // 0.0 to 1.0
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number; // backward compatibility
  durationMinutes: number; // backward compatibility
  straightLineDistanceKm: number;
  roadDistanceKm: number | null;
  travelTimeMinutes: number;
  staticTravelTimeMinutes: number;
  trafficAwareTravelTimeMinutes?: number | null;
  distanceType: DistanceType;
  geometry?: [number, number][]; // Array of [latitude, longitude] polyline coordinates
  provider: string;
  retrievedAt: string;
  dataStatus: RouteDataStatus;
}

export interface RouteMatrixElement {
  originIndex: number;
  destinationIndex: number;
  originCoords: Coordinates;
  destinationCoords: Coordinates;
  distanceMeters: number;
  roadDistanceKm: number | null;
  straightLineDistanceKm: number;
  durationSeconds: number;
  travelTimeMinutes: number;
  staticTravelTimeMinutes: number;
  trafficAwareTravelTimeMinutes?: number | null;
  distanceType: DistanceType;
  provider: string;
  dataStatus: RouteDataStatus;
  status?: string;
}

export interface RouteMatrixResult {
  origins: Coordinates[];
  destinations: Coordinates[];
  elements: RouteMatrixElement[][];
  provider: string;
  retrievedAt: string;
  dataStatus: RouteDataStatus;
}

export interface RouteProvider {
  name: string;
  getRoute(
    origin: Coordinates,
    destination: Coordinates,
    mode: TravelMode
  ): Promise<RouteResult>;
  getRouteMatrix?(
    origins: Coordinates[],
    destinations: Coordinates[],
    mode: TravelMode
  ): Promise<RouteMatrixResult>;
}

export interface RouteSegment {
  fromActivityId: string;
  toActivityId: string;
  fromName: string;
  toName: string;
  fromCoords: Coordinates | null;
  toCoords: Coordinates | null;
  straightLineDistanceKm: number | null;
  roadDistanceKm: number | null;
  distanceKm: number | null; // backward compatibility
  travelTimeMinutes: number | null;
  staticTravelTimeMinutes: number | null;
  trafficAwareTravelTimeMinutes?: number | null;
  distanceType: DistanceType;
  mode: TravelMode;
  geometry?: [number, number][];
  provider: string;
  retrievedAt?: string;
  dataStatus: RouteDataStatus;
  availability: 'calculated' | 'unavailable';
  aiTip?: string;
}

export interface BacktrackingIncident {
  dayNumber: number;
  fromActivityId: string;
  toActivityId: string;
  fromName: string;
  toName: string;
  excessDistanceKm: number;
  isNecessaryReturn: boolean; // True if returning to hotel/base at end of day or rest
  explanation: string;
}

export interface TravelTimeConflict {
  type: 'travel_time_conflict';
  dayNumber: number;
  fromActivityId: string;
  toActivityId: string;
  fromActivityName: string;
  toActivityName: string;
  requiredTravelMinutes: number;
  availableTravelMinutes: number;
  shortageMinutes: number;
  explanation: string;
}

export interface OpeningHourViolation {
  dayNumber: number;
  activityId: string;
  activityName: string;
  scheduledTime: string;
  openingHours: string;
  reason: string;
}

export interface DailyRouteMetrics {
  day: number;
  totalDistanceKm: number | null;
  roadDistanceKm: number | null;
  straightLineDistanceKm: number | null;
  totalTravelMinutes: number | null;
  staticTravelTimeMinutes: number | null;
  trafficAwareTravelTimeMinutes?: number | null;
  segmentCount: number;
  segments: RouteSegment[];
  backtrackingDistanceKm: number | null;
  backtrackingIncidents: BacktrackingIncident[];
  routeEfficiencyScore: number | null; // 0 - 100
  availability: GeoAvailability;
  dataStatus: RouteDataStatus;
  provider: string;
  conflicts: TravelTimeConflict[];
  openingHourViolations: OpeningHourViolation[];
}

export interface TripRouteMetrics {
  totalDistanceKm: number | null;
  roadDistanceKm: number | null;
  straightLineDistanceKm: number | null;
  totalTravelMinutes: number | null;
  staticTravelTimeMinutes: number | null;
  trafficAwareTravelTimeMinutes?: number | null;
  totalTravelHours: number | null;
  averageDailyDistanceKm: number | null;
  averageDailyTravelMinutes: number | null;
  totalBacktrackingDistanceKm: number | null;
  routeEfficiencyScore: number | null; // 0 - 100
  days: DailyRouteMetrics[];
  availability: GeoAvailability;
  dataStatus: RouteDataStatus;
  totalSegmentsCount: number;
  calculatedSegmentsCount: number;
  distanceType: DistanceType;
  provider: string;
  retrievedAt: string;
}

export interface RouteComparison {
  beforeDistanceKm: number | null;
  afterDistanceKm: number | null;
  distanceSavedKm: number;

  beforeTravelMinutes: number | null;
  afterTravelMinutes: number | null;
  travelTimeSavedMinutes: number;

  beforeCost?: number;
  afterCost?: number;
  costSaved?: number;

  beforeConflictCount?: number;
  afterConflictCount?: number;

  // Backward compatibility aliases
  distanceBeforeKm?: number | null;
  distanceAfterKm?: number | null;
  travelTimeBeforeMinutes?: number | null;
  travelTimeAfterMinutes?: number | null;
  backtrackingBeforeKm?: number | null;
  backtrackingAfterKm?: number | null;
  efficiencyScoreBefore?: number | null;
  efficiencyScoreAfter?: number | null;
  efficiencyScoreDelta?: number | null;
}

export interface RouteOptimizationConstraint {
  mustVisit?: string[]; // Activity IDs that cannot be removed
  avoid?: string[]; // Activity IDs to exclude
  preserveKeywords?: string[]; // Keywords in activity names to preserve
  fixedTimes?: Record<string, string>; // activityId -> required time e.g. "13:00"
  respectOpeningHours?: boolean;
  respectMealWindows?: boolean;
  maxDailyActivities?: number;
  objective?: 'min_time' | 'min_distance' | 'min_cost' | 'balanced';
}

export interface RouteIntelligenceResponse {
  currentRoute: TripRouteMetrics;
  optimizedRoute?: TripRouteMetrics;
  comparison?: RouteComparison;
  optimizationApplied: boolean;
  availability: GeoAvailability;
  conflicts: TravelTimeConflict[];
  limitations: string[];
}

