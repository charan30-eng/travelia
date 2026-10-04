/**
 * Canonical Location and Airport Model for Travelia (Phase 11)
 * Authoritative location definition used across Places, Routes, Weather, Airports, Flights, and Maps.
 */

export type LocationSource = 
  | 'google_places' 
  | 'google_geocoding' 
  | 'database' 
  | 'catalog' 
  | 'user_input' 
  | 'fallback';

export type LocationStatus = 
  | 'verified' 
  | 'cached' 
  | 'fallback' 
  | 'unavailable';

export interface CanonicalLocation {
  id: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  timezone?: string;
  source: LocationSource;
  status: LocationStatus;
  resolvedAt?: string;
}

export interface Airport {
  airportCode: string; // e.g. "MAA", "DEL", "BOM"
  airportName: string; // e.g. "Chennai International Airport"
  city: string;
  country: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  distanceFromCityMeters?: number;
  source: string;
  status: 'verified' | 'cached' | 'fallback' | 'unavailable';
}

export interface GeographicBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
