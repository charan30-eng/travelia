/**
 * Travelia Places Data Layer - Comprehensive Test Suite
 * 
 * Tests the 12 Mandatory Requirements:
 * 1.  live provider normalization & field masks
 * 2.  invalid destination handling
 * 3.  empty results handling
 * 4.  cache hit & cache metadata
 * 5.  provider failure fallback chain (LIVE -> CACHE -> DEMO -> UNAVAILABLE)
 * 6.  demo fallback explicit labeling
 * 7.  missing coordinates rejection (never fabricate coordinates)
 * 8.  duplicate places deduplication
 * 9.  missing rating honest handling (never fabricate ratings)
 * 10. missing opening hours honest handling (never fabricate hours)
 * 11. missing price hotel rule (pricePerNight === null, never convert priceLevel to room tariff)
 * 12. partial data handling
 */

import { placesService } from './services/placesService';
import { placesCache } from './services/placesEngine/placesCache';
import { GooglePlacesProvider } from './services/placesEngine/googlePlacesProvider';
import { demoPlacesService } from './services/demoPlacesService';
import { TraveliaPlace } from './types/places';
import { placesClient } from '../src/services/placesClient';
import { formatCurrency } from '../src/data/mockData';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('TRAVELIA REAL PLACES DATA LAYER - 12 SCENARIOS SUITE');
  console.log('====================================================\n');

  const provider = new GooglePlacesProvider();

  // =========================================================================
  // SCENARIO 1: Live Provider Normalization & Minimal Field Masks
  // =========================================================================
  console.log('Scenario 1: Live Provider Normalization & Field Masks');
  {
    const mockRawGooglePlace = {
      id: 'places/ChIJ1234567890',
      displayName: { text: 'Shibuya Sky Observation Deck', languageCode: 'en' },
      formattedAddress: '2 Chome-24-12 Shibuya, Shibuya City, Tokyo, Japan',
      location: { latitude: 35.6595, longitude: 139.7005 },
      primaryType: 'tourist_attraction',
      types: ['tourist_attraction', 'point_of_interest', 'establishment'],
      rating: 4.7,
      userRatingCount: 14250,
      priceLevel: 'PRICE_LEVEL_MODERATE',
      regularOpeningHours: {
        openNow: true,
        weekdayDescriptions: ['Monday: 10:00 AM – 10:30 PM']
      },
      websiteUri: 'https://www.shibuya-scramble-square.com/sky/',
      nationalPhoneNumber: '+81 3-4221-4280',
      photos: [
        {
          name: 'places/ChIJ1234567890/photos/photo123',
          widthPx: 4032,
          heightPx: 3024,
          authorAttributions: [{ displayName: 'Tokyo Photo Guide' }]
        }
      ]
    };

    const normalized = provider.normalizePlace(mockRawGooglePlace);
    assert(normalized !== null, 'Provider successfully normalizes raw Google Place');
    if (normalized) {
      assert(normalized.id === 'places/ChIJ1234567890', 'Correct place id mapped');
      assert(normalized.source === 'google', 'Source is explicitly "google"');
      assert(normalized.dataStatus === 'live', 'Data status is "live"');
      assert(normalized.name === 'Shibuya Sky Observation Deck', 'Display name mapped');
      assert(normalized.latitude === 35.6595 && normalized.longitude === 139.7005, 'Exact coordinates mapped without drift');
      assert(normalized.rating === 4.7, 'Rating mapped faithfully');
      assert(normalized.userRatingsTotal === 14250, 'userRatingCount mapped');
      assert(normalized.priceLevel === 2, 'PRICE_LEVEL_MODERATE mapped to integer tier 2');
      assert(normalized.photos !== undefined && normalized.photos.length === 1, 'Photo reference mapped');
      assert(Boolean(normalized.photos?.[0]?.uri?.startsWith('/api/places/photo')), 'Photo uses server proxy URL to protect API key');
    }
  }

  // =========================================================================
  // SCENARIO 2: Invalid Destination Handling
  // =========================================================================
  console.log('\nScenario 2: Invalid Destination Handling');
  {
    const emptyDestRes = await placesService.searchPlaces({ destination: '' });
    assert(emptyDestRes.success === false, 'Empty destination returns success = false');
    assert(emptyDestRes.error?.code === 'INVALID_DESTINATION', 'Error code is INVALID_DESTINATION');
    assert(emptyDestRes.dataStatus === 'unavailable', 'Status is strictly "unavailable"');
    assert(emptyDestRes.places.length === 0, 'No fake places returned for empty destination');

    const whitespaceDestRes = await placesService.searchPlaces({ destination: '     ' });
    assert(whitespaceDestRes.success === false, 'Whitespace destination returns success = false');
    assert(whitespaceDestRes.error?.code === 'INVALID_DESTINATION', 'Error code is INVALID_DESTINATION for whitespace');
  }

  // =========================================================================
  // SCENARIO 3: Empty Results (Uncataloged destination without fabrication)
  // =========================================================================
  console.log('\nScenario 3: Empty Results (No Fake Places Fabricated)');
  {
    // Search a destination not in catalog (demo catalog removed fake destination generators)
    placesCache.clear();
    const uncatalogedRes = await placesService.searchPlaces({
      destination: 'AtlantisDeepOceanVoid9999'
    });

    assert(uncatalogedRes.places.length === 0, 'Uncataloged destination returns 0 places (no fabricated places)');
    assert(
      uncatalogedRes.dataStatus === 'unavailable',
      `Honest status reported when empty: "${uncatalogedRes.dataStatus}"`
    );
  }

  // =========================================================================
  // SCENARIO 4: Cache Hit & Tracking Metadata
  // =========================================================================
  console.log('\nScenario 4: Cache Hit & Tracking Metadata');
  {
    placesCache.clear();
    // Query 1: populate cache
    const initialRes = await placesService.searchAttractions('Tokyo', 4);
    assert(initialRes.places.length > 0, 'Initial query returns places');

    // Query 2: should hit in-memory cache
    const cachedRes = await placesService.searchAttractions('Tokyo', 4);
    assert(cachedRes.success === true, 'Cache query succeeds');
    assert(cachedRes.dataStatus === 'cached', `Cache query returns dataStatus: "cached" (received: "${cachedRes.dataStatus}")`);
    assert(cachedRes.cacheAgeSeconds !== undefined && cachedRes.cacheAgeSeconds >= 0, `cacheAgeSeconds tracked: ${cachedRes.cacheAgeSeconds}s`);
    assert(cachedRes.places.length === initialRes.places.length, 'Cached place count matches exactly');
    assert(cachedRes.places[0].name === initialRes.places[0].name, 'Cached place identity matches exactly');
  }

  // =========================================================================
  // SCENARIO 5: Provider Failure (Graceful Fallback Chain)
  // =========================================================================
  console.log('\nScenario 5: Provider Failure Fallback (LIVE -> CACHE -> DEMO -> UNAVAILABLE)');
  {
    // Save original settings
    const originalLive = (placesService as any).isLiveEnabled;
    const originalFallback = (placesService as any).isFallbackEnabled;

    try {
      // 1. Live disabled -> falls back to Demo
      (placesService as any).isLiveEnabled = false;
      (placesService as any).isFallbackEnabled = true;
      placesCache.clear();

      const demoFallbackRes = await placesService.searchHotels('Goa', 3);
      assert(demoFallbackRes.success === true, 'Fallback to Demo succeeds');
      assert(demoFallbackRes.source === 'demo', 'Source is explicitly "demo"');
      assert(demoFallbackRes.dataStatus === 'demo', 'dataStatus is explicitly "demo"');

      // 2. Both Live and Demo disabled -> gracefully returns UNAVAILABLE without crash
      (placesService as any).isLiveEnabled = false;
      (placesService as any).isFallbackEnabled = false;
      placesCache.clear();

      const unavailableRes = await placesService.searchHotels('Goa', 3);
      assert(unavailableRes.success === false, 'Unavailable response has success = false');
      assert(unavailableRes.dataStatus === 'unavailable', 'dataStatus is strictly "unavailable"');
      assert(unavailableRes.places.length === 0, 'No places returned when unavailable');
    } finally {
      // Restore
      (placesService as any).isLiveEnabled = originalLive;
      (placesService as any).isFallbackEnabled = originalFallback;
    }
  }

  // =========================================================================
  // SCENARIO 6: Demo Fallback Explicit Labeling
  // =========================================================================
  console.log('\nScenario 6: Demo Fallback Explicit Labeling');
  {
    placesCache.clear();
    const demoCatalogRes = await demoPlacesService.searchPlaces({
      destination: 'Tokyo',
      category: 'tourist_attraction'
    });

    assert(demoCatalogRes.length > 0, 'Demo places catalog provides verified fallback places');
    for (const place of demoCatalogRes) {
      assert(place.source === 'demo', `Place "${place.name}" source is strictly "demo"`);
      assert(place.dataStatus === 'demo', `Place "${place.name}" dataStatus is strictly "demo"`);
      assert(typeof place.latitude === 'number' && !isNaN(place.latitude), `Real coordinates for "${place.name}"`);
    }
  }

  // =========================================================================
  // SCENARIO 7: Missing Coordinates Rejection (Never Fabricate Coordinates)
  // =========================================================================
  console.log('\nScenario 7: Missing Coordinates Rejection');
  {
    // Raw place with undefined location
    const missingCoordsPlace = {
      id: 'places/bad-1',
      displayName: { text: 'Mystery Island' },
      location: {}
    };
    const res1 = provider.normalizePlace(missingCoordsPlace);
    assert(res1 === null, 'Rejects place with empty location object');

    // Raw place with NaN coordinates
    const nanCoordsPlace = {
      id: 'places/bad-2',
      displayName: { text: 'NaN Point' },
      location: { latitude: NaN, longitude: 139.7 }
    };
    const res2 = provider.normalizePlace(nanCoordsPlace);
    assert(res2 === null, 'Rejects place with NaN coordinates');

    // Raw place with missing displayName
    const noNamePlace = {
      id: 'places/bad-3',
      location: { latitude: 35.6, longitude: 139.7 }
    };
    const res3 = provider.normalizePlace(noNamePlace);
    assert(res3 === null, 'Rejects place missing displayName');
  }

  // =========================================================================
  // SCENARIO 8: Duplicate Places Deduplication
  // =========================================================================
  console.log('\nScenario 8: Duplicate Places Deduplication');
  {
    const duplicateList: TraveliaPlace[] = [
      {
        id: 'dup-01',
        sourceId: 'src-dup-01',
        providerId: 'src-dup-01',
        name: 'Senso-ji Temple',
        category: 'temple',
        latitude: 35.7148,
        longitude: 139.7967,
        source: 'demo',
        dataStatus: 'demo'
      },
      {
        id: 'dup-02',
        sourceId: 'src-dup-01', // Exact same sourceId
        providerId: 'src-dup-01',
        name: 'Sensoji Buddhist Temple',
        category: 'temple',
        latitude: 35.7148,
        longitude: 139.7967,
        source: 'demo',
        dataStatus: 'demo'
      },
      {
        id: 'unique-03',
        sourceId: 'src-unique-03',
        providerId: 'src-unique-03',
        name: 'Tokyo Tower',
        category: 'landmark',
        latitude: 35.6586,
        longitude: 139.7454,
        source: 'demo',
        dataStatus: 'demo'
      }
    ];

    const deduplicated = (placesService as any).deduplicatePlaces(duplicateList);
    assert(deduplicated.length === 2, `Deduplicated list of 3 down to 2 distinct places (got: ${deduplicated.length})`);
    assert(deduplicated.some((p: TraveliaPlace) => p.name.includes('Senso')), 'Preserved unique Senso-ji');
    assert(deduplicated.some((p: TraveliaPlace) => p.name.includes('Tokyo Tower')), 'Preserved unique Tokyo Tower');
  }

  // =========================================================================
  // SCENARIO 9: Missing Rating Honest Handling (Never Fabricate Ratings)
  // =========================================================================
  console.log('\nScenario 9: Missing Rating Honest Handling');
  {
    const rawNoRating = {
      id: 'places/norating-1',
      displayName: { text: 'New Boutique Gallery' },
      location: { latitude: 35.68, longitude: 139.76 },
      types: ['art_gallery']
    };

    const placeNoRating = provider.normalizePlace(rawNoRating);
    assert(placeNoRating !== null, 'Normalizes place without rating');
    if (placeNoRating) {
      assert(placeNoRating.rating === undefined, 'Rating is strictly undefined when provider lacks it (never default to 4.5)');
      assert(placeNoRating.userRatingsTotal === undefined, 'userRatingsTotal is undefined when provider lacks it');
    }
  }

  // =========================================================================
  // SCENARIO 10: Missing Opening Hours Honest Handling
  // =========================================================================
  console.log('\nScenario 10: Missing Opening Hours Honest Handling');
  {
    const rawNoHours = {
      id: 'places/nohours-1',
      displayName: { text: 'Scenic Hill Viewpoint' },
      location: { latitude: 35.69, longitude: 139.77 },
      types: ['tourist_attraction']
    };

    const placeNoHours = provider.normalizePlace(rawNoHours);
    assert(placeNoHours !== null, 'Normalizes place without opening hours');
    if (placeNoHours) {
      assert(placeNoHours.openingHours === undefined, 'openingHours is strictly undefined when missing (never invented)');
    }
  }

  // =========================================================================
  // SCENARIO 11: Missing Price Hotel Rule (pricePerNight === null)
  // =========================================================================
  console.log('\nScenario 11: Missing Price Hotel Rule');
  {
    const placeFromProvider: TraveliaPlace = {
      id: 'hotel-real-01',
      sourceId: 'hotel-real-01',
      name: 'Grand Hyatt Tokyo',
      category: 'hotel',
      latitude: 35.6601,
      longitude: 139.7292,
      priceLevel: 3, // Tier 3 (MODERATE to EXPENSIVE tier in Google Places)
      rating: 4.6,
      source: 'google',
      dataStatus: 'live'
    };

    // Client adapter converts TraveliaPlace to UI Hotel Model
    const uiHotel = placesClient.placeToHotel(placeFromProvider, 0, 4);
    assert(uiHotel.pricePerNight === null, 'Hotel pricePerNight is strictly null (NEVER invented from priceLevel)');
    assert(uiHotel.totalStayPrice === null, 'Hotel totalStayPrice is strictly null');

    // UI Currency formatting must display "Price unavailable", NOT "₹3" or "₹NaN"
    const displayPrice = formatCurrency(uiHotel.pricePerNight, 'INR');
    assert(displayPrice === 'Price unavailable', `formatCurrency(null) returns "Price unavailable" (got: "${displayPrice}")`);
  }

  // =========================================================================
  // SCENARIO 12: Partial Data Handling
  // =========================================================================
  console.log('\nScenario 12: Partial Data Handling');
  {
    const partialRaw = {
      id: 'places/partial-01',
      displayName: { text: 'Coastal Watchtower' },
      location: { latitude: 15.49, longitude: 73.77 },
      types: ['historical_landmark']
      // missing address, photos, phone, website, openingHours, rating
    };

    const partialPlace = provider.normalizePlace(partialRaw);
    assert(partialPlace !== null, 'Normalizes place with minimal required fields');
    if (partialPlace) {
      assert(partialPlace.websiteUri === undefined, 'Missing website remains undefined');
      assert(partialPlace.phoneNumber === undefined, 'Missing phone remains undefined');
      assert(partialPlace.photos === undefined, 'Missing photos remains undefined');
      assert(partialPlace.latitude === 15.49, 'Keeps authentic coordinates');
    }
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
