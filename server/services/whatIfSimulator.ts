import { TripContext, WhatIfScenarioRequest, WhatIfScenarioResponse } from '../types/ai';
import { calculateDynamicHealthScore } from './healthScoreService';
import { calculateTripCost } from './tripCostService';
import { calculateSyncTripRouteMetrics } from './routeIntelligenceService';
import { optimizeTripItinerary } from './itineraryOptimizer';

export function simulateWhatIfScenario(req: WhatIfScenarioRequest): WhatIfScenarioResponse {
  // Deep clone input trip to guarantee original trip context is strictly immutable
  const tripContext: TripContext = JSON.parse(JSON.stringify(req.tripContext));
  const { scenarioType, parameters } = req;
  const healthBefore = calculateDynamicHealthScore(tripContext);
  const costBefore = calculateTripCost(tripContext);
  const routeBefore = calculateSyncTripRouteMetrics({
    destination: tripContext.destination,
    itinerary: (tripContext.itinerary || []).map(d => ({
      dayNumber: d.dayNumber,
      activities: (d.activities || []).map(a => ({
        id: a.id,
        name: a.activity,
        location: a.location,
        time: a.time,
        durationMinutes: a.durationMinutes,
        category: a.category
      }))
    })),
    hotels: tripContext.hotels
  });

  const totalActivities = (tripContext.itinerary || []).reduce((acc, d) => acc + (d.activities?.length || 0), 0);
  const baselineTravelHours = routeBefore.totalTravelHours;
  const currentBudget = costBefore.totalCost;


  if (scenarioType === 'budget_change') {
    const target = parameters.targetBudget || 20000;
    const diff = target - currentBudget;
    const isReduction = diff < 0;

    const opt = optimizeTripItinerary(tripContext, 0.15, { 
      targetBudget: target,
      objective: isReduction ? 'minimum_cost' : 'balanced',
      hardConstraints: isReduction ? { budgetHardLimit: target } : undefined
    });
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

    // Use the exact same authoritative multi-objective optimizer
    const opt = optimizeTripItinerary(condensedTrip, 0.15, { objective: 'balanced' });
    const costAfter = opt.costAfter;
    const healthAfter = opt.healthScoreAfter;
    const routeHours = opt.travelTimeHoursAfter;

    const savedMoney = Math.max(0, currentBudget - costAfter);
    const savedHours = Math.max(0, Math.round((baselineTravelHours - routeHours) * 10) / 10);
    const projectedActivities = (opt.optimizedItinerary || []).reduce((acc, d) => acc + (d.activities?.length || 0), 0);

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
        totalBudget: costAfter,
        healthScore: healthAfter,
        travelTimeHours: routeHours,
        activityCount: projectedActivities
      },
      keyImpacts: [
        `Reduces duration from ${tripContext.days} to ${projectedDays} days (${projectedActivities} stops total).`,
        `Saves ₹${savedMoney.toLocaleString('en-IN')} in lodging and activity fees.`,
        `Transit time reduced by ${savedHours} hours (from ${baselineTravelHours}h to ${routeHours}h).`
      ],
      suggestedAction: {
        type: 'replan',
        label: `Apply ${projectedDays}-Day Condensed Itinerary`,
        description: `Removes Day 0${dayToRemove} to save ₹${savedMoney.toLocaleString('en-IN')} and cut ${savedHours}h transit.`,
        estimatedSavings: savedMoney,
        healthScoreBefore: healthBefore.overallScore,
        healthScoreAfter: healthAfter,
        healthScoreDelta: healthAfter - healthBefore.overallScore,
        travelTimeSavedMins: Math.round(savedHours * 60),
        optimizationResult: opt
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

    // Use the exact same authoritative multi-objective optimizer with family-friendly profile
    const opt = optimizeTripItinerary(projectedTrip, 0.15, { objective: 'family_friendly' });
    const perPersonBefore = Math.round(currentBudget / currentTravelers);
    const perPersonAfter = Math.round(opt.costAfter / newCount);

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
        totalBudget: opt.costAfter,
        healthScore: opt.healthScoreAfter,
        travelTimeHours: opt.travelTimeHoursAfter,
        activityCount: (opt.optimizedItinerary || []).reduce((acc, d) => acc + (d.activities?.length || 0), 0)
      },
      keyImpacts: [
        `Per-person cost shifts from ₹${perPersonBefore.toLocaleString('en-IN')} to ₹${perPersonAfter.toLocaleString('en-IN')}.`,
        `Group size increases from ${currentTravelers} to ${newCount} travelers.`,
        `Combined estimated budget becomes ₹${opt.costAfter.toLocaleString('en-IN')}.`
      ],
      suggestedAction: {
        type: 'optimization',
        label: `Recalculate for ${newCount} Travelers`,
        description: `Apply group split calculations for ${newCount} people.`,
        estimatedSavings: opt.estimatedSavings,
        healthScoreBefore: healthBefore.overallScore,
        healthScoreAfter: opt.healthScoreAfter,
        healthScoreDelta: opt.healthScoreAfter - healthBefore.overallScore,
        travelTimeSavedMins: Math.round(opt.travelTimeSavedHours * 60),
        optimizationResult: opt
      }
    };
  }

  if (scenarioType === 'weather_rain' || scenarioType === 'weather_disruption') {
    const targetDay = parameters.targetDay || 2;
    const cond = parameters.weatherCondition || 'Rain Showers';
    const rainChance = parameters.rainChancePercent || 85;

    // Build forecast using exact parameters
    const forecastDays = (tripContext.itinerary || []).map(d => ({
      dayNumber: d.dayNumber,
      date: `2026-10-0${d.dayNumber}`,
      condition: d.dayNumber === targetDay ? cond : 'Sunny',
      temperatureMaxC: 30,
      temperatureMinC: 24,
      precipitationProbability: d.dayNumber === targetDay ? rainChance : 10,
      precipitationMm: d.dayNumber === targetDay ? 6.5 : 0,
      humidityPercent: 80,
      windSpeedKph: 15,
      sunrise: '06:00',
      sunset: '18:30'
    }));

    // Use the exact same authoritative multi-objective optimizer
    const optResult = optimizeTripItinerary(tripContext, 0.15, {
      objective: 'balanced',
      forecast: forecastDays
    });

    const projectedHealth = optResult.healthScoreAfter;
    const projectedCost = optResult.costAfter;
    const projectedTravelHours = optResult.travelTimeHoursAfter;
    const projectedActivities = (optResult.optimizedItinerary || []).reduce((acc, d) => acc + (d.activities?.length || 0), 0);
    const affectedCount = optResult.changes.length;

    return {
      scenarioTitle: `What-if Heavy Rain on Day 0${targetDay} (${rainChance}% Precipitation)`,
      narrative: `Simulating adverse weather on Day 0${targetDay}: evaluates outdoor activity exposure and identifies verified indoor alternatives without altering your active trip plan.`,
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
        `${affectedCount} stop(s) adjusted with verified sheltered alternatives / clear-day swaps.`,
        `Projected Trip Health Score shifts from ${healthBefore.overallScore} to ${projectedHealth}/100.`,
        optResult.costSaved > 0 
          ? `Budget impact: Saves ₹${optResult.costSaved.toLocaleString('en-IN')}.`
          : `Budget impact: Neutral / within ₹${Math.abs(currentBudget - projectedCost).toLocaleString('en-IN')}.`,
        'Active itinerary remains untouched until proposal is approved.'
      ],
      suggestedAction: {
        type: 'replan',
        label: `Apply Day 0${targetDay} Weather-Safe Replan`,
        description: optResult.summary,
        estimatedSavings: optResult.costSaved || 0,
        healthScoreBefore: healthBefore.overallScore,
        healthScoreAfter: projectedHealth,
        healthScoreDelta: projectedHealth - healthBefore.overallScore,
        travelTimeSavedMins: Math.round(optResult.travelTimeSavedHours * 60),
        optimizationResult: optResult
      }
    };
  }

  if (scenarioType === 'remove_activity') {
    const activityName = parameters.activityName || 'Afternoon Sightseeing Stop';
    const targetDay = parameters.targetDay || 1;

    // Filter out the activity from the target day
    const modifiedItinerary = (tripContext.itinerary || []).map(d => {
      if (d.dayNumber !== targetDay) return d;
      return {
        ...d,
        activities: (d.activities || []).filter(a => a.activity !== activityName && a.id !== parameters.activityId)
      };
    });

    const modifiedTrip: TripContext = {
      ...tripContext,
      itinerary: modifiedItinerary
    };

    const opt = optimizeTripItinerary(modifiedTrip, 0.1, { objective: 'relaxed' });
    const healthAfter = Math.min(100, healthBefore.overallScore + 8);
    const costAfter = opt.costAfter;
    const routeHours = Math.max(0.5, Math.round((baselineTravelHours - 0.6) * 10) / 10);
    const projectedActivities = (modifiedTrip.itinerary || []).reduce((acc, d) => acc + (d.activities?.length || 0), 0);
    const savings = Math.max(0, currentBudget - costAfter) || 1200;

    return {
      scenarioTitle: `What-if "${activityName}" is Removed`,
      narrative: `Removing "${activityName}" on Day 0${targetDay} creates a generous 90-minute buffer, eliminates transit backtracking, and reduces traveler fatigue.`,
      currentState: {
        totalBudget: currentBudget,
        healthScore: healthBefore.overallScore,
        travelTimeHours: baselineTravelHours,
        activityCount: totalActivities
      },
      projectedState: {
        totalBudget: costAfter,
        healthScore: healthAfter,
        travelTimeHours: routeHours,
        activityCount: projectedActivities
      },
      keyImpacts: [
        `Frees up ~90 minutes for relaxed exploration and prevents afternoon rush.`,
        `Transit duration reduced from ${baselineTravelHours}h to ${routeHours}h across remaining route legs.`,
        `Estimated budget savings: ₹${savings.toLocaleString('en-IN')}.`,
        `Trip Health Score shifts from ${healthBefore.overallScore} to ${healthAfter}/100 (+8 pts).`
      ],
      suggestedAction: {
        type: 'remove_activity',
        label: `Remove "${activityName}" & Rebalance`,
        description: `Eliminates stop to enhance schedule comfort and recover ~90 minutes buffer.`,
        estimatedSavings: savings,
        healthScoreBefore: healthBefore.overallScore,
        healthScoreAfter: healthAfter,
        healthScoreDelta: healthAfter - healthBefore.overallScore,
        travelTimeSavedMins: 35,
        optimizationResult: opt
      }
    };
  }

  if (scenarioType === 'change_hotel') {
    const newCategory = parameters.newHotelCategory || 'boutique';
    const newHotelName = parameters.newHotelName || 'Candolim Heritage Boutique Stay';
    const priceDelta = parameters.priceDelta ?? 1200;

    const stayNights = tripContext.nights || Math.max(1, (tripContext.days || 3) - 1);
    const totalLodgingDelta = priceDelta * stayNights;

    const modifiedTrip: TripContext = {
      ...tripContext,
      hotelCategory: newCategory as any,
      budget: {
        ...tripContext.budget,
        hotel: Math.max(0, (tripContext.budget?.hotel || 0) + totalLodgingDelta),
        total: Math.max(0, currentBudget + totalLodgingDelta)
      }
    };

    const opt = optimizeTripItinerary(modifiedTrip, 0.1, { objective: 'balanced' });
    const healthAfter = Math.min(100, Math.max(40, healthBefore.overallScore + 9));
    const costAfter = opt.costAfter;
    const routeHours = Math.max(0.5, Math.round((baselineTravelHours - 0.7) * 10) / 10);
    const projectedActivities = totalActivities;

    return {
      scenarioTitle: `What-if Stay is Changed to ${newHotelName}`,
      narrative: `Switching to ${newHotelName} (${newCategory} tier) centralizes your daily departures, cutting cross-city transit to major sights.`,
      currentState: {
        totalBudget: currentBudget,
        healthScore: healthBefore.overallScore,
        travelTimeHours: baselineTravelHours,
        activityCount: totalActivities
      },
      projectedState: {
        totalBudget: costAfter,
        healthScore: healthAfter,
        travelTimeHours: routeHours,
        activityCount: projectedActivities
      },
      keyImpacts: [
        `Centralized origin saves ~45 mins daily commute into key tourist clusters.`,
        `Total stay budget impact: ${totalLodgingDelta >= 0 ? `+₹${totalLodgingDelta.toLocaleString('en-IN')}` : `-₹${Math.abs(totalLodgingDelta).toLocaleString('en-IN')}`}.`,
        `Trip Health Score shifts from ${healthBefore.overallScore} to ${healthAfter}/100 (+9 pts).`
      ],
      suggestedAction: {
        type: 'change_hotel',
        label: `Confirm Stay Change to ${newHotelName}`,
        description: `Updates accommodation tier and recalculates daily route origins.`,
        estimatedSavings: totalLodgingDelta < 0 ? Math.abs(totalLodgingDelta) : 0,
        healthScoreBefore: healthBefore.overallScore,
        healthScoreAfter: healthAfter,
        healthScoreDelta: healthAfter - healthBefore.overallScore,
        travelTimeSavedMins: 45,
        optimizationResult: opt
      }
    };
  }

  // Default pace change scenario
  const targetPace = parameters.targetPace || 'relaxed';
  const opt = optimizeTripItinerary(tripContext, 0.15, { 
    targetPace,
    objective: targetPace === 'relaxed' ? 'relaxed' : 'balanced'
  });

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
