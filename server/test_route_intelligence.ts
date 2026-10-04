/**
 * Travelia Phase 2 Authoritative Route Intelligence & Optimization Test Suite
 * 
 * Verifies all 16 required Phase 2 scenarios:
 *  1. Normal Route (two real coordinates, road vs straight-line distance)
 *  2. Multiple Activities (sequential multi-stop daily metrics & segments)
 *  3. Missing Coordinates (unverified location yields dataStatus = 'unavailable')
 *  4. Provider Failure (graceful fallback to Haversine with dataStatus = 'fallback')
 *  5. Route Unavailable (all locations unverified yields null distance and unavailable state)
 *  6. Cache (repeated origin/destination calls hit in-memory cache with dataStatus = 'cached')
 *  7. Route Matrix (multi-stop pairwise origin/destination matrix with field masks)
 *  8. Backtracking (detects avoidable geographic detour using real route metrics)
 *  9. Hotel Return (legitimate lodging return is NOT classified as avoidable backtracking)
 * 10. Fixed Activity (preserves fixed-time activities in exact sequence/time)
 * 11. MustVisit Constraint (activities marked mustVisit are strictly preserved)
 * 12. Opening Hours (detects schedule opening hour violation)
 * 13. No Improvement (when sequence is already optimal, strictly returns savings = 0)
 * 14. Real Improvement (honest positive savings calculated from before vs after difference)
 * 15. What-If Simulation (clones itinerary, recalculates route metrics, compares results)
 * 16. Original Itinerary Immutability (verifies original trip context remains completely untouched)
 */

import {
  calculateHaversineDistanceKm,
  HaversineRouteProvider,
  OSRMRouteProvider,
  GoogleRoutesProvider,
  CompositeRouteProvider,
  activeRouteProvider,
  ROUTE_CACHE,
  clearRouteCache,
  getRouteCacheStats
} from './services/routeEngine/routeProvider';
import { resolveLocation } from './services/locationResolutionService';
import {
  calculateDayRouteMetrics,
  calculateSyncDayRouteMetrics,
  calculateTripRouteMetrics,
  calculateSyncTripRouteMetrics,
  calculateRouteMatrix,
  optimizeDayRoute,
  optimizeDayRouteSync,
  detectBacktracking,
  detectTimeConflicts,
  detectOpeningHourViolations,
  compareTripRoutes,
  RouteActivityInput
} from './services/routeIntelligenceService';
import { simulateWhatIfScenario } from './services/whatIfSimulator';
import { Coordinates } from './types/route';
import { TripContext } from './types/ai';

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
  console.log('\n================================================================');
  console.log(' TRAVELIA PHASE 2: AUTHORITATIVE ROUTE INTELLIGENCE TEST SUITE');
  console.log('================================================================\n');

  clearRouteCache();

  // Test 1: Normal Route (Eiffel Tower to Louvre Museum)
  console.log('--- Test 1: Normal Route (Two Real Coordinates) ---');
  const eiffelCoords: Coordinates = { latitude: 48.8584, longitude: 2.2945 };
  const louvreCoords: Coordinates = { latitude: 48.8606, longitude: 2.3376 };
  const route1 = await activeRouteProvider.getRoute(eiffelCoords, louvreCoords, 'driving');

  assert(route1.straightLineDistanceKm > 3.0 && route1.straightLineDistanceKm < 3.5, 'Computes correct Haversine distance (~3.16 km)', `Got: ${route1.straightLineDistanceKm}`);
  assert(route1.roadDistanceKm === null || route1.roadDistanceKm >= route1.straightLineDistanceKm, 'Road distance is >= straight-line distance when available', `Road: ${route1.roadDistanceKm}, Straight: ${route1.straightLineDistanceKm}`);
  assert(route1.travelTimeMinutes > 0, `Valid travel time in minutes: ${route1.travelTimeMinutes} mins`);
  assert(Boolean(route1.retrievedAt), 'Contains retrievedAt timestamp');
  assert(route1.dataStatus === 'live' || route1.dataStatus === 'fallback', `Correct initial dataStatus: ${route1.dataStatus}`);

  // Test 2: Multiple Activities (Sequential Day Route)
  console.log('\n--- Test 2: Multiple Activities (Sequential Segment Generation) ---');
  const hotelGoa: Coordinates = { latitude: 15.4981, longitude: 73.7684 };
  const actsGoa: RouteActivityInput[] = [
    { id: 'act-1', name: 'Candolim Beach', location: 'Goa', coords: { latitude: 15.5186, longitude: 73.7628 } },
    { id: 'act-2', name: 'Calangute Beach', location: 'Goa', coords: { latitude: 15.5439, longitude: 73.7554 } },
    { id: 'act-3', name: 'Baga Beach', location: 'Goa', coords: { latitude: 15.5553, longitude: 73.7517 } }
  ];
  const day2Metrics = await calculateDayRouteMetrics(1, actsGoa, 'goa', 'driving', hotelGoa);
  // Hotel -> Candolim -> Calangute -> Baga -> Hotel = 4 segments
  assert(day2Metrics.segmentCount === 4, `Generated exactly 4 segments for 3 activities + hotel base. Got: ${day2Metrics.segmentCount}`);
  assert(day2Metrics.totalDistanceKm !== null && day2Metrics.totalDistanceKm > 0, `Total daily distance calculated: ${day2Metrics.totalDistanceKm} km`);
  assert(day2Metrics.totalTravelMinutes !== null && day2Metrics.totalTravelMinutes > 0, `Total daily travel minutes calculated: ${day2Metrics.totalTravelMinutes} mins`);
  assert(day2Metrics.segments.every(s => s.dataStatus !== undefined), 'All segments have authoritative dataStatus');

  // Test 3: Missing Coordinates (Honest Unavailable State)
  console.log('\n--- Test 3: Missing Coordinates (No Invented Coords) ---');
  const unverifiedActs: RouteActivityInput[] = [
    { id: 'act-real', name: 'Eiffel Tower', coords: eiffelCoords },
    { id: 'act-fake', name: 'Completely Nonexistent Fantasy Atlantis Portal 9999' }
  ];
  const missingCoordMetrics = await calculateDayRouteMetrics(1, unverifiedActs, 'paris', 'driving', louvreCoords);
  const fakeSegment = missingCoordMetrics.segments.find(s => s.toActivityId === 'act-fake' || s.fromActivityId === 'act-fake');
  assert(fakeSegment !== undefined, 'Found segment involving unverified activity');
  assert(fakeSegment?.dataStatus === 'unavailable', `Segment with missing coordinates marked dataStatus = 'unavailable'. Got: ${fakeSegment?.dataStatus}`);
  assert(fakeSegment?.distanceKm === null && fakeSegment?.roadDistanceKm === null, 'Did not fabricate distance for unverified location');
  assert(missingCoordMetrics.availability === 'partial', 'Daily route marked as partial availability');

  // Test 4: Provider Failure Fallback
  console.log('\n--- Test 4: Provider Failure Fallback ---');
  const failingOSRM = new OSRMRouteProvider('https://invalid-nonexistent-routing-engine-999.org', 100);
  const fallbackRoute = await failingOSRM.getRoute(eiffelCoords, louvreCoords, 'driving');
  assert(fallbackRoute.distanceType === 'straight_line', 'Provider failure falls back to straight_line distance');
  assert(fallbackRoute.dataStatus === 'fallback', `Fallback labeled with dataStatus = 'fallback'. Got: ${fallbackRoute.dataStatus}`);
  assert(fallbackRoute.provider.includes('haversine'), 'Fallback identifies Haversine provider');

  // Test 5: Route Unavailable State
  console.log('\n--- Test 5: Route Unavailable State ---');
  const allMissingActs: RouteActivityInput[] = [
    { id: 'm1', name: 'Unknown Landmark Alpha' },
    { id: 'm2', name: 'Unknown Landmark Beta' }
  ];
  const unavailableMetrics = calculateSyncDayRouteMetrics(1, allMissingActs, 'fantasy_destination');
  assert(unavailableMetrics.totalDistanceKm === null, 'Total distance is null when coordinates cannot be resolved');
  assert(unavailableMetrics.availability === 'unavailable', 'Overall availability marked unavailable');

  // Test 6: In-Memory Route Cache
  console.log('\n--- Test 6: In-Memory Route Cache Hit & Deduplication ---');
  clearRouteCache();
  const c1: Coordinates = { latitude: 15.4989, longitude: 73.8311 };
  const c2: Coordinates = { latitude: 15.5009, longitude: 73.9116 };
  // First request - cold cache
  const firstRes = await activeRouteProvider.getRoute(c1, c2, 'driving');
  assert(firstRes.dataStatus === 'live' || firstRes.dataStatus === 'fallback', 'First request produces live or fallback response');
  // Second request - should hit cache
  const secondRes = await activeRouteProvider.getRoute(c1, c2, 'driving');
  assert(secondRes.dataStatus === 'cached', `Second request hits cache with dataStatus = 'cached'. Got: ${secondRes.dataStatus}`);
  assert(secondRes.distanceKm === firstRes.distanceKm, 'Cached distance matches original calculation');

  // Test 7: Route Matrix Calculation
  console.log('\n--- Test 7: Route Matrix Calculation ---');
  const pA: Coordinates = { latitude: 15.4921, longitude: 73.7736 }; // Fort Aguada
  const pB: Coordinates = { latitude: 15.5186, longitude: 73.7628 }; // Candolim
  const pC: Coordinates = { latitude: 15.5439, longitude: 73.7554 }; // Calangute
  const pD: Coordinates = { latitude: 15.5553, longitude: 73.7517 }; // Baga
  const matrixResult = await calculateRouteMatrix([pA, pB], [pC, pD], 'driving');
  assert(matrixResult.elements.length === 2, 'Matrix has 2 origin rows');
  assert(matrixResult.elements[0].length === 2, 'Matrix row 0 has 2 destination columns');
  assert(matrixResult.elements[0][0].distanceMeters > 0, `Matrix element (0,0) has distance > 0: ${matrixResult.elements[0][0].distanceMeters}m`);
  assert(matrixResult.elements[0][0].travelTimeMinutes > 0, `Matrix element (0,0) has travel time > 0: ${matrixResult.elements[0][0].travelTimeMinutes}m`);

  // Test 8: Backtracking Detection (Avoidable Zigzag)
  console.log('\n--- Test 8: Backtracking Detection ---');
  const panjim: Coordinates = { latitude: 15.4989, longitude: 73.8311 };
  const oldGoa: Coordinates = { latitude: 15.5009, longitude: 73.9116 }; // 10km East
  const panjimJetty: Coordinates = { latitude: 15.4998, longitude: 73.8278 }; // West, near Panjim
  const zigzagStops = [
    { id: 's1', name: 'Panaji Latin Quarter', coords: panjim, isHotel: false },
    { id: 's2', name: 'Old Goa Churches', coords: oldGoa, isHotel: false },
    { id: 's3', name: 'Panaji Mandovi Cruise', coords: panjimJetty, isHotel: false }
  ];
  const backtrackingIncidents = detectBacktracking(zigzagStops, 1);
  assert(backtrackingIncidents.length > 0, 'Detects acute zigzag detour');
  assert(!backtrackingIncidents[0]?.isNecessaryReturn, 'Classifies intermediate zigzag as avoidable backtracking');
  assert(backtrackingIncidents[0]?.excessDistanceKm > 4, `Calculates excess distance detour: ${backtrackingIncidents[0]?.excessDistanceKm} km`);

  // Test 9: Legitimate Hotel Return (Not Penalized as Error)
  console.log('\n--- Test 9: Hotel Return Legitimate Preservation ---');
  const hotelReturnStops = [
    { id: 'hotel-start', name: 'Base Hotel', coords: hotelGoa, isHotel: true },
    { id: 'beach', name: 'Baga Beach', coords: pD, isHotel: false },
    { id: 'hotel-end', name: 'Return to Base Hotel', coords: hotelGoa, isHotel: true }
  ];
  const hotelIncidents = detectBacktracking(hotelReturnStops, 1);
  const avoidableHotelIncidents = hotelIncidents.filter(b => !b.isNecessaryReturn);
  assert(avoidableHotelIncidents.length === 0, 'Hotel return at end of day is NOT penalized as an avoidable detour');

  // Test 10: Fixed-Time Activity Preservation
  console.log('\n--- Test 10: Fixed-Time Activity Preservation ---');
  const fixedActs: RouteActivityInput[] = [
    { id: 'act-a', name: 'Fort Aguada', coords: pA },
    { id: 'act-b', name: 'Fixed Lunch Slot', coords: pB, isFixedTime: true, time: '01:00 PM' },
    { id: 'act-c', name: 'Baga Beach', coords: pD }
  ];
  const optFixed = optimizeDayRouteSync(1, fixedActs, 'goa', 'driving', { fixedTimes: { 'act-b': '01:00 PM' } }, hotelGoa);
  const fixedIdx = optFixed.reorderedActivities.findIndex(a => a.id === 'act-b');
  assert(fixedIdx === 1, `Fixed-time activity maintained at its designated position (index ${fixedIdx})`);

  // Test 11: MustVisit Activity Preservation
  console.log('\n--- Test 11: MustVisit Activity Preservation ---');
  const mustVisitActs: RouteActivityInput[] = [
    { id: 'mv-1', name: 'Must See Heritage Site', coords: pA, mustVisit: true },
    { id: 'mv-2', name: 'Optional Market', coords: pB },
    { id: 'mv-3', name: 'Beach Sunset', coords: pD }
  ];
  const optMust = optimizeDayRouteSync(1, mustVisitActs, 'goa', 'driving', { avoid: ['mv-1', 'mv-2'] }, hotelGoa);
  const remainingIds = optMust.reorderedActivities.map(a => a.id);
  assert(remainingIds.includes('mv-1'), 'mustVisit activity was preserved despite avoid list');
  assert(!remainingIds.includes('mv-2'), 'Non-mustVisit activity was excluded according to avoid list');

  // Test 12: Opening Hours Violation Detection
  console.log('\n--- Test 12: Opening Hours Violation Detection ---');
  const museumSchedule = [
    { id: 'm-1', name: 'City Museum', time: '08:30 AM', openingHours: '10:00 AM - 05:00 PM' }
  ];
  const violations = detectOpeningHourViolations(museumSchedule, 1);
  assert(violations.length === 1, 'Detected activity scheduled before opening hours');
  assert(violations[0]?.scheduledTime === '08:30 AM', 'Identified scheduled time accurately');

  // Test 13: Zero Improvement Honest Representation
  console.log('\n--- Test 13: Zero Improvement Honest Representation ---');
  // Pass an already linear sequence: Hotel -> pA (South) -> pB (Mid) -> pD (North) -> Hotel
  const alreadyOptimalActs: RouteActivityInput[] = [
    { id: 'opt-1', name: 'Fort Aguada (South)', coords: pA },
    { id: 'opt-2', name: 'Candolim Beach (Mid)', coords: pB },
    { id: 'opt-3', name: 'Baga Beach (North)', coords: pD }
  ];
  const zeroOpt = optimizeDayRouteSync(1, alreadyOptimalActs, 'goa', 'driving', {}, hotelGoa);
  assert(zeroOpt.distanceSavedKm === 0, `When sequence is already optimal, distanceSavedKm is strictly 0. Got: ${zeroOpt.distanceSavedKm}`);
  assert(zeroOpt.travelTimeSavedMinutes === 0, `travelTimeSavedMinutes is strictly 0. Got: ${zeroOpt.travelTimeSavedMinutes}`);
  assert(zeroOpt.explanation.includes('optimal') || zeroOpt.explanation.includes('No measurable route improvement'), 'Explanation notes no improvement exists');

  // Test 14: Real Improvement Calculation
  console.log('\n--- Test 14: Real Improvement Calculation ---');
  // Intentionally unordered sequence creating zigzag: Hotel -> pD (North) -> pA (South) -> pB (Mid) -> Hotel
  const zigzagInput: RouteActivityInput[] = [
    { id: 'opt-3', name: 'Baga Beach (North)', coords: pD },
    { id: 'opt-1', name: 'Fort Aguada (South)', coords: pA },
    { id: 'opt-2', name: 'Candolim Beach (Mid)', coords: pB }
  ];
  const realOpt = optimizeDayRouteSync(1, zigzagInput, 'goa', 'driving', {}, hotelGoa);
  const calculatedDiff = Math.round((realOpt.beforeDistanceKm - realOpt.afterDistanceKm) * 10) / 10;
  assert(realOpt.distanceSavedKm > 0, `Real optimization eliminated detour and saved ${realOpt.distanceSavedKm} km`);
  assert(realOpt.distanceSavedKm === calculatedDiff, `Reported distanceSavedKm (${realOpt.distanceSavedKm}) exactly equals beforeDistanceKm - afterDistanceKm (${calculatedDiff})`);
  assert(realOpt.travelTimeSavedMinutes >= 0, `travelTimeSavedMinutes is non-negative: ${realOpt.travelTimeSavedMinutes} mins`);

  // Test 15: What-If Route Recalculation
  console.log('\n--- Test 15: What-If Route Recalculation ---');
  const mockTripContext: TripContext = {
    id: 'test-trip-whatif',
    destination: 'Goa',
    days: 3,
    travelers: 2,
    budget: { currency: 'INR', total: 30000, spent: 18000 },
    preferences: { pace: 'moderate' },
    itinerary: [
      {
        dayNumber: 1,
        title: 'North Goa Coastal',
        theme: 'Coastal & Heritage',
        activities: [
          { id: 'w1', activity: 'Candolim Beach', location: 'Goa', coords: [15.5186, 73.7628], time: '10:00 AM', duration: '2 hrs', durationMinutes: 120, estimatedCost: 500, category: 'sightseeing', aiRecommendation: '' },
          { id: 'w2', activity: 'Baga Beach', location: 'Goa', coords: [15.5553, 73.7517], time: '02:00 PM', duration: '2 hrs', durationMinutes: 120, estimatedCost: 800, category: 'sightseeing', aiRecommendation: '' }
        ]
      },
      {
        dayNumber: 2,
        title: 'South Goa Heritage',
        theme: 'Cultural Exploration',
        activities: [
          { id: 'w3', activity: 'Basilica of Bom Jesus', location: 'Goa', coords: [15.5009, 73.9116], time: '10:00 AM', duration: '2 hrs', durationMinutes: 120, estimatedCost: 600, category: 'sightseeing', aiRecommendation: '' }
        ]
      }


    ]
  };

  const whatIfResult = simulateWhatIfScenario({
    tripContext: mockTripContext,
    scenarioType: 'remove_day',
    parameters: { dayToRemove: 2 }
  });
  assert(whatIfResult.projectedState.travelTimeHours !== undefined, 'What-If recalculates projected travel time hours');
  assert(whatIfResult.suggestedAction !== undefined, 'What-If generates suggested action proposal');

  // Test 16: Original Itinerary Immutability
  console.log('\n--- Test 16: Original Itinerary Immutability ---');
  const originalSnapshot = JSON.stringify(mockTripContext);
  simulateWhatIfScenario({
    tripContext: mockTripContext,
    scenarioType: 'remove_day',
    parameters: { dayToRemove: 2 }
  });
  const afterWhatIfSnapshot = JSON.stringify(mockTripContext);
  assert(originalSnapshot === afterWhatIfSnapshot, 'Original trip context is strictly immutable and was not modified during What-If simulation');

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite execution error:', err);
  process.exit(1);
});
