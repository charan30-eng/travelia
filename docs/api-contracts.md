# Travelia — Backend API Contracts & Interface Specifications

All backend endpoints are mounted under `/api` and serve strict JSON contracts. All endpoints adhere to honest data status labeling (`live`, `cached`, `demo`, `partial`, `unavailable`).

---

## 1. System Health

### `GET /api/health`
Returns service uptime and connectivity status.
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "Travelia Backend API",
  "timestamp": "2026-10-04T09:55:00.000Z"
}
```

---

## 2. Places Data Layer (`/api/places/*`)

### `GET /api/places/search`
Search verified places in a destination by text query, category, or radius.
- **Query Parameters**:
  - `destination` (string, required): e.g. `"Goa, India"`, `"Paris"`
  - `query` (string, optional): Search keyword (e.g. `"beaches"`, `"museums"`)
  - `category` (string, optional): `"hotel" | "tourist_attraction" | "museum" | "park" | "beach" | "restaurant"`
  - `limit` (number, default: `15`, max: `20`)
  - `latitude`, `longitude` (number, optional): Center coordinates
  - `radius` (number, default: `20000` meters)
- **Response `200 OK`**:
```json
{
  "success": true,
  "destination": "Goa, India",
  "source": "google",
  "dataStatus": "live",
  "fetchedAt": "2026-10-04T09:55:00.000Z",
  "totalCount": 8,
  "cacheAgeSeconds": 0,
  "places": [
    {
      "id": "place_google_ChIJ...",
      "name": "Baga Beach",
      "address": "Baga, Goa 403516, India",
      "latitude": 15.5553,
      "longitude": 73.7517,
      "rating": 4.5,
      "userRatingsTotal": 34120,
      "priceLevel": 2,
      "category": "beach",
      "source": "google",
      "dataStatus": "live",
      "photos": [{ "uri": "/api/places/photo?name=places/..." }]
    }
  ]
}
```

### `GET /api/places/hotels`
Search verified lodging for a destination.
- **Query Parameters**: `destination` (required), `limit` (optional, default: `10`)

### `GET /api/places/attractions`
Search tourist sights and landmarks for a destination.
- **Query Parameters**: `destination` (required), `limit` (optional, default: `10`)

### `GET /api/places/photo`
Secure media proxy. Fetches Google Place photos server-side to prevent exposing Google API keys to the browser.
- **Query Parameters**: `name` (required Google photo reference), `maxHeight`, `maxWidth`

### `GET /api/places/:placeId`
Retrieves normalized place details by Google Place ID or demo ID.

---

## 3. Route Intelligence (`/api/route/*`)

### `GET /api/route/status`
Returns active route provider (`osrm` or `haversine`), OSRM base URL, and supported transit modes.

### `POST /api/route/day`
Computes road metrics and polyline geometry for a single day's stops.
- **Request Body**:
```json
{
  "dayNumber": 1,
  "destination": "Goa",
  "mode": "driving",
  "activities": [
    {
      "id": "act-1",
      "name": "Baga Beach",
      "location": "Baga",
      "coords": { "latitude": 15.5553, "longitude": 73.7517 },
      "time": "10:00 AM",
      "durationMinutes": 120
    }
  ]
}
```
- **Response `200 OK`**:
```json
{
  "dayNumber": 1,
  "totalDistanceKm": 24.3,
  "totalTravelMinutes": 52,
  "travelHours": 0.9,
  "backtrackingDistanceKm": 3.2,
  "hasAvoidableBacktracking": false,
  "availability": "live",
  "segments": [
    {
      "fromActivityId": "start",
      "toActivityId": "act-1",
      "distanceKm": 12.1,
      "durationMinutes": 26,
      "distanceType": "road",
      "geometry": [[15.5186, 73.7628], [15.5553, 73.7517]]
    }
  ],
  "conflicts": []
}
```

### `POST /api/route/optimize-day`
Runs TSP 2-opt sequence optimization to uncross transit legs and eliminate backtracking.
- **Request Body**: `{ "dayRoute": DayRouteInput, "constraints": { "preserveFirst": true, "preserveLast": true } }`
- **Response `200 OK`**: `{ "optimizedRoute": DayRoute, "distanceSavedKm": 5.4, "minutesSaved": 14 }`

### `POST /api/route/analyze`
Computes end-to-end trip route metrics across all days, aggregating total distance, travel hours, and transit conflicts.

---

## 4. Weather Intelligence (`/api/weather/*`)

### `GET /api/weather/forecast`
Fetches normalized 16-day meteorological forecast from Open-Meteo.
- **Query Parameters**:
  - `destination` (string, required): e.g. `"Goa"`
  - `startDate` (string, optional): ISO date `"2026-10-05"`
  - `days` (number, default: `3`, max: `16`)
  - `lat`, `lng` (number, optional coordinates)
- **Response `200 OK`**:
```json
{
  "destination": "Goa",
  "source": "Open-Meteo",
  "availability": "live",
  "fetchedAt": "2026-10-04T09:55:00.000Z",
  "cacheAgeSeconds": 0,
  "days": [
    {
      "dayNumber": 1,
      "date": "2026-10-05",
      "condition": "Moderate rain",
      "tempMaxC": 29.4,
      "tempMinC": 24.1,
      "precipitationProbability": 75,
      "weatherCode": 63,
      "isRainExpected": true,
      "uvIndex": 6.2
    }
  ]
}
```

### `POST /api/weather/impact`
Evaluates weather impact on a list of activities (flags outdoor activities facing rain $\ge 60\%$).

### `POST /api/weather/replan`
Generates a structured disruption replan proposal with verified indoor alternatives.

---

## 5. AI Copilot & Deterministic Engines (`/api/ai/*`)

### `GET /api/ai/status`
Returns status of Gemini LLM and deterministic engines.

### `POST /api/ai/chat`
Conversational copilot endpoint. Resolves user intent, grounds response in deterministic engine data, and returns action proposals.
- **Request Body**:
```json
{
  "message": "Make my trip cheaper",
  "tripContext": {
    "destination": "Goa",
    "days": 4,
    "travelers": 2,
    "budget": { "total": 30000, "hotel": 10000, "activities": 8000 },
    "itinerary": [...]
  },
  "history": []
}
```
- **Response `200 OK`**:
```json
{
  "reply": "I analyzed your Goa itinerary. By optimizing attraction admission tiers and replacing high-cost charters, we can unlock ₹3,750 in savings...",
  "intent": "budget",
  "confidence": 0.94,
  "actionProposal": {
    "type": "budget_cut",
    "label": "Apply ₹3,750 Budget Optimization",
    "description": "Swaps expensive charters with scenic heritage transit.",
    "estimatedSavings": 3750,
    "healthScoreDelta": 2,
    "travelTimeSavedMins": 36,
    "optimizationResult": { ... }
  },
  "suggestedFollowUps": [
    "Preview the Before vs After diff",
    "Keep beach activities but cut more",
    "Why is my health score low?"
  ],
  "deterministicCalculationsUsed": true
}
```

### `POST /api/ai/optimize`
Runs the comprehensive multi-factor itinerary optimizer.
- **Request Body**: `{ "tripContext": TripContext, "targetSavingsPercentage": 0.15 }`
- **Response `200 OK`**: Returns `OptimizationResult` containing:
  - `costBefore`, `costAfter`, `estimatedSavings`
  - `travelDistanceKmBefore`, `travelDistanceKmAfter`, `travelDistanceSavedKm`
  - `travelTimeHoursBefore`, `travelTimeHoursAfter`, `travelTimeSavedHours`
  - `healthScoreBefore`, `healthScoreAfter`
  - `optimizedItinerary`
  - `changes`: List of specific activity adjustments, before/after names, costs, and rationale.

### `POST /api/ai/health-score`
Computes the dynamic 6-dimension health score for a trip.
- **Request Body**: `{ "tripContext": TripContext }`
- **Response `200 OK`**: Returns `ComputedHealthScore` with `overallScore` (0–100), `scoreLabel`, and breakdown across `budgetEfficiency`, `routeEfficiency`, `scheduleBalance`, `restTime`, `activityDiversity`, and `weatherCompatibility`.

### `POST /api/ai/what-if`
Simulates a hypothetical scenario without mutating the current trip.
- **Request Body**:
```json
{
  "scenarioType": "reduce_budget" | "add_traveler" | "drop_day" | "rainy_day",
  "tripContext": TripContext,
  "parameters": { "targetBudget": 20000 }
}
```
- **Response `200 OK`**: Returns `WhatIfScenarioResponse` with before/after comparisons and impact summary.
