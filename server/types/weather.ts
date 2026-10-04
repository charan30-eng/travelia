/**
 * Authoritative Weather Types and Models for Travelia
 * 
 * Strict separation of concerns:
 * - Weather provider fetches factual forecast data.
 * - Weather normalizer ensures standard format across providers.
 * - Weather impact engine determines impact on activities deterministically.
 */

export type WeatherDataState = 'live' | 'cached' | 'partial' | 'unavailable';

export interface WeatherLocation {
  latitude: number;
  longitude: number;
  name?: string;
  country?: string;
}

export interface WeatherDay {
  date: string;                       // YYYY-MM-DD
  dayNumber?: number;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  precipitationProbability: number | null; // 0 - 100 (%)
  precipitationMm: number | null;     // Millimeters of rain/snow
  condition: string | null;           // e.g. "Sunny", "Partly Cloudy", "Rain", "Thunderstorm"
  weatherCode?: number | null;        // WMO code (e.g. 0, 1, 61, 95)
  humidityPercent: number | null;     // Relative humidity %
  windSpeedKph: number | null;        // Max wind speed in km/h
  uvIndex?: number | null;            // UV index max
  sunrise?: string | null;            // ISO timestamp or HH:mm
  sunset?: string | null;             // ISO timestamp or HH:mm
}

export interface WeatherAlert {
  title: string;
  severity?: 'minor' | 'moderate' | 'severe' | 'extreme';
  start: string;
  end: string;
  description?: string;
}

export interface WeatherForecast {
  location: WeatherLocation;
  timezone?: string;
  days: WeatherDay[];
  source: string;                     // e.g. "Open-Meteo", "WeatherAPI", "MockFixture"
  fetchedAt: string;                  // ISO timestamp
  availability: WeatherDataState;     // 'live' | 'cached' | 'partial' | 'unavailable'
  cachedAt?: string;
  cacheAgeSeconds?: number;
  alerts?: WeatherAlert[];
  message?: string;
}

export interface WeatherProvider {
  name: string;
  getForecast(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ): Promise<WeatherForecast>;
}

export type ActivityWeatherProfile = 'outdoor' | 'indoor' | 'mixed' | 'unknown';

export interface WeatherImpactConfig {
  highRainProbability: number;       // % threshold for high precipitation risk (e.g. 60)
  moderateRainProbability: number;   // % threshold for moderate risk (e.g. 35)
  heavyPrecipitationMm: number;      // mm threshold for heavy rain (e.g. 5.0)
  highWindKph: number;               // km/h threshold for high winds (e.g. 35.0)
  extremeHeatC: number;              // °C threshold for heat alerts (e.g. 38.0)
  extremeColdC: number;              // °C threshold for cold alerts (e.g. 5.0)
}

export interface WeatherImpact {
  activityId: string;
  activityName: string;
  time?: string;
  profile: ActivityWeatherProfile;
  severity: 'none' | 'low' | 'moderate' | 'high';
  reasons: string[];
  affected: boolean;
  precipitationProbability?: number | null;
  precipitationMm?: number | null;
  temperature?: number | null;
  windSpeedKph?: number | null;
  recommendedAction: 'keep' | 'monitor' | 'reschedule' | 'replace' | 'unavailable';
}

export interface WeatherDayEvaluation {
  dayNumber: number;
  date: string;
  forecast: WeatherDay | null;
  availability: WeatherDataState;
  impacts: WeatherImpact[];
  affectedCount: number;
  severeCount: number;
  outdoorCount: number;
  indoorCount: number;
  aiAdvisory: string;
  recommendedTime?: string;
}
