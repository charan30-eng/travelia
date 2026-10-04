/**
 * TRAVELIA FLIGHT REST API ROUTES
 * 
 * Endpoints:
 * - GET /api/flights/search?origin=...&destination=...&departureDate=...&returnDate=...&passengers=...
 */

import { Router, Request, Response } from 'express';
import { flightService } from '../services/flightService';
import { isValidDateString, validateNumberRange } from '../middleware/validation';

export const flightRouter = Router();

flightRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const origin = (req.query.origin as string) || 'Mumbai';
    const destination = (req.query.destination as string) || '';
    const departureDate = req.query.departureDate as string | undefined;
    const returnDate = req.query.returnDate as string | undefined;
    const passengers = req.query.passengers ? parseInt(req.query.passengers as string, 10) : 1;
    const cabinClass = (req.query.cabinClass as any) || 'economy';

    if (!destination.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DESTINATION', message: 'destination query parameter is required' }
      });
    }

    if (departureDate && !isValidDateString(departureDate)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'departureDate must be in YYYY-MM-DD format' }
      });
    }

    if (returnDate && !isValidDateString(returnDate)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'returnDate must be in YYYY-MM-DD format' }
      });
    }

    const paxRange = validateNumberRange(passengers, 1, 9, 'passengers');
    if (!paxRange.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSENGERS', message: paxRange.error }
      });
    }

    const result = await flightService.searchFlights({
      origin,
      destination,
      departureDate: departureDate || new Date().toISOString().split('T')[0],
      returnDate,
      passengers,
      cabinClass
    });

    res.json(result);

  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FLIGHT_SEARCH_ERROR', message: err.message || 'Flight search failed' }
    });
  }
});

export default flightRouter;
