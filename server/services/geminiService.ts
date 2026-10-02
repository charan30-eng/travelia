import { GoogleGenAI } from '@google/genai';
import { 
  AIChatRequest, 
  AIChatResponse, 
  TripContext, 
  OptimizationResult, 
  WeatherReplanRequest, 
  WeatherReplanResponse, 
  WhatIfScenarioRequest, 
  WhatIfScenarioResponse 
} from '../types/ai';
import { calculateDynamicHealthScore } from './healthScoreService';
import { optimizeTripItinerary } from './itineraryOptimizer';
import { replanItineraryForWeather } from './weatherService';
import { simulateWhatIfScenario } from './whatIfSimulator';

// Initialize Gemini Client safely
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error('[Gemini Service] Error initializing GoogleGenAI:', err);
    return null;
  }
}

/**
 * Handle AI Copilot Chat with real Gemini reasoning over the active trip context
 */
export async function chatWithTraveliaAI(req: AIChatRequest): Promise<AIChatResponse> {
  const { message, tripContext, history = [] } = req;
  const client = getGeminiClient();
  const health = calculateDynamicHealthScore(tripContext);

  const tripSummary = `
Trip to: ${tripContext.destination}
Duration: ${tripContext.days} days, ${tripContext.travelers} travelers
Declared Total Budget: ${tripContext.budget.currency} ${tripContext.budget.total}
Spent/Estimated so far: ${tripContext.budget.spent || 0}
Current Health Score: ${health.overallScore}/100 (${health.ratingLabel})
Itinerary Days:
${tripContext.itinerary.map(d => `Day ${d.dayNumber} (${d.title}): ${d.activities.map(a => `${a.time} - ${a.activity} (${tripContext.budget.currency} ${a.estimatedCost})`).join('; ')}`).join('\n')}
`;

  if (client) {
    try {
      const systemInstruction = `
You are Travelia AI, an advanced, highly intelligent travel copilot and itinerary optimization system.
You reason over the user's REAL trip context.
Current Trip Details:
${tripSummary}

Guidelines:
1. Always base your answers on the user's actual itinerary, budget, and stops above.
2. If the user asks to reduce costs, make it cheaper, optimize routes, handle rain/weather, or improve health score:
   - Provide a concise, clear explanation.
   - Propose a concrete action with estimated savings or health score impact.
3. Respond in valid JSON format matching this schema:
{
  "reply": "Your conversational answer explaining specific tips or changes",
  "intent": "question" | "optimization" | "weather_alert" | "budget" | "schedule_inquiry" | "general",
  "actionProposal": {
    "type": "optimization" | "replan" | "budget_cut" | "route_reorder" | "activity_swap" | "rest_buffer",
    "label": "Button label to preview/apply action (e.g. 'Apply ₹3,800 Savings Optimization')",
    "description": "Short description of what applying this change will do",
    "estimatedSavings": 3800,
    "healthScoreDelta": 9,
    "travelTimeSavedMins": 45
  },
  "suggestedFollowUps": ["Follow up 1", "Follow up 2"],
  "confidence": 0.95
}
`;

      const contents = [
        ...history.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        })),
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ];

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      });

      const responseText = response.text || '';
      try {
        const parsed: AIChatResponse = JSON.parse(responseText);
        return {
          reply: parsed.reply || "I've analyzed your itinerary.",
          intent: parsed.intent || 'general',
          actionProposal: parsed.actionProposal,
          suggestedFollowUps: parsed.suggestedFollowUps || [
            "How can I cut more expenses?",
            "Is my schedule too tiring?",
            "What if it rains tomorrow?"
          ],
          confidence: parsed.confidence || 0.92
        };
      } catch (parseError) {
        console.warn('[Gemini Service] Could not parse JSON response, extracting text:', parseError);
        return {
          reply: responseText,
          intent: 'general',
          confidence: 0.88
        };
      }
    } catch (apiError) {
      console.error('[Gemini Service] API call failed, falling back to local reasoning:', apiError);
    }
  }

  // Resilient deterministic fallback using Travelia optimization engine
  const lower = message.toLowerCase();
  
  if (lower.includes('cheap') || lower.includes('budget') || lower.includes('save') || lower.includes('cost') || lower.includes('money')) {
    const opt = optimizeTripItinerary(tripContext);
    return {
      reply: `I analyzed your ${tripContext.destination} itinerary. By optimizing attraction tiers, booking regional passes in advance, and eliminating duplicate cab transfers, you can save ~₹${opt.estimatedSavings.toLocaleString()} while keeping all major highlights.`,
      intent: 'budget',
      actionProposal: {
        type: 'budget_cut',
        label: `Apply ₹${opt.estimatedSavings.toLocaleString()} Budget Optimization`,
        description: `Apply smart attraction pass discounts and reduced cab transit corridors.`,
        estimatedSavings: opt.estimatedSavings,
        healthScoreDelta: opt.healthScoreAfter - opt.healthScoreBefore,
        travelTimeSavedMins: Math.round(opt.travelTimeSavedHours * 60)
      },
      suggestedFollowUps: [
        "Show me before vs after comparison",
        "Which single activity is most expensive?",
        "What if my total budget is ₹20,000?"
      ],
      confidence: 0.94
    };
  }

  if (lower.includes('rain') || lower.includes('weather') || lower.includes('storm')) {
    const replan = replanItineraryForWeather({
      tripContext,
      dayNumber: 2,
      condition: 'Tropical Showers',
      rainChancePercent: 75
    });
    return {
      reply: `For rainy or stormy conditions in ${tripContext.destination}, outdoor coastal walks and water sports are vulnerable. I've prepared a Smart Weather Replan replacing exposed stops with air-conditioned heritage galleries and sheltered veranda dining.`,
      intent: 'weather_alert',
      actionProposal: {
        type: 'replan',
        label: 'Review Indoor Weather Replan',
        description: `Replace rain-vulnerable outdoor activities with sheltered cultural alternatives.`,
        estimatedSavings: 0,
        healthScoreDelta: replan.healthScoreAfter - replan.healthScoreBefore
      },
      suggestedFollowUps: [
        "What are indoor cultural alternatives?",
        "Will transit be delayed?",
        "Check 5-day weather advisory"
      ],
      confidence: 0.95
    };
  }

  if (lower.includes('health') || lower.includes('score') || lower.includes('why') || lower.includes('diagnostic')) {
    return {
      reply: `Your trip has a Health Score of ${health.overallScore}/100 ("${health.ratingLabel}"). Breakdown: Budget Efficiency (${health.breakdown.budgetEfficiency.score}/100), Route Efficiency (${health.breakdown.routeEfficiency.score}/100), Schedule Balance (${health.breakdown.scheduleBalance.score}/100), Rest Buffer (${health.breakdown.restTime.score}/100).`,
      intent: 'schedule_inquiry',
      actionProposal: {
        type: 'optimization',
        label: 'Improve Health Score with AI',
        description: 'Auto-balance daily stops and insert comfortable rest buffers.',
        healthScoreDelta: Math.max(5, 95 - health.overallScore)
      },
      suggestedFollowUps: [
        "How do I increase rest time?",
        "Are any days overcrowded?",
        "Optimize my route"
      ],
      confidence: 0.96
    };
  }

  if (lower.includes('relax') || lower.includes('tired') || lower.includes('busy') || lower.includes('pace') || lower.includes('pace')) {
    const whatIf = simulateWhatIfScenario({
      tripContext,
      scenarioType: 'pace_change',
      parameters: { targetPace: 'relaxed' }
    });
    return {
      reply: `To make your ${tripContext.destination} trip more relaxed, we should limit each day to 3 curated stops, add 90-minute afternoon pauses, and cluster stops within 15 minutes of each other. This raises your Health Score to ${whatIf.projectedState.healthScore}/100.`,
      intent: 'optimization',
      actionProposal: whatIf.suggestedAction,
      suggestedFollowUps: [
        "Make my trip cheaper too",
        "Which activity should I remove?",
        "Find better order for Day 2"
      ],
      confidence: 0.92
    };
  }

  // Default contextual travel assistant reply
  return {
    reply: `I have evaluated your ${tripContext.days}-day itinerary for ${tripContext.destination} (${tripContext.travelers} travelers, budget ${tripContext.budget.currency} ${tripContext.budget.total}). Current Health Score is ${health.overallScore}/100 with all major attractions mapped. Would you like me to optimize costs, streamline transit corridors, or simulate a weather scenario?`,
    intent: 'general',
    actionProposal: {
      type: 'optimization',
      label: 'Optimize Full Itinerary & Budget',
      description: 'Streamline route transit, remove zigzag backtracking, and unlock savings.',
      estimatedSavings: 3800,
      healthScoreDelta: 8
    },
    suggestedFollowUps: [
      "Make my trip cheaper",
      "Is Day 2 too busy?",
      "What happens if it rains tomorrow?",
      "Optimize my route"
    ],
    confidence: 0.90
  };
}
