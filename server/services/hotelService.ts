/**
 * TRAVELIA HOTEL SERVICE
 * 
 * Orchestrates verified hotel identity from Places Data Layer with real
 * room rates from Hotel Inventory Provider.
 * 
 * Enforces rule:
 * - Places API provides identity (name, coords, rating, photos).
 * - Inventory Provider provides pricing and room availability.
 * - When pricing is missing, price is strictly null (never fabricated from priceLevel).
 */

import { placesService } from './placesService';
import { hotelInventoryProvider } from './hotelProvider';
import { NormalizedHotel, HotelSearchQuery, HotelSearchResponse, HotelPrice } from '../types/hotels';

interface CacheEntry {
  data: HotelSearchResponse;
  expiresAt: number;
}

export class HotelService {
  private cache = new Map<string, CacheEntry>();
  private defaultTtlMs = 30 * 60 * 1000; // 30 minutes

  /**
   * Search for hotels in a destination, merging identity from Places Data Layer
   * with room rates from the inventory provider.
   */
  async searchHotels(query: HotelSearchQuery): Promise<HotelSearchResponse> {
    const destination = (query.destination || '').trim();
    if (!destination) {
      return {
        success: false,
        destination: '',
        nights: 1,
        guests: query.guests || 2,
        source: 'unavailable',
        dataStatus: 'unavailable',
        retrievedAt: new Date().toISOString(),
        totalCount: 0,
        hotels: [],
        error: { code: 'INVALID_DESTINATION', message: 'Destination is required' }
      };
    }

    const checkInDate = query.checkInDate || new Date().toISOString().split('T')[0];
    const checkOutDate = query.checkOutDate || this.calculateDefaultCheckOut(checkInDate, 4);
    const nights = this.calculateNights(checkInDate, checkOutDate);
    const guests = query.guests || 2;
    const limit = query.limit || 6;

    const cacheKey = `${destination.toLowerCase()}|${checkInDate}|${checkOutDate}|${guests}|${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.data,
        dataStatus: 'cached'
      };
    }

    // 1. Fetch authentic hotel identities from Places Service
    const placesRes = await placesService.searchPlaces({
      destination,
      category: 'hotel',
      limit
    });

    if (!placesRes.success || placesRes.places.length === 0) {
      return {
        success: false,
        destination,
        checkInDate,
        checkOutDate,
        nights,
        guests,
        source: placesRes.source,
        dataStatus: 'unavailable',
        retrievedAt: new Date().toISOString(),
        totalCount: 0,
        hotels: [],
        error: placesRes.error || { code: 'NO_HOTELS_FOUND', message: `No hotels found in ${destination}` }
      };
    }

    // 2. Query room inventory provider for each hotel identity
    const normalizedHotels: NormalizedHotel[] = await Promise.all(
      placesRes.places.map(async (place, idx) => {
        const inventory = await hotelInventoryProvider.getRoomRates(
          place.name,
          destination,
          checkInDate,
          checkOutDate,
          nights,
          guests
        );

        let hotelDataStatus = place.dataStatus;
        if (inventory.price === null) {
          hotelDataStatus = place.dataStatus === 'live' ? 'partial' : place.dataStatus;
        } else if (inventory.price.source === 'demo') {
          hotelDataStatus = 'demo';
        }

        const photos = place.photos?.map(p => p.uri).filter(Boolean) as string[] || [];

        return {
          id: place.id || `hotel-${idx + 1}`,
          placeId: place.sourceId,
          name: place.name,
          location: place.address || `${place.name}, ${destination}`,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          rating: place.rating,
          reviewsCount: place.userRatingsTotal,
          photos,
          websiteUri: place.websiteUri,
          phoneNumber: place.phoneNumber,
          source: (place.source === 'google' && inventory.price?.source === 'demo' ? 'mixed' : place.source) as any,
          price: inventory.price,
          availability: inventory.availability,
          rooms: inventory.rooms,
          amenities: place.amenities,
          description: place.description,
          tag: place.tag,
          selected: idx === 0,
          retrievedAt: new Date().toISOString(),
          dataStatus: hotelDataStatus
        };
      })
    );

    const overallSource = normalizedHotels.some(h => h.source === 'mixed') 
      ? 'mixed' 
      : placesRes.source;

    const overallDataStatus = normalizedHotels.some(h => h.dataStatus === 'live')
      ? 'live'
      : normalizedHotels.some(h => h.dataStatus === 'demo')
        ? 'demo'
        : 'partial';

    const response: HotelSearchResponse = {
      success: true,
      destination,
      checkInDate,
      checkOutDate,
      nights,
      guests,
      source: overallSource,
      dataStatus: overallDataStatus,
      retrievedAt: new Date().toISOString(),
      totalCount: normalizedHotels.length,
      hotels: normalizedHotels
    };

    this.cache.set(cacheKey, {
      data: response,
      expiresAt: Date.now() + this.defaultTtlMs
    });

    return response;
  }

  private calculateDefaultCheckOut(checkIn: string, days: number): string {
    try {
      const d = new Date(checkIn);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  private calculateNights(checkIn: string, checkOut: string): number {
    try {
      const start = new Date(checkIn).getTime();
      const end = new Date(checkOut).getTime();
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays);
    } catch {
      return 1;
    }
  }
}

export const hotelService = new HotelService();
