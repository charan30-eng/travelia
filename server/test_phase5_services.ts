/**
 * TRAVELIA PHASE 5 - PROVIDER-BACKED DATA & INTEGRITY TEST SUITE
 * 
 * Tests the 8 Mandatory Phase 5 Verification Categories:
 * 1. Provider Success (Hotels, Flights, Currency)
 * 2. Provider Failure (Graceful fallback chain, zero crashes)
 * 3. Missing Price (Strict price: null, no priceLevel conversion, honest UI display)
 * 4. Currency Conversion (Bidirectional conversion, rate accuracy, timestamps)
 * 5. Stale Rate / Cache TTL (Freshness tracking, cached vs live vs demo provenance)
 * 6. Flight Unavailable (Unserviced routes return empty offers, ZERO hallucination)
 * 7. Hotel Unavailable (Empty/unknown locations return honest unavailable status)
 * 8. Budget Calculation (Detailed breakdown with MonetaryValue: amount, currency, source, status)
 */

import { hotelService } from './services/hotelService';
import { hotelInventoryProvider } from './services/hotelProvider';
import { flightService } from './services/flightService';
import { flightProvider } from './services/flightProvider';
import { currencyService } from './services/currencyService';
import { calculateTripCost, calculateDetailedTripCost } from './services/tripCostService';
import { formatCurrency } from '../src/data/mockData';
import { placesClient } from '../src/services/placesClient';

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

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('TRAVELIA PHASE 5: REAL PROVIDER DATA & INTEGRITY');
  console.log('====================================================\n');

  // =========================================================================
  // TEST 1: Provider Success
  // =========================================================================
  console.log('--- Test 1: Provider Success ---');
  {
    // 1a. Currency Provider
    const ratesRes = await currencyService.getRates('INR');
    assert(ratesRes.baseCurrency === 'INR', 'Currency provider returns base INR');
    assert(ratesRes.rates.USD > 0, 'Currency provider has positive USD rate');
    assert(ratesRes.rates.EUR > 0, 'Currency provider has positive EUR rate');
    assert(Boolean(ratesRes.retrievedAt), 'Currency provider includes retrievedAt timestamp');
    assert(['live', 'cached', 'demo'].includes(ratesRes.dataStatus), 'Currency dataStatus is valid');

    // 1b. Flight Provider (Mumbai -> Goa)
    const flightRes = await flightService.searchFlights({
      origin: 'Mumbai',
      destination: 'Goa',
      departureDate: '2026-11-12',
      returnDate: '2026-11-16',
      passengers: 2
    });
    assert(flightRes.success === true, 'Flight search succeeds for BOM -> GOX');
    assert(flightRes.outboundFlights.length > 0, 'Outbound flights returned for serviced route');
    assert(flightRes.returnFlights.length > 0, 'Return flights returned for serviced route');
    const sampleFlight = flightRes.outboundFlights[0];
    assert(sampleFlight.airline.length > 0, 'Flight offer has authentic airline name');
    assert(sampleFlight.flightNumber.length > 0, 'Flight offer has genuine flight number');
    assert(sampleFlight.price.pricePerPerson > 0, 'Flight offer has pricePerPerson');
    assert(sampleFlight.price.totalPrice === sampleFlight.price.pricePerPerson * 2, 'Flight offer totalPrice matches passenger count');
    assert(sampleFlight.availability === 'available', 'Flight availability status is reported');

    // 1c. Hotel Provider (Goa)
    const hotelRes = await hotelService.searchHotels({
      destination: 'Goa',
      checkInDate: '2026-11-12',
      checkOutDate: '2026-11-16',
      guests: 2,
      limit: 2
    });
    assert(hotelRes.success === true, 'Hotel service search succeeds for Goa');
    assert(hotelRes.hotels.length > 0, 'Hotels returned for Goa destination');
    const sampleHotel = hotelRes.hotels[0];
    assert(sampleHotel.name.length > 0, 'Hotel has valid name');
    assert(sampleHotel.location.length > 0, 'Hotel has valid location address');
    assert(typeof sampleHotel.rating === 'number', 'Hotel has rating');
    assert(Boolean(sampleHotel.retrievedAt), 'Hotel has retrievedAt timestamp');
  }

  // =========================================================================
  // TEST 2: Provider Failure
  // =========================================================================
  console.log('\n--- Test 2: Provider Failure & Resilient Fallback ---');
  {
    // Currency invalid currency fallback / handling
    const rateFail = await currencyService.getRate('UNKNOWN_COIN_XYZ', 'INR');
    assert(rateFail.baseCurrency === 'UNKNOWN_COIN_XYZ', 'Currency service handles unknown currency gracefully');
    assert(rateFail.rate === 1.0, 'Currency fallback rate defaults safely without crashing');

    // Flight provider handling invalid parameters without crashing
    const invalidFlight = await flightService.searchFlights({
      origin: '',
      destination: '',
      departureDate: ''
    });
    assert(invalidFlight.outboundFlights.length === 0, 'Empty flight query safely returns 0 offers');
    assert(invalidFlight.dataStatus === 'unavailable', 'Empty flight query sets dataStatus = unavailable');

    // Hotel inventory provider failure simulation
    const directInventory = await hotelInventoryProvider.getRoomRates('Completely Nonexistent Hotel 99999', 'Nowhere');
    assert(directInventory.price === null, 'Nonexistent hotel inventory safely returns price = null');
    assert(directInventory.availability === 'unavailable', 'Nonexistent hotel inventory returns availability = unavailable');
  }

  // =========================================================================
  // TEST 3: Missing Price
  // =========================================================================
  console.log('\n--- Test 3: Missing Price (Strict Zero-Fabrication Rule) ---');
  {
    // Places API with priceLevel (0-4) must NEVER be converted to nightly room price
    const mockPlaceWithoutRoomInventory = {
      id: 'place-test-hotel-identity',
      name: 'Boutique Heritage Villa',
      category: 'hotel' as const,
      address: 'Anjuna Beach Road, Goa',
      latitude: 15.58,
      longitude: 73.74,
      rating: 4.6,
      userRatingsTotal: 340,
      priceLevel: 3, // High price level from Google, NOT a currency amount!
      estimatedCost: undefined, // Room inventory tariff not available
      photos: [],
      amenities: ['Pool', 'WiFi'],
      source: 'google' as const,
      dataStatus: 'live' as const,
      isVerified: true
    };

    const uiHotel = placesClient.placeToHotel(mockPlaceWithoutRoomInventory, 0, 4);
    assert(uiHotel.pricePerNight === null, 'Hotel pricePerNight is strictly null when inventory is absent');
    assert(uiHotel.totalStayPrice === null, 'Hotel totalStayPrice is strictly null when inventory is absent');

    // Formatter handles null price with honest text
    const formatted = formatCurrency(uiHotel.pricePerNight, 'INR');
    assert(formatted === 'Price unavailable', 'formatCurrency displays "Price unavailable" instead of fabricated zeros');
  }

  // =========================================================================
  // TEST 4: Currency Conversion
  // =========================================================================
  console.log('\n--- Test 4: Currency Conversion ---');
  {
    // USD -> INR
    const convUSDToINR = await currencyService.convert(100, 'USD', 'INR');
    assert(convUSDToINR.success === true, 'Conversion USD -> INR succeeds');
    assert(convUSDToINR.originalAmount === 100, 'Original amount is preserved');
    assert(convUSDToINR.fromCurrency === 'USD', 'fromCurrency is USD');
    assert(convUSDToINR.toCurrency === 'INR', 'toCurrency is INR');
    assert(convUSDToINR.rate > 50, 'USD to INR rate is realistic (> 50 INR per USD)');
    assert(convUSDToINR.convertedAmount > 5000, '100 USD converts to > 5000 INR');
    assert(convUSDToINR.formattedConverted.startsWith('₹'), 'Formatted INR contains ₹ symbol');

    // INR -> EUR
    const convINRToEUR = await currencyService.convert(10000, 'INR', 'EUR');
    assert(convINRToEUR.success === true, 'Conversion INR -> EUR succeeds');
    assert(convINRToEUR.convertedAmount > 0, 'Converted EUR is positive');
    assert(convINRToEUR.formattedConverted.startsWith('€'), 'Formatted EUR contains € symbol');

    // Same currency conversion
    const convSame = await currencyService.convert(500, 'INR', 'INR');
    assert(convSame.rate === 1.0, 'Same currency rate is exactly 1.0');
    assert(convSame.convertedAmount === 500, 'Same currency convertedAmount is identical');
  }

  // =========================================================================
  // TEST 5: Stale Rate / Cache TTL
  // =========================================================================
  console.log('\n--- Test 5: Stale Rate & Cache Freshness ---');
  {
    const initialRates = await currencyService.getRates('INR');
    const timestamp1 = initialRates.retrievedAt;
    assert(Boolean(timestamp1), 'First fetch carries authoritative timestamp');

    // Immediate second call should hit memory cache with dataStatus === 'cached' or 'live'
    const cachedRates = await currencyService.getRates('INR');
    assert(cachedRates.baseCurrency === 'INR', 'Cached rates return base currency');
    assert(cachedRates.retrievedAt === timestamp1, 'Cache maintains original fetch timestamp');
    assert(cachedRates.rates.USD === initialRates.rates.USD, 'Cached exchange rate is identical');

    // Verify cache age is bounded
    const ratesAgeSeconds = Math.round((Date.now() - new Date(cachedRates.retrievedAt).getTime()) / 1000);
    assert(ratesAgeSeconds >= 0 && ratesAgeSeconds < 3600, 'Rates cache age is fresh (< 1 hour)');
  }

  // =========================================================================
  // TEST 6: Flight Unavailable (Zero Hallucination)
  // =========================================================================
  console.log('\n--- Test 6: Flight Unavailable (Strict Anti-Fabrication) ---');
  {
    // Search for unserviced remote island
    const unservedRes = await flightService.searchFlights({
      origin: 'Mumbai',
      destination: 'RemoteUnchartedIslandAtlantis',
      departureDate: '2026-12-01'
    });

    assert(unservedRes.outboundFlights.length === 0, 'Zero flights fabricated for unserviced destination');
    assert(unservedRes.returnFlights.length === 0, 'Zero return flights fabricated for unserviced destination');
    assert(unservedRes.dataStatus === 'unavailable', 'dataStatus is explicitly "unavailable"');
    assert(unservedRes.source === 'unavailable', 'source is explicitly "unavailable"');
  }

  // =========================================================================
  // TEST 7: Hotel Unavailable
  // =========================================================================
  console.log('\n--- Test 7: Hotel Unavailable ---');
  {
    const unservedHotelRes = await hotelService.searchHotels({
      destination: 'NonExistentGlacier99',
      limit: 4
    });

    assert(unservedHotelRes.hotels.length === 0, 'Zero hotels fabricated for nonexistent destination');
    assert(unservedHotelRes.totalCount === 0, 'totalCount is 0 for nonexistent destination');
    assert(unservedHotelRes.dataStatus === 'unavailable', 'Hotel dataStatus is "unavailable"');
  }

  // =========================================================================
  // TEST 8: Budget Calculation (Monetary Provenance & Currency Conversion)
  // =========================================================================
  console.log('\n--- Test 8: Budget Calculation & Monetary Provenance ---');
  {
    const sampleTripPlan: any = {
      id: 'trip-phase5-test',
      destination: 'Goa',
      days: 4,
      nights: 3,
      travelers: 2,
      budget: {
        total: 45000,
        hotel: 18000,
        flights: 16000,
        food: 5000,
        transportation: 3000,
        activities: 3000,
        miscellaneous: 0
      },
      itinerary: [
        {
          day: 1,
          activities: [
            { id: 'act-1', name: 'Scuba Diving', estimatedCost: 2500 },
            { id: 'act-2', name: 'Fort Aguada Visit', estimatedCost: 500 }
          ]
        }
      ],
      hotels: [
        {
          id: 'hotel-01',
          name: 'Taj Exotica Resort',
          pricePerNight: 6000,
          source: 'hotel_inventory',
          price: {
            amount: 18000,
            currency: 'INR',
            perNight: 6000,
            total: 18000,
            taxesIncluded: true,
            source: 'direct_inventory',
            retrievedAt: new Date().toISOString()
          }
        }
      ],
      flightDetails: {
        source: 'flight_provider',
        price: {
          totalPrice: 16000,
          currency: 'INR'
        }
      }
    };

    // Standard Calculation
    const standardCost = calculateTripCost(sampleTripPlan);
    assert(standardCost.activityCost === 3000, 'Deterministic activity cost matches sum of itinerary activities (2500 + 500 = 3000)');
    assert(standardCost.hotelCost === 18000, 'Hotel cost correctly reflects room rate / allocation (18000)');
    assert(standardCost.totalCost === 3000 + 18000 + 16000 + 5000 + 3000 + 0, 'Total cost equals exact mathematical sum of categories');

    // Detailed Calculation with Monetary Provenance
    const detailed = await calculateDetailedTripCost(sampleTripPlan, 'USD');
    assert(detailed.items.hotel.amount === 18000, 'Hotel item carries correct amount');
    assert(detailed.items.hotel.currency === 'INR', 'Hotel item carries correct currency');
    assert(detailed.items.hotel.source === 'direct_inventory', 'Hotel item provenance points to direct_inventory');
    assert(detailed.items.hotel.status === 'verified', 'Hotel item confidence status is verified');

    assert(detailed.items.flights.amount === 16000, 'Flight item carries correct amount');
    assert(detailed.items.flights.status === 'verified', 'Flight item confidence status is verified');

    assert(detailed.items.activities.amount === 3000, 'Activity item carries exact calculated sum');
    assert(detailed.items.activities.status === 'estimated', 'Activity item is marked estimated');

    // Foreign currency conversion integration
    assert(detailed.converted !== undefined, 'Target currency conversion is executed');
    assert(detailed.converted?.targetCurrency === 'USD', 'Converted targetCurrency is USD');
    assert(detailed.converted!.total > 0, 'Converted foreign total is positive');
    assert(Boolean(detailed.converted?.retrievedAt), 'Converted foreign total carries retrievedAt timestamp');
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} assertions passed`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    console.error('Some tests failed!');
    process.exit(1);
  }
}

runPhase5Tests().catch(err => {
  console.error('Test suite failed with unhandled error:', err);
  process.exit(1);
});
