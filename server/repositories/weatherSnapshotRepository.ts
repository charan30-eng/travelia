/**
 * TRAVELIA WEATHER SNAPSHOT REPOSITORY
 * 
 * Persists authentic weather snapshots associated with trip dates in SQLite.
 */

import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/connection';

export interface PersistedWeatherSnapshot {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string;
  condition: string;
  tempMaxC: number;
  tempMinC: number;
  rainChancePercent: number;
  source: string;
  status: string;
  recordedAt: string;
}

export class WeatherSnapshotRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  findByTripId(tripId: string): PersistedWeatherSnapshot[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, trip_id as tripId, day_number as dayNumber, date, condition,
        temp_max_c as tempMaxC, temp_min_c as tempMinC, rain_chance_percent as rainChancePercent,
        source, status, recorded_at as recordedAt
      FROM weather_snapshots
      WHERE trip_id = ?
      ORDER BY day_number ASC
    `);

    const rows = stmt.all(tripId) as any[];
    return rows.map(r => ({
      ...r,
      tempMaxC: Number(r.tempMaxC),
      tempMinC: Number(r.tempMinC),
      rainChancePercent: Number(r.rainChancePercent)
    }));
  }

  saveSnapshot(tripId: string, snapshot: Partial<PersistedWeatherSnapshot>): PersistedWeatherSnapshot {
    const id = snapshot.id || `weather-${tripId}-${snapshot.dayNumber || 1}-${Date.now()}`;
    
    this.db.prepare(`
      INSERT OR REPLACE INTO weather_snapshots (
        id, trip_id, day_number, date, condition,
        temp_max_c, temp_min_c, rain_chance_percent,
        source, status, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      tripId,
      snapshot.dayNumber || 1,
      snapshot.date || new Date().toISOString().split('T')[0],
      snapshot.condition || 'Clear',
      snapshot.tempMaxC ?? 28,
      snapshot.tempMinC ?? 20,
      snapshot.rainChancePercent ?? 0,
      snapshot.source || 'open-meteo',
      snapshot.status || 'live'
    );

    return {
      id,
      tripId,
      dayNumber: snapshot.dayNumber || 1,
      date: snapshot.date || new Date().toISOString().split('T')[0],
      condition: snapshot.condition || 'Clear',
      tempMaxC: snapshot.tempMaxC ?? 28,
      tempMinC: snapshot.tempMinC ?? 20,
      rainChancePercent: snapshot.rainChancePercent ?? 0,
      source: snapshot.source || 'open-meteo',
      status: snapshot.status || 'live',
      recordedAt: new Date().toISOString()
    };
  }
}

export const weatherSnapshotRepository = new WeatherSnapshotRepository();
