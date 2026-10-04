# Travelia Phase 2: Authoritative Route Intelligence & Itinerary Optimization Engine

## 1. Overview & Objective
Phase 2 transforms Travelia's routing system into a genuinely data-driven route intelligence and itinerary optimization engine.
It establishes `server/services/routeIntelligenceService.ts` as the **Single Source of Truth** for:
- Distance (road distance vs straight-line distance)
- Travel Time (static duration vs traffic-aware duration)
- Route Geometry (authentic turn-by-turn road polylines from Google Routes / OSRM)
- Route Segments (`hotel → activity`, `activity → activity`, `activity → hotel`, `airport → hotel`, `hotel → airport`)
- Route Matrix (multi-stop pairwise origin/destination matrix with field masks)
- Route Efficiency Scores (compactness, transit burden, and backtracking ratio)
- Backtracking Detection (real route metrics; preserves legitimate hotel returns)
- Multi-Objective Itinerary Optimization (TSP / 2-Opt respecting constraints)
- Real Before/After Metrics (zero fabricated values; zero improvement strictly returned as 0)

---

## 2. Route Provider Architecture
The route provider abstraction lives in [server/services/routeEngine/routeProvider.ts](file:///e:/travelia/travelia/server/services/routeEngine/routeProvider.ts):

```
                        +----------------------------+
                        |   Active Route Provider    |
                        | (CompositeRouteProvider)   |
                        +--------------+-------------+
                                       |
                   +-------------------+-------------------+
                   |                   |                   |
            [1. Cache Check]     [2. Live API]       [3. Fallbacks]
                   |                   |                   |
                   v                   v                   v
             ROUTE_CACHE       Google Routes API      OSRM Provider
          (dataStatus='cached') (dataStatus='live') (dataStatus='live')
                                       |                   |
                                       +---------+---------+
                                                 | (on failure)
                                                 v
                                        Haversine Provider
                                       (dataStatus='fallback')
```

### Provider Details
1. **Google Routes API (Preferred Authoritative Provider)**:
   - Credentials: Kept backend-only (`GOOGLE_ROUTES_API_KEY`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_MAPS_API_KEY`).
   - Endpoint: `POST https://routes.googleapis.com/directions/v2:computeRoutes`
   - Field Mask: `routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.description`
   - Polyline: Standard 5-decimal encoded polyline decoded into Leaflet `[latitude, longitude][]` coordinates via `decodeGooglePolyline()`.
   - Matrix Endpoint: `POST https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`
   - Matrix Field Mask: `originIndex,destinationIndex,status,distanceMeters,duration,staticDuration`
2. **OSRM Route Provider (Road Routing Fallback)**:
   - Queries Open Source Routing Machine (`https://router.project-osrm.org` or self-hosted endpoint).
   - Returns real road geometry, road distances, and transit durations.
3. **Haversine Route Provider (Straight-Line Fallback)**:
   - Mathematical great-circle distance.
   - Strictly sets `distanceType: 'straight_line'`, `roadDistanceKm: null`, and `dataStatus: 'fallback'`.

---

## 3. Route Data Contracts & Schema
Every route calculation distinguishes:
- `straightLineDistanceKm`: Mathematical great-circle distance (Haversine).
- `roadDistanceKm`: Measured road distance via routing provider (or `null` if straight-line).
- `travelTimeMinutes`: Primary transit duration.
- `staticTravelTimeMinutes`: Transit duration without live traffic.
- `trafficAwareTravelTimeMinutes`: Live traffic duration where available (or `null`).
- `routeGeometry`: `[latitude, longitude][]` polyline coordinates.
- `provider`: Name of provider (`'google_routes'`, `'osrm'`, `'haversine_straight_line'`).
- `retrievedAt`: ISO 8601 timestamp string.
- `dataStatus`: `'live' | 'cached' | 'fallback' | 'unavailable'`.

---

## 4. Route Matrix Implementation
- `calculateRouteMatrix(origins, destinations, mode)`:
  - Supports multi-stop waypoint combinations.
  - Queries Google Routes `ComputeRouteMatrix` with field masks when available.
  - Automatically caches all pairwise origin/destination results in `ROUTE_CACHE` with a 2-hour TTL.
  - Avoids redundant API calls by checking cache before network calls.

---

## 5. Segment Calculations
Supports all sequential legs:
1. `airport → hotel` (on arrival day when airport is known)
2. `hotel → activity` (morning departure from accommodation)
3. `activity → activity` (intermediate daytime sightseeing hops)
4. `activity → hotel` (evening return to accommodation or midday rest break)
5. `hotel → airport` (on departure day for luggage retrieval and airport transfer)

---

## 6. Backtracking Detection
Detects geographic inefficiencies using real road metrics:
- An incident is evaluated over 3 sequential stops ($P_1 \to P_2 \to P_3$).
- If $P_3$ is the end-of-day hotel return or base accommodation, `isNecessaryReturn: true`.
- If sequence is `Hotel → Activity → Hotel`, it is recognized as a legitimate base excursion and is **NOT** penalized as an avoidable error.
- An avoidable zigzag is flagged only when $P_2$ acutely deviates from the $P_1 \to P_3$ corridor ($detourRatio > 2.4$ and excess $> 4$ km) and none of the stops are designated lodging rest stops.

---

## 7. Multi-Objective Route Optimization & Constraints
- Objectives: `'min_time'`, `'min_distance'`, `'min_cost'`, `'balanced'`.
- Preserved Constraints:
  - `mustVisit`: Activities marked `mustVisit` are never excluded.
  - `avoid`: Non-essential activities are filtered out.
  - `fixedTimes`: Fixed-time activities remain at their scheduled positions.
  - `openingHours`: Candidate sequences with opening hours violations are discarded or penalized.
  - `mealWindows` & `rest`: 45–90 minute buffers inserted around lunch/dinner.

---

## 8. Real Before/After Metrics
`OptimizationResult` strictly populates:
- `beforeDistanceKm`, `afterDistanceKm`, `distanceSavedKm`
- `beforeTravelMinutes`, `afterTravelMinutes`, `travelTimeSavedMinutes`
- `beforeCost`, `afterCost`, `costSaved`
- `beforeConflictCount`, `afterConflictCount`

**Zero Improvement Rule**:
If an itinerary is already optimal:
- `distanceSavedKm = 0`
- `travelTimeSavedMinutes = 0`
- `costSaved = 0`
No positive numbers are ever manufactured or forced.

---

## 9. Map Integration (`TripMapView`)
- Renders `roadPolyline` when real road geometry is returned from the authoritative route engine.
- Displays honest status badges:
  - `Live Google Routes API` (live Google road routing)
  - `Real Road Geometry (OSRM)` (live OSRM road routing)
  - `Straight-Line Corridor (Road geometry unavailable)` (honest straight-line transit path)
  - `Route Geometry Unavailable` (when coordinates cannot be verified)
- Eliminates fake Bézier arcs labeled as real routes.

---

## 10. What-If Simulator & Health Score Integration
- `whatIfSimulator.ts`: Deep-clones the trip context at entry (`JSON.parse(JSON.stringify(req.tripContext))`), ensuring the original trip is strictly immutable.
- `healthScoreService.ts`: Directly consumes `TripRouteMetrics` from `routeIntelligenceService.ts` without duplicate routing calculations.
