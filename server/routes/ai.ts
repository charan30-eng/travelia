import { Router, Request, Response } from 'express';
import { chatWithTraveliaAI } from '../services/geminiService';
import { optimizeTripItinerary } from '../services/itineraryOptimizer';
import { calculateDynamicHealthScore, compareTripHealth } from '../services/healthScoreService';
import { replanItineraryForWeather } from '../services/weatherService';
import { simulateWhatIfScenario } from '../services/whatIfSimulator';
import { AIChatRequest, TripContext, WeatherReplanRequest, WhatIfScenarioRequest, PackingListRequest } from '../types/ai';
import { COPILOT_TOOL_DECLARATIONS } from '../services/copilotTools';
import { sanitizeUserPreferences, personalizeTripItinerary } from '../services/personalizationService';
import { generateContextAwarePackingList } from '../services/packingService';


const router = Router();

// Health check and AI status
router.get('/status', (req: Request, res: Response) => {
  const apiKeyPresent = Boolean(
    process.env.GEMINI_API_KEY && 
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' && 
    process.env.GEMINI_API_KEY.trim() !== ''
  );

  res.json({
    status: 'online',
    engine: 'Travelia Neural AI Engine',
    geminiConfigured: apiKeyPresent,
    version: '2.5.0',
    capabilities: [
      'itinerary_optimization',
      'real_time_health_score',
      'weather_disruption_replan',
      'what_if_simulation',
      'natural_language_copilot',
      'authoritative_tools_orchestration'
    ]
  });
});

// Authoritative Backend Capabilities (12 Tools)
router.get('/tools', (req: Request, res: Response) => {
  res.json({
    count: COPILOT_TOOL_DECLARATIONS.length,
    tools: COPILOT_TOOL_DECLARATIONS,
    status: 'active',
    retrievedAt: new Date().toISOString()
  });
});

// AI Chat Copilot
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, tripContext, history } = req.body as AIChatRequest;
    if (!message || !tripContext) {
      return res.status(400).json({ error: 'Missing message or tripContext in request body' });
    }

    const response = await chatWithTraveliaAI({ message, tripContext, history });
    res.json(response);
  } catch (error: any) {
    console.error('[API /chat] Error:', error);
    res.status(500).json({
      error: 'Failed to process AI chat request',
      message: error?.message || 'Unknown error'
    });
  }
});

// Trip Optimization Engine
router.post('/optimize', (req: Request, res: Response) => {
  try {
    const { tripContext, targetSavingsPercentage, options, objective, hardConstraints } = req.body as {
      tripContext: TripContext;
      targetSavingsPercentage?: number;
      options?: any;
      objective?: any;
      hardConstraints?: any;
    };

    if (!tripContext || !tripContext.itinerary) {
      return res.status(400).json({ error: 'Valid tripContext with itinerary is required' });
    }

    const mergedOptions = {
      ...options,
      ...(objective ? { objective } : {}),
      ...(hardConstraints ? { hardConstraints } : {})
    };

    const result = optimizeTripItinerary(tripContext, targetSavingsPercentage, mergedOptions);
    res.json(result);
  } catch (error: any) {
    console.error('[API /optimize] Error:', error);
    res.status(500).json({
      error: 'Optimization failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// Dynamic Health Score
router.post('/health-score', (req: Request, res: Response) => {
  try {
    const { tripContext } = req.body as { tripContext: TripContext };
    if (!tripContext) {
      return res.status(400).json({ error: 'tripContext is required' });
    }

    const health = calculateDynamicHealthScore(tripContext);
    res.json(health);
  } catch (error: any) {
    console.error('[API /health-score] Error:', error);
    res.status(500).json({
      error: 'Health score calculation failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// Weather Replan
router.post('/weather-replan', (req: Request, res: Response) => {
  try {
    const request = req.body as WeatherReplanRequest;
    if (!request?.tripContext) {
      return res.status(400).json({ error: 'tripContext is required for weather replan' });
    }

    const result = replanItineraryForWeather(request);
    res.json(result);
  } catch (error: any) {
    console.error('[API /weather-replan] Error:', error);
    res.status(500).json({
      error: 'Weather replan failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// What-If Simulation
router.post('/what-if', (req: Request, res: Response) => {
  try {
    const request = req.body as WhatIfScenarioRequest;
    if (!request?.tripContext || !request?.scenarioType) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMETERS', message: 'tripContext and scenarioType are required for what-if simulation' }
      });
    }


    const result = simulateWhatIfScenario(request);
    res.json(result);
  } catch (error: any) {
    console.error('[API /what-if] Error:', error);
    res.status(500).json({
      error: 'What-if simulation failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// Phase 8: Personalized Itinerary Adaptation
router.post('/personalized-plan', (req: Request, res: Response) => {
  try {
    const { tripContext, userPreferences } = req.body as {
      tripContext: TripContext;
      userPreferences?: any;
    };

    if (!tripContext || !tripContext.itinerary) {
      return res.status(400).json({ error: 'tripContext with valid itinerary is required' });
    }

    const { sanitized, rejectedSensitiveFields } = sanitizeUserPreferences(userPreferences || {});
    const personalizationResult = personalizeTripItinerary(tripContext, sanitized);
    
    // Exact deterministic health score comparison
    const healthComparison = compareTripHealth(
      tripContext, 
      personalizationResult.personalizedTrip
    );

    res.json({
      ...personalizationResult,
      beforeHealth: healthComparison.beforeHealth,
      afterHealth: healthComparison.afterHealth,
      healthDelta: healthComparison.healthDelta,
      rejectedSensitiveFields
    });
  } catch (error: any) {
    console.error('[API /personalized-plan] Error:', error);
    res.status(500).json({
      error: 'Personalization failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// Phase 8: Context-Aware Packing List Generator
router.post('/packing-list', (req: Request, res: Response) => {
  try {
    const request = req.body as PackingListRequest;
    if (!request?.destination) {
      return res.status(400).json({ error: 'destination is required for packing list' });
    }

    const result = generateContextAwarePackingList({
      destination: request.destination,
      duration: request.duration || 3,
      tripStyle: request.tripStyle,
      activities: request.activities,
      weatherForecast: request.weatherForecast,
      userPreferences: request.userPreferences
    });

    res.json(result);
  } catch (error: any) {
    console.error('[API /packing-list] Error:', error);
    res.status(500).json({
      error: 'Failed to generate packing list',
      message: error?.message || 'Unknown error'
    });
  }
});

// Phase 8: Exact Trip Health Comparison (Delta = afterScore - beforeScore)
router.post('/compare-health', (req: Request, res: Response) => {
  try {
    const { beforeTrip, afterTrip, weatherForecast } = req.body as {
      beforeTrip: TripContext;
      afterTrip: TripContext;
      weatherForecast?: any;
    };

    if (!beforeTrip || !afterTrip) {
      return res.status(400).json({ error: 'both beforeTrip and afterTrip are required' });
    }

    const result = compareTripHealth(beforeTrip, afterTrip, undefined, undefined, weatherForecast);
    res.json(result);
  } catch (error: any) {
    console.error('[API /compare-health] Error:', error);
    res.status(500).json({
      error: 'Health comparison failed',
      message: error?.message || 'Unknown error'
    });
  }
});

export default router;

