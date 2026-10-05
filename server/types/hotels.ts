/**
 * TRAVELIA HOTEL & ROOM INVENTORY TYPES
 * 
 * Separates HOTEL IDENTITY (name, coordinates, rating, photos, address)
 * from HOTEL ROOM INVENTORY (live price, room types, availability, taxes).
 * 
 * Places API provides Identity; Inventory Provider provides Pricing & Availability.
 * If pricing is unavailable, price is strictly null. Never fabricate room tariffs.
 */

export type HotelDataStatus = 'live' | 'cached' | 'demo' | 'partial' | 'unavailable' | 'fallback';


export type HotelAvailability = 'available' | 'few_rooms_left' | 'sold_out' | 'unavailable';

export interface HotelPrice {
  amount: number | null;
  currency: string;
  perNight: number | null;
  total: number | null;
  nights: number;
  taxesIncluded: boolean;
  source: 'booking' | 'agoda' | 'expedia' | 'direct' | 'demo' | 'unavailable';
  retrievedAt: string;
}

export interface HotelRoomOption {
  id: string;
  roomType: string;
  bedType?: string;
  maxGuests?: number;
  pricePerNight: number | null;
  totalPrice: number | null;
  cancellationPolicy?: string;
  breakfastIncluded?: boolean;
  taxesIncluded?: boolean;
}

export interface NormalizedHotel {
  id: string;
  placeId?: string;
  name: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewsCount?: number;
  photos?: string[];
  websiteUri?: string;
  phoneNumber?: string;
  source: 'google' | 'hotelbeds' | 'booking' | 'demo' | 'mixed' | 'unavailable';
  price: HotelPrice | null;
  availability: HotelAvailability;
  rooms?: HotelRoomOption[];
  amenities?: string[];
  description?: string;
  tag?: string;
  selected?: boolean;
  retrievedAt: string;
  dataStatus: HotelDataStatus;
}

export interface HotelSearchQuery {
  destination: string;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number;
  rooms?: number;
  category?: 'budget' | 'mid' | 'luxury';
  limit?: number;
}

export interface HotelSearchResponse {
  success: boolean;
  destination: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights: number;
  guests: number;
  source: string;
  dataStatus: HotelDataStatus;
  retrievedAt: string;
  totalCount: number;
  hotels: NormalizedHotel[];
  error?: {
    code: string;
    message: string;
  };
}
