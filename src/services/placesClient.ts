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
  public async searchAttractions(destination: string, limit: number = 9): Promise<PlacesResponse> {
    try {
      const res = await fetch(`/api/places/attractions?destination=${encodeURIComponent(destination)}&limit=${limit}`);
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
    // If real image proxy is available, use it; otherwise fallback to curated hotel visual
    const image = place.photos?.[0]?.uri || 
      (index % 3 === 0 
        ? 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop'
        : index % 3 === 1
        ? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=600&auto=format&fit=crop');

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
      : 'Curated Demo Stay';

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
   */
  public placeToTouristPlace(place: TraveliaPlace, index: number = 0): TouristPlace {
    const image = place.photos?.[0]?.uri || 
      (index % 3 === 0 
        ? 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=600&auto=format&fit=crop'
        : index % 3 === 1
        ? 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=600&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=600&auto=format&fit=crop');

    const formattedCategory = (place.category || 'tourist_attraction').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const entryCost = place.priceLevel === 0 ? 0 : (place.estimatedCost ?? null);
    const dataStatus = place.dataStatus || 'demo';
    const aiTag = dataStatus === 'live'
      ? 'Live Verified Sight'
      : dataStatus === 'cached'
      ? 'Cached Live Sight'
      : dataStatus === 'partial'
      ? 'Partial Sight'
      : 'Demo Highlight';

    return {
      id: place.id,
      name: place.name,
      location: place.address || place.name,
      rating: place.rating,
      estimatedDuration: place.estimatedDuration || '2–3 Hours',
      entryCost,
      image,
      aiTag,
      category: formattedCategory,
      description: place.description || `${place.name} is a renowned ${formattedCategory.toLowerCase()} in ${place.address || 'the area'}.`,
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
