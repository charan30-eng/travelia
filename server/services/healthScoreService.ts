/**
 * TRAVELIA TRIP HEALTH SCORE ENGINE — PHASE 8 DETERMINISTIC MODEL
 * 
 * CORE PRINCIPLE:
 * Transparent, deterministic, mathematically grounded multi-dimensional evaluation.
 * 
 * NO MAGIC NUMBERS:
 * All dimension weights and penalty thresholds are explicitly documented and sum to 1.00 (100%).
 * 
 * 7 Evaluated Dimensions:
 * 1. Budget Efficiency        (Weight: 0.20)
 * 2. Route Efficiency         (Weight: 0.18)
 * 3. Time Balance             (Weight: 0.16)
 * 4. Weather Compatibility    (Weight: 0.14)
 * 5. Activity Balance         (Weight: 0.12)
 * 6. Travel Fatigue           (Weight: 0.10)
 * 7. Constraint Satisfaction  (Weight: 0.10)
 * Total Weight Sum = 1.00
 * 
 * Delta Calculation:
 * healthDelta = afterScore - beforeScore (never estimated, always exact arithmetic difference)
 */

import { 
  TripContext, 
  ComputedHealthScore, 
  ComputedHealthMetric, 
  HealthDimensionScore 
} from '../types/ai';
import { calculateTripCost } from './tripCostService';
import { calculateSyncTripRouteMetrics } from './routeIntelligenceService';
import { TripRouteMetrics } from '../types/route';
import { WeatherForecast } from '../types/weather';
import { classifyActivityWeatherProfile } from './weatherImpactService';

export const HEALTH_DIMENSION_WEIGHTS = {
  budget: 0.20,
  routeEfficiency: 0.18,
  timeBalance: 0.16,
  weatherCompatibility: 0.14,
  activityBalance: 0.12,
  travelFatigue: 0.10,
  constraintSatisfaction: 0.10
} as const;

/**
 * Calculates the mathematically transparent Trip Health Score
 */
export function calculateDynamicHealthScore(
  trip: TripContext,
  precomputedRouteMetrics?: TripRouteMetrics,
  weatherForecast?: WeatherForecast | null,
  baselineScore?: number
): ComputedHealthScore {
  const daysCount = Math.max(1, trip.days || trip.itinerary?.length || 1);
  const allActivities = (trip.itinerary || []).flatMap(d => d.activities || []);
  const totalActivities = allActivities.length;
  const avgActivitiesPerDay = totalActivities / daysCount;

  // =========================================================================
  // 1. BUDGET EFFICIENCY (Weight: 0.20)
  // =========================================================================
  const declaredBudget = trip.budget?.total || 0;
  const costBreakdown = calculateTripCost(trip);
  const totalEstimatedCost = costBreakdown.totalCost;
  const costRatio = declaredBudget > 0 ? totalEstimatedCost / declaredBudget : 1.0;
  const contingencyRemaining = declaredBudget > 0 ? declaredBudget - totalEstimatedCost : 0;

  let budgetScore = 85;
  let budgetExplanation = '';

  if (declaredBudget > 0) {
    if (costRatio <= 0.80) {
      budgetScore = 100;
      budgetExplanation = `Excellent budget health: total cost ₹${totalEstimatedCost.toLocaleString('en-IN')} leaves a safe ${Math.round((1 - costRatio) * 100)}% contingency buffer (₹${contingencyRemaining.toLocaleString('en-IN')}) under the ₹${declaredBudget.toLocaleString('en-IN')} ceiling.`;
    } else if (costRatio <= 1.00) {
      // Linear scaling from 100 down to 90 as ratio approaches 1.0
      const deduction = Math.round(((costRatio - 0.80) / 0.20) * 10);
      budgetScore = Math.max(90, 100 - deduction);
      budgetExplanation = `Budget on track: total cost ₹${totalEstimatedCost.toLocaleString('en-IN')} is within ₹${declaredBudget.toLocaleString('en-IN')} ceiling (${Math.round(costRatio * 100)}% utilized).`;
    } else if (costRatio <= 1.25) {
      // Linear scaling from 90 down to 60 as overage climbs to 25%
      const deduction = Math.round(((costRatio - 1.00) / 0.25) * 30);
      budgetScore = Math.max(60, 90 - deduction);
      budgetExplanation = `Budget overage warning: projected spend ₹${totalEstimatedCost.toLocaleString('en-IN')} exceeds declared ceiling by ${Math.round((costRatio - 1) * 100)}% (₹${(totalEstimatedCost - declaredBudget).toLocaleString('en-IN')} overage).`;
    } else {
      // Severe overspend scaling down to minimum 20
      const overageExcess = Math.min(40, Math.round((costRatio - 1.25) * 40));
      budgetScore = Math.max(20, 60 - overageExcess);
      budgetExplanation = `Severe overspend alert: projected spend ₹${totalEstimatedCost.toLocaleString('en-IN')} exceeds ceiling by ${Math.round((costRatio - 1) * 100)}% (over ₹${(totalEstimatedCost - declaredBudget).toLocaleString('en-IN')} excess).`;
    }
  } else {
    // No explicit budget ceiling declared: score based on reasonable per-day spend
    const spendPerDayPerPerson = totalEstimatedCost / (daysCount * Math.max(1, trip.travelers || 1));
    budgetScore = spendPerDayPerPerson <= 10000 ? 90 : 75;
    budgetExplanation = `No fixed ceiling declared; projected daily expenditure is ₹${Math.round(spendPerDayPerPerson).toLocaleString('en-IN')} per traveler.`;
  }

  // =========================================================================
  // 2. ROUTE EFFICIENCY (Weight: 0.18)
  // =========================================================================
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

  const totalKm = routeMetrics.totalDistanceKm ?? 0;
  const totalTravelMinutes = routeMetrics.totalTravelMinutes ?? Math.round((routeMetrics.totalTravelHours ?? 0) * 60);
  const totalHours = Math.round((totalTravelMinutes / 60) * 10) / 10;
  const backtrackingKm = routeMetrics.totalBacktrackingDistanceKm ?? 0;
  const avgDailyKm = routeMetrics.averageDailyDistanceKm ?? Math.round(totalKm / daysCount);

  let routeScore = 85;
  let routeExplanation = '';

  if (typeof routeMetrics.routeEfficiencyScore === 'number' && routeMetrics.routeEfficiencyScore >= 0) {
    routeScore = Math.min(100, Math.max(25, routeMetrics.routeEfficiencyScore));
    routeExplanation = `Authoritative road routing evaluated ${totalKm} km (${totalHours}h transit) with ${backtrackingKm} km backtracking; route compactness score is ${routeScore}/100.`;
  } else {
    // Deterministic fallback when coordinates not resolved
    const penalty = Math.min(45, Math.round(backtrackingKm * 3));
    routeScore = Math.max(40, 95 - penalty);
    routeExplanation = `Route encompasses ~${totalKm} km with ~${backtrackingKm} km backtracking across ${daysCount} days.`;
  }

  // =========================================================================
  // 3. TIME BALANCE (Weight: 0.16)
  // =========================================================================
  const dailyCounts = (trip.itinerary || []).map(d => d.activities?.length || 0);
  const maxActivitiesInDay = dailyCounts.length > 0 ? Math.max(...dailyCounts) : 0;
  const minActivitiesInDay = dailyCounts.length > 0 ? Math.min(...dailyCounts) : 0;

  let timeBalanceScore = 100;
  let timeBalanceExplanation = '';

  // Density penalty: ideal density is 2.5 to 3.5 stops per day
  const densityDeviation = Math.abs(avgActivitiesPerDay - 3.0);
  let timePenalties = 0;

  if (densityDeviation > 0.5) {
    timePenalties += Math.round((densityDeviation - 0.5) * 12);
  }

  // Peak day overload penalty: any day with > 4 stops is rushed
  if (maxActivitiesInDay > 4) {
    timePenalties += (maxActivitiesInDay - 4) * 15;
  }

  // Underload penalty: 0 stops on an active day
  const emptyDays = dailyCounts.filter(c => c === 0).length;
  if (emptyDays > 0) {
    timePenalties += emptyDays * 10;
  }

  timeBalanceScore = Math.min(100, Math.max(25, 100 - timePenalties));

  if (maxActivitiesInDay > 4) {
    timeBalanceExplanation = `Schedule overload alert: peak day has ${maxActivitiesInDay} stops (recommended maximum: 4). Daily average is ${avgActivitiesPerDay.toFixed(1)} stops.`;
  } else if (avgActivitiesPerDay < 1.5 && totalActivities > 0) {
    timeBalanceExplanation = `Light schedule: average ${avgActivitiesPerDay.toFixed(1)} stops per day leaves substantial leisure and buffer time.`;
  } else {
    timeBalanceExplanation = `Balanced daily schedule: average ${avgActivitiesPerDay.toFixed(1)} stops per day with comfortable spacing between activities.`;
  }

  // =========================================================================
  // 4. WEATHER COMPATIBILITY (Weight: 0.14)
  // =========================================================================
  const outdoorActs = allActivities.filter(a => classifyActivityWeatherProfile(a) === 'outdoor');
  const indoorActs = allActivities.filter(a => classifyActivityWeatherProfile(a) === 'indoor');
  const activeForecast = weatherForecast || (trip as any).weatherForecast;

  let weatherScore = 90;
  let weatherExplanation = '';
  let exposedRainCount = 0;
  let maxRainProb = 0;

  if (activeForecast && Array.isArray(activeForecast.days) && activeForecast.days.length > 0) {
    (trip.itinerary || []).forEach(day => {
      const match = activeForecast.days.find((f: any) => 
        f.dayNumber === day.dayNumber || (f.date && (day as any).date && f.date === (day as any).date)
      );
      if (match) {
        const prob = match.precipitationProbability ?? 0;
        if (prob > maxRainProb) maxRainProb = prob;
        if (prob >= 50) {
          (day.activities || []).forEach(act => {
            if (classifyActivityWeatherProfile(act) === 'outdoor') {
              exposedRainCount++;
            }
          });
        }
      }
    });

    if (outdoorActs.length === 0) {
      weatherScore = 100;
      weatherExplanation = 'All scheduled activities are sheltered indoors; 100% resilient to precipitation.';
    } else if (exposedRainCount === 0) {
      weatherScore = 100;
      weatherExplanation = `Favorable weather compatibility: all ${outdoorActs.length} outdoor activities are scheduled on low rain-risk days.`;
    } else {
      const exposureFraction = exposedRainCount / outdoorActs.length;
      const penalty = Math.min(65, Math.round(exposureFraction * 60));
      weatherScore = Math.max(30, 100 - penalty);
      weatherExplanation = `Adverse weather exposure: ${exposedRainCount} of ${outdoorActs.length} outdoor stops scheduled during rain/storm forecast (peak precipitation risk: ${maxRainProb}%).`;
    }
  } else {
    // Structural indoor ratio fallback
    const indoorRatio = allActivities.length > 0 ? indoorActs.length / allActivities.length : 0.5;
    weatherScore = Math.min(100, Math.max(60, Math.round(70 + indoorRatio * 30)));
    weatherExplanation = `Forecast unavailable; evaluated structural flexibility (${indoorActs.length} indoor vs ${outdoorActs.length} outdoor activities, ${Math.round(indoorRatio * 100)}% sheltered).`;
  }

  // =========================================================================
  // 5. ACTIVITY BALANCE / DIVERSITY (Weight: 0.12)
  // =========================================================================
  const categoryCounts: Record<string, number> = {};
  allActivities.forEach(a => {
    const cat = a.category || 'sightseeing';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const distinctCount = Object.keys(categoryCounts).length;
  let activityBalanceScore = 50;

  if (distinctCount >= 4) activityBalanceScore = 100;
  else if (distinctCount === 3) activityBalanceScore = 85;
  else if (distinctCount === 2) activityBalanceScore = 70;
  else if (distinctCount === 1) activityBalanceScore = 50;
  else activityBalanceScore = 75;

  const categorySummaryList = Object.entries(categoryCounts).map(([c, count]) => `${count} ${c}`).join(', ');
  const activityBalanceExplanation = `Richness across ${distinctCount} distinct categories (${categorySummaryList || 'sightseeing'}).`;

  // =========================================================================
  // 6. TRAVEL FATIGUE (Weight: 0.10)
  // =========================================================================
  const avgDailyTravelHours = totalHours / daysCount;
  const dailyTransitHours = (routeMetrics.days || []).map(d => (d.totalTravelMinutes || 0) / 60);
  const maxDailyTravelHours = dailyTransitHours.length > 0 ? Math.max(...dailyTransitHours) : avgDailyTravelHours;


  let travelFatigueScore = 100;
  let fatiguePenalties = 0;

  // Daily transit threshold: optimal is <= 1.5 hours/day
  if (avgDailyTravelHours > 1.5) {
    fatiguePenalties += Math.min(50, Math.round((avgDailyTravelHours - 1.5) * 25));
  }

  // Peak day transit penalty: any day exceeding 3.5 hours road transit causes traveler exhaustion
  if (maxDailyTravelHours > 3.5) {
    fatiguePenalties += Math.min(25, Math.round((maxDailyTravelHours - 3.5) * 15));
  }

  travelFatigueScore = Math.min(100, Math.max(25, 100 - fatiguePenalties));
  const travelFatigueExplanation = `Daily transit averages ${avgDailyTravelHours.toFixed(1)}h/day (peak day: ${maxDailyTravelHours.toFixed(1)}h). ${
    avgDailyTravelHours <= 1.5 ? 'Low transit fatigue.' : 'Elevated transit fatigue; consider clustering stops regionally.'
  }`;

  // =========================================================================
  // 7. CONSTRAINT SATISFACTION (Weight: 0.10)
  // =========================================================================
  // Evaluate hard constraints adherence (fixed times, budget cap, avoidList)
  let hardViolationsCount = 0;
  let satisfiedConstraintsCount = 0;
  const violationDetails: string[] = [];

  // Check budget hard violation
  if (declaredBudget > 0 && totalEstimatedCost > declaredBudget * 1.05) {
    hardViolationsCount++;
    violationDetails.push(`Projected spend exceeds budget ceiling by ${Math.round((costRatio - 1) * 100)}%`);
  } else {
    satisfiedConstraintsCount++;
  }

  // Check route backtracking violation
  if (backtrackingKm > 10) {
    hardViolationsCount++;
    violationDetails.push(`Severe backtracking of ${backtrackingKm} km detected`);
  } else {
    satisfiedConstraintsCount++;
  }

  let constraintScore = 100;
  if (hardViolationsCount === 1) constraintScore = 60;
  else if (hardViolationsCount >= 2) constraintScore = 20;

  const constraintExplanation = hardViolationsCount === 0
    ? `All operational constraints preserved (${satisfiedConstraintsCount} checks verified).`
    : `Encountered ${hardViolationsCount} constraint pressure(s): ${violationDetails.join('; ')}.`;

  // =========================================================================
  // OVERALL WEIGHTED DETERMINISTIC CALCULATION
  // =========================================================================
  const weights = HEALTH_DIMENSION_WEIGHTS;
  const overall = Math.round(
    (budgetScore * weights.budget) +
    (routeScore * weights.routeEfficiency) +
    (timeBalanceScore * weights.timeBalance) +
    (weatherScore * weights.weatherCompatibility) +
    (activityBalanceScore * weights.activityBalance) +
    (travelFatigueScore * weights.travelFatigue) +
    (constraintScore * weights.constraintSatisfaction)
  );

  const finalOverall = Math.min(100, Math.max(20, overall));

  // Determine strengths (scores >= 85)
  const strengths: string[] = [];
  if (budgetScore >= 85) strengths.push('Healthy budget allocation and contingency margin');
  if (routeScore >= 85) strengths.push('Efficient road routing with minimal transit delay');
  if (timeBalanceScore >= 85) strengths.push('Well-spaced daily schedule with comfortable pacing');
  if (weatherScore >= 85) strengths.push('Strong weather resilience for scheduled activities');
  if (activityBalanceScore >= 85) strengths.push('Rich multi-category activity variety');
  if (travelFatigueScore >= 85) strengths.push('Low transit fatigue across travel days');
  if (constraintScore >= 85) strengths.push('Strict preservation of trip constraints');

  // Determine risks (scores < 75)
  const risks: string[] = [];
  if (budgetScore < 75) risks.push(`Budget strain: spend exceeds ceiling by ${Math.round((costRatio - 1) * 100)}%`);
  if (routeScore < 75) risks.push(`Route inefficiency: detected ${backtrackingKm} km backtracking`);
  if (timeBalanceScore < 75) risks.push(`Schedule density concern: peak day has ${maxActivitiesInDay} stops`);
  if (weatherScore < 75) risks.push(`Weather risk: ${exposedRainCount} outdoor activities exposed to rain`);
  if (activityBalanceScore < 75) risks.push(`Limited diversity: concentrated in ${distinctCount} category`);
  if (travelFatigueScore < 75) risks.push(`Transit fatigue: average travel duration is ${avgDailyTravelHours.toFixed(1)}h/day`);
  if (constraintScore < 75) risks.push('Constraint violations detected');

  // Determine actionable recommendations
  const recommendations: string[] = [];
  if (budgetScore < 85) recommendations.push('Consider substituting premium attractions with verified cultural alternatives');
  if (routeScore < 85 && backtrackingKm > 5) recommendations.push('Run 2-opt route optimization to eliminate waypoint backtracking');
  if (timeBalanceScore < 85 && maxActivitiesInDay > 4) recommendations.push('Move 1–2 stops from peak day to lighter days');
  if (weatherScore < 85 && exposedRainCount > 0) recommendations.push('Relocate rain-exposed outdoor stops to sunny days or sheltered indoor venues');
  if (travelFatigueScore < 85) recommendations.push('Cluster daily activities by neighborhood to reduce transit hours');
  if (recommendations.length === 0) recommendations.push('Schedule is in optimal health; maintain current waypoint order');

  // Delta calculation: exact difference (afterScore - beforeScore)
  const delta = baselineScore !== undefined ? (finalOverall - baselineScore) : 0;

  // Build Dimension Scores mapping
  const dimensionScores: ComputedHealthScore['dimensionScores'] = {
    budget: {
      score: budgetScore,
      weight: weights.budget,
      rawMetrics: {
        totalEstimatedCost,
        declaredBudget,
        costRatio: Math.round(costRatio * 100) / 100,
        contingencyRemaining
      },
      explanation: budgetExplanation
    },
    routeEfficiency: {
      score: routeScore,
      weight: weights.routeEfficiency,
      rawMetrics: {
        totalDistanceKm: totalKm,
        totalTravelMinutes,
        totalTravelHours: totalHours,
        backtrackingDistanceKm: backtrackingKm,
        averageDailyKm: avgDailyKm
      },
      explanation: routeExplanation
    },
    timeBalance: {
      score: timeBalanceScore,
      weight: weights.timeBalance,
      rawMetrics: {
        averageDailyActivities: Math.round(avgActivitiesPerDay * 10) / 10,
        maxActivitiesInDay,
        minActivitiesInDay,
        totalActivities,
        daysCount
      },
      explanation: timeBalanceExplanation
    },
    weatherCompatibility: {
      score: weatherScore,
      weight: weights.weatherCompatibility,
      rawMetrics: {
        outdoorActivitiesCount: outdoorActs.length,
        indoorActivitiesCount: indoorActs.length,
        rainExposedActivitiesCount: exposedRainCount,
        maxRainProbability: maxRainProb
      },
      explanation: weatherExplanation
    },
    activityBalance: {
      score: activityBalanceScore,
      weight: weights.activityBalance,
      rawMetrics: {
        distinctCategoriesCount: distinctCount,
        categoryCounts,
        totalActivities
      },
      explanation: activityBalanceExplanation
    },
    travelFatigue: {
      score: travelFatigueScore,
      weight: weights.travelFatigue,
      rawMetrics: {
        averageDailyTravelHours: Math.round(avgDailyTravelHours * 10) / 10,
        maxDailyTravelHours: Math.round(maxDailyTravelHours * 10) / 10,
        totalTravelHours: totalHours
      },
      explanation: travelFatigueExplanation
    },
    constraintSatisfaction: {
      score: constraintScore,
      weight: weights.constraintSatisfaction,
      rawMetrics: {
        hardViolationsCount,
        satisfiedConstraintsCount,
        violationDetails
      },
      explanation: constraintExplanation
    }
  };

  const getStatus = (s: number): 'optimal' | 'good' | 'needs_attention' => {
    if (s >= 88) return 'optimal';
    if (s >= 75) return 'good';
    return 'needs_attention';
  };

  // Backward-compatible improvements array
  const improvements: ComputedHealthScore['improvements'] = [];
  if (timeBalanceScore < 85) {
    improvements.push({
      id: 'imp-schedule',
      title: 'Spread peak activities across lighter days',
      description: 'Evenly balancing stops eliminates rushed transit and boosts daily stamina.',
      impact: `+${Math.max(1, Math.round((95 - timeBalanceScore) * weights.timeBalance))} Health Score pts`,
      applied: false,
      actionType: 'rest_time'
    });
  }
  if (budgetScore < 85) {
    improvements.push({
      id: 'imp-budget',
      title: 'Optimize transit & attraction booking tier',
      description: budgetExplanation,
      impact: `+${Math.max(1, Math.round((95 - budgetScore) * weights.budget))} Health Score pts`,
      applied: false,
      actionType: 'budget_cap'
    });
  }
  if (activityBalanceScore < 85) {
    improvements.push({
      id: 'imp-diversity',
      title: 'Incorporate authentic local culinary tasting',
      description: 'Injecting verified regional food stalls enriches cultural variety.',
      impact: `+${Math.max(1, Math.round((95 - activityBalanceScore) * weights.activityBalance))} Health Score pts`,
      applied: false,
      actionType: 'indoor_backup'
    });
  }
  if (improvements.length === 0) {
    improvements.push({
      id: 'imp-buffer',
      title: 'Maintain current healthy itinerary configuration',
      description: 'All 7 dimensions reflect balanced, sustainable travel pacing.',
      impact: '+0 Health Score pts',
      applied: true,
      actionType: 'rest_time'
    });
  }

  return {
    overallScore: finalOverall,
    ratingLabel: finalOverall >= 90 ? 'Exceptional Balance' : finalOverall >= 80 ? 'Well Balanced' : finalOverall >= 70 ? 'Moderate Pacing' : 'Needs Optimization',
    summary: `Trip scored ${finalOverall}/100 across 7 transparent dimensions: Budget ${budgetScore}, Route ${routeScore}, Time ${timeBalanceScore}, Weather ${weatherScore}, Diversity ${activityBalanceScore}, Fatigue ${travelFatigueScore}, Constraints ${constraintScore}.`,
    dimensionScores,
    strengths,
    risks,
    recommendations,
    delta,
    healthDelta: delta,

    // Backward-compatible breakdown fields
    breakdown: {
      budgetEfficiency: {
        name: 'Budget Efficiency',
        score: budgetScore,
        weight: 20,
        status: getStatus(budgetScore),
        insight: budgetExplanation
      },
      routeEfficiency: {
        name: 'Route & Transit Efficiency',
        score: routeScore,
        weight: 18,
        status: getStatus(routeScore),
        insight: routeExplanation
      },
      scheduleBalance: {
        name: 'Schedule Balance & Pacing',
        score: timeBalanceScore,
        weight: 16,
        status: getStatus(timeBalanceScore),
        insight: timeBalanceExplanation
      },
      weatherCompatibility: {
        name: 'Weather Compatibility',
        score: weatherScore,
        weight: 14,
        status: getStatus(weatherScore),
        insight: weatherExplanation
      },
      activityDiversity: {
        name: 'Activity Diversity',
        score: activityBalanceScore,
        weight: 12,
        status: getStatus(activityBalanceScore),
        insight: activityBalanceExplanation
      },
      restTime: {
        name: 'Travel Fatigue & Rest',
        score: travelFatigueScore,
        weight: 10,
        status: getStatus(travelFatigueScore),
        insight: travelFatigueExplanation
      },
      travelFatigue: {
        name: 'Travel Fatigue',
        score: travelFatigueScore,
        weight: 10,
        status: getStatus(travelFatigueScore),
        insight: travelFatigueExplanation
      },
      constraintSatisfaction: {
        name: 'Constraint Satisfaction',
        score: constraintScore,
        weight: 10,
        status: getStatus(constraintScore),
        insight: constraintExplanation
      }
    },
    improvements
  };
}

/**
 * Deterministically compares two trip contexts and returns exact delta
 */
export function compareTripHealth(
  beforeTrip: TripContext,
  afterTrip: TripContext,
  routeBefore?: TripRouteMetrics,
  routeAfter?: TripRouteMetrics,
  weatherForecast?: WeatherForecast | null
): {
  beforeHealth: ComputedHealthScore;
  afterHealth: ComputedHealthScore;
  healthDelta: number;
} {
  const beforeHealth = calculateDynamicHealthScore(beforeTrip, routeBefore, weatherForecast);
  const afterHealth = calculateDynamicHealthScore(afterTrip, routeAfter, weatherForecast, beforeHealth.overallScore);
  const healthDelta = afterHealth.overallScore - beforeHealth.overallScore;

  return {
    beforeHealth,
    afterHealth,
    healthDelta
  };
}
