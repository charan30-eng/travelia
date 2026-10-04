/**
 * Travelia Places Data Layer - Demo Places Adapter
 * 
 * Provides explicit, high-quality demo fallback places when Google Places API
 * is disabled, unconfigured, or temporarily unavailable.
 * 
 * ALL PLACES RETURNED BY THIS SERVICE ARE STRICTLY MARKED:
 * source: 'demo'
 * dataStatus: 'demo'
 * 
 * NEVER presents demo places as live Google data.
 */

import { TraveliaPlace, PlaceCategory } from '../types/places';
import { VERIFIED_DESTINATION_CENTROIDS } from './locationResolutionService';

// Curated demo catalog across key destinations
const DEMO_CATALOG: TraveliaPlace[] = [
  // ==========================================
  // GOA, INDIA
  // ==========================================
  {
    id: 'demo-goa-hotel-1',
    providerId: 'demo-goa-hotel-1',
    name: 'Ocean Pearl Resort',
    category: 'hotel',
    latitude: 15.5186,
    longitude: 73.7628,
    address: 'Candolim Coast, North Goa, 403515, India',
    rating: 4.8,
    userRatingsTotal: 428,
    priceLevel: 3,
    websiteUri: 'https://example.com/ocean-pearl-resort',
    phoneNumber: '+91 832 248 9000',
    openingHours: { openNow: true, weekdayDescriptions: ['Open 24 hours'] },
    types: ['lodging', 'resort', 'hotel'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Luxury seaside boutique retreat offering breathtaking Arabian Sea sunsets, private cabanas, and Goan hospitality.',
    tag: 'Best Overall Stay',
    amenities: ['Infinity Pool', 'Beach Access', 'Free Breakfast', 'Ayurvedic Spa', 'High-Speed Wi-Fi'],
    photos: [{ uri: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-goa-hotel-2',
    providerId: 'demo-goa-hotel-2',
    name: 'Palm Grove Hotel & Suites',
    category: 'hotel',
    latitude: 15.5439,
    longitude: 73.7554,
    address: 'Calangute Main Road, North Goa, 403516, India',
    rating: 4.6,
    userRatingsTotal: 312,
    priceLevel: 2,
    openingHours: { openNow: true, weekdayDescriptions: ['Open 24 hours'] },
    types: ['lodging', 'hotel'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Cozy boutique stay surrounded by swaying coconut palms, just 5 minutes walk from lively markets and beach shacks.',
    tag: 'Best Value',
    amenities: ['Tropical Garden Pool', 'Multi-Cuisine Diner', 'Cocktail Bar', 'Airport Shuttle'],
    photos: [{ uri: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-goa-hotel-3',
    providerId: 'demo-goa-hotel-3',
    name: 'Coastal Haven Villa & Suites',
    category: 'hotel',
    latitude: 15.6059,
    longitude: 73.7368,
    address: 'Vagator Clifftop, North Goa, 403509, India',
    rating: 4.7,
    userRatingsTotal: 194,
    priceLevel: 4,
    openingHours: { openNow: true, weekdayDescriptions: ['Open 24 hours'] },
    types: ['lodging', 'resort', 'hotel'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Exclusive clifftop sanctuary blending bohemian Portuguese architecture with ultra-modern luxury amenities and sunset vistas.',
    tag: 'Luxury Pick',
    amenities: ['Private Plunge Pool', 'Cliff View Balcony', 'Chef on Demand', 'Yoga Deck'],
    photos: [{ uri: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-goa-attr-1',
    providerId: 'demo-goa-attr-1',
    name: 'Baga Beach',
    category: 'beach',
    latitude: 15.5553,
    longitude: 73.7517,
    address: 'Baga, North Goa, Goa 403516, India',
    rating: 4.8,
    userRatingsTotal: 12500,
    priceLevel: 0,
    openingHours: { openNow: true, weekdayDescriptions: ['Open 24 hours'] },
    types: ['tourist_attraction', 'natural_feature', 'beach'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Goa’s most iconic beach, known for thrilling watersports, lively beach shacks, golden sands, and vibrant nightlife.',
    tag: 'Must Visit • Top Rated',
    photos: [{ uri: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-goa-attr-2',
    providerId: 'demo-goa-attr-2',
    name: 'Fort Aguada & Lighthouse',
    category: 'landmark',
    latitude: 15.4921,
    longitude: 73.7736,
    address: 'Sinquerim Beach Cliff, Candolim, Goa 403515, India',
    rating: 4.7,
    userRatingsTotal: 8400,
    priceLevel: 1,
    openingHours: { openNow: true, weekdayDescriptions: ['9:30 AM – 6:00 PM Daily'] },
    types: ['tourist_attraction', 'historical_landmark', 'point_of_interest'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'A well-preserved 17th-century Portuguese fortress standing proudly on the Sinquerim hill with panoramic ocean views.',
    tag: 'Historic Landmark',
    photos: [{ uri: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-goa-attr-3',
    providerId: 'demo-goa-attr-3',
    name: 'Dudhsagar Waterfalls',
    category: 'park',
    latitude: 15.3144,
    longitude: 74.3143,
    address: 'Bhagwan Mahavir Wildlife Sanctuary, Sonaulim, Goa 403410, India',
    rating: 4.9,
    userRatingsTotal: 5600,
    priceLevel: 1,
    types: ['tourist_attraction', 'park', 'natural_feature'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'A four-tiered waterfall cascading like a "Sea of Milk" through the lush Western Ghats forest canopy.',
    tag: 'Natural Wonder',
    photos: [{ uri: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-goa-attr-4',
    providerId: 'demo-goa-attr-4',
    name: 'Basilica of Bom Jesus',
    category: 'church',
    latitude: 15.5009,
    longitude: 73.9116,
    address: 'Old Goa Heritage Quarter, Old Goa, Goa 403402, India',
    rating: 4.8,
    userRatingsTotal: 9200,
    priceLevel: 0,
    openingHours: { openNow: true, weekdayDescriptions: ['9:00 AM – 6:30 PM (Mon-Sat)', '10:30 AM – 6:30 PM (Sun)'] },
    types: ['tourist_attraction', 'church', 'place_of_worship'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Baroque masterpiece housing the mortal remains of St. Francis Xavier, featuring ornate gilded altars.',
    tag: 'UNESCO World Heritage',
    photos: [{ uri: 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-goa-attr-5',
    providerId: 'demo-goa-attr-5',
    name: 'Chapora Fort',
    category: 'landmark',
    latitude: 15.6059,
    longitude: 73.7368,
    address: 'Chapora, Vagator, Goa 403509, India',
    rating: 4.6,
    userRatingsTotal: 6100,
    priceLevel: 0,
    types: ['tourist_attraction', 'historical_landmark'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Famous hilltop bastion offering sweeping 360-degree vistas of Vagator Beach, the Arabian Sea, and Chapora River.',
    tag: 'Scenic Viewpoint',
    photos: [{ uri: 'https://images.unsplash.com/photo-1570789210967-2cac24afeb00?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-goa-rest-1',
    providerId: 'demo-goa-rest-1',
    name: 'Spice Route Kitchen',
    category: 'restaurant',
    latitude: 15.4989,
    longitude: 73.8311,
    address: 'Fontainhas, Panaji, Goa 403001, India',
    rating: 4.7,
    userRatingsTotal: 1850,
    priceLevel: 2,
    cuisine: 'Traditional Goan & Coastal Seafood',
    types: ['restaurant', 'food', 'point_of_interest'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Celebrated eatery serving authentic Goan fish curry thalis, crab xec xec, and signature sol kadhi.',
    photos: [{ uri: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-goa-rest-2',
    providerId: 'demo-goa-rest-2',
    name: 'Thalassa Siolim',
    category: 'restaurant',
    latitude: 15.6178,
    longitude: 73.7431,
    address: 'Vaddi, Siolim, Goa 403517, India',
    rating: 4.8,
    userRatingsTotal: 3400,
    priceLevel: 3,
    cuisine: 'Greek Mediterranean & Seafood',
    types: ['restaurant', 'bar', 'food'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Iconic waterfront Greek tavern famous for scenic sunset vistas, souvlaki skewers, and live music.',
    photos: [{ uri: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=600&auto=format&fit=crop' }]
  },

  // ==========================================
  // PARIS, FRANCE
  // ==========================================
  {
    id: 'demo-paris-hotel-1',
    providerId: 'demo-paris-hotel-1',
    name: 'Hôtel Le Marais Panache',
    category: 'hotel',
    latitude: 48.8575,
    longitude: 2.3582,
    address: '38 Rue de Rivoli, 75004 Paris, France',
    rating: 4.8,
    userRatingsTotal: 840,
    priceLevel: 3,
    types: ['lodging', 'hotel'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Charming boutique hotel in the historic Marais district with Parisian balconies and artisan breakfast.',
    photos: [{ uri: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-paris-attr-1',
    providerId: 'demo-paris-attr-1',
    name: 'Eiffel Tower',
    category: 'landmark',
    latitude: 48.8584,
    longitude: 2.2945,
    address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
    rating: 4.7,
    userRatingsTotal: 310000,
    priceLevel: 2,
    types: ['tourist_attraction', 'landmark', 'point_of_interest'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Iconic 330m wrought-iron lattice tower offering panoramic views across Paris.',
    tag: 'Global Icon',
    photos: [{ uri: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-paris-attr-2',
    providerId: 'demo-paris-attr-2',
    name: 'Louvre Museum',
    category: 'museum',
    latitude: 48.8606,
    longitude: 2.3376,
    address: 'Rue de Rivoli, 75001 Paris, France',
    rating: 4.8,
    userRatingsTotal: 250000,
    priceLevel: 2,
    types: ['museum', 'tourist_attraction', 'point_of_interest'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'World’s largest art museum, home to the Mona Lisa, Venus de Milo, and iconic glass pyramid.',
    tag: 'Art & Heritage',
    photos: [{ uri: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=600&auto=format&fit=crop' }]
  },

  // ==========================================
  // KYOTO / TOKYO, JAPAN
  // ==========================================
  {
    id: 'demo-kyoto-hotel-1',
    providerId: 'demo-kyoto-hotel-1',
    name: 'Kyoto Machiya Sanctuary Ryokan',
    category: 'hotel',
    latitude: 35.0037,
    longitude: 135.7772,
    address: 'Gion District, Higashiyama Ward, Kyoto, Japan',
    rating: 4.9,
    userRatingsTotal: 520,
    priceLevel: 4,
    types: ['lodging', 'hotel'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Traditional wooden machiya townhouse featuring tatami suites, cypress onsen baths, and Zen garden views.',
    photos: [{ uri: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-kyoto-attr-1',
    providerId: 'demo-kyoto-attr-1',
    name: 'Fushimi Inari-taisha',
    category: 'temple',
    latitude: 34.9671,
    longitude: 135.7727,
    address: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto, Japan',
    rating: 4.8,
    userRatingsTotal: 65000,
    priceLevel: 0,
    types: ['tourist_attraction', 'shrine', 'point_of_interest'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Historic Shinto shrine renowned for thousands of vermilion torii gates winding up sacred Mount Inari.',
    tag: 'Top Shinto Shrine',
    photos: [{ uri: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-kyoto-attr-2',
    providerId: 'demo-kyoto-attr-2',
    name: 'Kinkaku-ji (Golden Pavilion)',
    category: 'temple',
    latitude: 35.0394,
    longitude: 135.7292,
    address: '1 Kinkakujicho, Kita Ward, Kyoto, Japan',
    rating: 4.7,
    userRatingsTotal: 48000,
    priceLevel: 1,
    types: ['tourist_attraction', 'temple', 'point_of_interest'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Stunning Zen Buddhist temple whose top two floors are completely covered in pure gold leaf reflecting over Mirror Pond.',
    tag: 'UNESCO World Heritage',
    photos: [{ uri: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=600&auto=format&fit=crop' }]
  },

  // ==========================================
  // BALI, INDONESIA
  // ==========================================
  {
    id: 'demo-bali-hotel-1',
    providerId: 'demo-bali-hotel-1',
    name: 'Ubud Hanging Rainforest Villas',
    category: 'hotel',
    latitude: -8.5069,
    longitude: 115.2625,
    address: 'Jl. Raya Sanggingan, Ubud, Bali, Indonesia',
    rating: 4.8,
    userRatingsTotal: 730,
    priceLevel: 3,
    types: ['lodging', 'resort', 'hotel'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Secluded rainforest resort perched above the Ayung River valley with private infinity plunge pools.',
    photos: [{ uri: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-bali-attr-1',
    providerId: 'demo-bali-attr-1',
    name: 'Tegallalang Rice Terraces',
    category: 'park',
    latitude: -8.4347,
    longitude: 115.2796,
    address: 'Jl. Raya Tegallalang, Gianyar, Bali, Indonesia',
    rating: 4.6,
    userRatingsTotal: 29000,
    priceLevel: 1,
    types: ['tourist_attraction', 'natural_feature', 'park'],
    source: 'demo',
    dataStatus: 'demo',
    description: 'Iconic stepped emerald-green rice terraces irrigated by traditional Balinese subak water systems.',
    tag: 'Scenic Landscape',
    photos: [{ uri: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?q=80&w=600&auto=format&fit=crop' }]
  },
  // ==========================================
  // TOKYO, JAPAN
  // ==========================================
  {
    id: 'demo-tokyo-hotel-1',
    source: 'demo',
    sourceId: 'demo-tokyo-hotel-1',
    providerId: 'demo-tokyo-hotel-1',
    name: 'Park Hyatt Tokyo',
    category: 'hotel',
    latitude: 35.6852,
    longitude: 139.6917,
    address: '3-7-1-2 Nishi-Shinjuku, Shinjuku City, Tokyo, Japan',
    rating: 4.7,
    userRatingsTotal: 2150,
    priceLevel: 4,
    types: ['lodging', 'hotel'],
    dataStatus: 'demo',
    description: 'Iconic luxury hotel in Shinjuku offering sweeping city vistas, New York Grill dining, and spa facilities.',
    photos: [{ uri: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-tokyo-attr-1',
    source: 'demo',
    sourceId: 'demo-tokyo-attr-1',
    providerId: 'demo-tokyo-attr-1',
    name: 'Senso-ji Temple',
    category: 'temple',
    latitude: 35.7148,
    longitude: 139.7967,
    address: '2-3-1 Asakusa, Taito City, Tokyo, Japan',
    rating: 4.6,
    userRatingsTotal: 68000,
    priceLevel: 0,
    types: ['tourist_attraction', 'temple', 'point_of_interest'],
    dataStatus: 'demo',
    description: 'Tokyo’s oldest and most significant ancient Buddhist temple, approached through the bustling Nakamise shopping street.',
    tag: 'Historic Landmark',
    photos: [{ uri: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-tokyo-attr-2',
    source: 'demo',
    sourceId: 'demo-tokyo-attr-2',
    providerId: 'demo-tokyo-attr-2',
    name: 'Shibuya Scramble Crossing',
    category: 'landmark',
    latitude: 35.6595,
    longitude: 139.7005,
    address: '1 Chome-2-1 Dogenzaka, Shibuya City, Tokyo, Japan',
    rating: 4.6,
    userRatingsTotal: 42000,
    priceLevel: 0,
    types: ['tourist_attraction', 'landmark', 'point_of_interest'],
    dataStatus: 'demo',
    description: 'The world-famous pedestrian scramble intersection, pulsing with neon billboards and iconic energy.',
    tag: 'Iconic Sights',
    photos: [{ uri: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=600&auto=format&fit=crop' }]
  },

  // ==========================================
  // ROME, ITALY
  // ==========================================
  {
    id: 'demo-rome-hotel-1',
    source: 'demo',
    sourceId: 'demo-rome-hotel-1',
    providerId: 'demo-rome-hotel-1',
    name: 'Hotel Artemide',
    category: 'hotel',
    latitude: 41.9009,
    longitude: 12.4939,
    address: 'Via Nazionale 22, 00184 Rome, Italy',
    rating: 4.8,
    userRatingsTotal: 3400,
    priceLevel: 3,
    types: ['lodging', 'hotel'],
    dataStatus: 'demo',
    description: 'Elegant 19th-century boutique hotel on Via Nazionale featuring a rooftop panoramic cocktail lounge and spa.',
    photos: [{ uri: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-rome-attr-1',
    source: 'demo',
    sourceId: 'demo-rome-attr-1',
    providerId: 'demo-rome-attr-1',
    name: 'Colosseum & Roman Forum',
    category: 'landmark',
    latitude: 41.8902,
    longitude: 12.4922,
    address: 'Piazza del Colosseo 1, 00184 Rome, Italy',
    rating: 4.8,
    userRatingsTotal: 350000,
    priceLevel: 2,
    types: ['tourist_attraction', 'historical_landmark', 'point_of_interest'],
    dataStatus: 'demo',
    description: 'Monumental 2,000-year-old Flavian amphitheatre and ancient Roman civic forum.',
    tag: 'World Wonder',
    photos: [{ uri: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop' }]
  },

  // ==========================================
  // LONDON, UK
  // ==========================================
  {
    id: 'demo-london-hotel-1',
    source: 'demo',
    sourceId: 'demo-london-hotel-1',
    providerId: 'demo-london-hotel-1',
    name: 'The Savoy London',
    category: 'hotel',
    latitude: 51.5101,
    longitude: -0.1206,
    address: 'Strand, London WC2R 0EZ, United Kingdom',
    rating: 4.7,
    userRatingsTotal: 4900,
    priceLevel: 4,
    types: ['lodging', 'hotel'],
    dataStatus: 'demo',
    description: 'Historic British landmark hotel on the River Thames, famed for afternoon tea and Edwardian glamour.',
    photos: [{ uri: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-london-attr-1',
    source: 'demo',
    sourceId: 'demo-london-attr-1',
    providerId: 'demo-london-attr-1',
    name: 'Tower Bridge & Tower of London',
    category: 'landmark',
    latitude: 51.5055,
    longitude: -0.0754,
    address: 'Tower Bridge Rd, London SE1 2UP, United Kingdom',
    rating: 4.7,
    userRatingsTotal: 145000,
    priceLevel: 2,
    types: ['tourist_attraction', 'landmark', 'point_of_interest'],
    dataStatus: 'demo',
    description: 'Iconic Victorian bascule and suspension bridge spanning the River Thames with high-level walkways.',
    tag: 'Top London Sight',
    photos: [{ uri: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=600&auto=format&fit=crop' }]
  },

  // ==========================================
  // SWISS ALPS / INTERLAKEN, SWITZERLAND
  // ==========================================
  {
    id: 'demo-swiss-hotel-1',
    source: 'demo',
    sourceId: 'demo-swiss-hotel-1',
    providerId: 'demo-swiss-hotel-1',
    name: 'Victoria-Jungfrau Grand Hotel & Spa',
    category: 'hotel',
    latitude: 46.6863,
    longitude: 7.8596,
    address: 'Höheweg 41, 3800 Interlaken, Switzerland',
    rating: 4.8,
    userRatingsTotal: 1850,
    priceLevel: 4,
    types: ['lodging', 'resort', 'hotel'],
    dataStatus: 'demo',
    description: 'Grand historic palace hotel framed by snowcapped Jungfrau peaks and Lake Thun.',
    photos: [{ uri: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=600&auto=format&fit=crop' }]
  },
  {
    id: 'demo-swiss-attr-1',
    source: 'demo',
    sourceId: 'demo-swiss-attr-1',
    providerId: 'demo-swiss-attr-1',
    name: 'Jungfraujoch - Top of Europe',
    category: 'landmark',
    latitude: 46.5475,
    longitude: 7.9822,
    address: '3823 Lauterbrunnen, Bernese Alps, Switzerland',
    rating: 4.8,
    userRatingsTotal: 22000,
    priceLevel: 3,
    types: ['tourist_attraction', 'natural_feature', 'point_of_interest'],
    dataStatus: 'demo',
    description: 'Europe’s highest-altitude cogwheel railway saddle (3,454m) overlooking the Great Aletsch Glacier.',
    tag: 'Alpine Wonder',
    photos: [{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop' }]
  }
];

export class DemoPlacesService {
  /**
   * Search demo catalog by destination and optional category / query.
   * NEVER invents fabricated places when a destination is missing from the catalog.
   */
  public searchPlaces(
    destinationOrParams: string | { destination: string; category?: PlaceCategory; query?: string; limit?: number },
    category?: PlaceCategory,
    query?: string,
    limit: number = 20
  ): TraveliaPlace[] {
    const destination = typeof destinationOrParams === 'string' 
      ? destinationOrParams 
      : destinationOrParams?.destination || '';
    const resolvedCategory = typeof destinationOrParams === 'object' && destinationOrParams.category
      ? destinationOrParams.category
      : category;
    const resolvedQuery = typeof destinationOrParams === 'object' && destinationOrParams.query
      ? destinationOrParams.query
      : query;
    const resolvedLimit = typeof destinationOrParams === 'object' && destinationOrParams.limit
      ? destinationOrParams.limit
      : limit;

    const destLower = (destination || '').toLowerCase().trim();
    const destCity = destLower.split(',')[0].trim();
    const catLower = (resolvedCategory || '').toLowerCase().trim();
    const qLower = (resolvedQuery || '').toLowerCase().trim();

    // Clean query to remove generic boilerplate search prompts
    let specificQuery = qLower;
    const genericPhrases = [
      'top tourist attractions in',
      'tourist attractions in',
      'attractions in',
      'things to do in',
      'places to visit in',
      'places in',
      'hotels in',
      'hotel in',
      'stays in',
      'sights in'
    ];
    for (const phrase of genericPhrases) {
      if (specificQuery.includes(phrase)) {
        specificQuery = specificQuery.replace(phrase, '').trim();
      }
    }
    // Also remove destination city name if left alone
    if (destCity && (specificQuery === destCity || specificQuery === destLower)) {
      specificQuery = '';
    }

    const matches = DEMO_CATALOG.filter(place => {
      const nameMatch = place.name.toLowerCase().includes(destLower) || (destCity && place.name.toLowerCase().includes(destCity));
      const addrMatch = (place.address || '').toLowerCase().includes(destLower) || (destCity && (place.address || '').toLowerCase().includes(destCity));
      const descMatch = (place.description || '').toLowerCase().includes(destLower) || (destCity && (place.description || '').toLowerCase().includes(destCity));
      const idMatch = place.id.toLowerCase().includes(destLower) || (destCity && place.id.toLowerCase().includes(destCity));
      
      const inDest = destLower === '' || nameMatch || addrMatch || descMatch || idMatch;
      if (!inDest) return false;

      if (catLower && catLower !== 'all') {
        const catMatches = 
          place.category === catLower ||
          place.types?.includes(catLower) ||
          (catLower === 'tourist_attraction' && place.category !== 'hotel');
        if (!catMatches) {
          return false;
        }
      }

      if (specificQuery) {
        const tokens = specificQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        const matchesPhrase = 
          place.name.toLowerCase().includes(specificQuery) ||
          (place.address || '').toLowerCase().includes(specificQuery) ||
          (place.description || '').toLowerCase().includes(specificQuery) ||
          place.types?.some(t => t.toLowerCase().includes(specificQuery));
        
        const matchesToken = tokens.some(tok => 
          place.name.toLowerCase().includes(tok) ||
          (place.address || '').toLowerCase().includes(tok) ||
          (place.description || '').toLowerCase().includes(tok) ||
          (place.tag || '').toLowerCase().includes(tok) ||
          place.types?.some(t => t.toLowerCase().includes(tok))
        );

        if (!matchesPhrase && !matchesToken) return false;
      }

      return true;
    });

    if (matches.length === 0 && destLower) {
      // Fallback to any places matching destination and category
      const fallbackMatches = DEMO_CATALOG.filter(place => {
        const inDest = (place.address || '').toLowerCase().includes(destLower) ||
                       place.name.toLowerCase().includes(destLower) ||
                       (place.description || '').toLowerCase().includes(destLower) ||
                       place.id.toLowerCase().includes(destLower);
        if (!inDest) return false;
        if (catLower && catLower !== 'all' && place.category !== catLower && !place.types?.includes(catLower)) return false;
        return true;
      });
      return fallbackMatches.slice(0, resolvedLimit);
    }

    return matches.slice(0, resolvedLimit);
  }

  public getHotels(destination: string, limit: number = 10): TraveliaPlace[] {
    return this.searchPlaces(destination, 'hotel', undefined, limit);
  }

  public getAttractions(destination: string, limit: number = 15): TraveliaPlace[] {
    const places = this.searchPlaces(destination, undefined, undefined, limit);
    return places.filter(p => p.category !== 'hotel');
  }

  public getPlaceById(id: string): TraveliaPlace | null {
    const found = DEMO_CATALOG.find(p => p.id === id || p.providerId === id);
    return found || null;
  }
}

export const demoPlacesService = new DemoPlacesService();
