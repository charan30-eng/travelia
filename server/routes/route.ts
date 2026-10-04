import { Router, Request, Response } from 'express';
import {
  calculateDayRouteMetrics,
  calculateTripRouteMetrics,
  calculateRouteMatrix,
  optimizeDayRoute,
  compareTripRoutes,
  clusterActivitiesGeographically
} from '../services/routeIntelligenceService';

import { RouteIntelligenceResponse, TravelMode, RouteOptimizationConstraint } from '../types/route';
import { isValidCoordinate } from '../middleware/validation';

const router = Router();


// Route Provider Status & Capability Check
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    engine: 'Travelia Authoritative Route Intelligence Engine',
    version: '2.0.0',
    provider: process.env.ROUTE_PROVIDER || 'osrm',
    osrmBaseUrl: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
    supportedModes: ['driving', 'walking', 'cycling'],
    capabilities: [
      'factual_road_routing',
      'exact_road_geometry',
      'straight_line_distinction',
      'backtracking_reversal_detection',
      'time_aware_transit_conflicts',
      'opening_hours_validation',
      'constraint_preserving_tsp_optimization',
      'deterministic_before_after_comparison',
      'geographic_clustering'
    ]
  });
});

// Analyze Full Trip Route Intelligence
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { tripContext, mode = 'driving' } = req.body as {
      tripContext: any;
      mode?: TravelMode;
    };

    if (!tripContext || !tripContext.itinerary) {
      return res.status(400).json({ error: 'Valid tripContext with itinerary is required' });
    }

    const currentRoute = await calculateTripRouteMetrics({
      destination: tripContext.destination,
      itinerary: tripContext.itinerary.map((d: any) => ({
        dayNumber: d.dayNumber,
        activities: (d.activities || []).map((a: any) => ({
          id: a.id || `act-${Math.random()}`,
          name: a.activity || a.name || 'Activity',
          location: a.location,
          coords: a.coords,
          time: a.time,
          durationMinutes: a.durationMinutes || 90,
          openingHours: a.openingHours,
          isFixedTime: a.isFixedTime,
          category: a.category
        }))
      })),
      hotels: tripContext.hotels,
      mode
    });

    // Extract all conflicts across days
    const allConflicts = currentRoute.days.flatMap(d => d.conflicts);

    const limitations: string[] = [];
    if (currentRoute.availability === 'partial') {
      limitations.push('Some activities did not have verified coordinates; partial route metrics computed.');
    } else if (currentRoute.availability === 'unavailable') {
      limitations.push('Activity locations could not be verified; route distance unavailable.');
    }

    const response: RouteIntelligenceResponse = {
      currentRoute,
      optimizationApplied: false,
      availability: currentRoute.availability,
      conflicts: allConflicts,
      limitations
    };

    res.json(response);
  } catch (error: any) {
    console.error('[API /route/analyze] Error:', error);
    res.status(500).json({
      error: 'Route analysis failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// Single Day Route Calculation
router.post('/day', async (req: Request, res: Response) => {
  try {
    const { dayNumber = 1, activities = [], destination, mode = 'driving', hotelCoords } = req.body;

    if (!destination) {
      return res.status(400).json({ error: 'destination is required' });
    }

    const metrics = await calculateDayRouteMetrics(
      dayNumber,
      activities.map((a: any) => ({
        id: a.id || `act-${Math.random()}`,
        name: a.activity || a.name || 'Activity',
        location: a.location,
        coords: a.coords,
        time: a.time,
        durationMinutes: a.durationMinutes,
        openingHours: a.openingHours,
        isFixedTime: a.isFixedTime,
        category: a.category
      })),
      destination,
      mode,
      hotelCoords
    );

    res.json(metrics);
  } catch (error: any) {
    console.error('[API /route/day] Error:', error);
    res.status(500).json({
      error: 'Day route calculation failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// Optimize Single Day Waypoint Sequence
router.post('/optimize-day', async (req: Request, res: Response) => {
  try {
    const {
      dayNumber = 1,
      activities = [],
      destination,
      mode = 'driving',
      constraints = {},
      hotelCoords
    } = req.body as {
      dayNumber: number;
      activities: any[];
      destination: string;
      mode?: TravelMode;
      constraints?: RouteOptimizationConstraint;
      hotelCoords?: any;
    };

    if (!destination) {
      return res.status(400).json({ error: 'destination is required' });
    }

    const formattedActivities = activities.map((a: any) => ({
      id: a.id || `act-${Math.random()}`,
      name: a.activity || a.name || 'Activity',
      location: a.location,
      coords: a.coords,
      time: a.time,
      durationMinutes: a.durationMinutes,
      openingHours: a.openingHours,
      isFixedTime: a.isFixedTime,
      category: a.category
    }));

    const result = await optimizeDayRoute(
      dayNumber,
      formattedActivities,
      destination,
      mode,
      constraints,
      hotelCoords
    );

    res.json(result);
  } catch (error: any) {
    console.error('[API /route/optimize-day] Error:', error);
    res.status(500).json({
      error: 'Day route optimization failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// Full Trip Route Optimization & Before/After Comparison
router.post('/optimize-trip', async (req: Request, res: Response) => {
  try {
    const { tripContext, mode = 'driving', constraints = {} } = req.body;

    if (!tripContext || !tripContext.itinerary) {
      return res.status(400).json({ error: 'Valid tripContext with itinerary is required' });
    }

    const destination = tripContext.destination || 'Destination';

    // 1. Calculate Baseline Route
    const currentRoute = await calculateTripRouteMetrics({
      destination,
      itinerary: tripContext.itinerary.map((d: any) => ({
        dayNumber: d.dayNumber,
        activities: (d.activities || []).map((a: any) => ({
          id: a.id,
          name: a.activity || a.name,
          location: a.location,
          coords: a.coords,
          time: a.time,
          durationMinutes: a.durationMinutes,
          openingHours: a.openingHours,
          isFixedTime: a.isFixedTime,
          category: a.category
        }))
      })),
      hotels: tripContext.hotels,
      mode
    });

    // 2. Optimize Each Day
    const optimizedDays: any[] = [];
    let anyDayReordered = false;

    for (const day of tripContext.itinerary) {
      const dayActivities = (day.activities || []).map((a: any) => ({
        id: a.id,
        name: a.activity || a.name,
        location: a.location,
        coords: a.coords,
        time: a.time,
        durationMinutes: a.durationMinutes,
        openingHours: a.openingHours,
        isFixedTime: a.isFixedTime,
        category: a.category
      }));

      const optDayResult = await optimizeDayRoute(
        day.dayNumber,
        dayActivities,
        destination,
        mode,
        constraints
      );

      if (optDayResult.distanceSavedKm > 0) {
        anyDayReordered = true;
      }

      optimizedDays.push({
        ...day,
        activities: optDayResult.reorderedActivities.map(ra => {
          const original = (day.activities || []).find((a: any) => a.id === ra.id);
          return original || ra;
        })
      });
    }

    // 3. Calculate Optimized Route
    const optimizedRoute = await calculateTripRouteMetrics({
      destination,
      itinerary: optimizedDays.map(d => ({
        dayNumber: d.dayNumber,
        activities: d.activities.map((a: any) => ({
          id: a.id,
          name: a.activity || a.name,
          location: a.location,
          coords: a.coords,
          time: a.time,
          durationMinutes: a.durationMinutes,
          openingHours: a.openingHours,
          isFixedTime: a.isFixedTime,
          category: a.category
        }))
      })),
      hotels: tripContext.hotels,
      mode
    });

    // 4. Deterministic Comparison
    const comparison = compareTripRoutes(currentRoute, optimizedRoute);

    const limitations: string[] = [];
    if (currentRoute.availability === 'partial') {
      limitations.push('Partial coordinates were used for route calculation.');
    }

    const response: RouteIntelligenceResponse = {
      currentRoute,
      optimizedRoute,
      comparison,
      optimizationApplied: anyDayReordered,
      availability: currentRoute.availability,
      conflicts: optimizedRoute.days.flatMap(d => d.conflicts),
      limitations
    };

    res.json(response);
  } catch (error: any) {
    console.error('[API /route/optimize-trip] Error:', error);
    res.status(500).json({
      error: 'Trip route optimization failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// Geographic Clustering Endpoint
router.post('/cluster', (req: Request, res: Response) => {
  try {
    const { activities = [], destination, clusterRadiusKm = 7.0 } = req.body;
    if (!destination) {
      return res.status(400).json({ error: 'destination is required' });
    }

    const clusters = clusterActivitiesGeographically(
      activities.map((a: any) => ({
        id: a.id || `act-${Math.random()}`,
        name: a.activity || a.name || 'Activity',
        location: a.location,
        coords: a.coords
      })),
      destination,
      clusterRadiusKm
    );

    res.json({ clusters, destination });
  } catch (error: any) {
    console.error('[API /route/cluster] Error:', error);
    res.status(500).json({
      error: 'Clustering failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// Route Matrix Endpoint (Multi-stop origin/destination combinations)
router.post('/matrix', async (req: Request, res: Response) => {
  try {
    const { origins = [], destinations = [], mode = 'driving' } = req.body;
    if (!Array.isArray(origins) || !Array.isArray(destinations) || origins.length === 0 || destinations.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'INVALID_MATRIX_PARAMS', message: 'Valid non-empty origins and destinations arrays are required' }
      });
    }

    // Validate origins coordinates
    for (let i = 0; i < origins.length; i++) {
      const orig = origins[i];
      if (orig && typeof orig === 'object' && ('latitude' in orig || 'lat' in orig)) {
        const lat = orig.latitude ?? orig.lat;
        const lng = orig.longitude ?? orig.lng;
        const check = isValidCoordinate(lat, lng);
        if (!check.valid) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_COORDINATES', message: `Origin #${i + 1}: ${check.error}` }
          });
        }
      }
    }

    // Validate destinations coordinates
    for (let i = 0; i < destinations.length; i++) {
      const dest = destinations[i];
      if (dest && typeof dest === 'object' && ('latitude' in dest || 'lat' in dest)) {
        const lat = dest.latitude ?? dest.lat;
        const lng = dest.longitude ?? dest.lng;
        const check = isValidCoordinate(lat, lng);
        if (!check.valid) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_COORDINATES', message: `Destination #${i + 1}: ${check.error}` }
          });
        }
      }
    }

    const matrix = await calculateRouteMatrix(origins, destinations, mode);
    res.json(matrix);
  } catch (error: any) {
    console.error('[API /route/matrix] Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ROUTE_MATRIX_ERROR', message: error?.message || 'Route matrix calculation failed' }
    });
  }
});


export default router;

