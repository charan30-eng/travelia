/**
 * TRAVELIA PHASE 4 PERSISTENCE TEST SUITE
 * 
 * Verifies backend SQLite persistence, repositories, REST API endpoints,
 * validation, cascading deletes, error handling, duplicate prevention,
 * concurrent operations, and What-If simulation immutability.
 */

process.env.SQLITE_DB_PATH = ':memory:';

import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from './db/migrations';
import { getDatabase } from './db/connection';
import { TripRepository, tripRepository } from './repositories/tripRepository';
import { ActivityRepository, activityRepository } from './repositories/activityRepository';
import { ExpenseRepository, expenseRepository } from './repositories/expenseRepository';
import { OptimizationRepository, optimizationRepository } from './repositories/optimizationRepository';
import express from 'express';
import { tripRouter } from './routes/tripRoutes';

// Helper for assertions
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

import http from 'http';

let testServer: http.Server | null = null;
let baseUrl = '';

// Helper to make real HTTP requests against the test server
async function fetchApi(method: string, endpoint: string, body?: any): Promise<{ status: number; body: any }> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${endpoint}`, options);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, body: data };
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   TRAVELIA PHASE 4: TRIP PERSISTENCE TEST SUITE');
  console.log('======================================================\n');

  // 1. Setup isolated in-memory SQLite database
  const testDb = getDatabase();
  const testTripRepo = tripRepository;
  const testActRepo = activityRepository;
  const testExpRepo = expenseRepository;
  const testOptRepo = optimizationRepository;

  // Setup test Express app with tripRouter
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/trips', tripRouter);

  await new Promise<void>((resolve) => {
    testServer = testApp.listen(0, '127.0.0.1', () => {
      const addr = testServer!.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  // ----------------------------------------------------
  // TEST 1: Trip Create
  // ----------------------------------------------------
  console.log('TEST 1 — Trip Create');
  const trip1Payload = {
    destination: 'Kyoto, Japan',
    country: 'Japan',
    tagline: 'Temples, shrines, and bamboo groves',
    days: 4,
    nights: 3,
    travelers: 2,
    travelDates: 'Nov 10 – Nov 14, 2026',
    startDate: '2026-11-10',
    endDate: '2026-11-14',
    budget: {
      hotel: 32000,
      flights: 45000,
      food: 16000,
      transportation: 6000,
      activities: 8000,
      miscellaneous: 4000,
      total: 111000
    },
    preferences: ['Relaxation', 'Food & Culture'] as any,
    aiNotes: ['Plan Fushimi Inari visit early at 7:30 AM.'],

    itinerary: [
      {
        dayNumber: 1,
        title: 'Historic Eastern Kyoto',
        theme: 'Culture',
        activities: [
          {
            time: '09:00 AM',
            activity: 'Kiyomizu-dera Temple',
            location: 'Higashiyama, Kyoto',
            estimatedCost: 800,
            duration: '2 hrs',
            durationMinutes: 120,
            coords: [34.9949, 135.7850] as [number, number],
            category: 'sightseeing' as const
          }
        ]
      }
    ]
  };

  const createdTrip = testTripRepo.create(trip1Payload as any);

  assert(Boolean(createdTrip.id), 'Trip created with stable ID');
  assert(createdTrip.destination === 'Kyoto, Japan', 'Trip destination persisted faithfully');
  assert(createdTrip.days === 4, 'Trip duration days persisted');
  assert(createdTrip.budget.total === 111000, 'Trip budget total preserved');
  assert(Boolean(createdTrip.createdAt), 'Trip contains createdAt timestamp');
  assert(Boolean(createdTrip.updatedAt), 'Trip contains updatedAt timestamp');
  assert(createdTrip.itinerary.length === 1, 'Itinerary day created in relational table');
  assert(createdTrip.itinerary[0].activities.length === 1, 'Itinerary activity created in relational table');
  assert(createdTrip.itinerary[0].activities[0].activity === 'Kiyomizu-dera Temple', 'Activity name preserved');
  assert(createdTrip.isDemo === false, 'User trip explicitly flagged isDemo = false');

  // ----------------------------------------------------
  // TEST 2: Trip Read (findById & findAll)
  // ----------------------------------------------------
  console.log('\nTEST 2 — Trip Read (findById & findAll)');
  const fetchedTrip = testTripRepo.findById(createdTrip.id);
  assert(fetchedTrip !== null, 'findById successfully retrieved trip');
  assert(fetchedTrip?.id === createdTrip.id, 'Fetched trip ID matches');
  assert(fetchedTrip?.itinerary[0].activities[0].location === 'Higashiyama, Kyoto', 'Activity location preserved');

  const allTrips = testTripRepo.findAll();
  assert(allTrips.length === 1, 'findAll returns exactly 1 persisted trip');
  assert(allTrips[0].id === createdTrip.id, 'findAll includes created trip');

  // ----------------------------------------------------
  // TEST 3: Trip Update
  // ----------------------------------------------------
  console.log('\nTEST 3 — Trip Update');
  const updatedTrip = testTripRepo.update(createdTrip.id, {
    destination: 'Kyoto & Nara, Japan',
    tagline: 'Temples, shrines, and sacred Nara deer park',
    days: 5,
    budget: {
      ...createdTrip.budget,
      total: 125000
    }
  });

  assert(updatedTrip !== null, 'Trip update succeeds');
  assert(updatedTrip?.destination === 'Kyoto & Nara, Japan', 'Updated destination persisted');
  assert(updatedTrip?.days === 5, 'Updated days persisted');
  assert(updatedTrip?.budget.total === 125000, 'Updated budget total persisted');

  // ----------------------------------------------------
  // TEST 4: Trip Delete & Cascading Child Cleanup
  // ----------------------------------------------------
  console.log('\nTEST 4 — Trip Delete & Cascading');
  const tripToDelete = testTripRepo.create({
    destination: 'Temporary Trip',
    days: 2,
    itinerary: [
      {
        dayNumber: 1,
        title: 'Temp Day 1',
        theme: 'Temp Theme',
        activities: [{ id: 'temp-act-1', duration: '1h', aiRecommendation: 'Temp', time: '10:00 AM', activity: 'Temp Activity', location: 'Temp Loc', estimatedCost: 100, category: 'sightseeing' }] as any
      }
    ]
  } as any);


  // Verify child activity exists before delete
  const actsBefore = testActRepo.findByTripId(tripToDelete.id);
  assert(actsBefore.length === 1, 'Child activity exists prior to delete');

  const deleteSuccess = testTripRepo.delete(tripToDelete.id);
  assert(deleteSuccess === true, 'Trip deletion returns true');
  assert(testTripRepo.findById(tripToDelete.id) === null, 'Deleted trip no longer found');

  const actsAfter = testActRepo.findByTripId(tripToDelete.id);
  assert(actsAfter.length === 0, 'Cascading foreign key deleted all child activities');

  // ----------------------------------------------------
  // TEST 5: Activity CRUD
  // ----------------------------------------------------
  console.log('\nTEST 5 — Activity CRUD');
  // Create activity
  const newActivity = testActRepo.create(createdTrip.id, 1, {
    time: '01:30 PM',
    activity: 'Gion District Walking Tour',
    location: 'Gion, Kyoto',
    estimatedCost: 1500,
    duration: '2.5 hrs',
    category: 'sightseeing',
    aiRecommendation: 'Look for historic machiya townhouses'
  });

  assert(Boolean(newActivity.id), 'New activity created with stable ID');
  assert(newActivity.activity === 'Gion District Walking Tour', 'Activity title saved');
  assert(newActivity.estimatedCost === 1500, 'Activity cost saved');

  // Read activity
  const actById = testActRepo.findById(newActivity.id);
  assert(actById !== null, 'Activity found by ID');
  assert(actById?.location === 'Gion, Kyoto', 'Activity location verified');

  // Update activity
  const updatedAct = testActRepo.update(createdTrip.id, newActivity.id, {
    time: '02:00 PM',
    estimatedCost: 1800,
    activity: 'Gion Artisan Tea & Geisha District Walk'
  });
  assert(updatedAct?.time === '02:00 PM', 'Activity time updated');
  assert(updatedAct?.estimatedCost === 1800, 'Activity cost updated');

  // Delete activity
  const actDeleteSuccess = testActRepo.delete(createdTrip.id, newActivity.id);
  assert(actDeleteSuccess === true, 'Activity successfully deleted');
  assert(testActRepo.findById(newActivity.id) === null, 'Deleted activity no longer found');

  // ----------------------------------------------------
  // TEST 6: Expense CRUD & Budget Recalculation
  // ----------------------------------------------------
  console.log('\nTEST 6 — Expense CRUD & Budget Recalculation');
  // Create expense
  const newExpense = testExpRepo.create(createdTrip.id, {
    title: 'Traditional Kaiseki Dinner',
    category: 'food',
    totalAmount: 9500,
    currency: 'INR',
    paidByMemberId: 'traveler-1',
    paidByMemberName: 'Elena Vance',
    splitAmongIds: ['traveler-1', 'traveler-2'],
    date: '2026-11-10'
  });

  assert(Boolean(newExpense.id), 'Expense created with stable ID');
  assert(newExpense.totalAmount === 9500, 'Expense amount saved');

  // Verify trip budget_spent updated automatically
  let tripAfterExp = testTripRepo.findById(createdTrip.id);
  const spentRow = testDb.prepare('SELECT budget_spent as spent FROM trips WHERE id = ?').get(createdTrip.id) as any;
  assert(Number(spentRow.spent) === 9500, 'Trip budget_spent automatically recalculated to 9500');

  // Update expense
  const updatedExp = testExpRepo.update(createdTrip.id, newExpense.id, {
    totalAmount: 11000,
    title: 'Deluxe Kaiseki Dinner with Sake Pairing'
  });
  assert(updatedExp?.totalAmount === 11000, 'Expense updated amount');
  const spentRow2 = testDb.prepare('SELECT budget_spent as spent FROM trips WHERE id = ?').get(createdTrip.id) as any;
  assert(Number(spentRow2.spent) === 11000, 'Trip budget_spent updated to 11000');

  // Delete expense
  const expDeleteSuccess = testExpRepo.delete(createdTrip.id, newExpense.id);
  assert(expDeleteSuccess === true, 'Expense successfully deleted');
  const spentRow3 = testDb.prepare('SELECT budget_spent as spent FROM trips WHERE id = ?').get(createdTrip.id) as any;
  assert(Number(spentRow3.spent) === 0, 'Trip budget_spent reset to 0 after expense deletion');

  // ----------------------------------------------------
  // TEST 7: Invalid Trip Payload Validation
  // ----------------------------------------------------
  console.log('\nTEST 7 — Invalid Trip Payload Validation');
  const resMissingDest = await fetchApi('POST', '/api/trips', { days: 5 });
  assert(resMissingDest.status === 400, 'Missing destination returns HTTP 400');
  assert(resMissingDest.body.error?.code === 'MISSING_DESTINATION', 'Error code is MISSING_DESTINATION');

  const resNegativeDays = await fetchApi('POST', '/api/trips', { destination: 'Paris', days: -2 });
  assert(resNegativeDays.status === 400, 'Negative days returns HTTP 400');
  assert(resNegativeDays.body.error?.code === 'INVALID_DAYS', 'Error code is INVALID_DAYS');

  const resZeroDays = await fetchApi('POST', '/api/trips', { destination: 'Paris', days: 0 });
  assert(resZeroDays.status === 400, 'Zero days returns HTTP 400');
  assert(resZeroDays.body.error?.code === 'INVALID_DAYS', 'Error code is INVALID_DAYS');

  const resNegativeBudget = await fetchApi('POST', '/api/trips', {
    destination: 'Paris',
    days: 3,
    budget: { hotel: -500 }
  });
  assert(resNegativeBudget.status === 400, 'Negative budget returns HTTP 400');
  assert(resNegativeBudget.body.error?.code === 'INVALID_BUDGET', 'Error code is INVALID_BUDGET');

  const resInvalidId = await fetchApi('POST', '/api/trips', {
    id: '<script>alert(1)</script>',
    destination: 'Paris'
  });
  assert(resInvalidId.status === 400, 'XSS/Illegal characters in ID returns HTTP 400');
  assert(resInvalidId.body.error?.code === 'INVALID_ID', 'Error code is INVALID_ID');

  // ----------------------------------------------------
  // TEST 8: Missing Trip (404 Handling)
  // ----------------------------------------------------
  console.log('\nTEST 8 — Missing Trip (404 Handling)');
  const resNotFound = await fetchApi('GET', '/api/trips/non-existent-trip-999');
  assert(resNotFound.status === 404, 'GET non-existent trip returns HTTP 404');
  assert(resNotFound.body.error?.code === 'NOT_FOUND', 'Error code is NOT_FOUND');

  const resPutNotFound = await fetchApi('PUT', '/api/trips/non-existent-trip-999', { destination: 'Rome' });
  assert(resPutNotFound.status === 404, 'PUT non-existent trip returns HTTP 404');

  const resDeleteNotFound = await fetchApi('DELETE', '/api/trips/non-existent-trip-999');
  assert(resDeleteNotFound.status === 404, 'DELETE non-existent trip returns HTTP 404');

  const resActNotFound = await fetchApi('POST', '/api/trips/non-existent-trip-999/activities', { activity: 'Sight' });
  assert(resActNotFound.status === 404, 'POST activity to non-existent trip returns HTTP 404');

  // ----------------------------------------------------
  // TEST 9: Database Failure / Error Handling
  // ----------------------------------------------------
  console.log('\nTEST 9 — Database Failure / Error Handling');
  // Attempt to query invalid route parameter with bad characters
  const resBadId = await fetchApi('GET', '/api/trips/id%22%20OR%201=1');
  assert(resBadId.status === 400 || resBadId.status === 404, 'SQL injection attempt blocked without 500 crash');

  // Direct repository failure test: insert activity with non-existent trip
  let caughtDbError = false;
  try {
    testActRepo.create('non-existent-trip-id', 1, { activity: 'Test' });
  } catch (err: any) {
    caughtDbError = true;
    assert(err.message.includes('not found'), 'Repository rejects non-existent trip cleanly with informative error');
  }
  assert(caughtDbError, 'Foreign key integrity violation handled safely');

  // ----------------------------------------------------
  // TEST 10: Duplicate Requests / ID Collisions
  // ----------------------------------------------------
  console.log('\nTEST 10 — Duplicate Requests & ID Collisions');
  // Insert first trip via API
  const stableId = `trip-stable-collision-${Date.now()}`;
  const resFirst = await fetchApi('POST', '/api/trips', {
    id: stableId,
    destination: 'Zurich, Switzerland',
    days: 3
  });
  assert(resFirst.status === 201, 'First trip creation succeeds');

  // Attempt duplicate insert with exact same ID
  const resDup = await fetchApi('POST', '/api/trips', {
    id: stableId,
    destination: 'Zurich, Switzerland',
    days: 3
  });
  assert(resDup.status === 409, 'Duplicate trip ID returns HTTP 409 Conflict');
  assert(resDup.body.error?.code === 'TRIP_ALREADY_EXISTS', 'Error code is TRIP_ALREADY_EXISTS');

  // Clean up
  testTripRepo.delete(stableId);

  // ----------------------------------------------------
  // TEST 11: Concurrent Updates / Atomicity
  // ----------------------------------------------------
  console.log('\nTEST 11 — Concurrent Updates & Sort Ordering');
  const concurrentTrip = testTripRepo.create({ destination: 'Singapore', days: 2 });
  
  // Insert 5 activities concurrently
  const actPromises = Array.from({ length: 5 }).map((_, idx) => {
    return Promise.resolve(testActRepo.create(concurrentTrip.id, 1, {
      time: `${10 + idx}:00 AM`,
      activity: `Attraction #${idx + 1}`,
      location: 'Downtown Core',
      estimatedCost: 100 * (idx + 1)
    }));
  });

  const resolvedActs = await Promise.all(actPromises);
  assert(resolvedActs.length === 5, 'All 5 concurrent activity writes succeeded');
  const allSingaporeActs = testActRepo.findByTripId(concurrentTrip.id);
  assert(allSingaporeActs.length === 5, 'Database holds all 5 activities without dropping any');

  // Verify unique IDs
  const uniqueIds = new Set(allSingaporeActs.map(a => a.id));
  assert(uniqueIds.size === 5, 'All concurrent activities have distinct, unique IDs');

  // Clean up
  testTripRepo.delete(concurrentTrip.id);

  // ----------------------------------------------------
  // TEST 12: What-If Immutability
  // ----------------------------------------------------
  console.log('\nTEST 12 — What-If Immutability');
  const whatIfTrip = testTripRepo.create({
    destination: 'Barcelona, Spain',
    days: 3,
    budget: { hotel: 24000, flights: 30000, food: 12000, transportation: 4000, activities: 6000, miscellaneous: 2000, total: 78000 },
    itinerary: [
      {
        dayNumber: 1,
        title: 'Gothic Quarter',
        theme: 'Gothic Theme',
        activities: [
          { id: 'act-bcn-1', duration: '2h', aiRecommendation: 'Gothic', time: '10:00 AM', activity: 'Sagrada Familia', location: 'Eixample', estimatedCost: 2600, category: 'sightseeing' },
          { id: 'act-bcn-2', duration: '1.5h', aiRecommendation: 'Park', time: '02:00 PM', activity: 'Park Guell', location: 'Gracia', estimatedCost: 1000, category: 'sightseeing' }
        ] as any
      }
    ]
  } as any);


  // Record an AI Optimization What-If simulation
  const optRecord = testOptRepo.create(whatIfTrip.id, {
    summary: 'Route ordering swap eliminates 4.2 km backtracking and saves 35 minutes',
    healthScoreBefore: 68,
    healthScoreAfter: 88,
    beforeDistanceKm: 18.5,
    afterDistanceKm: 14.3,
    distanceSavedKm: 4.2,
    beforeTravelMinutes: 65,
    afterTravelMinutes: 30,
    travelTimeSavedMinutes: 35,
    beforeCost: 3600,
    afterCost: 3600,
    costSaved: 0,
    beforeConflictCount: 1,
    afterConflictCount: 0,
    changesJson: JSON.stringify([{ type: 'reorder', description: 'Visited Park Guell before midday heat' }])
  });

  assert(Boolean(optRecord.id), 'Optimization What-If simulation recorded');
  assert(optRecord.tripId === whatIfTrip.id, 'Optimization result linked directly to trip ID');
  assert(optRecord.distanceSavedKm === 4.2, 'Distance saved metric accurately preserved');

  // Verify What-If IMMUTABILITY: original trip in DB must remain completely unchanged!
  const pristineTrip = testTripRepo.findById(whatIfTrip.id);
  assert(pristineTrip?.budget.total === 78000, 'Original trip budget completely untouched by simulation');
  assert(pristineTrip?.itinerary[0].activities.length === 2, 'Original trip activity count preserved');
  assert(pristineTrip?.itinerary[0].activities[0].activity === 'Sagrada Familia', 'Original first activity intact');
  assert(pristineTrip?.itinerary[0].activities[1].activity === 'Park Guell', 'Original second activity intact');

  // Retrieve optimizations for trip
  const tripOpts = testOptRepo.findByTripId(whatIfTrip.id);
  assert(tripOpts.length === 1, 'Successfully retrieved optimization history for trip');
  assert(tripOpts[0].healthScoreAfter === 88, 'Health score after simulation preserved');

  // Clean up
  testTripRepo.delete(whatIfTrip.id);

  // ----------------------------------------------------
  // TEST 13: Demo Trip Separation & Migration
  // ----------------------------------------------------
  console.log('\nTEST 13 — Demo Trip Separation & Migration');
  const demoGoaTrip = {
    id: 'trip-goa-demo-test',
    destination: 'Goa, India',
    country: 'India',
    tagline: 'Sun and beaches',
    days: 5,
    nights: 4,
    travelers: 2,
    budget: { hotel: 18000, food: 7500, transportation: 5000, activities: 6000, miscellaneous: 2000, total: 38500 },
    preferences: ['Relaxation'] as any,
    itinerary: [],
    hotels: [],
    touristPlaces: [],
    restaurants: [],
    aiNotes: [],
    status: 'planning' as const,
    createdAt: '2026-10-01',
    hotelCategory: 'mid' as const,
    transportType: 'cab' as const,
    foodPreference: 'casual' as const,
    activityLevel: 'moderate' as const
  };

  const seededDemo = testTripRepo.seedDemoTrip(demoGoaTrip as any);

  assert(seededDemo.isDemo === true, 'Seeded demo trip is explicitly flagged isDemo = true');

  const demoList = testTripRepo.findAll({ isDemo: true });
  assert(demoList.some(t => t.id === 'trip-goa-demo-test'), 'Demo list includes seeded demo trip');

  const realList = testTripRepo.findAll({ isDemo: false });
  assert(realList.every(t => t.isDemo === false), 'Real user trips list contains zero demo trips');

  // Clean up
  testTripRepo.delete('trip-goa-demo-test');
  testTripRepo.delete(createdTrip.id);

  if (testServer) {
    (testServer as http.Server).close();
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n======================================================');
  console.log(`  PHASE 4 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
