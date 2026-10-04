/**
 * TRAVELIA EXPENSE REPOSITORY
 * 
 * Handles database operations for trip expenses and group expense splitting in SQLite.
 */

import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/connection';
import { GroupExpense } from '../../src/types';

export interface PersistedExpense extends GroupExpense {
  tripId: string;
  currency: string;
  activityId?: string;
  createdAt: string;
  updatedAt: string;
}

export class ExpenseRepository {
  private customDb?: DatabaseSync;

  constructor(db?: DatabaseSync) {
    if (db) this.customDb = db;
  }

  private get db(): DatabaseSync {
    return this.customDb || getDatabase();
  }

  /**
   * List all expenses for a trip.
   */
  findByTripId(tripId: string): PersistedExpense[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, trip_id as tripId, title, category, amount, currency,
        paid_by as paidByMemberId, paid_by_name as paidByMemberName,
        split_between_json as splitBetweenJson, date, activity_id as activityId,
        note, created_at as createdAt, updated_at as updatedAt
      FROM expenses
      WHERE trip_id = ?
      ORDER BY date DESC, created_at DESC
    `);

    const rows = stmt.all(tripId) as any[];
    return rows.map(r => this.mapRowToExpense(r));
  }

  /**
   * Find a single expense by ID.
   */
  findById(expenseId: string): PersistedExpense | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, trip_id as tripId, title, category, amount, currency,
        paid_by as paidByMemberId, paid_by_name as paidByMemberName,
        split_between_json as splitBetweenJson, date, activity_id as activityId,
        note, created_at as createdAt, updated_at as updatedAt
      FROM expenses
      WHERE id = ?
    `);

    const row = stmt.get(expenseId) as any;
    if (!row) return null;
    return this.mapRowToExpense(row);
  }

  /**
   * Creates an expense for a trip.
   */
  create(tripId: string, data: Partial<PersistedExpense>): PersistedExpense {
    const tripCheck = this.db.prepare('SELECT id FROM trips WHERE id = ?').get(tripId);
    if (!tripCheck) {
      throw new Error(`Trip with ID '${tripId}' not found.`);
    }

    const expId = data.id || `exp-${tripId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const splitJson = JSON.stringify(data.splitAmongIds || []);
    const amount = Number(data.totalAmount ?? (data as any).amount ?? 0);
    const dateStr = data.date || new Date().toISOString().split('T')[0];

    this.db.prepare(`
      INSERT INTO expenses (
        id, trip_id, title, category, amount, currency,
        paid_by, paid_by_name, split_between_json, date,
        activity_id, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      expId,
      tripId,
      data.title || 'Untitled Expense',
      data.category || 'misc',
      amount,
      data.currency || 'INR',
      data.paidByMemberId || 'current_user',
      data.paidByMemberName || 'Current Traveler',
      splitJson,
      dateStr,
      data.activityId || null,
      data.note || null
    );

    // Update trip total spent
    this.recalculateTripSpent(tripId);

    const created = this.findById(expId);
    if (!created) throw new Error('Failed to create expense');
    return created;
  }

  /**
   * Updates an existing expense.
   */
  update(tripId: string, expenseId: string, updates: Partial<PersistedExpense>): PersistedExpense | null {
    const existing = this.findById(expenseId);
    if (!existing || existing.tripId !== tripId) return null;

    const amount = updates.totalAmount != null ? Number(updates.totalAmount) : (updates as any).amount != null ? Number((updates as any).amount) : null;
    const splitJson = updates.splitAmongIds ? JSON.stringify(updates.splitAmongIds) : null;

    this.db.prepare(`
      UPDATE expenses SET
        title = COALESCE(?, title),
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        currency = COALESCE(?, currency),
        paid_by = COALESCE(?, paid_by),
        paid_by_name = COALESCE(?, paid_by_name),
        split_between_json = COALESCE(?, split_between_json),
        date = COALESCE(?, date),
        activity_id = COALESCE(?, activity_id),
        note = COALESCE(?, note),
        updated_at = datetime('now')
      WHERE id = ? AND trip_id = ?
    `).run(
      updates.title ?? null,
      updates.category ?? null,
      amount,
      updates.currency ?? null,
      updates.paidByMemberId ?? null,
      updates.paidByMemberName ?? null,
      splitJson,
      updates.date ?? null,
      updates.activityId ?? null,
      updates.note ?? null,
      expenseId,
      tripId
    );

    this.recalculateTripSpent(tripId);

    return this.findById(expenseId);
  }

  /**
   * Deletes an expense.
   */
  delete(tripId: string, expenseId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM expenses WHERE id = ? AND trip_id = ?');
    const result = stmt.run(expenseId, tripId);
    if (result.changes > 0) {
      this.recalculateTripSpent(tripId);
      return true;
    }
    return false;
  }

  /**
   * Sums all expenses for the trip and updates `trips.budget_spent` and `trips.updated_at`.
   */
  private recalculateTripSpent(tripId: string): void {
    const row = this.db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as totalSpent FROM expenses WHERE trip_id = ?'
    ).get(tripId) as any;

    const totalSpent = row ? row.totalSpent : 0;
    this.db.prepare(`
      UPDATE trips 
      SET budget_spent = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(totalSpent, tripId);
  }

  private mapRowToExpense(r: any): PersistedExpense {
    let splitIds: string[] = [];
    try {
      splitIds = r.splitBetweenJson ? JSON.parse(r.splitBetweenJson) : [];
    } catch {
      splitIds = [];
    }

    return {
      id: r.id,
      tripId: r.tripId,
      title: r.title,
      category: r.category as any,
      totalAmount: Number(r.amount || 0),
      currency: r.currency || 'INR',
      paidByMemberId: r.paidByMemberId,
      paidByMemberName: r.paidByMemberName || 'Traveler',
      splitAmongIds: splitIds,
      date: r.date,
      activityId: r.activityId || undefined,
      note: r.note || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }
}

export const expenseRepository = new ExpenseRepository();
