/**
 * Travelia Places Data Layer - Type Definitions
 * 
 * Defines the normalized TraveliaPlace model and API contracts for
 * Google Places API (New) integration with explicit live vs demo states.
 */

export type PlaceSource = 'google' | 'demo' | 'mixed' | 'unavailable';

export type PlaceDataStatus = 'live' | 'cached' | 'demo' | 'partial' | 'unavailable';

export type PlaceCategory = 
  | 'hotel'
  | 'tourist_attraction'
  | 'landmark'
  | 'museum'
  | 'park'
  | 'beach'
  | 'temple'
  | 'church'
  | 'restaurant'
  | 'historical_place'
  | 'entertainment'
  | 'shopping'
  | 'other';

export interface PlaceOpeningHours {
  openNow?: boolean;
  weekdayDescriptions?: string[];
}

export interface PlacePhoto {
  name?: string;
  uri?: string;
  authorAttribution?: string;
  widthPx?: number;
  heightPx?: number;
}

export interface TraveliaPlace {
  id: string;
  providerId?: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number; // 0: Free, 1: Inexpensive, 2: Moderate, 3: Expensive, 4: Very Expensive
  websiteUri?: string;
  phoneNumber?: string;
  openingHours?: PlaceOpeningHours;
  photos?: PlacePhoto[];
  types?: string[];
  source: PlaceSource;
  dataStatus: PlaceDataStatus;
  fetchedAt?: string;
  
  // Optional travel context metadata (if available or estimated honestly)
  estimatedCost?: number;
  estimatedDuration?: string;
  description?: string;
  tag?: string;
  amenities?: string[];
  reviewsCount?: number;
  bestTimeToVisit?: string;
  cuisine?: string;
}

export interface PlacesResponse {
  success: boolean;
  destination: string;
  query?: string;
  category?: PlaceCategory;
  source: PlaceSource;
  dataStatus: PlaceDataStatus;
  fetchedAt: string;
  totalCount: number;
  places: TraveliaPlace[];
  cacheAgeSeconds?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface PlaceSearchParams {
  destination: string;
  query?: string;
  category?: PlaceCategory;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  limit?: number;
}
