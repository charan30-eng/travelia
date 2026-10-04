/**
 * TRAVELIA FLIGHT SEARCH & AIRFARE TYPES
 * 
 * Supports search by origin, destination, departure date, return date, passengers.
 * Returns authoritative flight offers with transparent pricing and data status.
 */

export type FlightDataStatus = 'live' | 'cached' | 'demo' | 'unavailable';

export type FlightAvailability = 'available' | 'limited' | 'sold_out' | 'unavailable';

export interface FlightPrice {
  amount: number;
  currency: string;
  pricePerPerson: number;
  totalPrice: number;
  taxesIncluded: boolean;
  cabinClass: 'economy' | 'premium' | 'business';
}

export interface FlightLeg {
  flightNumber: string;
  airline: string;
  airlineCode: string;
  aircraft?: string;
  originAirport: string;
  originCity: string;
  originCode: string;
  destinationAirport: string;
  destinationCity: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate: string;
  duration: string;
  stops: number;
}

export interface NormalizedFlightOffer {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  aircraft?: string;
  originAirport: string;
  originCity: string;
  originCode: string;
  destinationAirport: string;
  destinationCity: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate: string;
  duration: string;
  stops: number;
  cabinClass: 'economy' | 'premium' | 'business';
  price: FlightPrice;
  availability: FlightAvailability;
  availableSeats?: number;
  source: 'amadeus' | 'skyscanner' | 'demo' | 'unavailable';
  retrievedAt: string;
  dataStatus: FlightDataStatus;
  carbonEmissionKg?: number;
  baggage?: {
    cabin: string;
    checkIn: string;
  };
  seatAssignment?: string;
  bookingRef?: string;
  terminalDeparture?: string;
  terminalArrival?: string;
  gate?: string;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: 'economy' | 'premium' | 'business';
}


export interface FlightSearchResponse {
  success: boolean;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: 'economy' | 'premium' | 'business';
  source: 'amadeus' | 'skyscanner' | 'demo' | 'unavailable';
  dataStatus: FlightDataStatus;
  retrievedAt: string;
  outboundFlights: NormalizedFlightOffer[];
  returnFlights: NormalizedFlightOffer[];
  isSameCity?: boolean;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
