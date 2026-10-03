import { 
  TripContext, 
  AIChatRequest, 
  AIChatResponse, 
  AIActionProposal,
  OptimizationResult, 
  ComputedHealthScore, 
  WeatherReplanRequest, 
  WeatherReplanResponse, 
  WhatIfScenarioRequest, 
  WhatIfScenarioResponse 
} from '../../server/types/ai';
import { TripPlan } from '../types';

export type { 
  TripContext, 
  AIChatRequest, 
  AIChatResponse, 
  AIActionProposal,
  OptimizationResult, 
  ComputedHealthScore, 
  WeatherReplanRequest, 
  WeatherReplanResponse, 
  WhatIfScenarioRequest, 
  WhatIfScenarioResponse 
};

/**
 * Convert application TripPlan state into structured TripContext for AI reasoning
 */
export function formatTripForAI(trip: TripPlan): TripContext {
  const declaredBudget = trip.budget?.total || 25000;
  let spentSum = (trip.budget as any)?.spent || 0;
  if (!spentSum) {
    spentSum = (trip.budget?.hotel || 0) + (trip.budget?.food || 0) + (trip.budget?.transportation || 0) + (trip.budget?.activities || 0);
  }

  const selectedHotel = trip.hotels?.find(h => h.selected) || trip.hotels?.[0];
  const dateParts = trip.travelDates?.split(/[-–—]/).map(s => s.trim()) || [];

  return {
    id: trip.id,
    destination: trip.destination,
    country: trip.country,
    days: trip.days,
    travelers: trip.travelers,
    travelDates: trip.travelDates,
    startDate: dateParts[0] || undefined,
    endDate: dateParts[1] || undefined,
    budget: {
      currency: 'INR',
      total: declaredBudget,
      spent: spentSum,
      remainingBudget: Math.max(0, declaredBudget - spentSum),
      hotel: trip.budget?.hotel,
      flights: trip.budget?.flights,
      food: trip.budget?.food,
      transportation: trip.budget?.transportation,
      activities: trip.budget?.activities,
      miscellaneous: trip.budget?.miscellaneous
    },
    preferences: {
      pace: trip.activityLevel || 'moderate',
      foodPreference: trip.foodPreference,
      transportPreference: trip.transportType,
      activityPreferences: trip.preferences
    },
    existingBookings: {
      hotel: selectedHotel?.name,
      hotelCategory: trip.hotelCategory
    },
    itinerary: trip.itinerary || []
  };
}

/**
 * Send natural language message to the Travelia AI copilot
 */
export async function sendChatMessage(
  tripOrContext: TripPlan | TripContext,
  message: string,
  history: Array<{ role: string; content?: string; text?: string }> = []
): Promise<AIChatResponse> {
  const tripContext = 'preferences' in tripOrContext && 'budget' in tripOrContext && 'total' in (tripOrContext as any).budget
    ? (tripOrContext as TripContext)
    : formatTripForAI(tripOrContext as TripPlan);

  const formattedHistory = history.map((h) => ({
    role: (h.role === 'assistant' ? 'model' : h.role) as 'user' | 'model',
    text: h.text || h.content || ''
  }));

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, tripContext, history: formattedHistory })
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson?.error || errJson?.message) {
        errorDetail = errJson.error || errJson.message;
      }
    } catch {}
    throw new Error(`AI Chat error: ${errorDetail}`);
  }

  const data: AIChatResponse = await res.json();
  if (!data.message && data.reply) {
    data.message = data.reply;
  }
  if (!data.reply && data.message) {
    data.reply = data.message;
  }
  if (data.actionProposal?.optimizationResult && !data.proposedChanges) {
    data.proposedChanges = data.actionProposal.optimizationResult;
  }
  return data;
}

/**
 * Request comprehensive multi-factor trip optimization
 */
export async function optimizeTrip(
  tripOrContext: TripPlan | TripContext,
  targetSavingsPercentage: number = 0.15
): Promise<OptimizationResult> {
  const tripContext = 'preferences' in tripOrContext && 'budget' in tripOrContext && 'total' in (tripOrContext as any).budget
    ? (tripOrContext as TripContext)
    : formatTripForAI(tripOrContext as TripPlan);

  const res = await fetch('/api/ai/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripContext, targetSavingsPercentage })
  });

  if (!res.ok) {
    throw new Error(`Trip optimization error: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Calculate dynamic Trip Health Score across the 6 core dimensions
 */
export async function calculateDynamicHealthScore(
  tripOrContext: TripPlan | TripContext
): Promise<ComputedHealthScore> {
  const tripContext = 'preferences' in tripOrContext && 'budget' in tripOrContext && 'total' in (tripOrContext as any).budget
    ? (tripOrContext as TripContext)
    : formatTripForAI(tripOrContext as TripPlan);

  const res = await fetch('/api/ai/health-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripContext })
  });

  if (!res.ok) {
    throw new Error(`Health score calculation error: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Request smart weather-aware disruption replan
 */
export async function replanWeather(
  tripOrReq: TripPlan | WeatherReplanRequest,
  dayNumber: number = 1,
  condition: string = 'rain'
): Promise<WeatherReplanResponse> {
  const req: WeatherReplanRequest = 'tripContext' in tripOrReq
    ? (tripOrReq as WeatherReplanRequest)
    : {
        tripContext: formatTripForAI(tripOrReq as TripPlan),
        dayNumber,
        condition,
        rainChancePercent: 85
      };

  const res = await fetch('/api/ai/weather-replan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    throw new Error(`Weather replan error: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Simulate what-if scenario (e.g. Budget reduction, traveler count change, drop day)
 */
export async function simulateWhatIf(
  req: WhatIfScenarioRequest
): Promise<WhatIfScenarioResponse> {
  const res = await fetch('/api/ai/what-if', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    throw new Error(`What-if simulation error: ${res.statusText}`);
  }

  return await res.json();
}
