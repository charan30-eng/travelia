-- TRAVELIA RELATIONAL DATABASE SCHEMA (SQLite 3)
-- Target Architecture: React -> API -> Repositories -> SQLite (node:sqlite)

PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  destination TEXT NOT NULL,
  country TEXT,
  tagline TEXT,
  hero_image TEXT,
  days INTEGER NOT NULL DEFAULT 1,
  nights INTEGER NOT NULL DEFAULT 0,
  travelers INTEGER NOT NULL DEFAULT 1,
  travel_dates TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  hotel_category TEXT DEFAULT 'mid',
  transport_type TEXT DEFAULT 'cab',
  food_preference TEXT DEFAULT 'casual',
  activity_level TEXT DEFAULT 'moderate',
  budget_total REAL NOT NULL DEFAULT 0,
  budget_spent REAL NOT NULL DEFAULT 0,
  budget_hotel REAL NOT NULL DEFAULT 0,
  budget_flights REAL NOT NULL DEFAULT 0,
  budget_food REAL NOT NULL DEFAULT 0,
  budget_transportation REAL NOT NULL DEFAULT 0,
  budget_activities REAL NOT NULL DEFAULT 0,
  budget_miscellaneous REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  preferences_json TEXT,
  ai_notes_json TEXT,
  hotels_json TEXT,
  tourist_places_json TEXT,
  restaurants_json TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Trip Days Table
CREATE TABLE IF NOT EXISTS trip_days (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  theme TEXT,
  date TEXT,
  formatted_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Activities Table
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  trip_day_id TEXT NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  time TEXT NOT NULL,
  activity TEXT NOT NULL,
  location TEXT NOT NULL,
  estimated_cost REAL NOT NULL DEFAULT 0,
  duration TEXT,
  duration_minutes INTEGER,
  latitude REAL,
  longitude REAL,
  ai_recommendation TEXT,
  category TEXT NOT NULL DEFAULT 'sightseeing',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Place References Table
CREATE TABLE IF NOT EXISTS place_references (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  address TEXT,
  rating REAL,
  user_ratings_total INTEGER,
  data_status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'misc',
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  paid_by TEXT NOT NULL,
  paid_by_name TEXT,
  split_between_json TEXT,
  date TEXT NOT NULL,
  activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'co-traveler',
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Flights Table
CREATE TABLE IF NOT EXISTS flights (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  flight_number TEXT,
  airline TEXT NOT NULL,
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_time TEXT,
  arrival_time TEXT,
  departure_date TEXT,
  arrival_date TEXT,
  price REAL NOT NULL DEFAULT 0,
  cabin_class TEXT DEFAULT 'economy',
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. Optimization Results Table
CREATE TABLE IF NOT EXISTS optimization_results (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  health_score_before INTEGER,
  health_score_after INTEGER,
  before_distance_km REAL,
  after_distance_km REAL,
  distance_saved_km REAL,
  before_travel_minutes REAL,
  after_travel_minutes REAL,
  travel_time_saved_minutes REAL,
  before_cost REAL,
  after_cost REAL,
  cost_saved REAL,
  before_conflict_count INTEGER,
  after_conflict_count INTEGER,
  changes_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. Weather Snapshots Table
CREATE TABLE IF NOT EXISTS weather_snapshots (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  condition TEXT NOT NULL,
  temp_max_c REAL NOT NULL,
  temp_min_c REAL NOT NULL,
  rain_chance_percent REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'open-meteo',
  status TEXT NOT NULL DEFAULT 'live',
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_days_trip_id ON trip_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_days_day_num ON trip_days(trip_id, day_number);
CREATE INDEX IF NOT EXISTS idx_activities_trip_day_id ON activities(trip_day_id);
CREATE INDEX IF NOT EXISTS idx_activities_trip_id ON activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_place_refs_trip_id ON place_references(trip_id);
CREATE INDEX IF NOT EXISTS idx_place_refs_act_id ON place_references(activity_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_group_members_trip_id ON group_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_flights_trip_id ON flights(trip_id);
CREATE INDEX IF NOT EXISTS idx_opt_results_trip_id ON optimization_results(trip_id);
CREATE INDEX IF NOT EXISTS idx_weather_snapshots_trip_id ON weather_snapshots(trip_id);
