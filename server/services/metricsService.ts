/**
 * TRAVELIA OPERATIONAL METRICS & OBSERVABILITY SERVICE — PHASE 9
 * 
 * CORE PRINCIPLES:
 * 1. Tracks essential operational metrics:
 *    - Request latency & counts
 *    - Provider latency & failures
 *    - Cache hits and misses
 *    - AI request failures
 *    - Specific domain request counts (routes, places, weather)
 * 2. Privacy & Security: NEVER logs API keys, provider secrets, auth tokens, or passwords.
 * 3. In-memory, non-blocking, zero external dependencies.
 */

import { Request, Response, NextFunction } from 'express';

export interface ProviderMetricRecord {
  provider: string;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  fallbackCalls: number;
  totalLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  lastCalledAt?: string;
  lastFailureReason?: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  total: number;
  hitRatio: number;
}

export class MetricsService {
  private startTime = Date.now();
  private totalRequests = 0;
  private totalErrors = 0;
  private totalLatencyMs = 0;

  // Domain-specific counts
  private routeRequestCount = 0;
  private placesRequestCount = 0;
  private weatherRequestCount = 0;
  private aiRequestCount = 0;
  private aiFailureCount = 0;

  // Cache metrics per subsystem
  private cacheStats: Record<string, { hits: number; misses: number }> = {
    places: { hits: 0, misses: 0 },
    routes: { hits: 0, misses: 0 },
    weather: { hits: 0, misses: 0 },
    currency: { hits: 0, misses: 0 },
    hotels: { hits: 0, misses: 0 }
  };

  // Provider metrics
  private providerMetrics: Map<string, ProviderMetricRecord> = new Map();

  constructor() {
    this.initProvider('google_places');
    this.initProvider('google_routes');
    this.initProvider('osrm');
    this.initProvider('open_meteo');
    this.initProvider('open_exchange');
    this.initProvider('gemini_ai');
    this.initProvider('sqlite_db');
  }

  private initProvider(provider: string) {
    if (!this.providerMetrics.has(provider)) {
      this.providerMetrics.set(provider, {
        provider,
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
        fallbackCalls: 0,
        totalLatencyMs: 0,
        minLatencyMs: Infinity,
        maxLatencyMs: 0
      });
    }
  }

  // -------------------------------------------------------------------------
  // HTTP Request Observability
  // -------------------------------------------------------------------------
  public recordRequest(method: string, path: string, statusCode: number, durationMs: number) {
    this.totalRequests++;
    this.totalLatencyMs += durationMs;

    if (statusCode >= 400) {
      this.totalErrors++;
    }

    if (path.startsWith('/api/route')) this.routeRequestCount++;
    else if (path.startsWith('/api/places')) this.placesRequestCount++;
    else if (path.startsWith('/api/weather')) this.weatherRequestCount++;
    else if (path.startsWith('/api/ai')) this.aiRequestCount++;
  }

  // -------------------------------------------------------------------------
  // Provider Observability
  // -------------------------------------------------------------------------
  public recordProviderCall(
    provider: string,
    durationMs: number,
    status: 'success' | 'failure' | 'fallback',
    failureReason?: string
  ) {
    this.initProvider(provider);
    const m = this.providerMetrics.get(provider)!;

    m.totalCalls++;
    m.totalLatencyMs += durationMs;
    m.lastCalledAt = new Date().toISOString();

    if (durationMs < m.minLatencyMs) m.minLatencyMs = durationMs;
    if (durationMs > m.maxLatencyMs) m.maxLatencyMs = durationMs;

    if (status === 'success') {
      m.successCalls++;
    } else if (status === 'fallback') {
      m.fallbackCalls++;
    } else {
      m.failedCalls++;
      if (failureReason) {
        m.lastFailureReason = this.sanitizeLogMessage(failureReason);
      }
      if (provider === 'gemini_ai') {
        this.aiFailureCount++;
      }
    }
  }

  public recordAiFailure(reason?: string) {
    this.recordProviderCall('gemini_ai', 0, 'failure', reason);
  }

  // -------------------------------------------------------------------------
  // Cache Observability
  // -------------------------------------------------------------------------
  public recordCacheHit(subsystem: string) {
    if (!this.cacheStats[subsystem]) {
      this.cacheStats[subsystem] = { hits: 0, misses: 0 };
    }
    this.cacheStats[subsystem].hits++;
  }

  public recordCacheMiss(subsystem: string) {
    if (!this.cacheStats[subsystem]) {
      this.cacheStats[subsystem] = { hits: 0, misses: 0 };
    }
    this.cacheStats[subsystem].misses++;
  }

  public getCacheMetrics(subsystem?: string): CacheMetrics {
    if (subsystem && this.cacheStats[subsystem]) {
      const { hits, misses } = this.cacheStats[subsystem];
      const total = hits + misses;
      return {
        hits,
        misses,
        total,
        hitRatio: total > 0 ? Math.round((hits / total) * 100) / 100 : 0
      };
    }

    let totalHits = 0;
    let totalMisses = 0;
    for (const stat of Object.values(this.cacheStats)) {
      totalHits += stat.hits;
      totalMisses += stat.misses;
    }
    const grandTotal = totalHits + totalMisses;
    return {
      hits: totalHits,
      misses: totalMisses,
      total: grandTotal,
      hitRatio: grandTotal > 0 ? Math.round((totalHits / grandTotal) * 100) / 100 : 0
    };
  }

  // -------------------------------------------------------------------------
  // Metrics Snapshot Export
  // -------------------------------------------------------------------------
  public getSnapshot() {
    const uptimeSeconds = Math.round((Date.now() - this.startTime) / 1000);
    const avgLatency = this.totalRequests > 0 ? Math.round(this.totalLatencyMs / this.totalRequests) : 0;

    const providerList: any[] = [];
    this.providerMetrics.forEach((val) => {
      const avg = val.totalCalls > 0 ? Math.round(val.totalLatencyMs / val.totalCalls) : 0;
      providerList.push({
        provider: val.provider,
        totalCalls: val.totalCalls,
        successCalls: val.successCalls,
        failedCalls: val.failedCalls,
        fallbackCalls: val.fallbackCalls,
        avgLatencyMs: avg,
        minLatencyMs: val.minLatencyMs === Infinity ? 0 : val.minLatencyMs,
        maxLatencyMs: val.maxLatencyMs,
        lastCalledAt: val.lastCalledAt || null,
        lastFailureReason: val.lastFailureReason || null
      });
    });

    return {
      uptimeSeconds,
      requests: {
        total: this.totalRequests,
        errors: this.totalErrors,
        averageLatencyMs: avgLatency
      },
      counts: {
        routeRequests: this.routeRequestCount,
        placesRequests: this.placesRequestCount,
        weatherRequests: this.weatherRequestCount,
        aiRequests: this.aiRequestCount,
        aiFailures: this.aiFailureCount
      },
      cache: {
        overall: this.getCacheMetrics(),
        subsystems: {
          places: this.getCacheMetrics('places'),
          routes: this.getCacheMetrics('routes'),
          weather: this.getCacheMetrics('weather'),
          currency: this.getCacheMetrics('currency'),
          hotels: this.getCacheMetrics('hotels')
        }
      },
      providers: providerList
    };
  }

  // -------------------------------------------------------------------------
  // Sanitized Logger (Guaranteed Zero Secret Leakage)
  // -------------------------------------------------------------------------
  public sanitizeLogMessage(message: string): string {
    if (!message || typeof message !== 'string') return '';

    // Masks potential API keys, passwords, tokens, auth headers, and DB connection strings
    return message
      .replace(/AIza[0-9A-Za-z_\-]{16,40}/g, 'AIza[REDACTED_API_KEY]')
      .replace(/(key=|apiKey=|api_key=|token=|authorization:\s*bearer\s+)[A-Za-z0-9_\-\.]{8,}/gi, '$1[REDACTED]')
      .replace(/:\/\/([^:@\s]+):([^@\s]+)@/g, '://$1:[REDACTED_PASSWORD]@')
      .replace(/(password|secret|pass|pin)[\s:=]+[^\s,;&]+/gi, '$1=[REDACTED]')
      .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CARD_NUMBER]');
  }

  public safeLog(context: string, message: string, details?: any) {
    const cleanContext = this.sanitizeLogMessage(context);
    const cleanMessage = this.sanitizeLogMessage(message);

    if (details) {
      const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
      const cleanDetails = this.sanitizeLogMessage(detailsStr);
      console.log(`[${new Date().toISOString()}] [${cleanContext}] ${cleanMessage} | ${cleanDetails}`);
    } else {
      console.log(`[${new Date().toISOString()}] [${cleanContext}] ${cleanMessage}`);
    }
  }

  public resetForTesting() {
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.totalLatencyMs = 0;
    this.routeRequestCount = 0;
    this.placesRequestCount = 0;
    this.weatherRequestCount = 0;
    this.aiRequestCount = 0;
    this.aiFailureCount = 0;
    this.startTime = Date.now();
    for (const k of Object.keys(this.cacheStats)) {
      this.cacheStats[k] = { hits: 0, misses: 0 };
    }
    this.providerMetrics.clear();
    this.initProvider('google_places');
    this.initProvider('google_routes');
    this.initProvider('osrm');
    this.initProvider('open_meteo');
    this.initProvider('open_exchange');
    this.initProvider('gemini_ai');
    this.initProvider('sqlite_db');
  }
}

export const metricsService = new MetricsService();

export function sanitizeLogMessage(message: string): string {
  return metricsService.sanitizeLogMessage(message);
}

export function safeLog(context: string, message: string, details?: any) {
  metricsService.safeLog(context, message, details);
}

/**
 * Express middleware to record request latency and counts
 */
export function requestMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    metricsService.recordRequest(req.method, req.path, res.statusCode, duration);
  });

  next();
}
