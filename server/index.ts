import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRoutes from './routes/ai';
import routeRoutes from './routes/route';
import weatherRoutes from './routes/weather';
import placesRoutes from './routes/places';
import tripRoutes from './routes/tripRoutes';
import hotelRoutes from './routes/hotels';
import flightRoutes from './routes/flights';
import currencyRoutes from './routes/currency';

// Phase 9 Security, Reliability & Observability Modules
import { validateEnvironment } from './services/envValidation';
import { 
  corsMiddleware, 
  securityHeadersMiddleware, 
  generalRateLimiter, 
  strictAiRateLimiter,
  sanitizedErrorHandler 
} from './middleware/security';
import { requestMetricsMiddleware, metricsService } from './services/metricsService';
import { providerRegistry } from './services/providerReliability';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback to current dir

// Validate environment on boot
export const envValidation = validateEnvironment();
if (envValidation.warnings.length > 0) {
  for (const w of envValidation.warnings) {
    metricsService.safeLog('StartupWarning', w);
  }
}

export const app = express();

// 1. Security & Observability Middlewares
app.use(corsMiddleware);
app.use(securityHeadersMiddleware);
app.use(requestMetricsMiddleware);

// 2. Request payload size limits (Max 1MB)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 3. Rate Limiting
app.use('/api/', generalRateLimiter);
app.use('/api/ai/', strictAiRateLimiter);

// 4. Mount Travelia AI & Domain routes
app.use('/api/ai', aiRoutes);
app.use('/api/route', routeRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/currency', currencyRoutes);

// 5. Phase 9 Enhanced Health & Operational Status Endpoint
app.get('/api/health', (req, res) => {
  const snapshot = metricsService.getSnapshot();
  const providers = providerRegistry.getSummary();
  const memoryUsage = process.memoryUsage();

  const isDegraded = providers.some(p => p.status === 'degraded' || p.status === 'unavailable');

  res.json({
    status: isDegraded ? 'degraded' : 'ok',
    service: 'Travelia Backend API',
    version: '2.9.0',
    environment: envValidation.environment,
    timestamp: new Date().toISOString(),
    uptimeSeconds: snapshot.uptimeSeconds,
    system: {
      memoryMb: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024)
      },
      nodeVersion: process.version
    },
    providers,
    observability: {
      totalRequests: snapshot.requests.total,
      totalErrors: snapshot.requests.errors,
      averageLatencyMs: snapshot.requests.averageLatencyMs,
      cacheHitRatio: snapshot.cache.overall.hitRatio,
      aiFailures: snapshot.counts.aiFailures
    }
  });
});

// 6. Global Sanitized Error Handler (Must be registered last)
app.use(sanitizedErrorHandler);

const PORT = envValidation.port || process.env.PORT || 3005;

// Only start listening if run directly (e.g. `npx tsx server/index.ts`)
if (process.env.STANDALONE_SERVER === 'true' || process.argv[1]?.includes('server/index')) {
  app.listen(PORT, () => {
    metricsService.safeLog('Server', `Travelia AI Server running on port ${PORT}`);
  });
}

export default app;
