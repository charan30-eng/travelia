/**
 * TRAVELIA PACKING ASSISTANT SERVICE — PHASE 8
 * 
 * CORE PRINCIPLE:
 * Generates truly context-aware packing recommendations by consuming 5 dimensions:
 * 1. Weather (rain risk, temperature ranges, UV index, extreme conditions)
 * 2. Activities (hiking, watersports, temples, fine dining, city walks)
 * 3. Duration (number of days and nights for quantity calculation)
 * 4. Destination (regional power outlets, international vs domestic documentation, climate zone)
 * 5. Trip Style (relaxed, adventure, budget, luxury, cultural)
 */

import { PackingListRequest, PackingListResponse, UserPreferences } from '../types/ai';
import { detectCountryFromDestination } from '../../src/data/currencyHelper';

export interface PackingContextInput {
  destination: string;
  duration: number;
  tripStyle?: string;
  activities?: Array<{ activity?: string; name?: string; category?: string; location?: string }> | string[];
  weatherForecast?: Array<{
    dayNumber?: number;
    condition?: string;
    precipitationProbability?: number;
    temperatureMaxC?: number;
    temperatureMinC?: number;
    uvIndex?: number | null;
  }> | null;
  userPreferences?: UserPreferences;
}

export function generateContextAwarePackingList(input: PackingContextInput): PackingListResponse {
  const destination = input.destination || 'Destination';
  const duration = Math.max(1, input.duration || 3);
  const tripStyle = (input.tripStyle || input.userPreferences?.travelStyle || 'balanced').toLowerCase();
  const destLower = destination.toLowerCase();

  const weather = input.weatherForecast || [];
  const rawActivities = input.activities || [];
  const activityNames: string[] = rawActivities.map(a => 
    typeof a === 'string' ? a : (a.activity || a.name || '')
  );
  const activityCategories: string[] = rawActivities.map(a =>
    typeof a === 'object' && a?.category ? a.category : ''
  );
  const allActivityText = `${activityNames.join(' ')} ${activityCategories.join(' ')}`.toLowerCase();

  const items: PackingListResponse['items'] = [];
  const weatherInsights: string[] = [];
  const activityHighlights: string[] = [];

  let nextId = 1;
  const addItem = (
    name: string,
    category: 'clothing' | 'documents' | 'electronics' | 'essentials' | 'activity_gear',
    aiSuggestedReason: string,
    checked: boolean = false
  ) => {
    // Avoid duplicate item names
    if (!items.some(i => i.name.toLowerCase() === name.toLowerCase())) {
      items.push({
        id: `pack-${category.substring(0, 3)}-${nextId++}`,
        name,
        category,
        checked,
        aiSuggestedReason
      });
    }
  };

  // =========================================================================
  // 1. WEATHER DIMENSION
  // =========================================================================
  const rainDays = weather.filter(w => (w.precipitationProbability ?? 0) >= 30);
  const maxRainProb = weather.reduce((max, w) => Math.max(max, w.precipitationProbability ?? 0), 0);
  const minTemp = weather.reduce((min, w) => Math.min(min, w.temperatureMinC ?? 20), 100);
  const maxTemp = weather.reduce((max, w) => Math.max(max, w.temperatureMaxC ?? 25), -100);

  const hasHighRainRisk = maxRainProb >= 40 || rainDays.length > 0;
  const isColdWeather = minTemp < 15 || destLower.includes('manali') || destLower.includes('alps') || destLower.includes('swiss') || destLower.includes('ladakh');
  const isHotSunny = maxTemp >= 28 || destLower.includes('goa') || destLower.includes('dubai') || destLower.includes('rajasthan') || destLower.includes('bali');

  if (hasHighRainRisk) {
    weatherInsights.push(`Rain risk up to ${maxRainProb}% detected during trip days`);
    addItem(
      'Compact Windproof Travel Umbrella',
      'essentials',
      `Weather insight: ${maxRainProb}% precipitation forecasted; ensures dry transitions between venues`,
      true
    );
    addItem(
      'Waterproof Breathable Rain Jacket / Poncho',
      'clothing',
      'Weather insight: lightweight packable shell for outdoor sightseeing in wet conditions'
    );
    addItem(
      'Waterproof Electronics Dry Pouch',
      'activity_gear',
      'Guards smartphones and documents against unexpected rain showers'
    );
  }

  if (isColdWeather) {
    weatherInsights.push(`Chilly conditions forecasted (lows around ${minTemp < 100 ? minTemp : 12}°C)`);
    addItem(
      'Thermal Base Layer Tops & Bottoms',
      'clothing',
      `Weather insight: keeps core warm during crisp morning and evening excursions (${minTemp}°C lows)`
    );
    addItem(
      'Fleece Mid-Layer Jacket or Woolen Pullover',
      'clothing',
      'Weather insight: versatile layering for variable mountain or seasonal temperatures'
    );
    addItem(
      'Insulated Beanie & Touchscreen Gloves',
      'clothing',
      'Protects extremities during outdoor scenic viewpoints'
    );
    addItem(
      'Hydrating Lip Balm & Cold Barrier Cream',
      'essentials',
      'Prevents windburn and dry skin in cold climates'
    );
  }

  if (isHotSunny) {
    weatherInsights.push(`Warm sunny weather anticipated (highs near ${maxTemp > -100 ? maxTemp : 32}°C)`);
    addItem(
      'Broad-Spectrum SPF 50+ Sunscreen (Reef-Safe)',
      'essentials',
      `Weather insight: intense UV exposure forecasted with temperatures up to ${maxTemp}°C`,
      true
    );
    addItem(
      'Polarized UV400 Sunglasses',
      'essentials',
      'Cuts glare during daytime exploration and waterfront promenades',
      true
    );
    addItem(
      'Wide-Brim Sun Hat or Breathable Cap',
      'clothing',
      'Shields face and neck during open-air monument visits'
    );
    addItem(
      'Electrolyte Hydration Tablets / Flask',
      'essentials',
      'Prevents dehydration during extended walking in warm weather'
    );
  }

  // =========================================================================
  // 2. ACTIVITY DIMENSION
  // =========================================================================
  const hasBeachOrWater = allActivityText.includes('beach') || 
                          allActivityText.includes('swim') || 
                          allActivityText.includes('water') || 
                          allActivityText.includes('cruise') || 
                          allActivityText.includes('shack') ||
                          destLower.includes('goa') ||
                          destLower.includes('bali') ||
                          destLower.includes('maldives');

  const hasTrekkingOrHiking = allActivityText.includes('trek') || 
                             allActivityText.includes('hike') || 
                             allActivityText.includes('trail') || 
                             allActivityText.includes('mountain') || 
                             allActivityText.includes('climb') ||
                             allActivityText.includes('fort') ||
                             tripStyle === 'adventure';

  const hasTempleOrReligious = allActivityText.includes('temple') || 
                               allActivityText.includes('church') || 
                               allActivityText.includes('mosque') || 
                               allActivityText.includes('shrine') || 
                               allActivityText.includes('basilica') || 
                               allActivityText.includes('cathedral');

  const hasFineDiningOrNightlife = allActivityText.includes('fine dining') || 
                                   allActivityText.includes('michelin') || 
                                   allActivityText.includes('lounge') || 
                                   allActivityText.includes('cocktail') || 
                                   allActivityText.includes('bistro') ||
                                   tripStyle === 'luxury';

  if (hasBeachOrWater) {
    activityHighlights.push('Coastal & watersport activities scheduled');
    addItem(
      'Quick-Dry Swimwear & Rashguard',
      'activity_gear',
      'Activity requirement: scheduled beach outings and coastal watersports'
    );
    addItem(
      'Fast-Drying Microfiber Beach Towel',
      'activity_gear',
      'Compact, sand-free towel for coastal relaxation'
    );
    addItem(
      'Waterproof Sand-Resistant Tote Bag',
      'activity_gear',
      'Keeps personal items clean while relaxing on the sand'
    );
  }

  if (hasTrekkingOrHiking) {
    activityHighlights.push('Active trekking or nature trails planned');
    addItem(
      'Trail Hiking Shoes with High-Traction Grip',
      'clothing',
      'Activity requirement: rough terrain and fort/hill trail exploration',
      true
    );
    addItem(
      'Blister Prevention Band-Aids & Moleskin',
      'essentials',
      'First-aid protection against friction during high-step-count days'
    );
    addItem(
      'Lightweight Packable 15L Daypack',
      'activity_gear',
      'Carries water, snacks, and personal gear comfortably on active routes'
    );
  }

  if (hasTempleOrReligious) {
    activityHighlights.push('Heritage shrines or religious landmarks included');
    addItem(
      'Modest Shoulder & Knee Cover Attire (Scarf/Shawl/Sarong)',
      'clothing',
      'Activity requirement: mandatory modest dress codes for temples and cathedrals',
      true
    );
    addItem(
      'Easy Slip-On Shoes or Washable Footwear',
      'clothing',
      'Convenient for venues requiring footwear removal before entry'
    );
  }

  if (hasFineDiningOrNightlife) {
    activityHighlights.push('Upscale dining or evening lounges scheduled');
    addItem(
      'Smart-Casual / Semi-Formal Evening Wear',
      'clothing',
      'Activity requirement: dress codes for fine-dining restaurants and sky lounges'
    );
  }

  // =========================================================================
  // 3. DURATION DIMENSION
  // =========================================================================
  const shirtCount = Math.min(8, duration + 1);
  const bottomCount = Math.min(5, Math.ceil(duration / 2) + 1);
  
  addItem(
    `${shirtCount}x Breathable Day Tops / Shirts`,
    'clothing',
    `Duration formula: ${duration} trip days + 1 extra buffer change`,
    true
  );
  addItem(
    `${bottomCount}x Versatile Chinos / Trousers / Shorts`,
    'clothing',
    `Duration formula: rotational bottoms for a ${duration}-day itinerary`
  );
  addItem(
    `${duration + 2}x Pairs of Moisture-Wicking Socks & Undergarments`,
    'clothing',
    `Duration formula: daily fresh pair + 2 emergency buffers`,
    true
  );

  if (duration >= 6) {
    addItem(
      'Travel Laundry Detergent Sheets & Sink Stopper',
      'essentials',
      `Duration formula: ${duration} days makes mid-trip garment refresh practical without luggage overload`
    );
  }

  // =========================================================================
  // 4. DESTINATION DIMENSION
  // =========================================================================
  const detectedCountry = detectCountryFromDestination(destination);
  const isInternational = detectedCountry.countryCode !== 'IN';


  if (isInternational) {
    addItem(
      'Valid Passport with 6-Month Validity & Printed Visa Vouchers',
      'documents',
      `Destination requirement: mandatory for international transit to ${destination}`,
      true
    );
    addItem(
      'Zero-Forex Travel Card & Emergency Local Currency Cash',
      'documents',
      `Destination requirement: currency exchange and card acceptance in ${destination}`,
      true
    );
    addItem(
      'Universal Travel Plug Adapter (Multi-Country Pin)',
      'electronics',
      `Destination requirement: power wall-socket compatibility in ${destination}`,
      true
    );
    addItem(
      'International Roaming eSIM / Portable Wi-Fi',
      'electronics',
      `Destination requirement: constant GPS navigation connectivity abroad`
    );
  } else {
    addItem(
      'Original Government ID (Aadhaar / Voter ID / Driver License)',
      'documents',
      `Domestic travel requirement: mandatory check-in verification for Indian hotels/flights`,
      true
    );
  }

  // Universal documents
  addItem(
    'Flight Tickets & Hotel Booking Confirmations (Offline PDF)',
    'documents',
    'Essential check-in proof accessible without internet connectivity',
    true
  );
  addItem(
    'Comprehensive Travel & Medical Insurance Policy',
    'documents',
    'Protects against unforeseen cancellations, baggage delays, and medical emergencies'
  );

  // Universal electronics
  addItem(
    '10,000mAh High-Speed Power Bank (Flight Carry-On Approved)',
    'electronics',
    'Vital for full-day camera use, navigation, and digital boarding passes',
    true
  );
  addItem(
    'Universal Multi-Port USB-C Rapid Charger & Cables',
    'electronics',
    'Charges all portable devices simultaneously overnight'
  );

  // Universal essentials
  addItem(
    'Personal First-Aid Kit (Pain Relief, Band-Aids, Antacids, Motion Sickness)',
    'essentials',
    'Reliable self-care for minor travel stomach upsets or aches',
    true
  );

  // =========================================================================
  // 5. TRIP STYLE DIMENSION
  // =========================================================================
  if (tripStyle === 'relaxed') {
    addItem(
      'Comfortable Loungewear & Lightweight Slip-On Loafers',
      'clothing',
      'Trip style: relaxed leisure focus with ample downtime'
    );
    addItem(
      'Kindle / Book or Noise-Cancelling Headphones',
      'electronics',
      'Trip style: enhances tranquil relaxation intervals between gentle activities'
    );
  } else if (tripStyle === 'adventure') {
    addItem(
      'Multi-Tool Carabiners & Heavy-Duty Dry Bag',
      'activity_gear',
      'Trip style: adventure-ready utility for outdoor ruggedness'
    );
    addItem(
      'Quick-Dry Synthetic Moisture-Wicking Trail Apparel',
      'clothing',
      'Trip style: durable performance clothing designed for sweat and movement'
    );
  } else if (tripStyle === 'budget') {
    addItem(
      'Compact TSA Combination Luggage Padlock',
      'essentials',
      'Trip style: secures lockers in budget transit hubs and hostels'
    );
    addItem(
      'Reusable Collapsible Water Bottle with Filter',
      'essentials',
      'Trip style: eco-friendly refills saving daily bottled water expenses'
    );
  } else if (tripStyle === 'luxury') {
    addItem(
      'Wrinkle-Free Garment Folder & Premium Steamer',
      'clothing',
      'Trip style: keeps high-end dining and evening outfits pristine'
    );
  }

  const summary = `Generated ${items.length} context-aware packing items tailored to ${destination} (${duration} days, ${tripStyle} style), calibrated against weather risks and scheduled activities.`;

  return {
    destination,
    duration,
    tripStyle,
    items,
    summary,
    weatherInsights,
    activityHighlights
  };
}
