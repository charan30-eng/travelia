# Travelia — Engineering Roadmap & Progress Tracker

## Phase 0: Baseline & Engineering Audit (ACTIVE / COMPLETED)

```markdown
Phase 0
[x] Repository audit
[x] Architecture documented
[x] Mock data identified
[x] API dependencies identified
[x] Tests verified
[x] Build verified
[x] Baseline captured
```

### Phase 0 Verification Evidence
1. **Repository Audit**: Inspected all 21 frontend components, 6 data/mock modules, 12 backend services, 4 route modules, and 5 test suites.
2. **Architecture Documented**: Created `docs/architecture.md` detailing frontend, backend, data flows, deterministic engine rules, and Java/JavaFX representation.
3. **Mock Data Identified**: Created `docs/data-sources.md` auditing all 13 required categories (hardcoded prices, ratings, coordinates, weather, exchange rates, flights, hotel prices, optimization percentages, `changes.length`, travel times, health score values, demo places, and frontend metrics).
4. **API Dependencies Identified**: Created `docs/api-contracts.md` defining all REST endpoints (`/api/health`, `/api/places/*`, `/api/route/*`, `/api/weather/*`, `/api/ai/*`).
5. **Tests Verified**: Configured `"test"` script in `package.json`. Ran all 4 test suites:
   - `server/test_deterministic_engine.ts` (100% mathematical audit passed)
   - `server/test_route_intelligence.ts` (24 assertions passed, 0 failed)
   - `server/test_weather_intelligence.ts` (49 assertions passed, 0 failed)
   - `server/test_places_data_layer.ts` (19 assertions passed, 0 failed)
   - Total assertions: **117 PASSED, 0 FAILED**.
6. **Build Verified**: Executed `npm run lint` (`tsc --noEmit`) and `npm run build` (`vite build`). Both completed with exit code 0.
7. **Baseline Captured**: Created `docs/feature-status.md`, `docs/known-issues.md`, and `docs/production-readiness.md`.

---

## Phase 1: Backend Consolidation & Data Layer Alignment (RECOMMENDED NEXT)

- [ ] **Unify Trip Health Score**:
  - Connect `TripHealthScoreCard.tsx` to `/api/ai/health-score`.
  - Deprecate crude frontend heuristic in `featureData.ts`.
- [ ] **Wire Weather Forecast to Dashboard**:
  - Add Daily Weather Forecast display to `TripDashboardView` consuming `/api/weather/forecast`.
  - Eliminate dead weather generation code in `featureData.ts`.
- [ ] **Fix Smart Replan Destination Integrity**:
  - Remove hardcoded Goa museum fallback from `SmartReplanModal.tsx`.
  - Expand `activityCatalogService.ts` to include verified indoor activities for all supported destinations.
- [ ] **Clean Up Server Route Imports**:
  - Decouple `server/test_deterministic_engine.ts` from frontend `src/data/geoRouting.ts`.

---

## Phase 2: Live Integrations & Rate Reality

- [ ] **Flight Inventory Reality**:
  - Introduce explicit "Simulated Demonstration Flights" labeling for `flightData.ts`.
  - Implement connector interface for live flight data (e.g. Amadeus or Skyscanner API).
- [ ] **Hotel Rate Transparency**:
  - Add explicit "Estimated Price Guidance" disclaimer to hotel price tags.
  - Implement hotel booking partner integration pathway.
- [ ] **Live Currency Exchange Rates**:
  - Replace static `ratePerINR` table with live Forex provider (e.g. Frankfurter / Open Exchange Rates) cached server-side for 24h.

---

## Phase 3: Performance, Security & Persistence

- [ ] **Vite Bundle Optimization**:
  - Implement vendor code splitting (`manualChunks`) in `vite.config.ts` to reduce the 1.09 MB bundle below 500 kB.
- [ ] **Backend Security Hardening**:
  - Add `express-rate-limit` to prevent denial-of-service on Gemini and Google Places routes.
  - Add `helmet` security headers to Express.
- [ ] **Relational Database & Auth**:
  - Introduce Prisma ORM + PostgreSQL schema for Users, Trips, Itineraries, and Expenses.
  - Enable user login and shareable trip URLs.
