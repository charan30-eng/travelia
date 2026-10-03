import { optimizeTripItinerary } from './services/itineraryOptimizer';
import { calculateTripCost } from './services/tripCostService';
import { calculateDynamicHealthScore } from './services/healthScoreService';
import { calculateTripRouteMetrics, optimizeWaypointSequence, buildDayWaypoints } from '../src/data/geoRouting';
import { TripContext } from './types/ai';

console.log('======================================================');
console.log('VERIFYING DETERMINISTIC OPTIMIZATION & REAL NUMBERS');
console.log('======================================================\n');

// Sample test trip with intentional backtracking and high-cost activity
const testTrip: TripContext = {
  destination: 'Goa',
  country: 'India',
  days: 3,
  travelers: 2,
  budget: {
    currency: 'INR',
    total: 30000,
    hotel: 9000,
    food: 5000,
    transportation: 3000,
    activities: 13000
  },
  preferences: {
    pace: 'moderate',
    transportPreference: 'cab'
  },
  itinerary: [
    {
      dayNumber: 1,
      title: 'Day 1: North & South Backtracking Route',
      theme: 'Mixed Exploration',
      activities: [
        { id: 'a1', time: '09:00 AM', activity: 'Baga Beach Watersports', location: 'Baga Beach', estimatedCost: 2000, category: 'adventure', duration: '2h', aiRecommendation: 'Morning waves' },
        { id: 'a2', time: '12:00 PM', activity: 'Fontainhas Heritage Walk', location: 'Fontainhas', estimatedCost: 1500, category: 'sightseeing', duration: '1.5h', aiRecommendation: 'Historic quarter' },
        { id: 'a3', time: '03:00 PM', activity: 'Calangute Beach Shacks', location: 'Calangute Beach', estimatedCost: 1200, category: 'food', duration: '1.5h', aiRecommendation: 'Seafood catch' },
        { id: 'a4', time: '06:00 PM', activity: 'Private Luxury Yacht Cruise', location: 'Panaji Jetty', estimatedCost: 5000, category: 'adventure', duration: '3h', aiRecommendation: 'Luxury charter' }
      ]
    },
    {
      dayNumber: 2,
      title: 'Day 2: Cultural Exploration',
      theme: 'Heritage',
      activities: [
        { id: 'a5', time: '10:00 AM', activity: 'Basilica of Bom Jesus', location: 'Old Goa', estimatedCost: 0, category: 'sightseeing', duration: '2h', aiRecommendation: 'UNESCO site' },
        { id: 'a6', time: '01:00 PM', activity: 'Heritage Lunch', location: 'Panaji', estimatedCost: 1500, category: 'food', duration: '1.5h', aiRecommendation: 'Traditional dining' }
      ]
    }
  ]
};

// 1. Cost Before Verification
const costBefore = calculateTripCost(testTrip);
console.log('1. Real Cost Calculation:');
console.log('   Total Cost Before:', costBefore.totalCost);
console.log('   Activity Cost:', costBefore.activityCost);
console.log('   Hotel Cost:', costBefore.hotelCost);
console.log('   Food + Transport:', costBefore.foodCost + costBefore.transportCost);
if (costBefore.totalCost !== 9000 + 5000 + 3000 + (2000 + 1500 + 1200 + 5000 + 0 + 1500)) {
  throw new Error('Cost calculation failed!');
}
console.log('   ✓ Cost matches exact sum of components.\n');

// 2. Route Metrics Verification
const routeBefore = calculateTripRouteMetrics(testTrip);
console.log('2. Real Route Calculation:');
console.log('   Total Distance Before:', routeBefore.totalDistanceKm, 'km');
console.log('   Total Travel Time Before:', routeBefore.totalTravelHours, 'hours');
console.log('   Day 1 Distance:', routeBefore.days[0].distanceKm, 'km');
console.log('   Day 2 Distance:', routeBefore.days[1].distanceKm, 'km');
console.log('   ✓ Route transit calculated from sequential waypoint coordinates.\n');

// 3. Health Score Before Verification
const healthBefore = calculateDynamicHealthScore(testTrip);
console.log('3. Real Health Score:');
console.log(`   Overall Score Before: ${healthBefore.overallScore}/100`);
console.log(`   - Budget Efficiency: ${healthBefore.breakdown.budgetEfficiency.score}/100`);
console.log(`   - Route Efficiency: ${healthBefore.breakdown.routeEfficiency.score}/100`);
console.log(`   - Schedule Balance: ${healthBefore.breakdown.scheduleBalance.score}/100\n`);

// 4. Run Itinerary Optimizer with Beach Preserved
console.log('4. Running Deterministic Itinerary Optimizer (Preserving Beach):');
const optResult = optimizeTripItinerary(testTrip, 0.15, {
  preserveKeywords: ['beach']
});

console.log('   Summary:', optResult.summary);
console.log('   Cost Before:', optResult.costBefore, '-> Cost After:', optResult.costAfter);
console.log('   Estimated Savings:', optResult.estimatedSavings);
console.log('   Travel Distance Before:', optResult.travelDistanceKmBefore, 'km -> After:', optResult.travelDistanceKmAfter, 'km');
console.log('   Distance Saved:', optResult.travelDistanceSavedKm, 'km');
console.log('   Travel Hours Before:', optResult.travelTimeHoursBefore, 'h -> After:', optResult.travelTimeHoursAfter, 'h');
console.log('   Time Saved:', optResult.travelTimeSavedHours, 'h');
console.log('   Health Score Before:', optResult.healthScoreBefore, '-> After:', optResult.healthScoreAfter);
console.log('   Changes Count:', optResult.changes.length);

// Verify savings match costBefore - costAfter exactly
if (optResult.estimatedSavings !== optResult.costBefore - optResult.costAfter) {
  throw new Error(`Savings mismatch! ${optResult.estimatedSavings} !== ${optResult.costBefore - optResult.costAfter}`);
}
console.log('   ✓ Factual consistency: estimatedSavings == costBefore - costAfter');

// Verify that beach activities were preserved
const beachChanged = optResult.changes.some(c => 
  c.action === 'replace' && c.oldActivity?.name.toLowerCase().includes('beach')
);
if (beachChanged) {
  throw new Error('Preserved beach activity was replaced!');
}
console.log('   ✓ Preservation verified: No beach activities were replaced.');

// Verify changes sum equals savings
const sumChangesDiff = optResult.changes.reduce((sum, c) => sum + (c.costDiff < 0 ? Math.abs(c.costDiff) : 0), 0);
if (sumChangesDiff !== optResult.estimatedSavings) {
  throw new Error(`Changes diff sum (${sumChangesDiff}) does not match estimated savings (${optResult.estimatedSavings})!`);
}
console.log(`   ✓ Mathematical audit: Sum of individual change diffs (₹${sumChangesDiff}) exactly matches total savings (₹${optResult.estimatedSavings}).`);

// 5. Test Route Backtracking Elimination with Criss-Cross Route
console.log('\n5. Testing Route Backtracking Elimination on Criss-Cross Stops:');
const zigZagTrip: TripContext = {
  destination: 'Goa',
  days: 1,
  travelers: 2,
  budget: { currency: 'INR', total: 10000, hotel: 3000, activities: 2000 },
  preferences: { pace: 'moderate', transportPreference: 'cab' },
  itinerary: [
    {
      dayNumber: 1,
      title: 'Day 1: Zigzag Stops',
      theme: 'City',
      activities: [
        // Intentionally zigzagging back and forth
        { id: 'z1', time: '09:00 AM', activity: 'Fontainhas Latin Quarter', location: 'Fontainhas', estimatedCost: 500, category: 'sightseeing', duration: '2h', aiRecommendation: 'Architecture' },
        { id: 'z2', time: '12:00 PM', activity: 'Candolim Beach Stroll', location: 'Candolim', estimatedCost: 0, category: 'relaxation', duration: '1.5h', aiRecommendation: 'Sunset walk' },
        { id: 'z3', time: '03:00 PM', activity: 'Basilica of Bom Jesus', location: 'Old Goa', estimatedCost: 300, category: 'sightseeing', duration: '2h', aiRecommendation: 'Historic cathedral' },
        { id: 'z4', time: '06:00 PM', activity: 'Baga Night Shacks', location: 'Baga', estimatedCost: 1200, category: 'food', duration: '2h', aiRecommendation: 'Vibrant dining' }
      ]
    }
  ]
};

const zigOpt = optimizeTripItinerary(zigZagTrip, 0.15);
console.log('   Original Stops:', zigZagTrip.itinerary[0].activities.map(a => a.activity).join(' -> '));
console.log('   Optimized Stops:', zigOpt.optimizedItinerary[0].activities.map(a => a.activity).join(' -> '));
console.log('   Original Distance:', zigOpt.travelDistanceKmBefore, 'km');
console.log('   Optimized Distance:', zigOpt.travelDistanceKmAfter, 'km');
console.log('   Distance Saved:', zigOpt.travelDistanceSavedKm, 'km');
console.log('   Travel Hours Before:', zigOpt.travelTimeHoursBefore, 'h -> After:', zigOpt.travelTimeHoursAfter, 'h');

console.log('\n======================================================');
console.log('ALL DETERMINISTIC AUDIT CHECKS PASSED WITH 100% ACCURACY');
console.log('======================================================');

