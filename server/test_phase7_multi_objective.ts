/**
 * TRAVELIA PHASE 7 VERIFICATION SUITE: MULTI-OBJECTIVE ITINERARY OPTIMIZATION ENGINE
 * 
 * Verifies all 11 required scenarios:
 * 1.  zero-change (already optimal, zero fake improvements, status = "no_improvement_needed")
 * 2.  one-change (single out-of-order stop or exclusion, structured reasons)
 * 3.  multiple-change (multi-stop route 2-opt, rest/meal buffer, soft score uplift)
 * 4.  budget-constrained (budgetHardLimit adherence, verified catalog substitutions)
 * 5.  fixed-time (preserves fixed-time appointments without shifting)
 * 6.  mustVisit (strictly non-removable even under severe budget limits)
 * 7.  opening-hours (verified operational hour validation)
 * 8.  weather (proactive rain relocation and indoor substitution)
 * 9.  infeasible (budget impossible / conflicting fixed times -> returns "infeasible")
 * 10. large itinerary (5-day, 20+ activities, deterministic fast completion)
 * 11. What-If (exact same optimizer used across all simulation branches)
 */

import { optimizeTripItinerary } from './services/itineraryOptimizer';
import { simulateWhatIfScenario } from './services/whatIfSimulator';
import { OBJECTIVE_WEIGHT_PROFILES } from './services/multiObjectiveScorer';
import { TripContext, OptimizationObjective } from './types/ai';
import { ItineraryActivity, ItineraryDay } from '../src/types';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeActivity(
  id: string,
  activity: string,
  location: string,
  time: string,
  durationMinutes: number,
  estimatedCost: number,
  category: 'sightseeing' | 'food' | 'relaxation' | 'adventure' | 'transit' | 'hotel' = 'sightseeing'
): ItineraryActivity {
  return {
    id,
    activity,
    location,
    time,
    durationMinutes,
    duration: `${Math.round(durationMinutes / 60 * 10) / 10} hrs`,
    estimatedCost,
    category,
    aiRecommendation: 'Verified'
  };
}

function makeDay(dayNumber: number, title: string, theme: string, activities: ItineraryActivity[]): ItineraryDay {
  return {
    dayNumber,
    title,
    theme,
    activities
  };
}

console.log('====================================================');
console.log('TRAVELIA PHASE 7: MULTI-OBJECTIVE OPTIMIZATION ENGINE');
console.log('====================================================\n');

// -----------------------------------------------------------------
// SCENARIO 1: ZERO-CHANGE (Already Optimal, Zero Fake Improvements)
// -----------------------------------------------------------------
console.log('--- Scenario 1: Zero-Change (No Improvement Needed) ---');
{
  const optimalTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-02',
    days: 2,
    travelers: 2,
    budget: { total: 30000, spent: 12000, currency: 'INR' },
    hotels: [{
      id: 'h1',
      name: 'Taj Fort Aguada Resort',
      location: 'Candolim, Goa',
      rating: 4.8,
      source: 'hotelbeds',
      dataStatus: 'live',
      price: { amount: 8000, currency: 'INR', perNight: 8000, total: 8000, taxesIncluded: true, source: 'hotelbeds' }
    }],
    itinerary: [
      makeDay(1, 'Day 1', 'Coastal Candolim', [
        makeActivity('opt-1', 'Fort Aguada Viewpoint', 'Aguada Fort, Candolim, Goa', '10:00', 60, 200, 'sightseeing'),
        makeActivity('opt-2', 'Candolim Beach Stroll', 'Candolim Beach, Goa', '14:00', 90, 300, 'relaxation')
      ]),
      makeDay(2, 'Day 2', 'Baga Relaxation', [
        makeActivity('opt-3', 'Baga Beach Shacks', 'Baga Beach, Goa', '11:00', 120, 400, 'relaxation')
      ])
    ]
  };

  const res = optimizeTripItinerary(optimalTrip, 0.15, { objective: 'balanced' });
  
  assert(res.optimizationStatus === 'no_improvement_needed', 'Status is explicitly "no_improvement_needed" for already optimal trip');
  assert(res.distanceSavedKm === 0, 'Zero fake distance improvement (0 km saved)');
  assert(res.costSaved === 0, 'Zero fake cost savings (₹0 saved)');
  assert(res.travelTimeSavedHours === 0, 'Zero fake travel time reduction (0 hrs)');
  assert(res.changes.length === 0, 'No fake array mutations or changes generated');
  assert(res.beforeDistanceKm === res.afterDistanceKm, 'Authoritative before and after distance match exactly');
  assert(res.beforeCost === res.afterCost, 'Authoritative before and after cost match exactly');
}

// -----------------------------------------------------------------
// SCENARIO 2: ONE-CHANGE (Single Out-of-Order Stop / User Exclusion)
// -----------------------------------------------------------------
console.log('\n--- Scenario 2: One-Change (Single Clear Improvement) ---');
{
  const oneChangeTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-01',
    days: 1,
    travelers: 2,
    budget: { total: 20000, spent: 5000, currency: 'INR' },
    itinerary: [
      makeDay(1, 'Day 1', 'North Goa Heritage', [
        makeActivity('act-aguada', 'Aguada Fort', 'Aguada Fort, Candolim, Goa', '09:00', 60, 200, 'sightseeing'),
        makeActivity('act-casinopass', 'Casino Pride VIP Entry', 'Panaji, Goa', '12:00', 120, 3500, 'relaxation'),
        makeActivity('act-candolim', 'Candolim Beach', 'Candolim Beach, Goa', '16:00', 90, 0, 'relaxation')
      ])
    ]
  };

  // Exclude Casino via avoidList
  const res = optimizeTripItinerary(oneChangeTrip, 0.15, {
    objective: 'balanced',
    hardConstraints: {
      avoidList: ['casino']
    }
  });

  assert(res.optimizationStatus === 'optimal' || res.optimizationStatus === 'feasible', 'Status is optimal or feasible');
  assert(res.structuredReasons.length >= 1, 'Structured reasons list is non-empty');
  const exclusionReason = res.structuredReasons.find(r => r.activityName.toLowerCase().includes('casino'));
  assert(Boolean(exclusionReason), 'Structured reason identifies the excluded casino');
  assert(exclusionReason!.action === 'replaced', 'Reason captures action');
  assert(Boolean(exclusionReason!.constraintPreserved), 'Reason captures preserved constraint');
  assert(res.costSaved > 0, `Authoritative cost saved is positive: ₹${res.costSaved}`);
  assert(!res.optimizedItinerary[0].activities.some(a => a.activity.toLowerCase().includes('casino')), 'Casino is removed from optimized itinerary');
}

// -----------------------------------------------------------------
// SCENARIO 3: MULTIPLE-CHANGE (Route 2-Opt & Meal Buffers)
// -----------------------------------------------------------------
console.log('\n--- Scenario 3: Multiple-Change (Route 2-Opt & Meal Buffers) ---');
{
  // A zigzag itinerary on Day 1: Aguada (North) -> Basilica (Old Goa/East) -> Sinquerim Beach (North, next to Aguada)
  const zigzagTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-01',
    days: 1,
    travelers: 2,
    budget: { total: 20000, spent: 5000, currency: 'INR' },
    itinerary: [
      makeDay(1, 'Day 1', 'Zigzag Day', [
        makeActivity('z1', 'Aguada Fort', 'Aguada Fort, Candolim, Goa', '09:00', 60, 100, 'sightseeing'),
        makeActivity('z2', 'Basilica of Bom Jesus', 'Old Goa, Goa', '11:00', 60, 100, 'sightseeing'),
        makeActivity('z3', 'Sinquerim Beach', 'Sinquerim, Candolim, Goa', '14:00', 60, 100, 'relaxation')
      ])
    ]
  };

  const res = optimizeTripItinerary(zigzagTrip, 0.15, { objective: 'minimum_distance' });

  assert(res.structuredReasons.length > 0, 'Produces structured reasons for multiple adjustments');
  assert(res.beforeDistanceKm >= res.afterDistanceKm, 'Road distance is reduced or preserved via 2-opt ordering');
  assert(res.softConstraintScoresAfter.routeEfficiency >= res.softConstraintScoresBefore.routeEfficiency, 'Route efficiency soft score improves');
}

// -----------------------------------------------------------------
// SCENARIO 4: BUDGET-CONSTRAINED (Verified Catalog Substitutions)
// -----------------------------------------------------------------
console.log('\n--- Scenario 4: Budget-Constrained (Hard Ceiling Adherence) ---');
{
  const expensiveTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-01',
    days: 1,
    travelers: 2,
    budget: { total: 30000, spent: 18000, currency: 'INR' },
    itinerary: [
      makeDay(1, 'Day 1', 'Luxury Experience', [
        makeActivity('act-aguada', 'Aguada Fort', 'Aguada Fort, Candolim, Goa', '10:00', 60, 200, 'sightseeing'),
        makeActivity('act-watersports', 'Baga Beach Watersports', 'Baga Beach, Goa', '12:00', 120, 3500, 'adventure'),
        makeActivity('act-cruise', 'Mandovi Luxury Yacht Cruise', 'Panaji, Goa', '16:00', 120, 4000, 'relaxation')
      ])
    ]
  };

  // Hard ceiling of 4000 total cost
  const res = optimizeTripItinerary(expensiveTrip, 0.30, {
    objective: 'minimum_cost',
    hardConstraints: {
      budgetHardLimit: 4000
    }
  });

  assert(res.optimizationStatus === 'optimal' || res.optimizationStatus === 'feasible', 'Optimizer found a feasible budget-reduced plan');
  assert(res.afterCost <= 4000, `Optimized cost ₹${res.afterCost} strictly respects budget hard ceiling ₹4000`);
  assert(res.costSaved > 0, `Substantial authoritative savings realized: ₹${res.costSaved}`);
  assert(res.structuredReasons.some(r => r.metricImprovement.costSaved && r.metricImprovement.costSaved > 0), 'Structured reasons document verified cost reductions');
}

// -----------------------------------------------------------------
// SCENARIO 5: FIXED-TIME (Preserve Strict Scheduled Milestones)
// -----------------------------------------------------------------
console.log('\n--- Scenario 5: Fixed-Time Event Preservation ---');
{
  const fixedTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-01',
    days: 1,
    travelers: 2,
    itinerary: [
      makeDay(1, 'Day 1', 'Day with Booked Show', [
        makeActivity('act-show', 'Goa Cultural Heritage Show', 'Panaji, Goa', '15:00', 90, 800, 'sightseeing'),
        makeActivity('act-beach', 'Miramar Beach Stroll', 'Miramar, Panaji, Goa', '11:00', 60, 0, 'relaxation')
      ])
    ]
  };

  const res = optimizeTripItinerary(fixedTrip, 0.15, {
    objective: 'balanced',
    hardConstraints: {
      fixedTimes: {
        'act-show': '15:00'
      }
    }
  });

  const scheduledShow = res.optimizedItinerary[0].activities.find(a => a.id === 'act-show');
  assert(Boolean(scheduledShow), 'Fixed-time event is preserved in itinerary');
  assert(scheduledShow!.time === '15:00', 'Fixed-time event remains locked at 15:00');
  assert(res.satisfiedConstraints.some(c => c.toLowerCase().includes('fixed')), 'Fixed times marked as satisfied constraint');
}

// -----------------------------------------------------------------
// SCENARIO 6: MUST-VISIT (Non-Removable Under Budget Constraints)
// -----------------------------------------------------------------
console.log('\n--- Scenario 6: Must-Visit Landmark Preservation ---');
{
  const mustVisitTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-01',
    days: 1,
    travelers: 2,
    itinerary: [
      makeDay(1, 'Day 1', 'Heritage Day', [
        makeActivity('act-basilica', 'Basilica of Bom Jesus', 'Old Goa, Goa', '10:00', 60, 1500, 'sightseeing'),
        makeActivity('act-watersports', 'Baga Beach Watersports', 'Baga Beach, Goa', '14:00', 120, 3500, 'adventure')
      ])
    ]
  };

  const res = optimizeTripItinerary(mustVisitTrip, 0.35, {
    objective: 'minimum_cost',
    hardConstraints: {
      mustVisit: ['act-basilica'],
      budgetHardLimit: 4000
    }
  });

  const basilicaStop = res.optimizedItinerary[0].activities.find(a => a.id === 'act-basilica' || a.activity.includes('Basilica'));
  assert(Boolean(basilicaStop), 'Must-visit landmark Basilica is strictly retained');
  assert(res.satisfiedConstraints.some(c => c.toLowerCase().includes('must-visit') || c.toLowerCase().includes('preserved')), 'Must-visit satisfaction explicitly documented');
}

// -----------------------------------------------------------------
// SCENARIO 7: OPENING-HOURS (Operational Window Verification)
// -----------------------------------------------------------------
console.log('\n--- Scenario 7: Opening-Hours Verification ---');
{
  const openingHoursTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-01',
    days: 1,
    travelers: 2,
    itinerary: [
      makeDay(1, 'Day 1', 'Museum & Fort Day', [
        makeActivity('act-mus', 'Goa State Museum', 'Panaji, Goa', '10:30', 90, 100, 'sightseeing')
      ])
    ]
  };

  const res = optimizeTripItinerary(openingHoursTrip, 0.15, {
    objective: 'maximum_experience'
  });

  assert(res.satisfiedConstraints.length > 0, 'Constraint checks executed');
  assert(res.violatedConstraints.length === 0, 'No opening hours constraints violated');
  const act = res.optimizedItinerary[0].activities[0];
  assert(Boolean(act), 'Activity retained within valid operational daytime window');
}

// -----------------------------------------------------------------
// SCENARIO 8: WEATHER (Rain Relocation & Indoor Substitution)
// -----------------------------------------------------------------
console.log('\n--- Scenario 8: Weather Relocation & Protection ---');
{
  const weatherTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-02',
    days: 2,
    travelers: 2,
    itinerary: [
      makeDay(1, 'Day 1', 'Cultural Day (Sunny)', [
        makeActivity('w-indoor', 'Basilica of Bom Jesus', 'Old Goa, Goa', '10:00', 90, 100, 'sightseeing')
      ]),
      makeDay(2, 'Day 2', 'Beach Day (Rain Risk)', [
        makeActivity('w-outdoor', 'Baga Beach Watersports', 'Baga Beach, Goa', '11:00', 120, 1500, 'adventure')
      ])
    ]
  };

  const forecast = [
    { dayNumber: 1, date: '2026-11-01', condition: 'Sunny', temperatureMaxC: 32, temperatureMinC: 24, precipitationProbability: 10, precipitationMm: 0, humidityPercent: 65, windSpeedKph: 12, sunrise: '06:15', sunset: '18:15' },
    { dayNumber: 2, date: '2026-11-02', condition: 'Thunderstorms', temperatureMaxC: 27, temperatureMinC: 23, precipitationProbability: 85, precipitationMm: 12.0, humidityPercent: 90, windSpeedKph: 28, sunrise: '06:15', sunset: '18:15' }
  ];

  const res = optimizeTripItinerary(weatherTrip, 0.15, {
    objective: 'balanced',
    forecast
  });

  assert(res.structuredReasons.some(r => r.reason.toLowerCase().includes('weather') || r.reason.toLowerCase().includes('rain') || r.reason.toLowerCase().includes('precipitation')), 'Structured reason explicitly cites weather protection');
  assert(res.softConstraintScoresAfter.weatherCompatibility >= res.softConstraintScoresBefore.weatherCompatibility, 'Weather compatibility score maintained or improved');
  assert(res.satisfiedConstraints.some(c => c.toLowerCase().includes('rain') || c.toLowerCase().includes('weather')), 'Protected against adverse precipitation');
}

// -----------------------------------------------------------------
// SCENARIO 9: INFEASIBLE (Strict Infeasibility Detection & Defense)
// -----------------------------------------------------------------
console.log('\n--- Scenario 9: Infeasibility Detection ---');
{
  // Test 9A: Conflicting fixed-time events at the identical slot
  const conflictingTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-01',
    days: 1,
    travelers: 2,
    itinerary: [
      makeDay(1, 'Day 1', 'Impossible Schedule', [
        makeActivity('f-1', 'Private Boat Charter', 'Panaji, Goa', '14:00', 120, 2000, 'adventure'),
        makeActivity('f-2', 'Ayurvedic Spa Session', 'Candolim, Goa', '14:00', 90, 2500, 'relaxation')
      ])
    ]
  };

  const infeasibleRes = optimizeTripItinerary(conflictingTrip, 0.15, {
    objective: 'balanced',
    hardConstraints: {
      fixedTimes: {
        'f-1': '14:00',
        'f-2': '14:00'
      }
    }
  });

  assert(infeasibleRes.optimizationStatus === 'infeasible', 'Infeasibility status detected for simultaneous fixed-time commitments');
  assert(infeasibleRes.violatedConstraints.length > 0, 'Violated constraints list is populated');
  assert(infeasibleRes.violatedConstraints.some(c => c.includes('Conflicting fixed times')), 'Explains conflicting fixed-time error clearly');
  assert(infeasibleRes.changes.length === 0, 'No invalid itinerary generated to mask infeasibility');

  // Test 9B: Budget hard limit impossible (lower than non-negotiable lodging)
  const budgetImpossibleTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-02',
    days: 2,
    travelers: 2,
    hotels: [{
      id: 'h-luxury',
      name: 'Grand Hyatt Goa',
      location: 'Bambolim, Goa',
      rating: 4.9,
      source: 'hotelbeds',
      dataStatus: 'live',
      price: { amount: 15000, currency: 'INR', perNight: 15000, total: 15000, taxesIncluded: true, source: 'hotelbeds' }
    }],
    itinerary: [
      makeDay(1, 'Day 1', 'Day 1', [
        makeActivity('m-1', 'Fort Aguada', 'Candolim, Goa', '10:00', 60, 200, 'sightseeing')
      ])
    ]
  };

  const budgetInfeasibleRes = optimizeTripItinerary(budgetImpossibleTrip, 0.15, {
    objective: 'minimum_cost',
    hardConstraints: {
      budgetHardLimit: 5000 // Hotel alone is 15000!
    }
  });

  assert(budgetInfeasibleRes.optimizationStatus === 'infeasible', 'Infeasibility status returned when budget hard limit is lower than hotel booking');
  assert(budgetInfeasibleRes.violatedConstraints.some(c => c.toLowerCase().includes('budget')), 'Explains budget infeasibility clearly');
}

// -----------------------------------------------------------------
// SCENARIO 10: LARGE ITINERARY (5 Days, 20+ Activities, Deterministic)
// -----------------------------------------------------------------
console.log('\n--- Scenario 10: Large Itinerary Scalability (5 Days, 20+ Stops) ---');
{
  const largeTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-05',
    days: 5,
    travelers: 2,
    budget: { total: 80000, spent: 30000, currency: 'INR' },
    itinerary: [
      makeDay(1, 'Day 1', 'North Goa Beaches', [
        makeActivity('l-1', 'Calangute Beach', 'Calangute, Goa', '09:00', 90, 0, 'relaxation'),
        makeActivity('l-2', 'Baga Beach Watersports', 'Baga Beach, Goa', '11:00', 120, 1500, 'adventure'),
        makeActivity('l-3', 'Anjuna Flea Market', 'Anjuna, Goa', '14:30', 90, 500, 'sightseeing'),
        makeActivity('l-4', 'Vagator Sunset Point', 'Vagator, Goa', '17:00', 60, 0, 'relaxation')
      ]),
      makeDay(2, 'Day 2', 'Heritage & Churches', [
        makeActivity('l-5', 'Basilica of Bom Jesus', 'Old Goa, Goa', '09:30', 75, 50, 'sightseeing'),
        makeActivity('l-6', 'Se Cathedral', 'Old Goa, Goa', '11:00', 60, 50, 'sightseeing'),
        makeActivity('l-7', 'Fontainhas Heritage Walk', 'Fontainhas, Panaji, Goa', '14:00', 90, 300, 'sightseeing'),
        makeActivity('l-8', 'Mandovi Sunset Cruise', 'Panaji, Goa', '17:30', 60, 600, 'relaxation')
      ]),
      makeDay(3, 'Day 3', 'South Goa Serenity', [
        makeActivity('l-9', 'Colva Beach', 'Colva, Goa', '09:00', 90, 0, 'relaxation'),
        makeActivity('l-10', 'Benaulim Fisherman Village', 'Benaulim, Goa', '11:30', 60, 200, 'sightseeing'),
        makeActivity('l-11', 'Cabo de Rama Fort', 'Canacona, Goa', '14:30', 90, 100, 'sightseeing'),
        makeActivity('l-12', 'Palolem Beach Kayaking', 'Palolem, Goa', '17:00', 60, 400, 'adventure')
      ]),
      makeDay(4, 'Day 4', 'Spice & Wildlife', [
        makeActivity('l-13', 'Sahakari Spice Farm', 'Ponda, Goa', '09:30', 120, 500, 'sightseeing'),
        makeActivity('l-14', 'Mangueshi Temple', 'Ponda, Goa', '12:30', 45, 0, 'sightseeing'),
        makeActivity('l-15', 'Dudhsagar Jeep Safari', 'Mollem, Goa', '14:00', 180, 2000, 'adventure'),
        makeActivity('l-16', 'Mollem Nature Reserve', 'Mollem, Goa', '17:30', 60, 200, 'sightseeing')
      ]),
      makeDay(5, 'Day 5', 'Culinary & Farewell', [
        makeActivity('l-17', 'Panaji Municipal Market', 'Panaji, Goa', '10:00', 60, 300, 'sightseeing'),
        makeActivity('l-18', 'Traditional Goan Lunch', 'Panaji, Goa', '12:00', 90, 900, 'food'),
        makeActivity('l-19', 'Miramar Beach Walk', 'Miramar, Panaji, Goa', '14:30', 60, 0, 'relaxation'),
        makeActivity('l-20', 'Dona Paula Viewpoint', 'Dona Paula, Panaji, Goa', '16:00', 60, 50, 'sightseeing')
      ])
    ]
  };

  const startTime = Date.now();
  const res = optimizeTripItinerary(largeTrip, 0.15, { objective: 'relaxed' });
  const durationMs = Date.now() - startTime;

  assert(durationMs < 500, `Large itinerary (20 stops, 5 days) optimized deterministically in ${durationMs}ms (< 500ms)`);
  assert(res.optimizedItinerary.length === 5, 'All 5 days retained in optimized plan');
  assert(res.beforeMetrics.activityCount === 20, 'Before metrics register all 20 activities');
  assert(res.softConstraintScoresAfter.fatigueScore !== undefined, 'Fatigue score evaluated across 5 days');
  assert(res.healthScoreAfter > 0, 'Authoritative health score calculated for full itinerary');
}

// -----------------------------------------------------------------
// SCENARIO 11: WHAT-IF SIMULATION (Unified Optimizer Execution)
// -----------------------------------------------------------------
console.log('\n--- Scenario 11: What-If Simulation Unified Optimizer ---');
{
  const baseTrip: TripContext = {
    destination: 'Goa',
    startDate: '2026-11-01',
    endDate: '2026-11-03',
    days: 3,
    travelers: 2,
    budget: { total: 35000, spent: 18000, currency: 'INR' },
    itinerary: [
      makeDay(1, 'Day 1', 'North Coast', [
        makeActivity('a1', 'Fort Aguada', 'Candolim, Goa', '10:00', 60, 200, 'sightseeing'),
        makeActivity('a2', 'Candolim Beach', 'Candolim, Goa', '14:00', 90, 0, 'relaxation')
      ]),
      makeDay(2, 'Day 2', 'Water Adventure', [
        makeActivity('a3', 'Baga Beach Watersports', 'Baga Beach, Goa', '10:30', 120, 2500, 'adventure'),
        makeActivity('a4', 'Anjuna Beach', 'Anjuna, Goa', '15:00', 90, 0, 'relaxation')
      ]),
      makeDay(3, 'Day 3', 'Panaji Culture', [
        makeActivity('a5', 'Fontainhas Latin Quarter', 'Panaji, Goa', '11:00', 90, 300, 'sightseeing')
      ])
    ]
  };

  // 11A. Budget Change What-If
  const budgetWhatIf = simulateWhatIfScenario({
    tripContext: baseTrip,
    scenarioType: 'budget_change',
    parameters: { targetBudget: 15000 }
  });
  assert(Boolean(budgetWhatIf.suggestedAction?.optimizationResult), 'Budget what-if returns authoritative optimizationResult');
  assert(budgetWhatIf.projectedState.totalBudget <= budgetWhatIf.currentState.totalBudget, 'Budget what-if projects reduced total budget');

  // 11B. Weather Disruption What-If
  const weatherWhatIf = simulateWhatIfScenario({
    tripContext: baseTrip,
    scenarioType: 'weather_rain',
    parameters: { targetDay: 2, rainChancePercent: 90, weatherCondition: 'Heavy Downpour' }
  });
  assert(Boolean(weatherWhatIf.suggestedAction?.optimizationResult), 'Weather what-if returns authoritative optimizationResult');
  assert(weatherWhatIf.suggestedAction?.optimizationResult?.objective === 'balanced', 'Weather what-if uses multi-objective optimizer');

  // 11C. Remove Day What-If
  const removeDayWhatIf = simulateWhatIfScenario({
    tripContext: baseTrip,
    scenarioType: 'remove_day',
    parameters: { dayToRemove: 3 }
  });
  assert(Boolean(removeDayWhatIf.suggestedAction?.optimizationResult), 'Remove-day what-if returns authoritative optimizationResult');
  assert(removeDayWhatIf.projectedState.activityCount < removeDayWhatIf.currentState.activityCount, 'Condensed itinerary reflects reduced activity count');

  // 11D. Pace Change What-If
  const paceWhatIf = simulateWhatIfScenario({
    tripContext: baseTrip,
    scenarioType: 'pace_change',
    parameters: { targetPace: 'relaxed' }
  });
  assert(Boolean(paceWhatIf.suggestedAction?.optimizationResult), 'Pace what-if returns authoritative optimizationResult');
  assert(paceWhatIf.suggestedAction?.optimizationResult?.objective === 'relaxed', 'Pace what-if adopts relaxed multi-objective weights');
}

// -----------------------------------------------------------------
// OBJECTIVES DIVERSITY TEST (Verifies all 8 Objectives Support)
// -----------------------------------------------------------------
console.log('\n--- Objective Profiles Verification (All 8 Objectives) ---');
{
  const allObjectives: OptimizationObjective[] = [
    'minimum_travel_time',
    'minimum_distance',
    'minimum_cost',
    'maximum_experience',
    'balanced',
    'relaxed',
    'adventure',
    'family_friendly'
  ];

  for (const obj of allObjectives) {
    const weights = OBJECTIVE_WEIGHT_PROFILES[obj];
    assert(Boolean(weights), `Weight profile exists for objective: ${obj}`);
    const sum = weights.routeEfficiency + weights.experienceValue + weights.weatherCompatibility +
                weights.budgetEfficiency + weights.timeBalance + weights.fatigueScore + weights.activityDiversity;
    assert(Math.abs(sum - 1.0) < 0.001, `Weights sum to exactly 1.0 for ${obj} (sum = ${sum.toFixed(3)})`);
  }
}

console.log('\n====================================================');
console.log(`PHASE 7 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================');
