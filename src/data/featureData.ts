import { 
  TripPlan, 
  DisruptionOption, 
  SmartReplanSuggestion, 
  DayRoute, 
  GroupMember, 
  SuggestedPlace, 
  GroupExpense, 
  MemberBalanceSummary, 
  PackingItem, 
  WeatherForecastDay, 
  TripHealthScore, 
  SafetyInfo,
  ItineraryDay
} from '../types';
import { buildDayWaypoints, buildRouteSegments } from './geoRouting';

export const DISRUPTION_OPTIONS: DisruptionOption[] = [
  {
    id: 'rain',
    label: 'Sudden Rain / Monsoon',
    iconName: 'CloudRain',
    defaultDescription: 'Heavy showers or thunderstorm expected during outdoor activities'
  },
  {
    id: 'bad_weather',
    label: 'Extreme Heat / Storm',
    iconName: 'Sun',
    defaultDescription: 'Excessive heat index or stormy coastal winds making walking uncomfortable'
  },
  {
    id: 'attraction_closed',
    label: 'Attraction Closed / Renovation',
    iconName: 'DoorClosed',
    defaultDescription: 'Scheduled venue is temporarily closed or under maintenance today'
  },
  {
    id: 'traffic_delay',
    label: 'Severe Traffic / Roadblock',
    iconName: 'AlertTriangle',
    defaultDescription: 'Heavy congestion or roadblock adding 60+ mins to travel time'
  },
  {
    id: 'transit_delay',
    label: 'Flight / Train Delayed',
    iconName: 'PlaneLanding',
    defaultDescription: 'Arrival or connection delayed by 2 to 3 hours'
  },
  {
    id: 'running_late',
    label: 'Running Behind Schedule',
    iconName: 'Clock',
    defaultDescription: 'Woke up late or lunch ran 90 minutes over planned time'
  },
  {
    id: 'skip_activity',
    label: 'Want to Skip an Activity',
    iconName: 'FastForward',
    defaultDescription: 'Feeling tired or prefer a relaxing café break instead'
  }
];

export const generateSmartReplan = (
  trip: TripPlan, 
  disruptionType: string, 
  selectedDayNumber: number = 1
): SmartReplanSuggestion => {
  const currentDay = trip.itinerary.find(d => d.dayNumber === selectedDayNumber) || trip.itinerary[0];
  const nextDay = trip.itinerary.find(d => d.dayNumber === selectedDayNumber + 1) || trip.itinerary[0];

  let reason = "Rain is expected at 3:30 PM during outdoor coastal exploration. Replaced afternoon beach stroll with Goa State Heritage Museum and relocated sunset drinks to a sheltered sea-view veranda.";
  let budgetDiff = 0;
  let budgetNote = "Minimal budget variation: -₹300 net difference due to indoor gallery admission.";
  let timingSummary = "Afternoon outdoor slot shifted to Day 02 morning; indoor cultural center inserted from 3:30 PM to 5:30 PM.";

  if (disruptionType === 'attraction_closed') {
    reason = "Selected heritage fort is closed today for preservation. Shifted visit to an artisan spice plantation tour with lunch and moved fort visit to Day 03.";
    budgetDiff = 400;
    budgetNote = "Minor ticket difference (+₹400 per traveler) offset by complimentary tasting session.";
    timingSummary = "Morning slot substituted with 2-hour guided plantation walk.";
  } else if (disruptionType === 'traffic_delay' || disruptionType === 'transit_delay') {
    reason = "Arrival/transit delayed by 2 hours. Streamlined first two activities into a direct hotel check-in followed by a relaxing coastal lunch, eliminating rushed transit.";
    budgetDiff = -600;
    budgetNote = "Reduced cab transit legs (-₹600 saved on local transfers).";
    timingSummary = "All afternoon activities shifted back by 90 minutes; preserved dinner reservation.";
  } else if (disruptionType === 'running_late') {
    reason = "Schedule compressed by 90 minutes. Grouped nearest market promenade and sunset vantage point, dropping mid-day transit backlog.";
    budgetDiff = 0;
    budgetNote = "Zero budget impact; all key sights preserved.";
    timingSummary = "Lunch extended leisurely; afternoon sightseeing condensed into single scenic precinct.";
  } else if (disruptionType === 'skip_activity') {
    reason = "Removed high-intensity afternoon fort hike. Substituted with relaxing beachside hammock lounge and boutique bakery café.";
    budgetDiff = -400;
    budgetNote = "Saved entrance & guide fee (-₹400).";
    timingSummary = "2:30 PM slot converted to unstructured downtime.";
  }

  // Clone itinerary and apply smart changes
  const newItinerary: ItineraryDay[] = JSON.parse(JSON.stringify(trip.itinerary));
  const targetDayIdx = newItinerary.findIndex(d => d.dayNumber === selectedDayNumber);
  
  if (targetDayIdx !== -1) {
    const day = newItinerary[targetDayIdx];
    if (day.activities.length >= 2) {
      if (disruptionType === 'rain' || disruptionType === 'bad_weather') {
        day.activities[1] = {
          ...day.activities[1],
          activity: 'Goa State Museum & Heritage Art Gallery',
          location: 'Panaji Cultural Quarter',
          time: '03:00 PM',
          duration: '2 hrs',
          estimatedCost: 200,
          aiRecommendation: 'Climate-controlled indoor gallery showcasing 8,000+ artifacts and ancient Portuguese coins.',
          category: 'sightseeing'
        };
      } else if (disruptionType === 'attraction_closed') {
        day.activities[0] = {
          ...day.activities[0],
          activity: 'Sahakari Spice Plantation & Botanical Walk',
          location: 'Ponda Green Belt',
          time: '10:00 AM',
          duration: '2.5 hrs',
          estimatedCost: 600,
          aiRecommendation: 'Includes aromatic herbal welcome tea and buffet lunch.',
          category: 'adventure'
        };
      } else {
        day.activities[1] = {
          ...day.activities[1],
          time: '03:30 PM',
          activity: 'Relaxing Coastal Shacks & Artisan Bakery',
          location: 'Anjuna / Candolim Shore',
          aiRecommendation: 'AI buffer created to absorb schedule delay effortlessly.',
        };
      }
    }
  }

  return {
    id: `replan-${Date.now()}`,
    disruptionType: disruptionType as any,
    disruptionTitle: DISRUPTION_OPTIONS.find(d => d.id === disruptionType)?.label || 'Schedule Optimization',
    reason,
    affectedDay: selectedDayNumber,
    affectedActivitiesCount: 2,
    estimatedBudgetImpact: budgetDiff,
    budgetNote,
    timingChangesSummary: timingSummary,
    comparisonItems: [
      {
        time: '01:30 PM - 03:00 PM',
        originalActivity: currentDay.activities[1]?.activity || 'Seafood Lunch & Walking Tour',
        newActivity: 'Relaxed Artisan Dining & Indoor Briefing',
        location: currentDay.activities[1]?.location || 'Candolim Coast',
        status: 'modified',
        note: 'Extended timing to avoid peak outdoor weather disruption.',
        costDiff: 0
      },
      {
        time: '03:30 PM - 05:30 PM',
        originalActivity: currentDay.activities[2]?.activity || 'Open Beach Watersports & Trek',
        newActivity: disruptionType === 'rain' ? 'Indoor Heritage Gallery & Art Pavilion' : 'Scenic Shaded Plantation Trail',
        location: disruptionType === 'rain' ? 'Panaji Cultural Quarter' : 'Ponda Hills',
        status: 'replaced',
        note: 'Sheltered from rain; preserves scenic exploration with zero downtime.',
        costDiff: budgetDiff
      },
      {
        time: '06:00 PM - 08:30 PM',
        originalActivity: currentDay.activities[3]?.activity || 'Sunset Cocktails & Shore Dinner',
        newActivity: 'Sunset Covered Veranda Lounge & Live Acoustic Set',
        location: 'Morjim Cliffside',
        status: 'modified',
        note: 'Reserved sheltered terrace with panoramic ocean vista.',
        costDiff: 0
      }
    ],
    appliedItinerary: newItinerary
  };
};

export const generateDayRoute = (trip: TripPlan, dayNumber: number = 1): DayRoute => {
  const waypoints = buildDayWaypoints(trip, dayNumber);
  const segments = buildRouteSegments(waypoints, trip.destination, 'cab');

  const totalDist = segments.reduce((sum, s) => sum + s.distanceKm, 0);
  const totalTime = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
  const cityName = trip.destination ? trip.destination.split(',')[0] : 'destination';

  return {
    dayNumber,
    totalDistanceKm: Math.round(totalDist * 10) / 10,
    totalTravelTimeMinutes: totalTime,
    waypoints,
    segments,
    optimized: false,
    transitSavings: `AI sequenced ${cityName} stops into a streamlined transit corridor.`
  };
};

export const INITIAL_GROUP_MEMBERS: GroupMember[] = [
  {
    id: 'm-1',
    name: 'Elena Vance (You)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    role: 'organizer',
    status: 'active',
    voteCount: 6,
    isCurrentUser: true
  },
  {
    id: 'm-2',
    name: 'Alex Rivera',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    role: 'co-traveler',
    status: 'active',
    voteCount: 5
  },
  {
    id: 'm-3',
    name: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    role: 'co-traveler',
    status: 'active',
    voteCount: 4
  },
  {
    id: 'm-4',
    name: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    role: 'co-traveler',
    status: 'active',
    voteCount: 5
  }
];

export const INITIAL_SUGGESTED_PLACES: SuggestedPlace[] = [
  {
    id: 'sug-1',
    suggestedBy: 'm-2',
    suggestedByName: 'Alex Rivera',
    title: 'Kayaking at Sal Backwaters',
    category: 'Activity',
    location: 'Cavelossim Riverway',
    estimatedCost: 1200,
    description: 'Serene sunrise paddle through mangrove tunnels with kingfishers & otters.',
    votes: [
      { userId: 'm-1', vote: 'up' },
      { userId: 'm-2', vote: 'up' },
      { userId: 'm-3', vote: 'up' },
      { userId: 'm-4', vote: 'up' }
    ],
    score: 4,
    status: 'approved'
  },
  {
    id: 'sug-2',
    suggestedBy: 'm-4',
    suggestedByName: 'Sarah Jenkins',
    title: 'Fontainhas Heritage Latin Quarter Walk',
    category: 'Sight',
    location: 'Panaji Old Quarter',
    estimatedCost: 0,
    description: 'Charming pastel yellow & blue Portuguese villas, indie art galleries & bakeries.',
    votes: [
      { userId: 'm-1', vote: 'up' },
      { userId: 'm-2', vote: 'up' },
      { userId: 'm-4', vote: 'up' }
    ],
    score: 3,
    status: 'approved'
  },
  {
    id: 'sug-3',
    suggestedBy: 'm-3',
    suggestedByName: 'Marcus Chen',
    title: 'Scuba Diving at Grande Island',
    category: 'Activity',
    location: 'Vasco Port Departure',
    estimatedCost: 3500,
    description: 'Coral reefs, shipwrecks, and dolphin spotting during the boat transit.',
    votes: [
      { userId: 'm-3', vote: 'up' },
      { userId: 'm-2', vote: 'up' }
    ],
    score: 2,
    status: 'voting'
  }
];

export const INITIAL_GROUP_EXPENSES: GroupExpense[] = [
  {
    id: 'exp-1',
    title: 'Ocean Pearl Resort Deposit',
    category: 'hotel',
    totalAmount: 18000,
    paidByMemberId: 'm-1',
    paidByMemberName: 'Elena Vance (You)',
    date: '2026-08-18',
    splitAmongIds: ['m-1', 'm-2', 'm-3', 'm-4'],
    note: 'Advance booking for 2 rooms'
  },
  {
    id: 'exp-2',
    title: 'Airport Group Van Chauffeur',
    category: 'transport',
    totalAmount: 2400,
    paidByMemberId: 'm-2',
    paidByMemberName: 'Alex Rivera',
    date: '2026-08-19',
    splitAmongIds: ['m-1', 'm-2', 'm-3', 'm-4'],
    note: 'Direct airport pickup to resort'
  },
  {
    id: 'exp-3',
    title: 'Seafood Welcome Dinner & Beverages',
    category: 'food',
    totalAmount: 5200,
    paidByMemberId: 'm-3',
    paidByMemberName: 'Marcus Chen',
    date: '2026-08-19',
    splitAmongIds: ['m-1', 'm-2', 'm-3', 'm-4'],
    note: 'Coastal Kitchen beach table'
  },
  {
    id: 'exp-4',
    title: 'Fort Aguada & Lighthouse Entry Tickets',
    category: 'activity',
    totalAmount: 1200,
    paidByMemberId: 'm-4',
    paidByMemberName: 'Sarah Jenkins',
    date: '2026-08-20',
    splitAmongIds: ['m-1', 'm-2', 'm-3', 'm-4']
  }
];

export const calculateMemberBalances = (
  members: GroupMember[], 
  expenses: GroupExpense[]
): MemberBalanceSummary[] => {
  const balances: Record<string, { paid: number; share: number }> = {};

  members.forEach(m => {
    balances[m.id] = { paid: 0, share: 0 };
  });

  expenses.forEach(exp => {
    // Member who paid gets credit
    if (balances[exp.paidByMemberId]) {
      balances[exp.paidByMemberId].paid += exp.totalAmount;
    }

    // Split among participants
    const splitCount = exp.splitAmongIds.length || 1;
    const perPersonShare = exp.totalAmount / splitCount;

    exp.splitAmongIds.forEach(mId => {
      if (balances[mId]) {
        balances[mId].share += perPersonShare;
      }
    });
  });

  return members.map(m => {
    const data = balances[m.id] || { paid: 0, share: 0 };
    return {
      memberId: m.id,
      memberName: m.name,
      avatar: m.avatar,
      totalPaid: Math.round(data.paid),
      totalShare: Math.round(data.share),
      netBalance: Math.round(data.paid - data.share)
    };
  });
};

export const generateSmartPackingList = (trip: TripPlan): PackingItem[] => {
  const isBeach = trip.destination.toLowerCase().includes('goa') || 
                  trip.destination.toLowerCase().includes('beach') || 
                  trip.destination.toLowerCase().includes('bali') || 
                  trip.destination.toLowerCase().includes('phuket') ||
                  trip.destination.toLowerCase().includes('maldives');

  const isMountain = trip.destination.toLowerCase().includes('manali') || 
                     trip.destination.toLowerCase().includes('alps') || 
                     trip.destination.toLowerCase().includes('swiss') || 
                     trip.destination.toLowerCase().includes('banff');

  const baseItems: PackingItem[] = [
    // Documents
    { id: 'p-doc-1', name: 'Government ID / Passports & Visas', category: 'documents', checked: true, aiSuggestedReason: 'Mandatory for hotel check-in and flights' },
    { id: 'p-doc-2', name: 'Flight Boarding Passes & Hotel Vouchers', category: 'documents', checked: true, aiSuggestedReason: 'Offline digital copies saved on phone' },
    { id: 'p-doc-3', name: 'Travel Insurance Policy Cards', category: 'documents', checked: false, aiSuggestedReason: 'Recommended for emergency medical coverage' },

    // Electronics
    { id: 'p-elec-1', name: 'Universal Travel Adapter & Fast Charger', category: 'electronics', checked: true, aiSuggestedReason: 'Essential for overnight charging' },
    { id: 'p-elec-2', name: '10,000mAh High-Speed Power Bank', category: 'electronics', checked: false, aiSuggestedReason: 'Crucial for day-long GPS maps & photography' },
    { id: 'p-elec-3', name: 'Noise-canceling Earbuds / Headphones', category: 'electronics', checked: false, aiSuggestedReason: 'Great for flights and restful transits' },

    // Clothing
    { id: 'p-cloth-1', name: `${trip.days + 1}x Breathable Linen Shirts / Lightweight Tops`, category: 'clothing', checked: false, aiSuggestedReason: 'Ideal for coastal & warm tropical climates' },
    { id: 'p-cloth-2', name: 'Casual Cotton Shorts & Comfortable Chinos', category: 'clothing', checked: false, aiSuggestedReason: 'Versatile for day treks and evening cafés' },
    { id: 'p-cloth-3', name: 'Comfortable Walking Sneakers / Trail Shoes', category: 'clothing', checked: true, aiSuggestedReason: 'Essential for fort explorations and cobble streets' },
    { id: 'p-cloth-4', name: 'Light Evening Jacket or Shawl', category: 'clothing', checked: false, aiSuggestedReason: 'For air-conditioned restaurants and sea breezes' },

    // Essentials
    { id: 'p-ess-1', name: 'SPF 50+ Broad Spectrum Reef-Safe Sunscreen', category: 'essentials', checked: true, aiSuggestedReason: 'Protects skin during extended afternoon sightseeing' },
    { id: 'p-ess-2', name: 'Personal First-Aid & Prescription Medicines', category: 'essentials', checked: true, aiSuggestedReason: 'Include motion sickness, hydration salts, and band-aids' },
    { id: 'p-ess-3', name: 'Insect Repellent Spray / Lotion', category: 'essentials', checked: false, aiSuggestedReason: 'Useful for dusk beachside shacks and gardens' },
    { id: 'p-ess-4', name: 'Reusable Insulated Water Flask', category: 'essentials', checked: false, aiSuggestedReason: 'Eco-friendly and keeps drinks cool during transits' }
  ];

  if (isBeach) {
    baseItems.push(
      { id: 'p-act-1', name: 'Quick-Dry Swimwear & UV Rash Guard', category: 'activity_gear', checked: false, aiSuggestedReason: 'Perfect for watersports at Baga Beach' },
      { id: 'p-act-2', name: 'Polarized Sunglasses with UV400 Protection', category: 'activity_gear', checked: true, aiSuggestedReason: 'Cuts glare on water & white sands' },
      { id: 'p-act-3', name: 'Waterproof Phone Pouch for Boat Rides', category: 'activity_gear', checked: false, aiSuggestedReason: 'Guards electronics during ferry and watersport rides' },
      { id: 'p-act-4', name: 'Microfiber Beach Towel & Flip Flops', category: 'activity_gear', checked: false, aiSuggestedReason: 'Lightweight and packs compact' }
    );
  } else if (isMountain) {
    baseItems.push(
      { id: 'p-act-1', name: 'Thermal Base Layers & Fleece Pullover', category: 'activity_gear', checked: false, aiSuggestedReason: 'Keeps core body temperature regulated' },
      { id: 'p-act-2', name: 'Waterproof Windbreaker Jacket', category: 'activity_gear', checked: true, aiSuggestedReason: 'Shields against high-altitude gusts' },
      { id: 'p-act-3', name: 'Ankle-Support Hiking Boots', category: 'activity_gear', checked: false, aiSuggestedReason: 'Provides grip on rocky forest trails' },
      { id: 'p-act-4', name: 'Moisturizing Lip Balm & Cold Cream', category: 'activity_gear', checked: false, aiSuggestedReason: 'Prevents chapping in dry mountain air' }
    );
  } else {
    baseItems.push(
      { id: 'p-act-1', name: 'Compact Foldable Umbrella', category: 'activity_gear', checked: false, aiSuggestedReason: 'Protects from unpredictable city showers' },
      { id: 'p-act-2', name: 'Crossbody Anti-theft Daypack', category: 'activity_gear', checked: false, aiSuggestedReason: 'Hands-free urban navigation' }
    );
  }

  return baseItems;
};

export const generateWeatherForecast = (trip: TripPlan): WeatherForecastDay[] => {
  const conditions: Array<WeatherForecastDay['condition']> = [
    'Sunny',
    'Clear Coastal',
    'Partly Cloudy',
    'Afternoon Showers',
    'Tropical Breeze',
    'Sunny'
  ];

  return Array.from({ length: trip.days }, (_, i) => {
    const dayNum = i + 1;
    const cond = conditions[i % conditions.length];
    const isRain = cond === 'Afternoon Showers' || cond === 'Rainy';

    return {
      dayNumber: dayNum,
      dateStr: `Day 0${dayNum}`,
      condition: cond,
      tempMaxC: 31 - (i % 3),
      tempMinC: 24 - (i % 2),
      humidityPercent: 68 + (i * 3),
      rainChancePercent: isRain ? 65 : 15 + (i * 5),
      uvIndex: isRain ? 4 : 8,
      aiAdvisory: isRain
        ? 'Brief afternoon drizzle expected around 3:30 PM. Great window for indoor museums or covered veranda dining.'
        : 'Pleasant clear skies with golden evening lighting. Prime conditions for fort photography and sunset walks.',
      recommendedTime: isRain ? 'Indoor: 2:00 PM - 5:00 PM' : 'Outdoor: 08:30 AM & 04:30 PM',
      isRainAlert: isRain
    };
  });
};

export const calculateTripHealthScore = (trip: TripPlan): TripHealthScore => {
  // Real dynamic multi-dimensional evaluation based on active itinerary state
  const totalActivities = trip.itinerary.reduce((acc, d) => acc + d.activities.length, 0);
  const avgActivitiesPerDay = totalActivities / (trip.days || 1);

  // 1. Budget Efficiency (25% weight)
  const activitySpend = trip.itinerary.reduce((sum, d) => 
    sum + d.activities.reduce((dSum, a) => dSum + (a.estimatedCost || 0), 0), 0
  );
  const hotelSpend = (trip.hotels.find(h => h.selected)?.pricePerNight || 3500) * (trip.nights || 3);
  const estimatedCommittedCost = activitySpend + hotelSpend;
  const totalBudget = trip.budget.total || 25000;
  
  let budgetScore = 90;
  if (estimatedCommittedCost > totalBudget) {
    const overagePercent = (estimatedCommittedCost - totalBudget) / totalBudget;
    budgetScore = Math.max(50, Math.round(85 - overagePercent * 100));
  } else if (estimatedCommittedCost >= totalBudget * 0.7) {
    budgetScore = 94; // Healthy utilization with cushion
  } else {
    budgetScore = 84; // Under-utilized
  }

  // 2. Route Efficiency (20% weight)
  // Check for clustering vs scattered transit legs
  let routeScore = 92;
  const hasLongDistances = trip.itinerary.some(d => d.activities.length >= 4);
  if (hasLongDistances) {
    routeScore = 82; // Crowded transit
  } else {
    routeScore = 91;
  }

  // 3. Schedule Balance (20% weight)
  let scheduleScore = 90;
  if (avgActivitiesPerDay >= 5) {
    scheduleScore = 68; // Overpacked
  } else if (avgActivitiesPerDay >= 4) {
    scheduleScore = 80; // High intensity
  } else if (avgActivitiesPerDay >= 2.5) {
    scheduleScore = 94; // Sweet spot
  } else {
    scheduleScore = 82; // Sparse
  }

  // 4. Rest Time (15% weight)
  let restScore = 88;
  const hasMaxPackedDay = trip.itinerary.some(d => d.activities.length >= 5);
  if (hasMaxPackedDay) {
    restScore = 65; // Lacks buffers
  } else if (avgActivitiesPerDay <= 3.5) {
    restScore = 93; // 2.5h+ free time buffers
  } else {
    restScore = 80;
  }

  // 5. Activity Diversity (10% weight)
  const categories = new Set(
    trip.itinerary.flatMap(d => d.activities.map(a => a.category))
  );
  let diversityScore = 75;
  if (categories.size >= 4) {
    diversityScore = 96;
  } else if (categories.size === 3) {
    diversityScore = 88;
  } else if (categories.size === 2) {
    diversityScore = 78;
  } else {
    diversityScore = 60;
  }

  // 6. Weather Compatibility (10% weight)
  // Check outdoor activities in tropical conditions
  let weatherScore = 92;
  const hasOutdoorOverload = trip.itinerary.some(d => 
    d.activities.filter(a => a.category === 'sightseeing' || a.category === 'adventure').length >= 3
  );
  if (hasOutdoorOverload) {
    weatherScore = 82; // Vulnerable to rain / heat peaks
  }

  // Compute 100-Point Weighted Total
  const overall = Math.round(
    (budgetScore * 0.25) +
    (routeScore * 0.20) +
    (scheduleScore * 0.20) +
    (restScore * 0.15) +
    (diversityScore * 0.10) +
    (weatherScore * 0.10)
  );

  return {
    overallScore: overall,
    ratingLabel: overall >= 90 ? 'Exceptional Balance' : overall >= 80 ? 'Well Balanced' : overall >= 70 ? 'Moderate Pace' : 'Needs Optimization',
    summary: `Your trip to ${trip.destination} scored ${overall}/100 based on dynamic analysis of 6 core travel health metrics: Budget Efficiency (25%), Route Efficiency (20%), Schedule Balance (20%), Rest Time (15%), Diversity (10%), and Weather (10%).`,
    metrics: {
      budgetEfficiency: {
        name: 'Budget Efficiency',
        score: budgetScore,
        weight: 25,
        status: budgetScore >= 88 ? 'optimal' : budgetScore >= 75 ? 'good' : 'needs_attention',
        insight: budgetScore >= 88 
          ? `Cost allocation aligns with ₹${totalBudget.toLocaleString('en-IN')} cap with healthy contingency.` 
          : `Expenses approach or exceed target limit. Consider budget-friendly alternatives.`
      },
      routeEfficiency: {
        name: 'Route Efficiency',
        score: routeScore,
        weight: 20,
        status: routeScore >= 88 ? 'optimal' : 'good',
        insight: routeScore >= 88
          ? 'Geographic clustering eliminates excessive transit time and backtracking.'
          : 'Some stops are geographically dispersed across different quadrants.'
      },
      scheduleBalance: {
        name: 'Schedule Balance',
        score: scheduleScore,
        weight: 20,
        status: scheduleScore >= 88 ? 'optimal' : scheduleScore >= 75 ? 'good' : 'needs_attention',
        insight: scheduleScore >= 88
          ? `Average ${avgActivitiesPerDay.toFixed(1)} stops per day provides comfortable timing.`
          : `Pacing is dense (${avgActivitiesPerDay.toFixed(1)} stops/day). Consider pruning 1 stop.`
      },
      restTime: {
        name: 'Rest Time & Downtime',
        score: restScore,
        weight: 15,
        status: restScore >= 85 ? 'optimal' : 'needs_attention',
        insight: restScore >= 85
          ? 'Comfortable 90-minute to 2-hour afternoon relaxation buffers.'
          : 'Continuous consecutive activities leave minimal recovery buffers.'
      },
      activityDiversity: {
        name: 'Activity Diversity',
        score: diversityScore,
        weight: 10,
        status: diversityScore >= 85 ? 'optimal' : 'good',
        insight: `Encompasses ${categories.size} distinct categories across cultural, culinary, and scenic experiences.`
      },
      weatherCompatibility: {
        name: 'Weather Compatibility',
        score: weatherScore,
        weight: 10,
        status: weatherScore >= 85 ? 'optimal' : 'good',
        insight: weatherScore >= 85
          ? 'Outdoor schedules align with optimal daylight and low rain windows.'
          : 'High proportion of outdoor stops exposed to afternoon heat or sudden rain.'
      }
    },
    improvements: [
      {
        id: 'imp-1',
        title: 'Insert 45-min Rest Buffer on Day 02',
        description: 'Post-lunch temperature peaks around 2:00 PM. Adding a relaxing café stop minimizes midday sun exposure.',
        impact: '+3 Health Score pts',
        applied: false,
        actionType: 'rest_time'
      },
      {
        id: 'imp-2',
        title: 'Batch Coastal Chauffeur Legs',
        description: 'Pre-book dedicated cab for Day 03 to save ₹800 over piecemeal hailing.',
        impact: '+2 Health Score pts',
        applied: false,
        actionType: 'group_transit'
      },
      {
        id: 'imp-3',
        title: 'Pin Monsoon Rain Shelter Backup',
        description: 'Designate indoor art galleries as alternate venue for sudden showers.',
        impact: '+2 Health Score pts',
        applied: false,
        actionType: 'indoor_backup'
      }
    ]
  };
};

export const getSafetyInfo = (destination: string): SafetyInfo => {
  return {
    destination,
    emergencyContacts: [
      {
        label: 'Police Emergency Response',
        number: '112 / 100',
        category: 'police',
        description: 'National 24/7 unified emergency dispatch'
      },
      {
        label: 'Tourist Police Special Helpline',
        number: '+91 832 242 8560',
        category: 'tourist',
        description: 'Dedicated assistance for traveler inquiries and guidance'
      },
      {
        label: 'Ambulance & Medical Emergency',
        number: '108',
        category: 'medical',
        description: 'Free emergency ambulance & trauma response service'
      },
      {
        label: 'Women Safety Helpline',
        number: '1091',
        category: 'police',
        description: '24-hour confidential support and rapid response'
      },
      {
        label: 'Tourist Information Bureau',
        number: '+91 832 243 8750',
        category: 'tourist',
        description: 'Official verified travel advisory and permit inquiries'
      }
    ],
    touristSafetyTips: [
      'Always prefer metered app-cabs or government pre-paid taxi booths at transit terminals to ensure regulated fares.',
      'Drink bottled or purified water and avoid consuming pre-cut roadside fruits exposed to the sun.',
      'Red flags on beaches strictly indicate dangerous rip currents; only swim in designated safe zones monitored by lifeguards.',
      'Keep digital photo copies of your passport, ID, and travel insurance policy on your phone in offline mode.',
      'Wear modest attire covering shoulders and knees when visiting sacred temples, churches, or heritage religious sites.'
    ],
    localCustoms: [
      {
        title: 'Susegad Lifestyle & Siesta',
        description: 'Goa embraces a relaxed, peaceful pace. Many local heritage shops and bakeries pause between 1:30 PM and 4:00 PM.',
        icon: 'Coffee'
      },
      {
        title: 'Temple & Heritage Dress Code',
        description: 'Remove footwear before entering religious shrines. Shawls are often available at church entrances.',
        icon: 'Building2'
      },
      {
        title: 'Tipping Etiquette',
        description: 'A tip of 7-10% is customary at sit-down restaurants if a service charge is not already included on the bill.',
        icon: 'DollarSign'
      },
      {
        title: 'Photography Permissions',
        description: 'Always ask permission before photographing local artisans, fishermen, or private heritage residences.',
        icon: 'Camera'
      }
    ],
    usefulPhrases: [
      { phrase: 'Kitem Korta?', phonetic: 'kee-tem kor-tah', meaning: 'How are you / What are you doing?', category: 'greeting' },
      { phrase: 'Dev Borem Korum', phonetic: 'dev boh-rem koh-room', meaning: 'Thank you / God bless you', category: 'greeting' },
      { phrase: 'Hacho Bhaav Kitlem?', phonetic: 'hah-choh bhav keet-lem', meaning: 'How much does this cost?', category: 'dining' },
      { phrase: 'Maka Madt Zai', phonetic: 'mah-kah mahd zye', meaning: 'I would like fresh coconut water', category: 'dining' },
      { phrase: 'Rosto Khoy Asa?', phonetic: 'rohs-toh koy ah-sah', meaning: 'Where is the road / way to...?', category: 'directions' },
      { phrase: 'Mazaat Korat!', phonetic: 'mah-zaht koh-raht', meaning: 'Please help me!', category: 'emergency' }
    ],
    healthAdvisory: [
      'UV index is highest between 11:30 AM and 3:00 PM. Apply broad-spectrum sunscreen and wear polarized sunglasses.',
      'Stay well-hydrated with tender coconut water, electrolyte drinks, or filtered water during walking tours.',
      'Reputable pharmacies are widely accessible in main town centres; generic emergency medications are readily available.'
    ]
  };
};
