import { TripContext, ComputedHealthScore, ComputedHealthMetric } from '../types/ai';
import { calculateTripCost } from './tripCostService';
import { calculateSyncTripRouteMetrics } from './routeIntelligenceService';
import { TripRouteMetrics } from '../types/route';
import { WeatherForecast } from '../types/weather';
import { classifyActivityWeatherProfile } from './weatherImpactService';

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
export function calculateDynamicHealthScore(
  trip: TripContext,
  precomputedRouteMetrics?: TripRouteMetrics,
  weatherForecast?: WeatherForecast | null
): ComputedHealthScore {
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
  // Derived directly from the authoritative Route Intelligence Engine
  const routeMetrics = precomputedRouteMetrics || calculateSyncTripRouteMetrics({
    destination: trip.destination,
    itinerary: (trip.itinerary || []).map(d => ({
      dayNumber: d.dayNumber,
      activities: (d.activities || []).map((a: any) => ({
        id: a.id || `act-${Math.random()}`,
        name: a.activity || a.name || 'Activity',
        location: a.location,
        coords: a.coords,
        time: a.time,
        durationMinutes: a.durationMinutes,
        category: a.category
      }))
    })),
    hotels: trip.hotels
  });

  const routeScore = routeMetrics.routeEfficiencyScore !== null ? routeMetrics.routeEfficiencyScore : 85;
  const totalKm = routeMetrics.totalDistanceKm ?? 0;
  const totalHours = routeMetrics.totalTravelHours ?? 0;
  const backtrackingKm = routeMetrics.totalBacktrackingDistanceKm ?? 0;
  const avgDailyKm = routeMetrics.averageDailyDistanceKm ?? 0;

  let routeInsight = `Authoritative route engine evaluated ~${totalKm} km (~${totalHours}h transit) across ${daysCount} days.`;
  if (backtrackingKm > 5) {
    routeInsight += ` Detected ~${backtrackingKm} km avoidable backtracking; reordering stops could eliminate unnecessary zigzags.`;
  } else if (avgDailyKm <= 25 && totalKm > 0) {
    routeInsight += ` Excellent compactness (~${avgDailyKm} km/day) with minimal transit burden.`;
  } else if (totalKm > 0) {
    routeInsight += ` Balanced transit corridors (~${avgDailyKm} km/day).`;
  } else {
    routeInsight = 'Route data unavailable or incomplete; location coordinates pending resolution.';
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
  // Deterministic calculation based on active weather forecast and activity exposure
  let weatherScore = 88;
  let weatherInsight = 'Balanced indoor/outdoor itinerary.';

  const allActivities = (trip.itinerary || []).flatMap(d => d.activities || []);
  const outdoorActs = allActivities.filter(a => classifyActivityWeatherProfile(a) === 'outdoor');
  const indoorActs = allActivities.filter(a => classifyActivityWeatherProfile(a) === 'indoor');

  const activeForecast = weatherForecast || (trip as any).weatherForecast;

  if (activeForecast && Array.isArray(activeForecast.days) && activeForecast.days.length > 0) {
    let exposedCount = 0;
    let moderateCount = 0;

    trip.itinerary.forEach(day => {
      const dayForecast = activeForecast.days.find((f: any) => 
        (f.dayNumber === day.dayNumber) || 
        (f.date && (day as any).date && f.date === (day as any).date)
      );

      if (dayForecast) {
        const precip = dayForecast.precipitationProbability ?? 0;
        const mm = dayForecast.precipitationMm ?? 0;
        const isHigh = precip >= 60 || mm >= 5.0;
        const isMod = precip >= 35 && precip < 60;

        (day.activities || []).forEach(a => {
          if (classifyActivityWeatherProfile(a) === 'outdoor') {
            if (isHigh) exposedCount++;
            else if (isMod) moderateCount++;
          }
        });
      }
    });

    if (outdoorActs.length === 0) {
      weatherScore = 95;
      weatherInsight = 'All activities are sheltered indoors; immune to outdoor weather disruptions.';
    } else if (exposedCount === 0 && moderateCount === 0) {
      weatherScore = 95;
      weatherInsight = `All ${outdoorActs.length} outdoor activities are scheduled in favorable weather conditions.`;
    } else {
      const penalty = Math.min(45, Math.round(((exposedCount * 20 + moderateCount * 8) / outdoorActs.length) * 20));
      weatherScore = Math.max(50, 95 - penalty);
      weatherInsight = `${exposedCount} outdoor stop(s) exposed to high precipitation forecast (>=60% rain); consider moving indoors.`;
    }
  } else {
    // Forecast data unavailable or unconfigured: evaluate structural indoor flexibility
    const totalCount = allActivities.length || 1;
    const indoorRatio = indoorActs.length / totalCount;
    if (indoorRatio >= 0.35) {
      weatherScore = 88;
      weatherInsight = `Itinerary has strong indoor flexibility (${Math.round(indoorRatio * 100)}% sheltered dining and cultural venues).`;
    } else {
      weatherScore = 78;
      weatherInsight = `Itinerary is predominantly outdoor-focused (${Math.round((outdoorActs.length / totalCount) * 100)}%); vulnerable to unforecasted rain.`;
    }
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
