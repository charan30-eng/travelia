/**
 * TRAVELIA FLIGHT SERVICE
 * 
 * Orchestrates airfare searches, schedule validation, caching, and provider failover.
 */

import { flightProvider } from './flightProvider';
import { FlightSearchParams, FlightSearchResponse } from '../types/flights';

interface FlightCacheEntry {
  data: FlightSearchResponse;
  expiresAt: number;
}

export class FlightService {
  private cache = new Map<string, FlightCacheEntry>();
  private defaultTtlMs = 60 * 60 * 1000; // 1 hour

  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
    const origin = (params.origin || 'Mumbai').trim();
    const destination = (params.destination || '').trim();

    if (!destination) {
      return {
        success: false,
        origin,
        destination: '',
        departureDate: params.departureDate || '',
        passengers: params.passengers || 1,
        cabinClass: params.cabinClass || 'economy',
        source: 'unavailable',
        dataStatus: 'unavailable',
        retrievedAt: new Date().toISOString(),
        outboundFlights: [],
        returnFlights: [],
        error: { code: 'INVALID_DESTINATION', message: 'Flight destination is required' }
      };
    }

    const departureDate = params.departureDate || new Date().toISOString().split('T')[0];
    const passengers = Math.max(1, params.passengers || 1);
    const cabinClass = params.cabinClass || 'economy';

    const cacheKey = `${origin.toLowerCase()}|${destination.toLowerCase()}|${departureDate}|${params.returnDate || ''}|${passengers}|${cabinClass}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.data,
        dataStatus: 'cached'
      };
    }

    const searchResult = await flightProvider.search({
      origin,
      destination,
      departureDate,
      returnDate: params.returnDate,
      passengers,
      cabinClass
    });

    const isAvailable = searchResult.outbound.length > 0;
    const response: FlightSearchResponse = {
      success: isAvailable || searchResult.isSameCity === true,
      origin,
      destination,
      departureDate,
      returnDate: params.returnDate,
      passengers,
      cabinClass,
      source: searchResult.source,
      dataStatus: isAvailable ? searchResult.dataStatus : 'unavailable',
      retrievedAt: new Date().toISOString(),
      outboundFlights: searchResult.outbound,
      returnFlights: searchResult.returnFlights,
      isSameCity: searchResult.isSameCity,
      message: searchResult.message,
      error: !isAvailable && !searchResult.isSameCity ? { code: 'NO_FLIGHTS_FOUND', message: `No flights available from ${origin} to ${destination}` } : undefined
    };

    if (isAvailable) {
      this.cache.set(cacheKey, {
        data: response,
        expiresAt: Date.now() + this.defaultTtlMs
      });
    }

    return response;
  }
}

export const flightService = new FlightService();
