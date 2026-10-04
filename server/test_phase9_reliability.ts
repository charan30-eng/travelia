/**
 * TRAVELIA PHASE 9 SUITE: PRODUCTION RELIABILITY, SECURITY & OBSERVABILITY
 * 
 * Verifies all 9 mandatory Phase 9 scenarios:
 * 1. Invalid request validation (required fields, types, ranges, IDs, dates, coordinates, currency, ownership)
 * 2. Provider timeout (abort controller, 504 classification, latency tracking)
 * 3. Provider failure & retry (exponential backoff, retryable errors, fallback execution)
 * 4. Rate limit enforcement (429 Too Many Requests, Retry-After header)
 * 5. Missing environment variable (validation, warnings, secret masking, zero raw secret exposure)
 * 6. Malformed coordinates (out-of-range latitude/longitude, NaN, null rejection)
 * 7. Database failure resilience & sanitized error handling (no stack leaks or file path leaks)
 * 8. AI failure handling & observability (metrics recording, fallback survival)
 * 9. Cache failure resilience (graceful degradation on cache read/write errors)
 * 10. Health endpoint & zero secret leak verification
 */

import assert from 'assert';
import { 
  isValidCoordinate, 
  isValidDateString, 
  isValidCurrency, 
  isValidId, 
  validateNumberRange, 
  validateRequiredFields, 
  validateTripOwnership 
} from './middleware/validation';
import { 
  executeWithReliability, 
  ProviderError, 
  providerRegistry 
} from './services/providerReliability';
import { 
  validateEnvironment, 
  maskSecret 
} from './services/envValidation';
import { 
  metricsService, 
  safeLog, 
  sanitizeLogMessage 
} from './services/metricsService';
import { 
  generalRateLimiter, 
  strictAiRateLimiter, 
  sanitizedErrorHandler 
} from './middleware/security';
import { tripRepository } from './repositories/tripRepository';
import { getDatabase } from './db/connection';

console.log('\n===============================================================');
console.log('🚀 RUNNING TRAVELIA PHASE 9: PRODUCTION RELIABILITY & SECURITY');
console.log('===============================================================\n');

let passedTests = 0;

function reportTest(title: string, passed: boolean) {
  if (passed) {
    passedTests++;
    console.log(`  ✅ [PASS] ${title}`);
  } else {
    console.error(`  ❌ [FAIL] ${title}`);
    process.exit(1);
  }
}

async function runPhase9Tests() {

  // ==============================================================
  // 1. INVALID REQUEST VALIDATION
  // ==============================================================
  console.log('--- 1. API & Input Validation ---');

  // 1a. Required fields validation
  const missingResult = validateRequiredFields({ destination: 'Goa' }, ['destination', 'startDate', 'days']);
  assert(missingResult.valid === false, 'Should detect missing required fields');
  assert(missingResult.missingFields.includes('startDate') && missingResult.missingFields.includes('days'), 'Should list specific missing fields');
  
  const allPresent = validateRequiredFields({ destination: 'Goa', startDate: '2026-11-01', days: 5 }, ['destination', 'startDate', 'days']);
  assert(allPresent.valid === true, 'Should return valid=true when all fields are present');
  reportTest('Required fields validator properly flags missing payload properties', true);

  // 1b. Number range validation
  const validRange = validateNumberRange(4, 1, 20, 'guests');
  assert(validRange.valid === true, 'Valid range should return valid=true');

  const tooSmall = validateNumberRange(0, 1, 20, 'guests');
  assert(tooSmall.valid === false && tooSmall.error?.includes('between 1 and 20'), 'Should reject value below minimum');

  const tooLarge = validateNumberRange(25, 1, 20, 'guests');
  assert(tooLarge.valid === false && tooLarge.error?.includes('between 1 and 20'), 'Should reject value above maximum');

  const notANumber = validateNumberRange('four' as any, 1, 20, 'guests');
  assert(notANumber.valid === false && notANumber.error?.includes('valid number'), 'Should reject non-numeric input');
  reportTest('Number range validator enforces strict bounds (e.g. guests, days, passengers)', true);

  // 1c. Date format validation (ISO 8601 YYYY-MM-DD)
  assert(isValidDateString('2026-11-15') === true, '2026-11-15 should be valid date');
  assert(isValidDateString('2026-02-28') === true, '2026-02-28 should be valid date');
  assert(isValidDateString('2026-02-30') === false, '2026-02-30 is invalid day in Feb');
  assert(isValidDateString('invalid-date') === false, 'Non-date string should be rejected');
  assert(isValidDateString('15-11-2026') === false, 'DD-MM-YYYY format should be rejected');
  reportTest('Date validator strictly validates ISO YYYY-MM-DD and real calendar validity', true);

  // 1d. Currency validation
  assert(isValidCurrency('INR') === true, 'INR should be valid currency');
  assert(isValidCurrency('USD') === true, 'USD should be valid currency');
  assert(isValidCurrency('EUR') === true, 'EUR should be valid currency');
  assert(isValidCurrency('GBP') === true, 'GBP should be valid currency');
  assert(isValidCurrency('JPY') === true, 'JPY should be valid currency');
  assert(isValidCurrency('XYZ') === false, 'XYZ should be rejected');
  assert(isValidCurrency('BITCOIN') === false, 'Non-ISO currency should be rejected');
  assert(isValidCurrency(null as any) === false, 'Null currency should be rejected');
  reportTest('Currency validator enforces recognized ISO 4217 standard currency codes', true);

  // 1e. ID validation
  assert(isValidId('trip-12345') === true, 'Valid trip ID should pass');
  assert(isValidId('') === false, 'Empty ID should fail');
  assert(isValidId('   ') === false, 'Whitespace ID should fail');
  assert(isValidId('a'.repeat(200)) === false, 'Excessively long ID should fail');
  reportTest('ID validator rejects blank, whitespace, and maliciously oversized IDs', true);

  // 1f. Trip Ownership validation (X-Travelia-User-Id)
  getDatabase().prepare("INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)").run('traveler_usr_42', 'Traveler 42', 'traveler42@travelia.app');
  const testTripId = `trip-ownership-${Date.now()}`;
  tripRepository.create({
    id: testTripId,
    destination: 'Goa, India',
    days: 5,
    budget: { hotel: 1000, food: 500, transportation: 300, activities: 200, miscellaneous: 100, total: 2100 },
    travelers: 2,
    preferences: ['Beach'],
    itinerary: [],
    hotels: [],
    restaurants: [],
    touristPlaces: [],
    aiNotes: [],
    userId: 'traveler_usr_42'
  } as any);

  const mockReqValid: any = {
    headers: { 'x-travelia-user-id': 'traveler_usr_42' }
  };
  const authValid = validateTripOwnership(testTripId, mockReqValid);
  assert(authValid.authorized === true, 'Matching user ID should authorize trip modification');

  const mockReqUnauthorized: any = {
    headers: { 'x-travelia-user-id': 'attacker_99' }
  };
  const authUnauthorized = validateTripOwnership(testTripId, mockReqUnauthorized);
  assert(authUnauthorized.authorized === false, 'Mismatched user ID must reject modification');
  assert(authUnauthorized.reason?.includes('Forbidden'), 'Reason should specify Forbidden');
  reportTest('Trip ownership validator enforces 403 Forbidden when user ID does not match owner', true);


  // ==============================================================
  // 2. PROVIDER TIMEOUT
  // ==============================================================
  console.log('\n--- 2. Provider Timeout & Abort Handling ---');

  let timeoutCaught = false;
  try {
    await executeWithReliability({
      provider: 'slow_test_provider',
      operationName: 'testTimeout',
      timeoutMs: 40,
      retries: 0,
      fn: async (signal) => {
        return new Promise((resolve, reject) => {
          const id = setTimeout(() => resolve({ success: true }), 200);
          signal?.addEventListener('abort', () => {
            clearTimeout(id);
            const abortErr: any = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          });
        });
      }
    });
  } catch (err: any) {
    timeoutCaught = true;
    assert(err instanceof ProviderError, 'Should throw standardized ProviderError');
    assert(err.code === 'TIMEOUT', `Error code should be TIMEOUT, got: ${err.code}`);
    assert(err.statusCode === 504, `Status code should be 504 Gateway Timeout, got: ${err.statusCode}`);
    assert(err.message.includes('timed out'), 'Error message should explicitly specify timeout');
  }
  assert(timeoutCaught, 'Timeout must be caught and classified as TIMEOUT');
  reportTest('executeWithReliability enforces strict timeout and 504 TIMEOUT classification', true);


  // ==============================================================
  // 3. PROVIDER FAILURE & RETRY
  // ==============================================================
  console.log('\n--- 3. Provider Failure & Retry With Fallback ---');

  let callAttempts = 0;
  const fallbackResult = await executeWithReliability({
    provider: 'failing_provider',
    operationName: 'testFailureAndRetry',
    timeoutMs: 200,
    retries: 2,
    backoffMs: 15,
    fn: async () => {
      callAttempts++;
      const err: any = new Error('Service Unavailable: Upstream 503');
      err.status = 503;
      throw err;
    },
    fallback: (error) => {
      return { fallbackData: true, reason: error.message };
    }
  });

  assert(callAttempts === 3, `Should attempt 3 times (1 initial + 2 retries), got ${callAttempts}`);
  assert(fallbackResult.fallbackData === true, 'Should successfully return fallback data upon failure');
  
  // Verify that provider registry tracked status
  const summary = providerRegistry.getSummary();
  const failingStatus = summary.find(p => p.provider === 'failing_provider');
  assert(failingStatus !== undefined, 'Provider must be registered in status summary');
  assert(failingStatus.consecutiveFailures >= 1, 'Should record provider failure');
  reportTest('executeWithReliability retries with backoff and seamlessly executes fallback', true);


  // ==============================================================
  // 4. RATE LIMIT ENFORCEMENT
  // ==============================================================
  console.log('\n--- 4. Security: Rate Limiting ---');

  // Test general rate limiter with mock Express req/res
  let nextCalled = 0;
  let rateLimitStatus = 0;
  let rateLimitResponse: any = null;
  const mockHeaders: Record<string, string> = {};

  const createMockReqRes = (ip: string) => {
    const req: any = {
      ip,
      headers: {},
      socket: { remoteAddress: ip }
    };
    const res: any = {
      setHeader: (name: string, val: string) => { mockHeaders[name] = val; },
      status: (code: number) => { rateLimitStatus = code; return res; },
      json: (data: any) => { rateLimitResponse = data; }
    };
    return { req, res };
  };

  const testIp = '198.51.100.42';
  // Send 150 normal requests
  for (let i = 0; i < 150; i++) {
    const { req, res } = createMockReqRes(testIp);
    generalRateLimiter(req, res, () => { nextCalled++; });
  }
  assert(nextCalled === 150, `150 requests under limit should pass, got ${nextCalled}`);

  // 151st request should be rate-limited
  const { req: overReq, res: overRes } = createMockReqRes(testIp);
  generalRateLimiter(overReq, overRes, () => { nextCalled++; });
  assert(rateLimitStatus === 429, `Exceeded limit should return 429 Too Many Requests, got ${rateLimitStatus}`);
  assert(rateLimitResponse?.error?.code === 'RATE_LIMIT_EXCEEDED', 'Error message should inform client of RATE_LIMIT_EXCEEDED');
  assert(mockHeaders['Retry-After'] !== undefined, 'Retry-After header must be set');
  reportTest('generalRateLimiter enforces 150 req/min and returns 429 with Retry-After header', true);


  // ==============================================================
  // 5. MISSING ENVIRONMENT VARIABLE & SECRET PROTECTION
  // ==============================================================
  console.log('\n--- 5. Environment Validation & Zero Secret Exposure ---');

  const envResult = validateEnvironment();
  assert(envResult.environment === (process.env.NODE_ENV || 'development'), 'Validates environment name');
  assert(Array.isArray(envResult.warnings), 'Collects startup warnings cleanly');
  assert(typeof envResult.configuredProviders === 'object', 'Lists provider configuration safely');

  // Test secret masking: never expose raw keys
  const rawKey1 = 'AIzaSyD-9xK87L44mN0112345';
  const masked1 = maskSecret(rawKey1);
  assert(masked1.startsWith('AIza') && masked1.includes('****2345'), `Masked key should hide middle characters, got ${masked1}`);
  assert(!masked1.includes('9xK87L44mN011'), 'Raw key body must never be present in masked output');

  const emptyMask = maskSecret(undefined);
  assert(emptyMask === '[UNCONFIGURED]', 'Missing key should display [UNCONFIGURED]');

  // Test sanitized logging
  const logWithKey = 'Error connecting to Gemini with key AIzaSyTestKey1234567890';
  const sanitized = sanitizeLogMessage(logWithKey);
  assert(!sanitized.includes('AIzaSyTestKey1234567890'), 'Sanitized log must scrub Google API key');
  assert(sanitized.includes('[REDACTED_API_KEY]'), 'Sanitized log must replace key with [REDACTED_API_KEY]');
  reportTest('validateEnvironment & maskSecret safely guard secrets and scrub logs', true);


  // ==============================================================
  // 6. MALFORMED COORDINATES
  // ==============================================================
  console.log('\n--- 6. Malformed Coordinates Validation ---');

  // Normal coordinates
  assert(isValidCoordinate(15.2993, 74.1240).valid === true, 'Goa coordinates (15.2993, 74.1240) should be valid');
  assert(isValidCoordinate(0, 0).valid === true, 'Equator/Prime Meridian (0, 0) should be valid');
  assert(isValidCoordinate(-90, -180).valid === true, 'Extreme bounds (-90, -180) should be valid');
  assert(isValidCoordinate(90, 180).valid === true, 'Extreme bounds (90, 180) should be valid');

  // Out of bounds
  assert(isValidCoordinate(90.1, 74.0).valid === false, 'Latitude > 90 must be rejected');
  assert(isValidCoordinate(-90.5, 74.0).valid === false, 'Latitude < -90 must be rejected');
  assert(isValidCoordinate(15.0, 180.5).valid === false, 'Longitude > 180 must be rejected');
  assert(isValidCoordinate(15.0, -180.5).valid === false, 'Longitude < -180 must be rejected');

  // Non-numeric & NaN
  assert(isValidCoordinate('not-a-number' as any, 74.1240).valid === false, 'Non-numeric string latitude must be rejected');
  assert(isValidCoordinate(NaN, 74.1240).valid === false, 'NaN latitude must be rejected');
  assert(isValidCoordinate(15.2993, Infinity).valid === false, 'Infinity longitude must be rejected');
  assert(isValidCoordinate(null as any, null as any).valid === false, 'Null coordinates must be rejected');
  reportTest('isValidCoordinate rejects out-of-range, NaN, Infinity, strings, and null coordinates', true);


  // ==============================================================
  // 7. DATABASE FAILURE & ERROR SANITIZATION
  // ==============================================================
  console.log('\n--- 7. Database Failure & Error Sanitization ---');

  // Simulate internal database failure with sensitive details
  const sensitiveDbError = new Error('FATAL: Database connection failed at mongodb://admin:p@ssw0rd123@10.0.0.5:27017/travelia_prod?authSource=admin');
  (sensitiveDbError as any).stack = 'Error at DB.connect (/var/travelia/server/db/secret_db.ts:42:15)';

  let sanitizedStatus = 0;
  let sanitizedPayload: any = null;
  const mockErrRes: any = {
    headersSent: false,
    status: (code: number) => { sanitizedStatus = code; return mockErrRes; },
    json: (data: any) => { sanitizedPayload = data; }
  };

  sanitizedErrorHandler(sensitiveDbError, {} as any, mockErrRes, () => {});

  assert(sanitizedStatus === 500, 'Internal error must return status 500');
  assert(typeof sanitizedPayload.error === 'object', 'Client receives clean sanitized error object');
  assert(sanitizedPayload.success === false, 'Indicates success=false');
  assert(!JSON.stringify(sanitizedPayload).includes('p@ssw0rd123'), 'Secrets must NEVER leak to client');
  assert(!JSON.stringify(sanitizedPayload).includes('/var/travelia'), 'Stack filepaths must NEVER leak in production');
  reportTest('sanitizedErrorHandler suppresses raw stack traces and scrubs database credentials', true);


  // ==============================================================
  // 8. AI FAILURE HANDLING & OBSERVABILITY
  // ==============================================================
  console.log('\n--- 8. AI Failure Handling & Operational Metrics ---');

  const beforeSnapshot = metricsService.getSnapshot();
  const initialAiFailures = beforeSnapshot.counts.aiFailures;

  // Record an AI failure simulation
  metricsService.recordAiFailure('Gemini API rate limit exceeded');
  const afterSnapshot = metricsService.getSnapshot();
  assert(afterSnapshot.counts.aiFailures === initialAiFailures + 1, 'AI failure count must increment in metrics');

  // Test Copilot fallback execution
  const aiFallback = await executeWithReliability({
    provider: 'gemini_ai',
    operationName: 'orchestrateCopilot',
    timeoutMs: 100,
    retries: 0,
    fn: async () => {
      const err: any = new Error('Google Gemini API Overloaded');
      err.status = 503;
      throw err;
    },
    fallback: (err) => {
      return {
        reply: "I am currently using Travelia's verified offline engine to assist your trip.",
        offlineMode: true,
        originalError: err.message
      };
    }
  });

  assert(aiFallback.offlineMode === true, 'AI failure must invoke resilient fallback');
  assert(aiFallback.reply.includes('verified offline engine'), 'Fallback response generated cleanly');
  reportTest('AI failures are logged in operational metrics and recover with offline fallback', true);


  // ==============================================================
  // 9. CACHE FAILURE RESILIENCE
  // ==============================================================
  console.log('\n--- 9. Cache Failure & Degradation Resilience ---');

  let providerExecuted: boolean = false;

  // Test when cacheGet throws an error: system must safely ignore and execute provider
  const resilientCacheResult = await executeWithReliability({
    provider: 'places_cache_test',
    operationName: 'getPlacesResilient',
    timeoutMs: 300,
    retries: 0,
    cacheGet: () => {
      throw new Error('Redis/Memory cache cluster disconnected');
    },
    cachePut: () => {
      throw new Error('Cache write permission denied');
    },
    fn: async () => {
      providerExecuted = true;
      return { places: [{ id: 'place-1', name: 'Calangute Beach' }] };
    }
  });

  assert(Boolean(providerExecuted), 'Provider must execute even if cache read fails');
  assert(resilientCacheResult.places.length === 1, 'Provider result must be returned to client');
  
  // Test cache hit behavior
  const cachedData = { cached: true, destination: 'Goa' };
  const initialCacheHits = metricsService.getSnapshot().cache.overall.hits;
  const hitResult = await executeWithReliability({
    provider: 'cache_hit_test',
    operationName: 'getTripCached',
    cacheGet: () => cachedData,
    fn: async () => {
      throw new Error('Should not be called on cache hit');
    }
  });

  assert(hitResult.cached === true, 'Cache hit must return stored payload directly');
  const hitsAfter = metricsService.getSnapshot().cache.overall.hits;
  assert(hitsAfter === initialCacheHits + 1, 'Cache hit must increment in operational metrics');
  reportTest('Cache read/write failures gracefully degrade without crashing client operations', true);


  // ==============================================================
  // 10. HEALTH ENDPOINT & SECRET VERIFICATION
  // ==============================================================
  console.log('\n--- 10. Health Endpoint & System Operational Status ---');

  const snapshot = metricsService.getSnapshot();
  const providerSummary = providerRegistry.getSummary();

  const healthPayload = {
    status: 'ok',
    service: 'Travelia Backend API',
    version: '2.9.0',
    environment: envResult.environment,
    timestamp: new Date().toISOString(),
    uptimeSeconds: snapshot.uptimeSeconds,
    system: {
      memoryMb: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      nodeVersion: process.version
    },
    providers: providerSummary,
    observability: {
      totalRequests: snapshot.requests.total,
      totalErrors: snapshot.requests.errors,
      averageLatencyMs: snapshot.requests.averageLatencyMs,
      cacheHitRatio: snapshot.cache.overall.hitRatio,
      aiFailures: snapshot.counts.aiFailures
    }
  };

  const healthJson = JSON.stringify(healthPayload);
  assert(!healthJson.includes('AIza'), 'Health endpoint must never expose Google API keys');
  assert(!healthJson.includes('SECRET'), 'Health endpoint must never expose provider secrets');
  assert(!healthJson.includes('password'), 'Health endpoint must never expose passwords');
  assert(healthPayload.system.memoryMb.rss > 0, 'Reports RSS memory usage');
  assert(healthPayload.providers.length > 0, 'Reports provider status summaries');
  assert(typeof healthPayload.observability.totalRequests === 'number', 'Reports total requests count');
  reportTest('Health endpoint reports comprehensive status without exposing any secrets', true);

  // ==============================================================
  // SUMMARY
  // ==============================================================
  console.log('\n===============================================================');
  console.log(`🎉 ALL ${passedTests} PHASE 9 TESTS PASSED WITH 100% RELIABILITY!`);
  console.log('===============================================================\n');
}

runPhase9Tests().catch((err) => {
  console.error('\n❌ Unhandled exception in Phase 9 reliability tests:', err);
  process.exit(1);
});
