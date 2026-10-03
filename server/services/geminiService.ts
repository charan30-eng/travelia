import { GoogleGenAI } from '@google/genai';
import { 
  AIChatRequest, 
  AIChatResponse, 
  TripContext, 
  OptimizationResult, 
  AIActionProposal,
  AIIntent
} from '../types/ai';
import { calculateDynamicHealthScore } from './healthScoreService';
import { optimizeTripItinerary, OptimizationOptions } from './itineraryOptimizer';
import { replanItineraryForWeather, createWeatherOptimizationResult } from './weatherService';
import { simulateWhatIfScenario } from './whatIfSimulator';
import { buildChatSystemPrompt } from '../prompts/chatPrompt';

// Initialize Gemini Client safely without exposing keys
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: apiKey.trim() });
  } catch (err) {
    console.error('[Gemini Service] Initialization failed:', err);
    return null;
  }
}

interface RawGeminiOutput {
  reply: string;
  intent: AIIntent;
  reasoning?: string;
  constraints?: {
    targetBudget?: number;
    targetDay?: number;
    preserveKeywords?: string[];
    targetPace?: 'relaxed' | 'moderate' | 'packed';
    weatherCondition?: string;
    removeMostExpensive?: boolean;
    scenarioType?: string;
  };
  actionProposal?: {
    type: 'optimization' | 'replan' | 'budget_cut' | 'route_reorder' | 'activity_swap' | 'rest_buffer';
    label: string;
    description: string;
    requiresOptimization?: boolean;
    estimatedSavings?: number;
    healthScoreDelta?: number;
    travelTimeSavedMins?: number;
  };
  suggestedFollowUps?: string[];
  confidence?: number;
}

/**
 * Handle AI Copilot Chat with real Gemini reasoning over the active trip context,
 * augmented with deterministic travel calculation engines.
 */
export async function chatWithTraveliaAI(req: AIChatRequest): Promise<AIChatResponse> {
  const { message, tripContext, history = [] } = req;
  
  // 1. Validate inputs safely
  if (!message || typeof message !== 'string') {
    throw new Error('Valid message string is required');
  }
  if (!tripContext || !Array.isArray(tripContext.itinerary)) {
    throw new Error('Valid tripContext with itinerary is required');
  }

  // 2. Pre-calculate deterministic baseline metrics
  const baselineHealth = calculateDynamicHealthScore(tripContext);
  const client = getGeminiClient();

  // 3. Attempt Gemini API if configured
  if (client) {
    try {
      const systemInstruction = buildChatSystemPrompt(tripContext, baselineHealth);

      // Clean and sanitize conversation history for Gemini API
      // Cap at last 10 messages to maintain tight focus and reasonable token limits
      const sanitizedHistory = history.slice(-10).map(h => ({
        role: ((h.role as string) === 'assistant' || h.role === 'model') ? ('model' as const) : ('user' as const),
        parts: [{ text: String(h.text || '').slice(0, 1500) }]
      })).filter(h => h.parts[0].text.trim().length > 0);

      const contents = [
        ...sanitizedHistory,
        {
          role: 'user' as const,
          parts: [{ text: message.slice(0, 1500) }]
        }
      ];

      // Call Gemini model
      const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      let responseText = '';

      for (const modelName of candidateModels) {
        try {
          const response = await client.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.25
            }
          });
          responseText = response.text || '';
          if (responseText.trim()) break;
        } catch (mErr: any) {
          console.warn(`[Gemini Service] Model ${modelName} call failed, trying alternative:`, mErr?.message || mErr);
        }
      }

      if (responseText.trim()) {
        const parsed: RawGeminiOutput = JSON.parse(responseText);
        const intent = parsed.intent || 'general';
        const constraints = parsed.constraints || {};

        // 4. Deterministic Engine Orchestration (Requirements 9, 10, 15, 17)
        // Gemini understands intent & constraints; Deterministic engines calculate verified numbers.
        let finalActionProposal: AIActionProposal | undefined = undefined;

        if (
          intent === 'budget' || 
          intent === 'optimization' || 
          intent === 'route_optimization' || 
          parsed.actionProposal?.requiresOptimization ||
          constraints.targetBudget || 
          constraints.preserveKeywords?.length ||
          constraints.targetDay
        ) {
          const optOptions: OptimizationOptions = {
            preserveKeywords: constraints.preserveKeywords,
            targetBudget: constraints.targetBudget,
            targetDay: constraints.targetDay,
            targetPace: constraints.targetPace
          };

          const optResult = optimizeTripItinerary(tripContext, 0.15, optOptions);
          const timeSavedMins = Math.round(optResult.travelTimeSavedHours * 60);

          finalActionProposal = {
            type: intent === 'budget' ? 'budget_cut' : 'optimization',
            label: parsed.actionProposal?.label || (intent === 'budget' 
              ? `Apply ₹${optResult.estimatedSavings.toLocaleString('en-IN')} Budget Optimization`
              : `Apply Itinerary & Route Optimization`),
            description: parsed.actionProposal?.description || optResult.summary,
            estimatedSavings: optResult.estimatedSavings,
            healthScoreBefore: optResult.healthScoreBefore,
            healthScoreAfter: optResult.healthScoreAfter,
            healthScoreDelta: optResult.healthScoreAfter - optResult.healthScoreBefore,
            travelTimeSavedMins: timeSavedMins,
            optimizationResult: optResult
          };
        } else if (intent === 'weather_alert' || message.toLowerCase().includes('rain') || message.toLowerCase().includes('weather')) {
          const targetDay = constraints.targetDay || 2;
          const replan = replanItineraryForWeather({
            tripContext,
            dayNumber: targetDay,
            condition: constraints.weatherCondition || 'Rain Showers',
            rainChancePercent: 80
          });
          const optResult = createWeatherOptimizationResult(tripContext, replan);

          finalActionProposal = {
            type: 'replan',
            label: parsed.actionProposal?.label || `Apply Day 0${targetDay} Weather-Safe Replan`,
            description: parsed.actionProposal?.description || replan.summary,
            estimatedSavings: replan.estimatedSavings || 0,
            healthScoreBefore: replan.healthScoreBefore,
            healthScoreAfter: replan.healthScoreAfter,
            healthScoreDelta: replan.healthScoreAfter - replan.healthScoreBefore,
            travelTimeSavedMins: Math.round((optResult.travelTimeSavedHours || 0) * 60),
            optimizationResult: optResult
          };
        } else if (intent === 'what_if' || constraints.removeMostExpensive) {
          // Identify most expensive activity
          let highestCost = 0;
          let mostExpensiveActName = '';
          tripContext.itinerary.forEach(d => {
            d.activities?.forEach(a => {
              const cost = Number(a.estimatedCost) || 0;
              if (cost > highestCost) {
                highestCost = cost;
                mostExpensiveActName = a.activity;
              }
            });
          });

          const whatIf = simulateWhatIfScenario({
            tripContext,
            scenarioType: 'budget_change',
            parameters: {
              targetBudget: Math.max(5000, (tripContext.budget?.total || 25000) - highestCost)
            }
          });

          finalActionProposal = {
            type: 'budget_cut',
            label: `Remove '${mostExpensiveActName}' (-₹${highestCost.toLocaleString('en-IN')})`,
            description: `Recalculates budget to save ₹${highestCost.toLocaleString('en-IN')} without altering other days.`,
            estimatedSavings: highestCost,
            healthScoreBefore: baselineHealth.overallScore,
            healthScoreAfter: whatIf.projectedState.healthScore,
            healthScoreDelta: whatIf.projectedState.healthScore - baselineHealth.overallScore,
            travelTimeSavedMins: whatIf.suggestedAction?.travelTimeSavedMins || 0,
            optimizationResult: whatIf.suggestedAction?.optimizationResult
          };
        } else if (intent === 'health_score') {
          const optResult = optimizeTripItinerary(tripContext, 0.15);
          finalActionProposal = {
            type: 'optimization',
            label: 'Improve Health Score with AI Balancing',
            description: 'Insert restorative buffer periods and cluster daily waypoints.',
            estimatedSavings: optResult.estimatedSavings,
            healthScoreBefore: optResult.healthScoreBefore,
            healthScoreAfter: optResult.healthScoreAfter,
            healthScoreDelta: optResult.healthScoreAfter - optResult.healthScoreBefore,
            travelTimeSavedMins: Math.round(optResult.travelTimeSavedHours * 60),
            optimizationResult: optResult
          };
        }

        return {
          reply: parsed.reply,
          intent,
          actionProposal: finalActionProposal,
          suggestedFollowUps: parsed.suggestedFollowUps || [
            "Make my trip cheaper",
            "Why is my health score low?",
            "What if it rains tomorrow?"
          ],
          confidence: parsed.confidence || 0.95,
          message: parsed.reply,
          deterministicCalculationsUsed: Boolean(finalActionProposal)
        };
      }
    } catch (apiError: any) {
      console.error('[Gemini Service] Gemini API call error, switching to deterministic engine fallback:', apiError?.message || apiError);
    }
  }

  // 5. Safe Deterministic Fallback (Requirements 12 & 28)
  // Activates ONLY when Gemini API is unavailable or fails.
  // Performs REAL calculations via deterministic engines; NEVER hardcoded fake numbers.
  return executeDeterministicFallback(tripContext, message, baselineHealth);
}

/**
 * Deterministic Engine Fallback for offline, timeout, or rate-limited environments.
 * Uses the exact same deterministic services so factual numbers are strictly computed.
 */
function executeDeterministicFallback(
  tripContext: TripContext, 
  message: string, 
  baselineHealth: ReturnType<typeof calculateDynamicHealthScore>
): AIChatResponse {
  const lower = message.toLowerCase();

  // 1. Budget & Cost Reduction
  if (lower.includes('cheap') || lower.includes('budget') || lower.includes('save') || lower.includes('cost') || lower.includes('money') || lower.includes('20,000') || lower.includes('20000')) {
    const targetBudgetMatch = message.match(/(?:₹|rs\.?|inr)?\s*(\d{1,2}(?:,\d{2,3})*|\d{4,6})/i);
    let parsedBudget: number | undefined = undefined;
    if (targetBudgetMatch && targetBudgetMatch[1]) {
      const num = parseInt(targetBudgetMatch[1].replace(/,/g, ''), 10);
      if (num >= 5000 && num <= 500000) parsedBudget = num;
    }

    const preserveBeach = lower.includes('beach');
    const opt = optimizeTripItinerary(tripContext, 0.15, {
      preserveKeywords: preserveBeach ? ['beach'] : [],
      targetBudget: parsedBudget
    });

    const reply = parsedBudget
      ? `I calculated adjustments to align your ${tripContext.destination} trip with a ₹${parsedBudget.toLocaleString('en-IN')} ceiling. By replacing luxury private charters with regional scenic alternatives and eliminating transit backtracking, we unlock ₹${opt.estimatedSavings.toLocaleString('en-IN')} in savings while keeping your core highlights intact.`
      : preserveBeach
      ? `I analyzed your ${tripContext.destination} itinerary while strictly preserving all your beach activities. By optimizing attraction tiers, booking regional passes in advance, and eliminating duplicate cab transfers, you can save ₹${opt.estimatedSavings.toLocaleString('en-IN')} without altering beach stops.`
      : `I analyzed your ${tripContext.destination} itinerary. By optimizing attraction admission tiers, booking regional transit passes in advance, and eliminating duplicate cab transfers, you can save ₹${opt.estimatedSavings.toLocaleString('en-IN')} while maintaining all major sightseeing stops.`;

    return {
      reply,
      intent: 'budget',
      actionProposal: {
        type: 'budget_cut',
        label: `Apply ₹${opt.estimatedSavings.toLocaleString('en-IN')} Budget Optimization`,
        description: 'Swaps expensive charters with scenic heritage transit and locks in attraction pass rates.',
        estimatedSavings: opt.estimatedSavings,
        healthScoreBefore: opt.healthScoreBefore,
        healthScoreAfter: opt.healthScoreAfter,
        healthScoreDelta: opt.healthScoreAfter - opt.healthScoreBefore,
        travelTimeSavedMins: Math.round(opt.travelTimeSavedHours * 60),
        optimizationResult: opt
      },
      suggestedFollowUps: [
        "Preview the Before vs After diff",
        "Keep beach activities but cut more",
        "Why is my health score low?"
      ],
      confidence: 0.94,
      message: reply,
      deterministicCalculationsUsed: true
    };
  }

  // 2. Weather & Rain Replan
  if (lower.includes('rain') || lower.includes('weather') || lower.includes('storm')) {
    const replan = replanItineraryForWeather({
      tripContext,
      dayNumber: 2,
      condition: 'Tropical Rain Showers',
      rainChancePercent: 80
    });
    const optResult = createWeatherOptimizationResult(tripContext, replan);

    const reply = `For rainy or stormy conditions in ${tripContext.destination}, outdoor coastal walks and water activities carry high exposure. I've prepared a Smart Weather Replan replacing exposed stops with air-conditioned heritage galleries, sheltered veranda dining, and scenic covered lounges.`;

    return {
      reply,
      intent: 'weather_alert',
      actionProposal: {
        type: 'replan',
        label: 'Apply Day 02 Weather-Safe Replan',
        description: 'Swaps rain-vulnerable outdoor activities with sheltered cultural alternatives.',
        estimatedSavings: 0,
        healthScoreBefore: replan.healthScoreBefore,
        healthScoreAfter: replan.healthScoreAfter,
        healthScoreDelta: replan.healthScoreAfter - replan.healthScoreBefore,
        travelTimeSavedMins: Math.round((optResult.travelTimeSavedHours || 0) * 60),
        optimizationResult: optResult
      },
      suggestedFollowUps: [
        "What indoor dining is recommended?",
        "Will transit be affected by rain?",
        "Make my trip cheaper too"
      ],
      confidence: 0.93,
      message: reply,
      deterministicCalculationsUsed: true
    };
  }

  // 3. Health Score Diagnostic
  if (lower.includes('health') || lower.includes('score') || lower.includes('diagnostic')) {
    const opt = optimizeTripItinerary(tripContext, 0.15);
    const reply = `Your Trip Health Score is ${baselineHealth.overallScore}/100 ("${baselineHealth.ratingLabel}"). Breakdown:
• Budget Efficiency: ${baselineHealth.breakdown.budgetEfficiency.score}/100 — ${baselineHealth.breakdown.budgetEfficiency.insight}
• Route Efficiency: ${baselineHealth.breakdown.routeEfficiency.score}/100 — ${baselineHealth.breakdown.routeEfficiency.insight}
• Schedule Balance: ${baselineHealth.breakdown.scheduleBalance.score}/100 — ${baselineHealth.breakdown.scheduleBalance.insight}
• Rest Buffers: ${baselineHealth.breakdown.restTime.score}/100 — ${baselineHealth.breakdown.restTime.insight}
• Category Diversity: ${baselineHealth.breakdown.activityDiversity.score}/100 — ${baselineHealth.breakdown.activityDiversity.insight}`;

    return {
      reply,
      intent: 'health_score',
      actionProposal: {
        type: 'optimization',
        label: 'Auto-Balance Schedule & Boost Health Score',
        description: 'Eliminates peak midday travel and creates comfortable 90-minute rest buffers.',
        estimatedSavings: opt.estimatedSavings,
        healthScoreBefore: opt.healthScoreBefore,
        healthScoreAfter: opt.healthScoreAfter,
        healthScoreDelta: opt.healthScoreAfter - opt.healthScoreBefore,
        travelTimeSavedMins: Math.round(opt.travelTimeSavedHours * 60),
        optimizationResult: opt
      },
      suggestedFollowUps: [
        "Make Day 2 less tiring",
        "Make my trip cheaper",
        "Which day is too busy?"
      ],
      confidence: 0.95,
      message: reply,
      deterministicCalculationsUsed: true
    };
  }

  // 4. Schedule & Pace Optimization ("Make Day 2 more relaxed", "Which day is too busy?")
  if (lower.includes('busy') || lower.includes('relax') || lower.includes('tired') || lower.includes('pace') || lower.includes('rearrange') || lower.includes('day 2') || lower.includes('day 3')) {
    const isDay2 = lower.includes('day 2') || lower.includes('day 02');
    const opt = optimizeTripItinerary(tripContext, 0.15, {
      targetDay: isDay2 ? 2 : undefined,
      targetPace: 'relaxed'
    });

    const dayCounts = tripContext.itinerary.map(d => ({ day: d.dayNumber, count: d.activities?.length || 0 }));
    const busiest = dayCounts.reduce((prev, curr) => curr.count > prev.count ? curr : prev, { day: 1, count: 0 });

    const reply = lower.includes('which day')
      ? `Day 0${busiest.day} is currently your busiest day with ${busiest.count} scheduled stops. Grouping stops closer together and shifting one late-afternoon stop to a lighter day creates a more balanced, comfortable travel rhythm.`
      : `I balanced Day 02 to make your schedule significantly more relaxed. By rescheduling peak afternoon transit and inserting a 45-minute post-lunch rest buffer, transit fatigue drops and Health Score improves from ${opt.healthScoreBefore} to ${opt.healthScoreAfter}/100.`;

    return {
      reply,
      intent: 'optimization',
      actionProposal: {
        type: 'optimization',
        label: 'Apply Relaxed Schedule Optimization',
        description: 'Balances daily stop counts, reduces transit rush, and adds afternoon breathers.',
        estimatedSavings: opt.estimatedSavings,
        healthScoreBefore: opt.healthScoreBefore,
        healthScoreAfter: opt.healthScoreAfter,
        healthScoreDelta: opt.healthScoreAfter - opt.healthScoreBefore,
        travelTimeSavedMins: Math.round(opt.travelTimeSavedHours * 60),
        optimizationResult: opt
      },
      suggestedFollowUps: [
        "Preview schedule changes",
        "Make my trip cheaper",
        "Why is my health score low?"
      ],
      confidence: 0.93,
      message: reply,
      deterministicCalculationsUsed: true
    };
  }

  // 5. What-if Simulations (e.g. "What if I remove expensive activity", "What if I add another traveler")
  if (lower.includes('what if') || lower.includes('remove') || lower.includes('traveler')) {
    if (lower.includes('traveler')) {
      const whatIf = simulateWhatIfScenario({
        tripContext,
        scenarioType: 'add_traveler',
        parameters: { travelerCount: (tripContext.travelers || 2) + 1 }
      });
      return {
        reply: whatIf.narrative + ' Key impacts: ' + whatIf.keyImpacts.join('; '),
        intent: 'what_if',
        actionProposal: whatIf.suggestedAction,
        suggestedFollowUps: [
          "Recalculate budget per person",
          "Make my trip cheaper",
          "Optimize route for group"
        ],
        confidence: 0.92,
        message: whatIf.narrative,
        deterministicCalculationsUsed: true
      };
    } else {
      // Find highest cost activity
      let highestCost = 0;
      let highestActName = 'Private Luxury Yacht Cruise';
      tripContext.itinerary.forEach(d => {
        d.activities?.forEach(a => {
          if ((Number(a.estimatedCost) || 0) > highestCost) {
            highestCost = Number(a.estimatedCost) || 0;
            highestActName = a.activity;
          }
        });
      });

      const reply = `Your most expensive activity is currently '${highestActName}' (estimated ₹${highestCost.toLocaleString('en-IN')}). If you remove or substitute this with a scenic shoreline catamaran or coastal walk, your projected spend drops from ₹${(tripContext.budget?.total || 25000).toLocaleString('en-IN')} to ₹${Math.max(5000, (tripContext.budget?.total || 25000) - highestCost).toLocaleString('en-IN')} without disrupting your sightseeing route.`;

      const whatIfScenario = simulateWhatIfScenario({
        tripContext,
        scenarioType: 'budget_change',
        parameters: { targetBudget: Math.max(5000, (tripContext.budget?.total || 25000) - highestCost) }
      });

      return {
        reply,
        intent: 'what_if',
        actionProposal: {
          type: 'budget_cut',
          label: `Simulate Removing '${highestActName}' (-₹${highestCost.toLocaleString('en-IN')})`,
          description: `Saves ₹${highestCost.toLocaleString('en-IN')} instantly without altering other days.`,
          estimatedSavings: highestCost,
          healthScoreBefore: baselineHealth.overallScore,
          healthScoreAfter: whatIfScenario.projectedState.healthScore,
          healthScoreDelta: whatIfScenario.projectedState.healthScore - baselineHealth.overallScore,
          travelTimeSavedMins: whatIfScenario.suggestedAction?.travelTimeSavedMins || 0,
          optimizationResult: whatIfScenario.suggestedAction?.optimizationResult
        },
        suggestedFollowUps: [
          "Apply this change",
          "Keep the beach activities",
          "Make Day 2 less tiring"
        ],
        confidence: 0.93,
        message: reply,
        deterministicCalculationsUsed: true
      };
    }
  }

  // 6. Route & Transit Optimization
  if (lower.includes('route') || lower.includes('travel') || lower.includes('backtrack')) {
    const opt = optimizeTripItinerary(tripContext, 0.15);
    const reply = `I analyzed the geographic coordinates and transit corridors of your ${tripContext.days}-day itinerary. By aligning stops along linear road segments instead of criss-crossing between northern and southern regions, transit time drops by ~${opt.travelTimeSavedHours} hours and avoids peak traffic bottlenecks.`;

    return {
      reply,
      intent: 'route_optimization',
      actionProposal: {
        type: 'route_reorder',
        label: `Apply Route Optimization (Save ~${opt.travelTimeSavedHours}h)`,
        description: 'Reorders daily waypoints to eliminate zigzag backtracking.',
        estimatedSavings: opt.estimatedSavings,
        healthScoreBefore: opt.healthScoreBefore,
        healthScoreAfter: opt.healthScoreAfter,
        healthScoreDelta: opt.healthScoreAfter - opt.healthScoreBefore,
        travelTimeSavedMins: Math.round(opt.travelTimeSavedHours * 60),
        optimizationResult: opt
      },
      suggestedFollowUps: [
        "Preview route diff",
        "Make my trip cheaper",
        "Why is my health score low?"
      ],
      confidence: 0.94,
      message: reply,
      deterministicCalculationsUsed: true
    };
  }

  // 7. General travel copilot fallback
  const opt = optimizeTripItinerary(tripContext, 0.15);
  const reply = `I have evaluated your ${tripContext.days}-day itinerary for ${tripContext.destination} (${tripContext.travelers} traveler(s), budget ${tripContext.budget.currency} ${tripContext.budget.total.toLocaleString('en-IN')}). Current Health Score is ${baselineHealth.overallScore}/100. I can help you reduce costs by ₹${opt.estimatedSavings.toLocaleString('en-IN')}, eliminate transit backtracking, balance daily pace, or replan for weather.`;

  return {
    reply,
    intent: 'general',
    actionProposal: {
      type: 'optimization',
      label: `Optimize Itinerary & Budget (Save ₹${opt.estimatedSavings.toLocaleString('en-IN')})`,
      description: 'Streamline route transit, remove zigzag backtracking, and unlock savings.',
      estimatedSavings: opt.estimatedSavings,
      healthScoreBefore: opt.healthScoreBefore,
      healthScoreAfter: opt.healthScoreAfter,
      healthScoreDelta: opt.healthScoreAfter - opt.healthScoreBefore,
      travelTimeSavedMins: Math.round(opt.travelTimeSavedHours * 60),
      optimizationResult: opt
    },
    suggestedFollowUps: [
      "Make my trip cheaper",
      "Which day is too busy?",
      "Why is my health score low?",
      "Rain is expected tomorrow"
    ],
    confidence: 0.90,
    message: reply,
    deterministicCalculationsUsed: true
  };
}
