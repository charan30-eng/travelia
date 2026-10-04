/**
 * TRAVELIA ENVIRONMENT VALIDATION & SECRET PROTECTION — PHASE 9
 * 
 * CORE PRINCIPLES:
 * 1. Validates system environment configuration on startup.
 * 2. Strict Secret Masking: NEVER leaks API keys, passwords, or provider tokens.
 * 3. Graceful Degradation: Missing external keys trigger clear warnings and demo fallbacks
 *    without crashing the server.
 */

export interface EnvValidationResult {
  valid: boolean;
  environment: 'development' | 'production' | 'test';
  port: number;
  warnings: string[];
  errors: string[];
  configuredProviders: {
    geminiConfigured: boolean;
    googlePlacesConfigured: boolean;
    googleRoutesConfigured: boolean;
    osrmConfigured: boolean;
    weatherConfigured: boolean;
    exchangeRatesConfigured: boolean;
  };
  maskedSecrets: Record<string, string>;
}

/**
 * Masks a secret string (e.g. AIzaSyB1234567890123456789012345 -> AIza...345)
 */
export function maskSecret(secret?: string | null): string {
  if (!secret || typeof secret !== 'string') return '[UNCONFIGURED]';
  const trimmed = secret.trim();
  if (trimmed === '' || trimmed === 'MY_GEMINI_API_KEY') return '[UNCONFIGURED_DEFAULT]';
  if (trimmed.length <= 8) return '****';
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}****${suffix} (${trimmed.length} chars)`;
}

export function validateEnvironment(): EnvValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Environment & Port
  const rawEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const environment = (['development', 'production', 'test'].includes(rawEnv) 
    ? rawEnv 
    : 'development') as 'development' | 'production' | 'test';

  let port = 3005;
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
      warnings.push(`Invalid PORT "${process.env.PORT}". Falling back to default port 3005.`);
    } else {
      port = parsed;
    }
  }

  // 2. Gemini AI Key
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiConfigured = Boolean(
    geminiKey && 
    geminiKey !== 'MY_GEMINI_API_KEY' && 
    geminiKey.trim() !== ''
  );
  if (!geminiConfigured) {
    warnings.push('GEMINI_API_KEY is not configured; AI features will operate in authoritative tool/demo mode.');
  }

  // 3. Google Places API
  const googlePlacesKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  const googlePlacesConfigured = Boolean(googlePlacesKey && googlePlacesKey.trim() !== '' && !googlePlacesKey.includes('YOUR_'));
  if (!googlePlacesConfigured) {
    warnings.push('GOOGLE_PLACES_API_KEY is not configured; Places service will utilize verified demo fallbacks.');
  }

  // 4. Google Routes API & OSRM
  const googleRoutesKey = process.env.GOOGLE_ROUTES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  const googleRoutesConfigured = Boolean(googleRoutesKey && googleRoutesKey.trim() !== '' && !googleRoutesKey.includes('YOUR_'));
  const osrmBaseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
  const osrmConfigured = Boolean(osrmBaseUrl && osrmBaseUrl.startsWith('http'));

  // 5. Weather Provider (Open-Meteo is public free)
  const weatherConfigured = true;

  // 6. Currency Provider
  const exchangeKey = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  const exchangeRatesConfigured = Boolean(exchangeKey && exchangeKey.trim() !== '' && !exchangeKey.includes('YOUR_'));

  return {
    valid: errors.length === 0,
    environment,
    port,
    warnings,
    errors,
    configuredProviders: {
      geminiConfigured,
      googlePlacesConfigured,
      googleRoutesConfigured,
      osrmConfigured,
      weatherConfigured,
      exchangeRatesConfigured
    },
    maskedSecrets: {
      GEMINI_API_KEY: maskSecret(geminiKey),
      GOOGLE_PLACES_API_KEY: maskSecret(googlePlacesKey),
      GOOGLE_ROUTES_API_KEY: maskSecret(googleRoutesKey),
      OPEN_EXCHANGE_RATES_APP_ID: maskSecret(exchangeKey)
    }
  };
}
