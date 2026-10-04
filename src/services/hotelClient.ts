/**
 * TRAVELIA HOTEL CLIENT
 * 
 * Frontend client for communicating with /api/hotels backend endpoints.
 */

import { NormalizedHotel, HotelSearchResponse } from '../../server/types/hotels';

class HotelClient {
  private baseUrl = '/api/hotels';

  async searchHotels(
    destination: string,
    checkInOrOptions?: string | { checkIn?: string; checkOut?: string; nights?: number; guests?: number; limit?: number },
    checkOut?: string,
    guests: number = 2,
    limit: number = 6
  ): Promise<HotelSearchResponse> {
    try {
      let finalCheckIn = typeof checkInOrOptions === 'string' ? checkInOrOptions : checkInOrOptions?.checkIn;
      let finalCheckOut = typeof checkInOrOptions === 'string' ? checkOut : checkInOrOptions?.checkOut;
      let finalGuests = typeof checkInOrOptions === 'object' && checkInOrOptions?.guests !== undefined ? checkInOrOptions.guests : guests;
      let finalLimit = typeof checkInOrOptions === 'object' && checkInOrOptions?.limit !== undefined ? checkInOrOptions.limit : limit;

      const params = new URLSearchParams({
        destination,
        guests: String(finalGuests),
        limit: String(finalLimit)
      });
      if (finalCheckIn) params.append('checkIn', finalCheckIn);
      if (finalCheckOut) params.append('checkOut', finalCheckOut);

      const res = await fetch(`${this.baseUrl}/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Hotel search failed: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('[HotelClient] Hotel search fallback:', err);
      return {
        success: false,
        destination,
        nights: 1,
        guests: typeof checkInOrOptions === 'object' && checkInOrOptions?.guests !== undefined ? checkInOrOptions.guests : guests,
        source: 'unavailable',
        dataStatus: 'unavailable',
        retrievedAt: new Date().toISOString(),
        totalCount: 0,
        hotels: [],
        error: { code: 'NETWORK_ERROR', message: 'Failed to contact hotel search service' }
      };
    }
  }

}

export const hotelClient = new HotelClient();
