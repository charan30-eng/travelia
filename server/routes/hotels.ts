/**
 * TRAVELIA HOTEL REST API ROUTES
 * 
 * Endpoints:
 * - GET /api/hotels/search?destination=...&checkIn=...&checkOut=...&guests=...
 */

import { Router, Request, Response } from 'express';
import { hotelService } from '../services/hotelService';
import { isValidDateString, validateNumberRange } from '../middleware/validation';

export const hotelRouter = Router();

hotelRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const destination = (req.query.destination as string) || '';
    const checkInDate = req.query.checkIn as string | undefined;
    const checkOutDate = req.query.checkOut as string | undefined;
    const guests = req.query.guests ? parseInt(req.query.guests as string, 10) : 2;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;

    if (!destination.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DESTINATION', message: 'destination query parameter is required' }
      });
    }

    if (checkInDate && !isValidDateString(checkInDate)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'checkIn date must be in YYYY-MM-DD format' }
      });
    }

    if (checkOutDate && !isValidDateString(checkOutDate)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'checkOut date must be in YYYY-MM-DD format' }
      });
    }

    const guestsRange = validateNumberRange(guests, 1, 20, 'guests');
    if (!guestsRange.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_GUESTS', message: guestsRange.error }
      });
    }

    const result = await hotelService.searchHotels({
      destination,
      checkInDate,
      checkOutDate,
      guests,
      limit: Math.min(50, Math.max(1, isNaN(limit) ? 6 : limit))
    });

    res.json(result);

  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'HOTEL_SEARCH_ERROR', message: err.message || 'Hotel search failed' }
    });
  }
});

export default hotelRouter;
