# Travelia — Data Authenticity & Source Audit

## 1. Classification Methodology

Every data point and numerical calculation across the codebase is classified under one of the following authoritative categories:

1. **`LIVE`**: Retrieved in real-time from an external authoritative API (e.g. Google Places API New, OSRM, Open-Meteo) or computed on-the-fly from live inputs.
2. **`CACHED`**: Derived from a verified live provider query, held in an in-memory or durable cache subject to an explicit Time-To-Live (TTL).
3. **`DEMO`**: Curated, realistic sample fixtures provided as explicit fallbacks when external APIs are unconfigured, rate-limited, or offline.
4. **`STATIC UI CONTENT`**: Descriptive display copy, marketing imagery, UI icons, or illustrative tags that do not affect algorithmic outputs.
5. **`TEST DATA`**: Test fixtures and assertion targets used strictly inside automated test runners (`server/test_*.ts`).
6. **`UNKNOWN`**: Data without clear provenance or validation rules.

---

## 2. Comprehensive Occurrence Audit

### 2.1 Hardcoded Prices & Budget Formulas
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `src/data/mockData.ts` (L41–49) | `DEFAULT_GOA_TRIP.budget` (Hotel ₹18k, Flights ₹15.9k, Food ₹7.5k, etc.) | **DEMO** | Default initial trip state rendered on fresh page load. |
| `src/data/mockData.ts` (L711–723) | Base generation formulas: `baseHotelNight = 4200`, `foodBudget = 1500 * days * travelers`, `transport = 1000 * days` | **DEMO** | Used when user clicks "Generate Trip" before live Places or flight rates are fetched. |
| `src/data/mockData.ts` (L472–580) | `FEATURED_DESTINATIONS` starting prices (`₹18,500`, `₹24,000`, `₹42,000`) | **STATIC UI CONTENT** | Illustrative price chips on destination cards in `DiscoverView`. |
| `server/services/activityCatalogService.ts` | Verified catalog entry costs (e.g. Museum ₹200, Fort entry ₹300) | **DEMO / SEED CATALOG** | Verified actual ticket costs used by `itineraryOptimizer` to guarantee factual replacement math. |

### 2.2 Ratings
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `server/services/placesEngine/googlePlacesProvider.ts` (L125) | `rating: p.rating`, `userRatingsTotal: p.userRatingCount` | **LIVE** | Authentic Google user review ratings and review counts from Places API (New). |
| `server/services/demoPlacesService.ts` | Ratings: 4.7, 4.6, 4.8 for curated demo venues | **DEMO** | Static ratings in demo fallback catalog. Accurately labeled `source: 'demo'`. |
| `src/data/mockData.ts` (L817, L861, L905) | Ratings: 4.8, 4.9, 4.7 on generated hotels and sights | **DEMO** | Overwritten when live Google Places response arrives in `App.tsx:148-158`. |

### 2.3 Geographic Coordinates
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `server/services/placesEngine/googlePlacesProvider.ts` | `latitude: p.location.latitude`, `longitude: p.location.longitude` | **LIVE** | Authentic WGS-84 coordinates returned by Google Places. |
| `server/services/locationResolutionService.ts` | `VERIFIED_LANDMARK_CATALOG` coordinates (Goa, Paris, Tokyo, Kyoto, Rome, etc.) | **CACHED / SEED CATALOG** | Verified landmark coordinates. If not found in catalog, returns `null` honestly without inventing pseudo-coordinates. |
| `src/data/geoRouting.ts` (L68–175) | `CITY_GEO_PROFILES` landmark and center coordinates | **CACHED / SEED CATALOG** | Static coordinate dictionary for Leaflet rendering. |
| `src/data/geoRouting.ts` (L296–301) | Waypoint fallback to `profile.landmarks[idx].coords` or `profile.center` | **DEMO** | Fallback in frontend route builder when an activity title does not match landmark catalog. |

### 2.4 Weather Data
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `server/services/weatherEngine/weatherProvider.ts` | Open-Meteo API query (`/v1/forecast`, 16-day daily forecast) | **LIVE** | Authentic meteorological forecast (temperature, precipitation probability, WMO weather codes). |
| `server/services/weatherEngine/weatherProvider.ts` (`WeatherCache`) | Cached weather forecast with 3600s TTL | **CACHED** | In-memory cache hit labeled `availability: 'cached'`. |
| `src/data/featureData.ts` (L437–454) | `generateWeatherForecast()` (returns `tempMaxC: 28, tempMinC: 22, rainChancePercent: 0`) | **DEMO / UNUSED** | Synthetic forecast function in `featureData.ts`. Currently orphan code; not imported by any UI view. |

### 2.5 Exchange Rates
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `src/data/currencyHelper.ts` (L15–480) | `SUPPORTED_DESTINATION_COUNTRIES` (`ratePerINR: 16.0` KRW, `1.80` JPY, `0.011` EUR, etc.) | **STATIC UI CONTENT** | Static foreign currency conversion rates hardcoded in frontend table. Useful for UI estimation, but lacks live Forex API integration. |
| `src/data/mockData.ts` (L6–11) | `CURRENCY_RATES` (USD: 0.012, EUR: 0.011, GBP: 0.0094) | **STATIC UI CONTENT** | Static conversion multipliers used by `formatCurrency()`. |

### 2.6 Flight Results
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `src/data/flightData.ts` (L3–68) | `DEFAULT_OUTBOUND_FLIGHT`, `DEFAULT_RETURN_FLIGHT` (6E-2041, AI-854, prices ₹3850, ₹4120) | **DEMO** | Curated IndiGo and Air India flight models displayed in `TripFlightsSection`. |
| `src/data/flightData.ts` (L69–230) | `ALTERNATIVE_FLIGHTS` list | **DEMO** | Static flight choices displayed in `FlightBookingModal`. Lacks live GDS/OTA connector. |

### 2.7 Hotel Prices
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `src/services/placesClient.ts` (L138–139) | `pricePerNight = place.priceLevel === 4 ? 7500 : ... : 4200` | **DEMO / ESTIMATED** | Fallback mapping integer Google price tiers (0–4) to estimated room prices. Google Places API does not provide live nightly room rates. |
| `server/services/demoPlacesService.ts` | `priceLevel: 2`, `estimatedCost: 3800` | **DEMO** | Curated demo hotel prices clearly tagged with `source: 'demo'`. |

### 2.8 Optimization Percentages
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `server/services/itineraryOptimizer.ts` (L118) | `targetSavingsPercentage: number = 0.15` (15% target savings) | **LIVE / CONFIG** | User-configurable or default optimization target ceiling passed to the optimizer. |
| `src/services/aiClient.ts` (L128) | Default `targetSavingsPercentage: 0.15` | **LIVE / CONFIG** | Client-side default parameter passed to `/api/ai/optimize`. |

### 2.9 `changes.length` Usage
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `server/services/itineraryOptimizer.ts` (L212) | `if (accumulatedSavings >= effectiveTargetSavings || changes.length >= 4)` | **LIVE (Loop Guard)** | Used strictly as an iteration guard to prevent over-altering the user's itinerary (caps changes to $\le 4$). |
| `server/services/weatherService.ts` (L340) | `affectedActivitiesCount: changes.length` | **LIVE (Reporting Metric)** | Factual count of replacement activities proposed during weather replanning. |
| `src/components/AIOptimizationModal.tsx` (L194) | `Proposed Itinerary Adjustments ({changes.length})` | **LIVE (UI Count Badge)** | Factual count of proposed changes rendered in the modal tab title. |

### 2.10 Fixed Travel Times
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `server/services/routeEngine/routeProvider.ts` | OSRM road travel durations | **LIVE** | Authentic driving, cycling, and walking transit durations computed from OpenStreetMap road networks. |
| `server/services/routeEngine/routeProvider.ts` (Haversine fallback) | Speed defaults (driving 35 km/h, walking 4.5 km/h, cycling 15 km/h) | **CACHED / FALLBACK** | Used only when OSRM is unreachable; explicitly flagged as `straight_line`. |
| `src/data/geoRouting.ts` (L17–58) | `TRANSIT_MODES` (cab 28 km/h, metro 22 km/h, walking 4.5 km/h, bike 16 km/h) | **DEMO / HEURISTIC** | Fixed velocity heuristics used in frontend Leaflet route estimations. |

### 2.11 Health Score Values
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `server/services/healthScoreService.ts` | Dynamic 6-dimension health scoring formula (Budget 25%, Route 20%, Schedule 20%, Rest 15%, Diversity 10%, Weather 10%) | **LIVE (Authoritative)** | Computed from actual cost breakdown, real OSRM transit hours, and live weather forecast. |
| `src/data/featureData.ts` (L457–550) | `calculateTripHealthScore()` | **DEMO / HEURISTIC** | Frontend heuristic (e.g. `if activities.length >= 5 score = 75`). Diverges from backend authoritative engine. |

### 2.12 Demo Places Used as Production Data
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `server/services/demoPlacesService.ts` | Demo catalog for Goa (Fort Aguada, Baga Beach, Ocean Pearl Resort, etc.) | **DEMO** | Used strictly when `GOOGLE_PLACES_API_KEY` is empty or Google API request fails. Handled with explicit `source: 'demo'` and `dataStatus: 'demo'` metadata. |

### 2.13 Frontend-Generated Business Metrics
| Location | Occurrence | Classification | Analysis & Impact |
|---|---|---|---|
| `src/data/featureData.ts` (L63–175) | `generateSmartReplan()` (hardcodes Goa Museum and -₹300 net diff) | **DEMO** | Used by `SmartReplanModal.tsx` as a fallback when backend `/api/ai/weather-replan` returns empty. Fabricates Goa places even for Kyoto/Paris trips! |
| `src/data/featureData.ts` (L337–370) | `calculateMemberBalances()` | **DEMO / LOCAL** | Computes group member expense balances locally in the browser. |

---

## 3. Data Authenticity Summary Matrix

```
Total Occurrences Audited: 13 Categories
├── LIVE Providers Configured:
│   ├── Google Places API (New)   [Places, Hotels, Attractions, Photos]
│   ├── OSRM Project Router       [Road Geometries, Distance, Durations]
│   ├── Open-Meteo API            [16-day Weather Forecasts, Rain %]
│   └── Gemini 2.5 / 2.0          [Natural Language Synthesis & Reasoning]
├── DETERMINISTIC Engines Verified:
│   ├── tripCostService.ts        [Cost Summation & Savings Audit]
│   ├── routeIntelligenceService  [Backtracking & TSP Optimization]
│   ├── weatherImpactService.ts   [Rain Threshold Classification]
│   └── healthScoreService.ts     [6-Dimension Dynamic Scoring]
└── CRITICAL DISCREPANCIES TO REMEDIATE IN PHASE 1:
    ├── TripHealthScoreCard uses frontend heuristic instead of /api/ai/health-score
    ├── SmartReplanModal falls back to Goa hardcoded replan for non-Goa trips
    ├── Flight booking is 100% static demo catalog (no live GDS/OTA connector)
    ├── Google hotel priceLevel is tier only (needs bookable OTA rate integration)
    └── Currency conversion rates are hardcoded static tables (needs Forex API)
```
