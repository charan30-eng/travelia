# Travelia — Known Issues, Technical Debt & Remediation Backlog

## 1. Architectural & Logic Divergence

### 1.1 Duplicate Trip Health Score Logic
- **Issue**: There are two distinct implementations of the Trip Health Score algorithm:
  1. **Backend Authoritative Engine** (`server/services/healthScoreService.ts`): Evaluates 6 weighted dimensions using exact OSRM route metrics, real budget deviations, and Open-Meteo forecasts.
  2. **Frontend Heuristic** (`src/data/featureData.ts:calculateTripHealthScore`): Evaluates score using crude activity count checks (`activities.length >= 5 ? 75 : 94`).
- **Impact**: `TripHealthScoreCard.tsx` displays the frontend heuristic score. If the user opens `AIOptimizationModal.tsx`, the score is fetched from the backend, potentially showing an inconsistent score jump.
- **Remediation**: Update `TripHealthScoreCard.tsx` to asynchronously fetch `/api/ai/health-score` via `aiClient.calculateDynamicHealthScore()`, using the heuristic purely as an optimistic loading placeholder.

### 1.2 Duplicate Route Calculation Logic
- **Issue**: `src/data/geoRouting.ts` implements client-side Haversine distance and 2-opt sequence optimization, while `server/services/routeIntelligenceService.ts` implements server-side OSRM routing and 2-opt optimization.
- **Impact**: Server tests (`server/test_deterministic_engine.ts`) historically imported from `../src/data/geoRouting`.
- **Remediation**: Consolidate route calculations in `server/services/routeIntelligenceService.ts` and ensure the frontend consumes `/api/route/*`.

---

## 2. Incomplete or Mock Implementations

### 2.1 Smart Replan Fallback Fabricates Goa Locations for All Destinations
- **Issue**: In `src/components/SmartReplanModal.tsx:74-80`, if `/api/ai/weather-replan` returns empty changes or fails, it calls `generateSmartReplan(trip, disruptionType)` from `src/data/featureData.ts`.
- **Flaw**: `generateSmartReplan` hardcodes `"Goa State Heritage Museum"` and `"-₹300 net difference"`, meaning a rain disruption in Tokyo or Paris will propose Goa museums!
- **Remediation**: Ensure `activityCatalogService.ts` on the backend handles Paris, Tokyo, and Kyoto, and never fall back to destination-specific hardcoded text on the frontend.

### 2.2 Weather Forecast UI Display Missing
- **Issue**: The backend provides a fully verified 16-day Open-Meteo weather endpoint (`/api/weather/forecast`), and `aiClient.ts` contains `fetchTripWeatherForecast()`. However:
  - The main dashboard does not render a multi-day forecast widget.
  - The UI only shows a small badge `🟢 Live Weather Active (≤16d)`.
- **Remediation**: Add a dedicated Daily Weather Forecast row to `TripDashboardView` wired directly to `/api/weather/forecast`.

### 2.3 Flight Booking is Purely Static Simulated Data
- **Issue**: `src/data/flightData.ts` contains 1,867 lines of hardcoded flight segments, seat maps, baggage allowances, and prices (IndiGo BOM-GOX, Air India, Emirates).
- **Reality**: There is no live flight inventory API (Amadeus, Skyscanner, or Duffel).
- **Remediation**: Mark flights clearly as "Demonstration Flight Schedule" until an external GDS flight provider is integrated.

### 2.4 Google Places Hotel Price Level vs Real Room Rates
- **Issue**: Google Places API (New) returns `priceLevel` (0, 1, 2, 3, 4), which indicates relative expense tier, not a nightly room tariff.
- **Flaw**: `src/services/placesClient.ts:138` maps `priceLevel` to arbitrary numbers (`7500`, `5500`, `2800`, `4200`).
- **Remediation**: Label hotel prices as "Estimated Market Guidance" and display a clear disclaimer that live tariffs require hotel booking partner integration.

### 2.5 Static Currency Conversion Rates
- **Issue**: `src/data/currencyHelper.ts` contains a hardcoded list of exchange rates (`ratePerINR: 16.0` KRW, `1.80` JPY, etc.).
- **Impact**: Fluctuations in global exchange rates are not reflected.
- **Remediation**: Connect backend to a live open exchange rate API (e.g. Open Exchange Rates or Frankfurter API) with 24-hour caching.

---

## 3. Frontend Calculations Belonging to Backend

1. **Trip Generation Formulas (`src/data/mockData.ts:generateTripFromPrompt`)**:
   - Computes base budgets (`foodBudget = 1500 * days * travelers`, etc.) on the frontend before calling Places API. This logic should be moved to a backend `/api/trip/generate` endpoint.
2. **Date Range & Duration Calculations**:
   - Date manipulation is scattered across `src/utils/dateUtils.ts` and `src/App.tsx`.

---

## 4. Performance & Build Warnings

### 4.1 Large Single Vendor Chunk
- **Vite Build Warning**: `dist/assets/index-DyoAZzZ7.js` is `1,094.49 kB` (gzip: `292.32 kB`).
- **Cause**: Leaflet, Motion, Lucide-react, and Canvas-confetti are bundled into a single client chunk.
- **Remediation**: Add `build.rollupOptions.output.manualChunks` in `vite.config.ts` to split vendor dependencies:
  ```ts
  manualChunks: {
    leaflet: ['leaflet'],
    motion: ['motion'],
    icons: ['lucide-react']
  }
  ```
