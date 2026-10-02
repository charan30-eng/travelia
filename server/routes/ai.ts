import { Router, Request, Response } from 'express';
import { chatWithTraveliaAI } from '../services/geminiService';
import { optimizeTripItinerary } from '../services/itineraryOptimizer';
import { calculateDynamicHealthScore } from '../services/healthScoreService';
import { replanItineraryForWeather } from '../services/weatherService';
import { simulateWhatIfScenario } from '../services/whatIfSimulator';
import { AIChatRequest, TripContext, WeatherReplanRequest, WhatIfScenarioRequest } from '../types/ai';

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
      'natural_language_copilot'
    ]
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
    const { tripContext, targetSavingsPercentage } = req.body as {
      tripContext: TripContext;
      targetSavingsPercentage?: number;
    };

    if (!tripContext || !tripContext.itinerary) {
      return res.status(400).json({ error: 'Valid tripContext with itinerary is required' });
    }

    const result = optimizeTripItinerary(tripContext, targetSavingsPercentage);
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
    if (!request?.tripContext) {
      return res.status(400).json({ error: 'tripContext is required for what-if simulation' });
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

export default router;
