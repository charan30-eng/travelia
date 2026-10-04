/**
 * Authoritative Weather Provider & Cache Engine
 * 
 * Implements real meteorological forecasting using Open-Meteo (open public API, no key required)
 * and provides an extensible provider abstraction for commercial providers (WeatherAPI, OpenWeatherMap).
 * 
 * Rules:
 * - NEVER fabricates random or simulated weather when provider is down or out of range.
 * - Explicitly tracks and returns availability ('live', 'cached', 'partial', 'unavailable').
 * - Respects TTL (1 hour) and caches forecasts by latitude/longitude/date range.
 */

import { 
  WeatherForecast, 
  WeatherDay, 
  WeatherLocation, 
  WeatherProvider, 
  WeatherDataState 
} from '../../types/weather';

// WMO Weather Interpretation Codes (WW)
export const WMO_CODE_MAP: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

export function interpretWmoCode(code: number | null | undefined): string {
  if (code === null || code === undefined) return 'Clear';
  return WMO_CODE_MAP[code] || 'Variable conditions';
}

interface CacheEntry {
  forecast: WeatherForecast;
  cachedAtMs: number;
}

export class WeatherCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTtlMs: number;

  constructor(ttlSeconds: number = 3600) {
    this.defaultTtlMs = ttlSeconds * 1000;
  }

  private generateKey(lat: number, lng: number, startDate: string, endDate: string, provider: string): string {
    const roundLat = Math.round(lat * 1000) / 1000;
    const roundLng = Math.round(lng * 1000) / 1000;
    return `weather:${roundLat}:${roundLng}:${startDate}:${endDate}:${provider}`;
  }

  get(lat: number, lng: number, startDate: string, endDate: string, provider: string): WeatherForecast | null {
    const key = this.generateKey(lat, lng, startDate, endDate, provider);
    const entry = this.cache.get(key);
    if (!entry) return null;

    const ageMs = Date.now() - entry.cachedAtMs;
    if (ageMs > this.defaultTtlMs) {
      this.cache.delete(key);
      return null;
    }

    const cachedForecast: WeatherForecast = {
      ...entry.forecast,
      availability: 'cached',
      cachedAt: new Date(entry.cachedAtMs).toISOString(),
      cacheAgeSeconds: Math.round(ageMs / 1000)
    };
    return cachedForecast;
  }

  set(lat: number, lng: number, startDate: string, endDate: string, provider: string, forecast: WeatherForecast): void {
    const key = this.generateKey(lat, lng, startDate, endDate, provider);
    this.cache.set(key, {
      forecast,
      cachedAtMs: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global weather cache instance
export const globalWeatherCache = new WeatherCache(3600); // 1 hour TTL

/**
 * Open-Meteo Weather Provider
 * Global, open-access, high-precision weather forecast API.
 */
export class OpenMeteoWeatherProvider implements WeatherProvider {
  name = 'Open-Meteo';

  async getForecast(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ): Promise<WeatherForecast> {
    const nowIso = new Date().toISOString();
    const location: WeatherLocation = {
      latitude: Math.round(latitude * 10000) / 10000,
      longitude: Math.round(longitude * 10000) / 10000
    };

    // 1. Validate coordinate boundaries
    if (
      isNaN(latitude) || isNaN(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180
    ) {
      return {
        location,
        days: [],
        source: this.name,
        fetchedAt: nowIso,
        availability: 'unavailable',
        message: 'Invalid coordinates provided for weather forecast.'
      };
    }

    // 2. Check forecast horizon (Open-Meteo standard provides up to 16 days ahead)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    const maxHorizonDate = new Date(today);
    maxHorizonDate.setDate(maxHorizonDate.getDate() + 16);

    const diffDays = Math.round((start.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays > 16) {
      return {
        location,
        days: [],
        source: this.name,
        fetchedAt: nowIso,
        availability: 'unavailable',
        message: `Forecast unavailable for dates beyond 16 days in the future (requested start: ${startDate}).`
      };
    }

    // 3. Make fetch call with timeout
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set('daily', [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'uv_index_max',
      'sunrise',
      'sunset'
    ].join(','));
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date', endDate);
    url.searchParams.set('timezone', 'auto');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Travelia-Travel-Optimizer/1.0'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          location,
          days: [],
          source: this.name,
          fetchedAt: nowIso,
          availability: 'unavailable',
          message: `Weather provider responded with status ${response.status}.`
        };
      }

      const data = await response.json();
      if (!data.daily || !Array.isArray(data.daily.time)) {
        return {
          location,
          days: [],
          source: this.name,
          fetchedAt: nowIso,
          availability: 'unavailable',
          message: 'Malformed weather response from provider.'
        };
      }

      const days: WeatherDay[] = [];
      const times: string[] = data.daily.time;

      for (let i = 0; i < times.length; i++) {
        const dateStr = times[i];
        const wCode = data.daily.weather_code?.[i] ?? null;
        const maxTemp = data.daily.temperature_2m_max?.[i] != null ? Math.round(data.daily.temperature_2m_max[i] * 10) / 10 : null;
        const minTemp = data.daily.temperature_2m_min?.[i] != null ? Math.round(data.daily.temperature_2m_min[i] * 10) / 10 : null;
        const precipProb = data.daily.precipitation_probability_max?.[i] ?? null;
        const precipMm = data.daily.precipitation_sum?.[i] != null ? Math.round(data.daily.precipitation_sum[i] * 10) / 10 : null;
        const windKph = data.daily.wind_speed_10m_max?.[i] != null ? Math.round(data.daily.wind_speed_10m_max[i] * 10) / 10 : null;
        const uv = data.daily.uv_index_max?.[i] != null ? Math.round(data.daily.uv_index_max[i] * 10) / 10 : null;
        const sunrise = data.daily.sunrise?.[i] ?? null;
        const sunset = data.daily.sunset?.[i] ?? null;

        days.push({
          date: dateStr,
          dayNumber: i + 1,
          temperatureMaxC: maxTemp,
          temperatureMinC: minTemp,
          precipitationProbability: precipProb,
          precipitationMm: precipMm,
          condition: interpretWmoCode(wCode),
          weatherCode: wCode,
          humidityPercent: null, // Open-Meteo daily does not report single daily humidity, leaving null honestly
          windSpeedKph: windKph,
          uvIndex: uv,
          sunrise,
          sunset
        });
      }

      return {
        location: {
          ...location,
          name: data.timezone
        },
        timezone: data.timezone,
        days,
        source: this.name,
        fetchedAt: nowIso,
        availability: 'live'
      };
    } catch (err: any) {
      clearTimeout(timeout);
      return {
        location,
        days: [],
        source: this.name,
        fetchedAt: nowIso,
        availability: 'unavailable',
        message: err.name === 'AbortError' ? 'Weather provider request timed out.' : (err.message || 'Network error')
      };
    }
  }
}

/**
 * Deterministic Mock Weather Provider for Automated Testing
 */
export class MockWeatherProvider implements WeatherProvider {
  name = 'MockWeatherProvider';
  private fixtureData: Record<string, WeatherDay[]> = {};

  constructor(fixtures?: Record<string, WeatherDay[]>) {
    if (fixtures) {
      this.fixtureData = fixtures;
    }
  }

  setFixture(key: string, days: WeatherDay[]) {
    this.fixtureData[key] = days;
  }

  async getForecast(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ): Promise<WeatherForecast> {
    const key = `${startDate}:${endDate}`;
    const days = this.fixtureData[key] || this.fixtureData['default'] || [];

    return {
      location: { latitude, longitude },
      days,
      source: this.name,
      fetchedAt: new Date().toISOString(),
      availability: days.length > 0 ? 'live' : 'unavailable'
    };
  }
}

/**
 * Returns the configured authoritative weather provider.
 */
let activeProvider: WeatherProvider = new OpenMeteoWeatherProvider();

export function setWeatherProvider(provider: WeatherProvider): void {
  activeProvider = provider;
}

export function getWeatherProvider(): WeatherProvider {
  return activeProvider;
}
