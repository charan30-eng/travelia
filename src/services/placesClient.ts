/**
 * Travelia Frontend Places Client
 * 
 * Secure client for querying Travelia's backend Places Data Layer.
 * NEVER connects directly to Google Places API from the browser.
 * Translates TraveliaPlace objects into UI-compatible Hotel and TouristPlace models.
 */

import { TraveliaPlace, PlacesResponse, Hotel, TouristPlace, PlaceCategory } from '../types';

export interface PlacesSearchParams {
  destination: string;
  query?: string;
  category?: PlaceCategory;
  limit?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

class PlacesClient {
  /**
   * Universal Place Search
   */
  public async searchPlaces(params: PlacesSearchParams): Promise<PlacesResponse> {
    const queryParams = new URLSearchParams({
      destination: params.destination
    });

    if (params.query) queryParams.append('query', params.query);
    if (params.category) queryParams.append('category', params.category);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.latitude !== undefined) queryParams.append('latitude', params.latitude.toString());
    if (params.longitude !== undefined) queryParams.append('longitude', params.longitude.toString());
    if (params.radius !== undefined) queryParams.append('radius', params.radius.toString());

    try {
      const res = await fetch(`/api/places/search?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Places search failed with status ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.warn('[PlacesClient] searchPlaces fallback:', err.message);
      return {
        success: false,
        destination: params.destination,
        source: 'unavailable',
        dataStatus: 'unavailable',
        fetchedAt: new Date().toISOString(),
        totalCount: 0,
        places: [],
        error: { code: 'NETWORK_ERROR', message: err.message }
      };
    }
  }

  /**
   * Search verified hotels in destination
   */
  public async searchHotels(destination: string, limit: number = 6): Promise<PlacesResponse> {
    try {
      const res = await fetch(`/api/places/hotels?destination=${encodeURIComponent(destination)}&limit=${limit}`);
      if (!res.ok) {
        throw new Error(`Hotels search failed with status ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.warn('[PlacesClient] searchHotels fallback:', err.message);
      return {
        success: false,
        destination,
        source: 'unavailable',
        dataStatus: 'unavailable',
        fetchedAt: new Date().toISOString(),
        totalCount: 0,
        places: [],
        error: { code: 'NETWORK_ERROR', message: err.message }
      };
    }
  }

  /**
   * Search verified tourist attractions in destination
   */
  public async searchAttractions(
    destination: string,
    options?: {
      limit?: number;
      category?: PlaceCategory;
      city?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      destinationPlaceId?: string;
    } | number
  ): Promise<PlacesResponse> {
    const limit = typeof options === 'number' ? options : options?.limit || 9;
    const queryParams = new URLSearchParams({
      destination,
      limit: limit.toString()
    });

    if (typeof options === 'object') {
      if (options.category) queryParams.append('category', options.category);
      if (options.city) queryParams.append('city', options.city);
      if (options.country) queryParams.append('country', options.country);
      if (options.destinationPlaceId) queryParams.append('destinationPlaceId', options.destinationPlaceId);
      if (options.latitude !== undefined) queryParams.append('latitude', options.latitude.toString());
      if (options.longitude !== undefined) queryParams.append('longitude', options.longitude.toString());
    }

    try {
      const res = await fetch(`/api/places/attractions?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Attractions search failed with status ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.warn('[PlacesClient] searchAttractions fallback:', err.message);
      return {
        success: false,
        destination,
        source: 'unavailable',
        dataStatus: 'unavailable',
        fetchedAt: new Date().toISOString(),
        totalCount: 0,
        places: [],
        error: { code: 'NETWORK_ERROR', message: err.message }
      };
    }
  }

  /**
   * Retrieve place details by ID
   */
  public async getPlaceDetails(placeId: string): Promise<TraveliaPlace | null> {
    try {
      const res = await fetch(`/api/places/${encodeURIComponent(placeId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.place || null;
    } catch (err) {
      console.warn(`[PlacesClient] getPlaceDetails(${placeId}) error:`, err);
      return null;
    }
  }

  /**
   * Adapter: TraveliaPlace -> UI Hotel Model
   * Maps Google Places data faithfully without inventing fake nightly prices
   */
  public placeToHotel(place: TraveliaPlace, index: number = 0, nights: number = 4): Hotel {
    // If real image proxy is available, use it; otherwise neutral architectural fallback
    const image = place.photos?.[0]?.uri || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop';

    // Hotel Rule: Google Places priceLevel (0-4) represents a general price tier, NOT a nightly room tariff.
    // If an authoritative room price is unavailable, strictly set pricePerNight = null rather than fabricating a number.
    const pricePerNight = place.estimatedCost ?? null;
    const totalStayPrice = pricePerNight != null ? pricePerNight * nights : null;

    const dataStatus = place.dataStatus || 'demo';
    const tag = dataStatus === 'live'
      ? 'Live Google Stay'
      : dataStatus === 'cached'
      ? 'Cached Live Stay'
      : dataStatus === 'partial'
      ? 'Partial Place'
      : 'Curated Stay';

    return {
      id: place.id,
      name: place.name,
      location: place.address || `${place.name} Area`,
      rating: place.rating,
      reviewsCount: place.userRatingsTotal,
      pricePerNight,
      totalStayPrice,
      image,
      amenities: place.amenities || ['Verified Stay', 'Central Access', 'Wi-Fi', 'Air Conditioning'],
      description: place.description || `${place.name} is an accommodation in ${place.address || 'prime central location'}.`,
      tag,
      selected: index === 0,
      source: place.source,
      sourceId: place.sourceId || place.id,
      dataStatus,
      providerId: place.providerId || place.id,
      coordinates: { latitude: place.latitude, longitude: place.longitude },
      address: place.address,
      websiteUri: place.websiteUri,
      phoneNumber: place.phoneNumber,
      openingHours: place.openingHours,
      retrievedAt: place.retrievedAt || place.fetchedAt
    };
  }

  /**
   * Adapter: TraveliaPlace -> UI TouristPlace Model
   * Strictly avoids fabricating fake prices, fake ratings, or assigning unrelated photos.
   */
  public placeToTouristPlace(place: TraveliaPlace, index: number = 0): TouristPlace {
    // Neutral fallback photo if provider photo is absent (avoids assigning unrelated Goa photos)
    const neutralFallbackPhoto = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop';
    const image = place.photos?.[0]?.uri || neutralFallbackPhoto;

    const formattedCategory = (place.category || 'tourist_attraction').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Factual pricing: 0 for verified free places, or authoritative price if provided. Never fabricate.
    const entryCost = place.priceLevel === 0 ? 0 : (place.estimatedCost !== undefined && place.estimatedCost !== null ? place.estimatedCost : null);
    const dataStatus = place.dataStatus || 'fallback';
    const aiTag = place.tag || (
      dataStatus === 'live'
        ? 'Live Verified Sight'
        : dataStatus === 'cached'
        ? 'Cached Place'
        : dataStatus === 'fallback'
        ? 'Verified Place'
        : 'Demo Highlight'
    );

    return {
      id: place.id,
      name: place.name,
      location: place.address || place.city || place.name,
      rating: place.rating,
      estimatedDuration: place.estimatedDuration || 'Typical visit duration unavailable',
      entryCost,
      image,
      aiTag,
      category: formattedCategory,
      description: place.description || `${place.name} is a renowned ${formattedCategory.toLowerCase()} in ${place.address || place.city || 'the area'}.`,
      bestTimeToVisit: place.bestTimeToVisit || 'Morning / Late Afternoon',
      added: true,
      source: place.source,
      sourceId: place.sourceId || place.id,
      dataStatus,
      providerId: place.providerId || place.id,
      coordinates: { latitude: place.latitude, longitude: place.longitude },
      address: place.address,
      websiteUri: place.websiteUri,
      phoneNumber: place.phoneNumber,
      openingHours: place.openingHours,
      retrievedAt: place.retrievedAt || place.fetchedAt
    };
  }
}

export const placesClient = new PlacesClient();
