/**
 * Travelia Places Data Layer - API Routes
 * 
 * Exposes:
 * - GET /api/places/search
 * - GET /api/places/hotels
 * - GET /api/places/attractions
 * - GET /api/places/photo
 * - GET /api/places/:placeId
 */

import { Router, Request, Response } from 'express';
import { placesService } from '../services/placesService';
import { PlaceCategory } from '../types/places';
import { isValidCoordinate, isValidId } from '../middleware/validation';

const router = Router();

/**
 * GET /api/places/search
 * Search places for a destination with optional category & query
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const destination = (req.query.destination as string) || '';
    if (!destination) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DESTINATION', message: 'destination query parameter is required' }
      });
    }

    const query = req.query.query as string | undefined;
    const category = req.query.category as PlaceCategory | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
    
    let latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
    let longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
    const radiusMeters = req.query.radius ? parseFloat(req.query.radius as string) : undefined;

    if (req.query.latitude !== undefined || req.query.longitude !== undefined) {
      const coordCheck = isValidCoordinate(req.query.latitude, req.query.longitude);
      if (!coordCheck.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_COORDINATES', message: coordCheck.error }
        });
      }
    }

    const response = await placesService.searchPlaces({
      destination,
      query,
      category,
      limit,
      latitude,
      longitude,
      radiusMeters
    });


    return res.json(response);
  } catch (err: any) {
    console.error('[API /api/places/search Error]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An internal error occurred while searching places.' }
    });
  }
});

/**
 * GET /api/places/hotels
 * Search hotels & lodging in a destination
 */
router.get('/hotels', async (req: Request, res: Response) => {
  try {
    const destination = (req.query.destination as string) || '';
    if (!destination) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DESTINATION', message: 'destination query parameter is required' }
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const response = await placesService.searchHotels(destination, limit);
    return res.json(response);
  } catch (err: any) {
    console.error('[API /api/places/hotels Error]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An internal error occurred while searching hotels.' }
    });
  }
});

/**
 * GET /api/places/attractions
 * Search tourist attractions and sights in a destination
 */
router.get('/attractions', async (req: Request, res: Response) => {
  try {
    const destination = (req.query.destination as string) || '';
    if (!destination) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DESTINATION', message: 'destination query parameter is required' }
      });
    }

    const city = req.query.city as string | undefined;
    const country = req.query.country as string | undefined;
    const countryCode = req.query.countryCode as string | undefined;
    const destinationPlaceId = req.query.destinationPlaceId as string | undefined;
    const category = req.query.category as PlaceCategory | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;

    let latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
    let longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;

    if (req.query.latitude !== undefined || req.query.longitude !== undefined) {
      const coordCheck = isValidCoordinate(req.query.latitude, req.query.longitude);
      if (!coordCheck.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_COORDINATES', message: coordCheck.error }
        });
      }
    }

    const response = await placesService.searchAttractions({
      destination,
      city,
      country,
      countryCode,
      destinationPlaceId,
      category,
      limit,
      latitude,
      longitude
    }, limit);

    return res.json(response);
  } catch (err: any) {
    console.error('[API /api/places/attractions Error]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An internal error occurred while searching attractions.' }
    });
  }
});

/**
 * GET /api/places/photo
 * Secure photo media proxy to prevent Google Maps API key leakage to browser
 */
router.get('/photo', async (req: Request, res: Response) => {
  try {
    const photoName = req.query.name as string;
    if (!photoName) {
      return res.status(400).send('Photo resource name is required');
    }

    const maxHeight = req.query.maxHeight ? parseInt(req.query.maxHeight as string, 10) : 400;
    const maxWidth = req.query.maxWidth ? parseInt(req.query.maxWidth as string, 10) : 600;

    const media = await placesService.getPlacePhotoMedia(photoName, maxHeight, maxWidth);
    if (!media) {
      // Fallback placeholder image
      return res.redirect('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop');
    }

    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache photo for 24h
    return res.send(media.buffer);
  } catch (err: any) {
    console.error('[API /api/places/photo Error]', err);
    return res.status(500).send('Failed to fetch photo media');
  }
});

/**
 * GET /api/places/:placeId
 * Retrieve detailed info for a specific place
 */
router.get('/:placeId', async (req: Request, res: Response) => {
  try {
    const placeId = req.params.placeId;
    if (!isValidId(placeId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PLACE_ID', message: 'Invalid place ID format.' }
      });
    }

    const place = await placesService.getPlaceDetails(placeId);
    if (!place) {
      return res.status(404).json({
        success: false,
        error: { code: 'PLACE_NOT_FOUND', message: `Place with ID ${placeId} not found` }
      });
    }


    return res.json({
      success: true,
      place
    });
  } catch (err: any) {
    console.error(`[API /api/places/${req.params.placeId} Error]`, err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve place details' }
    });
  }
});

export default router;
