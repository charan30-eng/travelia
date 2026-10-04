/**
 * TRAVELIA TRIP COST CALCULATION ENGINE
 * 
 * Computes exact financial expenditures directly from active trip data:
 * - Activity costs: sum of all estimatedCost values across itinerary days
 * - Hotel costs: based on explicit room rate or allocated budget
 * - Flights, food, transportation, miscellaneous
 * - Dual-currency conversion using dynamic currencyService
 * 
 * Every monetary component carries:
 * - amount
 * - currency
 * - source
 * - confidence/status ('verified' | 'estimated' | 'budget_cap' | 'unpriced' | 'demo')
 */

import { TripContext } from '../types/ai';
import { TripPlan } from '../../src/types';
import { currencyService } from './currencyService';

export interface TripCostBreakdown {
  totalCost: number;
  activityCost: number;
  hotelCost: number;
  flightsCost: number;
  foodCost: number;
  transportCost: number;
  miscCost: number;
}

export type MonetaryConfidence = 'verified' | 'estimated' | 'budget_cap' | 'unpriced' | 'demo';

export interface MonetaryValue {
  amount: number;
  currency: string;
  source: string;
  status: MonetaryConfidence;
}

export interface DetailedCostBreakdown extends TripCostBreakdown {
  currency: string;
  items: {
    hotel: MonetaryValue;
    flights: MonetaryValue;
    activities: MonetaryValue;
    food: MonetaryValue;
    transportation: MonetaryValue;
    miscellaneous: MonetaryValue;
    total: MonetaryValue;
  };
  converted?: {
    targetCurrency: string;
    rate: number;
    total: number;
    retrievedAt: string;
    dataStatus: string;
  };
}

/**
 * Deterministic Trip Cost Calculation Engine (Standard)
 */
export function calculateTripCost(trip: TripContext | TripPlan): TripCostBreakdown {
  if (!trip) {
    return {
      totalCost: 0,
      activityCost: 0,
      hotelCost: 0,
      flightsCost: 0,
      foodCost: 0,
      transportCost: 0,
      miscCost: 0
    };
  }

  // 1. Calculate Activity Cost directly from itinerary
  let activityCost = 0;
  if (Array.isArray(trip.itinerary)) {
    for (const day of trip.itinerary) {
      if (Array.isArray(day?.activities)) {
        for (const act of day.activities) {
          const cost = Number(act?.estimatedCost);
          if (!isNaN(cost) && cost > 0) {
            activityCost += cost;
          }
        }
      }
    }
  }

  // 2. Hotel Cost
  let hotelCost = 0;
  if (trip.budget?.hotel && Number(trip.budget.hotel) > 0) {
    hotelCost = Number(trip.budget.hotel);
  } else if ('hotels' in trip && Array.isArray((trip as any).hotels) && (trip as any).hotels.length > 0) {
    const selected = (trip as any).hotels.find((h: any) => h.selected) || (trip as any).hotels[0];
    const nights = (trip as any).nights || Math.max(1, (trip.days || 1) - 1);
    const perNight = Number(selected?.price?.perNight) || Number(selected?.price?.amount) || Number(selected?.pricePerNight) || 0;
    const totalExplicit = Number(selected?.price?.total);
    hotelCost = (!isNaN(totalExplicit) && totalExplicit > 0) ? totalExplicit : perNight * nights;
  } else {
    hotelCost = Number(trip.budget?.hotel) || 0;
  }

  // 3. Category Expenses
  const flightsCost = Number(trip.budget?.flights) || 0;
  const foodCost = Number(trip.budget?.food) || 0;
  const transportCost = Number(trip.budget?.transportation) || 0;
  const miscCost = Number(trip.budget?.miscellaneous) || 0;

  const totalCost = activityCost + hotelCost + flightsCost + foodCost + transportCost + miscCost;

  return {
    totalCost,
    activityCost,
    hotelCost,
    flightsCost,
    foodCost,
    transportCost,
    miscCost
  };
}

/**
 * Detailed Trip Cost with complete provenance and confidence metadata
 */
export async function calculateDetailedTripCost(
  trip: TripContext | TripPlan,
  targetCurrency?: string
): Promise<DetailedCostBreakdown> {
  const base = calculateTripCost(trip);
  const currency = (trip as any).currency || 'INR';

  // Determine Hotel Provenance
  let hotelStatus: MonetaryConfidence = 'budget_cap';
  let hotelSource = 'budget_allocation';
  if ('hotels' in trip && Array.isArray((trip as any).hotels) && (trip as any).hotels.length > 0) {
    const selected = (trip as any).hotels.find((h: any) => h.selected) || (trip as any).hotels[0];
    if (selected?.price?.total != null) {
      hotelStatus = selected.price.source === 'demo' ? 'demo' : 'verified';
      hotelSource = selected.price.source;
    } else if (selected?.pricePerNight != null) {
      hotelStatus = selected.source === 'demo' ? 'demo' : 'estimated';
      hotelSource = selected.source || 'hotel_rate';
    } else {
      hotelStatus = 'unpriced';
      hotelSource = 'hotel_unpriced';
    }
  }

  // Determine Flights Provenance
  let flightStatus: MonetaryConfidence = base.flightsCost > 0 ? 'budget_cap' : 'unpriced';
  let flightSource = 'flight_allocation';
  if ((trip as any).flightDetails?.price?.totalPrice) {
    flightStatus = (trip as any).flightDetails.source === 'demo' ? 'demo' : 'verified';
    flightSource = (trip as any).flightDetails.source;
  }

  const items = {
    hotel: {
      amount: base.hotelCost,
      currency,
      source: hotelSource,
      status: hotelStatus
    },
    flights: {
      amount: base.flightsCost,
      currency,
      source: flightSource,
      status: flightStatus
    },
    activities: {
      amount: base.activityCost,
      currency,
      source: 'activity_catalog',
      status: 'estimated' as MonetaryConfidence
    },
    food: {
      amount: base.foodCost,
      currency,
      source: 'budget_allocation',
      status: 'budget_cap' as MonetaryConfidence
    },
    transportation: {
      amount: base.transportCost,
      currency,
      source: 'budget_allocation',
      status: 'budget_cap' as MonetaryConfidence
    },
    miscellaneous: {
      amount: base.miscCost,
      currency,
      source: 'budget_allocation',
      status: 'budget_cap' as MonetaryConfidence
    },
    total: {
      amount: base.totalCost,
      currency,
      source: 'aggregated_deterministic',
      status: (hotelStatus === 'verified' && flightStatus === 'verified') ? 'verified' : 'estimated' as MonetaryConfidence
    }
  };

  const detailed: DetailedCostBreakdown = {
    ...base,
    currency,
    items
  };

  // Convert to foreign currency if requested
  if (targetCurrency && targetCurrency.toUpperCase() !== currency.toUpperCase()) {
    try {
      const conversion = await currencyService.convert(base.totalCost, currency, targetCurrency);
      detailed.converted = {
        targetCurrency: targetCurrency.toUpperCase(),
        rate: conversion.rate,
        total: conversion.convertedAmount,
        retrievedAt: conversion.retrievedAt,
        dataStatus: conversion.dataStatus
      };
    } catch (err) {
      console.warn('[tripCostService] Currency conversion error:', err);
    }
  }

  return detailed;
}

/**
 * Compare two trip states and compute factual savings.
 */
export function calculateTripCostDelta(
  beforeTrip: TripContext | TripPlan,
  afterTrip: TripContext | TripPlan
): {
  costBefore: number;
  costAfter: number;
  actualSavings: number;
  activityCostBefore: number;
  activityCostAfter: number;
  activitySavings: number;
} {
  const before = calculateTripCost(beforeTrip);
  const after = calculateTripCost(afterTrip);

  const actualSavings = Math.max(0, before.totalCost - after.totalCost);
  const activitySavings = Math.max(0, before.activityCost - after.activityCost);

  return {
    costBefore: before.totalCost,
    costAfter: after.totalCost,
    actualSavings,
    activityCostBefore: before.activityCost,
    activityCostAfter: after.activityCost,
    activitySavings
  };
}
