/**
 * TRAVELIA OPTIMIZATION REPOSITORY
 * 
 * Persists AI Optimization results and What-If simulation records linked to trip IDs.
 * Enforces What-If immutability: simulations are recorded as separate analytical artifacts
 * without mutating the original trip data.
 */

import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/connection';

export interface PersistedOptimizationResult {
  id: string;
  tripId: string;
  summary: string;
  healthScoreBefore?: number;
  healthScoreAfter?: number;
  beforeDistanceKm?: number;
  afterDistanceKm?: number;
  distanceSavedKm?: number;
  beforeTravelMinutes?: number;
  afterTravelMinutes?: number;
  travelTimeSavedMinutes?: number;
  beforeCost?: number;
  afterCost?: number;
  costSaved?: number;
  beforeConflictCount?: number;
  afterConflictCount?: number;
  changesJson?: string;
  createdAt: string;
}

export class OptimizationRepository {
  private customDb?: DatabaseSync;

  constructor(db?: DatabaseSync) {
    if (db) this.customDb = db;
  }

  private get db(): DatabaseSync {
    return this.customDb || getDatabase();
  }

  findByTripId(tripId: string): PersistedOptimizationResult[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, trip_id as tripId, summary,
        health_score_before as healthScoreBefore, health_score_after as healthScoreAfter,
        before_distance_km as beforeDistanceKm, after_distance_km as afterDistanceKm,
        distance_saved_km as distanceSavedKm,
        before_travel_minutes as beforeTravelMinutes, after_travel_minutes as afterTravelMinutes,
        travel_time_saved_minutes as travelTimeSavedMinutes,
        before_cost as beforeCost, after_cost as afterCost, cost_saved as costSaved,
        before_conflict_count as beforeConflictCount, after_conflict_count as afterConflictCount,
        changes_json as changesJson, created_at as createdAt
      FROM optimization_results
      WHERE trip_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(tripId) as any[];
    return rows.map(r => ({
      ...r,
      healthScoreBefore: r.healthScoreBefore != null ? Number(r.healthScoreBefore) : undefined,
      healthScoreAfter: r.healthScoreAfter != null ? Number(r.healthScoreAfter) : undefined,
      beforeDistanceKm: r.beforeDistanceKm != null ? Number(r.beforeDistanceKm) : undefined,
      afterDistanceKm: r.afterDistanceKm != null ? Number(r.afterDistanceKm) : undefined,
      distanceSavedKm: r.distanceSavedKm != null ? Number(r.distanceSavedKm) : undefined,
      beforeTravelMinutes: r.beforeTravelMinutes != null ? Number(r.beforeTravelMinutes) : undefined,
      afterTravelMinutes: r.afterTravelMinutes != null ? Number(r.afterTravelMinutes) : undefined,
      travelTimeSavedMinutes: r.travelTimeSavedMinutes != null ? Number(r.travelTimeSavedMinutes) : undefined,
      beforeCost: r.beforeCost != null ? Number(r.beforeCost) : undefined,
      afterCost: r.afterCost != null ? Number(r.afterCost) : undefined,
      costSaved: r.costSaved != null ? Number(r.costSaved) : undefined,
      beforeConflictCount: r.beforeConflictCount != null ? Number(r.beforeConflictCount) : undefined,
      afterConflictCount: r.afterConflictCount != null ? Number(r.afterConflictCount) : undefined
    }));
  }

  create(tripId: string, result: Partial<PersistedOptimizationResult>): PersistedOptimizationResult {
    const id = result.id || `opt-${tripId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const changesJson = typeof (result as any).changes === 'object' 
      ? JSON.stringify((result as any).changes) 
      : result.changesJson || null;

    this.db.prepare(`
      INSERT INTO optimization_results (
        id, trip_id, summary, health_score_before, health_score_after,
        before_distance_km, after_distance_km, distance_saved_km,
        before_travel_minutes, after_travel_minutes, travel_time_saved_minutes,
        before_cost, after_cost, cost_saved,
        before_conflict_count, after_conflict_count, changes_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      tripId,
      result.summary || 'AI Itinerary Optimization',
      result.healthScoreBefore ?? null,
      result.healthScoreAfter ?? null,
      result.beforeDistanceKm ?? null,
      result.afterDistanceKm ?? null,
      result.distanceSavedKm ?? null,
      result.beforeTravelMinutes ?? null,
      result.afterTravelMinutes ?? null,
      result.travelTimeSavedMinutes ?? null,
      result.beforeCost ?? null,
      result.afterCost ?? null,
      result.costSaved ?? null,
      result.beforeConflictCount ?? null,
      result.afterConflictCount ?? null,
      changesJson
    );

    return {
      id,
      tripId,
      summary: result.summary || 'AI Itinerary Optimization',
      healthScoreBefore: result.healthScoreBefore,
      healthScoreAfter: result.healthScoreAfter,
      beforeDistanceKm: result.beforeDistanceKm,
      afterDistanceKm: result.afterDistanceKm,
      distanceSavedKm: result.distanceSavedKm,
      beforeTravelMinutes: result.beforeTravelMinutes,
      afterTravelMinutes: result.afterTravelMinutes,
      travelTimeSavedMinutes: result.travelTimeSavedMinutes,
      beforeCost: result.beforeCost,
      afterCost: result.afterCost,
      costSaved: result.costSaved,
      beforeConflictCount: result.beforeConflictCount,
      afterConflictCount: result.afterConflictCount,
      changesJson: changesJson || undefined,
      createdAt: new Date().toISOString()
    };
  }
}

export const optimizationRepository = new OptimizationRepository();
