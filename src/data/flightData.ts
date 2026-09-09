import { FlightSegment, FlightOption, AirportTransferInfo } from '../types';

export const DEFAULT_OUTBOUND_FLIGHT: FlightSegment = {
  id: 'flight-out-01',
  airline: 'IndiGo Airlines',
  airlineCode: '6E',
  flightNumber: '6E-2041',
  aircraft: 'Airbus A320neo',
  originAirport: 'Chhatrapati Shivaji Maharaj Int\'l Airport (T2)',
  originCity: 'Mumbai',
  originCode: 'BOM',
  destinationAirport: 'Manohar International Airport, Mopa (T1)',
  destinationCity: 'Goa',
  destinationCode: 'GOX',
  departureTime: '08:30 AM',
  departureDate: 'Nov 12, 2026',
  arrivalTime: '09:50 AM',
  arrivalDate: 'Nov 12, 2026',
  duration: '1h 20m',
  stops: 0,
  cabinClass: 'economy',
  seatAssignment: '12A, 12B (Window & Middle)',
  terminalDeparture: 'Terminal 2',
  terminalArrival: 'Terminal 1',
  gate: 'Gate 42B',
  baggage: {
    cabin: '7 kg included',
    checkIn: '15 kg per traveler'
  },
  pricePerPerson: 3850,
  status: 'on-time',
  bookingRef: 'TRV-6E882K',
  carbonEmissionKg: 78
};

export const DEFAULT_RETURN_FLIGHT: FlightSegment = {
  id: 'flight-ret-01',
  airline: 'Air India',
  airlineCode: 'AI',
  flightNumber: 'AI-854',
  aircraft: 'Airbus A321neo',
  originAirport: 'Manohar International Airport, Mopa (T1)',
  originCity: 'Goa',
  originCode: 'GOX',
  destinationAirport: 'Chhatrapati Shivaji Maharaj Int\'l Airport (T2)',
  destinationCity: 'Mumbai',
  destinationCode: 'BOM',
  departureTime: '06:45 PM',
  departureDate: 'Nov 16, 2026',
  arrivalTime: '08:05 PM',
  arrivalDate: 'Nov 16, 2026',
  duration: '1h 20m',
  stops: 0,
  cabinClass: 'economy',
  seatAssignment: '14D, 14E (Aisle & Middle)',
  terminalDeparture: 'Terminal 1',
  terminalArrival: 'Terminal 2',
  gate: 'Gate 05',
  baggage: {
    cabin: '7 kg included',
    checkIn: '20 kg included'
  },
  pricePerPerson: 4120,
  status: 'scheduled',
  bookingRef: 'TRV-AI991P',
  carbonEmissionKg: 82
};

export const ALTERNATIVE_FLIGHTS: FlightOption[] = [
  // Outbound options
  {
    id: 'alt-out-1',
    type: 'outbound',
    airline: 'IndiGo',
    flightNumber: '6E-2041',
    originCode: 'BOM',
    originCity: 'Mumbai',
    destCode: 'GOX',
    destCity: 'Goa',
    departureTime: '08:30 AM',
    arrivalTime: '09:50 AM',
    duration: '1h 20m',
    stops: 0,
    pricePerPerson: 3850,
    isBestValue: true,
    isFastest: true,
    carbonScore: 'eco',
    aircraft: 'A320neo',
    availableSeats: 6
  },
  {
    id: 'alt-out-2',
    type: 'outbound',
    airline: 'Akasa Air',
    flightNumber: 'QP-1342',
    originCode: 'BOM',
    originCity: 'Mumbai',
    destCode: 'GOX',
    destCity: 'Goa',
    departureTime: '10:45 AM',
    arrivalTime: '12:05 PM',
    duration: '1h 20m',
    stops: 0,
    pricePerPerson: 3420,
    isBestValue: true,
    isFastest: false,
    carbonScore: 'eco',
    aircraft: 'Boeing 737 MAX',
    availableSeats: 9
  },
  {
    id: 'alt-out-3',
    type: 'outbound',
    airline: 'Vistara',
    flightNumber: 'UK-842',
    originCode: 'BOM',
    originCity: 'Mumbai',
    destCode: 'GOI',
    destCity: 'Goa (Dabolim)',
    departureTime: '01:15 PM',
    arrivalTime: '02:40 PM',
    duration: '1h 25m',
    stops: 0,
    pricePerPerson: 4680,
    isBestValue: false,
    isFastest: false,
    carbonScore: 'standard',
    aircraft: 'A320neo',
    availableSeats: 4
  },
  {
    id: 'alt-out-4',
    type: 'outbound',
    airline: 'Air India',
    flightNumber: 'AI-681',
    originCode: 'DEL',
    originCity: 'Delhi',
    destCode: 'GOX',
    destCity: 'Goa',
    departureTime: '07:15 AM',
    arrivalTime: '09:55 AM',
    duration: '2h 40m',
    stops: 0,
    pricePerPerson: 5890,
    isBestValue: false,
    isFastest: true,
    carbonScore: 'standard',
    aircraft: 'A321neo',
    availableSeats: 5
  },
  {
    id: 'alt-out-5',
    type: 'outbound',
    airline: 'IndiGo',
    flightNumber: '6E-512',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destCode: 'GOX',
    destCity: 'Goa',
    departureTime: '09:00 AM',
    arrivalTime: '10:15 AM',
    duration: '1h 15m',
    stops: 0,
    pricePerPerson: 3200,
    isBestValue: true,
    isFastest: true,
    carbonScore: 'eco',
    aircraft: 'A320neo',
    availableSeats: 11
  },

  // Return options
  {
    id: 'alt-ret-1',
    type: 'return',
    airline: 'Air India',
    flightNumber: 'AI-854',
    originCode: 'GOX',
    originCity: 'Goa',
    destCode: 'BOM',
    destCity: 'Mumbai',
    departureTime: '06:45 PM',
    arrivalTime: '08:05 PM',
    duration: '1h 20m',
    stops: 0,
    pricePerPerson: 4120,
    isBestValue: true,
    isFastest: true,
    carbonScore: 'eco',
    aircraft: 'A321neo',
    availableSeats: 7
  },
  {
    id: 'alt-ret-2',
    type: 'return',
    airline: 'IndiGo',
    flightNumber: '6E-2419',
    originCode: 'GOX',
    originCity: 'Goa',
    destCode: 'BOM',
    destCity: 'Mumbai',
    departureTime: '09:30 PM',
    arrivalTime: '10:50 PM',
    duration: '1h 20m',
    stops: 0,
    pricePerPerson: 3690,
    isBestValue: true,
    isFastest: false,
    carbonScore: 'eco',
    aircraft: 'A320neo',
    availableSeats: 8
  },
  {
    id: 'alt-ret-3',
    type: 'return',
    airline: 'Akasa Air',
    flightNumber: 'QP-1345',
    originCode: 'GOX',
    originCity: 'Goa',
    destCode: 'BOM',
    destCity: 'Mumbai',
    departureTime: '04:10 PM',
    arrivalTime: '05:30 PM',
    duration: '1h 20m',
    stops: 0,
    pricePerPerson: 3510,
    isBestValue: false,
    isFastest: false,
    carbonScore: 'eco',
    aircraft: 'Boeing 737 MAX',
    availableSeats: 3
  },
  {
    id: 'alt-ret-4',
    type: 'return',
    airline: 'Vistara',
    flightNumber: 'UK-845',
    originCode: 'GOI',
    originCity: 'Goa (Dabolim)',
    destCode: 'DEL',
    destCity: 'Delhi',
    departureTime: '05:20 PM',
    arrivalTime: '08:00 PM',
    duration: '2h 40m',
    stops: 0,
    pricePerPerson: 6250,
    isBestValue: false,
    isFastest: true,
    carbonScore: 'standard',
    aircraft: 'A320neo',
    availableSeats: 4
  }
];

export const AIRPORT_TRANSFER_DATA: AirportTransferInfo = {
  airportName: 'Manohar International Airport (Mopa / GOX)',
  airportCode: 'GOX',
  distanceToHotelKm: 38,
  estimatedDriveMinutes: 48,
  transferOptions: [
    {
      mode: 'Pre-Paid AC Sedan / Cab',
      estimatedCost: 1600,
      duration: '45-50 mins',
      tip: 'Counters located at Arrival Exit 3. Fixed government-regulated tariffs.'
    },
    {
      mode: 'GoaMiles App Taxi',
      estimatedCost: 1420,
      duration: '50 mins',
      tip: 'Dedicated pickup bay located at Pillar 4. Bookable via official GoaMiles app.'
    },
    {
      mode: 'Kadamba Electric Airport Express Shuttle',
      estimatedCost: 200,
      duration: '1h 10 mins',
      tip: 'Hourly scheduled EV bus connecting GOX to Panaji & Calangute circle.'
    },
    {
      mode: 'Self-Drive Car Rental Pickup',
      estimatedCost: 1800,
      duration: 'Instant Keys',
      tip: 'Pickup booth inside P1 parking lot. Ideal for full itinerary mobility.'
    }
  ]
};

export const AIRPORT_GUIDE = {
  departureChecklist: [
    'DigiYatra enabled for biometrics facial scan (Gate 1 & 2 - under 90s entry)',
    'Free high-speed 45-minute Wi-Fi (Connect to "MOPA_AIRPORT_FREE_WIFI")',
    'Encalm Lounge available after security check near Gate 14',
    'Pre-book GoaMiles cab counter located right at Baggage Belt 3'
  ],
  baggagePolicyReminder: 'Cabin baggage max dimensions: 55cm × 35cm × 25cm. Power banks and loose lithium batteries must stay in cabin bag.',
  fareIntelligence: {
    status: 'Optimal Booking Window',
    savingsPercentage: 18,
    historicalAverageINR: 9750,
    currentBookedINR: 7970,
    advice: 'Roundtrip flight fare for your Nov 12–16 dates is currently ₹1,780 lower than historical averages for peak coastal season.'
  }
};
