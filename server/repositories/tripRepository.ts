/**
 * TRAVELIA TRIP REPOSITORY
 * 
 * Manages full trip persistence, relational joins, and atomic transactions.
 * Assembles relational trip_days and activities into the standard TripPlan domain model.
 */

import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/connection';
import { runMigrations } from '../db/migrations';
import { TripPlan, ItineraryDay, ItineraryActivity, Hotel, TouristPlace, Restaurant, BudgetBreakdown } from '../../src/types';

export interface TripEntity extends TripPlan {
  isDemo: boolean;
  updatedAt: string;
  userId?: string;
}

export class TripRepository {
  private customDb?: DatabaseSync;

  constructor(db?: DatabaseSync) {
    if (db) this.customDb = db;
    // Ensure migrations are executed
    runMigrations(this.db);
  }

  private get db(): DatabaseSync {
    return this.customDb || getDatabase();
  }

  /**
   * Count total trips in database.
   */
  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM trips').get() as any;
    return row ? row.count : 0;
  }

  /**
   * Lists all trips, optionally filtering by demo status or trip status.
   */
  findAll(filter?: { isDemo?: boolean; status?: string }): TripEntity[] {
    let sql = 'SELECT * FROM trips WHERE 1=1';
    const params: any[] = [];

    if (filter?.isDemo !== undefined) {
      sql += ' AND is_demo = ?';
      params.push(filter.isDemo ? 1 : 0);
    }

    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY updated_at DESC, created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.assembleTrip(r));
  }

  /**
   * Finds a single trip by ID with full itinerary, days, and activities.
   */
  findById(id: string): TripEntity | null {
    const row = this.db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.assembleTrip(row);
  }

  /**
   * Creates a new trip atomically.
   */
  create(data: Partial<TripPlan> & { id?: string; userId?: string; isDemo?: boolean }): TripEntity {
    const tripId = data.id || `trip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const preferencesJson = JSON.stringify(data.preferences || []);
    const aiNotesJson = JSON.stringify(data.aiNotes || []);
    const hotelsJson = JSON.stringify(data.hotels || []);
    const touristPlacesJson = JSON.stringify(data.touristPlaces || []);
    const restaurantsJson = JSON.stringify(data.restaurants || []);

    const budget = data.budget || {
      hotel: 0,
      food: 0,
      transportation: 0,
      activities: 0,
      miscellaneous: 0,
      total: 0
    };

    const isDemoVal = data.isDemo ? 1 : 0;

    // Check if ID already exists
    const existing = this.db.prepare('SELECT id FROM trips WHERE id = ?').get(tripId);
    if (existing) {
      throw new Error(`Trip with ID '${tripId}' already exists.`);
    }

    // Insert trips record
    this.db.prepare(`
      INSERT INTO trips (
        id, user_id, destination, country, tagline, hero_image,
        days, nights, travelers, travel_dates, start_date, end_date,
        status, hotel_category, transport_type, food_preference, activity_level,
        budget_total, budget_spent, budget_hotel, budget_flights, budget_food,
        budget_transportation, budget_activities, budget_miscellaneous, currency,
        preferences_json, ai_notes_json, hotels_json, tourist_places_json, restaurants_json,
        is_demo, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, datetime('now'), datetime('now')
      )
    `).run(
      tripId,
      data.userId || null,
      data.destination || 'New Destination',
      data.country || 'Country',
      data.tagline || '',
      data.heroImage || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1200&auto=format&fit=crop',
      data.days || 1,
      data.nights || Math.max(0, (data.days || 1) - 1),
      data.travelers || 1,
      data.travelDates || '',
      data.startDate || null,
      data.endDate || null,
      data.status || 'planning',
      data.hotelCategory || 'mid',
      data.transportType || 'cab',
      data.foodPreference || 'casual',
      data.activityLevel || 'moderate',
      budget.total || 0,
      0,
      budget.hotel || 0,
      budget.flights || 0,
      budget.food || 0,
      budget.transportation || 0,
      budget.activities || 0,
      budget.miscellaneous || 0,
      'INR',
      preferencesJson,
      aiNotesJson,
      hotelsJson,
      touristPlacesJson,
      restaurantsJson,
      isDemoVal
    );

    // Insert itinerary days and activities if provided
    if (data.itinerary && Array.isArray(data.itinerary)) {
      for (const day of data.itinerary) {
        const dayId = `day-${tripId}-${day.dayNumber}`;
        this.db.prepare(`
          INSERT INTO trip_days (id, trip_id, day_number, title, theme, date, formatted_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          dayId,
          tripId,
          day.dayNumber,
          day.title || `Day ${day.dayNumber}`,
          day.theme || '',
          day.date || null,
          day.formattedDate || null
        );

        if (day.activities && Array.isArray(day.activities)) {
          for (let i = 0; i < day.activities.length; i++) {
            const act = day.activities[i];
            const actId = act.id || `act-${dayId}-${i + 1}`;
            
            let lat: number | null = null;
            let lng: number | null = null;
            if (act.coords) {
              if (Array.isArray(act.coords)) {
                lat = act.coords[0];
                lng = act.coords[1];
              } else if (typeof act.coords === 'object') {
                lat = (act.coords as any).latitude ?? null;
                lng = (act.coords as any).longitude ?? null;
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
              dayId,
              tripId,
              act.time || '10:00 AM',
              act.activity || 'Activity',
              act.location || 'Location',
              act.estimatedCost ?? 0,
              act.duration || '1 hr',
              act.durationMinutes ?? 60,
              lat,
              lng,
              act.aiRecommendation || '',
              act.category || 'sightseeing',
              act.imageUrl || null,
              i
            );
          }
        }
      }
    }

    const created = this.findById(tripId);
    if (!created) throw new Error('Failed to retrieve newly inserted trip');
    return created;
  }

  /**
   * Updates an existing trip's metadata and optionally its itinerary.
   */
  update(id: string, updates: Partial<TripPlan> & { isDemo?: boolean }): TripEntity | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const budget = updates.budget || existing.budget;
    const preferencesJson = updates.preferences ? JSON.stringify(updates.preferences) : undefined;
    const aiNotesJson = updates.aiNotes ? JSON.stringify(updates.aiNotes) : undefined;
    const hotelsJson = updates.hotels ? JSON.stringify(updates.hotels) : undefined;
    const touristPlacesJson = updates.touristPlaces ? JSON.stringify(updates.touristPlaces) : undefined;
    const restaurantsJson = updates.restaurants ? JSON.stringify(updates.restaurants) : undefined;
    const isDemoVal = updates.isDemo !== undefined ? (updates.isDemo ? 1 : 0) : undefined;

    this.db.prepare(`
      UPDATE trips SET
        destination = COALESCE(?, destination),
        country = COALESCE(?, country),
        tagline = COALESCE(?, tagline),
        hero_image = COALESCE(?, hero_image),
        days = COALESCE(?, days),
        nights = COALESCE(?, nights),
        travelers = COALESCE(?, travelers),
        travel_dates = COALESCE(?, travel_dates),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        status = COALESCE(?, status),
        hotel_category = COALESCE(?, hotel_category),
        transport_type = COALESCE(?, transport_type),
        food_preference = COALESCE(?, food_preference),
        activity_level = COALESCE(?, activity_level),
        budget_total = COALESCE(?, budget_total),
        budget_hotel = COALESCE(?, budget_hotel),
        budget_flights = COALESCE(?, budget_flights),
        budget_food = COALESCE(?, budget_food),
        budget_transportation = COALESCE(?, budget_transportation),
        budget_activities = COALESCE(?, budget_activities),
        budget_miscellaneous = COALESCE(?, budget_miscellaneous),
        preferences_json = COALESCE(?, preferences_json),
        ai_notes_json = COALESCE(?, ai_notes_json),
        hotels_json = COALESCE(?, hotels_json),
        tourist_places_json = COALESCE(?, tourist_places_json),
        restaurants_json = COALESCE(?, restaurants_json),
        is_demo = COALESCE(?, is_demo),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updates.destination ?? null,
      updates.country ?? null,
      updates.tagline ?? null,
      updates.heroImage ?? null,
      updates.days ?? null,
      updates.nights ?? null,
      updates.travelers ?? null,
      updates.travelDates ?? null,
      updates.startDate ?? null,
      updates.endDate ?? null,
      updates.status ?? null,
      updates.hotelCategory ?? null,
      updates.transportType ?? null,
      updates.foodPreference ?? null,
      updates.activityLevel ?? null,
      budget.total ?? null,
      budget.hotel ?? null,
      budget.flights ?? null,
      budget.food ?? null,
      budget.transportation ?? null,
      budget.activities ?? null,
      budget.miscellaneous ?? null,
      preferencesJson ?? null,
      aiNotesJson ?? null,
      hotelsJson ?? null,
      touristPlacesJson ?? null,
      restaurantsJson ?? null,
      isDemoVal ?? null,
      id
    );

    // If an updated itinerary is provided, sync days and activities
    if (updates.itinerary && Array.isArray(updates.itinerary)) {
      // Delete existing days (cascade will delete activities)
      this.db.prepare('DELETE FROM trip_days WHERE trip_id = ?').run(id);

      for (const day of updates.itinerary) {
        const dayId = `day-${id}-${day.dayNumber}`;
        this.db.prepare(`
          INSERT INTO trip_days (id, trip_id, day_number, title, theme, date, formatted_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          dayId,
          id,
          day.dayNumber,
          day.title || `Day ${day.dayNumber}`,
          day.theme || '',
          day.date || null,
          day.formattedDate || null
        );

        if (day.activities && Array.isArray(day.activities)) {
          for (let i = 0; i < day.activities.length; i++) {
            const act = day.activities[i];
            const actId = act.id || `act-${dayId}-${i + 1}`;

            let lat: number | null = null;
            let lng: number | null = null;
            if (act.coords) {
              if (Array.isArray(act.coords)) {
                lat = act.coords[0];
                lng = act.coords[1];
              } else if (typeof act.coords === 'object') {
                lat = (act.coords as any).latitude ?? null;
                lng = (act.coords as any).longitude ?? null;
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
              dayId,
              id,
              act.time || '10:00 AM',
              act.activity || 'Activity',
              act.location || 'Location',
              act.estimatedCost ?? 0,
              act.duration || '1 hr',
              act.durationMinutes ?? 60,
              lat,
              lng,
              act.aiRecommendation || '',
              act.category || 'sightseeing',
              act.imageUrl || null,
              i
            );
          }
        }
      }
    }

    return this.findById(id);
  }

  /**
   * Deletes a trip and cascades to all child records.
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM trips WHERE id = ?');
    return stmt.run(id).changes > 0;
  }

  /**
   * Seeds a demo trip into the database marked with is_demo = 1.
   * If already present, skips or updates without error.
   */
  seedDemoTrip(demoTrip: TripPlan): TripEntity {
    const existing = this.findById(demoTrip.id);
    if (existing) {
      return existing;
    }
    return this.create({
      ...demoTrip,
      isDemo: true
    });
  }

  /**
   * Helper: Assembles a raw SQLite row into a clean, typed TripEntity.
   */
  private assembleTrip(row: any): TripEntity {
    // 1. Fetch days
    const dayRows = this.db.prepare(`
      SELECT id, day_number as dayNumber, title, theme, date, formatted_date as formattedDate
      FROM trip_days
      WHERE trip_id = ?
      ORDER BY day_number ASC
    `).all(row.id) as any[];

    // 2. Fetch activities
    const actRows = this.db.prepare(`
      SELECT 
        id, trip_day_id as tripDayId, time, activity, location,
        estimated_cost as estimatedCost, duration, duration_minutes as durationMinutes,
        latitude, longitude, ai_recommendation as aiRecommendation,
        category, image_url as imageUrl, sort_order as sortOrder
      FROM activities
      WHERE trip_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `).all(row.id) as any[];

    // Map activities by day
    const actByDay = new Map<string, ItineraryActivity[]>();
    for (const a of actRows) {
      const list = actByDay.get(a.tripDayId) || [];
      list.push({
        id: a.id,
        time: a.time,
        activity: a.activity,
        location: a.location,
        estimatedCost: Number(a.estimatedCost || 0),
        duration: a.duration,
        durationMinutes: a.durationMinutes != null ? Number(a.durationMinutes) : undefined,
        coords: a.latitude != null && a.longitude != null ? [a.latitude, a.longitude] : undefined,
        aiRecommendation: a.aiRecommendation,
        category: a.category as any,
        imageUrl: a.imageUrl || undefined
      });
      actByDay.set(a.tripDayId, list);
    }

    const itinerary: ItineraryDay[] = dayRows.map(d => ({
      dayNumber: d.dayNumber,
      title: d.title,
      theme: d.theme || '',
      date: d.date || undefined,
      formattedDate: d.formattedDate || undefined,
      activities: actByDay.get(d.id) || []
    }));

    // Parse JSON fields safely
    let preferences: any[] = [];
    try { preferences = row.preferences_json ? JSON.parse(row.preferences_json) : []; } catch {}

    let aiNotes: string[] = [];
    try { aiNotes = row.ai_notes_json ? JSON.parse(row.ai_notes_json) : []; } catch {}

    let hotels: Hotel[] = [];
    try { hotels = row.hotels_json ? JSON.parse(row.hotels_json) : []; } catch {}

    let touristPlaces: TouristPlace[] = [];
    try { touristPlaces = row.tourist_places_json ? JSON.parse(row.tourist_places_json) : []; } catch {}

    let restaurants: Restaurant[] = [];
    try { restaurants = row.restaurants_json ? JSON.parse(row.restaurants_json) : []; } catch {}

    const budget: BudgetBreakdown = {
      hotel: Number(row.budget_hotel || 0),
      flights: Number(row.budget_flights || 0),
      food: Number(row.budget_food || 0),
      transportation: Number(row.budget_transportation || 0),
      activities: Number(row.budget_activities || 0),
      miscellaneous: Number(row.budget_miscellaneous || 0),
      total: Number(row.budget_total || 0)
    };

    return {
      id: row.id,
      destination: row.destination,
      country: row.country || '',
      tagline: row.tagline || '',
      heroImage: row.hero_image,
      days: Number(row.days || 1),
      nights: Number(row.nights || 0),
      travelers: Number(row.travelers || 1),
      travelDates: row.travel_dates || '',
      startDate: row.start_date || undefined,
      endDate: row.end_date || undefined,
      preferences,
      itinerary,
      hotels,
      touristPlaces,
      restaurants,
      budget,
      aiNotes,
      status: row.status as any,
      userId: row.user_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      hotelCategory: row.hotel_category as any,
      transportType: row.transport_type as any,
      foodPreference: row.food_preference as any,
      activityLevel: row.activity_level as any,
      isDemo: Boolean(row.is_demo)
    };
  }
}

export const tripRepository = new TripRepository();
