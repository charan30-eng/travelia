import { TripContext, WhatIfScenarioRequest, WhatIfScenarioResponse } from '../types/ai';
import { calculateDynamicHealthScore } from './healthScoreService';

export function simulateWhatIfScenario(req: WhatIfScenarioRequest): WhatIfScenarioResponse {
  const { tripContext, scenarioType, parameters } = req;
  const healthBefore = calculateDynamicHealthScore(tripContext);

  const totalActivities = tripContext.itinerary.reduce((acc, d) => acc + (d.activities?.length || 0), 0);
  const baselineTravelHours = Math.round((totalActivities * 0.85 + (tripContext.itinerary.length * 1.2)) * 10) / 10;
  const currentBudget = tripContext.budget?.total || 25000;

  if (scenarioType === 'budget_change') {
    const target = parameters.targetBudget || 20000;
    const diff = target - currentBudget;
    const isReduction = diff < 0;

    const projectedHealth = isReduction 
      ? Math.max(65, healthBefore.overallScore - 5)
      : Math.min(98, healthBefore.overallScore + 6);

    return {
      scenarioTitle: `What-if Budget Adjusted to ₹${target.toLocaleString()}`,
      narrative: isReduction
        ? `Reducing budget by ₹${Math.abs(diff).toLocaleString()} requires shifting private chauffeur transit to metro/cabs and opting for city combo attraction passes.`
        : `Increasing budget by ₹${diff.toLocaleString()} unlocks boutique hotel upgrades, private boat transfers, and fine dining reservations.`,
      currentState: {
        totalBudget: currentBudget,
        healthScore: healthBefore.overallScore,
        travelTimeHours: baselineTravelHours,
        activityCount: totalActivities
      },
      projectedState: {
        totalBudget: target,
        healthScore: projectedHealth,
        travelTimeHours: baselineTravelHours,
        activityCount: isReduction ? Math.max(2, totalActivities - 1) : totalActivities + 1
      },
      keyImpacts: [
        isReduction ? `Need to economize ₹${Math.abs(diff).toLocaleString()} across lodging and dining.` : `Unlocks ₹${diff.toLocaleString()} buffer for premium experiences.`,
        `Projected Trip Health Score shifts to ${projectedHealth}/100.`,
        isReduction ? 'Recommended: Replace 1 paid nightlife tour with sunset beach walk.' : 'Recommended: Add private sunset catamaran cruise.'
      ],
      suggestedAction: {
        type: 'budget_cut',
        label: isReduction ? `Optimize Trip to ₹${target.toLocaleString()}` : `Apply ₹${target.toLocaleString()} Luxury Tier`,
        description: `Recalculate all stays and activities to match ₹${target.toLocaleString()} ceiling.`,
        estimatedSavings: isReduction ? Math.abs(diff) : 0,
        healthScoreDelta: projectedHealth - healthBefore.overallScore
      }
    };
  }

  if (scenarioType === 'remove_day') {
    const dayToRemove = parameters.dayToRemove || 2;
    const projectedDays = Math.max(1, tripContext.days - 1);
    const projectedHealth = Math.min(94, healthBefore.overallScore + 3);

    return {
      scenarioTitle: `What-if Day 0${dayToRemove} is Removed`,
      narrative: `Compressing trip to ${projectedDays} days eliminates hotel night expenses and condenses the highlights.`,
      currentState: {
        totalBudget: currentBudget,
        healthScore: healthBefore.overallScore,
        travelTimeHours: baselineTravelHours,
        activityCount: totalActivities
      },
      projectedState: {
        totalBudget: Math.round(currentBudget * 0.78),
        healthScore: projectedHealth,
        travelTimeHours: Math.round(baselineTravelHours * 0.75 * 10) / 10,
        activityCount: Math.round(totalActivities * 0.75)
      },
      keyImpacts: [
        `Reduces total duration from ${tripContext.days} to ${projectedDays} days.`,
        `Saves ~₹${Math.round(currentBudget * 0.22).toLocaleString()} in hotel and daily dining.`,
        `Reduces transit time by ~${Math.round(baselineTravelHours * 0.25 * 10) / 10} hours.`
      ],
      suggestedAction: {
        type: 'replan',
        label: `Apply ${projectedDays}-Day Condensed Itinerary`,
        description: `Reorganize stops into a high-impact ${projectedDays}-day route.`,
        estimatedSavings: Math.round(currentBudget * 0.22),
        healthScoreDelta: projectedHealth - healthBefore.overallScore
      }
    };
  }

  if (scenarioType === 'add_traveler') {
    const newCount = (tripContext.travelers || 2) + 1;
    const addedCost = Math.round(currentBudget * 0.35);

    return {
      scenarioTitle: `What-if Traveler Count increases to ${newCount}`,
      narrative: `Adding a traveler increases group split efficiency for cabs and villas while adding individual meal and attraction costs.`,
      currentState: {
        totalBudget: currentBudget,
        healthScore: healthBefore.overallScore,
        travelTimeHours: baselineTravelHours,
        activityCount: totalActivities
      },
      projectedState: {
        totalBudget: currentBudget + addedCost,
        healthScore: healthBefore.overallScore,
        travelTimeHours: baselineTravelHours,
        activityCount: totalActivities
      },
      keyImpacts: [
        `Per-person cost drops due to shared cab rides and split suite lodging.`,
        `Group size increases from ${tripContext.travelers} to ${newCount} travelers.`,
        `Total combined budget increases by ~₹${addedCost.toLocaleString()}.`
      ],
      suggestedAction: {
        type: 'optimization',
        label: `Recalculate for ${newCount} Travelers`,
        description: `Apply group split math and update booking reservations.`,
        estimatedSavings: 0,
        healthScoreDelta: 0
      }
    };
  }

  // Default pace change scenario
  const targetPace = parameters.targetPace || 'relaxed';
  return {
    scenarioTitle: `What-if Trip Pace is set to '${targetPace}'`,
    narrative: targetPace === 'relaxed'
      ? 'A relaxed pace limits each day to maximum 3 curated stops with 2-hour leisurely breaks.'
      : 'A packed pace maximizes sightseeing with 5+ stops per day, covering all top attractions.',
    currentState: {
      totalBudget: currentBudget,
      healthScore: healthBefore.overallScore,
      travelTimeHours: baselineTravelHours,
      activityCount: totalActivities
    },
    projectedState: {
      totalBudget: currentBudget,
      healthScore: targetPace === 'relaxed' ? 95 : 74,
      travelTimeHours: targetPace === 'relaxed' ? Math.round(baselineTravelHours * 0.7 * 10) / 10 : Math.round(baselineTravelHours * 1.3 * 10) / 10,
      activityCount: targetPace === 'relaxed' ? Math.max(3, totalActivities - 2) : totalActivities + 3
    },
    keyImpacts: [
      targetPace === 'relaxed' ? 'Health Score rises to 95/100 due to spacious rest buffers.' : 'Health score drops to 74/100 due to high transit density.',
      targetPace === 'relaxed' ? 'Transit time drops by ~30%.' : 'Transit time increases by ~30%.'
    ],
    suggestedAction: {
      type: 'optimization',
      label: `Apply ${targetPace} Schedule Pacing`,
      description: `Rebalance all itinerary slots for a ${targetPace} journey.`,
      estimatedSavings: 0,
      healthScoreDelta: targetPace === 'relaxed' ? 95 - healthBefore.overallScore : 74 - healthBefore.overallScore
    }
  };
}
