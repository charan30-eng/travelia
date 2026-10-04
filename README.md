# Travelia — AI Travel Decision & Optimization Engine

> **Not Merely an AI Travel Planner.**  
> Travelia is an enterprise-grade AI Travel Decision and Multi-Objective Optimization Engine that transforms unstructured travel intent into mathematically verified, route-clustered, weather-resilient, and budget-optimized itineraries.

---

## 1. Problem Statement

Standard generative travel planners suffer from fundamental flaws:
1. **Hallucinated Places**: Invented attractions, closed heritage sites, or imaginary coordinates.
2. **Backtracking & Commute Ignorance**: Naive sequencing that forces travelers into 3–4 hours of daily zig-zag commuting across city boundaries.
3. **Meteorological Vulnerability**: Scheduling open-air beaches, boat tours, or mountain trails during forecast rainstorms.
4. **Budget Disconnect**: Fabricating static estimates without real dual-currency exchange rates, flight cabin differences, or itemized expense bounds.
5. **Magic Numbers & Opaque AI**: Giving users arbitrary "scores" without transparent mathematical derivation or side-by-side comparative proof.

---

## 2. The Solution

Travelia resolves this by operating as a multi-stage decision pipeline:

```
PLAN ➔ VERIFY ➔ CALCULATE ➔ OPTIMIZE ➔ SIMULATE ➔ EXPLAIN ➔ APPROVE
```

- **PLAN**: AI synthesizes an initial contextual itinerary tailored to traveler style, budget limits, and group dynamics.
- **VERIFY**: Every stop, rating, address, and operating hour is validated against authoritative **Google Places API** data.
- **CALCULATE**: Road-network distance matrices are computed via **OSRM**, 16-day forecasts via **Open-Meteo**, and a transparent 7-dimension deterministic **Trip Health Score** is derived.
- **OPTIMIZE**: The multi-objective Pareto optimizer runs 2-opt TSP route untangling, budget rebalancing, and rest buffer insertions.
- **SIMULATE**: What-If scenario simulations model disruptions (precipitation, budget cuts, hotel swaps, activity omissions) with mathematical before/after deltas.
- **EXPLAIN**: Mathematical deltas (`beforeScore`, `afterScore`, `healthDelta`, travel time saved, budget difference) explain the rationale without magic numbers.
- **APPROVE**: The traveler reviews comparative before/after metrics and retains total control to approve, modify, or reject any replan before it is persisted atomically to SQLite.

---

## 3. System Architecture

```
                       +-----------------------------+
                       |      TRAVELER INTERFACE     |
                       |  (React 19, Tailwind, Vite) |
                       +-----------------------------+
                                      |
                         REST / JSON  |  Subtle Data Status (Live / Cached / Demo)
                                      v
                       +-----------------------------+
                       |      EXPRESS 4 BACKEND      |
                       |  Security, Validation, CORS |
                       +-----------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+-------------------------------+                         +-------------------------------+
|  AUTHORITATIVE DATA PROVIDERS |                         |     DETERMINISTIC ENGINES     |
| • Google Places API (New)     |                         | • Itinerary Pareto Optimizer  |
| • OSRM Road Distance Matrix   |                         | • 7-Dimension Health Scorer   |
| • Open-Meteo Meteorology      |                         | • What-If Scenario Simulator  |
| • SQLite Atomic Persistence   |                         | • Dual-Currency FX Matrix     |
+-------------------------------+                         +-------------------------------+
         |                                                         |
         +----------------------------+----------------------------+
                                      |
                                      v
                       +-----------------------------+
                       |       GEMINI 2.5 LLM        |
                       |  Reasoning & Synthesis Only |
                       | (Never source of num truth) |
                       +-----------------------------+
```

---

## 4. The Role of Artificial Intelligence

Travelia employs **Gemini 2.5** strictly for semantic understanding, contextual itinerary generation, persona adaptation, and natural language explanation:
- **What AI Does**: Suggests day themes, explains mathematical trade-offs in conversational terms, parses travel prompts, and adapts recommendations to traveler archetypes (e.g. relaxed, adventure, luxury, family).
- **What AI Never Does**: Gemini is **never** permitted to fabricate prices, commute minutes, distances, weather forecasts, or health scores. All metrics are calculated by deterministic TypeScript algorithms and verified data providers.

---

## 5. Real Data Providers

| Service | Provider | Purpose | Status Handling |
| :--- | :--- | :--- | :--- |
| **Places Data Layer** | Google Places API (New) | Landmark resolution, verified ratings, photos, opening hours | `live` ➔ `cached` ➔ `demo fallback` |
| **Route Intelligence** | Open Source Routing Machine (OSRM) | True road distance, commute minutes, waypoint matrix | `live` ➔ `cached` ➔ `haversine estimate` |
| **Weather Intelligence** | Open-Meteo | 16-day precipitation probability, UV index, temperatures | `live` ➔ `cached` ➔ `seasonal climate` |
| **Currency Intelligence** | Live FX Engine | Dual-currency (INR + Destination FX) live conversion | Real-time exchange rate matrix |
| **Persistence** | SQLite (`node:sqlite`) | ACID-compliant trip persistence, audit logging | Atomic transactions & migrations |

---

## 6. Multi-Objective Optimization Engine

The optimizer (`server/services/itineraryOptimizer.ts`) applies Pareto optimization across competing travel priorities:
- **Transit Minimization**: Untangles daily route graphs using 2-opt TSP heuristics, eliminating backtracking.
- **Cost Balancing**: Identifies lower-cost alternatives for non-essential slots while safeguarding signature bucket-list landmarks.
- **Schedule Comfort**: Enforces minimum 45-minute rest and dining buffers between high-intensity activities.
- **Transparent Output**: Always produces concrete BEFORE vs. AFTER metrics:
  - Travel Time: `118 min` ➔ `86 min` (-32 min saved)
  - Transit Distance: `42.8 km` ➔ `31.4 km` (-11.4 km saved)
  - Budget Impact: `₹18,400` ➔ `₹17,950` (-₹450 saved)
  - Trip Health Score: `76` ➔ `90` (+14 pts delta)

---

## 7. What-If Scenario Simulation

Travelia makes What-If simulation visually prominent on both Home and Trip Dashboards:
1. **"What if it rains tomorrow?"**: Automatically swaps rain-exposed outdoor stops for nearby cultural centers, museums, or covered verandas.
2. **"What if I remove this activity?"**: Calculates recovered time buffer, fatigue reduction, and budget savings.
3. **"What if I change my hotel?"**: Recalculates route origins from the new accommodation tier and determines commute changes.
4. **"What if I reduce my budget?"**: Suggests smart transit passes, dining adjustments, and value alternatives without sacrificing core highlights.

Every simulation renders:
`BEFORE` ➔ `SCENARIO` ➔ `AFTER` ➔ `DIFFERENCE` ➔ `REASON` ➔ `APPROVE ACTION`

---

## 8. Weather & Route Intelligence

### Weather Intelligence
- Queries Open-Meteo for hourly precipitation, temperature range, and UV index.
- If departure is within 16 days, displays `🟢 Live Met Forecast Active`.
- Automatically flags outdoor activities scheduled during high rain probability (>45%) and triggers proactive indoor alternatives.

### Route Intelligence
- Uses OSRM driving and walking profiles to construct real road distance matrices between successive stops.
- Identifies acute backtracking and calculates travel fatigue penalties in the Trip Health Score when consecutive commute legs exceed comfort thresholds.

---

## 9. Technology Stack

- **Frontend**: React 19, TypeScript, Vanilla CSS + Tailwind CSS utilities, Lucide React icons, Canvas Confetti.
- **Backend**: Express 4, TypeScript (`tsx`), `node:sqlite` (Node.js native SQLite database).
- **AI**: Google Gemini API (`@google/genai`).
- **External Providers**: Google Places API (New), OSRM Routing Engine, Open-Meteo Weather API.
- **Testing**: Node.js test runner (`tsx --test`), 10 custom automated test suites with 100+ assertions.
- **Tooling**: Vite 6, dotenvx, ESLint.

---

## 10. Setup & Local Development

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/travelia.git
cd travelia

# Install dependencies
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` and configure your API keys:
```bash
cp .env.example .env
```

```ini
# Server Port
PORT=3001

# Gemini AI API Key (Optional for demo mode, required for live LLM reasoning)
GEMINI_API_KEY=your_gemini_api_key_here

# Google Places API Key (Optional for demo mode, required for live Google Places)
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Optional: Custom OSRM Server (Defaults to public OSRM router)
OSRM_BASE_URL=https://router.project-osrm.org
```

### Running Locally
```bash
# Start backend API server & Vite development server concurrently
npm run dev

# Open http://localhost:5173 in your browser
```

---

## 11. Testing & Verification

Run the full suite of 10 automated test suites covering all phases:

```bash
# Run all test suites
npm test

# Run TypeScript compilation check
npm run typecheck # or npx tsc --noEmit

# Run production bundle build
npm run build
```

---

## 12. Deployment

Travelia is production-ready for containerized or serverless hosting:
- **Build Production Client**: `npm run build` (outputs optimized bundle to `dist/`).
- **Static Assets**: Can be served by Nginx, Cloudflare Pages, Vercel, or Express static middleware.
- **API Server**: Run `npx tsx server/index.ts` with process managers like PM2 or Docker.
- **Database**: SQLite file stored in persistent volume (`./travelia.db`).

---

## 13. License

Proprietary © Travelia Technologies. All rights reserved.
