/**
 * Weather API Endpoints for Travelia
 * 
 * Provides:
 * - GET /api/weather/forecast: Authoritative normalized weather forecast
 * - POST /api/weather/replan: Smart Weather Replan proposal (never auto-mutates)
 * - POST /api/weather/impact: Deterministic day impact analysis
 */

import { Router, Request, Response } from 'express';
import { 
  getAuthoritativeTripForecast, 
  replanItineraryForWeather, 
  resolveDestinationCoordinates 
} from '../services/weatherService';
import { evaluateDayWeatherImpact } from '../services/weatherImpactService';
import { WeatherReplanRequest } from '../types/ai';
import { isValidCoordinate, isValidDateString, validateNumberRange } from '../middleware/validation';

const router = Router();

// GET /api/weather/forecast
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const destination = (req.query.destination as string) || 'Goa';
    const startDate = req.query.startDate as string | undefined;
    const daysRaw = req.query.days as string || req.query.daysCount as string || '3';
    const daysCount = parseInt(daysRaw, 10);

    const daysValidation = validateNumberRange(daysCount, 1, 16, 'days');
    if (!daysValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DAYS', message: daysValidation.error }
      });
    }

    if (startDate && !isValidDateString(startDate)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'startDate must be in YYYY-MM-DD format' }
      });
    }

    let coords;
    if (req.query.lat !== undefined || req.query.lng !== undefined) {
      const coordCheck = isValidCoordinate(req.query.lat, req.query.lng);
      if (!coordCheck.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_COORDINATES', message: coordCheck.error }
        });
      }
      coords = { latitude: parseFloat(req.query.lat as string), longitude: parseFloat(req.query.lng as string) };
    }

    const forecast = await getAuthoritativeTripForecast(destination, startDate, daysCount, coords);
    res.json(forecast);

  } catch (error: any) {
    console.error('[API /weather/forecast] Error:', error);
    res.status(500).json({
      availability: 'unavailable',
      error: 'Weather forecast retrieval failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// POST /api/weather/replan
router.post('/replan', (req: Request, res: Response) => {
  try {
    const request = req.body as WeatherReplanRequest;
    if (!request?.tripContext) {
      return res.status(400).json({ error: 'tripContext is required for weather replan' });
    }

    const result = replanItineraryForWeather(request);
    res.json(result);
  } catch (error: any) {
    console.error('[API /weather/replan] Error:', error);
    res.status(500).json({
      error: 'Weather replan failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// POST /api/weather/impact
router.post('/impact', (req: Request, res: Response) => {
  try {
    const { activities, weatherDay, dayNumber = 1 } = req.body;
    if (!Array.isArray(activities)) {
      return res.status(400).json({ error: 'activities array is required' });
    }

    const impact = evaluateDayWeatherImpact(activities, weatherDay || null, dayNumber);
    res.json(impact);
  } catch (error: any) {
    console.error('[API /weather/impact] Error:', error);
    res.status(500).json({
      error: 'Weather impact calculation failed',
      message: error?.message || 'Unknown error'
    });
  }
});

export default router;
