import { TripContext } from '../types/ai';
import { TripPlan } from '../../src/types';

export interface TripCostBreakdown {
  totalCost: number;
  activityCost: number;
  hotelCost: number;
  flightsCost: number;
  foodCost: number;
  transportCost: number;
  miscCost: number;
}

/**
 * Deterministic Trip Cost Calculation Engine
 * Computes exact financial expenditures directly from active trip data:
 * - Activity costs: sum of all estimatedCost values across itinerary days
 * - Hotel costs: based on explicit hotel budget or selected hotel rate * nights
 * - Category budgets: flights, food, transportation, miscellaneous
 *
 * NEVER invents or approximates costs; calculates deterministically from trip structure.
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
    hotelCost = (Number(selected?.pricePerNight) || 0) * nights;
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
 * Compare two trip states (e.g. Before vs After optimization) and compute factual savings.
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
