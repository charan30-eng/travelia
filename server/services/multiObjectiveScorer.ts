/**
 * Multi-Objective Itinerary Scorer
 * 
 * Scores itineraries across 7 soft constraint dimensions:
 * 1. Route Efficiency (road distance, travel time, and backtracking)
 * 2. Experience Value (ratings, landmark prominence, cultural depth)
 * 3. Weather Compatibility (indoor contingency on rainy/stormy days)
 * 4. Budget Efficiency (adherence to budget ceiling, value per expenditure)
 * 5. Time Balance (distribution of hours, no rushed or excessive dead time)
 * 6. Fatigue Score (low transit fatigue, sufficient rest buffers, manageable daily stop count)
 * 7. Activity Diversity (variety across categories: sightseeing, food, culture, nature, relaxation)
 * 
 * Computes overall weighted score tailored to the active OptimizationObjective:
 * - minimum_travel_time
 * - minimum_distance
 * - minimum_cost
 * - maximum_experience
 * - balanced
 * - relaxed
 * - adventure
 * - family_friendly
 */

import { ItineraryDay, ItineraryActivity } from '../../src/types';
import { TripRouteMetrics } from '../types/route';
import { OptimizationObjective, SoftConstraintScores } from '../types/ai';

export interface ObjectiveWeights {
  routeEfficiency: number;
  experienceValue: number;
  weatherCompatibility: number;
  budgetEfficiency: number;
  timeBalance: number;
  fatigueScore: number;
  activityDiversity: number;
}

export const OBJECTIVE_WEIGHT_PROFILES: Record<OptimizationObjective, ObjectiveWeights> = {
  minimum_travel_time: {
    routeEfficiency: 0.40,
    fatigueScore: 0.25,
    timeBalance: 0.15,
    weatherCompatibility: 0.05,
    budgetEfficiency: 0.05,
    experienceValue: 0.05,
    activityDiversity: 0.05
  },
  minimum_distance: {
    routeEfficiency: 0.45,
    budgetEfficiency: 0.20,
    fatigueScore: 0.15,
    timeBalance: 0.10,
    weatherCompatibility: 0.05,
    experienceValue: 0.025,
    activityDiversity: 0.025
  },
  minimum_cost: {
    budgetEfficiency: 0.50,
    routeEfficiency: 0.15,
    experienceValue: 0.15,
    timeBalance: 0.05,
    fatigueScore: 0.05,
    weatherCompatibility: 0.05,
    activityDiversity: 0.05
  },
  maximum_experience: {
    experienceValue: 0.45,
    activityDiversity: 0.20,
    routeEfficiency: 0.15,
    weatherCompatibility: 0.10,
    timeBalance: 0.05,
    fatigueScore: 0.03,
    budgetEfficiency: 0.02
  },
  balanced: {
    routeEfficiency: 0.18,
    experienceValue: 0.16,
    weatherCompatibility: 0.14,
    budgetEfficiency: 0.16,
    timeBalance: 0.14,
    fatigueScore: 0.12,
    activityDiversity: 0.10
  },
  relaxed: {
    fatigueScore: 0.35,
    timeBalance: 0.25,
    routeEfficiency: 0.15,
    weatherCompatibility: 0.10,
    experienceValue: 0.05,
    budgetEfficiency: 0.05,
    activityDiversity: 0.05
  },
  adventure: {
    activityDiversity: 0.35,
    experienceValue: 0.25,
    weatherCompatibility: 0.15,
    routeEfficiency: 0.15,
    fatigueScore: 0.04,
    timeBalance: 0.03,
    budgetEfficiency: 0.03
  },
  family_friendly: {
    fatigueScore: 0.30,
    timeBalance: 0.25,
    weatherCompatibility: 0.20,
    routeEfficiency: 0.15,
    budgetEfficiency: 0.05,
    experienceValue: 0.03,
    activityDiversity: 0.02
  }
};

/**
 * Evaluates route efficiency from authoritative route metrics
 */
export function evaluateRouteEfficiency(routeMetrics?: TripRouteMetrics | null): number {
  if (!routeMetrics || !routeMetrics.days || routeMetrics.days.length === 0) return 75;
  const score = routeMetrics.routeEfficiencyScore;
  if (typeof score === 'number' && score >= 0) return Math.min(100, Math.max(0, score));

  // Fallback calculation: penalize excessive travel minutes
  const totalMins = routeMetrics.totalTravelMinutes || 0;
  const totalDays = routeMetrics.days.length;
  const avgMinsPerDay = totalMins / totalDays;

  // Ideal: 30-45 mins per day. Greater than 120 mins gets heavily penalized.
  let calculated = 100 - Math.max(0, (avgMinsPerDay - 30) * 0.7);
  return Math.min(100, Math.max(20, Math.round(calculated)));
}

/**
 * Evaluates experience value based on ratings, reviews, and iconic tags
 */
export function evaluateExperienceValue(itinerary: ItineraryDay[]): number {
  let totalScore = 0;
  let count = 0;

  itinerary.forEach(day => {
    (day.activities || []).forEach(act => {
      count++;
      let itemScore = 75; // default benchmark

      const actLower = act.activity.toLowerCase();
      // Iconic landmarks & UNESCO sites get bonus
      if (
        actLower.includes('unesco') || 
        actLower.includes('fort') || 
        actLower.includes('basilica') || 
        actLower.includes('waterfall') ||
        actLower.includes('palace') ||
        actLower.includes('temple') ||
        actLower.includes('shrine')
      ) {
        itemScore += 15;
      }

      if (act.aiRecommendation && act.aiRecommendation.includes('Verified')) {
        itemScore += 10;
      }

      totalScore += Math.min(100, itemScore);
    });
  });

  return count > 0 ? Math.round(totalScore / count) : 75;
}

/**
 * Evaluates weather compatibility (penalizes outdoor activities on high-rain days)
 */
export function evaluateWeatherCompatibility(itinerary: ItineraryDay[], weatherForecast?: any): number {
  if (!weatherForecast || !weatherForecast.days || weatherForecast.days.length === 0) {
    return 80; // neutral when weather forecast is not available
  }

  let totalScore = 100;
  let penaltyCount = 0;

  itinerary.forEach(day => {
    const matchingForecast = weatherForecast.days.find((d: any) => d.dayNumber === day.dayNumber);
    const rainRisk = matchingForecast?.precipitationProbability ?? 0;
    const isRainy = rainRisk >= 50;

    (day.activities || []).forEach(act => {
      const actLower = act.activity.toLowerCase();
      const isOutdoor = actLower.includes('beach') || 
                        actLower.includes('water sports') || 
                        actLower.includes('park') || 
                        actLower.includes('hike') || 
                        actLower.includes('cruise');

      if (isRainy && isOutdoor) {
        penaltyCount++;
        totalScore -= Math.min(25, Math.round(rainRisk * 0.25));
      } else if (!isRainy && isOutdoor) {
        totalScore += 2; // slight reward for enjoying outdoor on clear days
      }
    });
  });

  return Math.min(100, Math.max(30, totalScore));
}

/**
 * Evaluates budget efficiency (rewards staying under budget, penalizes overages)
 */
export function evaluateBudgetEfficiency(totalCost: number, declaredBudget: number): number {
  if (declaredBudget <= 0) return 80;
  if (totalCost <= declaredBudget) {
    const remainingRatio = (declaredBudget - totalCost) / declaredBudget;
    // Perfect score when 5% - 15% buffer remains
    if (remainingRatio >= 0.05 && remainingRatio <= 0.25) return 95;
    if (remainingRatio > 0.25) return 88; // very cheap, might leave great experiences on the table
    return 90;
  } else {
    // Over budget penalty
    const overRatio = (totalCost - declaredBudget) / declaredBudget;
    return Math.max(20, Math.round(80 - (overRatio * 150)));
  }
}

/**
 * Evaluates time balance (consistent, comfortable daily schedules)
 */
export function evaluateTimeBalance(itinerary: ItineraryDay[], routeMetrics?: TripRouteMetrics | null): number {
  const dayCounts = itinerary.map(d => (d.activities || []).length);
  if (dayCounts.length === 0) return 80;

  const avg = dayCounts.reduce((a, b) => a + b, 0) / dayCounts.length;
  const variance = dayCounts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / dayCounts.length;

  let score = 95 - Math.round(variance * 10);

  // Check for overloaded days (> 5 activities)
  if (dayCounts.some(c => c > 5)) score -= 15;
  // Check for empty days (0 activities)
  if (dayCounts.some(c => c === 0)) score -= 20;

  return Math.min(100, Math.max(30, score));
}

/**
 * Evaluates fatigue score (higher score = lower fatigue, better rest buffers)
 */
export function evaluateFatigueScore(itinerary: ItineraryDay[], routeMetrics?: TripRouteMetrics | null, pace: string = 'moderate'): number {
  let score = 90;
  const dayCounts = itinerary.map(d => (d.activities || []).length);

  // Stop density penalties
  dayCounts.forEach(count => {
    if (pace === 'relaxed' && count > 3) score -= 15;
    if (pace === 'moderate' && count > 4) score -= 12;
    if (count > 5) score -= 20;
  });

  // Transit time penalties
  if (routeMetrics && routeMetrics.days) {
    routeMetrics.days.forEach(dm => {
      const travelMins = dm.totalTravelMinutes || 0;
      if (travelMins > 90) score -= 15;
      else if (travelMins > 60) score -= 8;
    });
  }

  return Math.min(100, Math.max(25, score));
}

/**
 * Evaluates activity diversity across categories
 */
export function evaluateActivityDiversity(itinerary: ItineraryDay[]): number {
  const categoryCounts: Record<string, number> = {};
  let total = 0;

  itinerary.forEach(day => {
    (day.activities || []).forEach(act => {
      const cat = act.category || 'sightseeing';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      total++;
    });
  });

  if (total === 0) return 70;

  const distinctCount = Object.keys(categoryCounts).length;
  // 4+ distinct categories = 95, 3 = 85, 2 = 70, 1 = 50
  if (distinctCount >= 4) return 95;
  if (distinctCount === 3) return 85;
  if (distinctCount === 2) return 70;
  return 50;
}

/**
 * Computes the complete 7-dimension SoftConstraintScores and overall weighted score
 */
export function calculateSoftConstraintScores(
  itinerary: ItineraryDay[],
  totalCost: number,
  declaredBudget: number,
  routeMetrics?: TripRouteMetrics | null,
  weatherForecast?: any,
  objective: OptimizationObjective = 'balanced',
  pace: string = 'moderate'
): SoftConstraintScores {
  const weights = OBJECTIVE_WEIGHT_PROFILES[objective] || OBJECTIVE_WEIGHT_PROFILES.balanced;

  const routeEfficiency = evaluateRouteEfficiency(routeMetrics);
  const experienceValue = evaluateExperienceValue(itinerary);
  const weatherCompatibility = evaluateWeatherCompatibility(itinerary, weatherForecast);
  const budgetEfficiency = evaluateBudgetEfficiency(totalCost, declaredBudget);
  const timeBalance = evaluateTimeBalance(itinerary, routeMetrics);
  const fatigueScore = evaluateFatigueScore(itinerary, routeMetrics, pace);
  const activityDiversity = evaluateActivityDiversity(itinerary);

  const overallWeightedScore = Math.round(
    routeEfficiency * weights.routeEfficiency +
    experienceValue * weights.experienceValue +
    weatherCompatibility * weights.weatherCompatibility +
    budgetEfficiency * weights.budgetEfficiency +
    timeBalance * weights.timeBalance +
    fatigueScore * weights.fatigueScore +
    activityDiversity * weights.activityDiversity
  );

  return {
    routeEfficiency,
    experienceValue,
    weatherCompatibility,
    budgetEfficiency,
    timeBalance,
    fatigueScore,
    fatigue: fatigueScore,
    activityDiversity,
    overallWeightedScore: Math.min(100, Math.max(0, overallWeightedScore))
  };
}
