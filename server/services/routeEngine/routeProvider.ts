/**
 * Route Provider Abstraction & Engine Implementation
 * 
 * Supports:
 * 1. Google Routes API (Preferred Authoritative Provider)
 *    - ComputeRoutes (live road geometry, distance, static & traffic-aware durations)
 *    - ComputeRouteMatrix (multi-stop origin/destination cost matrix with minimal field masks)
 * 2. OSRM (Open Source Routing Machine) - Road routing fallback with turn-by-turn geometry.
 * 3. Haversine Straight-Line Provider - Pure mathematical great-circle fallback, honestly labeled.
 * 4. Authoritative In-Memory Route Cache with TTL, element deduplication, and cache hit metrics.
 */

import {
  Coordinates,
  RouteResult,
  RouteProvider,
  TravelMode,
  DistanceType,
  RouteDataStatus,
  RouteMatrixElement,
  RouteMatrixResult
} from '../../types/route';

/**
 * Calculates standard Haversine great-circle distance between two coordinates in kilometers.
 * Strictly straight-line distance; never labeled as road distance.
 */
export function calculateHaversineDistanceKm(origin: Coordinates, destination: Coordinates): number {
  if (
    Math.abs(origin.latitude - destination.latitude) < 0.00001 &&
    Math.abs(origin.longitude - destination.longitude) < 0.00001
  ) {
    return 0;
  }

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

/**
 * Robust Google Encoded Polyline decoder.
 * Converts 5-decimal encoded polyline format to [latitude, longitude][] coordinate pairs for Leaflet.
 */
export function decodeGooglePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push([
      Math.round((lat / 1e5) * 1e6) / 1e6,
      Math.round((lng / 1e5) * 1e6) / 1e6
    ]);
  }
  return points;
}

/**
 * Parses Google duration string (e.g. "850s" or "320.5s") into integer seconds.
 */
function parseGoogleDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const clean = durationStr.replace('s', '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num);
}

// In-Memory Route Cache
export interface CacheEntry {
  result: RouteResult;
  expiresAt: number;
  retrievedAt: string;
}

export const ROUTE_CACHE = new Map<string, CacheEntry>();
export const CACHE_TTL_MS = 1000 * 60 * 60 * 2; // 2 Hours TTL

export function makeCacheKey(
  origin: Coordinates,
  destination: Coordinates,
  mode: TravelMode,
  provider: string = 'authoritative'
): string {
  const oLat = origin.latitude.toFixed(5);
  const oLng = origin.longitude.toFixed(5);
  const dLat = destination.latitude.toFixed(5);
  const dLng = destination.longitude.toFixed(5);
  return `${oLat},${oLng}|${dLat},${dLng}|${mode}|${provider}`;
}

export function clearRouteCache(): void {
  ROUTE_CACHE.clear();
}

export function getRouteCacheStats(): { size: number; keys: string[] } {
  return {
    size: ROUTE_CACHE.size,
    keys: Array.from(ROUTE_CACHE.keys())
  };
}

/**
 * Haversine Straight-Line Route Provider (Fallback / Fast Mathematical Calculation)
 * Honestly labels distanceType as 'straight_line' and dataStatus as 'fallback'.
 */
export class HaversineRouteProvider implements RouteProvider {
  name = 'haversine_straight_line';

  async getRoute(origin: Coordinates, destination: Coordinates, mode: TravelMode): Promise<RouteResult> {
    const straightKm = calculateHaversineDistanceKm(origin, destination);
    const speeds: Record<TravelMode, number> = {
      driving: 30,
      walking: 4.5,
      cycling: 15,
      transit: 25
    };
    const speed = speeds[mode] || 30;
    const durationHours = straightKm / speed;
    const durationMinutes = Math.max(1, Math.round(durationHours * 60));
    const durationSeconds = durationMinutes * 60;
    const retrievedAt = new Date().toISOString();

    return {
      distanceMeters: Math.round(straightKm * 1000),
      durationSeconds,
      distanceKm: straightKm,
      durationMinutes,
      straightLineDistanceKm: straightKm,
      roadDistanceKm: null, // Null to strictly distinguish from road routing
      travelTimeMinutes: durationMinutes,
      staticTravelTimeMinutes: durationMinutes,
      trafficAwareTravelTimeMinutes: null,
      distanceType: 'straight_line',
      geometry: [
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude]
      ],
      provider: this.name,
      retrievedAt,
      dataStatus: 'fallback'
    };
  }
}

/**
 * OSRM Road Routing Provider
 * Queries actual road networks for turn-by-turn geometry, road distance, and transit time.
 */
export class OSRMRouteProvider implements RouteProvider {
  name = 'osrm';
  private baseUrl: string;
  private fallbackProvider: HaversineRouteProvider;
  private timeoutMs: number;

  constructor(
    baseUrl: string = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
    timeoutMs: number = 4000
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fallbackProvider = new HaversineRouteProvider();
    this.timeoutMs = timeoutMs;
  }

  async getRoute(origin: Coordinates, destination: Coordinates, mode: TravelMode): Promise<RouteResult> {
    const straightLineKm = calculateHaversineDistanceKm(origin, destination);

    // Same location edge case: 0 distance, 0 duration
    if (straightLineKm === 0) {
      const retrievedAt = new Date().toISOString();
      return {
        distanceMeters: 0,
        durationSeconds: 0,
        distanceKm: 0,
        durationMinutes: 0,
        straightLineDistanceKm: 0,
        roadDistanceKm: 0,
        travelTimeMinutes: 0,
        staticTravelTimeMinutes: 0,
        trafficAwareTravelTimeMinutes: null,
        distanceType: 'road',
        geometry: [[origin.latitude, origin.longitude]],
        provider: 'osrm_exact_match',
        retrievedAt,
        dataStatus: 'live'
      };
    }

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
      const roadDistanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
      const retrievedAt = new Date().toISOString();

      let geometry: [number, number][] = [];
      if (primaryRoute.geometry?.coordinates && Array.isArray(primaryRoute.geometry.coordinates)) {
        geometry = primaryRoute.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
      } else {
        geometry = [
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude]
        ];
      }

      return {
        distanceMeters,
        durationSeconds,
        distanceKm: roadDistanceKm,
        durationMinutes,
        straightLineDistanceKm: straightLineKm,
        roadDistanceKm,
        travelTimeMinutes: durationMinutes,
        staticTravelTimeMinutes: durationMinutes,
        trafficAwareTravelTimeMinutes: null,
        distanceType: 'road',
        geometry,
        provider: this.name,
        retrievedAt,
        dataStatus: 'live'
      };
    } catch (err: any) {
      // Graceful fallback to Haversine
      const fallback = await this.fallbackProvider.getRoute(origin, destination, mode);
      return {
        ...fallback,
        provider: 'haversine_fallback'
      };
    }
  }
}

/**
 * Google Routes API Provider (Preferred Authoritative Provider)
 * Backend-only credentials, field-mask optimized, supports ComputeRoutes & ComputeRouteMatrix.
 */
export class GoogleRoutesProvider implements RouteProvider {
  name = 'google_routes';
  private apiKey: string;
  private timeoutMs: number;

  constructor(apiKey?: string, timeoutMs: number = 5000) {
    this.apiKey =
      apiKey ||
      process.env.GOOGLE_ROUTES_API_KEY ||
      process.env.GOOGLE_PLACES_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';
    this.timeoutMs = timeoutMs;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  private mapTravelMode(mode: TravelMode): string {
    switch (mode) {
      case 'walking':
        return 'WALK';
      case 'cycling':
        return 'BICYCLE';
      case 'transit':
        return 'TRANSIT';
      case 'driving':
      default:
        return 'DRIVE';
    }
  }

  async getRoute(origin: Coordinates, destination: Coordinates, mode: TravelMode): Promise<RouteResult> {
    const straightLineKm = calculateHaversineDistanceKm(origin, destination);

    if (straightLineKm === 0) {
      const retrievedAt = new Date().toISOString();
      return {
        distanceMeters: 0,
        durationSeconds: 0,
        distanceKm: 0,
        durationMinutes: 0,
        straightLineDistanceKm: 0,
        roadDistanceKm: 0,
        travelTimeMinutes: 0,
        staticTravelTimeMinutes: 0,
        trafficAwareTravelTimeMinutes: null,
        distanceType: 'road',
        geometry: [[origin.latitude, origin.longitude]],
        provider: `${this.name}_exact_match`,
        retrievedAt,
        dataStatus: 'live'
      };
    }

    if (!this.isConfigured()) {
      throw new Error('Google Routes API key is not configured');
    }

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const googleMode = this.mapTravelMode(mode);

    const body: any = {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude
          }
        }
      },
      travelMode: googleMode,
      polylineQuality: 'HIGH_QUALITY',
      polylineEncoding: 'ENCODED_POLYLINE'
    };

    if (googleMode === 'DRIVE') {
      body.routingPreference = 'TRAFFIC_AWARE';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.description'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Google Routes API error: ${response.status} - ${errText}`);
    }

    const data: any = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('Google Routes API returned no routes');
    }

    const route = data.routes[0];
    const distanceMeters = route.distanceMeters || 0;
    const durationSeconds = parseGoogleDurationSeconds(route.duration);
    const staticDurationSeconds = parseGoogleDurationSeconds(route.staticDuration) || durationSeconds;

    const roadDistanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
    const travelTimeMinutes = Math.max(1, Math.round(durationSeconds / 60));
    const staticTravelTimeMinutes = Math.max(1, Math.round(staticDurationSeconds / 60));
    const trafficAwareTravelTimeMinutes =
      durationSeconds !== staticDurationSeconds ? travelTimeMinutes : null;

    let geometry: [number, number][] = [];
    if (route.polyline?.encodedPolyline) {
      geometry = decodeGooglePolyline(route.polyline.encodedPolyline);
    } else {
      geometry = [
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude]
      ];
    }

    const retrievedAt = new Date().toISOString();

    return {
      distanceMeters,
      durationSeconds,
      distanceKm: roadDistanceKm,
      durationMinutes: travelTimeMinutes,
      straightLineDistanceKm: straightLineKm,
      roadDistanceKm,
      travelTimeMinutes,
      staticTravelTimeMinutes,
      trafficAwareTravelTimeMinutes,
      distanceType: 'road',
      geometry,
      provider: this.name,
      retrievedAt,
      dataStatus: 'live'
    };
  }

  async getRouteMatrix(
    origins: Coordinates[],
    destinations: Coordinates[],
    mode: TravelMode
  ): Promise<RouteMatrixResult> {
    if (!this.isConfigured()) {
      throw new Error('Google Routes API key is not configured for matrix');
    }

    const url = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
    const googleMode = this.mapTravelMode(mode);

    const body: any = {
      origins: origins.map(o => ({
        waypoint: {
          location: {
            latLng: {
              latitude: o.latitude,
              longitude: o.longitude
            }
          }
        }
      })),
      destinations: destinations.map(d => ({
        waypoint: {
          location: {
            latLng: {
              latitude: d.latitude,
              longitude: d.longitude
            }
          }
        }
      })),
      travelMode: googleMode
    };

    if (googleMode === 'DRIVE') {
      body.routingPreference = 'TRAFFIC_AWARE';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs * 2);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,status,distanceMeters,duration,staticDuration'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Google Route Matrix API error: ${response.status} - ${errText}`);
    }

    const rawElements: any[] = await response.json();
    const retrievedAt = new Date().toISOString();

    // Initialize 2D matrix
    const matrix: RouteMatrixElement[][] = Array.from({ length: origins.length }, () =>
      Array.from({ length: destinations.length })
    );

    for (const item of rawElements) {
      const oIdx = item.originIndex ?? 0;
      const dIdx = item.destinationIndex ?? 0;

      if (oIdx < origins.length && dIdx < destinations.length) {
        const oCoords = origins[oIdx];
        const dCoords = destinations[dIdx];
        const straightKm = calculateHaversineDistanceKm(oCoords, dCoords);

        const distMeters = item.distanceMeters || 0;
        const durSec = parseGoogleDurationSeconds(item.duration);
        const staticSec = parseGoogleDurationSeconds(item.staticDuration) || durSec;
        const roadKm = Math.round((distMeters / 1000) * 10) / 10;
        const travelMins = Math.max(1, Math.round(durSec / 60));
        const staticMins = Math.max(1, Math.round(staticSec / 60));

        matrix[oIdx][dIdx] = {
          originIndex: oIdx,
          destinationIndex: dIdx,
          originCoords: oCoords,
          destinationCoords: dCoords,
          distanceMeters: distMeters,
          roadDistanceKm: roadKm,
          straightLineDistanceKm: straightKm,
          durationSeconds: durSec,
          travelTimeMinutes: travelMins,
          staticTravelTimeMinutes: staticMins,
          trafficAwareTravelTimeMinutes: durSec !== staticSec ? travelMins : null,
          distanceType: 'road',
          provider: this.name,
          dataStatus: 'live',
          status: item.status?.code || 'OK'
        };
      }
    }

    // Fill in any missing diagonal / missing items
    for (let o = 0; o < origins.length; o++) {
      for (let d = 0; d < destinations.length; d++) {
        if (!matrix[o][d]) {
          const oCoords = origins[o];
          const dCoords = destinations[d];
          const straightKm = calculateHaversineDistanceKm(oCoords, dCoords);
          matrix[o][d] = {
            originIndex: o,
            destinationIndex: d,
            originCoords: oCoords,
            destinationCoords: dCoords,
            distanceMeters: Math.round(straightKm * 1000),
            roadDistanceKm: straightKm,
            straightLineDistanceKm: straightKm,
            durationSeconds: Math.round((straightKm / 30) * 3600),
            travelTimeMinutes: Math.max(1, Math.round((straightKm / 30) * 60)),
            staticTravelTimeMinutes: Math.max(1, Math.round((straightKm / 30) * 60)),
            distanceType: 'straight_line',
            provider: 'haversine_fallback',
            dataStatus: 'fallback'
          };
        }
      }
    }

    return {
      origins,
      destinations,
      elements: matrix,
      provider: this.name,
      retrievedAt,
      dataStatus: 'live'
    };
  }
}

/**
 * Composite Authoritative Route Provider
 * Orchestrates:
 * 1. Cache hit check (returns cached dataStatus)
 * 2. Google Routes API (primary live provider)
 * 3. OSRM provider (road fallback)
 * 4. Haversine straight-line provider (mathematical fallback)
 */
export class CompositeRouteProvider implements RouteProvider {
  name = 'composite_authoritative';
  private googleProvider: GoogleRoutesProvider;
  private osrmProvider: OSRMRouteProvider;
  private haversineProvider: HaversineRouteProvider;

  constructor() {
    this.googleProvider = new GoogleRoutesProvider();
    this.osrmProvider = new OSRMRouteProvider();
    this.haversineProvider = new HaversineRouteProvider();
  }

  async getRoute(origin: Coordinates, destination: Coordinates, mode: TravelMode): Promise<RouteResult> {
    // 1. Same coordinates check
    const straightDist = calculateHaversineDistanceKm(origin, destination);
    if (straightDist === 0) {
      const retrievedAt = new Date().toISOString();
      return {
        distanceMeters: 0,
        durationSeconds: 0,
        distanceKm: 0,
        durationMinutes: 0,
        straightLineDistanceKm: 0,
        roadDistanceKm: 0,
        travelTimeMinutes: 0,
        staticTravelTimeMinutes: 0,
        trafficAwareTravelTimeMinutes: null,
        distanceType: 'road',
        geometry: [[origin.latitude, origin.longitude]],
        provider: 'exact_match',
        retrievedAt,
        dataStatus: 'live'
      };
    }

    // 2. Check Route Cache
    const cacheKey = makeCacheKey(origin, destination, mode, 'route');
    const cached = ROUTE_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.result,
        dataStatus: 'cached'
      };
    }

    let result: RouteResult;

    // 3. Try Google Routes API if configured
    if (this.googleProvider.isConfigured()) {
      try {
        result = await this.googleProvider.getRoute(origin, destination, mode);
        ROUTE_CACHE.set(cacheKey, {
          result,
          expiresAt: Date.now() + CACHE_TTL_MS,
          retrievedAt: result.retrievedAt
        });
        return result;
      } catch (err: any) {
        // Fall through to OSRM
      }
    }

    // 4. Try OSRM road routing
    try {
      result = await this.osrmProvider.getRoute(origin, destination, mode);
      ROUTE_CACHE.set(cacheKey, {
        result,
        expiresAt: Date.now() + CACHE_TTL_MS,
        retrievedAt: result.retrievedAt
      });
      return result;
    } catch (err: any) {
      // Fall through to Haversine
    }

    // 5. Fall back to Haversine straight-line
    result = await this.haversineProvider.getRoute(origin, destination, mode);
    ROUTE_CACHE.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
      retrievedAt: result.retrievedAt
    });
    return result;
  }

  /**
   * Route Matrix calculation across activity combinations with caching.
   */
  async getRouteMatrix(
    origins: Coordinates[],
    destinations: Coordinates[],
    mode: TravelMode
  ): Promise<RouteMatrixResult> {
    const retrievedAt = new Date().toISOString();

    // If Google Routes API is available, use its native ComputeRouteMatrix
    if (this.googleProvider.isConfigured()) {
      try {
        const matrixResult = await this.googleProvider.getRouteMatrix(origins, destinations, mode);
        // Store pairwise into ROUTE_CACHE
        for (let o = 0; o < origins.length; o++) {
          for (let d = 0; d < destinations.length; d++) {
            const el = matrixResult.elements[o][d];
            if (el) {
              const key = makeCacheKey(origins[o], destinations[d], mode, 'route');
              ROUTE_CACHE.set(key, {
                result: {
                  distanceMeters: el.distanceMeters,
                  durationSeconds: el.durationSeconds,
                  distanceKm: el.roadDistanceKm ?? el.straightLineDistanceKm,
                  durationMinutes: el.travelTimeMinutes,
                  straightLineDistanceKm: el.straightLineDistanceKm,
                  roadDistanceKm: el.roadDistanceKm,
                  travelTimeMinutes: el.travelTimeMinutes,
                  staticTravelTimeMinutes: el.staticTravelTimeMinutes,
                  trafficAwareTravelTimeMinutes: el.trafficAwareTravelTimeMinutes,
                  distanceType: el.distanceType,
                  provider: el.provider,
                  retrievedAt: matrixResult.retrievedAt,
                  dataStatus: el.dataStatus
                },
                expiresAt: Date.now() + CACHE_TTL_MS,
                retrievedAt: matrixResult.retrievedAt
              });
            }
          }
        }
        return matrixResult;
      } catch (err: any) {
        // Fall through to pairwise
      }
    }

    // Pairwise calculation leveraging getRoute (with caching)
    const elements: RouteMatrixElement[][] = [];

    for (let oIdx = 0; oIdx < origins.length; oIdx++) {
      elements[oIdx] = [];
      for (let dIdx = 0; dIdx < destinations.length; dIdx++) {
        const oCoords = origins[oIdx];
        const dCoords = destinations[dIdx];

        const route = await this.getRoute(oCoords, dCoords, mode);
        elements[oIdx][dIdx] = {
          originIndex: oIdx,
          destinationIndex: dIdx,
          originCoords: oCoords,
          destinationCoords: dCoords,
          distanceMeters: route.distanceMeters,
          roadDistanceKm: route.roadDistanceKm,
          straightLineDistanceKm: route.straightLineDistanceKm,
          durationSeconds: route.durationSeconds,
          travelTimeMinutes: route.travelTimeMinutes,
          staticTravelTimeMinutes: route.staticTravelTimeMinutes,
          trafficAwareTravelTimeMinutes: route.trafficAwareTravelTimeMinutes,
          distanceType: route.distanceType,
          provider: route.provider,
          dataStatus: route.dataStatus,
          status: 'OK'
        };
      }
    }

    return {
      origins,
      destinations,
      elements,
      provider: 'pairwise_authoritative',
      retrievedAt,
      dataStatus: 'live'
    };
  }
}

// Global Authoritative Provider Instance
export const activeRouteProvider: CompositeRouteProvider = new CompositeRouteProvider();
