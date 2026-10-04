# Travelia — System Architecture & Engineering Baseline

## 1. Executive Summary

**Travelia** is an AI-powered travel decision and optimization engine designed to create, audit, optimize, and simulate complete travel itineraries. Unlike generative AI chatbots that fabricate flight numbers, room rates, transit times, and health scores, Travelia adheres to a strict principle:

> **Authoritative Services & Real Data Providers First → Deterministic Engines Second → Gemini LLM Reasoning Third → User Approval Fourth.**
> **Gemini is NEVER the source of factual numerical truth.**

---

## 2. Target Architectural Flow

```
                      +-----------------------------+
                      |         USER ACTION         |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |      REACT 19 FRONTEND      |
                      |  (Vite + Tailwind + Motion) |
                      +-----------------------------+
                                     |  HTTP REST (/api/*)
                                     v
                      +-----------------------------+
                      |     EXPRESS 4 BACKEND       |
                      |  (Node.js / TSX Middleware) |
                      +-----------------------------+
                                     |
             +-----------------------+-----------------------+
             |                                               |
             v                                               v
+---------------------------+                   +---------------------------+
|   AUTHORITATIVE DOMAIN    |                   |   REAL DATA PROVIDERS     |
|         SERVICES          |                   |                           |
| • placesService           |                   | • Google Places API (New) |
| • routeIntelligenceService| <===============> | • OSRM Routing Engine     |
| • weatherService          |                   | • Open-Meteo Weather API  |
| • weatherImpactService    |                   | • In-Memory Caches        |
| • tripCostService         |                   | • Curated Seed Catalogs   |
| • locationResolution      |                   +---------------------------+
+---------------------------+
             |
             v
+---------------------------+
|   DETERMINISTIC ENGINES   |
| • itineraryOptimizer      |  <-- Strict math, Haversine/OSRM metrics,
| • healthScoreService      |      TSP 2-opt reordering, exact budget diffs
| • whatIfSimulator         |
+---------------------------+
             |
             v
+---------------------------+
|     GEMINI REASONING      |  <-- Natural language explanations, user intent
|     (geminiService.ts)    |      classification, synthesized advisories
| • System Prompt Injection |      (NEVER invents prices, times, or scores)
+---------------------------+
             |
             v
+---------------------------+
|    PROPOSED RESULT &      |  <-- Before vs. After diffs, savings audit,
|      ACTION MODAL         |      explicit user confirmation
+---------------------------+
             |
             v
+---------------------------+
|    USER APPROVAL / MERGE  |  <-- Applied to active trip state
+---------------------------+
```

---

## 3. Frontend Architecture

### 3.1 Stack
- **Framework**: React 19 (`react: ^19.0.1`, `react-dom: ^19.0.1`)
- **Language**: TypeScript (`~5.8.2`, strict typing)
- **Build Tool**: Vite 6 (`vite: ^6.2.3`, `@vitejs/plugin-react: ^5.0.4`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite: ^4.1.14`)
- **Animations & Effects**: Motion (`motion: ^12.23.24`), `canvas-confetti`
- **Mapping**: Leaflet 1.9 (`leaflet: ^1.9.4`, `@types/leaflet: ^1.9.22`)
- **Icons**: Lucide React (`lucide-react: ^0.546.0`)

### 3.2 View Router (Tab-Based State in `App.tsx`)
1. **`HomeView`** (`src/components/HomeView.tsx`): Destination discovery, hero cards, inspirational search, prefill routing to planner.
2. **`PlannerView`** (`src/components/PlannerView.tsx`): Input preferences (destination, duration, travelers, pace, budget tier, travel dates) and generates new trip plans.
3. **`TripDashboardView`** (`src/components/TripDashboardView.tsx`): Primary workspace. Manages day-by-day itinerary, interactive map, hotel selections, attraction cards, weather readiness badge, date shifts, and action triggers.
4. **`BudgetView`** (`src/components/BudgetView.tsx`): 4-tab financial suite:
   - *Itemized*: Detailed breakdown (hotel, transport, activities, food, flights, misc).
   - *Calculator*: Slider-based dynamic budget tuning.
   - *Optimizer*: Before/After savings recommendations.
   - *Splitter*: Multi-traveler group expense allocation.
5. **`DiscoverView`** (`src/components/DiscoverView.tsx`): Curated destination showcase cards with quick-plan buttons.
6. **`MyTripsView`** (`src/components/MyTripsView.tsx`): Saved trips manager with local state persistence and trip switcher.
7. **`JavaCodeViewer`** (`src/components/JavaCodeViewer.tsx`): Code inspector displaying the pure Java/JavaFX desktop implementation of Travelia.

### 3.3 Modal Suite
- **`AIChatModal`** (`src/components/AIChatModal.tsx`): Slide-over AI copilot drawer communicating with `/api/ai/chat`. Displays conversational suggestions and triggers proposal approval modals.
- **`AIOptimizationModal`** (`src/components/AIOptimizationModal.tsx`): Before-vs-After comparison modal detailing budget diffs, transit hours saved, health score deltas, and activity replacements.
- **`SmartReplanModal`** (`src/components/SmartReplanModal.tsx`): Weather and schedule disruption wizard communicating with `/api/ai/weather-replan`.
- **`FlightBookingModal`** (`src/components/FlightBookingModal.tsx`): Flight alternative selection and cabin class manager.
- **`AddActivityModal`** (`src/components/AddActivityModal.tsx`): Manual activity insertion for a selected itinerary day.

### 3.4 Java / JavaFX Representation
The codebase preserves a full JavaFX desktop architecture (`src/components/JavaCodeViewer.tsx` and `src/data/javaCodebase.ts`) representing an OOP Java implementation of the Travelia engine:
- Models: `TripPlan.java`, `ItineraryDay.java`, `Activity.java`, `Budget.java`
- Services: `PlacesService.java`, `RouteOptimizer.java`, `WeatherService.java`
- Controllers: `MainDashboardController.java`, `BudgetController.java`
- UI: FXML layouts and JavaFX CSS styling.

---

## 4. Backend Architecture

### 4.1 Stack & Runtime
- **Runtime**: Node.js v20+ / TSX execution (`tsx: ^4.21.0`)
- **Server Framework**: Express 4 (`express: ^4.21.2`, `@types/express: ^4.17.21`)
- **Environment**: `dotenv: ^17.2.3` loading `.env`
- **Development Integration**: `traveliaBackendPlugin` in `vite.config.ts` mounts Express `app` directly into Vite dev server middleware on `/api/*`. Standalone execution is also supported via `npm run server` (`tsx server/index.ts`) on port 3005.

### 4.2 API Routes Topology (`server/routes/`)
| Mount Path | File | Purpose |
|---|---|---|
| `/api/health` | `server/index.ts` | System health check and uptime timestamp |
| `/api/places/*` | `server/routes/places.ts` | Google Places API (New) search, hotels, sights, photo proxy, details |
| `/api/route/*` | `server/routes/route.ts` | OSRM road routing, day route metrics, waypoint optimization, clustering |
| `/api/weather/*` | `server/routes/weather.ts` | Open-Meteo 16-day forecast, weather replans, activity impact analysis |
| `/api/ai/*` | `server/routes/ai.ts` | Copilot chat, deterministic optimization, 6D health score, what-if simulator |

### 4.3 Backend Domain Services (`server/services/`)
```
server/services/
├── placesService.ts             # Orchestrates cache -> Google Places (New) -> Demo fallback
├── placesEngine/
│   ├── googlePlacesProvider.ts  # Google Places API (New) client with strict field masking
│   └── placesCache.ts           # In-memory TTL cache (default 3600s)
├── demoPlacesService.ts         # Curated verified places fallback catalog
├── routeIntelligenceService.ts  # Authoritative route metrics, backtracking detection, TSP 2-opt
├── routeEngine/
│   └── routeProvider.ts         # OSRM road geometry provider + Haversine fallback
├── locationResolutionService.ts # Geographic coordinate resolver (Goa, Paris, Tokyo, Kyoto, etc.)
├── weatherService.ts            # 16-day forecast normalizer, weather replanner
├── weatherEngine/
│   └── weatherProvider.ts       # Open-Meteo provider + WeatherCache TTL
├── weatherImpactService.ts      # Outdoor vs indoor classification, rain threshold scoring
├── activityCatalogService.ts    # Verified activity catalog for rain/budget replacements
├── tripCostService.ts           # Deterministic sum of activities, hotels, food, transit
├── healthScoreService.ts        # 6-dimension weighted trip health scoring engine
├── itineraryOptimizer.ts        # Multi-factor savings, route streamlining, and pacing optimizer
├── whatIfSimulator.ts           # Non-mutating scenario simulator (budget cut, add traveler, rain)
└── geminiService.ts             # Google Gen AI integration with deterministic fallback engine
```

---

## 5. Authoritative Engines & Principles

### 5.1 Deterministic Trip Cost Engine (`tripCostService.ts`)
- Factual formula: $\text{Total} = \text{Hotel} + \text{Flights} + \text{Food} + \text{Transport} + \sum(\text{Activities}) + \text{Misc}$.
- Verifies that estimated savings match $\text{Cost}_{\text{Before}} - \text{Cost}_{\text{After}}$ with zero rounding discrepancies.

### 5.2 Route Intelligence Engine (`routeIntelligenceService.ts`)
- Leverages OSRM for actual driving, cycling, and walking road routes and geometries.
- Automatically falls back to great-circle Haversine distance if OSRM is unreachable, explicitly marking the distance type as `straight_line`.
- Detects detour/backtracking by comparing sequential legs against direct corridors.
- Validates schedule transit feasibility: detects if transit time exceeds available gap between activities.
- Checks activity scheduled times against venue opening and closing hours.

### 5.3 Weather Intelligence Engine (`weatherService.ts`)
- Integrates with Open-Meteo (no API key required, zero commercial lock-in).
- Provides 16-day daily forecasts: maximum/minimum temperature, WMO weather codes, and precipitation probability.
- Classifies activities into outdoor, indoor, or sheltered profiles.
- When precipitation probability $\ge 60\%$, automatically flags outdoor activities and proposes replacements from the verified indoor catalog.

### 5.4 6-Dimension Trip Health Engine (`healthScoreService.ts`)
Evaluates trip quality on a 100-point scale across 6 weighted dimensions:
1. **Budget Efficiency (25%)**: Ratio of committed expenses to total budget ceiling.
2. **Route Efficiency (20%)**: Derived from OSRM transit hours, daily distance, and backtracking index.
3. **Schedule Balance (20%)**: Pacing index based on activities per day and meal buffer intervals.
4. **Rest & Buffer Time (15%)**: Unscheduled buffer slots for rest, delays, and jet lag recovery.
5. **Activity Diversity (10%)**: Variety of categories (sightseeing, food, adventure, relaxation, culture).
6. **Weather Compatibility (10%)**: Outdoor schedule alignment with live meteorological forecast.

### 5.5 Gemini Reasoning Layer (`geminiService.ts`)
- Injects live factual numbers from authoritative services into the LLM system prompt.
- Restricts Gemini to natural language communication, intent resolution, and synthesis.
- Replaces any LLM numerical hallucinations with deterministic calculations from the backend engines.
- Operates a complete deterministic offline fallback when `GEMINI_API_KEY` is omitted or unconfigured.

---

## 6. Directory Structure Overview

```
travelia/
├── package.json               # Scripts: dev, server, build, preview, clean, lint, test
├── vite.config.ts             # Vite 6 config with traveliaBackendPlugin mounting Express
├── tsconfig.json              # TypeScript strict configuration
├── .env                       # Local environment variables
├── .env.example               # Reference environment variables
├── docs/                      # Architectural documentation & engineering baseline
│   ├── architecture.md
│   ├── feature-status.md
│   ├── data-sources.md
│   ├── api-contracts.md
│   ├── known-issues.md
│   ├── production-readiness.md
│   └── roadmap-progress.md
├── server/                    # Express backend
│   ├── index.ts               # Server entry point & API route mounting
│   ├── routes/                # Express router modules (ai, places, route, weather)
│   ├── services/              # Domain services & deterministic engines
│   ├── prompts/               # Structured system prompts (chatPrompt.ts)
│   ├── types/                 # Backend TypeScript contracts (ai, places, route, weather)
│   ├── test_deterministic_engine.ts # Deterministic savings & cost tests
│   ├── test_route_intelligence.ts   # 15 route intelligence test scenarios
│   ├── test_weather_intelligence.ts # 17 weather intelligence test scenarios
│   ├── test_places_data_layer.ts    # Places caching, fallback & integrity tests
│   ├── test_ai_scenarios.ts         # Live HTTP verification of AI endpoints
│   └── verify_copilot.ts            # Copilot prompt scenario test suite
└── src/                       # React frontend
    ├── main.tsx               # DOM root mount
    ├── App.tsx                # Master state controller, tab router, modal coordinators
    ├── types.ts               # Frontend TypeScript domain interfaces
    ├── index.css              # Global styles & Tailwind imports
    ├── components/            # UI components and view controllers (21 files)
    ├── data/                  # Curated catalogs, mock generators, and Java code base
    ├── services/              # Frontend API clients (aiClient.ts, placesClient.ts)
    └── utils/                 # Date, time, and forecast window helpers
```
