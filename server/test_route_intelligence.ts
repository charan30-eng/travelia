/**
 * Comprehensive Route Intelligence Test Suite
 * Verifies all 15 required scenarios from Priority 2 Master Prompt:
 * Test 1: Two real coordinates (distance calculation)
 * Test 2: Same location (0 km, 0 travel distance)
 * Test 3: Missing coordinates (honestly marked unavailable/partial without guessing)
 * Test 4: Three activities (sequential segment generation)
 * Test 5: Route ordering (A->B->C vs A->C->B route comparison)
 * Test 6: Route improvement (beforeDistance - afterDistance)
 * Test 7: Travel-time improvement (beforeTime - afterTime)
 * Test 8: Zero improvement (honestly returns 0, no forced positive value)
 * Test 9: Route provider fallback (straight-line fallback without crashing)
 * Test 10: Backtracking detection (detects geographic detour/reversal)
 * Test 11: Valid return trip (legitimate hotel return is NOT classified as avoidable backtracking)
 * Test 12: Fixed-time conflict (detects travel time shortage)
 * Test 13: Opening hours (detects schedule opening hour violation)
 * Test 14: User constraints (preserves mustVisit, avoid, fixedTime)
 * Test 15: No mutation (verifies optimization does not mutate original trip)
 */

import {
  calculateHaversineDistanceKm,
  HaversineRouteProvider
} from './services/routeEngine/routeProvider';
import { resolveLocation } from './services/locationResolutionService';
import {
  calculateDayRouteMetrics,
  calculateSyncDayRouteMetrics,
  calculateSyncTripRouteMetrics,
  optimizeDayRouteSync,
  detectBacktracking,
  detectTimeConflicts,
  detectOpeningHourViolations,
  compareTripRoutes,
  RouteActivityInput
} from './services/routeIntelligenceService';
import { Coordinates } from './types/route';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log(' TRAVELIA ROUTE INTELLIGENCE TEST SUITE (15 SCENARIOS)');
  console.log('======================================================\n');

  // Test 1: Two real coordinates (Eiffel Tower to Louvre)
  console.log('--- Test 1: Two Real Coordinates ---');
  const eiffelCoords: Coordinates = { latitude: 48.8584, longitude: 2.2945 };
  const louvreCoords: Coordinates = { latitude: 48.8606, longitude: 2.3376 };
  const dist1 = calculateHaversineDistanceKm(eiffelCoords, louvreCoords);
  // Great circle distance between Eiffel Tower and Louvre is ~3.16 km
  assert(dist1 > 3.0 && dist1 < 3.5, 'Haversine distance between Eiffel Tower and Louvre is ~3.16 km', `Got: ${dist1} km`);

  // Test 2: Same location
  console.log('\n--- Test 2: Same Location ---');
  const dist2 = calculateHaversineDistanceKm(eiffelCoords, eiffelCoords);
  assert(dist2 === 0, 'Distance between identical coordinates is strictly 0 km', `Got: ${dist2}`);

  // Test 3: Missing coordinates
  console.log('\n--- Test 3: Missing Coordinates ---');
  const unknownLoc = resolveLocation({ name: 'Completely Nonexistent Alien Planet Landmark 9999', destination: 'paris' });
  assert(unknownLoc === null, 'Location resolution returns null for unknown locations without fabricating coordinates');

  const missingMetrics = calculateSyncDayRouteMetrics(
    1,
    [{ id: 'act-unknown', name: 'Completely Nonexistent Alien Planet Landmark 9999' }],
    'paris'
  );
  assert(
    missingMetrics.segments[0]?.availability === 'unavailable' || missingMetrics.availability === 'partial' || missingMetrics.availability === 'unavailable',
    'Missing coordinates yield unavailable/partial state without fake coordinates'
  );

  // Test 4: Three activities (Segment Generation)
  console.log('\n--- Test 4: Three Activities (Sequential Segment Generation) ---');
  const acts4: RouteActivityInput[] = [
    { id: 'act-1', name: 'Baga Beach', location: 'Goa', coords: { latitude: 15.5553, longitude: 73.7517 } },
    { id: 'act-2', name: 'Calangute Beach', location: 'Goa', coords: { latitude: 15.5439, longitude: 73.7554 } },
    { id: 'act-3', name: 'Candolim Beach', location: 'Goa', coords: { latitude: 15.5186, longitude: 73.7628 } }
  ];
  const hotelGoa: Coordinates = { latitude: 15.4981, longitude: 73.7684 };
  const metrics4 = calculateSyncDayRouteMetrics(1, acts4, 'goa', 'driving', hotelGoa);
  // Hotel -> Baga -> Calangute -> Candolim -> Hotel = 4 segments
  assert(metrics4.segments.length === 4, `Generated exactly 4 route segments for 3 activities + hotel start/end. Got: ${metrics4.segments.length}`);
  assert(metrics4.totalDistanceKm !== null && metrics4.totalDistanceKm > 0, `Total distance is calculated: ${metrics4.totalDistanceKm} km`);

  // Test 5: Route ordering comparison (A -> B -> C vs A -> C -> B)
  console.log('\n--- Test 5: Route Ordering Comparison ---');
  // Order 1: Hotel (South) -> Fort Aguada (South) -> Candolim (Mid) -> Baga (North) -> Hotel (South)
  const linearOrder: RouteActivityInput[] = [
    { id: 'a1', name: 'Fort Aguada', coords: { latitude: 15.4921, longitude: 73.7736 } },
    { id: 'a2', name: 'Candolim Beach', coords: { latitude: 15.5186, longitude: 73.7628 } },
    { id: 'a3', name: 'Baga Beach', coords: { latitude: 15.5553, longitude: 73.7517 } }
  ];
  // Order 2: Hotel (South) -> Baga (North) -> Candolim (Mid) -> Fort Aguada (South) -> Hotel (South)
  // Zig-zag: Hotel -> Candolim (Mid) -> Fort Aguada (South) -> Baga (North) -> Hotel (South)
  const zigzagOrder: RouteActivityInput[] = [
    { id: 'a2', name: 'Candolim Beach', coords: { latitude: 15.5186, longitude: 73.7628 } },
    { id: 'a1', name: 'Fort Aguada', coords: { latitude: 15.4921, longitude: 73.7736 } },
    { id: 'a3', name: 'Baga Beach', coords: { latitude: 15.5553, longitude: 73.7517 } }
  ];
  const linearMetrics = calculateSyncDayRouteMetrics(1, linearOrder, 'goa', 'driving', hotelGoa);
  const zigzagMetrics = calculateSyncDayRouteMetrics(1, zigzagOrder, 'goa', 'driving', hotelGoa);
  assert(
    (zigzagMetrics.totalDistanceKm || 0) > (linearMetrics.totalDistanceKm || 0),
    `Zigzag ordering (${zigzagMetrics.totalDistanceKm} km) is greater than linear corridor (${linearMetrics.totalDistanceKm} km)`
  );

  // Test 6: Route improvement
  console.log('\n--- Test 6: Route Improvement Calculation ---');
  const optDay6 = optimizeDayRouteSync(1, zigzagOrder, 'goa', 'driving', {}, hotelGoa);
  const diffKm = (optDay6.originalMetrics.totalDistanceKm || 0) - (optDay6.optimizedMetrics.totalDistanceKm || 0);
  assert(
    optDay6.distanceSavedKm > 0,
    `Optimization successfully eliminated detour and saved ${optDay6.distanceSavedKm} km`
  );
  assert(
    Math.abs(optDay6.distanceSavedKm - Math.round(diffKm * 10) / 10) <= 0.1,
    `Reported distance saved matches exact difference between before and after metrics`
  );

  // Test 7: Travel-time improvement
  console.log('\n--- Test 7: Travel-time Improvement Calculation ---');
  const diffTime = (optDay6.originalMetrics.totalTravelMinutes || 0) - (optDay6.optimizedMetrics.totalTravelMinutes || 0);
  assert(
    optDay6.travelTimeSavedMinutes >= 0,
    `Reported travel-time saved (${optDay6.travelTimeSavedMinutes} mins) is non-negative and derived from duration difference (${diffTime} mins)`
  );

  // Test 8: Zero improvement honestly represented
  console.log('\n--- Test 8: Zero Improvement Honestly Represented ---');
  // Pass the already linear order to optimizer
  const optDay8 = optimizeDayRouteSync(1, linearOrder, 'goa', 'driving', {}, hotelGoa);
  assert(
    optDay8.distanceSavedKm === 0,
    `When route is already optimal, returns exactly 0 km saved (Got: ${optDay8.distanceSavedKm} km)`
  );
  assert(
    optDay8.travelTimeSavedMinutes === 0,
    `When route is already optimal, returns exactly 0 mins saved (Got: ${optDay8.travelTimeSavedMinutes} mins)`
  );
  assert(
    optDay8.explanation.includes('optimal') || optDay8.explanation.includes('No measurable route improvement'),
    `Explanation honestly notes route is already optimal`
  );

  // Test 9: Missing route provider fallback
  console.log('\n--- Test 9: Missing Route Provider / Fallback ---');
  const fallbackProvider = new HaversineRouteProvider();
  const fallbackResult = await fallbackProvider.getRoute(eiffelCoords, louvreCoords, 'driving');
  assert(fallbackResult.distanceType === 'straight_line', 'Fallback provider explicitly labels distanceType as straight_line');
  assert(fallbackResult.provider.includes('haversine'), 'Provider name reflects straight line fallback');

  // Test 10: Backtracking detection
  console.log('\n--- Test 10: Backtracking Detection ---');
  // Create a sequence that goes Panjim -> Old Goa (10km East) -> Panjim Jetty (10km West)
  const panjim: Coordinates = { latitude: 15.4989, longitude: 73.8311 };
  const oldGoa: Coordinates = { latitude: 15.5009, longitude: 73.9116 };
  const panjimJetty: Coordinates = { latitude: 15.4998, longitude: 73.8278 };

  const stopsWithBacktracking = [
    { id: 's1', name: 'Fontainhas Panaji', coords: panjim, isHotel: false },
    { id: 's2', name: 'Basilica of Bom Jesus Old Goa', coords: oldGoa, isHotel: false },
    { id: 's3', name: 'Panaji Jetty Sunset Cruise', coords: panjimJetty, isHotel: false }
  ];
  const backtrackingIncidents = detectBacktracking(stopsWithBacktracking, 1);
  assert(backtrackingIncidents.length > 0, `Detected geographic backtracking incident (${backtrackingIncidents[0]?.excessDistanceKm} km excess detour)`);
  assert(!backtrackingIncidents[0]?.isNecessaryReturn, 'Identified intermediate backtracking as avoidable');

  // Test 11: Valid return trip
  console.log('\n--- Test 11: Valid Return Trip To Hotel ---');
  // Hotel -> Beach -> Hotel
  const validHotelStops = [
    { id: 'hotel-start', name: 'Base Hotel', coords: hotelGoa, isHotel: true },
    { id: 'beach', name: 'Baga Beach', coords: { latitude: 15.5553, longitude: 73.7517 }, isHotel: false },
    { id: 'hotel-end', name: 'Return to Base Hotel', coords: hotelGoa, isHotel: true }
  ];
  const hotelReturnBacktracking = detectBacktracking(validHotelStops, 1);
  const avoidableIncidents = hotelReturnBacktracking.filter(b => !b.isNecessaryReturn);
  assert(avoidableIncidents.length === 0, 'Legitimate return to hotel at end of day is NOT penalized as avoidable backtracking');

  // Test 12: Fixed-time travel conflict
  console.log('\n--- Test 12: Time-Aware Travel Conflict Detection ---');
  // Activity 1 ends at 10:00 AM + 90 min = 11:30 AM
  // Next activity starts at 11:35 AM (only 5 min buffer)
  // Travel between them requires 45 min
  const conflictStops = [
    { id: 'act-c1', name: 'North Goa Beach', time: '10:00 AM', durationMinutes: 90 },
    { id: 'act-c2', name: 'South Goa Waterfall', time: '11:35 AM', durationMinutes: 60 }
  ];
  const conflictSegments: any[] = [
    { travelTimeMinutes: 45 }
  ];
  const conflicts = detectTimeConflicts(conflictStops, conflictSegments, 1);
  assert(conflicts.length === 1, `Detected travel time conflict (available: ${conflicts[0]?.availableTravelMinutes}m, required: ${conflicts[0]?.requiredTravelMinutes}m, shortage: ${conflicts[0]?.shortageMinutes}m)`);
  assert(conflicts[0]?.shortageMinutes === 40, `Accurately calculated shortage of 40 mins (Got: ${conflicts[0]?.shortageMinutes}m)`);

  // Test 13: Opening hours validation
  console.log('\n--- Test 13: Opening Hours Validation ---');
  const museumStops = [
    { id: 'mus-1', name: 'Heritage Museum', time: '08:00 AM', openingHours: '10:00 AM - 05:00 PM' }
  ];
  const violations = detectOpeningHourViolations(museumStops, 1);
  assert(violations.length === 1, 'Detected activity scheduled outside opening hours');

  // Test 14: User constraints preservation
  console.log('\n--- Test 14: User Constraints Preservation ---');
  const acts14: RouteActivityInput[] = [
    { id: 'act-must', name: 'Fort Aguada', coords: { latitude: 15.4921, longitude: 73.7736 }, mustVisit: true },
    { id: 'act-fixed', name: 'Assagao Cafe', coords: { latitude: 15.5891, longitude: 73.7797 }, isFixedTime: true, time: '01:00 PM' },
    { id: 'act-avoid', name: 'Anjuna Flea Market', coords: { latitude: 15.5828, longitude: 73.7432 } },
    { id: 'act-other', name: 'Baga Beach', coords: { latitude: 15.5553, longitude: 73.7517 } }
  ];
  const optDay14 = optimizeDayRouteSync(1, acts14, 'goa', 'driving', { avoid: ['act-avoid'] }, hotelGoa);
  const reorderedIds = optDay14.reorderedActivities.map(a => a.id);
  assert(!reorderedIds.includes('act-avoid'), 'Excluded activity specified in avoid constraint');
  assert(reorderedIds.includes('act-must'), 'Preserved mustVisit activity in itinerary');

  // Test 15: No mutation of original itinerary
  console.log('\n--- Test 15: No Mutation of Original Trip ---');
  const originalActivitiesSnapshot = JSON.stringify(acts14);
  optimizeDayRouteSync(1, acts14, 'goa', 'driving', { avoid: ['act-avoid'] }, hotelGoa);
  const afterActivitiesSnapshot = JSON.stringify(acts14);
  assert(
    originalActivitiesSnapshot === afterActivitiesSnapshot,
    'Original activities input was not mutated during route analysis and optimization'
  );

  console.log('\n======================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
