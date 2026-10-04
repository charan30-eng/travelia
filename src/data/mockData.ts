import { TripPlan, DestinationCardData, Currency, CurrencyRate, UserPreferences } from '../types';
import { getFlightDataForDestination } from './flightData';
import { detectCountryFromDestination } from './currencyHelper';
import { calculateTravelDateRange, calculateTripDayDate, getTodayISO } from '../utils/dateUtils';
import { resolveCanonicalLocation, resolveAirport } from '../services/canonicalLocationService';

export const CURRENCY_RATES: Record<Currency, CurrencyRate> = {
  INR: { symbol: '₹', rateFromINR: 1 },
  USD: { symbol: '$', rateFromINR: 0.012 },
  EUR: { symbol: '€', rateFromINR: 0.011 },
  GBP: { symbol: '£', rateFromINR: 0.0094 },
};

export function applyLiveRatesToGlobalCurrencies(rates: Record<string, number>) {
  if (rates.USD && rates.USD > 0) CURRENCY_RATES.USD.rateFromINR = rates.USD;
  if (rates.EUR && rates.EUR > 0) CURRENCY_RATES.EUR.rateFromINR = rates.EUR;
  if (rates.GBP && rates.GBP > 0) CURRENCY_RATES.GBP.rateFromINR = rates.GBP;
}


export const formatCurrency = (amountInINR: number | null | undefined, currency: Currency = 'INR'): string => {
  if (amountInINR == null || isNaN(amountInINR)) {
    return 'Price unavailable';
  }
  const rate = CURRENCY_RATES[currency] || CURRENCY_RATES.INR;
  const converted = Math.round(amountInINR * rate.rateFromINR);
  if (currency === 'INR') {
    return `₹${converted.toLocaleString('en-IN')}`;
  }
  return `${rate.symbol}${converted.toLocaleString('en-US')}`;
};

export const DEFAULT_GOA_TRIP: TripPlan = {
  id: 'trip-goa-01',
  destination: 'Goa, India',
  origin: 'Mumbai, India',
  country: 'India',
  originLocation: resolveCanonicalLocation('mumbai') || undefined,
  destinationLocation: resolveCanonicalLocation('goa') || undefined,
  originAirport: resolveAirport('mumbai') || undefined,
  destinationAirport: resolveAirport('goa') || undefined,
  tagline: 'Sun-kissed beaches, Portuguese heritage, vibrant coastal shacks & lush spice plantations',
  heroImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1200&auto=format&fit=crop',
  days: 5,
  nights: 4,
  travelers: 2,
  startDate: '2026-10-05',
  endDate: '2026-10-09',
  travelDates: 'Oct 05 – Oct 09, 2026',
  preferences: ['Relaxation', 'Food & Culture', 'Couple'],
  hotelCategory: 'mid',
  transportType: 'cab',
  foodPreference: 'casual',
  activityLevel: 'moderate',
  status: 'planning',
  createdAt: '2026-08-16',
  budget: {
    hotel: 18000,
    flights: 15940,
    food: 7500,
    transportation: 5000,
    activities: 6000,
    miscellaneous: 2000,
    total: 54440,
  },
  aiNotes: [
    'Optimal itinerary designed to balance tranquil South Goa heritage with scenic North Goa sunset viewpoints.',
    'Saved ₹4,500 by grouping nearby coastal attractions on Day 2 & Day 4.',
    'Book hotel in advance for prime ocean-view balcony suites during sunset hours.',
  ],
  itinerary: [
    {
      dayNumber: 1,
      date: '2026-10-05',
      formattedDate: 'Mon, Oct 5',
      title: 'Arrival & Beach Exploration',
      theme: 'Unwind by the Arabian Sea & Sunset Welcome',
      activities: [
        {
          id: 'act-1-1',
          time: '11:00 AM',
          activity: 'Airport Pickup & Check-in at Ocean Pearl Resort',
          location: 'Candolim / Calangute Coast',
          estimatedCost: 1200,
          duration: '1.5 hrs',
          aiRecommendation: 'Request high-floor ocean-view room for scenic breeze.',
          category: 'hotel',
          imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-1-2',
          time: '01:30 PM',
          activity: 'Seafood Lunch at Coastal Kitchen Shack',
          location: 'Candolim Beach',
          estimatedCost: 1400,
          duration: '1.5 hrs',
          aiRecommendation: 'Try the butter garlic crab & Goan prawn curry.',
          category: 'food',
          imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-1-3',
          time: '04:30 PM',
          activity: 'Leisure Stroll & Watersports at Baga Beach',
          location: 'Baga Coastline',
          estimatedCost: 1500,
          duration: '2.5 hrs',
          aiRecommendation: 'Catch the golden hour; avoid jet-ski touts by booking at official counters.',
          category: 'relaxation',
          imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-1-4',
          time: '08:00 PM',
          activity: 'Dinner & Live Music by the Shore',
          location: 'Tito\'s Lane / Baga',
          estimatedCost: 1800,
          duration: '2 hrs',
          aiRecommendation: 'Acoustic jazz set starts at 8:30 PM.',
          category: 'food',
          imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop'
        }
      ]
    },
    {
      dayNumber: 2,
      date: '2026-10-06',
      formattedDate: 'Tue, Oct 6',
      title: 'North Goa Discovery',
      theme: '17th-Century Portuguese Forts & Coastal Panoramas',
      activities: [
        {
          id: 'act-2-1',
          time: '09:00 AM',
          activity: 'Explore Historic Fort Aguada & Light House',
          location: 'Sinquerim Beach Cliff',
          estimatedCost: 300,
          duration: '2 hrs',
          aiRecommendation: 'Morning visit avoids mid-day heat; great vantage point over the Mandovi River.',
          category: 'sightseeing',
          imageUrl: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-2-2',
          time: '12:00 PM',
          activity: 'Artisan Cafe Brunch at Green Leaf Café',
          location: 'Assagao Village',
          estimatedCost: 950,
          duration: '1.5 hrs',
          aiRecommendation: 'Organic cold brews and fresh sourdough tartines under banyan trees.',
          category: 'food',
          imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-2-3',
          time: '02:30 PM',
          activity: 'Visit Chapora Fort (Dil Chahta Hai Point)',
          location: 'Vagator Hills',
          estimatedCost: 100,
          duration: '1.5 hrs',
          aiRecommendation: 'Wear comfortable sneakers for the 10-minute incline trek.',
          category: 'adventure',
          imageUrl: 'https://images.unsplash.com/photo-1570789210967-2cac24afeb00?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-2-4',
          time: '05:30 PM',
          activity: 'Sunset Cocktails at Thalassa Cliffside',
          location: 'Siolim / Vagator',
          estimatedCost: 2200,
          duration: '2.5 hrs',
          aiRecommendation: 'Advance reservation recommended for panoramic clifftop table.',
          category: 'relaxation',
          imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=600&auto=format&fit=crop'
        }
      ]
    },
    {
      dayNumber: 3,
      date: '2026-10-07',
      formattedDate: 'Wed, Oct 7',
      title: 'Culture & Local Food',
      theme: 'Old Goa UNESCO Cathedrals & Spice Plantation Walk',
      activities: [
        {
          id: 'act-3-1',
          time: '09:30 AM',
          activity: 'Tour Basilica of Bom Jesus & Se Cathedral',
          location: 'Old Goa Heritage Quarter',
          estimatedCost: 200,
          duration: '2.5 hrs',
          aiRecommendation: 'Modest dress code required; explore the 400-year-old Baroque architecture.',
          category: 'sightseeing',
          imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-3-2',
          time: '01:00 PM',
          activity: 'Traditional Goan Thali at Spice Route',
          location: 'Fontainhas, Panaji',
          estimatedCost: 1100,
          duration: '1.5 hrs',
          aiRecommendation: 'Famous for Kingfish rawa fry & traditional Sol Kadhi.',
          category: 'food',
          imageUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-3-3',
          time: '03:00 PM',
          activity: 'Fontainhas Latin Quarter Walking & Photography',
          location: 'Panjim Latin Quarter',
          estimatedCost: 0,
          duration: '2 hrs',
          aiRecommendation: 'Vibrant yellow and blue colonial villas with Portuguese azulejos tiles.',
          category: 'sightseeing',
          imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-3-4',
          time: '06:30 PM',
          activity: 'Mandovi River Sunset Cruise',
          location: 'Panaji Jetty',
          estimatedCost: 900,
          duration: '1.5 hrs',
          aiRecommendation: 'Includes folk dance performances & panoramic evening city views.',
          category: 'relaxation',
          imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop'
        }
      ]
    },
    {
      dayNumber: 4,
      date: '2026-10-08',
      formattedDate: 'Thu, Oct 8',
      title: 'Adventure & Sunset',
      theme: 'Dudhsagar Waterfalls Safari & Jungle Canopy',
      activities: [
        {
          id: 'act-4-1',
          time: '07:30 AM',
          activity: '4x4 Jungle Jeep Safari to Dudhsagar Falls',
          location: 'Bhagwan Mahavir Wildlife Sanctuary',
          estimatedCost: 2800,
          duration: '4.5 hrs',
          aiRecommendation: 'Carry swimwear & waterproof phone pouch; refreshing dip in the natural pool.',
          category: 'adventure',
          imageUrl: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-4-2',
          time: '01:30 PM',
          activity: 'Spice Plantation Buffet Lunch with Local Spirits',
          location: 'Ponda Spice Village',
          estimatedCost: 800,
          duration: '1.5 hrs',
          aiRecommendation: 'Sample freshly distilled cashew Feni and organic cardamom tea.',
          category: 'food',
          imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-4-3',
          time: '05:00 PM',
          activity: 'Anjuna Flea Market & Sunset Drum Circle',
          location: 'Anjuna Beach',
          estimatedCost: 500,
          duration: '2.5 hrs',
          aiRecommendation: 'Great handmade souvenirs, macrame jewelry, and bohemian music.',
          category: 'relaxation',
          imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop'
        }
      ]
    },
    {
      dayNumber: 5,
      date: '2026-10-09',
      formattedDate: 'Fri, Oct 9',
      title: 'Relaxation & Departure',
      theme: 'Morning Yoga, Souvenir Shopping & Departure',
      activities: [
        {
          id: 'act-5-1',
          time: '08:00 AM',
          activity: 'Sunrise Beach Yoga & Coconut Water',
          location: 'Morjim Beach',
          estimatedCost: 400,
          duration: '1.5 hrs',
          aiRecommendation: 'Spot Olive Ridley turtles and quiet dolphin pods off the coast.',
          category: 'relaxation',
          imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-5-2',
          time: '11:00 AM',
          activity: 'Hotel Checkout & Goan Cashew Shopping',
          location: 'Mapusa Market',
          estimatedCost: 1200,
          duration: '2 hrs',
          aiRecommendation: 'Buy GI-tagged Goan whole cashews & traditional Bebinca cake.',
          category: 'sightseeing',
          imageUrl: 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?q=80&w=600&auto=format&fit=crop'
        },
        {
          id: 'act-5-3',
          time: '02:30 PM',
          activity: 'Airport Transfer & Departure',
          location: 'Dabolim / Mopa International Airport',
          estimatedCost: 1200,
          duration: '1.5 hrs',
          aiRecommendation: 'Allow 2 hours for security during peak evening flight departures.',
          category: 'transit',
          imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=600&auto=format&fit=crop'
        }
      ]
    }
  ],
  hotels: [
    {
      id: 'hotel-01',
      name: 'Ocean Pearl Resort',
      location: 'Candolim Coast, North Goa',
      rating: 4.8,
      reviewsCount: 428,
      pricePerNight: 4500,
      totalStayPrice: 18000,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop',
      amenities: ['Infinity Pool', 'Beach Access', 'Free Breakfast', 'Ayurvedic Spa', 'High-Speed Wi-Fi'],
      description: 'Luxury seaside boutique retreat offering breathtaking Arabian Sea sunsets, private cabanas, and world-class Goan hospitality.',
      tag: 'Best Overall Stay',
      selected: true,
      source: 'demo' as const,
      dataStatus: 'demo' as const,
      coordinates: { latitude: 15.518, longitude: 73.763 },
      retrievedAt: '2026-10-04T10:00:00.000Z'
    },
    {
      id: 'hotel-02',
      name: 'Palm Grove Hotel',
      location: 'Calangute Main Road, North Goa',
      rating: 4.6,
      reviewsCount: 312,
      pricePerNight: 3800,
      totalStayPrice: 15200,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop',
      amenities: ['Tropical Garden Pool', 'Multi-Cuisine Diner', 'Cocktail Bar', 'Airport Shuttle'],
      description: 'Cozy boutique stay surrounded by swaying coconut palms, just 5 minutes walk from lively markets and beach shacks.',
      tag: 'Best Value',
      selected: false,
      source: 'demo' as const,
      dataStatus: 'demo' as const,
      coordinates: { latitude: 15.543, longitude: 73.755 },
      retrievedAt: '2026-10-04T10:00:00.000Z'
    },
    {
      id: 'hotel-03',
      name: 'Coastal Haven Villa & Suites',
      location: 'Vagator Clifftop, North Goa',
      rating: 4.7,
      reviewsCount: 194,
      pricePerNight: 5200,
      totalStayPrice: 20800,
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=600&auto=format&fit=crop',
      amenities: ['Private Plunge Pool', 'Cliff View Balcony', 'Chef on Demand', 'Yoga Deck'],
      description: 'Exclusive clifftop sanctuary blending bohemian Portuguese architecture with ultra-modern luxury amenities and sunset vistas.',
      tag: 'Luxury Pick',
      selected: false,
      source: 'demo' as const,
      dataStatus: 'demo' as const,
      coordinates: { latitude: 15.598, longitude: 73.738 },
      retrievedAt: '2026-10-04T10:00:00.000Z'
    }
  ],
  touristPlaces: [
    {
      id: 'place-01',
      name: 'Baga Beach',
      location: 'North Goa',
      rating: 4.8,
      estimatedDuration: '3–4 Hours',
      entryCost: 0,
      image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=600&auto=format&fit=crop',
      aiTag: 'Must Visit • Top Rated',
      category: 'Beach & Watersports',
      description: 'Goa’s most iconic beach, known for thrilling watersports, lively beach shacks, golden sands, and vibrant nightlife.',
      bestTimeToVisit: '4:00 PM – Sunset',
      added: true,
      source: 'demo' as const,
      dataStatus: 'demo' as const,
      coordinates: { latitude: 15.555, longitude: 73.751 },
      retrievedAt: '2026-10-04T10:00:00.000Z'
    },
    {
      id: 'place-02',
      name: 'Fort Aguada & Lighthouse',
      location: 'Sinquerim',
      rating: 4.7,
      estimatedDuration: '2 Hours',
      entryCost: 50,
      image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=600&auto=format&fit=crop',
      aiTag: 'Historic Landmark',
      category: 'Heritage',
      description: 'A well-preserved 17th-century Portuguese fortress standing proudly on the Sinquerim hill with panoramic ocean views.',
      bestTimeToVisit: '9:00 AM – 11:00 AM',
      added: true,
      source: 'demo' as const,
      dataStatus: 'demo' as const,
      coordinates: { latitude: 15.492, longitude: 73.773 },
      retrievedAt: '2026-10-04T10:00:00.000Z'
    },
    {
      id: 'place-03',
      name: 'Dudhsagar Falls',
      location: 'Sonaulim / Western Ghats',
      rating: 4.9,
      estimatedDuration: 'Full Day Excursion',
      entryCost: 500,
      image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=600&auto=format&fit=crop',
      aiTag: 'Natural Wonder',
      category: 'Nature & Trekking',
      description: 'A four-tiered waterfall cascading like a "Sea of Milk" through the lush Western Ghats forest canopy.',
      bestTimeToVisit: 'October – February',
      added: true,
      source: 'demo' as const,
      dataStatus: 'demo' as const,
      coordinates: { latitude: 15.314, longitude: 74.314 },
      retrievedAt: '2026-10-04T10:00:00.000Z'
    },
    {
      id: 'place-04',
      name: 'Basilica of Bom Jesus',
      location: 'Old Goa',
      rating: 4.8,
      estimatedDuration: '1.5 Hours',
      entryCost: 0,
      image: 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=600&auto=format&fit=crop',
      aiTag: 'UNESCO World Heritage',
      category: 'Culture & Architecture',
      description: 'Baroque masterpiece housing the mortal remains of St. Francis Xavier, featuring ornate gilded altars and marble mosaic floors.',
      bestTimeToVisit: '9:00 AM – 1:00 PM',
      added: true,
      source: 'demo' as const,
      dataStatus: 'demo' as const,
      coordinates: { latitude: 15.500, longitude: 73.911 },
      retrievedAt: '2026-10-04T10:00:00.000Z'
    },
    {
      id: 'place-05',
      name: 'Anjuna Flea Market',
      location: 'Anjuna Beach',
      rating: 4.5,
      estimatedDuration: '2 Hours',
      entryCost: 0,
      image: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=600&auto=format&fit=crop',
      aiTag: 'Boho Shopping',
      category: 'Markets',
      description: 'Eclectic open-air bazaar bustling with handmade jewelry, spices, handicrafts, boho clothing, and live acoustics.',
      bestTimeToVisit: 'Wednesday Afternoons',
      added: false,
      source: 'demo' as const,
      dataStatus: 'demo' as const,
      coordinates: { latitude: 15.580, longitude: 73.742 },
      retrievedAt: '2026-10-04T10:00:00.000Z'
    }
  ],
  restaurants: [
    {
      id: 'rest-01',
      name: 'Spice Route',
      cuisine: 'Traditional Goan & Coastal Seafood',
      rating: 4.7,
      averagePrice: 1200,
      priceLevel: '₹₹',
      distance: '1.2 km from stay',
      image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?q=80&w=600&auto=format&fit=crop',
      aiRecommendedBadge: 'AI Pick for Authentic Thalis',
      specialty: 'Goan Fish Thali & Crab Xec Xec',
      added: true
    },
    {
      id: 'rest-02',
      name: 'Coastal Kitchen',
      cuisine: 'Seafood • Mediterranean Grill',
      rating: 4.8,
      averagePrice: 1800,
      priceLevel: '₹₹₹',
      distance: '0.8 km from stay',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop',
      aiRecommendedBadge: 'Top Sunset Ocean View',
      specialty: 'Butter Garlic Lobster & Grilled Red Snapper',
      added: true
    },
    {
      id: 'rest-03',
      name: 'Green Leaf Café',
      cuisine: 'Organic Vegetarian • Healthy Bowls',
      rating: 4.6,
      averagePrice: 650,
      priceLevel: '₹',
      distance: '2.5 km from stay',
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop',
      aiRecommendedBadge: 'Best Vegan & Breakfast',
      specialty: 'Acai Bowls & Sourdough Avocado Tartines',
      added: true
    },
    {
      id: 'rest-04',
      name: 'Fisherman’s Wharf',
      cuisine: 'Goan Coastal & Pan-Asian',
      rating: 4.7,
      averagePrice: 1500,
      priceLevel: '₹₹',
      distance: '4.1 km from stay',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
      aiRecommendedBadge: 'Riverside Fine Dining',
      specialty: 'Tiger Prawns Balchão & Bebinca Souffle',
      added: false
    }
  ]
};

export const FEATURED_DESTINATIONS: DestinationCardData[] = [
  {
    id: 'dest-goa',
    name: 'Goa',
    country: 'India',
    category: 'Beaches',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    reviews: 1420,
    pricePerDay: 7700,
    description: 'Golden shores, Portuguese colonial villas, serene palm groves & electric nightlife.',
    highlights: ['Baga & Palolem Beach', 'Fort Aguada', 'Dudhsagar Falls'],
    bestSeason: 'Nov – Feb',
    duration: '5–7 Days'
  },
  {
    id: 'dest-kyoto',
    name: 'Kyoto',
    country: 'Japan',
    category: 'Historical',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
    rating: 4.95,
    reviews: 2890,
    pricePerDay: 14500,
    description: 'Centuries of Zen temples, bamboo forests, geisha districts and exquisite tea rituals.',
    highlights: ['Fushimi Inari Shrine', 'Arashiyama Bamboo Grove', 'Kinkaku-ji'],
    bestSeason: 'Mar – May / Oct – Nov',
    duration: '5–6 Days'
  },
  {
    id: 'dest-amalfi',
    name: 'Amalfi Coast',
    country: 'Italy',
    category: 'Romantic',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=800&auto=format&fit=crop',
    rating: 4.88,
    reviews: 1980,
    pricePerDay: 19800,
    description: 'Dramatic pastel villages perched over turquoise cliffs, lemon orchards & Mediterranean yachts.',
    highlights: ['Positano Village', 'Capri Boat Tour', 'Ravello Gardens'],
    bestSeason: 'May – Sep',
    duration: '4–6 Days'
  },
  {
    id: 'dest-swiss',
    name: 'Swiss Alps (Interlaken)',
    country: 'Switzerland',
    category: 'Mountains',
    image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=800&auto=format&fit=crop',
    rating: 4.92,
    reviews: 3100,
    pricePerDay: 22000,
    description: 'Snow-capped peaks, crystal alpine lakes, scenic cogwheel trains & mountain chalets.',
    highlights: ['Jungfraujoch Peak', 'Lake Brienz Cruise', 'Lauterbrunnen Valley'],
    bestSeason: 'Jun – Aug / Dec – Mar',
    duration: '6–8 Days'
  },
  {
    id: 'dest-bali',
    name: 'Bali',
    country: 'Indonesia',
    category: 'Nature',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop',
    rating: 4.85,
    reviews: 4200,
    pricePerDay: 6800,
    description: 'Tropical volcanic jungles, tiered rice terraces, sacred water temples & surf sanctuaries.',
    highlights: ['Ubud Rice Terraces', 'Tanah Lot Temple', 'Nusa Penida'],
    bestSeason: 'Apr – Oct',
    duration: '6–9 Days'
  },
  {
    id: 'dest-kerala',
    name: 'Kerala Backwaters',
    country: 'India',
    category: 'Relaxation' as any,
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=800&auto=format&fit=crop',
    rating: 4.89,
    reviews: 1840,
    pricePerDay: 7400,
    description: 'Lush emerald backwaters, houseboat cruises, misty tea gardens of Munnar & Ayurvedic retreats.',
    highlights: ['Alleppey Houseboats', 'Munnar Tea Estates', 'Varkala Cliff'],
    bestSeason: 'Sep – Mar',
    duration: '6–8 Days'
  },
  {
    id: 'dest-rajasthan',
    name: 'Rajasthan Explorer',
    country: 'India',
    category: 'Historical',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=800&auto=format&fit=crop',
    rating: 4.87,
    reviews: 1670,
    pricePerDay: 8200,
    description: 'Royal palaces of Jaipur, golden desert dunes of Jaisalmer, and lake mansions of Udaipur.',
    highlights: ['Amber Fort', 'Lake Pichola Palace', 'Thar Desert Safari'],
    bestSeason: 'Oct – Mar',
    duration: '6–8 Days'
  },
  {
    id: 'dest-paris',
    name: 'Paris',
    country: 'France',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop',
    rating: 4.82,
    reviews: 5120,
    pricePerDay: 18500,
    description: 'Haute gastronomy, iconic boulevards, world-class art museums & Seine river lights.',
    highlights: ['Eiffel Tower', 'Louvre Museum', 'Montmartre Cafes'],
    bestSeason: 'Apr – Jun / Sep – Nov',
    duration: '4–6 Days'
  }
];

export const INITIAL_SAVED_TRIPS: TripPlan[] = [
  DEFAULT_GOA_TRIP,
  {
    id: 'trip-kerala-02',
    destination: 'Kerala, India',
    origin: 'Bengaluru, India',
    country: 'India',
    originLocation: resolveCanonicalLocation('bengaluru') || undefined,
    destinationLocation: resolveCanonicalLocation('kochi') || undefined,
    originAirport: resolveAirport('BLR') || undefined,
    destinationAirport: resolveAirport('COK') || undefined,
    tagline: 'God’s Own Country: Houseboats, Spice Hills & Ayurvedic Sanctuaries',
    heroImage: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=800&auto=format&fit=crop',
    days: 7,
    nights: 6,
    travelers: 2,
    startDate: '2026-12-05',
    endDate: '2026-12-11',
    travelDates: 'Dec 05 - Dec 11, 2026',
    preferences: ['Relaxation', 'Family', 'Food & Culture'],
    hotelCategory: 'luxury',
    transportType: 'private',
    foodPreference: 'casual',
    activityLevel: 'relaxed',
    status: 'saved',
    createdAt: '2026-08-10',
    budget: {
      hotel: 24000,
      flights: 16800,
      food: 11000,
      transportation: 8000,
      activities: 7000,
      miscellaneous: 2000,
      total: 68800,
    },
    aiNotes: ['Includes premium private air-conditioned houseboat cruise in Alleppey.'],
    itinerary: [],
    hotels: [
      {
        id: 'kerala-h1',
        name: 'Kumarakom Lake Luxury Resort',
        location: 'Kottayam, Kerala',
        rating: 4.9,
        reviewsCount: 380,
        pricePerNight: 6000,
        totalStayPrice: 24000,
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop',
        amenities: ['Heritage Villas', 'Ayurveda Spa', 'Infinity Pool'],
        description: 'Authentic 16th-century traditional Kerala wooden cottages on the Vembanad Lake.',
        tag: 'Heritage Luxury',
        selected: true
      }
    ],
    touristPlaces: [],
    restaurants: []
  },
  {
    id: 'trip-rajasthan-03',
    destination: 'Rajasthan, India',
    origin: 'Delhi, India',
    country: 'India',
    originLocation: resolveCanonicalLocation('delhi') || undefined,
    destinationLocation: resolveCanonicalLocation('jaipur') || undefined,
    originAirport: resolveAirport('DEL') || undefined,
    destinationAirport: resolveAirport('JAI') || undefined,
    tagline: 'Land of Maharajas: Majestic Forts, Golden Sands & Regal Palaces',
    heroImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=800&auto=format&fit=crop',
    days: 6,
    nights: 5,
    travelers: 2,
    startDate: '2027-01-15',
    endDate: '2027-01-20',
    travelDates: 'Jan 15 - Jan 20, 2027',
    preferences: ['Historical', 'Luxury' as any, 'Food & Culture'],
    hotelCategory: 'luxury',
    transportType: 'cab',
    foodPreference: 'finedining',
    activityLevel: 'moderate',
    status: 'saved',
    createdAt: '2026-08-01',
    budget: {
      hotel: 22000,
      flights: 14400,
      food: 9500,
      transportation: 6500,
      activities: 5500,
      miscellaneous: 2000,
      total: 59900,
    },
    aiNotes: ['Includes private camel safari sunset in Sam Sand Dunes.'],
    itinerary: [],
    hotels: [],
    touristPlaces: [],
    restaurants: []
  }
];


// Helper to generate dynamic trip plans based on user input
export const generateTripFromPrompt = (
  destination: string,
  days: number = 5,
  travelers: number = 2,
  preferences: string[] = ['Relaxation', 'Food & Culture'],
  customDates?: string,
  startDateInput?: string,
  userPreferences?: UserPreferences,
  originInput?: string
): TripPlan => {
  const destLower = destination.toLowerCase();

  
  let heroImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop';
  let tagline = `AI-optimized personalized itinerary exploring the finest culture, stays, and hidden gems of ${destination}.`;
  
  if (destLower.includes('kyoto') || destLower.includes('japan')) {
    heroImage = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop';
    tagline = 'Ancient shrines, Zen gardens, artisan matcha cafes & geisha alleys';
  } else if (destLower.includes('amalfi') || destLower.includes('italy')) {
    heroImage = 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1200&auto=format&fit=crop';
    tagline = 'Pastel clifftops, lemon groves, Mediterranean yachts & seaside trattorias';
  } else if (destLower.includes('bali') || destLower.includes('indonesia')) {
    heroImage = 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop';
    tagline = 'Lush tropical valleys, surf coastlines, spiritual retreats & sunset beach clubs';
  } else if (destLower.includes('paris') || destLower.includes('france')) {
    heroImage = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop';
    tagline = 'Romantic Haussmannian boulevards, Michelin patisseries & grand art galleries';
  } else if (destLower.includes('swiss') || destLower.includes('switzerland')) {
    heroImage = 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1200&auto=format&fit=crop';
    tagline = 'Alpine panoramic trains, emerald glacial lakes & cozy fondue chalets';
  } else if (destLower.includes('kerala')) {
    heroImage = 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=1200&auto=format&fit=crop';
    tagline = 'Serene palm-fringed backwaters, misty tea plantations & Ayurvedic wellness';
  } else if (destLower.includes('rajasthan') || destLower.includes('jaipur')) {
    heroImage = 'https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=1200&auto=format&fit=crop';
    tagline = 'Gilded heritage havelis, desert night camps & royal Rajput palaces';
  }

  const isRelaxed = userPreferences?.travelStyle === 'relaxed' || 
                    userPreferences?.pacePreference === 'relaxed' || 
                    preferences.includes('Relaxation');
  const isAdventure = userPreferences?.travelStyle === 'adventure' || 
                      preferences.includes('Adventure');
  const isBudget = userPreferences?.budgetPreference === 'budget' || 
                   userPreferences?.travelStyle === 'budget' || 
                   preferences.includes('Budget');
  const startTime = userPreferences?.preferredStartTime || (isRelaxed ? '10:00 AM' : '09:30 AM');
  const foodChoice = (userPreferences?.foodPreferences && userPreferences.foodPreferences[0]) 
    ? userPreferences.foodPreferences[0] 
    : 'Regional';

  const nights = Math.max(1, days - 1);
  const baseHotelNight = isBudget ? 2200 : 4200;
  const hotelBudget = baseHotelNight * nights;
  const foodBudget = (isBudget ? 800 : 1500) * days * travelers;
  const transportBudget = (isBudget ? 500 : 1000) * days;
  const activitiesBudget = (isBudget ? 400 : 1200) * days * travelers;
  const miscBudget = isBudget ? 1000 : 2000;
  
  const detectedCountry = detectCountryFromDestination(destination);
  const canonicalDest = resolveCanonicalLocation(destination, detectedCountry.countryName);

  // Dynamic canonical origin determination
  let canonicalOrigin = originInput ? resolveCanonicalLocation(originInput) : null;
  if (!canonicalOrigin) {
    if (canonicalDest?.city.toLowerCase() === 'delhi' || destLower.includes('delhi')) {
      canonicalOrigin = resolveCanonicalLocation('chennai'); // Chennai for Delhi trip
    } else if (canonicalDest?.city.toLowerCase() === 'mumbai' || destLower.includes('mumbai')) {
      canonicalOrigin = resolveCanonicalLocation('delhi');
    } else if (canonicalDest?.city.toLowerCase() === 'chennai' || destLower.includes('chennai')) {
      canonicalOrigin = resolveCanonicalLocation('delhi');
    } else {
      canonicalOrigin = resolveCanonicalLocation('mumbai');
    }
  }

  const effectiveOriginStr = canonicalOrigin ? `${canonicalOrigin.city}, ${canonicalOrigin.country}` : (originInput || 'Chennai, India');
  const destFlightData = getFlightDataForDestination(destination, effectiveOriginStr, detectedCountry.countryName);
  const flightPerPerson = destFlightData.isSameCity ? 0 : ((destFlightData.outboundFlight?.pricePerPerson || 3850) + (destFlightData.returnFlight?.pricePerPerson || 4120));
  const flightBudget = flightPerPerson * travelers;
  const total = hotelBudget + flightBudget + foodBudget + transportBudget + activitiesBudget + miscBudget;

  const effectiveStartDate = startDateInput || getTodayISO();
  const dateRange = calculateTravelDateRange(effectiveStartDate, days);

  const generatedItinerary = Array.from({ length: days }).map((_, i) => {
    const dayInfo = calculateTripDayDate(dateRange.startDateISO, i + 1);
    const dayActivities = [];

    // Activity 1: Morning Exploration
    dayActivities.push({
      id: `gen-act-${i}-1`,
      time: startTime,
      activity: isAdventure 
        ? `Morning Outdoor Trail & Trek at ${destination} Ridge`
        : `Morning Exploration at ${destination} Landmark`,
      location: `Central ${destination}`,
      estimatedCost: isBudget ? 100 * travelers : 400 * travelers,
      duration: isRelaxed ? '2 hrs' : '2.5 hrs',
      aiRecommendation: isRelaxed 
        ? `Relaxed start at ${startTime}; plenty of scenic buffer time.`
        : 'Early arrival avoids peak queues; prime photo lighting.',
      category: isAdventure ? ('adventure' as const) : ('sightseeing' as const),
      imageUrl: heroImage
    });

    // Activity 2: Culinary Stop
    dayActivities.push({
      id: `gen-act-${i}-2`,
      time: isRelaxed ? '01:30 PM' : '01:00 PM',
      activity: isBudget
        ? `Authentic ${foodChoice} Street Food Hub & Chai Corner`
        : `Authentic ${foodChoice} Dining & Cafe Break`,
      location: `Old Town ${destination}`,
      estimatedCost: isBudget ? 250 * travelers : 650 * travelers,
      duration: isRelaxed ? '2 hrs' : '1.5 hrs',
      aiRecommendation: `Curated for ${foodChoice} culinary preference with verified hygiene.`,
      category: 'food' as const,
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop'
    });

    // Activity 3: Afternoon / Golden Hour (omitted if relaxed to preserve buffer)
    if (!isRelaxed) {
      dayActivities.push({
        id: `gen-act-${i}-3`,
        time: '04:30 PM',
        activity: isAdventure
          ? `High-Viewpoint Sunset Hike & Coastal Panorama`
          : `Signature Activity & Scenic Sunset Vantage Point`,
        location: `Panoramic Hilltop / Waterfront`,
        estimatedCost: isBudget ? 150 * travelers : 500 * travelers,
        duration: '2.5 hrs',
        aiRecommendation: 'Unmissable golden hour vantage point.',
        category: isAdventure ? ('adventure' as const) : ('relaxation' as const),
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop'
      });
    }

    return {
      dayNumber: i + 1,
      date: dayInfo.dateISO,
      formattedDate: dayInfo.formattedDay,
      title: i === 0 
        ? 'Arrival & Neighborhood Discovery' 
        : i === days - 1 
        ? 'Morning Highlights & Departure' 
        : `Highlights & Cultural Immersion Part ${i}`,
      theme: `Curated AI experiences tailored for ${preferences.join(' & ')}`,
      activities: dayActivities
    };
  });

  return {
    id: `trip-${Date.now()}`,
    destination: destination || 'Custom Trip',
    origin: effectiveOriginStr,
    country: detectedCountry.countryName,
    originLocation: canonicalOrigin || undefined,
    destinationLocation: canonicalDest || undefined,
    originAirport: resolveAirport(canonicalOrigin?.city || effectiveOriginStr) || undefined,
    destinationAirport: resolveAirport(canonicalDest?.city || destination) || undefined,
    tagline,
    heroImage,
    days: dateRange.durationDays,
    nights: dateRange.nights,
    travelers,
    startDate: dateRange.startDateISO,
    endDate: dateRange.endDateISO,
    travelDates: customDates || dateRange.formattedRange,
    preferences: preferences as any,
    hotelCategory: isBudget ? 'budget' : 'mid',
    transportType: 'cab',
    foodPreference: 'casual',
    activityLevel: isRelaxed ? 'relaxed' : 'moderate',
    status: 'planning',

    createdAt: new Date().toISOString().split('T')[0],
    budget: {
      hotel: hotelBudget,
      flights: flightBudget,
      food: foodBudget,
      transportation: transportBudget,
      activities: activitiesBudget,
      miscellaneous: miscBudget,
      total: total
    },
    aiNotes: [
      `Customized for ${travelers} traveler(s) with focus on ${preferences.join(', ')}.`,
      isRelaxed ? 'Relaxed pacing profile applied: fewer daily stops with generous 90-min buffers.' : 'Calculated dynamic distance grouping to save transit costs.',
      isBudget ? 'Budget optimization applied: prioritized authentic low-cost cultural experiences.' : 'Includes balanced downtime between major attractions.'
    ],
    itinerary: generatedItinerary,

    hotels: [
      {
        id: `h-${Date.now()}-1`,
        name: `${destination} Grand Heritage Sanctuary`,
        location: `Prime Center, ${destination}`,
        rating: 4.8,
        reviewsCount: 389,
        pricePerNight: baseHotelNight,
        totalStayPrice: hotelBudget,
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop',
        amenities: ['Pool', 'Breakfast Included', 'City View Balcony', 'Fast Wi-Fi'],
        description: `Highly rated central stay with immediate access to key landmarks in ${destination}.`,
        tag: 'AI Best Value',
        selected: true
      },
      {
        id: `h-${Date.now()}-2`,
        name: `The Azure Boutique Hotel`,
        location: `Old Quarter, ${destination}`,
        rating: 4.7,
        reviewsCount: 245,
        pricePerNight: Math.round(baseHotelNight * 0.85),
        totalStayPrice: Math.round(hotelBudget * 0.85),
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop',
        amenities: ['Garden Patio', 'Artisan Cafe', 'Free Shuttle'],
        description: 'Charming boutique hotel with personalized concierge and calm ambiance.',
        tag: 'Budget Pick',
        selected: false
      },
      {
        id: `h-${Date.now()}-3`,
        name: `Horizon Panorama Suites`,
        location: `Skyline District, ${destination}`,
        rating: 4.9,
        reviewsCount: 512,
        pricePerNight: Math.round(baseHotelNight * 1.4),
        totalStayPrice: Math.round(hotelBudget * 1.4),
        image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=600&auto=format&fit=crop',
        amenities: ['Rooftop Infinity Pool', 'Spa & Wellness', 'Michelin Chef Dining'],
        description: 'Ultra-luxurious 5-star suites with 360-degree skyline views and chauffeur service.',
        tag: 'Luxury Experience',
        selected: false
      }
    ],
    touristPlaces: [
      {
        id: `p-${Date.now()}-1`,
        name: `${destination} Landmark Vista`,
        location: destination,
        rating: 4.9,
        estimatedDuration: '2.5 Hours',
        entryCost: 350,
        image: heroImage,
        aiTag: 'Top Iconic Sights',
        category: 'Landmark',
        description: `The premier must-see attraction that defines the spirit of ${destination}.`,
        bestTimeToVisit: 'Morning / Golden Hour',
        added: true
      },
      {
        id: `p-${Date.now()}-2`,
        name: `Historic Cultural Pavilion`,
        location: `Old District, ${destination}`,
        rating: 4.7,
        estimatedDuration: '2 Hours',
        entryCost: 200,
        image: 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=600&auto=format&fit=crop',
        aiTag: 'Art & Heritage',
        category: 'Culture',
        description: `Preserved historic architecture exhibiting centuries of local art and craftsmanship.`,
        bestTimeToVisit: '10:00 AM – 2:00 PM',
        added: true
      },
      {
        id: `p-${Date.now()}-3`,
        name: `Emerald Botanical Gardens`,
        location: `North ${destination}`,
        rating: 4.8,
        estimatedDuration: '1.5 Hours',
        entryCost: 150,
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop',
        aiTag: 'Nature & Serenity',
        category: 'Nature',
        description: `Peaceful walking trails with exotic flora, tranquil water ponds, and canopy walks.`,
        bestTimeToVisit: '4:00 PM – Sunset',
        added: true
      }
    ],
    restaurants: [
      {
        id: `r-${Date.now()}-1`,
        name: `The Heritage Kitchen`,
        cuisine: 'Authentic Local Specialities',
        rating: 4.8,
        averagePrice: 1200,
        priceLevel: '₹₹',
        distance: '1.1 km from hotel',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop',
        aiRecommendedBadge: 'Top Ranked by Foodies',
        specialty: 'Signature Chef Tasting Platter',
        added: true
      },
      {
        id: `r-${Date.now()}-2`,
        name: `Skyline Bistro & Bar`,
        cuisine: 'Contemporary Fusion & Tapas',
        rating: 4.7,
        averagePrice: 1600,
        priceLevel: '₹₹₹',
        distance: '1.8 km from hotel',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
        aiRecommendedBadge: 'Romantic Ambience',
        specialty: 'Woodfired Artisan Grill & Cocktails',
        added: true
      }
    ]
  };
};
