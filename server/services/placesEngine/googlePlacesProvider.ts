/**
 * Travelia Places Data Layer - Google Places API (New) Provider
 * 
 * Direct communicator with Google Places API (New) endpoints:
 * - Text Search: https://places.googleapis.com/v1/places:searchText
 * - Nearby Search: https://places.googleapis.com/v1/places:searchNearby
 * - Place Details: https://places.googleapis.com/v1/places/{id}
 * - Place Photos: https://places.googleapis.com/v1/{name}/media
 * 
 * Uses strict Field Masks to minimize egress bandwidth and billing costs.
 * Normalizes raw Google structures into the strongly-typed TraveliaPlace model.
 */

import { TraveliaPlace, PlaceCategory, PlaceOpeningHours, PlacePhoto } from '../../types/places';

const PLACES_BASE_URL = 'https://places.googleapis.com/v1';

// Strict field mask requesting only required attributes (avoids expensive full mask *)
const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.regularOpeningHours',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.photos'
].join(',');

const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'types',
  'primaryType',
  'rating',
  'userRatingCount',
  'priceLevel',
  'regularOpeningHours',
  'websiteUri',
  'nationalPhoneNumber',
  'photos'
].join(',');

export class GooglePlacesProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 10;
  }

  /**
   * Search places using Google Text Search (New)
   */
  public async searchText(
    textQuery: string,
    options?: {
      maxResultCount?: number;
      includedType?: string;
      latitude?: number;
      longitude?: number;
      radiusMeters?: number;
    }
  ): Promise<TraveliaPlace[]> {
    if (!this.isConfigured()) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured');
    }

    const payload: any = {
      textQuery: textQuery.trim(),
      maxResultCount: Math.min(options?.maxResultCount || 10, 20)
    };

    if (options?.includedType) {
      payload.includedType = options.includedType;
    }

    if (options?.latitude !== undefined && options?.longitude !== undefined) {
      payload.locationBias = {
        circle: {
          center: {
            latitude: options.latitude,
            longitude: options.longitude
          },
          radius: options.radiusMeters || 15000.0
        }
      };
    }

    const response = await fetch(`${PLACES_BASE_URL}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': SEARCH_FIELD_MASK
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Places Provider] Google Text Search failed (${response.status}):`, errText);
      throw new Error(`Google Places API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.places || !Array.isArray(data.places)) {
      return [];
    }

    return data.places
      .map((p: any) => this.normalizePlace(p))
      .filter((p: TraveliaPlace | null): p is TraveliaPlace => p !== null);
  }

  /**
   * Search places using Google Nearby Search (New)
   */
  public async searchNearby(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000,
    includedTypes: string[] = ['tourist_attraction', 'point_of_interest'],
    maxResultCount: number = 10
  ): Promise<TraveliaPlace[]> {
    if (!this.isConfigured()) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured');
    }

    const payload: any = {
      includedTypes,
      maxResultCount: Math.min(maxResultCount, 20),
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: radiusMeters
        }
      },
      rankPreference: 'POPULARITY'
    };

    const response = await fetch(`${PLACES_BASE_URL}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': SEARCH_FIELD_MASK
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Places Provider] Google Nearby Search failed (${response.status}):`, errText);
      throw new Error(`Google Places Nearby API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.places || !Array.isArray(data.places)) {
      return [];
    }

    return data.places
      .map((p: any) => this.normalizePlace(p))
      .filter((p: TraveliaPlace | null): p is TraveliaPlace => p !== null);
  }

  /**
   * Retrieve single place details by Google Place ID
   */
  public async getPlaceDetails(placeId: string): Promise<TraveliaPlace | null> {
    if (!this.isConfigured()) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured');
    }

    const response = await fetch(`${PLACES_BASE_URL}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': DETAILS_FIELD_MASK
      }
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Google Place Details returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return this.normalizePlace(data);
  }

  /**
   * Fetch Place Photo media binary buffer for proxying
   */
  public async fetchPhotoMedia(
    photoResourceName: string,
    maxHeightPx: number = 400,
    maxWidthPx: number = 600
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!this.isConfigured()) return null;

    const url = `${PLACES_BASE_URL}/${photoResourceName}/media?maxHeightPx=${maxHeightPx}&maxWidthPx=${maxWidthPx}&key=${this.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const arrayBuf = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return {
      buffer: Buffer.from(arrayBuf),
      contentType
    };
  }

  /**
   * Normalizes raw Google Places response into TraveliaPlace.
   * Rejects malformed results that lack a name or valid coordinates.
   */
  public normalizePlace(raw: any): TraveliaPlace | null {
    if (!raw || !raw.id || !raw.displayName?.text) {
      return null;
    }

    const lat = raw.location?.latitude;
    const lng = raw.location?.longitude;

    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
      return null; // Do NOT fabricate coordinates!
    }

    const category = this.mapCategory(raw.primaryType, raw.types);
    const openingHours = this.normalizeOpeningHours(raw.regularOpeningHours);
    const photos = this.normalizePhotos(raw.photos);
    const priceLevel = this.normalizePriceLevel(raw.priceLevel);

    const place: TraveliaPlace = {
      id: raw.id,
      providerId: raw.id,
      name: raw.displayName.text,
      category,
      latitude: lat,
      longitude: lng,
      address: raw.formattedAddress || undefined,
      rating: typeof raw.rating === 'number' ? raw.rating : undefined,
      userRatingsTotal: typeof raw.userRatingCount === 'number' ? raw.userRatingCount : undefined,
      priceLevel,
      websiteUri: raw.websiteUri || undefined,
      phoneNumber: raw.nationalPhoneNumber || undefined,
      openingHours,
      photos,
      types: Array.isArray(raw.types) ? raw.types : [],
      source: 'google',
      dataStatus: 'live',
      fetchedAt: new Date().toISOString()
    };

    return place;
  }

  /**
   * Maps Google Place primaryType and types array to Travelia PlaceCategory
   */
  private mapCategory(primaryType?: string, types?: string[]): PlaceCategory {
    const allTypes = [primaryType, ...(types || [])].filter(Boolean).map(t => t!.toLowerCase());

    if (allTypes.some(t => ['lodging', 'hotel', 'resort_hotel', 'motel', 'bed_and_breakfast'].includes(t))) {
      return 'hotel';
    }
    if (allTypes.some(t => ['museum', 'art_gallery'].includes(t))) {
      return 'museum';
    }
    if (allTypes.some(t => ['park', 'national_park', 'botanical_garden'].includes(t))) {
      return 'park';
    }
    if (allTypes.some(t => ['beach'].includes(t))) {
      return 'beach';
    }
    if (allTypes.some(t => ['hindu_temple', 'place_of_worship'].includes(t))) {
      return 'temple';
    }
    if (allTypes.some(t => ['church', 'cathedral', 'chapel'].includes(t))) {
      return 'church';
    }
    if (allTypes.some(t => ['historical_landmark', 'monument', 'historical_place'].includes(t))) {
      return 'landmark';
    }
    if (allTypes.some(t => ['restaurant', 'cafe', 'bar', 'food', 'bakery'].includes(t))) {
      return 'restaurant';
    }
    if (allTypes.some(t => ['tourist_attraction', 'point_of_interest'].includes(t))) {
      return 'tourist_attraction';
    }
    if (allTypes.some(t => ['shopping_mall', 'market'].includes(t))) {
      return 'shopping';
    }

    return 'other';
  }

  private normalizePriceLevel(rawLevel: any): number | undefined {
    if (typeof rawLevel === 'number') return rawLevel;
    if (typeof rawLevel === 'string') {
      switch (rawLevel) {
        case 'PRICE_LEVEL_FREE': return 0;
        case 'PRICE_LEVEL_INEXPENSIVE': return 1;
        case 'PRICE_LEVEL_MODERATE': return 2;
        case 'PRICE_LEVEL_EXPENSIVE': return 3;
        case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4;
        default: return undefined;
      }
    }
    return undefined;
  }

  private normalizeOpeningHours(hours: any): PlaceOpeningHours | undefined {
    if (!hours) return undefined;
    return {
      openNow: typeof hours.openNow === 'boolean' ? hours.openNow : undefined,
      weekdayDescriptions: Array.isArray(hours.weekdayDescriptions) ? hours.weekdayDescriptions : undefined
    };
  }

  private normalizePhotos(photos: any[]): PlacePhoto[] | undefined {
    if (!Array.isArray(photos) || photos.length === 0) return undefined;
    return photos.slice(0, 3).map(p => ({
      name: p.name,
      // Provide secure proxy URI so client doesn't need API key
      uri: `/api/places/photo?name=${encodeURIComponent(p.name)}`,
      authorAttribution: p.authorAttributions?.[0]?.displayName || undefined,
      widthPx: p.widthPx,
      heightPx: p.heightPx
    }));
  }
}

export const googlePlacesProvider = new GooglePlacesProvider();
