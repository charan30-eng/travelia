/**
 * Travelia Places Data Layer - In-Memory Cache
 * 
 * Implements high-performance, TTL-managed caching for Google Places queries
 * to avoid duplicate API calls, minimize latency, and strictly control Google Maps Platform costs.
 */

import { TraveliaPlace, PlaceSearchParams, PlaceSource, PlaceDataStatus } from '../../types/places';

export interface CacheEntry {
  places: TraveliaPlace[];
  timestamp: number;
  createdAt: string;
  expiresAt: string;
  source: PlaceSource;
  status: PlaceDataStatus;
  destination: string;
  category?: string;
  query?: string;
  locale?: string;
}

export interface CachedPlacesResult {
  places: TraveliaPlace[];
  ageSeconds: number;
  source: PlaceSource;
  provider: PlaceSource; // alias for backwards compatibility
  status: PlaceDataStatus;
  createdAt: string;
  expiresAt: string;
}

export class PlacesCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTLSeconds: number;

  constructor() {
    const envTtl = process.env.PLACES_CACHE_TTL_SECONDS;
    this.defaultTTLSeconds = envTtl ? parseInt(envTtl, 10) : 3600; // 1 hour default
  }

  /**
   * Generates a deterministic cache key for a search request
   * Normalizes: destination, category, coordinates, radius, search text, locale
   */
  public generateKey(params: PlaceSearchParams): string {
    const dest = (params.destination || '').trim().toLowerCase();
    const cat = (params.category || 'all').trim().toLowerCase();
    const q = (params.query || '').trim().toLowerCase();
    const coords = (params.latitude !== undefined && params.longitude !== undefined) 
      ? `${params.latitude.toFixed(3)},${params.longitude.toFixed(3)}` 
      : 'none';
    const radius = params.radiusMeters ? Math.round(params.radiusMeters) : 'default';
    const loc = (params.locale || 'en').trim().toLowerCase();

    return `places:${dest}:${cat}:${q}:${coords}:${radius}:${loc}`;
  }

  /**
   * Retrieves places from cache if valid and unexpired.
   * Maps places with explicit dataStatus: 'cached'.
   */
  public get(key: string): CachedPlacesResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const ageSeconds = Math.floor((now - entry.timestamp) / 1000);

    if (ageSeconds > this.defaultTTLSeconds) {
      this.cache.delete(key);
      return null;
    }

    // Return cached places with updated dataStatus = 'cached'
    const cachedPlaces = entry.places.map(p => ({
      ...p,
      dataStatus: 'cached' as PlaceDataStatus,
      retrievedAt: entry.createdAt,
      fetchedAt: entry.createdAt
    }));

    return {
      places: cachedPlaces,
      ageSeconds,
      source: entry.source,
      provider: entry.source,
      status: 'cached',
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt
    };
  }

  /**
   * Stores places in cache with creation and expiration timestamps
   */
  public set(
    key: string,
    places: TraveliaPlace[],
    source: PlaceSource,
    destination: string,
    category?: string,
    query?: string,
    locale?: string
  ): void {
    const now = Date.now();
    const nowISO = new Date(now).toISOString();
    const expiresISO = new Date(now + this.defaultTTLSeconds * 1000).toISOString();

    this.cache.set(key, {
      places,
      timestamp: now,
      createdAt: nowISO,
      expiresAt: expiresISO,
      source,
      status: 'cached',
      destination,
      category,
      query,
      locale
    });
  }

  /**
   * Clears the cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Returns current cache size
   */
  public size(): number {
    return this.cache.size;
  }
}

export const placesCache = new PlacesCache();
