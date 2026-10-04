/**
 * TRAVELIA ACTIVITY REPOSITORY
 * 
 * Handles CRUD and ordering operations for itinerary activities in SQLite.
 */

import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/connection';
import { ItineraryActivity } from '../../src/types';

export interface PersistedActivity extends ItineraryActivity {
  tripId: string;
  tripDayId: string;
  dayNumber: number;
  createdAt: string;
  updatedAt: string;
}

export class ActivityRepository {
  private customDb?: DatabaseSync;

  constructor(db?: DatabaseSync) {
    if (db) this.customDb = db;
  }

  private get db(): DatabaseSync {
    return this.customDb || getDatabase();
  }

  /**
   * Find all activities for a specific trip, ordered by day and sort order.
   */
  findByTripId(tripId: string): PersistedActivity[] {
    const stmt = this.db.prepare(`
      SELECT 
        a.id, a.trip_id as tripId, a.trip_day_id as tripDayId, td.day_number as dayNumber,
        a.time, a.activity, a.location, a.estimated_cost as estimatedCost,
        a.duration, a.duration_minutes as durationMinutes, a.latitude, a.longitude,
        a.ai_recommendation as aiRecommendation, a.category, a.image_url as imageUrl,
        a.sort_order as sortOrder, a.created_at as createdAt, a.updated_at as updatedAt
      FROM activities a
      JOIN trip_days td ON a.trip_day_id = td.id
      WHERE a.trip_id = ?
      ORDER BY td.day_number ASC, a.sort_order ASC, a.created_at ASC
    `);

    const rows = stmt.all(tripId) as any[];
    return rows.map(r => this.mapRowToActivity(r));
  }

  /**
   * Find a single activity by ID.
   */
  findById(activityId: string): PersistedActivity | null {
    const stmt = this.db.prepare(`
      SELECT 
        a.id, a.trip_id as tripId, a.trip_day_id as tripDayId, td.day_number as dayNumber,
        a.time, a.activity, a.location, a.estimated_cost as estimatedCost,
        a.duration, a.duration_minutes as durationMinutes, a.latitude, a.longitude,
        a.ai_recommendation as aiRecommendation, a.category, a.image_url as imageUrl,
        a.sort_order as sortOrder, a.created_at as createdAt, a.updated_at as updatedAt
      FROM activities a
      JOIN trip_days td ON a.trip_day_id = td.id
      WHERE a.id = ?
    `);

    const row = stmt.get(activityId) as any;
    if (!row) return null;
    return this.mapRowToActivity(row);
  }

  /**
   * Creates an activity for a given trip and day number.
   * If the trip_day does not exist, it is automatically created.
   */
  create(tripId: string, dayNumber: number, data: Partial<ItineraryActivity>): PersistedActivity {
    // 1. Ensure trip exists
    const tripCheck = this.db.prepare('SELECT id FROM trips WHERE id = ?').get(tripId);
    if (!tripCheck) {
      throw new Error(`Trip with ID '${tripId}' not found.`);
    }

    // 2. Find or create trip_day
    let dayRow = this.db.prepare(
      'SELECT id FROM trip_days WHERE trip_id = ? AND day_number = ?'
    ).get(tripId, dayNumber) as any;

    if (!dayRow) {
      const newDayId = `day-${tripId}-${dayNumber}`;
      this.db.prepare(`
        INSERT INTO trip_days (id, trip_id, day_number, title, theme, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(newDayId, tripId, dayNumber, `Day ${dayNumber} Itinerary`, 'Exploration');
      dayRow = { id: newDayId };
    }

    // 3. Determine next sort order
    const countRow = this.db.prepare(
      'SELECT COUNT(*) as count FROM activities WHERE trip_day_id = ?'
    ).get(dayRow.id) as any;
    const sortOrder = countRow ? countRow.count : 0;

    // 4. Stable ID
    const actId = data.id || `act-${tripId}-${dayNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    let lat: number | null = null;
    let lng: number | null = null;
    if (data.coords) {
      if (Array.isArray(data.coords)) {
        lat = data.coords[0];
        lng = data.coords[1];
      } else if (typeof data.coords === 'object') {
        lat = (data.coords as any).latitude ?? null;
        lng = (data.coords as any).longitude ?? null;
      }
    }

    this.db.prepare(`
      INSERT INTO activities (
        id, trip_day_id, trip_id, time, activity, location,
        estimated_cost, duration, duration_minutes, latitude, longitude,
        ai_recommendation, category, image_url, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      actId,
      dayRow.id,
      tripId,
      data.time || '10:00 AM',
      data.activity || 'Untitled Activity',
      data.location || 'Local Landmark',
      data.estimatedCost ?? 0,
      data.duration || '1 hr',
      data.durationMinutes ?? 60,
      lat,
      lng,
      data.aiRecommendation || 'Personalized AI suggestion',
      data.category || 'sightseeing',
      data.imageUrl || null,
      sortOrder
    );

    // Update trip updated_at timestamp
    this.db.prepare(`UPDATE trips SET updated_at = datetime('now') WHERE id = ?`).run(tripId);

    const created = this.findById(actId);
    if (!created) throw new Error('Failed to retrieve newly inserted activity');
    return created;
  }

  /**
   * Updates an existing activity.
   */
  update(tripId: string, activityId: string, updates: Partial<ItineraryActivity>): PersistedActivity | null {
    const existing = this.findById(activityId);
    if (!existing || existing.tripId !== tripId) return null;

    let lat = existing.coords ? (Array.isArray(existing.coords) ? existing.coords[0] : (existing.coords as any).latitude) : null;
    let lng = existing.coords ? (Array.isArray(existing.coords) ? existing.coords[1] : (existing.coords as any).longitude) : null;
    if (updates.coords) {
      if (Array.isArray(updates.coords)) {
        lat = updates.coords[0];
        lng = updates.coords[1];
      } else if (typeof updates.coords === 'object') {
        lat = (updates.coords as any).latitude ?? lat;
        lng = (updates.coords as any).longitude ?? lng;
      }
    }

    this.db.prepare(`
      UPDATE activities SET
        time = COALESCE(?, time),
        activity = COALESCE(?, activity),
        location = COALESCE(?, location),
        estimated_cost = COALESCE(?, estimated_cost),
        duration = COALESCE(?, duration),
        duration_minutes = COALESCE(?, duration_minutes),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        ai_recommendation = COALESCE(?, ai_recommendation),
        category = COALESCE(?, category),
        image_url = COALESCE(?, image_url),
        updated_at = datetime('now')
      WHERE id = ? AND trip_id = ?
    `).run(
      updates.time ?? null,
      updates.activity ?? null,
      updates.location ?? null,
      updates.estimatedCost ?? null,
      updates.duration ?? null,
      updates.durationMinutes ?? null,
      lat,
      lng,
      updates.aiRecommendation ?? null,
      updates.category ?? null,
      updates.imageUrl ?? null,
      activityId,
      tripId
    );

    this.db.prepare(`UPDATE trips SET updated_at = datetime('now') WHERE id = ?`).run(tripId);

    return this.findById(activityId);
  }

  /**
   * Deletes an activity from a trip.
   */
  delete(tripId: string, activityId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM activities WHERE id = ? AND trip_id = ?');
    const result = stmt.run(activityId, tripId);
    if (result.changes > 0) {
      this.db.prepare(`UPDATE trips SET updated_at = datetime('now') WHERE id = ?`).run(tripId);
      return true;
    }
    return false;
  }

  /**
   * Reorders activities within a given day.
   */
  reorder(tripId: string, dayNumber: number, activityIds: string[]): boolean {
    const dayRow = this.db.prepare(
      'SELECT id FROM trip_days WHERE trip_id = ? AND day_number = ?'
    ).get(tripId, dayNumber) as any;
    if (!dayRow) return false;

    for (let i = 0; i < activityIds.length; i++) {
      this.db.prepare(`
        UPDATE activities 
        SET sort_order = ?, updated_at = datetime('now')
        WHERE id = ? AND trip_day_id = ?
      `).run(i, activityIds[i], dayRow.id);
    }

    this.db.prepare(`UPDATE trips SET updated_at = datetime('now') WHERE id = ?`).run(tripId);
    return true;
  }

  private mapRowToActivity(r: any): PersistedActivity {
    return {
      id: r.id,
      tripId: r.tripId,
      tripDayId: r.tripDayId,
      dayNumber: r.dayNumber,
      time: r.time,
      activity: r.activity,
      location: r.location,
      estimatedCost: Number(r.estimatedCost || 0),
      duration: r.duration,
      durationMinutes: r.durationMinutes != null ? Number(r.durationMinutes) : undefined,
      coords: r.latitude != null && r.longitude != null ? [r.latitude, r.longitude] : undefined,
      aiRecommendation: r.aiRecommendation,
      category: r.category as any,
      imageUrl: r.imageUrl || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }
}

export const activityRepository = new ActivityRepository();
