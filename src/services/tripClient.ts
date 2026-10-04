/**
 * TRAVELIA TRIP CLIENT
 * 
 * Frontend service layer for interacting with the persistent backend Trip API:
 * - GET    /api/trips
 * - POST   /api/trips
 * - GET    /api/trips/:id
 * - PUT    /api/trips/:id
 * - DELETE /api/trips/:id
 * - Activities CRUD: /api/trips/:id/activities
 * - Expenses CRUD:   /api/trips/:id/expenses
 * - Optimizations:   /api/trips/:id/optimizations
 */

import { TripPlan, ItineraryActivity, GroupExpense } from '../types';

export interface TripClientResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class TripClient {
  private baseUrl = '/api/trips';

  /**
   * Fetches all trips from the persistent backend.
   */
  async getTrips(): Promise<TripPlan[]> {
    try {
      const res = await fetch(this.baseUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch trips: ${res.statusText}`);
      }
      const data = await res.json();
      return data.trips || [];
    } catch (err) {
      console.warn('[TripClient] getTrips request failed:', err);
      throw err;
    }
  }

  /**
   * Fetches a single trip by ID with full itinerary, expenses, and members.
   */
  async getTrip(id: string): Promise<TripPlan | null> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`);
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`Failed to fetch trip ${id}: ${res.statusText}`);
      }
      const data = await res.json();
      return data.trip || null;
    } catch (err) {
      console.warn(`[TripClient] getTrip('${id}') request failed:`, err);
      throw err;
    }
  }

  /**
   * Creates a new trip in the persistent backend database.
   */
  async createTrip(tripData: Partial<TripPlan>): Promise<TripPlan> {
    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripData)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to create trip: ${res.status}`);
      }

      const data = await res.json();
      return data.trip;
    } catch (err) {
      console.error('[TripClient] createTrip failed:', err);
      throw err;
    }
  }

  /**
   * Updates an existing trip (metadata, budget, or full itinerary).
   */
  async updateTrip(id: string, updates: Partial<TripPlan>): Promise<TripPlan> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to update trip: ${res.status}`);
      }

      const data = await res.json();
      return data.trip;
    } catch (err) {
      console.error(`[TripClient] updateTrip('${id}') failed:`, err);
      throw err;
    }
  }

  /**
   * Deletes a trip from the persistent database.
   */
  async deleteTrip(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to delete trip: ${res.status}`);
      }

      const data = await res.json();
      return Boolean(data.success);
    } catch (err) {
      console.error(`[TripClient] deleteTrip('${id}') failed:`, err);
      throw err;
    }
  }

  // ----------------------------------------------------
  // ACTIVITIES CRUD
  // ----------------------------------------------------

  /**
   * Adds an activity to a specific day of a trip.
   */
  async addActivity(tripId: string, dayNumber: number, activity: Partial<ItineraryActivity>): Promise<ItineraryActivity> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(tripId)}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activity, dayNumber })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to add activity: ${res.status}`);
      }

      const data = await res.json();
      return data.activity;
    } catch (err) {
      console.error(`[TripClient] addActivity('${tripId}') failed:`, err);
      throw err;
    }
  }

  /**
   * Updates an activity in a trip.
   */
  async updateActivity(tripId: string, activityId: string, updates: Partial<ItineraryActivity>): Promise<ItineraryActivity> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to update activity: ${res.status}`);
      }

      const data = await res.json();
      return data.activity;
    } catch (err) {
      console.error(`[TripClient] updateActivity failed:`, err);
      throw err;
    }
  }

  /**
   * Deletes an activity from a trip.
   */
  async deleteActivity(tripId: string, activityId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to delete activity: ${res.status}`);
      }

      const data = await res.json();
      return Boolean(data.success);
    } catch (err) {
      console.error(`[TripClient] deleteActivity failed:`, err);
      throw err;
    }
  }

  // ----------------------------------------------------
  // EXPENSES CRUD
  // ----------------------------------------------------

  /**
   * Fetches expenses for a trip.
   */
  async getExpenses(tripId: string): Promise<GroupExpense[]> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(tripId)}/expenses`);
      if (!res.ok) {
        throw new Error(`Failed to fetch expenses: ${res.statusText}`);
      }
      const data = await res.json();
      return data.expenses || [];
    } catch (err) {
      console.warn(`[TripClient] getExpenses('${tripId}') failed:`, err);
      return [];
    }
  }

  /**
   * Adds an expense to a trip.
   */
  async addExpense(tripId: string, expense: Partial<GroupExpense>): Promise<GroupExpense> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(tripId)}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to add expense: ${res.status}`);
      }

      const data = await res.json();
      return data.expense;
    } catch (err) {
      console.error(`[TripClient] addExpense failed:`, err);
      throw err;
    }
  }

  /**
   * Updates an expense in a trip.
   */
  async updateExpense(tripId: string, expenseId: string, updates: Partial<GroupExpense>): Promise<GroupExpense> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expenseId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to update expense: ${res.status}`);
      }

      const data = await res.json();
      return data.expense;
    } catch (err) {
      console.error(`[TripClient] updateExpense failed:`, err);
      throw err;
    }
  }

  /**
   * Deletes an expense from a trip.
   */
  async deleteExpense(tripId: string, expenseId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expenseId)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to delete expense: ${res.status}`);
      }

      const data = await res.json();
      return Boolean(data.success);
    } catch (err) {
      console.error(`[TripClient] deleteExpense failed:`, err);
      throw err;
    }
  }

  // ----------------------------------------------------
  // OPTIMIZATIONS
  // ----------------------------------------------------

  /**
   * Records an optimization run without mutating the original trip.
   */
  async recordOptimization(tripId: string, optimization: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(tripId)}/optimizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimization)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to record optimization: ${res.status}`);
      }

      const data = await res.json();
      return data.optimization;
    } catch (err) {
      console.warn(`[TripClient] recordOptimization failed:`, err);
      return null;
    }
  }

  /**
   * Seeds demo trips into the backend.
   */
  async seedDemoTrips(demoTrips: TripPlan[]): Promise<TripPlan[]> {
    try {
      const res = await fetch(`${this.baseUrl}/seed-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoTrips })
      });

      if (!res.ok) {
        throw new Error(`Failed to seed demo trips: ${res.statusText}`);
      }

      const data = await res.json();
      return data.trips || [];
    } catch (err) {
      console.warn(`[TripClient] seedDemoTrips failed:`, err);
      return [];
    }
  }
}

export const tripClient = new TripClient();
