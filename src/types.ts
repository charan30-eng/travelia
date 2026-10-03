export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyRate {
  symbol: string;
  rateFromINR: number;
}

export type TripPreference = 
  | 'Adventure' 
  | 'Relaxation' 
  | 'Family' 
  | 'Couple' 
  | 'Friends' 
  | 'Budget' 
  | 'Luxury' 
  | 'Food & Culture';

export interface ItineraryActivity {
  id: string;
  time: string;
  activity: string;
  location: string;
  estimatedCost: number;
  duration: string;
  aiRecommendation: string;
  category: 'sightseeing' | 'food' | 'relaxation' | 'adventure' | 'transit' | 'hotel';
  imageUrl?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  theme: string;
  activities: ItineraryActivity[];
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  totalStayPrice: number;
  image: string;
  amenities: string[];
  description: string;
  tag: string;
  selected?: boolean;
}

export interface TouristPlace {
  id: string;
  name: string;
  location: string;
  rating: number;
  estimatedDuration: string;
  entryCost: number;
  image: string;
  aiTag: string;
  category: string;
  description: string;
  bestTimeToVisit: string;
  added?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  averagePrice: number;
  priceLevel: '₹' | '₹₹' | '₹₹₹' | '₹₹₹₹';
  distance: string;
  image: string;
  aiRecommendedBadge: string;
  specialty: string;
  added?: boolean;
}

export interface BudgetBreakdown {
  hotel: number;
  flights?: number;
  food: number;
  transportation: number;
  activities: number;
  miscellaneous: number;
  total: number;
}

export interface CustomBudgetItem {
  id: string;
  title: string;
  category: 'hotel' | 'food' | 'transportation' | 'activities' | 'flight' | 'miscellaneous';
  amount: number;
  perPerson?: boolean;
  enabled?: boolean;
}

export interface TripPlan {
  id: string;
  destination: string;
  country: string;
  tagline: string;
  heroImage: string;
  days: number;
  nights: number;
  travelers: number;
  travelDates: string;
  preferences: TripPreference[];
  itinerary: ItineraryDay[];
  hotels: Hotel[];
  touristPlaces: TouristPlace[];
  restaurants: Restaurant[];
  budget: BudgetBreakdown;
  aiNotes: string[];
  status: 'planning' | 'saved' | 'completed';
  createdAt: string;
  hotelCategory: 'budget' | 'mid' | 'luxury';
  transportType: 'public' | 'cab' | 'rental' | 'private';
  foodPreference: 'street' | 'casual' | 'finedining';
  activityLevel: 'relaxed' | 'moderate' | 'packed';
}

export interface DestinationCardData {
  id: string;
  name: string;
  country: string;
  category: 'Beaches' | 'Mountains' | 'Historical' | 'Adventure' | 'Romantic' | 'Family' | 'Nature' | 'Food';
  image: string;
  rating: number;
  reviews: number;
  pricePerDay: number;
  description: string;
  highlights: string[];
  bestSeason: string;
  duration: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  actionProposal?: {
    type: string;
    label: string;
    description: string;
    estimatedSavings?: number;
    healthScoreDelta?: number;
    healthScoreBefore?: number;
    healthScoreAfter?: number;
    travelTimeSavedMins?: number;
    optimizationResult?: any;
    payload?: any;
  };
  actionPrompt?: {
    type: 'add_beach' | 'discount_hotel' | 'add_restaurant' | 'recalculate' | 'smart_replan' | 'optimize_route' | 'packing_list';
    label: string;
  };
  optimizationResult?: any;
  insights?: string[];
  suggestedFollowUps?: string[];
  changes?: any[];
  isError?: boolean;
  rawQuery?: string;
}

// 1. SMART REPLAN
export type DisruptionType = 
  | 'rain' 
  | 'bad_weather' 
  | 'attraction_closed' 
  | 'traffic_delay' 
  | 'transit_delay' 
  | 'running_late' 
  | 'skip_activity'
  | 'custom';

export interface DisruptionOption {
  id: DisruptionType;
  label: string;
  iconName: string;
  defaultDescription: string;
}

export interface ReplanComparisonItem {
  time: string;
  originalActivity: string;
  newActivity: string;
  location: string;
  status: 'modified' | 'rescheduled' | 'replaced' | 'unchanged' | 'removed';
  note: string;
  costDiff: number; // positive = added, negative = saved
}

export interface SmartReplanSuggestion {
  id: string;
  disruptionType: DisruptionType;
  disruptionTitle: string;
  reason: string;
  affectedDay: number;
  affectedActivitiesCount: number;
  estimatedBudgetImpact: number;
  budgetNote: string;
  timingChangesSummary: string;
  comparisonItems: ReplanComparisonItem[];
  appliedItinerary: ItineraryDay[];
}

// 2. ROUTE OPTIMIZER & MAP
export interface RouteWaypoint {
  id: string;
  title: string;
  category: 'hotel' | 'activity' | 'restaurant' | 'attraction';
  location: string;
  coords: [number, number]; // lat, lng for simulated canvas
  time: string;
  stopNumber: number;
  cost: number;
}

export interface RouteSegment {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  distanceKm: number;
  durationMinutes: number;
  transportMode: 'cab' | 'walking' | 'metro' | 'rental_scooter';
  aiTip?: string;
}

export interface DayRoute {
  dayNumber: number;
  totalDistanceKm: number;
  totalTravelTimeMinutes: number;
  waypoints: RouteWaypoint[];
  segments: RouteSegment[];
  optimized: boolean;
  transitSavings?: string;
}

// 3. GROUP TRIP COLLABORATION
export interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  role: 'organizer' | 'co-traveler' | 'invited';
  status: 'active' | 'pending';
  voteCount: number;
  isCurrentUser?: boolean;
}

export interface SuggestedPlace {
  id: string;
  suggestedBy: string;
  suggestedByName: string;
  title: string;
  category: 'Sight' | 'Food' | 'Beach' | 'Nightlife' | 'Activity';
  location: string;
  estimatedCost: number;
  description: string;
  votes: {
    userId: string;
    vote: 'up' | 'down';
  }[];
  score: number;
  status: 'approved' | 'voting' | 'rejected';
}

// 4. GROUP EXPENSE SPLITTING
export interface ExpenseSplitParticipant {
  memberId: string;
  memberName: string;
  owesAmount: number;
  hasPaid: boolean;
}

export interface GroupExpense {
  id: string;
  title: string;
  category: 'hotel' | 'food' | 'transport' | 'activity' | 'misc';
  totalAmount: number;
  paidByMemberId: string;
  paidByMemberName: string;
  date: string;
  splitAmongIds: string[]; // member IDs
  note?: string;
}

export interface MemberBalanceSummary {
  memberId: string;
  memberName: string;
  avatar: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // positive = gets back, negative = owes
}

// 5. PACKING ASSISTANT
export interface PackingItem {
  id: string;
  name: string;
  category: 'clothing' | 'documents' | 'electronics' | 'essentials' | 'activity_gear';
  checked: boolean;
  aiSuggestedReason?: string;
  isCustom?: boolean;
}

// 6. WEATHER AWARENESS
export interface WeatherForecastDay {
  dayNumber: number;
  dateStr: string;
  condition: 'Sunny' | 'Partly Cloudy' | 'Afternoon Showers' | 'Clear Coastal' | 'Tropical Breeze' | 'Rainy';
  tempMaxC: number;
  tempMinC: number;
  humidityPercent: number;
  rainChancePercent: number;
  uvIndex: number;
  aiAdvisory: string;
  recommendedTime: string;
  isRainAlert?: boolean;
}

// 7. TRIP HEALTH SCORE
export interface HealthMetric {
  name: string;
  score: number; // 0-100
  weight: number;
  status: 'optimal' | 'good' | 'needs_attention';
  insight: string;
}

export interface HealthScoreImprovement {
  id: string;
  title: string;
  description: string;
  impact: string;
  applied: boolean;
  actionType: 'rest_time' | 'group_transit' | 'indoor_backup' | 'budget_cap';
}

export interface TripHealthScore {
  overallScore: number; // 0-100
  ratingLabel: string;
  summary: string;
  metrics: {
    budgetEfficiency?: HealthMetric;
    routeEfficiency?: HealthMetric;
    scheduleBalance?: HealthMetric;
    restTime: HealthMetric;
    activityDiversity?: HealthMetric;
    weatherCompatibility?: HealthMetric;
    budgetBalance?: HealthMetric;
    scheduleIntensity?: HealthMetric;
    travelEfficiency?: HealthMetric;
    activityVariety?: HealthMetric;
    hotelConvenience?: HealthMetric;
    [key: string]: HealthMetric | undefined;
  };
  improvements: HealthScoreImprovement[];
}

// 8. SAFETY & LOCAL GUIDANCE
export interface EmergencyContact {
  label: string;
  number: string;
  category: 'police' | 'medical' | 'tourist' | 'embassy' | 'transport';
  description: string;
}

export interface LocalCustom {
  title: string;
  description: string;
  icon: string;
}

export interface LocalPhrase {
  phrase: string;
  phonetic: string;
  meaning: string;
  category: 'greeting' | 'dining' | 'directions' | 'emergency';
}

export interface SafetyInfo {
  destination: string;
  emergencyContacts: EmergencyContact[];
  touristSafetyTips: string[];
  localCustoms: LocalCustom[];
  usefulPhrases: LocalPhrase[];
  healthAdvisory: string[];
}

// 9. FLIGHTS & AIR TRAVEL
export interface FlightSegment {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  aircraft: string;
  originAirport: string;
  originCity: string;
  originCode: string;
  destinationAirport: string;
  destinationCity: string;
  destinationCode: string;
  departureTime: string;
  departureDate: string;
  arrivalTime: string;
  arrivalDate: string;
  duration: string;
  stops: number;
  cabinClass: 'economy' | 'premium_economy' | 'business';
  seatAssignment?: string;
  terminalDeparture?: string;
  terminalArrival?: string;
  gate?: string;
  baggage: {
    cabin: string;
    checkIn: string;
  };
  pricePerPerson: number;
  status: 'on-time' | 'scheduled' | 'boarding' | 'gate-open' | 'delayed';
  bookingRef?: string;
  carbonEmissionKg?: number;
}

export interface FlightOption {
  id: string;
  type: 'outbound' | 'return';
  airline: string;
  flightNumber: string;
  originCode: string;
  originCity: string;
  destCode: string;
  destCity: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  pricePerPerson: number;
  isBestValue?: boolean;
  isFastest?: boolean;
  carbonScore: 'eco' | 'standard';
  aircraft: string;
  availableSeats: number;
}

export interface AirportTransferInfo {
  airportName: string;
  airportCode: string;
  distanceToHotelKm: number;
  estimatedDriveMinutes: number;
  transferOptions: {
    mode: string;
    estimatedCost: number;
    duration: string;
    tip: string;
  }[];
}

export interface FlightPassenger {
  id: string;
  type: 'adult' | 'child' | 'infant';
  title: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  seatOutbound?: string;
  seatReturn?: string;
  mealPreference?: string;
  passportOrId?: string;
  frequentFlyerNo?: string;
}

export interface FlightBookingRecord {
  id: string;
  pnr: string;
  bookingDate: string;
  status: 'confirmed' | 'ticketed' | 'cancelled';
  tripId: string;
  destination: string;
  outboundFlight: FlightSegment;
  returnFlight: FlightSegment;
  passengers: FlightPassenger[];
  contactEmail: string;
  contactPhone: string;
  totalAmount: number;
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'split';
  paymentRef: string;
  hasTravelInsurance: boolean;
  hasFlexibleCancellation: boolean;
  extraBaggageKg: number;
  carbonOffset: boolean;
  promoCodeApplied?: string;
  discountAmount?: number;
}

