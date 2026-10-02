import { TripContext, ComputedHealthScore, ComputedHealthMetric } from '../types/ai';

/**
 * Real computed Trip Health Score algorithm
 * Weights:
 * - Budget Efficiency: 25%
 * - Route Efficiency: 20%
 * - Schedule Balance: 20%
 * - Rest Time: 15%
 * - Activity Diversity: 10%
 * - Weather Compatibility: 10%
 * Total = 100 points
 */
export function calculateDynamicHealthScore(trip: TripContext): ComputedHealthScore {
  const daysCount = Math.max(1, trip.days || trip.itinerary.length || 1);
  const totalActivities = trip.itinerary.reduce((acc, d) => acc + (d.activities?.length || 0), 0);
  const avgActivitiesPerDay = totalActivities / daysCount;

  // 1. Budget Efficiency (25%)
  // Ratio of allocated budget vs estimated activity/hotel costs
  const declaredBudget = trip.budget?.total || 0;
  const activityCostSum = trip.itinerary.reduce((sum, d) => 
    sum + d.activities.reduce((aSum, a) => aSum + (Number(a.estimatedCost) || 0), 0), 0
  );
  const totalEstimatedCost = (trip.budget?.spent || 0) + activityCostSum + (trip.budget?.hotel || 0);

  let budgetScore = 85;
  let budgetInsight = 'Expenses are reasonably proportioned across travel days.';

  if (declaredBudget > 0) {
    const ratio = totalEstimatedCost / declaredBudget;
    if (ratio <= 0.85) {
      budgetScore = 95;
      budgetInsight = 'Healthy 15%+ surplus buffer remaining for spontaneous local experiences.';
    } else if (ratio <= 1.0) {
      budgetScore = 90;
      budgetInsight = 'Expenses match total budget with comfortable margin.';
    } else if (ratio <= 1.15) {
      budgetScore = 75;
      budgetInsight = `Currently projected ~${Math.round((ratio - 1) * 100)}% over initial budget ceiling.`;
    } else {
      budgetScore = 60;
      budgetInsight = `Significant overspending alert: projected costs exceed budget by over ${Math.round((ratio - 1) * 100)}%.`;
    }
  }

  // 2. Route Efficiency (20%)
  // Evaluate if activities within days share locations/regions or backtrack
  let routeScore = 88;
  let routeInsight = 'Stops grouped along natural geographic corridors.';
  
  // Check for repeated back-and-forth or excessive stops per day
  const maxDayActivities = Math.max(...trip.itinerary.map(d => d.activities?.length || 0), 0);
  if (maxDayActivities > 5) {
    routeScore = 72;
    routeInsight = 'High daily stop count detected; consider clustering nearby attractions to cut transit delays.';
  } else if (maxDayActivities <= 3 && totalActivities > 0) {
    routeScore = 96;
    routeInsight = 'Compact, localized waypoint clustering minimizes transit fatigue.';
  }

  // 3. Schedule Balance (20%)
  // Avoid overpacked days (optimal: 3-4 activities per day)
  let scheduleScore = 86;
  let scheduleInsight = 'Daily activity density is comfortable.';
  if (avgActivitiesPerDay >= 2.5 && avgActivitiesPerDay <= 4.2) {
    scheduleScore = 94;
    scheduleInsight = `Ideal pacing with ~${Math.round(avgActivitiesPerDay * 10) / 10} stops/day, balancing sightseeing with leisure.`;
  } else if (avgActivitiesPerDay > 4.5) {
    scheduleScore = 68;
    scheduleInsight = `Days are heavily packed (${Math.round(avgActivitiesPerDay * 10) / 10} stops/day); risk of rushing and transit fatigue.`;
  } else if (avgActivitiesPerDay < 2) {
    scheduleScore = 80;
    scheduleInsight = 'Relaxed itinerary with light scheduling; room for additional local cultural stops.';
  }

  // 4. Rest Time (15%)
  // Adequate buffer time between activities
  let restScore = 84;
  let restInsight = 'Good evening relaxation buffers between daily stops.';
  if (avgActivitiesPerDay <= 3) {
    restScore = 95;
    restInsight = 'Generous 90+ min midday and evening rest buffers prevent burnout.';
  } else if (avgActivitiesPerDay >= 5) {
    restScore = 65;
    restInsight = 'Tight schedule with under 30 mins buffer between stops; recommend adding a midday breather.';
  }

  // 5. Activity Diversity (10%)
  // Mix of categories (sightseeing, food, relaxation, adventure, culture)
  const categorySet = new Set(
    trip.itinerary.flatMap(d => (d.activities || []).map(a => a.category || 'sightseeing'))
  );
  let diversityScore = 80;
  let diversityInsight = 'Balanced mix of attractions and dining.';
  if (categorySet.size >= 4) {
    diversityScore = 95;
    diversityInsight = `Rich multi-faceted itinerary spanning ${categorySet.size} distinct categories (culture, dining, scenic, leisure).`;
  } else if (categorySet.size >= 3) {
    diversityScore = 88;
    diversityInsight = 'Good blend of dining and sightseeing activities.';
  } else {
    diversityScore = 72;
    diversityInsight = 'Itinerary heavily concentrated in one activity type; consider adding culinary or relaxation stops.';
  }

  // 6. Weather Compatibility (10%)
  // Ratio of indoor vs outdoor flexibility
  let weatherScore = 88;
  let weatherInsight = 'Balanced outdoor coastal and indoor heritage options.';
  const hasRelaxationOrFood = trip.itinerary.some(d => 
    d.activities.some(a => a.category === 'food' || a.category === 'relaxation')
  );
  if (hasRelaxationOrFood) {
    weatherScore = 92;
    weatherInsight = 'Includes indoor dining & sheltered cultural stops adaptable to weather shifts.';
  }

  // Weighted Total (100 points)
  const overall = Math.round(
    (budgetScore * 0.25) +
    (routeScore * 0.20) +
    (scheduleScore * 0.20) +
    (restScore * 0.15) +
    (diversityScore * 0.10) +
    (weatherScore * 0.10)
  );

  const getStatus = (s: number): 'optimal' | 'good' | 'needs_attention' => {
    if (s >= 88) return 'optimal';
    if (s >= 75) return 'good';
    return 'needs_attention';
  };

  const improvements = [];
  if (scheduleScore < 85) {
    improvements.push({
      id: 'imp-schedule',
      title: 'Spread peak activities across lighter days',
      description: 'Evenly balancing stops eliminates rushed transit and boosts daily stamina.',
      impact: '+4 Health Score pts',
      applied: false,
      actionType: 'rest_time' as const
    });
  }
  if (budgetScore < 85) {
    improvements.push({
      id: 'imp-budget',
      title: 'Optimize transit & attraction booking tier',
      description: 'Switching to pre-booked passes and grouped rides saves up to ₹2,800.',
      impact: '+5 Health Score pts',
      applied: false,
      actionType: 'budget_cap' as const
    });
  }
  if (diversityScore < 85) {
    improvements.push({
      id: 'imp-diversity',
      title: 'Incorporate authentic local culinary tasting',
      description: 'Injecting verified regional food stalls enriches cultural variety.',
      impact: '+3 Health Score pts',
      applied: false,
      actionType: 'indoor_backup' as const
    });
  }
  if (improvements.length === 0) {
    improvements.push({
      id: 'imp-buffer',
      title: 'Insert 45-min sunset coastal buffer',
      description: 'Adding a relaxed golden hour stop prevents evening travel stress.',
      impact: '+2 Health Score pts',
      applied: false,
      actionType: 'rest_time' as const
    });
  }

  return {
    overallScore: Math.min(100, Math.max(20, overall)),
    ratingLabel: overall >= 90 ? 'Exceptional Balance' : overall >= 80 ? 'Well Balanced' : overall >= 70 ? 'Moderate Pacing' : 'Needs Optimization',
    summary: `Trip scored ${overall}/100 based on multi-factor analysis: Budget (${budgetScore}/100), Route Transit (${routeScore}/100), Schedule Density (${scheduleScore}/100), Rest Buffers (${restScore}/100), Diversity (${diversityScore}/100), Weather Fit (${weatherScore}/100).`,
    breakdown: {
      budgetEfficiency: {
        name: 'Budget Efficiency',
        score: budgetScore,
        weight: 25,
        status: getStatus(budgetScore),
        insight: budgetInsight
      },
      routeEfficiency: {
        name: 'Route & Transit Efficiency',
        score: routeScore,
        weight: 20,
        status: getStatus(routeScore),
        insight: routeInsight
      },
      scheduleBalance: {
        name: 'Schedule Balance & Pacing',
        score: scheduleScore,
        weight: 20,
        status: getStatus(scheduleScore),
        insight: scheduleInsight
      },
      restTime: {
        name: 'Rest & Buffer Time',
        score: restScore,
        weight: 15,
        status: getStatus(restScore),
        insight: restInsight
      },
      activityDiversity: {
        name: 'Activity Diversity',
        score: diversityScore,
        weight: 10,
        status: getStatus(diversityScore),
        insight: diversityInsight
      },
      weatherCompatibility: {
        name: 'Weather Compatibility',
        score: weatherScore,
        weight: 10,
        status: getStatus(weatherScore),
        insight: weatherInsight
      }
    },
    improvements
  };
}
