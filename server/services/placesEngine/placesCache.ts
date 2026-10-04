/**
 * Travelia Places Data Layer - In-Memory Cache
 * 
 * Implements high-performance, TTL-managed caching for Google Places queries
 * to avoid duplicate API calls, minimize latency, and strictly control Google Maps Platform costs.
 */

import { TraveliaPlace, PlaceSearchParams, PlaceSource } from '../../types/places';

interface CacheEntry {
  places: TraveliaPlace[];
  timestamp: number;
  provider: PlaceSource;
  destination: string;
  category?: string;
  query?: string;
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
   */
  public generateKey(params: PlaceSearchParams): string {
    const dest = (params.destination || '').trim().toLowerCase();
    const cat = (params.category || 'all').trim().toLowerCase();
    const q = (params.query || '').trim().toLowerCase();
    const coords = (params.latitude !== undefined && params.longitude !== undefined) 
      ? `${params.latitude.toFixed(3)},${params.longitude.toFixed(3)}` 
      : 'none';
    const radius = params.radiusMeters ? Math.round(params.radiusMeters) : 'default';

    return `places:${dest}:${cat}:${q}:${coords}:${radius}`;
  }

  /**
   * Retrieves places from cache if valid and unexpired
   */
  public get(key: string): { places: TraveliaPlace[]; ageSeconds: number; provider: PlaceSource } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const ageSeconds = Math.floor((now - entry.timestamp) / 1000);

    if (ageSeconds > this.defaultTTLSeconds) {
      this.cache.delete(key);
      return null;
    }

    return {
      places: entry.places,
      ageSeconds,
      provider: entry.provider
    };
  }

  /**
   * Stores places in cache with current timestamp
   */
  public set(key: string, places: TraveliaPlace[], provider: PlaceSource, destination: string, category?: string, query?: string): void {
    this.cache.set(key, {
      places,
      timestamp: Date.now(),
      provider,
      destination,
      category,
      query
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
