import { TripPlan, ItineraryDay, ItineraryActivity, TripPreference, Currency } from '../../src/types';

export type AIIntent = 
  | 'question' 
  | 'optimization' 
  | 'weather_alert' 
  | 'budget' 
  | 'schedule_inquiry' 
  | 'route_optimization' 
  | 'health_score' 
  | 'what_if' 
  | 'activity_recommendation' 
  | 'packing' 
  | 'safety' 
  | 'general';

export interface TripContext {
  id?: string;
  destination: string;
  country?: string;
  days: number;
  travelers: number;
  travelDates?: string;
  startDate?: string;
  endDate?: string;
  budget: {
    currency: Currency;
    total: number;
    spent?: number;
    remainingBudget?: number;
    hotel?: number;
    flights?: number;
    food?: number;
    transportation?: number;
    activities?: number;
    miscellaneous?: number;
  };
  preferences: {
    pace?: 'relaxed' | 'moderate' | 'packed';
    foodPreference?: string;
    transportPreference?: string;
    activityPreferences?: TripPreference[];
  };
  existingBookings?: {
    hotel?: string;
    flights?: string;
    hotelCategory?: string;
  };
  healthScore?: number;
  hotels?: any[];
  itinerary: ItineraryDay[];
}

export interface AIChatRequest {
  message: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  tripContext: TripContext;
}

export interface AIActionProposal {
  type: 'optimization' | 'replan' | 'budget_cut' | 'route_reorder' | 'activity_swap' | 'rest_buffer';
  label: string;
  description: string;
  estimatedSavings?: number;
  healthScoreDelta?: number;
  healthScoreBefore?: number;
  healthScoreAfter?: number;
  travelTimeSavedMins?: number;
  optimizationResult?: OptimizationResult;
  payload?: any;
}

export interface AIChatResponse {
  reply: string;
  intent: AIIntent;
  actionProposal?: AIActionProposal;
  suggestedFollowUps?: string[];
  confidence: number;
  message?: string;
  actionPrompt?: any;
  proposedChanges?: any;
  insights?: string[];
  deterministicCalculationsUsed?: boolean;
}

export interface ActivityChange {
  action: 'replace' | 'remove' | 'reschedule' | 'add';
  dayNumber: number;
  activityIndex?: number;
  oldActivity?: {
    name: string;
    time?: string;
    cost?: number;
    location?: string;
  };
  newActivity?: {
    name: string;
    time?: string;
    cost?: number;
    location?: string;
    duration?: string;
    category?: string;
  };
  reason: string;
  costDiff: number; // negative = savings, positive = added cost
  timeDiffMinutes?: number;
}

export interface OptimizationResult {
  type: 'full_itinerary_optimization';
  summary: string;
  healthScoreBefore: number;
  healthScoreAfter: number;
  costBefore: number;
  costAfter: number;
  estimatedSavings: number;
  travelTimeHoursBefore: number;
  travelTimeHoursAfter: number;
  travelTimeSavedHours: number;
  travelDistanceKmBefore?: number;
  travelDistanceKmAfter?: number;
  travelDistanceSavedKm?: number;
  resolvedConflictsCount: number;
  changes: ActivityChange[];
  explanations: string[];
  warnings: string[];
  confidence: number;
  optimizedItinerary: ItineraryDay[];
}

export interface ComputedHealthMetric {
  name: string;
  score: number; // 0 - 100
  weight: number; // e.g. 25, 20
  status: 'optimal' | 'good' | 'needs_attention';
  insight: string;
}

export interface ComputedHealthScore {
  overallScore: number; // 0 - 100
  ratingLabel: string;
  summary: string;
  breakdown: {
    budgetEfficiency: ComputedHealthMetric;    // 25%
    routeEfficiency: ComputedHealthMetric;     // 20%
    scheduleBalance: ComputedHealthMetric;     // 20%
    restTime: ComputedHealthMetric;            // 15%
    activityDiversity: ComputedHealthMetric;   // 10%
    weatherCompatibility: ComputedHealthMetric;// 10%
  };
  improvements: Array<{
    id: string;
    title: string;
    description: string;
    impact: string;
    applied: boolean;
    actionType: 'rest_time' | 'group_transit' | 'indoor_backup' | 'budget_cap';
  }>;
}

export interface WeatherReplanRequest {
  tripContext: TripContext;
  dayNumber: number;
  condition: string;
  rainChancePercent: number;
  customNote?: string;
}

export interface WeatherReplanResponse {
  dayNumber: number;
  condition: string;
  summary: string;
  affectedActivitiesCount: number;
  healthScoreBefore: number;
  healthScoreAfter: number;
  changes: ActivityChange[];
  revisedDay: ItineraryDay;
  travelTimeSavedMinutes?: number;
  estimatedSavings?: number;
  confidence?: number;
}

export interface WhatIfScenarioRequest {
  tripContext: TripContext;
  scenarioType: 'budget_change' | 'remove_day' | 'add_traveler' | 'weather_shift' | 'weather_rain' | 'weather_disruption' | 'pace_change';
  parameters: {
    targetBudget?: number;
    dayToRemove?: number;
    travelerCount?: number;
    weatherCondition?: string;
    rainChancePercent?: number;
    targetDay?: number;
    targetPace?: 'relaxed' | 'moderate' | 'packed';
    userPrompt?: string;
  };
}

export interface WhatIfScenarioResponse {
  scenarioTitle: string;
  narrative: string;
  currentState: {
    totalBudget: number;
    healthScore: number;
    travelTimeHours: number;
    activityCount: number;
  };
  projectedState: {
    totalBudget: number;
    healthScore: number;
    travelTimeHours: number;
    activityCount: number;
  };
  keyImpacts: string[];
  suggestedAction?: AIActionProposal;
}
