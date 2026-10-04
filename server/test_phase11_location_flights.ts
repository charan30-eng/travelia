/**
 * TRAVELIA PHASE 11 TEST SUITE:
 * Canonical Location Resolution, Map Accuracy & Flight Origin/Destination Integrity
 * 
 * Verifies all 6 mandatory Phase 11 scenarios:
 * Scenario 1: Chennai → Delhi (Delhi coordinates in India, Outbound MAA → DEL, Return DEL → MAA)
 * Scenario 2: Mumbai → Delhi (Outbound BOM → DEL, Return DEL → BOM)
 * Scenario 3: Bengaluru → Delhi (Outbound BLR → DEL, Return DEL → BLR)
 * Scenario 4: Chennai → Mumbai (Mumbai coordinates in India, Outbound MAA → BOM, Return BOM → MAA)
 * Scenario 5: Ambiguous "Delhi" input (Resolves to Delhi, India; strictly never Pakistan)
 * Scenario 6: Same-city edge cases (Delhi → Delhi: "No flight required — origin and destination are the same city")
 * Scenario 7: Coordinate sanity & Country Bounding Box Integrity
 * Scenario 8: Flight Route Integrity Validator (catches loops, mismatched hubs)
 * Scenario 9: Day Route Waypoint Sanity (strictly within destination bounds, no Pakistan points)
 */

import assert from 'assert';
import { 
  resolveCanonicalLocation, 
  resolveAirport, 
  isValidCoordinate, 
  isGeographicallyConsistent, 
  validateFlightIntegrity
} from './services/canonicalLocationService';
import { resolveCityProfile, buildDayWaypoints } from '../src/data/geoRouting';
import { getFlightDataForDestination } from '../src/data/flightData';
import { flightProvider } from './services/flightProvider';
import { flightService } from './services/flightService';
import { generateTripFromPrompt } from '../src/data/mockData';

console.log('\n=============================================================================');
console.log('🚀 RUNNING TRAVELIA PHASE 11: LOCATION RESOLUTION & FLIGHT INTEGRITY SUITE');
console.log('=============================================================================\n');

let passedTests = 0;
let totalTests = 0;

function report(name: string, condition: boolean, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
  } else {
    console.error(`  ❌ [FAIL] ${name}${details ? ` (${details})` : ''}`);
    throw new Error(`Test failed: ${name}`);
  }
}

async function runPhase11Tests() {
  // -------------------------------------------------------------------------
  // TEST SCENARIO 1: Chennai → Delhi
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 1: Chennai → Delhi ---');
  {
    const trip = generateTripFromPrompt('Delhi, India', 5, 2, ['Relaxation'], undefined, '2026-12-01', undefined, 'Chennai, India');
    
    // 1. Destination canonical location
    const destLoc = trip.destinationLocation || resolveCanonicalLocation('Delhi, India');
    report('S1.1 Destination resolves to Delhi, India', 
      destLoc !== null && destLoc.city.toLowerCase() === 'delhi' && destLoc.country === 'India',
      `${destLoc?.city}, ${destLoc?.country}`
    );
    
    // 2. Map coordinates in India (lat: ~28.61, lng: ~77.21), NOT Pakistan
    report('S1.2 Delhi coordinates centered in India (~28.61, ~77.21)',
      Math.abs(destLoc!.latitude - 28.6139) < 0.05 && Math.abs(destLoc!.longitude - 77.2090) < 0.05,
      `[${destLoc!.latitude}, ${destLoc!.longitude}]`
    );
    report('S1.3 Delhi coordinates strictly inside India bounding box',
      isGeographicallyConsistent(destLoc!.latitude, destLoc!.longitude, 'IN')
    );
    report('S1.4 Delhi coordinates NOT in Pakistan bounding box (avoid lat 28, lng 63)',
      destLoc!.longitude > 70.0 && !isGeographicallyConsistent(destLoc!.latitude, destLoc!.longitude, 'PK')
    );

    // 3. Geo profile for map
    const profile = resolveCityProfile('Delhi, India');
    report('S1.5 Map City Profile for Delhi resolves to India center',
      Math.abs(profile.center[0] - 28.6139) < 0.05 && Math.abs(profile.center[1] - 77.2090) < 0.05
    );

    // 4. Day 02 route: Delhi landmarks (Red Fort, India Gate, etc.)
    const day2Waypoints = buildDayWaypoints(trip, 2);
    report('S1.6 Day 02 waypoints exist and are within Delhi radius',
      day2Waypoints.length >= 2 && day2Waypoints.every(wp => wp.coords[0] > 28.0 && wp.coords[0] < 29.0 && wp.coords[1] > 76.5 && wp.coords[1] < 77.8)
    );

    // 5. Flights: Outbound MAA → DEL, Return DEL → MAA
    const flights = getFlightDataForDestination('Delhi, India', 'Chennai, India');
    report('S1.7 Outbound flight is MAA → DEL',
      flights.outboundFlight.originCode === 'MAA' && flights.outboundFlight.destinationCode === 'DEL',
      `${flights.outboundFlight.originCode} → ${flights.outboundFlight.destinationCode}`
    );
    report('S1.8 Return flight is DEL → MAA',
      flights.returnFlight.originCode === 'DEL' && flights.returnFlight.destinationCode === 'MAA',
      `${flights.returnFlight.originCode} → ${flights.returnFlight.destinationCode}`
    );
    report('S1.9 Flight integrity validated (no origin===destination loops)',
      validateFlightIntegrity(
        flights.outboundFlight.originCode,
        flights.outboundFlight.destinationCode,
        flights.returnFlight.originCode,
        flights.returnFlight.destinationCode
      ).valid
    );
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 2: Mumbai → Delhi
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Mumbai → Delhi ---');
  {
    const trip = generateTripFromPrompt('Delhi, India', 4, 1, ['Food & Culture'], undefined, '2026-11-15', undefined, 'Mumbai, India');
    const flights = getFlightDataForDestination('Delhi, India', 'Mumbai, India');

    report('S2.1 Map resolves to Delhi, India',
      trip.destinationLocation?.city.toLowerCase() === 'delhi' && trip.destinationLocation?.country === 'India'
    );
    report('S2.2 Outbound flight is BOM → DEL',
      flights.outboundFlight.originCode === 'BOM' && flights.outboundFlight.destinationCode === 'DEL',
      `${flights.outboundFlight.originCode} → ${flights.outboundFlight.destinationCode}`
    );
    report('S2.3 Return flight is DEL → BOM',
      flights.returnFlight.originCode === 'DEL' && flights.returnFlight.destinationCode === 'BOM',
      `${flights.returnFlight.originCode} → ${flights.returnFlight.destinationCode}`
    );
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 3: Bengaluru → Delhi
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 3: Bengaluru → Delhi ---');
  {
    const flights = getFlightDataForDestination('Delhi, India', 'Bengaluru, India');
    report('S3.1 Outbound flight is BLR → DEL',
      flights.outboundFlight.originCode === 'BLR' && flights.outboundFlight.destinationCode === 'DEL',
      `${flights.outboundFlight.originCode} → ${flights.outboundFlight.destinationCode}`
    );
    report('S3.2 Return flight is DEL → BLR',
      flights.returnFlight.originCode === 'DEL' && flights.returnFlight.destinationCode === 'BLR',
      `${flights.returnFlight.originCode} → ${flights.returnFlight.destinationCode}`
    );
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 4: Chennai → Mumbai
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 4: Chennai → Mumbai ---');
  {
    const trip = generateTripFromPrompt('Mumbai, India', 5, 2, ['Relaxation'], undefined, '2027-01-10', undefined, 'Chennai, India');
    const destLoc = resolveCanonicalLocation('Mumbai, India');
    const flights = getFlightDataForDestination('Mumbai, India', 'Chennai, India');

    report('S4.1 Mumbai coordinates centered in India (~19.08, ~72.88)',
      Math.abs(destLoc!.latitude - 19.0760) < 0.05 && Math.abs(destLoc!.longitude - 72.8777) < 0.05,
      `[${destLoc!.latitude}, ${destLoc!.longitude}]`
    );
    report('S4.2 Outbound flight is MAA → BOM',
      flights.outboundFlight.originCode === 'MAA' && flights.outboundFlight.destinationCode === 'BOM',
      `${flights.outboundFlight.originCode} → ${flights.outboundFlight.destinationCode}`
    );
    report('S4.3 Return flight is BOM → MAA',
      flights.returnFlight.originCode === 'BOM' && flights.returnFlight.destinationCode === 'MAA',
      `${flights.returnFlight.originCode} → ${flights.returnFlight.destinationCode}`
    );
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 5: Ambiguous "Delhi" Input
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 5: Ambiguous "Delhi" Input ---');
  {
    const loc = resolveCanonicalLocation('Delhi');
    report('S5.1 Ambiguous "Delhi" resolves to Delhi, India',
      loc !== null && loc.city === 'Delhi' && loc.country === 'India' && loc.countryCode === 'IN'
    );
    report('S5.2 Lat: 28.6139, Lng: 77.2090 verified',
      loc!.latitude === 28.6139 && loc!.longitude === 77.2090
    );
    report('S5.3 Strictly NOT in Pakistan bounding box (no lat 28, lng 63 fallback)',
      loc!.longitude > 70.0 && !isGeographicallyConsistent(loc!.latitude, loc!.longitude, 'PK')
    );
    
    // Hash fallback in geoRouting removed and replaced with canonical
    const profile = resolveCityProfile('Delhi');
    report('S5.4 geoRouting.resolveCityProfile produces valid Delhi center in India',
      profile.center[0] > 28.0 && profile.center[0] < 29.0 && profile.center[1] > 76.5 && profile.center[1] < 78.0
    );
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 6: Same-City Edge Cases (Delhi → Delhi)
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 6: Same-City Edge Cases (Delhi → Delhi) ---');
  {
    const flightPackage = getFlightDataForDestination('Delhi, India', 'Delhi, India');
    report('S6.1 Flight package detects isSameCity === true',
      flightPackage.isSameCity === true
    );
    report('S6.2 Flight package requiresFlight === false',
      flightPackage.requiresFlight === false
    );
    report('S6.3 Informative guard message rendered',
      flightPackage.message === 'No flight required — origin and destination are the same city.',
      flightPackage.message
    );

    // Backend flight provider test for same-city
    const providerResult = await flightProvider.search({
      origin: 'Delhi',
      destination: 'Delhi',
      departureDate: '2026-11-01',
      passengers: 2,
      cabinClass: 'economy'
    });
    report('S6.4 Backend flight provider marks isSameCity: true',
      providerResult.isSameCity === true
    );
    report('S6.5 Backend returns empty flight list for same city',
      providerResult.outbound.length === 0 && providerResult.returnFlights.length === 0
    );

    // Backend flight service test
    const serviceResult = await flightService.searchFlights({
      origin: 'Delhi',
      destination: 'Delhi',
      departureDate: '2026-11-01'
    });
    report('S6.6 Backend FlightService responds with isSameCity: true and success',
      serviceResult.isSameCity === true && serviceResult.message?.includes('No flight required')
    );
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 7: Coordinate Sanity & Bounding Box Checks
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 7: Coordinate Sanity & Bounding Box Checks ---');
  {
    report('S7.1 Valid coordinates accepted', isValidCoordinate(28.6139, 77.2090).valid);
    report('S7.2 Null coordinate rejected', !isValidCoordinate(null, 77.2090).valid);
    report('S7.3 NaN coordinate rejected', !isValidCoordinate(NaN, 77.2090).valid);
    report('S7.4 Out of bounds lat > 90 rejected', !isValidCoordinate(95.0, 77.2090).valid);
    report('S7.5 Out of bounds lng > 180 rejected', !isValidCoordinate(28.6139, 185.0).valid);
    report('S7.6 Null island (0, 0) rejected', !isValidCoordinate(0, 0).valid);

    // Bounding boxes
    report('S7.7 Delhi is within India bounding box', isGeographicallyConsistent(28.6139, 77.2090, 'IN'));
    report('S7.8 Paris is within France bounding box', isGeographicallyConsistent(48.8566, 2.3522, 'FR'));
    report('S7.9 Tokyo is within Japan bounding box', isGeographicallyConsistent(35.6762, 139.6503, 'JP'));
    report('S7.10 Balochistan (28, 63) is NOT in India', !isGeographicallyConsistent(28, 63, 'IN'));
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 8: Flight Route Integrity Validator
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 8: Flight Route Integrity Validator ---');
  {
    // Valid roundtrip
    const validCheck = validateFlightIntegrity('MAA', 'DEL', 'DEL', 'MAA');
    report('S8.1 MAA ➔ DEL and DEL ➔ MAA is valid', validCheck.valid);

    // Loop / Same-city
    const loopCheck = validateFlightIntegrity('DEL', 'DEL', 'DEL', 'DEL');
    report('S8.2 DEL ➔ DEL is caught with isSameCity: true', loopCheck.isSameCity && loopCheck.error?.includes('No flight required'));

    // Mismatched return
    const mismatchCheck = validateFlightIntegrity('MAA', 'DEL', 'BOM', 'MAA');
    report('S8.3 Return leg from BOM when outbound landed in DEL caught', !mismatchCheck.valid);
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 9: Day Route Waypoint Sanity (Purges Out-of-Region Points)
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 9: Day Route Waypoint Sanity ---');
  {
    const tripWithActivity = {
      destination: 'Delhi, India',
      itinerary: [
        {
          dayNumber: 1,
          activities: [
            { activity: 'India Gate War Memorial', location: 'Central Delhi' },
            { activity: 'Qutub Minar Complex', location: 'Mehrauli, South Delhi' }
          ]
        }
      ]
    };
    const waypoints = buildDayWaypoints(tripWithActivity, 1);
    report('S9.1 All waypoints strictly within 120km of Delhi center',
      waypoints.every(wp => {
        const dLat = Math.abs(wp.coords[0] - 28.6139);
        const dLng = Math.abs(wp.coords[1] - 77.2090);
        return dLat < 1.0 && dLng < 1.0;
      })
    );
  }

  console.log('\n=============================================================================');
  console.log(`🎉 ALL PHASE 11 TESTS PASSED: ${passedTests}/${totalTests} (100% SUCCESS)`);
  console.log('=============================================================================\n');
}

runPhase11Tests().catch((err) => {
  console.error('\n❌ TEST RUNNER ABORTED WITH ERROR:', err);
  process.exit(1);
});
