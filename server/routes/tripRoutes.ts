/**
 * TRAVELIA TRIP API ROUTES
 * 
 * Implements REST endpoints for persistent trips, activities, expenses, and optimizations:
 * - POST   /api/trips
 * - GET    /api/trips
 * - GET    /api/trips/:id
 * - PUT    /api/trips/:id
 * - DELETE /api/trips/:id
 * - POST   /api/trips/:id/activities
 * - PUT    /api/trips/:id/activities/:activityId
 * - DELETE /api/trips/:id/activities/:activityId
 * - POST   /api/trips/:id/expenses
 * - GET    /api/trips/:id/expenses
 * - PUT    /api/trips/:id/expenses/:expenseId
 * - DELETE /api/trips/:id/expenses/:expenseId
 * - POST   /api/trips/:id/optimizations
 * - GET    /api/trips/:id/optimizations
 * - POST   /api/trips/seed-demo
 */

import { Router, Request, Response } from 'express';
import { tripRepository } from '../repositories/tripRepository';
import { activityRepository } from '../repositories/activityRepository';
import { expenseRepository } from '../repositories/expenseRepository';
import { groupRepository } from '../repositories/groupRepository';
import { optimizationRepository } from '../repositories/optimizationRepository';
import { validateTripOwnership } from '../middleware/validation';

export const tripRouter = Router();


// ID validation helper
function isValidId(id: any): boolean {
  return typeof id === 'string' && id.trim().length > 0 && id.length <= 128 && !/[<>'"`\\]/.test(id);
}

// ----------------------------------------------------
// 1. TRIPS ENDPOINTS
// ----------------------------------------------------

/**
 * GET /api/trips
 * Lists all persisted trips. Query param `includeDemo=true` controls whether demo trips are returned.
 */
tripRouter.get('/', (req: Request, res: Response) => {
  try {
    const includeDemo = req.query.includeDemo !== 'false';
    const trips = tripRepository.findAll();
    
    // Explicitly flag demo vs user trips
    const formatted = trips.map(t => ({
      ...t,
      isDemo: t.isDemo || t.id.startsWith('trip-goa-') || t.id.startsWith('trip-kerala-'),
      dataSource: (t.isDemo || t.id.startsWith('trip-goa-') || t.id.startsWith('trip-kerala-')) ? 'DEMO DATA' : 'PERSISTED'
    }));

    res.json({
      success: true,
      count: formatted.length,
      trips: formatted
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to list trips' }
    });
  }
});

/**
 * POST /api/trips
 * Creates a new trip. Validates destination, days, budget.
 */
tripRouter.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Request body must be a valid JSON object' }
      });
    }

    if (!body.destination || typeof body.destination !== 'string' || body.destination.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DESTINATION', message: 'Trip destination is required and cannot be empty' }
      });
    }

    if (body.days !== undefined && (typeof body.days !== 'number' || body.days <= 0 || !Number.isInteger(body.days))) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DAYS', message: 'Days must be a positive integer greater than 0' }
      });
    }

    if (body.budget) {
      for (const [k, v] of Object.entries(body.budget)) {
        if (typeof v === 'number' && v < 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_BUDGET', message: `Budget category '${k}' cannot be negative` }
          });
        }
      }
    }

    // Check for ID collision if client provided an ID
    if (body.id) {
      if (!isValidId(body.id)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Trip ID contains invalid characters' }
        });
      }
      const existing = tripRepository.findById(body.id);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { code: 'TRIP_ALREADY_EXISTS', message: `Trip with ID '${body.id}' already exists.` }
        });
      }
    }

    const created = tripRepository.create(body);

    res.status(201).json({
      success: true,
      trip: {
        ...created,
        dataSource: created.isDemo ? 'DEMO DATA' : 'PERSISTED'
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to create trip' }
    });
  }
});

/**
 * GET /api/trips/:id
 * Retrieves a single trip with its full itinerary, expenses, and members.
 */
tripRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip ID format' }
      });
    }

    const trip = tripRepository.findById(id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Trip '${id}' was not found` }
      });
    }

    const expenses = expenseRepository.findByTripId(id);
    const members = groupRepository.findByTripId(id);
    const optimizations = optimizationRepository.findByTripId(id);

    res.json({
      success: true,
      trip: {
        ...trip,
        isDemo: trip.isDemo || trip.id.startsWith('trip-goa-') || trip.id.startsWith('trip-kerala-'),
        dataSource: (trip.isDemo || trip.id.startsWith('trip-goa-') || trip.id.startsWith('trip-kerala-')) ? 'DEMO DATA' : 'PERSISTED',
        expenses,
        members,
        optimizations
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to retrieve trip' }
    });
  }
});

/**
 * PUT /api/trips/:id
 * Updates trip metadata, preferences, budget, or entire itinerary.
 */
tripRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip ID format' }
      });
    }

    const existing = tripRepository.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Trip '${id}' was not found` }
      });
    }

    // Check ownership authorization where user context is provided
    const ownership = validateTripOwnership(id, req);
    if (!ownership.authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: ownership.reason || 'Forbidden' }
      });
    }

    const body = req.body;
    if (body.days !== undefined && (typeof body.days !== 'number' || body.days <= 0 || !Number.isInteger(body.days))) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DAYS', message: 'Days must be a positive integer' }
      });
    }

    const updated = tripRepository.update(id, body);

    res.json({
      success: true,
      trip: {
        ...updated,
        dataSource: updated?.isDemo ? 'DEMO DATA' : 'PERSISTED'
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to update trip' }
    });
  }
});

/**
 * DELETE /api/trips/:id
 * Deletes a trip and cascades to all child records.
 */
tripRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip ID format' }
      });
    }

    const existing = tripRepository.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Trip '${id}' was not found` }
      });
    }

    // Check ownership authorization where user context is provided
    const ownership = validateTripOwnership(id, req);
    if (!ownership.authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: ownership.reason || 'Forbidden' }
      });
    }

    const deleted = tripRepository.delete(id);

    res.json({
      success: deleted,
      message: `Trip '${id}' deleted successfully.`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to delete trip' }
    });
  }
});

// ----------------------------------------------------
// 2. ACTIVITIES ENDPOINTS
// ----------------------------------------------------

/**
 * POST /api/trips/:id/activities
 * Adds a new activity to a specific day of the trip.
 */
tripRouter.post('/:id/activities', (req: Request, res: Response) => {
  try {
    const { id: tripId } = req.params;
    if (!isValidId(tripId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip ID format' }
      });
    }

    const trip = tripRepository.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Trip '${tripId}' was not found` }
      });
    }

    const body = req.body;
    const dayNumber = Number(body.dayNumber || 1);
    if (dayNumber <= 0 || !Number.isInteger(dayNumber)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DAY_NUMBER', message: 'dayNumber must be a positive integer' }
      });
    }

    const activityName = body.activity || body.title;
    if (!activityName || typeof activityName !== 'string' || activityName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ACTIVITY_NAME', message: 'Activity name or title is required' }
      });
    }

    const cost = body.estimatedCost != null ? Number(body.estimatedCost) : 0;
    if (isNaN(cost) || cost < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COST', message: 'estimatedCost cannot be negative' }
      });
    }

    const created = activityRepository.create(tripId, dayNumber, {
      ...body,
      activity: activityName,
      estimatedCost: cost
    });

    res.status(201).json({
      success: true,
      activity: created
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to add activity' }
    });
  }
});

/**
 * PUT /api/trips/:id/activities/:activityId
 * Updates an activity in a trip.
 */
tripRouter.put('/:id/activities/:activityId', (req: Request, res: Response) => {
  try {
    const { id: tripId, activityId } = req.params;
    if (!isValidId(tripId) || !isValidId(activityId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip or activity ID format' }
      });
    }

    const existing = activityRepository.findById(activityId);
    if (!existing || existing.tripId !== tripId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Activity '${activityId}' not found for trip '${tripId}'` }
      });
    }

    const body = req.body;
    if (body.estimatedCost !== undefined) {
      const cost = Number(body.estimatedCost);
      if (isNaN(cost) || cost < 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_COST', message: 'estimatedCost cannot be negative' }
        });
      }
    }

    const updated = activityRepository.update(tripId, activityId, body);

    res.json({
      success: true,
      activity: updated
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to update activity' }
    });
  }
});

/**
 * DELETE /api/trips/:id/activities/:activityId
 * Deletes an activity from a trip.
 */
tripRouter.delete('/:id/activities/:activityId', (req: Request, res: Response) => {
  try {
    const { id: tripId, activityId } = req.params;
    if (!isValidId(tripId) || !isValidId(activityId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip or activity ID format' }
      });
    }

    const existing = activityRepository.findById(activityId);
    if (!existing || existing.tripId !== tripId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Activity '${activityId}' not found for trip '${tripId}'` }
      });
    }

    const deleted = activityRepository.delete(tripId, activityId);
    res.json({
      success: deleted,
      message: `Activity '${activityId}' removed from trip.`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to delete activity' }
    });
  }
});

// ----------------------------------------------------
// 3. EXPENSES ENDPOINTS
// ----------------------------------------------------

/**
 * GET /api/trips/:id/expenses
 * Lists all expenses recorded for a trip.
 */
tripRouter.get('/:id/expenses', (req: Request, res: Response) => {
  try {
    const { id: tripId } = req.params;
    if (!isValidId(tripId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip ID format' }
      });
    }

    const trip = tripRepository.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Trip '${tripId}' was not found` }
      });
    }

    const expenses = expenseRepository.findByTripId(tripId);
    res.json({
      success: true,
      count: expenses.length,
      expenses
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to list expenses' }
    });
  }
});

/**
 * POST /api/trips/:id/expenses
 * Adds an expense to a trip and updates budget spent.
 */
tripRouter.post('/:id/expenses', (req: Request, res: Response) => {
  try {
    const { id: tripId } = req.params;
    if (!isValidId(tripId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip ID format' }
      });
    }

    const trip = tripRepository.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Trip '${tripId}' was not found` }
      });
    }

    const body = req.body;
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TITLE', message: 'Expense title is required' }
      });
    }

    const amount = Number(body.totalAmount ?? body.amount ?? 0);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Expense amount cannot be negative' }
      });
    }

    const created = expenseRepository.create(tripId, {
      ...body,
      totalAmount: amount
    });

    res.status(201).json({
      success: true,
      expense: created
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to record expense' }
    });
  }
});

/**
 * PUT /api/trips/:id/expenses/:expenseId
 * Updates an existing expense.
 */
tripRouter.put('/:id/expenses/:expenseId', (req: Request, res: Response) => {
  try {
    const { id: tripId, expenseId } = req.params;
    if (!isValidId(tripId) || !isValidId(expenseId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip or expense ID format' }
      });
    }

    const existing = expenseRepository.findById(expenseId);
    if (!existing || existing.tripId !== tripId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Expense '${expenseId}' not found for trip '${tripId}'` }
      });
    }

    const body = req.body;
    if (body.totalAmount !== undefined || body.amount !== undefined) {
      const amount = Number(body.totalAmount ?? body.amount);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Expense amount cannot be negative' }
        });
      }
    }

    const updated = expenseRepository.update(tripId, expenseId, body);

    res.json({
      success: true,
      expense: updated
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to update expense' }
    });
  }
});

/**
 * DELETE /api/trips/:id/expenses/:expenseId
 * Deletes an expense from a trip.
 */
tripRouter.delete('/:id/expenses/:expenseId', (req: Request, res: Response) => {
  try {
    const { id: tripId, expenseId } = req.params;
    if (!isValidId(tripId) || !isValidId(expenseId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip or expense ID format' }
      });
    }

    const existing = expenseRepository.findById(expenseId);
    if (!existing || existing.tripId !== tripId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Expense '${expenseId}' not found for trip '${tripId}'` }
      });
    }

    const deleted = expenseRepository.delete(tripId, expenseId);
    res.json({
      success: deleted,
      message: `Expense '${expenseId}' removed.`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to delete expense' }
    });
  }
});

// ----------------------------------------------------
// 4. OPTIMIZATIONS & WHAT-IF IMMUTABILITY
// ----------------------------------------------------

/**
 * POST /api/trips/:id/optimizations
 * Records an optimization analysis without mutating original trip records.
 */
tripRouter.post('/:id/optimizations', (req: Request, res: Response) => {
  try {
    const { id: tripId } = req.params;
    if (!isValidId(tripId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip ID format' }
      });
    }

    const trip = tripRepository.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Trip '${tripId}' was not found` }
      });
    }

    const body = req.body;
    const recorded = optimizationRepository.create(tripId, body);

    res.status(201).json({
      success: true,
      optimization: recorded
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to record optimization' }
    });
  }
});

/**
 * GET /api/trips/:id/optimizations
 * Lists all optimization runs and What-If results for a trip.
 */
tripRouter.get('/:id/optimizations', (req: Request, res: Response) => {
  try {
    const { id: tripId } = req.params;
    if (!isValidId(tripId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid trip ID format' }
      });
    }

    const results = optimizationRepository.findByTripId(tripId);
    res.json({
      success: true,
      count: results.length,
      optimizations: results
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to list optimizations' }
    });
  }
});

// ----------------------------------------------------
// 5. DEMO MIGRATION & SEEDING HELPER
// ----------------------------------------------------

/**
 * POST /api/trips/seed-demo
 * Seeds demo trips into database if requested, marked explicitly as isDemo = 1.
 */
tripRouter.post('/seed-demo', (req: Request, res: Response) => {
  try {
    const { demoTrips } = req.body;
    if (!Array.isArray(demoTrips)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'demoTrips must be an array of TripPlan objects' }
      });
    }

    const seeded = [];
    for (const dt of demoTrips) {
      const s = tripRepository.seedDemoTrip(dt);
      seeded.push(s);
    }

    res.json({
      success: true,
      message: `Seeded ${seeded.length} demo trips marked as DEMO DATA.`,
      trips: seeded
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: err.message || 'Failed to seed demo trips' }
    });
  }
});

export default tripRouter;
