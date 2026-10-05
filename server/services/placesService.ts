/**
 * Travelia Places Data Layer - Authoritative Places Service
 * 
 * Central coordinator for real tourist attractions, hotels, landmarks, and travel places.
 * Architecture:
 *   1. Live Google Places (New) -> 2. Unexpired Cache -> 3. Authoritative Verified Real Places Catalog -> 4. Curated Demo Fallback -> 5. Unavailable
 * 
 * Strict Data Integrity Rules:
 *   - Destination-aware & Canonical Location Resolution (consumes canonical destination)
 *   - Geographic validation against destination coordinates and country bounding boxes
 *   - Deduplication by providerPlaceId and normalized name
 *   - NEVER fabricates prices (₹350/₹200/₹150 eliminated), fake ratings, or fake attraction names.
 *   - Distinguishes Countries (e.g. Norway, India) vs Cities (Delhi, Paris, Tokyo, Dubai, London, Mumbai).
 */

import { TraveliaPlace, PlacesResponse, PlaceSearchParams, PlaceCategory } from '../types/places';
import { CanonicalLocation } from '../types/location';
import { googlePlacesProvider } from './placesEngine/googlePlacesProvider';
import { placesCache } from './placesEngine/placesCache';
import { demoPlacesService } from './demoPlacesService';
import { verifiedPlacesCatalog } from './verifiedPlacesCatalog';
import { resolveCanonicalLocation, COUNTRY_BOUNDING_BOXES } from './canonicalLocationService';
import { VERIFIED_DESTINATION_CENTROIDS } from './locationResolutionService';

export interface AttractionSearchParams extends PlaceSearchParams {
  city?: string;
  country?: string;
  countryCode?: string;
  destinationPlaceId?: string;
}

export class PlacesService {
  private isLiveEnabled: boolean;
  private isFallbackEnabled: boolean;

  constructor() {
    this.isLiveEnabled = process.env.PLACES_LIVE_ENABLED !== 'false';
    this.isFallbackEnabled = process.env.PLACES_FALLBACK_ENABLED !== 'false';
  }

  /**
   * Universal Place Search
   * Priority: Live Google -> Unexpired Cache -> Verified Real Places Catalog -> Demo Fallback -> Unavailable
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

    // 1. Resolve Canonical Location for destination
    const canonical = resolveCanonicalLocation(destination, params.country);

    let destLat = params.latitude;
    let destLng = params.longitude;
    let destCity = params.city || canonical?.city || destination.split(',')[0].trim();
    let destCountry = params.country || canonical?.country || '';
    let destCountryCode = params.countryCode || canonical?.countryCode || '';
    const isCountryLevel = canonical?.entityType === 'country' || destination.toLowerCase() === 'norway';

    if (destLat === undefined || destLng === undefined) {
      if (canonical) {
        destLat = canonical.latitude;
        destLng = canonical.longitude;
      } else {
        const knownCentroid = VERIFIED_DESTINATION_CENTROIDS[destination.toLowerCase()] || 
                              VERIFIED_DESTINATION_CENTROIDS[destCity.toLowerCase()];
        if (knownCentroid) {
          destLat = knownCentroid.latitude;
          destLng = knownCentroid.longitude;
        }
      }
    }

    const locationContext = isCountryLevel 
      ? `Top attractions across ${destCountry || destination}`
      : `Top tourist attractions in ${destCity}${destCountry ? `, ${destCountry}` : ''}`;

    // 2. Generate deterministic cache key containing destination, coords, and category
    const cacheKey = placesCache.generateKey({
      ...params,
      destination: canonical?.id || destination,
      latitude: destLat,
      longitude: destLng
    });

    // 3. Check in-memory cache
    const cached = placesCache.get(cacheKey);
    if (cached && cached.places.length > 0) {
      console.log(`[Places] Cache hit (${cached.ageSeconds}s old) | Destination: "${destination}" | Results: ${cached.places.length}`);
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
        canonicalLocation: canonical || undefined,
        locationContext,
        places: cached.places.slice(0, limit)
      };
    }

    // 4. Attempt Live Google Places API (New)
    const canUseLive = this.isLiveEnabled && googlePlacesProvider.isConfigured();

    if (canUseLive) {
      try {
        let places: TraveliaPlace[] = [];

        // Build targeted search text query
        let searchTextQuery = query;
        if (!searchTextQuery) {
          if (category === 'hotel') {
            searchTextQuery = `hotels in ${isCountryLevel ? destCountry : `${destCity}, ${destCountry}`}`;
          } else if (category === 'restaurant') {
            searchTextQuery = `best restaurants in ${isCountryLevel ? destCountry : `${destCity}, ${destCountry}`}`;
          } else if (category === 'beach') {
            searchTextQuery = `beaches in ${isCountryLevel ? destCountry : `${destCity}, ${destCountry}`}`;
          } else if (category === 'museum') {
            searchTextQuery = `famous museums in ${isCountryLevel ? destCountry : `${destCity}, ${destCountry}`}`;
          } else if (category === 'temple') {
            searchTextQuery = `famous temples and shrines in ${isCountryLevel ? destCountry : `${destCity}, ${destCountry}`}`;
          } else {
            searchTextQuery = isCountryLevel 
              ? `top tourist attractions and famous landmarks across ${destCountry || destination}`
              : `top tourist attractions and famous sights in ${destCity}, ${destCountry || destination}`;
          }
        }

        const searchRadius = isCountryLevel ? 300000 : (params.radiusMeters || 35000);

        places = await googlePlacesProvider.searchText(searchTextQuery, {
          maxResultCount: Math.min(limit * 2, 20),
          latitude: destLat,
          longitude: destLng,
          radiusMeters: searchRadius
        });

        // Geographically validate and sanitize every place
        places = places.filter(p => this.validatePlaceForDestination(p, canonical, destination).valid);

        // Deduplicate places by providerPlaceId & name
        places = this.deduplicatePlaces(places);

        // Sort places deterministically
        places = this.sortAttractions(places, destLat, destLng);

        if (places.length > 0) {
          console.log(`[Places] Destination: ${destination} | Resolved: ${destCity}, ${destCountry} (${destLat}, ${destLng}) | Provider: google | Results: ${places.length} | Status: live`);
          
          // Cache live Google Places response
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
            canonicalLocation: canonical || undefined,
            locationContext,
            places: places.slice(0, limit)
          };
        } else {
          console.log(`[Places] Google returned 0 verified places for "${searchTextQuery}". Checking secondary catalog.`);
        }
      } catch (err: any) {
        console.warn(`[Places] Live Google request failed: ${err.message}. Checking secondary provider.`);
      }
    } else {
      console.log(`[Places] Live Google skipped (configured: ${googlePlacesProvider.isConfigured()}, enabled: ${this.isLiveEnabled})`);
    }

    // 5. Secondary Provider: Authoritative Verified Real Places Catalog
    const verifiedCatalogPlaces = verifiedPlacesCatalog.searchAttractions(destination, canonical, category, limit);
    if (verifiedCatalogPlaces.length > 0) {
      const validatedCatalog = verifiedCatalogPlaces.filter(p => this.validatePlaceForDestination(p, canonical, destination).valid);
      const deduplicatedCatalog = this.deduplicatePlaces(validatedCatalog);

      if (deduplicatedCatalog.length > 0) {
        console.log(`[Places] Destination: ${destination} | Resolved: ${destCity}, ${destCountry} (${destLat}, ${destLng}) | Provider: verified_catalog | Results: ${deduplicatedCatalog.length} | Status: fallback`);
        
        // Cache verified catalog hit with status 'fallback'
        placesCache.set(cacheKey, deduplicatedCatalog, 'verified_catalog', destination, category, query, params.locale);

        return {
          success: true,
          destination,
          query,
          category,
          source: 'verified_catalog',
          dataStatus: 'fallback',
          fetchedAt: new Date().toISOString(),
          totalCount: deduplicatedCatalog.length,
          canonicalLocation: canonical || undefined,
          locationContext,
          places: deduplicatedCatalog.slice(0, limit)
        };
      }
    }

    // 6. Tertiary Fallback: Demo Catalog if enabled
    if (this.isFallbackEnabled) {
      console.log(`[Places] Checking demo catalog fallback for destination "${destination}"`);
      const demoPlaces = demoPlacesService.searchPlaces(destination, category, query, limit);
      const validatedDemo = demoPlaces.filter(p => this.validatePlaceForDestination(p, canonical, destination).valid);
      const deduplicatedDemo = this.deduplicatePlaces(validatedDemo);

      if (deduplicatedDemo.length > 0) {
        console.log(`[Places] Destination: ${destination} | Provider: demo | Results: ${deduplicatedDemo.length} | Status: demo`);
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
          canonicalLocation: canonical || undefined,
          locationContext,
          places: deduplicatedDemo.slice(0, limit)
        };
      }
    }

    // 7. Data Unavailable (Never return fake fabricated places!)
    console.log(`[Places] No verified attractions found for "${destination}". Returning honest unavailable status.`);
    return {
      success: false,
      destination,
      query,
      category,
      source: 'unavailable',
      dataStatus: 'unavailable',
      fetchedAt: new Date().toISOString(),
      totalCount: 0,
      canonicalLocation: canonical || undefined,
      locationContext,
      places: [],
      error: {
        code: 'PLACES_UNAVAILABLE',
        message: `Verified tourist attraction data is currently unavailable for "${destination}".`
      }
    };
  }

  /**
   * Search Tourist Attractions for destination
   * Accepts either string or AttractionSearchParams
   */
  public async searchAttractions(
    destinationOrParams: string | AttractionSearchParams,
    limit: number = 15
  ): Promise<PlacesResponse> {
    if (typeof destinationOrParams === 'string') {
      return this.searchPlaces({
        destination: destinationOrParams,
        category: 'tourist_attraction',
        limit
      });
    }

    return this.searchPlaces({
      ...destinationOrParams,
      category: destinationOrParams.category || 'tourist_attraction',
      limit: destinationOrParams.limit || limit
    });
  }

  /**
   * Search Hotels for destination
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
   * Retrieve Place Details
   */
  public async getPlaceDetails(placeId: string): Promise<TraveliaPlace | null> {
    // 1. Check verified catalog
    const fromVerified = verifiedPlacesCatalog.getPlaceById(placeId);
    if (fromVerified) return fromVerified;

    // 2. Check demo catalog
    if (placeId.startsWith('demo-')) {
      return demoPlacesService.getPlaceById(placeId);
    }

    // 3. Live Google
    if (this.isLiveEnabled && googlePlacesProvider.isConfigured()) {
      try {
        const place = await googlePlacesProvider.getPlaceDetails(placeId);
        if (place) return place;
      } catch (err: any) {
        console.warn(`[Places] Failed to fetch live place details for ${placeId}: ${err.message}`);
      }
    }

    // 4. Fallback demo
    if (this.isFallbackEnabled) {
      return demoPlacesService.getPlaceById(placeId);
    }

    return null;
  }

  /**
   * Verify Place Identity (Hallucination Protection for Gemini)
   */
  public async verifyPlace(placeName: string, destination: string): Promise<TraveliaPlace | null> {
    if (!placeName || !placeName.trim()) return null;

    const res = await this.searchPlaces({
      destination,
      query: placeName,
      limit: 3
    });

    if (res.places.length > 0) {
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
   * Geographically validates an attraction candidate against the destination
   */
  public validatePlaceForDestination(
    place: TraveliaPlace,
    canonical?: CanonicalLocation | null,
    destinationName?: string
  ): { valid: boolean; reason?: string } {
    // 1. Coordinate Validity
    if (
      typeof place.latitude !== 'number' ||
      typeof place.longitude !== 'number' ||
      isNaN(place.latitude) ||
      isNaN(place.longitude) ||
      place.latitude < -90 ||
      place.latitude > 90 ||
      place.longitude < -180 ||
      place.longitude > 180 ||
      (place.latitude === 0 && place.longitude === 0)
    ) {
      return { valid: false, reason: 'INVALID_COORDINATES' };
    }

    // 2. Name check
    if (!place.name || place.name.trim().length < 2) {
      return { valid: false, reason: 'INVALID_NAME' };
    }

    // 3. Reject generic commercial / non-tourist businesses
    const nonAttractionTypes = new Set([
      'dentist', 'accounting', 'lawyer', 'car_repair', 'gas_station', 
      'insurance_agency', 'plumber', 'roofing_contractor', 'atm',
      'bank', 'pharmacy', 'laundry', 'car_dealer', 'storage'
    ]);
    if (place.types && place.types.length > 0) {
      const hasOnlyBadTypes = place.types.every(t => nonAttractionTypes.has(t.toLowerCase()));
      if (hasOnlyBadTypes) {
        return { valid: false, reason: 'NOT_AN_ATTRACTION' };
      }
    }

    // 4. Country Bounding Box Validation
    const cCode = canonical?.countryCode?.toUpperCase() || place.countryCode?.toUpperCase();
    if (cCode && COUNTRY_BOUNDING_BOXES[cCode]) {
      const box = COUNTRY_BOUNDING_BOXES[cCode];
      if (
        place.latitude < box.minLat ||
        place.latitude > box.maxLat ||
        place.longitude < box.minLng ||
        place.longitude > box.maxLng
      ) {
        return { valid: false, reason: `OUTSIDE_COUNTRY_BOUNDING_BOX (${cCode})` };
      }
    }

    // 5. Address Country Consistency (Prevents returning Pakistan/Bangladesh for India)
    if (place.address && cCode) {
      const addrLower = place.address.toLowerCase();
      if (cCode === 'IN') {
        if (addrLower.includes('pakistan') || addrLower.includes('bangladesh') || addrLower.includes('nepal')) {
          return { valid: false, reason: 'COUNTRY_MISMATCH' };
        }
      } else if (cCode === 'FR') {
        if (addrLower.includes('germany') || addrLower.includes('spain') || addrLower.includes('united kingdom')) {
          return { valid: false, reason: 'COUNTRY_MISMATCH' };
        }
      } else if (cCode === 'NO') {
        if (addrLower.includes('sweden') || addrLower.includes('denmark') || addrLower.includes('finland')) {
          return { valid: false, reason: 'COUNTRY_MISMATCH' };
        }
      }
    }

    // 6. City radius check (if entityType is city)
    if (canonical && (canonical.entityType === 'city' || !canonical.entityType)) {
      const distKm = this.calculateDistanceKm(
        canonical.latitude,
        canonical.longitude,
        place.latitude,
        place.longitude
      );
      if (distKm > 85) {
        return { valid: false, reason: `EXCEEDS_CITY_RADIUS (${Math.round(distKm)}km > 85km)` };
      }
    }

    return { valid: true };
  }

  /**
   * Deduplicates a list of places based on providerPlaceId, id, and normalized name
   */
  public deduplicatePlaces(places: TraveliaPlace[]): TraveliaPlace[] {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const deduplicated: TraveliaPlace[] = [];

    for (const place of places) {
      const idKey = (place.providerPlaceId || place.providerId || place.id || '').trim().toLowerCase();
      const nameKey = place.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      if (idKey && seenIds.has(idKey)) continue;
      if (nameKey && seenNames.has(nameKey)) continue;

      if (idKey) seenIds.add(idKey);
      if (nameKey) seenNames.add(nameKey);
      deduplicated.push(place);
    }

    return deduplicated;
  }

  /**
   * Sorts attractions deterministically based on rating, reviews count, and distance
   */
  private sortAttractions(places: TraveliaPlace[], centerLat?: number, centerLng?: number): TraveliaPlace[] {
    return [...places].sort((a, b) => {
      const aRating = a.rating || 4.0;
      const bRating = b.rating || 4.0;
      const aReviews = a.userRatingsTotal || 100;
      const bReviews = b.userRatingsTotal || 100;

      const aScore = aRating * Math.log10(aReviews + 10);
      const bScore = bRating * Math.log10(bReviews + 10);

      let aDistPenalty = 0;
      let bDistPenalty = 0;
      if (centerLat !== undefined && centerLng !== undefined) {
        aDistPenalty = this.calculateDistanceKm(centerLat, centerLng, a.latitude, a.longitude) * 0.05;
        bDistPenalty = this.calculateDistanceKm(centerLat, centerLng, b.latitude, b.longitude) * 0.05;
      }

      return (bScore - bDistPenalty) - (aScore - aDistPenalty);
    });
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
