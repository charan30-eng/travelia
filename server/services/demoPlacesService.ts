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
  }
];

export class DemoPlacesService {
  /**
   * Search demo catalog by destination and optional category / query
   */
  public searchPlaces(destination: string, category?: PlaceCategory, query?: string, limit: number = 20): TraveliaPlace[] {
    const destLower = (destination || '').toLowerCase().trim();
    const destCity = destLower.split(',')[0].trim();
    const catLower = (category || '').toLowerCase().trim();
    const qLower = (query || '').toLowerCase().trim();

    let matches = DEMO_CATALOG.filter(place => {
      const nameMatch = place.name.toLowerCase().includes(destLower) || (destCity && place.name.toLowerCase().includes(destCity));
      const addrMatch = (place.address || '').toLowerCase().includes(destLower) || (destCity && (place.address || '').toLowerCase().includes(destCity));
      const descMatch = (place.description || '').toLowerCase().includes(destLower) || (destCity && (place.description || '').toLowerCase().includes(destCity));
      const idMatch = place.id.toLowerCase().includes(destLower) || (destCity && place.id.toLowerCase().includes(destCity));
      
      const inDest = destLower === '' || nameMatch || addrMatch || descMatch || idMatch;
      if (!inDest) return false;

      if (catLower && catLower !== 'all') {
        if (place.category !== catLower && !place.types?.includes(catLower)) {
          return false;
        }
      }

      if (qLower) {
        const matchesQ = 
          place.name.toLowerCase().includes(qLower) ||
          (place.address || '').toLowerCase().includes(qLower) ||
          (place.description || '').toLowerCase().includes(qLower) ||
          place.types?.some(t => t.toLowerCase().includes(qLower));
        if (!matchesQ) return false;
      }

      return true;
    });

    // If no exact destination match found in catalog, construct fallback demo places
    // based on verified destination centroid if available
    if (matches.length === 0 && destLower) {
      const centroid = VERIFIED_DESTINATION_CENTROIDS[destLower] || { latitude: 20.5937, longitude: 78.9629 };
      matches = [
        {
          id: `demo-${destLower}-hotel-1`,
          providerId: `demo-${destLower}-hotel-1`,
          name: `${destination} Grand Heritage Stay`,
          category: 'hotel',
          latitude: centroid.latitude,
          longitude: centroid.longitude,
          address: `Central District, ${destination}`,
          rating: 4.7,
          userRatingsTotal: 340,
          priceLevel: 2,
          types: ['lodging', 'hotel'],
          source: 'demo',
          dataStatus: 'demo',
          description: `Authentic verified demo stay with central access in ${destination}.`,
          tag: 'Curated Demo Stay',
          photos: [{ uri: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop' }]
        },
        {
          id: `demo-${destLower}-attr-1`,
          providerId: `demo-${destLower}-attr-1`,
          name: `${destination} Cultural Landmark`,
          category: 'tourist_attraction',
          latitude: centroid.latitude,
          longitude: centroid.longitude,
          address: `Historic Quarter, ${destination}`,
          rating: 4.8,
          userRatingsTotal: 1200,
          priceLevel: 1,
          types: ['tourist_attraction', 'point_of_interest'],
          source: 'demo',
          dataStatus: 'demo',
          description: `Premier sightseeing highlight showcasing the culture and heritage of ${destination}.`,
          tag: 'Demo Highlight',
          photos: [{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop' }]
        }
      ];
    }

    return matches.slice(0, limit);
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
