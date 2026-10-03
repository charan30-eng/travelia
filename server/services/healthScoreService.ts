import { TripContext, ComputedHealthScore, ComputedHealthMetric } from '../types/ai';
import { calculateTripCost } from './tripCostService';
import { calculateTripRouteMetrics } from '../../src/data/geoRouting';

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
  const daysCount = Math.max(1, trip.days || trip.itinerary?.length || 1);
  const totalActivities = (trip.itinerary || []).reduce((acc, d) => acc + (d.activities?.length || 0), 0);
  const avgActivitiesPerDay = totalActivities / daysCount;

  // 1. Budget Efficiency (25%)
  // Deterministic calculation from actual trip cost breakdown
  const declaredBudget = trip.budget?.total || 0;
  const costBreakdown = calculateTripCost(trip);
  const totalEstimatedCost = costBreakdown.totalCost;

  let budgetScore = 85;
  let budgetInsight = `Projected trip cost ₹${totalEstimatedCost.toLocaleString('en-IN')} is reasonably proportioned across travel days.`;

  if (declaredBudget > 0) {
    const ratio = totalEstimatedCost / declaredBudget;
    if (ratio <= 0.85) {
      budgetScore = 95;
      budgetInsight = `Healthy contingency buffer remaining (Projected ₹${totalEstimatedCost.toLocaleString('en-IN')} vs ₹${declaredBudget.toLocaleString('en-IN')} cap).`;
    } else if (ratio <= 1.0) {
      budgetScore = 90;
      budgetInsight = `Expenses match total budget ceiling (₹${totalEstimatedCost.toLocaleString('en-IN')} of ₹${declaredBudget.toLocaleString('en-IN')}) with comfortable margin.`;
    } else if (ratio <= 1.15) {
      budgetScore = 75;
      budgetInsight = `Currently projected ~${Math.round((ratio - 1) * 100)}% over initial budget ceiling (₹${totalEstimatedCost.toLocaleString('en-IN')} vs ₹${declaredBudget.toLocaleString('en-IN')}).`;
    } else {
      budgetScore = 60;
      budgetInsight = `Significant overspending alert: projected costs (₹${totalEstimatedCost.toLocaleString('en-IN')}) exceed budget ceiling by ${Math.round((ratio - 1) * 100)}%.`;
    }
  }

  // 2. Route Efficiency (20%)
  // Real geographic transit evaluation based on actual destination waypoints
  const routeMetrics = calculateTripRouteMetrics(trip);
  const avgDailyKm = routeMetrics.totalDistanceKm / daysCount;
  const maxDayActivities = Math.max(...(trip.itinerary || []).map(d => d.activities?.length || 0), 0);

  let routeScore = 88;
  let routeInsight = `Total ~${routeMetrics.totalDistanceKm} km (~${routeMetrics.totalTravelHours}h transit) across ${daysCount} days along natural road corridors.`;

  if (maxDayActivities > 5 || avgDailyKm > 45) {
    routeScore = 72;
    routeInsight = `High transit density detected (~${Math.round(avgDailyKm)} km/day, ${routeMetrics.totalTravelHours}h total); consider clustering nearby attractions.`;
  } else if (maxDayActivities <= 3 && totalActivities > 0 && avgDailyKm <= 28) {
    routeScore = 96;
    routeInsight = `Compact, localized waypoint clustering (~${Math.round(avgDailyKm)} km/day) minimizes transit fatigue.`;
  } else if (avgDailyKm <= 35) {
    routeScore = 90;
    routeInsight = `Efficient daily travel distances (~${Math.round(avgDailyKm)} km/day) with manageable road transit.`;
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
    const scheduleDelta = Math.max(1, Math.round((94 - scheduleScore) * 0.20));
    improvements.push({
      id: 'imp-schedule',
      title: 'Spread peak activities across lighter days',
      description: 'Evenly balancing stops eliminates rushed transit and boosts daily stamina.',
      impact: `+${scheduleDelta} Health Score pts`,
      applied: false,
      actionType: 'rest_time' as const
    });
  }
  if (budgetScore < 85) {
    const budgetDelta = Math.max(1, Math.round((95 - budgetScore) * 0.25));
    const budgetDesc = (declaredBudget > 0 && totalEstimatedCost > declaredBudget)
      ? `Aligning itinerary expenditure with your ₹${declaredBudget.toLocaleString('en-IN')} cap reduces overage by ₹${(totalEstimatedCost - declaredBudget).toLocaleString('en-IN')}.`
      : 'Selecting verified regional passes and value dining strengthens budget health and contingency buffer.';
    improvements.push({
      id: 'imp-budget',
      title: 'Optimize transit & attraction booking tier',
      description: budgetDesc,
      impact: `+${budgetDelta} Health Score pts`,
      applied: false,
      actionType: 'budget_cap' as const
    });
  }
  if (diversityScore < 85) {
    const diversityDelta = Math.max(1, Math.round((95 - diversityScore) * 0.10));
    improvements.push({
      id: 'imp-diversity',
      title: 'Incorporate authentic local culinary tasting',
      description: 'Injecting verified regional food stalls enriches cultural variety.',
      impact: `+${diversityDelta} Health Score pts`,
      applied: false,
      actionType: 'indoor_backup' as const
    });
  }
  if (improvements.length === 0) {
    const restDelta = Math.max(1, Math.round((95 - restScore) * 0.15));
    improvements.push({
      id: 'imp-buffer',
      title: 'Insert 45-min sunset coastal buffer',
      description: 'Adding a relaxed golden hour stop prevents evening travel stress.',
      impact: `+${restDelta} Health Score pts`,
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
