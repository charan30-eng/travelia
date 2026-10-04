/**
 * TRAVELIA EXTERNAL PROVIDER RELIABILITY FRAMEWORK — PHASE 9
 * 
 * CORE PRINCIPLE:
 * Provides a resilient execution wrapper across all external providers:
 * - Strict timeout enforcement (never hang requests)
 * - Safe retries with exponential backoff for idempotent operations
 * - Transparent fallback invocation with audit trail
 * - Integrated cache hit/miss tracking
 * - Standardized error classification
 * - Provider status reporting for operational health checks
 */

import { metricsService } from './metricsService';

export type ProviderErrorCode = 
  | 'TIMEOUT' 
  | 'NETWORK_ERROR' 
  | 'RATE_LIMITED' 
  | 'AUTH_ERROR' 
  | 'INVALID_RESPONSE' 
  | 'UPSTREAM_ERROR' 
  | 'FALLBACK_USED'
  | 'CIRCUIT_OPEN';

export type ProviderHealthState = 
  | 'healthy' 
  | 'degraded' 
  | 'unavailable' 
  | 'fallback' 
  | 'unconfigured';

export class ProviderError extends Error {
  public readonly provider: string;
  public readonly code: ProviderErrorCode;
  public readonly isRetryable: boolean;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(params: {
    provider: string;
    code: ProviderErrorCode;
    message: string;
    isRetryable?: boolean;
    statusCode?: number;
    details?: any;
  }) {
    super(`[${params.provider}] ${params.code}: ${params.message}`);
    this.name = 'ProviderError';
    this.provider = params.provider;
    this.code = params.code;
    this.isRetryable = params.isRetryable ?? (params.code === 'TIMEOUT' || params.code === 'NETWORK_ERROR' || params.code === 'UPSTREAM_ERROR');
    this.statusCode = params.statusCode ?? (params.code === 'TIMEOUT' ? 504 : params.code === 'RATE_LIMITED' ? 429 : 502);
    this.details = params.details;
    this.timestamp = new Date().toISOString();
  }
}

export interface ProviderStatusSummary {
  provider: string;
  status: ProviderHealthState;
  configured: boolean;
  fallbackAvailable: boolean;
  consecutiveFailures: number;
  successRate: number;
  avgLatencyMs: number;
  lastChecked: string;
  lastError?: string;
}

// In-memory provider status registry
class ProviderRegistry {
  private statuses: Map<string, {
    status: ProviderHealthState;
    configured: boolean;
    fallbackAvailable: boolean;
    consecutiveFailures: number;
    totalSuccess: number;
    totalFailures: number;
    lastError?: string;
    lastChecked: string;
  }> = new Map();

  public register(provider: string, configured: boolean, fallbackAvailable: boolean) {
    if (!this.statuses.has(provider)) {
      this.statuses.set(provider, {
        status: configured ? 'healthy' : 'unconfigured',
        configured,
        fallbackAvailable,
        consecutiveFailures: 0,
        totalSuccess: 0,
        totalFailures: 0,
        lastChecked: new Date().toISOString()
      });
    }
  }

  public recordSuccess(provider: string) {
    if (!this.statuses.has(provider)) {
      this.register(provider, true, true);
    }
    const s = this.statuses.get(provider);
    if (s) {
      s.consecutiveFailures = 0;
      s.totalSuccess++;
      s.status = 'healthy';
      s.lastChecked = new Date().toISOString();
    }
  }

  public recordFailure(provider: string, error: ProviderError) {
    if (!this.statuses.has(provider)) {
      this.register(provider, true, true);
    }
    const s = this.statuses.get(provider);
    if (s) {
      s.consecutiveFailures++;
      s.totalFailures++;
      s.lastError = error.message;
      s.lastChecked = new Date().toISOString();

      if (s.consecutiveFailures >= 3) {
        s.status = s.fallbackAvailable ? 'fallback' : 'unavailable';
      } else {
        s.status = 'degraded';
      }
    }
  }

  public getSummary(): ProviderStatusSummary[] {
    const result: ProviderStatusSummary[] = [];
    const snapshot = metricsService.getSnapshot();

    this.statuses.forEach((val, provider) => {
      const metric = snapshot.providers.find(p => p.provider === provider);
      const totalCalls = (val.totalSuccess + val.totalFailures);
      const rate = totalCalls > 0 ? Math.round((val.totalSuccess / totalCalls) * 100) : 100;

      result.push({
        provider,
        status: val.status,
        configured: val.configured,
        fallbackAvailable: val.fallbackAvailable,
        consecutiveFailures: val.consecutiveFailures,
        successRate: rate,
        avgLatencyMs: metric?.avgLatencyMs || 0,
        lastChecked: val.lastChecked,
        lastError: val.lastError
      });
    });

    return result;
  }
}

export const providerRegistry = new ProviderRegistry();

// Initialize default known external providers
providerRegistry.register('google_places', Boolean(process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY), true);
providerRegistry.register('google_routes', Boolean(process.env.GOOGLE_ROUTES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY), true);
providerRegistry.register('osrm', true, true);
providerRegistry.register('open_meteo', true, true);
providerRegistry.register('open_exchange', true, true);
providerRegistry.register('gemini_ai', Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'), true);

export interface ReliabilityOptions<T> {
  provider: string;
  operationName: string;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  isSafeToRetry?: (err: any) => boolean;
  fn: (signal?: AbortSignal) => Promise<T>;
  fallback?: (error: ProviderError) => Promise<T> | T;
  cacheGet?: () => T | null | Promise<T | null>;
  cachePut?: (result: T) => void | Promise<void>;
  subsystem?: string;
}

/**
 * Execute an external provider operation with timeout, retries, fallback, and metrics
 */
export async function executeWithReliability<T>(options: ReliabilityOptions<T>): Promise<T> {
  const {
    provider,
    operationName,
    timeoutMs = 5000,
    retries = 1,
    backoffMs = 200,
    fn,
    fallback,
    cacheGet,
    cachePut,
    subsystem = provider
  } = options;

  // 1. Cache Check
  if (cacheGet) {
    try {
      const cached = await cacheGet();
      if (cached !== null && cached !== undefined) {
        metricsService.recordCacheHit(subsystem);
        return cached;
      }
    } catch {
      // Non-fatal cache read error: proceed to fetch
    }
    metricsService.recordCacheMiss(subsystem);
  }

  const startTime = Date.now();
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timer);

      const durationMs = Date.now() - startTime;
      metricsService.recordProviderCall(provider, durationMs, 'success');
      providerRegistry.recordSuccess(provider);

      // Save to cache asynchronously if provided
      if (cachePut) {
        try {
          await cachePut(result);
        } catch {
          // Non-fatal cache write error
        }
      }

      return result;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;

      // Classify error
      let code: ProviderErrorCode = 'NETWORK_ERROR';
      let message = err.message || 'Provider request failed';

      if (err.name === 'AbortError' || err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err.message?.includes('aborted')) {
        code = 'TIMEOUT';
        message = `Provider request timed out after ${timeoutMs}ms`;
      } else if (err.status === 429 || err.statusCode === 429 || err.message?.includes('rate limit') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        code = 'RATE_LIMITED';
      } else if (err.status === 401 || err.status === 403 || err.message?.includes('API key') || err.message?.includes('unauthorized')) {
        code = 'AUTH_ERROR';
      } else if (err.status >= 500) {
        code = 'UPSTREAM_ERROR';
      }

      const isRetryable = options.isSafeToRetry 
        ? options.isSafeToRetry(err) 
        : (code === 'TIMEOUT' || code === 'NETWORK_ERROR' || code === 'UPSTREAM_ERROR');

      // Retry if safe and attempts remain
      if (attempt <= retries && isRetryable) {
        const sleepTime = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(res => setTimeout(res, sleepTime));
        continue;
      }

      // Final failure for this provider call
      const durationMs = Date.now() - startTime;
      const providerError = new ProviderError({
        provider,
        code,
        message,
        isRetryable,
        statusCode: err.status || err.statusCode,
        details: { operationName, attempts: attempt, durationMs }
      });

      // Try fallback if provided
      if (fallback) {
        try {
          metricsService.recordProviderCall(provider, durationMs, 'fallback', message);
          providerRegistry.recordFailure(provider, providerError);
          const fallbackResult = await fallback(providerError);
          return fallbackResult;
        } catch (fallbackErr: any) {
          // Fallback itself failed
          metricsService.recordProviderCall(provider, durationMs, 'failure', fallbackErr.message);
          throw fallbackErr;
        }
      }

      // No fallback: report failure and rethrow standardized error
      metricsService.recordProviderCall(provider, durationMs, 'failure', message);
      providerRegistry.recordFailure(provider, providerError);
      throw providerError;
    }
  }

  // Fallback fallback if loop finishes unexpectedly
  throw new ProviderError({
    provider,
    code: 'UPSTREAM_ERROR',
    message: lastError?.message || 'Operation failed after retries'
  });
}
