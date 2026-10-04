/**
 * TRAVELIA CURRENCY & EXCHANGE RATE TYPES
 * 
 * Defines models for real-time and cached foreign exchange rates.
 * Eliminates reliance on stale static rates in production.
 */

export type CurrencyDataStatus = 'live' | 'cached' | 'demo' | 'unavailable';

export interface CurrencyRateItem {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  inverseRate: number;
  source: 'open-er-api' | 'frankfurter' | 'ecb' | 'demo' | 'cached' | 'direct' | string;
  retrievedAt: string;
  dataStatus: CurrencyDataStatus;
}


export interface CurrencyRatesResponse {
  success: boolean;
  baseCurrency: string;
  rates: Record<string, number>;
  source: string;
  retrievedAt: string;
  dataStatus: CurrencyDataStatus;
  cacheAgeSeconds?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface CurrencyConversionRequest {
  amount: number;
  from: string;
  to: string;
}

export interface CurrencyConversionResponse {
  success: boolean;
  originalAmount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  convertedAmount: number;
  formattedOriginal: string;
  formattedConverted: string;
  source: string;
  retrievedAt: string;
  dataStatus: CurrencyDataStatus;
}
