import { TripContext, WhatIfScenarioRequest, WhatIfScenarioResponse } from '../types/ai';
import { calculateDynamicHealthScore } from './healthScoreService';
import { calculateTripCost } from './tripCostService';
import { calculateTripRouteMetrics } from '../../src/data/geoRouting';
import { optimizeTripItinerary } from './itineraryOptimizer';

export function simulateWhatIfScenario(req: WhatIfScenarioRequest): WhatIfScenarioResponse {
  const { tripContext, scenarioType, parameters } = req;
  const healthBefore = calculateDynamicHealthScore(tripContext);
  const costBefore = calculateTripCost(tripContext);
  const routeBefore = calculateTripRouteMetrics(tripContext);

  const totalActivities = (tripContext.itinerary || []).reduce((acc, d) => acc + (d.activities?.length || 0), 0);
  const baselineTravelHours = routeBefore.totalTravelHours;
  const currentBudget = costBefore.totalCost;

  if (scenarioType === 'budget_change') {
    const target = parameters.targetBudget || 20000;
    const diff = target - currentBudget;
    const isReduction = diff < 0;

    const opt = optimizeTripItinerary(tripContext, 0.15, { targetBudget: target });
    const projectedHealth = opt.healthScoreAfter;
    const projectedCost = opt.costAfter;
    const projectedTravelHours = opt.travelTimeHoursAfter;
    const projectedActivities = (opt.optimizedItinerary || []).reduce((acc, d) => acc + (d.activities?.length || 0), 0);
    const savings = opt.estimatedSavings;

    return {
      scenarioTitle: `What-if Budget Adjusted to ₹${target.toLocaleString('en-IN')}`,
      narrative: isReduction
        ? `Adjusting budget ceiling to ₹${target.toLocaleString('en-IN')} saves ₹${savings.toLocaleString('en-IN')} by replacing luxury charters and optimizing attraction tiers.`
        : `Increasing budget to ₹${target.toLocaleString('en-IN')} expands buffer for premium dining and boutique upgrades.`,
      currentState: {
        totalBudget: currentBudget,
        healthScore: healthBefore.overallScore,
        travelTimeHours: baselineTravelHours,
        activityCount: totalActivities
      },
      projectedState: {
        totalBudget: projectedCost,
        healthScore: projectedHealth,
        travelTimeHours: projectedTravelHours,
        activityCount: projectedActivities
      },
      keyImpacts: [
        isReduction ? `Itinerary spend reduced by ₹${savings.toLocaleString('en-IN')}.` : `Unlocks ₹${Math.abs(diff).toLocaleString('en-IN')} buffer for premium experiences.`,
        `Projected Trip Health Score shifts from ${healthBefore.overallScore} to ${projectedHealth}/100.`,
        `Transit duration: ${projectedTravelHours}h across ${tripContext.days} days.`
      ],
      suggestedAction: {
        type: 'budget_cut',
        label: isReduction ? `Apply ₹${target.toLocaleString('en-IN')} Budget Optimization` : `Apply ₹${target.toLocaleString('en-IN')} Budget Ceiling`,
        description: opt.summary,
        estimatedSavings: savings,
        healthScoreBefore: healthBefore.overallScore,
        healthScoreAfter: projectedHealth,
        healthScoreDelta: projectedHealth - healthBefore.overallScore,
        travelTimeSavedMins: Math.round(opt.travelTimeSavedHours * 60),
        optimizationResult: opt
      }
    };
  }

  if (scenarioType === 'remove_day') {
    const dayToRemove = parameters.dayToRemove || 2;
    const condensedItinerary = (tripContext.itinerary || [])
      .filter(d => d.dayNumber !== dayToRemove)
      .map((d, idx) => ({ ...d, dayNumber: idx + 1 }));

    const projectedDays = Math.max(1, (tripContext.days || 3) - 1);
    const condensedTrip: TripContext = {
      ...tripContext,
      days: projectedDays,
      itinerary: condensedItinerary
    };

    const costAfter = calculateTripCost(condensedTrip);
    const routeAfter = calculateTripRouteMetrics(condensedTrip);
    const healthAfter = calculateDynamicHealthScore(condensedTrip);

    const savedMoney = Math.max(0, costBefore.totalCost - costAfter.totalCost);
    const savedHours = Math.max(0, Math.round((baselineTravelHours - routeAfter.totalTravelHours) * 10) / 10);
    const projectedActivities = condensedItinerary.reduce((acc, d) => acc + (d.activities?.length || 0), 0);

    return {
      scenarioTitle: `What-if Day 0${dayToRemove} is Removed`,
      narrative: `Compressing trip to ${projectedDays} days eliminates Day 0${dayToRemove} activities and corresponding lodging.`,
      currentState: {
        totalBudget: currentBudget,
        healthScore: healthBefore.overallScore,
        travelTimeHours: baselineTravelHours,
        activityCount: totalActivities
      },
      projectedState: {
        totalBudget: costAfter.totalCost,
        healthScore: healthAfter.overallScore,
        travelTimeHours: routeAfter.totalTravelHours,
        activityCount: projectedActivities
      },
      keyImpacts: [
        `Reduces duration from ${tripContext.days} to ${projectedDays} days (${projectedActivities} stops total).`,
        `Saves ₹${savedMoney.toLocaleString('en-IN')} in lodging and activity fees.`,
        `Transit time reduced by ${savedHours} hours (from ${baselineTravelHours}h to ${routeAfter.totalTravelHours}h).`
      ],
      suggestedAction: {
        type: 'replan',
        label: `Apply ${projectedDays}-Day Condensed Itinerary`,
        description: `Removes Day 0${dayToRemove} to save ₹${savedMoney.toLocaleString('en-IN')} and cut ${savedHours}h transit.`,
        estimatedSavings: savedMoney,
        healthScoreBefore: healthBefore.overallScore,
        healthScoreAfter: healthAfter.overallScore,
        healthScoreDelta: healthAfter.overallScore - healthBefore.overallScore,
        travelTimeSavedMins: Math.round(savedHours * 60)
      }
    };
  }

  if (scenarioType === 'add_traveler') {
    const currentTravelers = tripContext.travelers || 2;
    const newCount = currentTravelers + 1;
    const ratio = newCount / currentTravelers;

    // Activities and meals scale per traveler, while lodging stays fixed for shared room
    const addedActivityCost = Math.round(costBefore.activityCost * (ratio - 1));
    const addedFoodCost = Math.round(costBefore.foodCost * (ratio - 1));
    const addedTotal = addedActivityCost + addedFoodCost;

    const projectedTrip: TripContext = {
      ...tripContext,
      travelers: newCount,
      budget: {
        ...tripContext.budget,
        spent: currentBudget + addedTotal,
        food: (tripContext.budget?.food || 0) + addedFoodCost,
        activities: (tripContext.budget?.activities || 0) + addedActivityCost
      }
    };

    const healthAfter = calculateDynamicHealthScore(projectedTrip);
    const perPersonBefore = Math.round(currentBudget / currentTravelers);
    const perPersonAfter = Math.round((currentBudget + addedTotal) / newCount);

    return {
      scenarioTitle: `What-if Traveler Count increases to ${newCount}`,
      narrative: `Adding a traveler increases group split efficiency for cabs and lodging while adding individual meal and activity costs.`,
      currentState: {
        totalBudget: currentBudget,
        healthScore: healthBefore.overallScore,
        travelTimeHours: baselineTravelHours,
        activityCount: totalActivities
      },
      projectedState: {
        totalBudget: currentBudget + addedTotal,
        healthScore: healthAfter.overallScore,
        travelTimeHours: baselineTravelHours,
        activityCount: totalActivities
      },
      keyImpacts: [
        `Per-person cost shifts from ₹${perPersonBefore.toLocaleString('en-IN')} to ₹${perPersonAfter.toLocaleString('en-IN')}.`,
        `Group size increases from ${currentTravelers} to ${newCount} travelers.`,
        `Combined estimated budget increases by ₹${addedTotal.toLocaleString('en-IN')}.`
      ],
      suggestedAction: {
        type: 'optimization',
        label: `Recalculate for ${newCount} Travelers`,
        description: `Apply group split calculations for ${newCount} people.`,
        estimatedSavings: 0,
        healthScoreBefore: healthBefore.overallScore,
        healthScoreAfter: healthAfter.overallScore,
        healthScoreDelta: healthAfter.overallScore - healthBefore.overallScore,
        travelTimeSavedMins: 0
      }
    };
  }

  // Default pace change scenario
  const targetPace = parameters.targetPace || 'relaxed';
  const opt = optimizeTripItinerary(tripContext, 0.15, { targetPace });

  return {
    scenarioTitle: `What-if Trip Pace is set to '${targetPace}'`,
    narrative: targetPace === 'relaxed'
      ? 'A relaxed pace limits each day to maximum 3 curated stops with comfortable afternoon relaxation buffers.'
      : 'A packed pace maximizes sightseeing with 4+ stops per day, covering top attractions.',
    currentState: {
      totalBudget: currentBudget,
      healthScore: healthBefore.overallScore,
      travelTimeHours: baselineTravelHours,
      activityCount: totalActivities
    },
    projectedState: {
      totalBudget: opt.costAfter,
      healthScore: opt.healthScoreAfter,
      travelTimeHours: opt.travelTimeHoursAfter,
      activityCount: (opt.optimizedItinerary || []).reduce((acc, d) => acc + (d.activities?.length || 0), 0)
    },
    keyImpacts: [
      `Health Score shifts from ${healthBefore.overallScore} to ${opt.healthScoreAfter}/100.`,
      `Transit time: ${opt.travelTimeHoursAfter}h (saved ${opt.travelTimeSavedHours}h).`
    ],
    suggestedAction: {
      type: 'optimization',
      label: `Apply ${targetPace} Schedule Pacing`,
      description: opt.summary,
      estimatedSavings: opt.estimatedSavings,
      healthScoreBefore: healthBefore.overallScore,
      healthScoreAfter: opt.healthScoreAfter,
      healthScoreDelta: opt.healthScoreAfter - healthBefore.overallScore,
      travelTimeSavedMins: Math.round(opt.travelTimeSavedHours * 60),
      optimizationResult: opt
    }
  };
}
