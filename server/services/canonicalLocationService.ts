/**
 * Canonical Location & Airport Resolution Service (Backend)
 * 
 * Provides unified, authoritative geographic resolution and airport selection.
 * Enforces geographic bounds, country consistency, and strict coordinate sanity.
 * NEVER fabricates coordinates or confuses origin with destination.
 */

import { CanonicalLocation, Airport, GeographicBounds } from '../types/location';

// Authoritative national bounding boxes for semantic consistency
export const COUNTRY_BOUNDING_BOXES: Record<string, GeographicBounds> = {
  IN: { minLat: 6.5, maxLat: 37.5, minLng: 68.0, maxLng: 97.5 },     // India
  PK: { minLat: 23.5, maxLat: 37.1, minLng: 60.8, maxLng: 75.5 },    // Pakistan
  JP: { minLat: 24.0, maxLat: 46.0, minLng: 122.0, maxLng: 154.0 },  // Japan
  FR: { minLat: 41.0, maxLat: 51.5, minLng: -5.5, maxLng: 10.0 },    // France
  IT: { minLat: 35.5, maxLat: 47.5, minLng: 6.5, maxLng: 19.0 },     // Italy
  GB: { minLat: 49.5, maxLat: 61.0, minLng: -8.5, maxLng: 2.0 },     // United Kingdom
  US: { minLat: 24.0, maxLat: 50.0, minLng: -125.0, maxLng: -66.0 }, // USA (Contiguous)
  CH: { minLat: 45.8, maxLat: 47.9, minLng: 5.9, maxLng: 10.5 },     // Switzerland
  ID: { minLat: -11.0, maxLat: 6.5, minLng: 95.0, maxLng: 141.0 },   // Indonesia
  AE: { minLat: 22.5, maxLat: 26.5, minLng: 51.0, maxLng: 56.5 },    // United Arab Emirates
  SG: { minLat: 1.15, maxLat: 1.48, minLng: 103.55, maxLng: 104.1 }, // Singapore
  TH: { minLat: 5.5, maxLat: 20.5, minLng: 97.0, maxLng: 106.0 },    // Thailand
  KR: { minLat: 33.0, maxLat: 38.8, minLng: 124.5, maxLng: 131.0 },  // South Korea
  NO: { minLat: 57.9, maxLat: 71.2, minLng: 4.5, maxLng: 31.1 }      // Norway
};

// Authoritative Canonical Location Catalog
export const CANONICAL_LOCATIONS: Record<string, CanonicalLocation> = {
  delhi: {
    id: 'loc-in-delhi',
    name: 'Delhi',
    city: 'Delhi',
    state: 'National Capital Territory of Delhi',
    country: 'India',
    countryCode: 'IN',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified',
    entityType: 'city'
  },
  chennai: {
    id: 'loc-in-chennai',
    name: 'Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    countryCode: 'IN',
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified',
    entityType: 'city'
  },
  mumbai: {
    id: 'loc-in-mumbai',
    name: 'Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    countryCode: 'IN',
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified',
    entityType: 'city'
  },
  bengaluru: {
    id: 'loc-in-bengaluru',
    name: 'Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    countryCode: 'IN',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified',
    entityType: 'city'
  },
  goa: {
    id: 'loc-in-goa',
    name: 'Goa',
    city: 'Goa',
    state: 'Goa',
    country: 'India',
    countryCode: 'IN',
    latitude: 15.4989,
    longitude: 73.8311,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified',
    entityType: 'region'
  },
  hyderabad: {
    id: 'loc-in-hyderabad',
    name: 'Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    countryCode: 'IN',
    latitude: 17.3850,
    longitude: 78.4867,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified'
  },
  kolkata: {
    id: 'loc-in-kolkata',
    name: 'Kolkata',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    countryCode: 'IN',
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified'
  },
  jaipur: {
    id: 'loc-in-jaipur',
    name: 'Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    countryCode: 'IN',
    latitude: 26.9124,
    longitude: 75.7873,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified'
  },
  kochi: {
    id: 'loc-in-kochi',
    name: 'Kochi',
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
    countryCode: 'IN',
    latitude: 9.9312,
    longitude: 76.2673,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified'
  },
  kerala: {
    id: 'loc-in-kerala',
    name: 'Kerala',
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
    countryCode: 'IN',
    latitude: 9.9312,
    longitude: 76.2673,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified'
  },
  paris: {
    id: 'loc-fr-paris',
    name: 'Paris',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: 'Europe/Paris',
    source: 'catalog',
    status: 'verified'
  },
  tokyo: {
    id: 'loc-jp-tokyo',
    name: 'Tokyo',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    source: 'catalog',
    status: 'verified'
  },
  kyoto: {
    id: 'loc-jp-kyoto',
    name: 'Kyoto',
    city: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.0116,
    longitude: 135.7681,
    timezone: 'Asia/Tokyo',
    source: 'catalog',
    status: 'verified'
  },
  rome: {
    id: 'loc-it-rome',
    name: 'Rome',
    city: 'Rome',
    country: 'Italy',
    countryCode: 'IT',
    latitude: 41.9028,
    longitude: 12.4964,
    timezone: 'Europe/Rome',
    source: 'catalog',
    status: 'verified'
  },
  london: {
    id: 'loc-gb-london',
    name: 'London',
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    source: 'catalog',
    status: 'verified'
  },
  new_york: {
    id: 'loc-us-newyork',
    name: 'New York City',
    city: 'New York',
    state: 'NY',
    country: 'United States',
    countryCode: 'US',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
    source: 'catalog',
    status: 'verified'
  },
  bali: {
    id: 'loc-id-bali',
    name: 'Bali',
    city: 'Bali',
    country: 'Indonesia',
    countryCode: 'ID',
    latitude: -8.4095,
    longitude: 115.1889,
    timezone: 'Asia/Makassar',
    source: 'catalog',
    status: 'verified'
  },
  amalfi: {
    id: 'loc-it-amalfi',
    name: 'Amalfi Coast',
    city: 'Amalfi',
    country: 'Italy',
    countryCode: 'IT',
    latitude: 40.6340,
    longitude: 14.6027,
    timezone: 'Europe/Rome',
    source: 'catalog',
    status: 'verified'
  },
  swiss: {
    id: 'loc-ch-interlaken',
    name: 'Interlaken & Swiss Alps',
    city: 'Interlaken',
    country: 'Switzerland',
    countryCode: 'CH',
    latitude: 46.6863,
    longitude: 7.8632,
    timezone: 'Europe/Zurich',
    source: 'catalog',
    status: 'verified'
  },
  dubai: {
    id: 'loc-ae-dubai',
    name: 'Dubai',
    city: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: 'Asia/Dubai',
    source: 'catalog',
    status: 'verified'
  },
  singapore: {
    id: 'loc-sg-singapore',
    name: 'Singapore',
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: 'Asia/Singapore',
    source: 'catalog',
    status: 'verified'
  },
  bangkok: {
    id: 'loc-th-bangkok',
    name: 'Bangkok',
    city: 'Bangkok',
    country: 'Thailand',
    countryCode: 'TH',
    latitude: 13.7563,
    longitude: 100.5018,
    timezone: 'Asia/Bangkok',
    source: 'catalog',
    status: 'verified'
  },
  seoul: {
    id: 'loc-kr-seoul',
    name: 'Seoul',
    city: 'Seoul',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 37.5665,
    longitude: 126.9780,
    timezone: 'Asia/Seoul',
    source: 'catalog',
    status: 'verified',
    entityType: 'city'
  },
  norway: {
    id: 'loc-no-norway',
    name: 'Norway',
    city: 'Oslo',
    country: 'Norway',
    countryCode: 'NO',
    latitude: 59.9139,
    longitude: 10.7522,
    timezone: 'Europe/Oslo',
    source: 'catalog',
    status: 'verified',
    entityType: 'country',
    displayName: 'Norway (Top Attractions Across Country)'
  },
  oslo: {
    id: 'loc-no-oslo',
    name: 'Oslo',
    city: 'Oslo',
    country: 'Norway',
    countryCode: 'NO',
    latitude: 59.9139,
    longitude: 10.7522,
    timezone: 'Europe/Oslo',
    source: 'catalog',
    status: 'verified',
    entityType: 'city'
  },
  bergen: {
    id: 'loc-no-bergen',
    name: 'Bergen',
    city: 'Bergen',
    country: 'Norway',
    countryCode: 'NO',
    latitude: 60.3913,
    longitude: 5.3221,
    timezone: 'Europe/Oslo',
    source: 'catalog',
    status: 'verified',
    entityType: 'city'
  },
  india: {
    id: 'loc-in-india',
    name: 'India',
    city: 'Delhi',
    country: 'India',
    countryCode: 'IN',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified',
    entityType: 'country'
  },
  france: {
    id: 'loc-fr-france',
    name: 'France',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: 'Europe/Paris',
    source: 'catalog',
    status: 'verified',
    entityType: 'country'
  },
  japan: {
    id: 'loc-jp-japan',
    name: 'Japan',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    source: 'catalog',
    status: 'verified',
    entityType: 'country'
  },
  united_kingdom: {
    id: 'loc-gb-uk',
    name: 'United Kingdom',
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    source: 'catalog',
    status: 'verified',
    entityType: 'country'
  },
  uae: {
    id: 'loc-ae-uae',
    name: 'United Arab Emirates',
    city: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: 'Asia/Dubai',
    source: 'catalog',
    status: 'verified',
    entityType: 'country'
  },
  taj_mahal: {
    id: 'loc-in-tajmahal',
    name: 'Taj Mahal',
    city: 'Agra',
    state: 'Uttar Pradesh',
    country: 'India',
    countryCode: 'IN',
    latitude: 27.1751,
    longitude: 78.0421,
    timezone: 'Asia/Kolkata',
    source: 'catalog',
    status: 'verified',
    entityType: 'place'
  },
  eiffel_tower: {
    id: 'loc-fr-eiffeltower',
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    latitude: 48.8584,
    longitude: 2.2945,
    timezone: 'Europe/Paris',
    source: 'catalog',
    status: 'verified',
    entityType: 'place'
  }
};

export const LOCATION_ALIASES: Record<string, string> = {
  'new delhi': 'delhi',
  'ncr': 'delhi',
  'madras': 'chennai',
  'bombay': 'mumbai',
  'bangalore': 'bengaluru',
  'calcutta': 'kolkata',
  'cochin': 'kochi',
  'switzerland': 'swiss',
  'swiss alps': 'swiss',
  'interlaken': 'swiss',
  'nyc': 'new_york',
  'new york': 'new_york',
  'amalfi coast': 'amalfi',
  'positano': 'amalfi',
  'osaka': 'kyoto',
  'norway': 'norway',
  'norge': 'norway',
  'oslo': 'oslo',
  'bergen': 'bergen',
  'uk': 'united_kingdom',
  'united kingdom': 'united_kingdom',
  'great britain': 'united_kingdom',
  'england': 'united_kingdom',
  'britain': 'united_kingdom',
  'uae': 'uae',
  'united arab emirates': 'uae',
  'taj mahal': 'taj_mahal',
  'eiffel tower': 'eiffel_tower'
};

export const AIRPORT_REGISTRY: Record<string, Airport> = {
  DEL: {
    airportCode: 'DEL',
    airportName: "Indira Gandhi International Airport (T3)",
    city: 'Delhi',
    country: 'India',
    countryCode: 'IN',
    latitude: 28.5562,
    longitude: 77.1000,
    source: 'authoritative_registry',
    status: 'verified'
  },
  MAA: {
    airportCode: 'MAA',
    airportName: 'Chennai International Airport (T1/T4)',
    city: 'Chennai',
    country: 'India',
    countryCode: 'IN',
    latitude: 12.9941,
    longitude: 80.1709,
    source: 'authoritative_registry',
    status: 'verified'
  },
  BOM: {
    airportCode: 'BOM',
    airportName: "Chhatrapati Shivaji Maharaj Int'l Airport (T2)",
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    latitude: 19.0896,
    longitude: 72.8656,
    source: 'authoritative_registry',
    status: 'verified'
  },
  BLR: {
    airportCode: 'BLR',
    airportName: "Kempegowda International Airport (T2)",
    city: 'Bengaluru',
    country: 'India',
    countryCode: 'IN',
    latitude: 13.1986,
    longitude: 77.7066,
    source: 'authoritative_registry',
    status: 'verified'
  },
  HYD: {
    airportCode: 'HYD',
    airportName: "Rajiv Gandhi International Airport",
    city: 'Hyderabad',
    country: 'India',
    countryCode: 'IN',
    latitude: 17.2403,
    longitude: 78.4294,
    source: 'authoritative_registry',
    status: 'verified'
  },
  CCU: {
    airportCode: 'CCU',
    airportName: "Netaji Subhash Chandra Bose Int'l Airport",
    city: 'Kolkata',
    country: 'India',
    countryCode: 'IN',
    latitude: 22.6547,
    longitude: 88.4467,
    source: 'authoritative_registry',
    status: 'verified'
  },
  GOX: {
    airportCode: 'GOX',
    airportName: "Manohar International Airport, Mopa (T1)",
    city: 'Goa',
    country: 'India',
    countryCode: 'IN',
    latitude: 15.7667,
    longitude: 73.8667,
    source: 'authoritative_registry',
    status: 'verified'
  },
  GOI: {
    airportCode: 'GOI',
    airportName: "Dabolim International Airport",
    city: 'Goa',
    country: 'India',
    countryCode: 'IN',
    latitude: 15.3808,
    longitude: 73.8314,
    source: 'authoritative_registry',
    status: 'verified'
  },
  COK: {
    airportCode: 'COK',
    airportName: "Cochin International Airport",
    city: 'Kochi',
    country: 'India',
    countryCode: 'IN',
    latitude: 10.1556,
    longitude: 76.3912,
    source: 'authoritative_registry',
    status: 'verified'
  },
  JAI: {
    airportCode: 'JAI',
    airportName: "Jaipur International Airport (T2)",
    city: 'Jaipur',
    country: 'India',
    countryCode: 'IN',
    latitude: 26.8288,
    longitude: 75.8056,
    source: 'authoritative_registry',
    status: 'verified'
  },
  AMD: {
    airportCode: 'AMD',
    airportName: "Sardar Vallabhbhai Patel Int'l Airport",
    city: 'Ahmedabad',
    country: 'India',
    countryCode: 'IN',
    latitude: 23.0772,
    longitude: 72.6347,
    source: 'authoritative_registry',
    status: 'verified'
  },
  CDG: {
    airportCode: 'CDG',
    airportName: "Paris Charles de Gaulle Airport (T2E)",
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    latitude: 49.0097,
    longitude: 2.5479,
    source: 'authoritative_registry',
    status: 'verified'
  },
  HND: {
    airportCode: 'HND',
    airportName: "Tokyo Haneda International Airport (T3)",
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.5494,
    longitude: 139.7798,
    source: 'authoritative_registry',
    status: 'verified'
  },
  KIX: {
    airportCode: 'KIX',
    airportName: "Kansai International Airport (T1)",
    city: 'Osaka / Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 34.4320,
    longitude: 135.2304,
    source: 'authoritative_registry',
    status: 'verified'
  },
  LHR: {
    airportCode: 'LHR',
    airportName: "London Heathrow Airport (T5)",
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    latitude: 51.4700,
    longitude: -0.4543,
    source: 'authoritative_registry',
    status: 'verified'
  },
  FCO: {
    airportCode: 'FCO',
    airportName: "Leonardo da Vinci–Fiumicino Airport (T3)",
    city: 'Rome',
    country: 'Italy',
    countryCode: 'IT',
    latitude: 41.8003,
    longitude: 12.2389,
    source: 'authoritative_registry',
    status: 'verified'
  },
  JFK: {
    airportCode: 'JFK',
    airportName: "John F. Kennedy International Airport (T4)",
    city: 'New York',
    country: 'United States',
    countryCode: 'US',
    latitude: 40.6413,
    longitude: -73.7781,
    source: 'authoritative_registry',
    status: 'verified'
  },
  ZRH: {
    airportCode: 'ZRH',
    airportName: "Zurich Kloten Airport",
    city: 'Zurich / Interlaken',
    country: 'Switzerland',
    countryCode: 'CH',
    latitude: 47.4582,
    longitude: 8.5555,
    source: 'authoritative_registry',
    status: 'verified'
  },
  DPS: {
    airportCode: 'DPS',
    airportName: "Ngurah Rai International Airport",
    city: 'Bali',
    country: 'Indonesia',
    countryCode: 'ID',
    latitude: -8.7482,
    longitude: 115.1672,
    source: 'authoritative_registry',
    status: 'verified'
  },
  DXB: {
    airportCode: 'DXB',
    airportName: "Dubai International Airport (T3)",
    city: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    latitude: 25.2532,
    longitude: 55.3657,
    source: 'authoritative_registry',
    status: 'verified'
  },
  SIN: {
    airportCode: 'SIN',
    airportName: "Singapore Changi Airport (T3)",
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    latitude: 1.3644,
    longitude: 103.9915,
    source: 'authoritative_registry',
    status: 'verified'
  },
  BKK: {
    airportCode: 'BKK',
    airportName: "Suvarnabhumi Airport",
    city: 'Bangkok',
    country: 'Thailand',
    countryCode: 'TH',
    latitude: 13.6900,
    longitude: 100.7501,
    source: 'authoritative_registry',
    status: 'verified'
  },
  HKT: {
    airportCode: 'HKT',
    airportName: "Phuket International Airport",
    city: 'Phuket',
    country: 'Thailand',
    countryCode: 'TH',
    latitude: 8.1132,
    longitude: 98.3169,
    source: 'authoritative_registry',
    status: 'verified'
  },
  ICN: {
    airportCode: 'ICN',
    airportName: "Incheon International Airport (T2)",
    city: 'Seoul',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 37.4602,
    longitude: 126.4407,
    source: 'authoritative_registry',
    status: 'verified'
  }
};

export function isValidCoordinate(lat: any, lng: any): { valid: boolean; error?: string } {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return { valid: false, error: 'Coordinates cannot be null or undefined' };
  }
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (isNaN(nLat) || isNaN(nLng) || !isFinite(nLat) || !isFinite(nLng)) {
    return { valid: false, error: 'Coordinates must be valid finite numbers' };
  }
  if (nLat < -90 || nLat > 90) {
    return { valid: false, error: `Latitude ${nLat} out of valid range [-90, 90]` };
  }
  if (nLng < -180 || nLng > 180) {
    return { valid: false, error: `Longitude ${nLng} out of valid range [-180, 180]` };
  }
  if (nLat === 0 && nLng === 0) {
    return { valid: false, error: 'Coordinates 0,0 are invalid for destination resolution' };
  }
  return { valid: true };
}

export function isGeographicallyConsistent(
  latitude: number,
  longitude: number,
  countryCode: string
): boolean {
  const box = COUNTRY_BOUNDING_BOXES[countryCode.toUpperCase()];
  if (!box) {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }
  return (
    latitude >= box.minLat &&
    latitude <= box.maxLat &&
    longitude >= box.minLng &&
    longitude <= box.maxLng
  );
}

export function resolveCanonicalLocation(
  query: string,
  countryHint?: string
): CanonicalLocation | null {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return null;
  }

  const rawLower = query.toLowerCase().trim();
  const tokens = rawLower.split(/[\s,]+/).filter(t => t.length > 0);

  for (const [alias, key] of Object.entries(LOCATION_ALIASES)) {
    if (rawLower.includes(alias)) {
      return CANONICAL_LOCATIONS[key] || null;
    }
  }

  for (const [key, loc] of Object.entries(CANONICAL_LOCATIONS)) {
    if (
      rawLower.includes(key) ||
      tokens.includes(key) ||
      rawLower.includes(loc.city.toLowerCase()) ||
      rawLower.includes(loc.name.toLowerCase())
    ) {
      if (countryHint && countryHint.trim()) {
        const hintLower = countryHint.toLowerCase().trim();
        const matchesHint = 
          loc.country.toLowerCase().includes(hintLower) ||
          loc.countryCode.toLowerCase() === hintLower ||
          hintLower.includes(loc.country.toLowerCase());
        
        if (!matchesHint) {
          continue;
        }
      }

      if (!isGeographicallyConsistent(loc.latitude, loc.longitude, loc.countryCode)) {
        continue;
      }

      return loc;
    }
  }

  if (rawLower.includes('india') || countryHint?.toLowerCase().includes('india')) {
    if (rawLower.includes('delhi') || rawLower.includes('dilli')) return CANONICAL_LOCATIONS.delhi;
    if (rawLower.includes('chennai') || rawLower.includes('madras')) return CANONICAL_LOCATIONS.chennai;
    if (rawLower.includes('mumbai') || rawLower.includes('bombay')) return CANONICAL_LOCATIONS.mumbai;
    if (rawLower.includes('bengaluru') || rawLower.includes('bangalore')) return CANONICAL_LOCATIONS.bengaluru;
    if (rawLower.includes('goa')) return CANONICAL_LOCATIONS.goa;
  }

  return null;
}

export function resolveAirport(query: CanonicalLocation | string | null | undefined): Airport | null {
  if (!query) return null;

  if (typeof query === 'object' && 'city' in query) {
    const loc = query as CanonicalLocation;
    const cityLower = loc.city.toLowerCase();

    for (const apt of Object.values(AIRPORT_REGISTRY)) {
      if (apt.city.toLowerCase().includes(cityLower) || cityLower.includes(apt.city.toLowerCase())) {
        return apt;
      }
    }

    const nameLower = loc.name.toLowerCase();
    for (const apt of Object.values(AIRPORT_REGISTRY)) {
      if (apt.city.toLowerCase().includes(nameLower) || nameLower.includes(apt.city.toLowerCase())) {
        return apt;
      }
    }
  }

  const qStr = (typeof query === 'string' ? query : query.city || query.name || '').trim();
  const qLower = qStr.toLowerCase();
  const qUpper = qStr.toUpperCase();

  if (AIRPORT_REGISTRY[qUpper]) {
    return AIRPORT_REGISTRY[qUpper];
  }

  for (const apt of Object.values(AIRPORT_REGISTRY)) {
    if (
      qLower.includes(apt.city.toLowerCase()) ||
      apt.city.toLowerCase().includes(qLower) ||
      qLower.includes(apt.airportName.toLowerCase()) ||
      apt.airportName.toLowerCase().includes(qLower) ||
      qLower.includes(apt.airportCode.toLowerCase())
    ) {
      return apt;
    }
  }

  if (qLower.includes('delhi') || qLower.includes('ncr')) return AIRPORT_REGISTRY.DEL;
  if (qLower.includes('chennai') || qLower.includes('madras')) return AIRPORT_REGISTRY.MAA;
  if (qLower.includes('mumbai') || qLower.includes('bombay')) return AIRPORT_REGISTRY.BOM;
  if (qLower.includes('bengaluru') || qLower.includes('bangalore')) return AIRPORT_REGISTRY.BLR;
  if (qLower.includes('hyderabad')) return AIRPORT_REGISTRY.HYD;
  if (qLower.includes('kolkata') || qLower.includes('calcutta')) return AIRPORT_REGISTRY.CCU;
  if (qLower.includes('goa')) return AIRPORT_REGISTRY.GOX;
  if (qLower.includes('kochi') || qLower.includes('cochin') || qLower.includes('kerala')) return AIRPORT_REGISTRY.COK;
  if (qLower.includes('jaipur') || qLower.includes('rajasthan')) return AIRPORT_REGISTRY.JAI;
  if (qLower.includes('ahmedabad')) return AIRPORT_REGISTRY.AMD;

  return null;
}

export function validateFlightIntegrity(
  outboundOriginCode: string,
  outboundDestCode: string,
  returnOriginCode?: string,
  returnDestCode?: string
): {
  valid: boolean;
  isSameCity: boolean;
  error?: string;
} {
  const oOrig = (outboundOriginCode || '').trim().toUpperCase();
  const oDest = (outboundDestCode || '').trim().toUpperCase();

  if (!oOrig || !oDest) {
    return { valid: false, isSameCity: false, error: 'Origin and destination airport codes are required' };
  }

  if (oOrig === oDest) {
    return {
      valid: true,
      isSameCity: true,
      error: 'No flight required — origin and destination are the same city.'
    };
  }

  if (returnOriginCode && returnDestCode) {
    const rOrig = returnOriginCode.trim().toUpperCase();
    const rDest = returnDestCode.trim().toUpperCase();

    if (rOrig === rDest) {
      return { valid: false, isSameCity: false, error: 'Return flight origin and destination cannot be identical' };
    }

    if (oOrig !== rDest || oDest !== rOrig) {
      return {
        valid: false,
        isSameCity: false,
        error: `Flight direction mismatch: Outbound ${oOrig}→${oDest} does not reverse to Return ${rOrig}→${rDest}`
      };
    }
  }

  return { valid: true, isSameCity: false };
}

export const CANONICAL_LOCATION_CATALOG = CANONICAL_LOCATIONS;
export const AUTHORITATIVE_AIRPORT_REGISTRY = AIRPORT_REGISTRY;
