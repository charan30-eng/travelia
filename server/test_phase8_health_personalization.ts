/**
 * TRAVELIA PHASE 8 VERIFICATION SUITE:
 * MATHEMATICALLY TRANSPARENT TRIP HEALTH SCORE & DEEP PERSONALIZATION
 * 
 * Verifies all 7 required scenarios:
 * 1. Balanced Trip (deterministic 7-dimension score, documented weights, no magic numbers)
 * 2. Over-Budget Trip (deterministic budget penalty & constraint violation)
 * 3. Overloaded Day (density penalty & schedule overload detection)
 * 4. Weather-Compatible Trip (rain exposure penalty vs sheltered resilience, exact delta)
 * 5. Travel-Heavy Trip (road transit fatigue & backtracking detection)
 * 6. Personalized Trip (data minimization / zero sensitive data, relaxed, adventure, budget adaptations)
 * 7. Packing Recommendations (context-aware across weather, activities, duration, destination, style)
 */

import { calculateDynamicHealthScore, compareTripHealth, HEALTH_DIMENSION_WEIGHTS } from './services/healthScoreService';
import { sanitizeUserPreferences, personalizeTripItinerary, SENSITIVE_INFO_PATTERNS } from './services/personalizationService';
import { generateContextAwarePackingList } from './services/packingService';
import { TripContext, UserPreferences } from './types/ai';
import { ItineraryActivity, ItineraryDay } from '../src/types';

let totalTests = 0;
let passedTests = 0;

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
  category: 'sightseeing' | 'food' | 'relaxation' | 'adventure' | 'transit' | 'hotel' = 'sightseeing',
  coords?: { latitude: number; longitude: number }
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
    coords,
    aiRecommendation: 'Verified local attraction'
  };
}

function makeDay(dayNumber: number, title: string, activities: ItineraryActivity[]): ItineraryDay {
  return {
    dayNumber,
    title,
    theme: `Day ${dayNumber} Exploration`,
    activities
  };
}

async function runPhase8TestSuite() {
  console.log('\n======================================================================');
  console.log('TRAVELIA PHASE 8 VERIFICATION: HEALTH SCORE & PERSONALIZATION');
  console.log('======================================================================\n');

  // =========================================================================
  // SCENARIO 1: BALANCED TRIP
  // =========================================================================
  console.log('--- 1. SCENARIO: BALANCED TRIP ---');
  {
    const balancedTrip: TripContext = {
      destination: 'Goa',
      days: 3,
      travelers: 2,
      budget: {
        currency: 'INR',
        total: 50000,
        hotel: 18000,
        flights: 12000,
        food: 6000,
        transportation: 3000,
        activities: 4000,
        miscellaneous: 2000
      },
      hotels: [
        {
          id: 'hotel-1',
          name: 'Taj Holiday Village',
          location: 'Candolim',
          latitude: 15.518,
          longitude: 73.766,
          pricePerNight: 6000,
          source: 'hotel_provider',
          dataStatus: 'live'
        }
      ],
      itinerary: [
        makeDay(1, 'Arrival & Heritage', [
          makeActivity('a1-1', 'Fort Aguada Visit', 'Sinquerim', '09:30 AM', 120, 200, 'sightseeing', { latitude: 15.492, longitude: 73.773 }),
          makeActivity('a1-2', 'Coastal Fish Thali Lunch', 'Candolim', '01:00 PM', 90, 800, 'food', { latitude: 15.517, longitude: 73.766 }),
          makeActivity('a1-3', 'Candolim Sunset Walk', 'Candolim Beach', '05:00 PM', 90, 100, 'relaxation', { latitude: 15.515, longitude: 73.762 })
        ]),
        makeDay(2, 'Culture & Spice', [
          makeActivity('a2-1', 'Sahakari Spice Plantation Tour', 'Ponda', '10:00 AM', 150, 600, 'adventure', { latitude: 15.402, longitude: 74.015 }),
          makeActivity('a2-2', 'Traditional Saraswat Feast', 'Ponda', '01:30 PM', 90, 900, 'food', { latitude: 15.405, longitude: 74.012 }),
          makeActivity('a2-3', 'Mangueshi Temple Visit', 'Priol', '04:00 PM', 75, 100, 'sightseeing', { latitude: 15.434, longitude: 73.968 })
        ]),
        makeDay(3, 'Old Goa & Departure', [
          makeActivity('a3-1', 'Basilica of Bom Jesus', 'Old Goa', '09:30 AM', 120, 150, 'sightseeing', { latitude: 15.500, longitude: 73.911 }),
          makeActivity('a3-2', 'Heritage Cafe Bistro', 'Panaji', '01:00 PM', 90, 750, 'food', { latitude: 15.498, longitude: 73.827 }),
          makeActivity('a3-3', 'Fontainhas Latin Quarter Stroll', 'Panaji', '03:30 PM', 105, 100, 'relaxation', { latitude: 15.495, longitude: 73.832 })
        ])
      ]
    };

    const health = calculateDynamicHealthScore(balancedTrip);

    // Verify all 7 dimensions exist
    assert(health.overallScore >= 80, `Balanced trip has high overall score (${health.overallScore}/100)`);
    assert(Boolean(health.dimensionScores.budget), 'Dimension 1: budget exists');
    assert(Boolean(health.dimensionScores.routeEfficiency), 'Dimension 2: routeEfficiency exists');
    assert(Boolean(health.dimensionScores.timeBalance), 'Dimension 3: timeBalance exists');
    assert(Boolean(health.dimensionScores.weatherCompatibility), 'Dimension 4: weatherCompatibility exists');
    assert(Boolean(health.dimensionScores.activityBalance), 'Dimension 5: activityBalance exists');
    assert(Boolean(health.dimensionScores.travelFatigue), 'Dimension 6: travelFatigue exists');
    assert(Boolean(health.dimensionScores.constraintSatisfaction), 'Dimension 7: constraintSatisfaction exists');

    // Verify Documented Weights sum to exactly 1.00
    const w = HEALTH_DIMENSION_WEIGHTS;
    const weightSum = Math.round((w.budget + w.routeEfficiency + w.timeBalance + w.weatherCompatibility + w.activityBalance + w.travelFatigue + w.constraintSatisfaction) * 100) / 100;
    assert(weightSum === 1.00, `Health score weights sum exactly to 1.00 (got ${weightSum})`);
    assert(w.budget === 0.20, 'Budget weight is documented as 0.20');
    assert(w.routeEfficiency === 0.18, 'Route efficiency weight is documented as 0.18');
    assert(w.timeBalance === 0.16, 'Time balance weight is documented as 0.16');
    assert(w.weatherCompatibility === 0.14, 'Weather compatibility weight is documented as 0.14');
    assert(w.activityBalance === 0.12, 'Activity balance weight is documented as 0.12');
    assert(w.travelFatigue === 0.10, 'Travel fatigue weight is documented as 0.10');
    assert(w.constraintSatisfaction === 0.10, 'Constraint satisfaction weight is documented as 0.10');

    // Verify deterministic calculation matches weighted sum without magic numbers
    const calculatedSum = Math.round(
      (health.dimensionScores.budget.score * w.budget) +
      (health.dimensionScores.routeEfficiency.score * w.routeEfficiency) +
      (health.dimensionScores.timeBalance.score * w.timeBalance) +
      (health.dimensionScores.weatherCompatibility.score * w.weatherCompatibility) +
      (health.dimensionScores.activityBalance.score * w.activityBalance) +
      (health.dimensionScores.travelFatigue.score * w.travelFatigue) +
      (health.dimensionScores.constraintSatisfaction.score * w.constraintSatisfaction)
    );
    assert(health.overallScore === calculatedSum, `Overall score (${health.overallScore}) matches deterministic weighted sum (${calculatedSum})`);

    // Verify raw metrics and explanations
    assert(typeof health.dimensionScores.budget.rawMetrics.totalEstimatedCost === 'number', 'Budget contains rawMetrics.totalEstimatedCost');
    assert(health.dimensionScores.budget.explanation.length > 10, 'Budget contains clear non-empty explanation');
    assert(health.strengths.length > 0, `Trip identified ${health.strengths.length} strengths`);
    assert(Array.isArray(health.recommendations), 'Trip includes recommendations list');
  }

  // =========================================================================
  // SCENARIO 2: OVER-BUDGET TRIP
  // =========================================================================
  console.log('\n--- 2. SCENARIO: OVER-BUDGET TRIP ---');
  {
    const overBudgetTrip: TripContext = {
      destination: 'Goa',
      days: 2,
      travelers: 2,
      budget: {
        currency: 'INR',
        total: 10000 // Very tight budget ceiling
      },
      itinerary: [
        makeDay(1, 'Luxury Day 1', [
          makeActivity('ob-1', 'Private Yacht Charter', 'Panaji Marina', '10:00 AM', 180, 18000, 'adventure'),
          makeActivity('ob-2', '5-Star Beachside Dining', 'Miramar', '02:00 PM', 120, 6000, 'food')
        ]),
        makeDay(2, 'Luxury Day 2', [
          makeActivity('ob-3', 'Helicopter Coastline Tour', 'Dabolim', '11:00 AM', 60, 20000, 'sightseeing'),
          makeActivity('ob-4', 'Fine Dining Champagne Dinner', 'Calangute', '07:30 PM', 150, 7000, 'food')
        ])
      ]
    };

    const health = calculateDynamicHealthScore(overBudgetTrip);

    // Overspend is 51,000 against 10,000 budget (> 500% overspend)
    assert(health.dimensionScores.budget.score < 60, `Budget dimension score drops heavily on overspend (${health.dimensionScores.budget.score}/100)`);
    assert(health.dimensionScores.constraintSatisfaction.score <= 60, `Constraint satisfaction score penalized for budget ceiling breach (${health.dimensionScores.constraintSatisfaction.score}/100)`);
    assert(health.risks.some(r => r.toLowerCase().includes('budget')), 'Risks list contains explicit budget warning');
    assert(health.dimensionScores.budget.explanation.toLowerCase().includes('exceeds'), 'Budget explanation details overage');
    assert(health.dimensionScores.budget.rawMetrics.costRatio > 1.5, `Raw costRatio captures severe overage (${health.dimensionScores.budget.rawMetrics.costRatio})`);
  }

  // =========================================================================
  // SCENARIO 3: OVERLOADED DAY
  // =========================================================================
  console.log('\n--- 3. SCENARIO: OVERLOADED DAY ---');
  {
    const overloadedTrip: TripContext = {
      destination: 'Jaipur',
      days: 1,
      travelers: 1,
      budget: {
        currency: 'INR',
        total: 30000
      },
      itinerary: [
        makeDay(1, 'Exhausting Rush Day', [
          makeActivity('ol-1', 'Amber Fort', 'Amer', '07:30 AM', 90, 500, 'sightseeing'),
          makeActivity('ol-2', 'Jaigarh Fort', 'Amer', '09:30 AM', 60, 300, 'sightseeing'),
          makeActivity('ol-3', 'Nahargarh Fort', 'Amer', '11:00 AM', 60, 300, 'sightseeing'),
          makeActivity('ol-4', 'Hawa Mahal', 'Old City', '01:00 PM', 60, 200, 'sightseeing'),
          makeActivity('ol-5', 'City Palace', 'Old City', '02:30 PM', 90, 700, 'sightseeing'),
          makeActivity('ol-6', 'Jantar Mantar', 'Old City', '04:30 PM', 60, 200, 'sightseeing'),
          makeActivity('ol-7', 'Albert Hall Museum', 'Ram Niwas', '06:00 PM', 60, 300, 'sightseeing')
        ])
      ]
    };

    const health = calculateDynamicHealthScore(overloadedTrip);

    assert(health.dimensionScores.timeBalance.score < 70, `Time balance score penalized for 7 stops in one day (${health.dimensionScores.timeBalance.score}/100)`);
    assert(health.dimensionScores.timeBalance.rawMetrics.maxActivitiesInDay === 7, 'Raw metrics record maxActivitiesInDay as 7');
    assert(health.dimensionScores.timeBalance.explanation.toLowerCase().includes('overload'), 'Time balance explanation flags overload alert');
    assert(health.risks.some(r => r.toLowerCase().includes('density') || r.toLowerCase().includes('stops')), 'Risks list flags peak day schedule density');
    assert(health.recommendations.some(r => r.toLowerCase().includes('peak day') || r.toLowerCase().includes('lighter days')), 'Recommendations suggest redistributing stops from peak day');
  }

  // =========================================================================
  // SCENARIO 4: WEATHER-COMPATIBLE TRIP & DELTA CALCULATION
  // =========================================================================
  console.log('\n--- 4. SCENARIO: WEATHER-COMPATIBLE TRIP & DELTA ---');
  {
    const rainyForecast: any = {
      destination: 'Munnar',
      days: [
        { dayNumber: 1, date: '2026-10-10', condition: 'Heavy Rain', precipitationProbability: 85, temperatureMaxC: 21, temperatureMinC: 16 },
        { dayNumber: 2, date: '2026-10-11', condition: 'Sunny / Clear', precipitationProbability: 10, temperatureMaxC: 24, temperatureMinC: 15 }
      ]
    };

    // Unmitigated trip: 2 outdoor activities scheduled in heavy rain
    const exposedTrip: TripContext = {
      destination: 'Munnar',
      days: 2,
      travelers: 2,
      budget: { currency: 'INR', total: 25000 },
      itinerary: [
        makeDay(1, 'Rainy Outdoor Day', [
          makeActivity('w-1', 'Anamudi Peak Trek', 'Munnar National Park', '09:00 AM', 180, 500, 'adventure'), // Outdoor
          makeActivity('w-2', 'Echo Point Walk', 'Echo Point', '02:00 PM', 90, 200, 'sightseeing') // Outdoor
        ]),
        makeDay(2, 'Sunny Day', [
          makeActivity('w-3', 'Tata Tea Museum & Factory Tour', 'KDHP', '10:00 AM', 120, 300, 'sightseeing'), // Indoor
          makeActivity('w-4', 'Spice Garden Stroll', 'Chithirapuram', '02:30 PM', 90, 250, 'relaxation') // Outdoor
        ])
      ]
    };

    // Resilient trip: Rain day has sheltered indoor activities, sunny day has outdoor activities
    const resilientTrip: TripContext = {
      destination: 'Munnar',
      days: 2,
      travelers: 2,
      budget: { currency: 'INR', total: 25000 },
      itinerary: [
        makeDay(1, 'Rainy Sheltered Day', [
          makeActivity('w-1-fixed', 'Tata Tea Museum & Factory Indoor Tasting', 'KDHP', '10:00 AM', 150, 300, 'sightseeing'), // Indoor
          makeActivity('w-2-fixed', 'Ayurvedic Wellness Spa Experience', 'Resort', '02:30 PM', 120, 1500, 'relaxation') // Indoor
        ]),
        makeDay(2, 'Sunny Outdoor Day', [
          makeActivity('w-3-fixed', 'Anamudi Peak Trek', 'Munnar National Park', '09:00 AM', 180, 500, 'adventure'), // Outdoor on sunny day
          makeActivity('w-4-fixed', 'Echo Point & Spice Walk', 'Echo Point', '02:00 PM', 120, 350, 'sightseeing') // Outdoor on sunny day
        ])
      ]
    };

    const healthExposed = calculateDynamicHealthScore(exposedTrip, undefined, rainyForecast);
    const healthResilient = calculateDynamicHealthScore(resilientTrip, undefined, rainyForecast, healthExposed.overallScore);

    assert(healthExposed.dimensionScores.weatherCompatibility.score <= 60, `Rain-exposed trip has low weather score (${healthExposed.dimensionScores.weatherCompatibility.score}/100)`);
    assert(healthExposed.dimensionScores.weatherCompatibility.rawMetrics.rainExposedActivitiesCount === 2, 'Raw metrics record 2 rain-exposed outdoor activities');

    assert(healthResilient.dimensionScores.weatherCompatibility.score === 100, `Resilient trip achieves 100/100 weather score (${healthResilient.dimensionScores.weatherCompatibility.score})`);

    // Delta Verification: exact arithmetic difference (afterScore - beforeScore)
    const exactComparison = compareTripHealth(exposedTrip, resilientTrip, undefined, undefined, rainyForecast);
    const expectedDelta = healthResilient.overallScore - healthExposed.overallScore;
    assert(exactComparison.healthDelta === expectedDelta, `Delta (${exactComparison.healthDelta}) is exactly afterScore (${healthResilient.overallScore}) - beforeScore (${healthExposed.overallScore})`);
    assert(exactComparison.healthDelta > 0, `Exact healthDelta shows positive improvement (+${exactComparison.healthDelta})`);
  }

  // =========================================================================
  // SCENARIO 5: TRAVEL-HEAVY TRIP
  // =========================================================================
  console.log('\n--- 5. SCENARIO: TRAVEL-HEAVY TRIP ---');
  {
    const travelHeavyTrip: TripContext = {
      destination: 'Rajasthan Circuit',
      days: 2,
      travelers: 2,
      budget: { currency: 'INR', total: 40000 },
      itinerary: [
        makeDay(1, 'Long Transit Leg 1', [
          // Waypoints spaced 250km apart
          makeActivity('th-1', 'Jaipur City Palace', 'Jaipur', '09:00 AM', 90, 500, 'sightseeing', { latitude: 26.926, longitude: 75.824 }),
          makeActivity('th-2', 'Jodhpur Mehrangarh Fort', 'Jodhpur', '04:00 PM', 120, 600, 'sightseeing', { latitude: 26.298, longitude: 73.018 }) // 330 km away
        ]),
        makeDay(2, 'Long Transit Leg 2', [
          makeActivity('th-3', 'Udaipur City Palace', 'Udaipur', '11:00 AM', 120, 500, 'sightseeing', { latitude: 24.576, longitude: 73.684 }), // 260 km away
          makeActivity('th-4', 'Pushkar Lake & Ghats', 'Pushkar', '06:00 PM', 90, 200, 'relaxation', { latitude: 26.491, longitude: 74.553 }) // 280 km away
        ])
      ]
    };

    const health = calculateDynamicHealthScore(travelHeavyTrip);

    assert(health.dimensionScores.travelFatigue.score < 65, `Travel fatigue score drops heavily on long transit legs (${health.dimensionScores.travelFatigue.score}/100)`);
    assert(health.dimensionScores.travelFatigue.explanation.toLowerCase().includes('transit fatigue'), 'Travel fatigue explanation explicitly flags elevated transit fatigue');
    assert(health.risks.some(r => r.toLowerCase().includes('transit') || r.toLowerCase().includes('fatigue')), 'Risks list flags transit fatigue');
    assert(health.recommendations.some(r => r.toLowerCase().includes('cluster') || r.toLowerCase().includes('neighborhood')), 'Recommendations propose clustering stops regionally');
  }

  // =========================================================================
  // SCENARIO 6: PERSONALIZED TRIP (DATA MINIMIZATION & STYLE ADAPTATIONS)
  // =========================================================================
  console.log('\n--- 6. SCENARIO: PERSONALIZED TRIP ---');
  {
    // Part A: Data Minimization & Privacy Protection (Strictly NO sensitive info)
    const dangerousInput: any = {
      travelStyle: 'relaxed',
      budgetPreference: 'budget',
      walkingTolerance: 'low',
      preferredStartTime: '10:00 AM',
      preferredEndTime: '06:00 PM',
      foodPreferences: ['Vegetarian', 'Local Street Food'],
      crowdPreference: 'avoid-crowds',
      pacePreference: 'relaxed',
      // SENSITIVE FIELDS INJECTED (must be stripped)
      creditCard: '4111222233334444',
      cvv: '123',
      passportNumber: 'Z1234567',
      ssn: '123-45-6789',
      medicalHistory: 'Diabetic'
    };

    const sanitizedResult = sanitizeUserPreferences(dangerousInput);
    assert(sanitizedResult.rejectedSensitiveFields.length >= 4, `Detected and rejected ${sanitizedResult.rejectedSensitiveFields.length} sensitive fields`);
    assert(!('creditCard' in sanitizedResult.sanitized), 'creditCard was strictly stripped');
    assert(!('passportNumber' in sanitizedResult.sanitized), 'passportNumber was strictly stripped');
    assert(!('ssn' in sanitizedResult.sanitized), 'ssn was strictly stripped');
    assert(!('medicalHistory' in sanitizedResult.sanitized), 'medicalHistory was strictly stripped');
    assert(sanitizedResult.sanitized.travelStyle === 'relaxed', 'Allowed field travelStyle preserved');
    assert(sanitizedResult.sanitized.walkingTolerance === 'low', 'Allowed field walkingTolerance preserved');

    // Part B: Relaxed Traveler Itinerary Adaptation
    const baseTrip: TripContext = {
      destination: 'Paris',
      days: 2,
      travelers: 2,
      budget: { currency: 'EUR', total: 2000, activities: 600 },
      itinerary: [
        makeDay(1, 'Day 1 Rushed', [
          makeActivity('p-1', 'Louvre Museum Tour', 'Central Paris', '08:30 AM', 150, 40, 'sightseeing'),
          makeActivity('p-2', 'Bistro Lunch', 'Latin Quarter', '11:30 AM', 60, 30, 'food'),
          makeActivity('p-3', 'Notre-Dame Walk', 'Île de la Cité', '01:00 PM', 60, 0, 'sightseeing'),
          makeActivity('p-4', 'Eiffel Tower Summit', 'Champ de Mars', '03:00 PM', 120, 50, 'sightseeing'),
          makeActivity('p-5', 'Seine Sunset Cruise', 'Pont Neuf', '06:00 PM', 90, 35, 'relaxation')
        ]),
        makeDay(2, 'Day 2 Full', [
          makeActivity('p-6', 'Montmartre Stroll', 'Sacré-Cœur', '09:00 AM', 120, 10, 'sightseeing'),
          makeActivity('p-7', 'Creperie Lunch', 'Montmartre', '12:00 PM', 60, 25, 'food'),
          makeActivity('p-8', 'Orsay Museum', 'Left Bank', '02:00 PM', 120, 35, 'sightseeing'),
          makeActivity('p-9', 'Champs-Élysées Walk', 'Arc de Triomphe', '05:00 PM', 90, 0, 'sightseeing')
        ])
      ]
    };

    const relaxedPrefs: UserPreferences = {
      travelStyle: 'relaxed',
      pacePreference: 'relaxed',
      preferredStartTime: '10:00 AM',
      walkingTolerance: 'low',
      crowdPreference: 'avoid-crowds'
    };

    const relaxedResult = personalizeTripItinerary(baseTrip, relaxedPrefs);
    const day1Acts = relaxedResult.personalizedTrip.itinerary[0].activities;
    const day2Acts = relaxedResult.personalizedTrip.itinerary[1].activities;

    assert(day1Acts.length === 3, `Relaxed traveler day 1 trimmed from 5 stops down to ${day1Acts.length} quality stops`);
    assert(day2Acts.length === 3, `Relaxed traveler day 2 trimmed down to ${day2Acts.length} stops`);
    assert(day1Acts[0].time === '10:00 AM', `Day 1 morning start shifted to relaxed preferredStartTime (10:00 AM)`);
    assert(relaxedResult.appliedPersonalizations.some(p => p.toLowerCase().includes('buffer')), 'Personalization recorded buffer expansion');

    // Part C: Budget Traveler Itinerary Adaptation
    const budgetPrefs: UserPreferences = {
      travelStyle: 'budget',
      budgetPreference: 'budget',
      foodPreferences: ['Vegetarian', 'Street Food']
    };

    const expensiveTrip: TripContext = {
      destination: 'Tokyo',
      days: 1,
      travelers: 2,
      budget: { currency: 'INR', total: 60000, activities: 20000 },
      itinerary: [
        makeDay(1, 'Tokyo Day', [
          makeActivity('tk-1', 'Exclusive Robot Show & Skydeck', 'Shinjuku', '10:00 AM', 120, 6000, 'sightseeing'),
          makeActivity('tk-2', 'Michelin Wagyu Tasting', 'Ginza', '01:00 PM', 90, 8000, 'food'),
          makeActivity('tk-3', 'High-Speed Go-Kart Tour', 'Akihabara', '04:30 PM', 120, 5000, 'adventure')
        ])
      ]
    };

    const budgetResult = personalizeTripItinerary(expensiveTrip, budgetPrefs);
    assert(budgetResult.totalEstimatedSavings > 5000, `Budget personalization achieved ₹${budgetResult.totalEstimatedSavings} in savings`);
    assert(budgetResult.personalizedTrip.itinerary[0].activities[1].activity.toLowerCase().includes('street food'), 'Dining stop converted to authentic local street food');

    // Part D: Adventure Traveler Itinerary Adaptation
    const adventurePrefs: UserPreferences = {
      travelStyle: 'adventure',
      walkingTolerance: 'high'
    };
    const adventureResult = personalizeTripItinerary(baseTrip, adventurePrefs);
    const hasOutdoorAdventure = adventureResult.personalizedTrip.itinerary.some(d => 
      d.activities.some(a => a.category === 'adventure' || a.activity.toLowerCase().includes('trail') || a.activity.toLowerCase().includes('trek'))
    );
    assert(hasOutdoorAdventure, 'Adventure traveler received active outdoor/trail stop boost');
  }

  // =========================================================================
  // SCENARIO 7: PACKING RECOMMENDATIONS (CONTEXT-AWARE ACROSS 5 DIMENSIONS)
  // =========================================================================
  console.log('\n--- 7. SCENARIO: PACKING RECOMMENDATIONS ---');
  {
    // Weather: Rainy & Cold mountain climate
    const weather = [
      { dayNumber: 1, condition: 'Heavy Rain', precipitationProbability: 75, temperatureMaxC: 12, temperatureMinC: 4 },
      { dayNumber: 2, condition: 'Chilly Rain', precipitationProbability: 60, temperatureMaxC: 14, temperatureMinC: 6 },
      { dayNumber: 3, condition: 'Overcast & Cold', precipitationProbability: 35, temperatureMaxC: 13, temperatureMinC: 5 }
    ];

    // Activities: Mountain trekking, temple visits, and formal dining
    const activities = [
      { activity: 'Triund Ridge Summit Trek', category: 'adventure' },
      { activity: 'Tsuglagkhang Dalai Lama Temple Complex', category: 'sightseeing' },
      { activity: 'Alpine Heritage Fine Dining', category: 'food' }
    ];

    const packing = generateContextAwarePackingList({
      destination: 'Dharamshala, Himachal Pradesh',
      duration: 3,
      tripStyle: 'adventure',
      activities,
      weatherForecast: weather,
      userPreferences: {
        travelStyle: 'adventure',
        walkingTolerance: 'high'
      }
    });

    assert(packing.items.length >= 12, `Generated rich context-aware list with ${packing.items.length} items`);
    assert(packing.destination === 'Dharamshala, Himachal Pradesh', 'Destination is accurately captured');
    assert(packing.duration === 3, 'Duration matches input (3 days)');
    assert(packing.tripStyle === 'adventure', 'Trip style matches input (adventure)');

    // Dimension 1: Weather check (Rain + Cold)
    const hasRainGear = packing.items.some(i => i.name.toLowerCase().includes('umbrella') || i.name.toLowerCase().includes('rain jacket'));
    const hasColdGear = packing.items.some(i => i.name.toLowerCase().includes('thermal') || i.name.toLowerCase().includes('fleece'));
    assert(hasRainGear, 'Weather dimension: includes rain protection gear');
    assert(hasColdGear, 'Weather dimension: includes thermal cold layers');
    assert(packing.weatherInsights.length > 0, `Captured weather insights (${packing.weatherInsights.join('; ')})`);

    // Dimension 2: Activity check (Trekking + Temple + Fine dining)
    const hasHikeGear = packing.items.some(i => i.name.toLowerCase().includes('hiking') || i.name.toLowerCase().includes('trail') || i.name.toLowerCase().includes('blister'));
    const hasTempleAttire = packing.items.some(i => i.name.toLowerCase().includes('modest') || i.name.toLowerCase().includes('scarf') || i.name.toLowerCase().includes('slip-on'));
    const hasFineDiningAttire = packing.items.some(i => i.name.toLowerCase().includes('evening wear') || i.name.toLowerCase().includes('semi-formal'));
    assert(hasHikeGear, 'Activity dimension: includes hiking/trekking gear');
    assert(hasTempleAttire, 'Activity dimension: includes modest attire for temple visit');
    assert(hasFineDiningAttire, 'Activity dimension: includes evening wear for dining');

    // Dimension 3: Duration check (quantities calculated based on duration)
    const hasDurationItems = packing.items.some(i => i.aiSuggestedReason && i.aiSuggestedReason.toLowerCase().includes('duration formula'));
    assert(hasDurationItems, 'Duration dimension: garment counts explicitly derived from trip duration');

    // Dimension 4: Destination check (Domestic Indian travel vs International)
    const hasDomesticDoc = packing.items.some(i => i.name.toLowerCase().includes('government id') || i.name.toLowerCase().includes('aadhaar'));
    assert(hasDomesticDoc, 'Destination dimension: includes domestic government ID requirement');

    // International test
    const intlPacking = generateContextAwarePackingList({
      destination: 'London, United Kingdom',
      duration: 5,
      tripStyle: 'cultural'
    });
    const hasPassport = intlPacking.items.some(i => i.name.toLowerCase().includes('passport'));
    const hasAdapter = intlPacking.items.some(i => i.name.toLowerCase().includes('adapter'));
    assert(hasPassport, 'Destination dimension: international destination requires valid passport');
    assert(hasAdapter, 'Destination dimension: international destination includes plug adapter');

    // Dimension 5: Trip style check (Adventure multi-tool / dry bag)
    const hasAdventureItem = packing.items.some(i => i.name.toLowerCase().includes('carabiner') || i.name.toLowerCase().includes('moisture-wicking') || i.name.toLowerCase().includes('daypack'));
    assert(hasAdventureItem, 'Trip style dimension: includes rugged adventure gear');

    // Check that every item has an explicit context-aware reason
    const allHaveReasons = packing.items.every(i => typeof i.aiSuggestedReason === 'string' && i.aiSuggestedReason.length > 5);
    assert(allHaveReasons, 'All generated packing items contain explicit context-aware aiSuggestedReason');
  }

  console.log('\n======================================================================');
  console.log(`PHASE 8 TEST RESULTS: ALL ${passedTests}/${totalTests} ASSERTIONS PASSED (100%)`);
  console.log('======================================================================\n');
}

runPhase8TestSuite().catch(err => {
  console.error('\n[TEST RUNNER FATAL ERROR]:', err);
  process.exit(1);
});
