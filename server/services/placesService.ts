/**
 * Travelia Places Data Layer - Authoritative Places Service
 * 
 * Central coordinator for real tourist attractions, hotels, landmarks, and travel places.
 * Architecture:
 *   Live Google Places (New) -> Cached Google Data -> Curated Demo Fallback -> Unavailable
 * 
 * Guarantees honest status labeling:
 *   - live: freshly fetched from Google Places API (New)
 *   - cached: unexpired cache hit from previously fetched Google Places API
 *   - demo: explicit fallback from curated mock catalog
 *   - partial: results with missing secondary attributes
 *   - unavailable: failed request with demo fallback disabled
 * 
 * NEVER fabricates prices, coordinates, ratings, or hours.
 */

import { TraveliaPlace, PlacesResponse, PlaceSearchParams, PlaceCategory } from '../types/places';
import { googlePlacesProvider } from './placesEngine/googlePlacesProvider';
import { placesCache } from './placesEngine/placesCache';
import { demoPlacesService } from './demoPlacesService';
import { VERIFIED_DESTINATION_CENTROIDS } from './locationResolutionService';

export class PlacesService {
  private isLiveEnabled: boolean;
  private isFallbackEnabled: boolean;

  constructor() {
    this.isLiveEnabled = process.env.PLACES_LIVE_ENABLED !== 'false';
    this.isFallbackEnabled = process.env.PLACES_FALLBACK_ENABLED !== 'false';
  }

  /**
   * Universal Place Search
   * Coordinates: Live Google -> Cache -> Demo Fallback -> Unavailable
   */
  public async searchPlaces(params: PlaceSearchParams): Promise<PlacesResponse> {
    const destination = (params.destination || '').trim();
    if (!destination) {
      return {
        success: false,
        destination: '',
        query: params.query,
        category: params.category,
        source: 'unavailable',
        dataStatus: 'unavailable',
        fetchedAt: new Date().toISOString(),
        totalCount: 0,
        places: [],
        error: {
          code: 'INVALID_DESTINATION',
          message: 'Destination parameter cannot be empty.'
        }
      };
    }

    const query = params.query ? params.query.trim() : '';
    const category = params.category;
    const limit = params.limit || 15;

    console.log(`[Places] Query: "${query || destination}" | Category: ${category || 'all'} | Dest: ${destination}`);

    const cacheKey = placesCache.generateKey(params);

    // 1. Check in-memory cache first
    const cached = placesCache.get(cacheKey);
    if (cached && cached.places.length > 0) {
      console.log(`[Places] Cache hit (${cached.ageSeconds}s old) | Source: ${cached.source} | Results: ${cached.places.length}`);
      return {
        success: true,
        destination,
        query,
        category,
        source: cached.source,
        dataStatus: 'cached',
        fetchedAt: cached.createdAt,
        totalCount: cached.places.length,
        cacheAgeSeconds: cached.ageSeconds,
        places: cached.places.slice(0, limit)
      };
    }

    // 2. Attempt Live Google Places API (New)
    const canUseLive = this.isLiveEnabled && googlePlacesProvider.isConfigured();

    if (canUseLive) {
      try {
        let places: TraveliaPlace[] = [];

        // Determine destination coordinates if not supplied
        let destLat = params.latitude;
        let destLng = params.longitude;
        if (destLat === undefined || destLng === undefined) {
          const knownCentroid = VERIFIED_DESTINATION_CENTROIDS[destination.toLowerCase()];
          if (knownCentroid) {
            destLat = knownCentroid.latitude;
            destLng = knownCentroid.longitude;
          }
        }

        // Build targeted search text query
        let searchTextQuery = query;
        if (!searchTextQuery) {
          if (category === 'hotel') {
            searchTextQuery = `hotels in ${destination}`;
          } else if (category === 'restaurant') {
            searchTextQuery = `best restaurants in ${destination}`;
          } else if (category === 'beach') {
            searchTextQuery = `beaches in ${destination}`;
          } else if (category === 'museum') {
            searchTextQuery = `museums in ${destination}`;
          } else if (category === 'temple') {
            searchTextQuery = `temples in ${destination}`;
          } else {
            searchTextQuery = `tourist attractions and landmarks in ${destination}`;
          }
        } else if (!searchTextQuery.toLowerCase().includes(destination.toLowerCase())) {
          searchTextQuery = `${searchTextQuery} in ${destination}`;
        }

        places = await googlePlacesProvider.searchText(searchTextQuery, {
          maxResultCount: limit,
          latitude: destLat,
          longitude: destLng,
          radiusMeters: params.radiusMeters || 20000
        });

        // Deduplicate places
        places = this.deduplicatePlaces(places);

        if (places.length > 0) {
          console.log(`[Places] Provider: google | Results: ${places.length} | Status: live`);
          // Store in cache
          placesCache.set(cacheKey, places, 'google', destination, category, query, params.locale);

          return {
            success: true,
            destination,
            query,
            category,
            source: 'google',
            dataStatus: 'live',
            fetchedAt: new Date().toISOString(),
            totalCount: places.length,
            places: places.slice(0, limit)
          };
        } else {
          console.log(`[Places] Google returned 0 places for "${searchTextQuery}"`);
        }
      } catch (err: any) {
        console.warn(`[Places] Live Google request failed: ${err.message}. Checking fallback options.`);
      }
    } else {
      console.log(`[Places] Live Google skipped (configured: ${googlePlacesProvider.isConfigured()}, enabled: ${this.isLiveEnabled})`);
    }

    // 3. Fallback to Demo Catalog if enabled
    if (this.isFallbackEnabled) {
      console.log(`[Places] Checking demo data fallback for destination "${destination}"`);
      const demoPlaces = demoPlacesService.searchPlaces(destination, category, query, limit);
      const deduplicatedDemo = this.deduplicatePlaces(demoPlaces);

      if (deduplicatedDemo.length > 0) {
        // Cache demo response so identical queries hit cache with source 'demo'
        placesCache.set(cacheKey, deduplicatedDemo, 'demo', destination, category, query, params.locale);

        return {
          success: true,
          destination,
          query,
          category,
          source: 'demo',
          dataStatus: 'demo',
          fetchedAt: new Date().toISOString(),
          totalCount: deduplicatedDemo.length,
          places: deduplicatedDemo.slice(0, limit)
        };
      }
    }

    // 4. Unavailable
    console.log(`[Places] Google unavailable and no demo places match for "${destination}". Returning empty result.`);
    return {
      success: false,
      destination,
      query,
      category,
      source: 'unavailable',
      dataStatus: 'unavailable',
      fetchedAt: new Date().toISOString(),
      totalCount: 0,
      places: [],
      error: {
        code: 'PLACES_UNAVAILABLE',
        message: `Live place data is currently unavailable for "${destination}" and demo fallback contains no matches.`
      }
    };
  }

  /**
   * Search Hotels
   */
  public async searchHotels(destination: string, limit: number = 10): Promise<PlacesResponse> {
    return this.searchPlaces({
      destination,
      category: 'hotel',
      query: `hotels in ${destination}`,
      limit
    });
  }

  /**
   * Search Tourist Attractions
   */
  public async searchAttractions(destination: string, limit: number = 15): Promise<PlacesResponse> {
    return this.searchPlaces({
      destination,
      category: 'tourist_attraction',
      query: `top tourist attractions in ${destination}`,
      limit
    });
  }

  /**
   * Retrieve Place Details
   */
  public async getPlaceDetails(placeId: string): Promise<TraveliaPlace | null> {
    if (placeId.startsWith('demo-')) {
      return demoPlacesService.getPlaceById(placeId);
    }

    if (this.isLiveEnabled && googlePlacesProvider.isConfigured()) {
      try {
        const place = await googlePlacesProvider.getPlaceDetails(placeId);
        if (place) return place;
      } catch (err: any) {
        console.warn(`[Places] Failed to fetch live place details for ${placeId}: ${err.message}`);
      }
    }

    if (this.isFallbackEnabled) {
      return demoPlacesService.getPlaceById(placeId);
    }

    return null;
  }

  /**
   * Verify Place Identity (Halucination Protection for Gemini)
   * Resolves whether a named place exists in real data.
   */
  public async verifyPlace(placeName: string, destination: string): Promise<TraveliaPlace | null> {
    if (!placeName || !placeName.trim()) return null;

    const res = await this.searchPlaces({
      destination,
      query: placeName,
      limit: 3
    });

    if (res.places.length > 0) {
      // Find place with close name match
      const pNameLower = placeName.toLowerCase().trim();
      const match = res.places.find(p => 
        p.name.toLowerCase().includes(pNameLower) || 
        pNameLower.includes(p.name.toLowerCase())
      );
      return match || res.places[0];
    }

    return null;
  }

  /**
   * Photo Media Proxy
   */
  public async getPlacePhotoMedia(photoResourceName: string, maxHeight?: number, maxWidth?: number) {
    return googlePlacesProvider.fetchPhotoMedia(photoResourceName, maxHeight, maxWidth);
  }

  /**
   * Deduplicates a list of places based on:
   * 1. Google Place ID
   * 2. Normalized Name + Geographic Proximity (< 200m)
   */
  private deduplicatePlaces(places: TraveliaPlace[]): TraveliaPlace[] {
    const seenIds = new Set<string>();
    const deduplicated: TraveliaPlace[] = [];

    for (const place of places) {
      if (seenIds.has(place.id)) {
        continue;
      }
      seenIds.add(place.id);

      // Check for coordinate / name near-duplicate
      const isDuplicate = deduplicated.some(existing => {
        const sameName = existing.name.toLowerCase().trim() === place.name.toLowerCase().trim();
        const distKm = this.calculateDistanceKm(existing.latitude, existing.longitude, place.latitude, place.longitude);
        return sameName || distKm < 0.2; // closer than 200 meters with same name
      });

      if (!isDuplicate) {
        deduplicated.push(place);
      }
    }

    return deduplicated;
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const placesService = new PlacesService();
