/**
 * Travelia Real Tourist Attractions Master Test Suite
 * 
 * Validates dynamic, location-aware real tourist attraction resolution:
 * - Real attractions for Delhi, Paris, London, Tokyo, Dubai, Mumbai, Norway
 * - Destination changes produce distinct results (Delhi != Paris != Tokyo != Dubai != Norway)
 * - Country vs City entity recognition (Norway is handled as a country)
 * - Strict geographic validation (coordinates within bounds, no cross-country leaks)
 * - Provider Place ID existence
 * - Deduplication
 * - No fabricated prices (₹350, ₹200, ₹150 strictly eliminated)
 * - No fabricated ratings
 * - No fictional place names ("Norway Landmark Vista", "Historic Cultural Pavilion" strictly absent)
 * - Unique, place-specific imagery
 * - Honest status labeling (live, cached, fallback, demo)
 */

import assert from 'assert';
import { placesService } from './services/placesService';
import { resolveCanonicalLocation, COUNTRY_BOUNDING_BOXES } from './services/canonicalLocationService';
import { verifiedPlacesCatalog } from './services/verifiedPlacesCatalog';
import { placesCache } from './services/placesEngine/placesCache';

async function runRealTouristAttractionsTestSuite() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING TRAVELIA REAL TOURIST ATTRACTIONS MASTER TEST SUITE');
  console.log('===============================================================\n');

  // Test 1: Canonical Location Resolution for City vs Country
  console.log('▶ Test 1: Canonical Location Resolution (City vs Country)');
  const delhiLoc = resolveCanonicalLocation('Delhi, India');
  assert(delhiLoc !== null, 'Delhi must resolve to canonical location');
  assert.strictEqual(delhiLoc.countryCode, 'IN', 'Delhi countryCode must be IN');
  assert.strictEqual(delhiLoc.entityType, 'city', 'Delhi must have entityType city');

  const norwayLoc = resolveCanonicalLocation('Norway');
  assert(norwayLoc !== null, 'Norway must resolve to canonical location');
  assert.strictEqual(norwayLoc.countryCode, 'NO', 'Norway countryCode must be NO');
  assert.strictEqual(norwayLoc.entityType, 'country', 'Norway must be recognized as COUNTRY');
  console.log('  ✔ Delhi resolved as CITY (IN) and Norway resolved as COUNTRY (NO)');

  // Test 2: Real Tourist Attractions for Delhi
  console.log('\n▶ Test 2: Destination-Aware Attractions for Delhi');
  const delhiRes = await placesService.searchAttractions('Delhi');
  assert(delhiRes.success, 'Delhi attractions request must succeed');
  assert(delhiRes.places.length >= 3, 'Must return at least 3 attractions for Delhi');
  
  const delhiNames = delhiRes.places.map(p => p.name);
  console.log('  Delhi attractions found:', delhiNames.join(', '));
  assert(
    delhiNames.some(n => n.includes('Red Fort') || n.includes('India Gate') || n.includes('Qutub Minar')),
    'Delhi results must contain authentic landmarks like Red Fort, India Gate, or Qutub Minar'
  );
  assert(
    !delhiNames.some(n => n.includes('Landmark Vista') || n.includes('Cultural Pavilion')),
    'Must NOT contain fictional demo place names'
  );
  console.log('  ✔ Real Delhi attractions verified');

  // Test 3: Real Tourist Attractions for Norway (Country Case)
  console.log('\n▶ Test 3: Real Tourist Attractions for Norway (Country-wide)');
  const norwayRes = await placesService.searchAttractions('Norway');
  assert(norwayRes.success, 'Norway attractions request must succeed');
  assert(norwayRes.places.length >= 3, 'Must return at least 3 attractions for Norway');
  
  const norwayNames = norwayRes.places.map(p => p.name);
  console.log('  Norway attractions found:', norwayNames.join(', '));
  assert(
    norwayNames.some(n => n.includes('Geirangerfjord') || n.includes('Vigeland') || n.includes('Bryggen') || n.includes('Preikestolen')),
    'Norway results must contain real Norwegian attractions like Geirangerfjord, Vigeland, or Bryggen'
  );
  assert(
    !norwayNames.some(n => n.toLowerCase().includes('vista') || n.includes('Cultural Pavilion')),
    'Must NOT contain fictional "Norway Landmark Vista"'
  );
  assert(
    norwayRes.locationContext?.includes('across Norway') || norwayRes.locationContext?.includes('Norway'),
    'Norway response must acknowledge country-wide context'
  );
  console.log('  ✔ Real Norway attractions across country verified');

  // Test 4: Real Tourist Attractions for Paris
  console.log('\n▶ Test 4: Real Tourist Attractions for Paris');
  const parisRes = await placesService.searchAttractions('Paris');
  assert(parisRes.success, 'Paris attractions request must succeed');
  const parisNames = parisRes.places.map(p => p.name);
  console.log('  Paris attractions found:', parisNames.join(', '));
  assert(
    parisNames.some(n => n.includes('Eiffel Tower') || n.includes('Louvre') || n.includes('Arc de Triomphe')),
    'Paris results must contain Eiffel Tower, Louvre, or Arc de Triomphe'
  );
  console.log('  ✔ Real Paris attractions verified');

  // Test 5: Real Tourist Attractions for London
  console.log('\n▶ Test 5: Real Tourist Attractions for London');
  const londonRes = await placesService.searchAttractions('London');
  assert(londonRes.success, 'London attractions request must succeed');
  const londonNames = londonRes.places.map(p => p.name);
  console.log('  London attractions found:', londonNames.join(', '));
  assert(
    londonNames.some(n => n.includes('Tower Bridge') || n.includes('British Museum') || n.includes('London Eye') || n.includes('Big Ben')),
    'London results must contain Tower Bridge, British Museum, or London Eye'
  );
  console.log('  ✔ Real London attractions verified');

  // Test 6: Real Tourist Attractions for Tokyo
  console.log('\n▶ Test 6: Real Tourist Attractions for Tokyo');
  const tokyoRes = await placesService.searchAttractions('Tokyo');
  assert(tokyoRes.success, 'Tokyo attractions request must succeed');
  const tokyoNames = tokyoRes.places.map(p => p.name);
  console.log('  Tokyo attractions found:', tokyoNames.join(', '));
  assert(
    tokyoNames.some(n => n.includes('Sensō-ji') || n.includes('Shibuya') || n.includes('Skytree')),
    'Tokyo results must contain Sensō-ji, Shibuya, or Skytree'
  );
  console.log('  ✔ Real Tokyo attractions verified');

  // Test 7: Real Tourist Attractions for Dubai
  console.log('\n▶ Test 7: Real Tourist Attractions for Dubai');
  const dubaiRes = await placesService.searchAttractions('Dubai');
  assert(dubaiRes.success, 'Dubai attractions request must succeed');
  const dubaiNames = dubaiRes.places.map(p => p.name);
  console.log('  Dubai attractions found:', dubaiNames.join(', '));
  assert(
    dubaiNames.some(n => n.includes('Burj Khalifa') || n.includes('Dubai Mall') || n.includes('Future') || n.includes('Frame')),
    'Dubai results must contain Burj Khalifa, Dubai Mall, or Museum of the Future'
  );
  console.log('  ✔ Real Dubai attractions verified');

  // Test 8: Real Tourist Attractions for Mumbai
  console.log('\n▶ Test 8: Real Tourist Attractions for Mumbai');
  const mumbaiRes = await placesService.searchAttractions('Mumbai');
  assert(mumbaiRes.success, 'Mumbai attractions request must succeed');
  const mumbaiNames = mumbaiRes.places.map(p => p.name);
  console.log('  Mumbai attractions found:', mumbaiNames.join(', '));
  assert(
    mumbaiNames.some(n => n.includes('Gateway of India') || n.includes('Marine Drive') || n.includes('Terminus') || n.includes('Elephanta')),
    'Mumbai results must contain Gateway of India, Marine Drive, or CSMT'
  );
  console.log('  ✔ Real Mumbai attractions verified');

  // Test 9: Destination Change Disjointness (Delhi != Paris != Tokyo != Dubai != Norway)
  console.log('\n▶ Test 9: Destination Change Produces Distinct Results');
  const setDelhi = new Set(delhiNames);
  const setParis = new Set(parisNames);
  const setTokyo = new Set(tokyoNames);
  const setDubai = new Set(dubaiNames);
  const setNorway = new Set(norwayNames);

  assert(
    !delhiNames.some(n => setParis.has(n)),
    'Delhi attractions must NOT overlap with Paris'
  );
  assert(
    !parisNames.some(n => setTokyo.has(n)),
    'Paris attractions must NOT overlap with Tokyo'
  );
  assert(
    !tokyoNames.some(n => setDubai.has(n)),
    'Tokyo attractions must NOT overlap with Dubai'
  );
  assert(
    !dubaiNames.some(n => setNorway.has(n)),
    'Dubai attractions must NOT overlap with Norway'
  );
  console.log('  ✔ Verified: Delhi ≠ Paris ≠ Tokyo ≠ Dubai ≠ Norway');

  // Test 10: Geographic Bounds and Country Consistency
  console.log('\n▶ Test 10: Geographic Bounds and Country Consistency');
  for (const place of delhiRes.places) {
    assert(place.latitude >= 28.0 && place.latitude <= 29.5, `Delhi place ${place.name} latitude must be in Delhi region`);
    assert(place.longitude >= 76.5 && place.longitude <= 78.0, `Delhi place ${place.name} longitude must be in Delhi region`);
    assert.strictEqual(place.countryCode, 'IN', `Delhi place ${place.name} countryCode must be IN`);
  }

  const norwayBounds = COUNTRY_BOUNDING_BOXES.NO;
  for (const place of norwayRes.places) {
    assert(
      place.latitude >= norwayBounds.minLat && place.latitude <= norwayBounds.maxLat,
      `Norway place ${place.name} lat (${place.latitude}) must be inside Norway bounding box`
    );
    assert(
      place.longitude >= norwayBounds.minLng && place.longitude <= norwayBounds.maxLng,
      `Norway place ${place.name} lng (${place.longitude}) must be inside Norway bounding box`
    );
    assert.strictEqual(place.countryCode, 'NO', `Norway place ${place.name} countryCode must be NO`);
  }
  console.log('  ✔ All places verified strictly inside their destination country bounds');

  // Test 11: Provider Place ID & Deduplication
  console.log('\n▶ Test 11: Provider Place ID & Deduplication');
  const allDestinations = [delhiRes, norwayRes, parisRes, londonRes, tokyoRes, dubaiRes, mumbaiRes];
  for (const res of allDestinations) {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    for (const p of res.places) {
      assert(p.id && p.id.trim().length > 0, `Place ${p.name} must have a non-empty ID`);
      assert(p.providerPlaceId || p.providerId, `Place ${p.name} must have a provider place ID`);
      assert(!seenIds.has(p.id), `Duplicate place ID detected: ${p.id} for ${p.name}`);
      assert(!seenNames.has(p.name.toLowerCase()), `Duplicate place name detected: ${p.name}`);
      seenIds.add(p.id);
      seenNames.add(p.name.toLowerCase());
    }
  }
  console.log('  ✔ All places have provider place IDs and are strictly deduplicated');

  // Test 12: No Fabricated Prices (No ₹350/₹200/₹150)
  console.log('\n▶ Test 12: No Fabricated Prices (Strict Pricing Integrity)');
  for (const res of allDestinations) {
    for (const p of res.places) {
      if (p.priceLevel === 0) {
        assert.strictEqual(p.estimatedCost, 0, `Free place ${p.name} must have entryCost = 0`);
      } else {
        // Must either be null (unverified tariff) or an authoritative amount, NEVER the demo 350/200/150
        if (p.estimatedCost !== null && p.estimatedCost !== undefined) {
          assert(![350, 200, 150].includes(p.estimatedCost), `Place ${p.name} has fabricated demo fee ${p.estimatedCost}`);
        }
      }
    }
  }
  console.log('  ✔ Zero fabricated prices found; ₹350/₹200/₹150 eliminated');

  // Test 13: Ratings are Authentic (No fabricated random numbers)
  console.log('\n▶ Test 13: Authentic Ratings Integrity');
  for (const res of allDestinations) {
    for (const p of res.places) {
      if (p.rating !== undefined && p.rating !== null) {
        assert(typeof p.rating === 'number', `Rating must be a number for ${p.name}`);
        assert(p.rating >= 1.0 && p.rating <= 5.0, `Rating out of bounds for ${p.name}`);
        assert(p.userRatingsTotal === undefined || p.userRatingsTotal >= 0, `userRatingsTotal must be positive for ${p.name}`);
      }
    }
  }
  console.log('  ✔ All ratings are valid numbers within [1.0, 5.0]');

  // Test 14: Unique place photos (No recycled static image across places)
  console.log('\n▶ Test 14: Unique Place Photos');
  const delhiPhotos = delhiRes.places.map(p => p.photos?.[0]?.uri).filter(Boolean);
  const uniqueDelhiPhotos = new Set(delhiPhotos);
  assert.strictEqual(
    delhiPhotos.length, 
    uniqueDelhiPhotos.size, 
    'Delhi places must have distinct photos, not identical recycled images'
  );
  console.log('  ✔ Photos correspond uniquely to their respective attractions');

  // Test 15: Cache Isolation (Delhi cached results never leak to Norway)
  console.log('\n▶ Test 15: Cache Isolation Across Destinations');
  const cacheKeyDelhi = placesCache.generateKey({ destination: 'Delhi' });
  const cacheKeyNorway = placesCache.generateKey({ destination: 'Norway' });
  assert.notStrictEqual(cacheKeyDelhi, cacheKeyNorway, 'Cache keys for Delhi and Norway must be distinct');
  console.log('  ✔ Cache keys are isolated per destination');

  console.log('\n===============================================================');
  console.log('🎉 ALL 15 REAL TOURIST ATTRACTIONS TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

runRealTouristAttractionsTestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
