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
  nights?: number;
  hotelCategory?: string;
  travelers: number;
  travelDates?: string;
  startDate?: string;
  endDate?: string;
  budget?: {
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
  preferences?: {
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
  userPreferences?: UserPreferences;
  itinerary: ItineraryDay[];
}

export interface AIChatRequest {
  message: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  tripContext: TripContext;
}

export interface AIActionProposal {
  type: 'optimization' | 'replan' | 'budget_cut' | 'route_reorder' | 'activity_swap' | 'rest_buffer' | 'remove_activity' | 'change_hotel';
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

export interface ToolExecutionResult {
  tool: string;
  input: Record<string, any>;
  output: any;
  source: string;
  dataStatus: 'live' | 'cached' | 'demo' | 'unavailable' | 'calculated';
  retrievedAt: string;
}

export interface FactItem {
  claim: string;
  source: string;
  status: 'verified' | 'live' | 'cached' | 'demo' | 'unavailable' | 'calculated';
}

export interface CopilotApprovalAction {
  type: 'modify_itinerary' | 'delete_activity' | 'change_hotel' | 'change_flight' | 'change_budget' | 'apply_weather_replan';
  label: string;
  description: string;
  payload: any;
  impact: {
    costDelta?: number;
    timeDeltaMins?: number;
    healthScoreDelta?: number;
  };
}

export interface AIChatResponse {
  answer?: string;
  reply: string;
  intent: AIIntent;
  facts?: FactItem[];
  recommendations?: string[];
  toolResults?: ToolExecutionResult[];
  assumptions?: string[];
  warnings?: string[];
  requiresApproval?: boolean;
  approvalAction?: CopilotApprovalAction;
  actionProposal?: AIActionProposal;
  suggestedFollowUps?: string[];
  confidence: number;
  message?: string;
  actionPrompt?: any;
  proposedChanges?: any;
  insights?: string[];
  deterministicCalculationsUsed?: boolean;
}

export type StructuredCopilotResponse = AIChatResponse;


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

export type OptimizationObjective = 
  | 'minimum_travel_time'
  | 'minimum_distance'
  | 'minimum_cost'
  | 'maximum_experience'
  | 'balanced'
  | 'relaxed'
  | 'adventure'
  | 'family_friendly';

export type OptimizationStatus = 'optimal' | 'feasible' | 'infeasible' | 'no_improvement_needed';

export interface HardConstraints {
  fixedTimes?: Record<string, string>; // activityId -> required time e.g. "10:00 AM" or "14:00"
  mustVisit?: string[]; // Activity IDs or names that must not be removed
  avoidList?: string[]; // Activity IDs, names, or categories to exclude
  budgetHardLimit?: number; // Total cost must NOT exceed this limit
  airportConstraints?: {
    arrivalAirport?: string;
    arrivalTime?: string;
    arrivalDay?: number;
    departureAirport?: string;
    departureTime?: string;
    departureDay?: number;
  };
  maxDays?: number;
  tripDates?: { start: string; end: string };
}

export interface SoftConstraintScores {
  routeEfficiency: number;      // 0 - 100
  experienceValue: number;      // 0 - 100
  weatherCompatibility: number; // 0 - 100
  budgetEfficiency: number;     // 0 - 100
  timeBalance: number;          // 0 - 100
  fatigueScore: number;         // 0 - 100
  fatigue?: number;              // Alias for fatigueScore
  activityDiversity: number;    // 0 - 100
  overallWeightedScore: number; // 0 - 100
}

export interface DetailedOptimizationMetrics {
  distanceKm: number;
  travelTimeMinutes: number;
  cost: number;
  conflicts: number;
  healthScore: number;
  activityCount: number;
  constraintSatisfactionScore: number; // 0 - 100%
}

export interface StructuredActivityReason {
  activityId: string;
  activityName: string;
  fromDay?: number;
  toDay?: number;
  fromTime?: string;
  toTime?: string;
  action: 'moved' | 'reordered' | 'replaced' | 'rescheduled' | 'retained';
  reason: string;
  metricImprovement: {
    distanceSavedKm?: number;
    timeSavedMinutes?: number;
    costSaved?: number;
    healthScoreDelta?: number;
  };
  constraintPreserved: string;
}

export interface OptimizationResult {
  type: 'full_itinerary_optimization';
  summary: string;
  healthScoreBefore: number;
  healthScoreAfter: number;

  // Phase 7 Multi-Objective Engine Fields
  optimizationStatus: OptimizationStatus;
  infeasibilityReason?: string;
  objective: OptimizationObjective;
  beforeMetrics: DetailedOptimizationMetrics;
  afterMetrics: DetailedOptimizationMetrics;
  softConstraintScoresBefore: SoftConstraintScores;
  softConstraintScoresAfter: SoftConstraintScores;
  structuredReasons: StructuredActivityReason[];
  constraintSatisfaction: { satisfied: string[]; violated: string[]; score: number };
  satisfiedConstraints: string[];
  violatedConstraints: string[];

  // Authoritative prompt required fields
  beforeDistanceKm: number;
  afterDistanceKm: number;
  distanceSavedKm: number;

  beforeTravelMinutes: number;
  afterTravelMinutes: number;
  travelTimeSavedMinutes: number;

  beforeCost: number;
  afterCost: number;
  costSaved: number;

  beforeConflictCount: number;
  afterConflictCount: number;

  // Backward compatibility fields
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


export interface UserPreferences {
  travelStyle?: 'relaxed' | 'fast-paced' | 'cultural' | 'adventure' | 'luxury' | 'budget' | 'balanced';
  budgetPreference?: 'budget' | 'moderate' | 'luxury';
  activityPreferences?: string[];
  walkingTolerance?: 'low' | 'moderate' | 'high';
  preferredStartTime?: string; // e.g. '09:00'
  preferredEndTime?: string; // e.g. '21:00'
  foodPreferences?: string[];
  crowdPreference?: 'avoid-crowds' | 'popular-spots' | 'balanced';
  pacePreference?: 'relaxed' | 'moderate' | 'packed';
}

export interface HealthDimensionScore {
  score: number; // 0 - 100
  weight: number; // e.g. 0.20
  rawMetrics: Record<string, any>;
  explanation: string;
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

  // Phase 8 Mathematically Transparent 7-Dimension Model
  dimensionScores: {
    budget: HealthDimensionScore;
    routeEfficiency: HealthDimensionScore;
    timeBalance: HealthDimensionScore;
    weatherCompatibility: HealthDimensionScore;
    activityBalance: HealthDimensionScore;
    travelFatigue: HealthDimensionScore;
    constraintSatisfaction: HealthDimensionScore;
  };
  strengths: string[];
  risks: string[];
  recommendations: string[];
  delta: number;
  healthDelta?: number;

  // Backward compatibility fields
  breakdown: {
    budgetEfficiency: ComputedHealthMetric;    // 20%
    routeEfficiency: ComputedHealthMetric;     // 18%
    scheduleBalance: ComputedHealthMetric;     // 16%
    weatherCompatibility: ComputedHealthMetric;// 14%
    activityDiversity: ComputedHealthMetric;   // 12%
    restTime: ComputedHealthMetric;            // 10% (travelFatigue)
    constraintSatisfaction?: ComputedHealthMetric; // 10%
    travelFatigue?: ComputedHealthMetric;      // 10%
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

export interface PackingListRequest {
  destination: string;
  duration: number;
  tripStyle?: string;
  activities?: Array<{ activity: string; category?: string; location?: string }> | string[];
  weatherForecast?: Array<{ condition: string; precipitationProbability?: number; temperatureMaxC?: number; temperatureMinC?: number }> | null;
  userPreferences?: UserPreferences;
}

export interface PackingListResponse {
  destination: string;
  duration: number;
  tripStyle: string;
  items: Array<{
    id: string;
    name: string;
    category: 'clothing' | 'documents' | 'electronics' | 'essentials' | 'activity_gear';
    checked: boolean;
    aiSuggestedReason: string;
    isCustom?: boolean;
  }>;
  summary: string;
  weatherInsights?: string[];
  activityHighlights?: string[];
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
  scenarioType: 'budget_change' | 'remove_day' | 'add_traveler' | 'weather_shift' | 'weather_rain' | 'weather_disruption' | 'pace_change' | 'remove_activity' | 'change_hotel';
  parameters: {
    targetBudget?: number;
    dayToRemove?: number;
    travelerCount?: number;
    weatherCondition?: string;
    rainChancePercent?: number;
    targetDay?: number;
    targetPace?: 'relaxed' | 'moderate' | 'packed';
    userPrompt?: string;
    activityName?: string;
    activityId?: string;
    newHotelCategory?: string;
    newHotelName?: string;
    priceDelta?: number;
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
