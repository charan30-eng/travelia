/**
 * TRAVELIA DYNAMIC CURRENCY CLIENT
 * 
 * Communicates with backend /api/currency endpoints to fetch real-time
 * foreign exchange rates and conversions.
 */

export interface LiveCurrencyRate {
  baseCurrency: string;
  rates: Record<string, number>;
  source: string;
  retrievedAt: string;
  dataStatus: 'live' | 'cached' | 'demo' | 'unavailable';
  cacheAgeSeconds?: number;
}

export interface LiveConversionResult {
  originalAmount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  convertedAmount: number;
  formattedOriginal: string;
  formattedConverted: string;
  source: string;
  retrievedAt: string;
  dataStatus: 'live' | 'cached' | 'demo' | 'unavailable';
}

class CurrencyClient {
  private baseUrl = '/api/currency';
  private cachedRates: LiveCurrencyRate | null = null;
  private lastFetchedAt: number = 0;

  async getRates(base: string = 'INR'): Promise<LiveCurrencyRate> {
    const now = Date.now();
    if (this.cachedRates && this.cachedRates.baseCurrency === base && now - this.lastFetchedAt < 10 * 60 * 1000) {
      return this.cachedRates;
    }

    try {
      const res = await fetch(`${this.baseUrl}/rates?base=${encodeURIComponent(base)}`);
      if (!res.ok) throw new Error(`Currency rates fetch failed: ${res.statusText}`);
      const data = await res.json();
      this.cachedRates = data;
      this.lastFetchedAt = now;
      return data;
    } catch (err) {
      console.warn('[CurrencyClient] Fallback to cached rates:', err);
      if (this.cachedRates) return this.cachedRates;
      return {
        baseCurrency: base,
        rates: { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0094, JPY: 1.80, KRW: 16.0 },
        source: 'local-fallback',
        retrievedAt: new Date().toISOString(),
        dataStatus: 'demo'
      };
    }
  }

  async convert(amount: number, from: string, to: string): Promise<LiveConversionResult> {
    try {
      const res = await fetch(`${this.baseUrl}/convert?amount=${amount}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!res.ok) throw new Error(`Currency convert failed: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn('[CurrencyClient] Local conversion fallback:', err);
      const rates = await this.getRates('INR');
      const fromRate = rates.rates[from.toUpperCase()] || 1;
      const toRate = rates.rates[to.toUpperCase()] || 1;
      const effectiveRate = toRate / fromRate;
      const converted = Math.round(amount * effectiveRate * 100) / 100;
      return {
        originalAmount: amount,
        fromCurrency: from,
        toCurrency: to,
        rate: effectiveRate,
        convertedAmount: converted,
        formattedOriginal: `${from} ${amount}`,
        formattedConverted: `${to} ${converted}`,
        source: 'local-fallback',
        retrievedAt: new Date().toISOString(),
        dataStatus: 'demo'
      };
    }
  }
}

export const currencyClient = new CurrencyClient();
