# Travelia — Phase 4: Persistent Trip System Architecture

## Overview
Phase 4 migrates Travelia from in-memory/frontend demo trip state to a real backend-backed relational database persistence system with repository separation, REST API endpoints, transaction support, and What-If immutability.

---

## 1. Database Technology Selection
- **Engine**: SQLite 3 via Node.js built-in `node:sqlite` (`DatabaseSync`).
- **Runtime Compatibility**: Node.js v26.7.0 (built into Node; requires zero npm packages, zero external C++ build toolchains on Windows).
- **Storage**:
  - File-based database: `data/travelia.sqlite` (auto-created directory, WAL mode, foreign keys enabled).
  - In-memory database: `:memory:` for automated integration and unit testing.
- **Concurrency & Reliability**:
  - `PRAGMA foreign_keys = ON;`
  - `PRAGMA journal_mode = WAL;` (Write-Ahead Logging for high concurrent read/write throughput)
  - `PRAGMA synchronous = NORMAL;`

---

## 2. Relational Schema & Tables
All tables enforce stable IDs and relational constraints:

1. **`users`**:
   - `id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `email TEXT UNIQUE`, `created_at TEXT`
2. **`trips`**:
   - `id TEXT PRIMARY KEY`, `user_id TEXT REFERENCES users(id)`, `destination TEXT NOT NULL`, `country TEXT`, `tagline TEXT`, `hero_image TEXT`, `days INTEGER`, `nights INTEGER`, `travelers INTEGER`, `travel_dates TEXT`, `start_date TEXT`, `end_date TEXT`, `status TEXT`, `hotel_category TEXT`, `transport_type TEXT`, `food_preference TEXT`, `activity_level TEXT`, `budget_total REAL`, `budget_spent REAL`, `budget_hotel REAL`, `budget_flights REAL`, `budget_food REAL`, `budget_transportation REAL`, `budget_activities REAL`, `budget_miscellaneous REAL`, `currency TEXT`, `preferences_json TEXT`, `ai_notes_json TEXT`, `hotels_json TEXT`, `tourist_places_json TEXT`, `restaurants_json TEXT`, `is_demo INTEGER`, `created_at TEXT`, `updated_at TEXT`
3. **`trip_days`**:
   - `id TEXT PRIMARY KEY`, `trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE`, `day_number INTEGER`, `title TEXT`, `theme TEXT`, `date TEXT`, `formatted_date TEXT`, `created_at TEXT`, `updated_at TEXT`
4. **`activities`**:
   - `id TEXT PRIMARY KEY`, `trip_day_id TEXT NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE`, `trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE`, `time TEXT`, `activity TEXT`, `location TEXT`, `estimated_cost REAL`, `duration TEXT`, `duration_minutes INTEGER`, `latitude REAL`, `longitude REAL`, `ai_recommendation TEXT`, `category TEXT`, `image_url TEXT`, `sort_order INTEGER`, `created_at TEXT`, `updated_at TEXT`
5. **`place_references`**:
   - `id TEXT PRIMARY KEY`, `trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE`, `activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL`, `source TEXT`, `source_id TEXT`, `name TEXT`, `category TEXT`, `latitude REAL`, `longitude REAL`, `address TEXT`, `rating REAL`, `user_ratings_total INTEGER`, `data_status TEXT`, `created_at TEXT`
6. **`expenses`**:
   - `id TEXT PRIMARY KEY`, `trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE`, `title TEXT`, `category TEXT`, `amount REAL`, `currency TEXT`, `paid_by TEXT`, `paid_by_name TEXT`, `split_between_json TEXT`, `date TEXT`, `activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL`, `note TEXT`, `created_at TEXT`, `updated_at TEXT`
7. **`group_members`**:
   - `id TEXT PRIMARY KEY`, `trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE`, `name TEXT`, `email TEXT`, `role TEXT`, `avatar TEXT`, `status TEXT`, `created_at TEXT`
8. **`flights`**:
   - `id TEXT PRIMARY KEY`, `trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE`, `flight_number TEXT`, `airline TEXT`, `departure_airport TEXT`, `arrival_airport TEXT`, `departure_time TEXT`, `arrival_time TEXT`, `departure_date TEXT`, `arrival_date TEXT`, `price REAL`, `cabin_class TEXT`, `status TEXT`, `created_at TEXT`
9. **`optimization_results`**:
   - `id TEXT PRIMARY KEY`, `trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE`, `summary TEXT`, `health_score_before INTEGER`, `health_score_after INTEGER`, `before_distance_km REAL`, `after_distance_km REAL`, `distance_saved_km REAL`, `before_travel_minutes REAL`, `after_travel_minutes REAL`, `travel_time_saved_minutes REAL`, `before_cost REAL`, `after_cost REAL`, `cost_saved REAL`, `before_conflict_count INTEGER`, `after_conflict_count INTEGER`, `changes_json TEXT`, `created_at TEXT`
10. **`weather_snapshots`**:
    - `id TEXT PRIMARY KEY`, `trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE`, `day_number INTEGER`, `date TEXT`, `condition TEXT`, `temp_max_c REAL`, `temp_min_c REAL`, `rain_chance_percent REAL`, `source TEXT`, `status TEXT`, `recorded_at TEXT`

---

## 3. Repositories (`server/repositories/`)
- `tripRepository`: Full trip lifecycle, relational assembly of days/activities, updates with timestamps, cascading deletes.
- `activityRepository`: Activity CRUD, sort order management, day creation.
- `expenseRepository`: Group and trip expense tracking with automatic `budget_spent` recalculation on trips.
- `groupRepository`: Group collaboration members and roles.
- `flightRepository`: Flight itinerary association and pricing.
- `optimizationRepository`: What-If simulation tracking preserving immutability.
- `weatherSnapshotRepository`: Historical/forecast weather snapshots per trip day.

---

## 4. API Endpoints (`/api/trips`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/trips` | Lists all trips with `dataSource` (`'PERSISTED'` vs `'DEMO DATA'`) |
| `POST` | `/api/trips` | Creates new trip, validates body, checks ID collisions |
| `GET` | `/api/trips/:id` | Retrieves full trip with days, activities, expenses, members |
| `PUT` | `/api/trips/:id` | Updates trip metadata, preferences, budget, or itinerary |
| `DELETE` | `/api/trips/:id` | Cascading delete of trip and child entities |
| `POST` | `/api/trips/:id/activities` | Adds activity to a trip day |
| `PUT` | `/api/trips/:id/activities/:activityId` | Updates activity details |
| `DELETE` | `/api/trips/:id/activities/:activityId` | Removes activity from trip day |
| `GET` | `/api/trips/:id/expenses` | Lists expenses for trip |
| `POST` | `/api/trips/:id/expenses` | Adds expense and updates spent budget |
| `PUT` | `/api/trips/:id/expenses/:expenseId` | Updates expense |
| `DELETE` | `/api/trips/:id/expenses/:expenseId` | Removes expense and adjusts spent budget |
| `POST` | `/api/trips/:id/optimizations` | Records What-If optimization result (immutable) |
| `GET` | `/api/trips/:id/optimizations` | Retrieves optimization history |
| `POST` | `/api/trips/seed-demo` | Seeds demo trips explicitly flagged as `is_demo = 1` |

---

## 5. Frontend Integration
- **`src/services/tripClient.ts`**: Unified frontend HTTP client for all trip, activity, expense, and optimization operations.
- **`src/App.tsx`**: On mount, synchronizes saved trips from backend; persists trip creation, updates, deletions, and activities.
- **`src/components/MyTripsView.tsx`**: Displays explicit `DEMO DATA` vs `PERSISTED` badges on trip cards.
- **`src/components/TripDashboardView.tsx`**: Displays persistent status in the hero banner and synchronizes saved state.
- **`src/components/GroupExpenseSplitter.tsx`**: Fetches trip expenses from backend database; persists added and deleted expenses.

---

## 6. Migration Strategy
- Demo trips remain available as fallback, explicitly tagged with `isDemo: true` and `dataSource: 'DEMO DATA'`.
- Real user trips are saved to SQLite and tagged with `isDemo: false` and `dataSource: 'PERSISTED'`.
- Demo trips never overwrite real user trip data.
