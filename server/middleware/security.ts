/**
 * TRAVELIA SECURITY MIDDLEWARE SUITE — PHASE 9
 * 
 * CORE PRINCIPLES:
 * 1. Security Headers: Hardens HTTP responses (CSP, HSTS, X-Content-Type-Options, Frameguard).
 * 2. CORS Configuration: Controlled origins, methods, and allowed headers.
 * 3. In-Memory Rate Limiting: Sliding window rate limiting protecting against abuse.
 * 4. Error Sanitization: Intercepts unhandled errors, strips stack traces and secrets in responses.
 */

import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metricsService';

// =========================================================================
// 1. CORS CONFIGURATION
// =========================================================================
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3005', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Travelia-User-Id, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}

// =========================================================================
// 2. SECURITY HEADERS
// =========================================================================
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https:;"
  );

  next();
}

// =========================================================================
// 3. IN-MEMORY RATE LIMITING (Sliding Window)
// =========================================================================
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  skipFailedRequests?: boolean;
}) {
  const windowMs = options.windowMs || 60000; // 1 minute default
  const maxRequests = options.maxRequests || 120; // 120 requests per minute
  const message = options.message || 'Too many requests from this IP, please try again after a moment.';
  const store = new Map<string, RateLimitRecord>();

  // Cleanup old entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 300000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    // Determine client identifier (IP or user ID)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
               req.socket.remoteAddress || 
               'anonymous';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let record = store.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      store.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', resetSeconds.toString());
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfterSeconds: resetSeconds
        }
      });
    }

    next();
  };
}

export const generalRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 150,
  message: 'General API rate limit exceeded. Please wait before making more requests.'
});

export const strictAiRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 40,
  message: 'AI Copilot and Optimization rate limit reached. Please allow time for current processing to complete.'
});

// =========================================================================
// 4. SANITIZED GLOBAL ERROR HANDLER
// =========================================================================
export function sanitizedErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Check for body-parser entity too large error
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds the allowable size limit (max 1MB).'
      }
    });
  }

  // Check for syntax error in JSON
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body.'
      }
    });
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : (err.status || 500);
  const isProd = process.env.NODE_ENV === 'production';

  // Log error safely without leaking secrets
  metricsService.safeLog('ErrorHandler', `Unhandled error on ${req.method} ${req.path}`, {
    name: err.name,
    message: err.message,
    code: err.code
  });

  const responsePayload: any = {
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: isProd && statusCode === 500 
        ? 'An unexpected error occurred. Please try again later.' 
        : metricsService.sanitizeLogMessage(err.message || 'Internal server error')
    }
  };

  // Only include details if safe
  if (!isProd && err.details) {
    responsePayload.error.details = err.details;
  }

  res.status(statusCode).json(responsePayload);
}
