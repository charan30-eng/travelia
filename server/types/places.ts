/**
 * Travelia Places Data Layer - Type Definitions
 * 
 * Defines the normalized TraveliaPlace model and API contracts for
 * Google Places API (New) integration with explicit live vs demo states.
 */

import { CanonicalLocation } from './location';

export type PlaceSource = 'google' | 'verified_catalog' | 'demo' | 'fallback' | 'mixed' | 'unavailable';

export type PlaceDataStatus = 'live' | 'cached' | 'demo' | 'fallback' | 'partial' | 'unavailable';

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
  source: PlaceSource;
  sourceId?: string;
  providerId?: string; // alias for backwards compatibility
  providerPlaceId?: string; // authoritative provider place ID (e.g. Google Place ID ChIJ...)
  name: string;
  category: PlaceCategory;
  types?: string[];
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  rating?: number;
  userRatingsTotal?: number;
  openingHours?: PlaceOpeningHours;
  websiteUri?: string;
  phoneNumber?: string;
  photos?: PlacePhoto[];
  priceLevel?: number; // 0: Free, 1: Inexpensive, 2: Moderate, 3: Expensive, 4: Very Expensive
  dataStatus: PlaceDataStatus;
  retrievedAt?: string;
  fetchedAt?: string; // alias for backwards compatibility
  
  // Optional travel context metadata (if available or estimated honestly)
  estimatedCost?: number | null;
  estimatedDuration?: string;
  durationSource?: 'provider' | 'travelia_estimate' | 'unavailable';
  priceSource?: 'provider' | 'verified_admission' | 'unavailable';
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
  canonicalLocation?: CanonicalLocation;
  locationContext?: string; // e.g. "Top attractions across Norway" or "Top attractions in Delhi, India"
  cacheAgeSeconds?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface PlaceSearchParams {
  destination: string;
  destinationPlaceId?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  query?: string;
  category?: PlaceCategory;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  limit?: number;
  locale?: string;
}
