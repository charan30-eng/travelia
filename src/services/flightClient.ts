/**
 * TRAVELIA FLIGHT CLIENT
 * 
 * Frontend client for communicating with /api/flights backend endpoints.
 */

import { NormalizedFlightOffer, FlightSearchResponse } from '../../server/types/flights';

class FlightClient {
  private baseUrl = '/api/flights';

  async searchFlights(
    origin: string,
    destination: string,
    departureDate?: string,
    returnDate?: string,
    passengers: number = 1,
    cabinClass: 'economy' | 'premium' | 'business' = 'economy'
  ): Promise<FlightSearchResponse> {
    try {
      const params = new URLSearchParams({
        origin: origin || 'Mumbai',
        destination,
        passengers: String(passengers),
        cabinClass
      });
      if (departureDate) params.append('departureDate', departureDate);
      if (returnDate) params.append('returnDate', returnDate);

      const res = await fetch(`${this.baseUrl}/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Flight search failed: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('[FlightClient] Flight search fallback:', err);
      return {
        success: false,
        origin,
        destination,
        departureDate: departureDate || '',
        returnDate,
        passengers,
        cabinClass,
        source: 'unavailable',
        dataStatus: 'unavailable',
        retrievedAt: new Date().toISOString(),
        outboundFlights: [],
        returnFlights: [],
        error: { code: 'NETWORK_ERROR', message: 'Failed to contact flight search service' }
      };
    }
  }
}

export const flightClient = new FlightClient();
