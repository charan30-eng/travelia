/**
 * TRAVELIA FLIGHT REPOSITORY
 * 
 * Manages flights associated with trips in SQLite.
 */

import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/connection';

export interface PersistedFlight {
  id: string;
  tripId: string;
  flightNumber: string;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime?: string;
  arrivalTime?: string;
  departureDate?: string;
  arrivalDate?: string;
  price: number;
  cabinClass: string;
  status: string;
  createdAt: string;
}

export class FlightRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  findByTripId(tripId: string): PersistedFlight[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, trip_id as tripId, flight_number as flightNumber, airline,
        departure_airport as departureAirport, arrival_airport as arrivalAirport,
        departure_time as departureTime, arrival_time as arrivalTime,
        departure_date as departureDate, arrival_date as arrivalDate,
        price, cabin_class as cabinClass, status, created_at as createdAt
      FROM flights
      WHERE trip_id = ?
      ORDER BY departure_date ASC, departure_time ASC
    `);

    const rows = stmt.all(tripId) as any[];
    return rows.map(r => ({
      ...r,
      price: Number(r.price || 0)
    }));
  }

  create(tripId: string, flight: Partial<PersistedFlight>): PersistedFlight {
    const id = flight.id || `flight-${tripId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.db.prepare(`
      INSERT INTO flights (
        id, trip_id, flight_number, airline, departure_airport, arrival_airport,
        departure_time, arrival_time, departure_date, arrival_date,
        price, cabin_class, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      tripId,
      flight.flightNumber || 'FL-101',
      flight.airline || 'Airline',
      flight.departureAirport || 'Origin',
      flight.arrivalAirport || 'Destination',
      flight.departureTime || null,
      flight.arrivalTime || null,
      flight.departureDate || null,
      flight.arrivalDate || null,
      Number(flight.price || 0),
      flight.cabinClass || 'economy',
      flight.status || 'scheduled'
    );

    return {
      id,
      tripId,
      flightNumber: flight.flightNumber || 'FL-101',
      airline: flight.airline || 'Airline',
      departureAirport: flight.departureAirport || 'Origin',
      arrivalAirport: flight.arrivalAirport || 'Destination',
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      departureDate: flight.departureDate,
      arrivalDate: flight.arrivalDate,
      price: Number(flight.price || 0),
      cabinClass: flight.cabinClass || 'economy',
      status: flight.status || 'scheduled',
      createdAt: new Date().toISOString()
    };
  }

  delete(tripId: string, flightId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM flights WHERE id = ? AND trip_id = ?');
    return stmt.run(flightId, tripId).changes > 0;
  }
}

export const flightRepository = new FlightRepository();
