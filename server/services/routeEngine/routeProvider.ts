/**
 * Route Provider Abstraction & Engine Implementation
 * 
 * Supports:
 * 1. OSRM (Open Source Routing Machine) - Real road geometry, road distance, and road transit time.
 * 2. Haversine Straight-Line Provider - Pure mathematical straight-line distance, honestly labeled.
 * 3. In-memory Route Cache with TTL and request deduplication.
 */

import { Coordinates, RouteResult, RouteProvider, TravelMode, DistanceType } from '../../types/route';

/**
 * Calculates standard Haversine great-circle distance between two coordinates in kilometers.
 * Strictly straight-line distance; never labeled as road distance.
 */
export function calculateHaversineDistanceKm(origin: Coordinates, destination: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = (destination.latitude - origin.latitude) * (Math.PI / 180);
  const dLon = (destination.longitude - origin.longitude) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(origin.latitude * (Math.PI / 180)) *
      Math.cos(destination.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  return Math.round(km * 100) / 100;
}

// In-Memory Route Cache
interface CacheEntry {
  result: RouteResult;
  expiresAt: number;
}

const ROUTE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 Hour TTL

function makeCacheKey(origin: Coordinates, destination: Coordinates, mode: TravelMode, provider: string): string {
  const oLat = origin.latitude.toFixed(5);
  const oLng = origin.longitude.toFixed(5);
  const dLat = destination.latitude.toFixed(5);
  const dLng = destination.longitude.toFixed(5);
  return `${oLat},${oLng}|${dLat},${dLng}|${mode}|${provider}`;
}

/**
 * Haversine Straight-Line Route Provider (Fallback / Fast Calculation)
 */
export class HaversineRouteProvider implements RouteProvider {
  async getRoute(origin: Coordinates, destination: Coordinates, mode: TravelMode): Promise<RouteResult> {
    const straightKm = calculateHaversineDistanceKm(origin, destination);
    
    // Explicitly labeled straight-line estimate
    // Standard nominal travel speeds (km/h) for straight-line estimation:
    // driving: 30 km/h, walking: 4.5 km/h, cycling: 15 km/h, transit: 25 km/h
    const speeds: Record<TravelMode, number> = {
      driving: 30,
      walking: 4.5,
      cycling: 15,
      transit: 25
    };
    const speed = speeds[mode] || 30;
    const durationHours = straightKm / speed;
    const durationMinutes = Math.max(1, Math.round(durationHours * 60));

    return {
      distanceMeters: Math.round(straightKm * 1000),
      durationSeconds: durationMinutes * 60,
      distanceKm: straightKm,
      durationMinutes,
      distanceType: 'straight_line',
      geometry: [
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude]
      ],
      provider: 'haversine_straight_line'
    };
  }
}

/**
 * OSRM Road Routing Provider
 * Queries actual road networks for turn-by-turn geometry, actual driving/walking distance, and transit time.
 */
export class OSRMRouteProvider implements RouteProvider {
  private baseUrl: string;
  private fallbackProvider: HaversineRouteProvider;
  private timeoutMs: number;

  constructor(
    baseUrl: string = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
    timeoutMs: number = 3500
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fallbackProvider = new HaversineRouteProvider();
    this.timeoutMs = timeoutMs;
  }

  async getRoute(origin: Coordinates, destination: Coordinates, mode: TravelMode): Promise<RouteResult> {
    // 1. Same origin and destination edge case: 0 distance, 0 duration
    if (
      Math.abs(origin.latitude - destination.latitude) < 0.00005 &&
      Math.abs(origin.longitude - destination.longitude) < 0.00005
    ) {
      return {
        distanceMeters: 0,
        durationSeconds: 0,
        distanceKm: 0,
        durationMinutes: 0,
        distanceType: 'road',
        geometry: [[origin.latitude, origin.longitude]],
        provider: 'osrm_exact_match'
      };
    }

    // 2. Check Cache
    const cacheKey = makeCacheKey(origin, destination, mode, 'osrm');
    const cached = ROUTE_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    // 3. Map TravelMode to OSRM profile
    // OSRM standard profiles: 'car' or 'driving', 'foot' or 'walking', 'bike' or 'bicycle'
    let profile = 'driving';
    if (mode === 'walking') profile = 'foot';
    else if (mode === 'cycling') profile = 'bike';

    const coordsParam = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const url = `${this.baseUrl}/route/v1/${profile}/${coordsParam}?overview=full&geometries=geojson`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSRM HTTP status: ${response.status}`);
      }

      const data: any = await response.json();

      if (!data?.routes || data.routes.length === 0) {
        throw new Error('OSRM returned no route');
      }

      const primaryRoute = data.routes[0];
      const distanceMeters = primaryRoute.distance || 0;
      const durationSeconds = primaryRoute.duration || 0;
      const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

      // GeoJSON coordinates in OSRM are [lng, lat]; convert to [lat, lng] for Leaflet
      let geometry: [number, number][] = [];
      if (primaryRoute.geometry?.coordinates && Array.isArray(primaryRoute.geometry.coordinates)) {
        geometry = primaryRoute.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
      } else {
        geometry = [
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude]
        ];
      }

      const result: RouteResult = {
        distanceMeters,
        durationSeconds,
        distanceKm,
        durationMinutes,
        distanceType: 'road',
        geometry,
        provider: 'osrm'
      };

      // Store in Cache
      ROUTE_CACHE.set(cacheKey, {
        result,
        expiresAt: Date.now() + CACHE_TTL_MS
      });

      return result;
    } catch (err: any) {
      // Graceful, honest fallback to straight-line provider
      const fallback = await this.fallbackProvider.getRoute(origin, destination, mode);
      return {
        ...fallback,
        provider: 'haversine_fallback'
      };
    }
  }
}

// Global Authoritative Provider Instance
export const activeRouteProvider: RouteProvider = new OSRMRouteProvider();
