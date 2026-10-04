# Travelia — Real Places Data Layer Documentation

## 1. Overview & Architecture

Travelia uses a multi-tier, production-ready **Real Places Data Layer** powered by the **Google Places API (New)**.
The core philosophy is:

> **LIVE DATA FIRST → CACHED DATA SECOND → EXPLICIT DEMO FALLBACK THIRD → HONEST UNAVAILABLE FOURTH**

The frontend React application **never** talks directly to Google Places API. All place requests, field masking, caching, deduplication, photo proxying, and fallbacks are strictly handled by the Express backend.

```
React Frontend (UI Components)
             ↓  (HTTP /api/places/*)
Express Backend API (server/routes/places.ts)
             ↓
Authoritative Places Service (server/services/placesService.ts)
             ├── 1. In-Memory Cache (placesCache.ts, TTL: 3600s)
             ├── 2. Google Places API (New) Provider (googlePlacesProvider.ts)
             ├── 3. Curated Demo Catalog (demoPlacesService.ts)
             └── 4. Graceful Unavailable State
```

---

## 2. Google Places API (New) Setup

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a Google Cloud project (e.g. `travelia-production`).
3. Enable **Places API (New)** in **APIs & Services → Enabled APIs & services**.
4. Go to **APIs & Services → Credentials** and click **Create Credentials → API Key**.
5. **API Key Restrictions (Crucial)**:
   - **Application restrictions**: Set to *IP addresses* (enter your production backend server IPs).
   - **API restrictions**: Restrict key strictly to **Places API (New)**.
6. Copy the generated API key into your backend `.env` file as `GOOGLE_PLACES_API_KEY`.
7. **Never** prefix the variable with `VITE_` or reference it in frontend code.

---

## 3. Required APIs & Endpoints Used

Travelia interfaces exclusively with Google's modern v1 endpoints:

- **Text Search (New)**: `POST https://places.googleapis.com/v1/places:searchText`
  Used for destination queries (e.g. "tourist attractions in Goa", "hotels in Paris").
- **Nearby Search (New)**: `POST https://places.googleapis.com/v1/places:searchNearby`
  Used when destination coordinates and radius are available.
- **Place Details (New)**: `GET https://places.googleapis.com/v1/places/{id}`
  Used when a specific place is inspected in depth.
- **Place Photos (New)**: `GET https://places.googleapis.com/v1/{name}/media`
  Proxied securely via backend `/api/places/photo?name=...` so the API key is never sent to the client browser.

---

## 4. Environment Variables

Configure these in `server/.env` or root `.env`:

| Variable | Type | Default | Description |
|---|---|---|---|
| `GOOGLE_PLACES_API_KEY` | string | `""` | Server-only Google Places API key |
| `PLACES_PROVIDER` | string | `"google"` | Active places provider (`"google"` or `"demo"`) |
| `PLACES_LIVE_ENABLED` | boolean | `"true"` | When `false`, disables live calls and skips to fallback |
| `PLACES_FALLBACK_ENABLED` | boolean | `"true"` | When `true`, returns curated demo places on Google failure |
| `PLACES_CACHE_TTL_SECONDS` | number | `"3600"` | Cache duration in seconds (default 1 hour) |

---

## 5. Backend Endpoints

All endpoints are mounted under `/api/places`:

### 1. `GET /api/places/search`
Search places by destination, optional text query, category, and radius.
- **Query Parameters**:
  - `destination` (required): City or region name (e.g. `Goa, India`, `Paris`)
  - `query` (optional): Specific place search term (e.g. `beaches`, `forts`)
  - `category` (optional): `hotel`, `tourist_attraction`, `museum`, `park`, `beach`, `temple`, `church`, `landmark`, `restaurant`
  - `limit` (optional): Maximum results (default `15`, capped at `20`)
  - `latitude` / `longitude` (optional): Center coordinates
  - `radius` (optional): Search radius in meters (default `20000`)

### 2. `GET /api/places/hotels`
Search verified accommodations in a destination.
- **Query Parameters**: `destination`, `limit`

### 3. `GET /api/places/attractions`
Search tourist sights and landmarks in a destination.
- **Query Parameters**: `destination`, `limit`

### 4. `GET /api/places/photo`
Secure media proxy serving Google Place photos with caching headers without exposing API keys.
- **Query Parameters**: `name`, `maxHeight`, `maxWidth`

### 5. `GET /api/places/:placeId`
Retrieve normalized details for a specific Google Place ID or Demo Place ID.

---

## 6. Response Contract & Data Status

Every response adheres to a strict contract that clearly labels data authenticity:

```ts
interface PlacesResponse {
  success: boolean;
  destination: string;
  query?: string;
  category?: PlaceCategory;
  source: 'google' | 'demo' | 'mixed' | 'unavailable';
  dataStatus: 'live' | 'cached' | 'demo' | 'partial' | 'unavailable';
  fetchedAt: string;
  totalCount: number;
  cacheAgeSeconds?: number;
  places: TraveliaPlace[];
  error?: {
    code: string;
    message: string;
  };
}
```

### Data Status Rules:
1. `live`: Freshly retrieved from Google Places API (New).
2. `cached`: Valid in-memory cache hit from Google Places API (includes `cacheAgeSeconds`).
3. `demo`: Returned from curated demo fixtures when live API is unavailable or unconfigured.
4. `unavailable`: Empty result set returned when Google fails and demo fallback is explicitly disabled.

---

## 7. Cost Control & Field Masking

To minimize Google Maps Platform API billing:
1. **Explicit Field Masks**: We request strictly required fields (`places.id`, `places.displayName`, `places.formattedAddress`, `places.location`, `places.types`, `places.rating`, `places.userRatingCount`, `places.priceLevel`, `places.regularOpeningHours`, `places.photos`). We **never** use wildcard `*` masks.
2. **Server-Side Cache**: Queries are cached in memory for `PLACES_CACHE_TTL_SECONDS` (default 3600 seconds), preventing repeated requests for identical destinations and queries.
3. **Deduplication**: Results are deduplicated by Google Place ID and geographic proximity (< 200m).
4. **Photo Proxying**: Photos are requested at controlled dimensions (`maxHeightPx=400`, `maxWidthPx=600`) and cached client-side for 24 hours.

---

## 8. Hotel Pricing & Reality Integrity

- **Google `priceLevel` (0 to 4)** represents general price tier, **not a nightly room rate**.
- Travelia **never** converts `priceLevel = 3` into a fabricated `₹3,500/night` room rate.
- Authentic hotel prices require a certified hotel reservation inventory integration (GDS/OTA). Until connected, hotel room rates are marked as estimated or unavailable.
- Gemini is prohibited from inventing place facts (names, ratings, opening hours, prices, coordinates).

---

## 9. Testing & How to Run

### Run Demo Mode (No Google API Key Needed)
```bash
# In .env:
PLACES_LIVE_ENABLED=false
PLACES_FALLBACK_ENABLED=true
```
Start the server:
```bash
npm run dev
```
All searches will return curated demo places clearly marked with `source: 'demo'`, `dataStatus: 'demo'`.

### Run Live Mode (Google Places API Connected)
```bash
# In .env:
GOOGLE_PLACES_API_KEY=AIzaSy...your_key_here
PLACES_LIVE_ENABLED=true
PLACES_FALLBACK_ENABLED=true
```
Start the server:
```bash
npm run dev
```
Places will be fetched from Google Places API (New) and labeled `● Live Google Place` with green pulse indicators.
