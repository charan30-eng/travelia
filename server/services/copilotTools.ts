/**
 * TRAVELIA COPILOT BACKEND TOOLS
 * 
 * Exposes 12 structured backend capabilities as authoritative tools for Gemini reasoning:
 * 1. search_places
 * 2. get_place_details
 * 3. get_weather
 * 4. calculate_route
 * 5. calculate_route_matrix
 * 6. calculate_budget
 * 7. calculate_health_score
 * 8. optimize_itinerary
 * 9. simulate_what_if
 * 10. search_flights
 * 11. convert_currency
 * 12. get_trip_context
 * 
 * CORE PRINCIPLE:
 * GEMINI REASONS. TRAVELIA SERVICES VERIFY AND CALCULATE.
 * If a tool cannot provide information, it returns explicit 'unavailable' status.
 * Never fabricates places, prices, coordinates, ratings, weather, travel times, or flight schedules.
 */

import { TripContext, ToolExecutionResult } from '../types/ai';
import { placesService } from './placesService';
import { getAuthoritativeTripForecast } from './weatherService';
import { resolveLocation } from './locationResolutionService';
import { activeRouteProvider } from './routeEngine/routeProvider';
import { calculateRouteMatrix } from './routeIntelligenceService';
import { calculateTripCost, calculateDetailedTripCost } from './tripCostService';
import { calculateDynamicHealthScore } from './healthScoreService';
import { optimizeTripItinerary } from './itineraryOptimizer';
import { simulateWhatIfScenario } from './whatIfSimulator';
import { flightService } from './flightService';
import { currencyService } from './currencyService';
import { Coordinates } from '../types/route';
import { generateContextAwarePackingList } from './packingService';
import { personalizeTripItinerary, sanitizeUserPreferences } from './personalizationService';

export interface CopilotToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * 12 Structured Tool Declarations compatible with Gemini Function Calling
 */
export const COPILOT_TOOL_DECLARATIONS: CopilotToolDeclaration[] = [
  {
    name: 'search_places',
    description: 'Search verified places, attractions, activities, and dining in a destination using the Places Data Layer. Never invent places or ratings.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term (e.g. "historic forts", "museums", "vegetarian dining")' },
        destination: { type: 'string', description: 'Destination city (e.g. "Goa", "Tokyo", "Paris")' },
        category: { type: 'string', enum: ['sightseeing', 'food', 'relaxation', 'adventure', 'hotel', 'all'], description: 'Category filter' },
        limit: { type: 'number', description: 'Maximum number of verified places to return (default 5)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_place_details',
    description: 'Retrieve authoritative details for a specific place by place ID or name, including verified address, coordinates, rating, opening hours, and amenities.',
    parameters: {
      type: 'object',
      properties: {
        placeId: { type: 'string', description: 'Unique place identifier or name' }
      },
      required: ['placeId']
    }
  },
  {
    name: 'get_weather',
    description: 'Retrieve authoritative multi-day weather forecast, rain probabilities, wind speeds, and weather disruption flags for a destination. Do not guess weather.',
    parameters: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Target destination (defaults to active trip destination)' },
        startDate: { type: 'string', description: 'Trip start date (YYYY-MM-DD)' },
        days: { type: 'number', description: 'Number of trip days to forecast' }
      }
    }
  },
  {
    name: 'calculate_route',
    description: 'Calculate authoritative road distance and transit time between two locations. Uses verified road routing (OSRM / Google Routes) with honest straight-line fallback.',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Origin location name or "lat,lng"' },
        destination: { type: 'string', description: 'Destination location name or "lat,lng"' },
        mode: { type: 'string', enum: ['driving', 'walking', 'cycling', 'transit'], description: 'Travel mode (default: driving)' }
      },
      required: ['origin', 'destination']
    }
  },
  {
    name: 'calculate_route_matrix',
    description: 'Calculate multi-stop pairwise distance and travel time matrix across multiple origins and destinations.',
    parameters: {
      type: 'object',
      properties: {
        origins: { type: 'array', items: { type: 'string' }, description: 'List of origin place names or coordinates' },
        destinations: { type: 'array', items: { type: 'string' }, description: 'List of destination place names or coordinates' },
        mode: { type: 'string', enum: ['driving', 'walking'], description: 'Travel mode' }
      },
      required: ['origins', 'destinations']
    }
  },
  {
    name: 'calculate_budget',
    description: 'Calculate exact financial breakdown for the trip: hotel costs, flight prices, activity expenses, food, and transport, with provenance and optional foreign currency conversion.',
    parameters: {
      type: 'object',
      properties: {
        targetCurrency: { type: 'string', description: 'Optional target foreign currency code to convert total into (e.g. USD, EUR, GBP)' }
      }
    }
  },
  {
    name: 'calculate_health_score',
    description: 'Calculate the authoritative 6-dimension Trip Health Score (0-100) assessing budget efficiency, route fatigue, pacing, rest time, activity diversity, and weather compatibility.',
    parameters: {
      type: 'object',
      properties: {
        dayNumber: { type: 'number', description: 'Optional specific day number to analyze' }
      }
    }
  },
  {
    name: 'optimize_itinerary',
    description: 'Run the deterministic itinerary optimizer to eliminate backtracking, balance daily schedules, and unlock factual cost savings while preserving user constraints.',
    parameters: {
      type: 'object',
      properties: {
        targetSavingsPercentage: { type: 'number', description: 'Target savings ratio (e.g. 0.15 for 15%)' },
        targetBudget: { type: 'number', description: 'Specific monetary budget ceiling' },
        preserveKeywords: { type: 'array', items: { type: 'string' }, description: 'Activity names or categories that MUST NOT be removed (e.g. ["beach"])' },
        targetDay: { type: 'number', description: 'Specific day number to optimize' },
        targetPace: { type: 'string', enum: ['relaxed', 'moderate', 'packed'], description: 'Target pacing' }
      }
    }
  },
  {
    name: 'simulate_what_if',
    description: 'Simulate a What-If hypothetical scenario (e.g. budget change, weather rain replan, activity removal, pace change) and compute projected state without altering the original trip.',
    parameters: {
      type: 'object',
      properties: {
        scenarioType: { type: 'string', enum: ['budget_change', 'weather_disruption', 'activity_removal', 'pace_change', 'hotel_change'], description: 'Type of scenario' },
        parameters: { type: 'object', description: 'Scenario parameters (e.g. targetBudget, dayNumber, removeActivityId)' }
      },
      required: ['scenarioType']
    }
  },
  {
    name: 'search_flights',
    description: 'Search authentic roundtrip flight offers by origin, destination, dates, and passengers. Never hallucinates flight numbers or prices for unserviced routes.',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Departure airport city or code (e.g. "Mumbai", "BOM")' },
        destination: { type: 'string', description: 'Arrival destination (e.g. "Goa", "Tokyo")' },
        departureDate: { type: 'string', description: 'Outbound departure date (YYYY-MM-DD)' },
        returnDate: { type: 'string', description: 'Return departure date (YYYY-MM-DD)' },
        passengers: { type: 'number', description: 'Number of passengers' },
        cabinClass: { type: 'string', enum: ['economy', 'premium', 'business'], description: 'Cabin class' }
      },
      required: ['origin']
    }
  },
  {
    name: 'convert_currency',
    description: 'Convert amounts between currencies using live provider foreign exchange rates with timestamp tracking.',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Monetary amount to convert' },
        fromCurrency: { type: 'string', description: 'Source currency code (default: trip currency)' },
        toCurrency: { type: 'string', description: 'Target currency code (e.g. USD, EUR, JPY, GBP)' }
      },
      required: ['amount', 'toCurrency']
    }
  },
  {
    name: 'get_trip_context',
    description: 'Retrieve current verified trip context facts including destination, travelers, duration, budget status, hotel details, and complete day-by-day itinerary schedule.',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
];

export const PHASE8_TOOL_DECLARATIONS: CopilotToolDeclaration[] = [
  {
    name: 'generate_packing_list',
    description: 'Generate a context-aware packing list calibrated against 5 dimensions: weather conditions, scheduled activities, trip duration, destination attributes, and travel style.',
    parameters: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Destination name (default: trip destination)' },
        duration: { type: 'number', description: 'Duration in days' },
        tripStyle: { type: 'string', description: 'Travel style (e.g. relaxed, adventure, budget, luxury)' }
      }
    }
  },
  {
    name: 'personalize_itinerary',
    description: 'Personalize an itinerary based on non-sensitive user preferences (travelStyle, budgetPreference, walkingTolerance, preferredStartTime, preferredEndTime, foodPreferences, crowdPreference, pacePreference).',
    parameters: {
      type: 'object',
      properties: {
        travelStyle: { type: 'string', enum: ['relaxed', 'fast-paced', 'cultural', 'adventure', 'luxury', 'budget', 'balanced'] },
        budgetPreference: { type: 'string', enum: ['budget', 'moderate', 'luxury'] },
        pacePreference: { type: 'string', enum: ['relaxed', 'moderate', 'packed'] },
        walkingTolerance: { type: 'string', enum: ['low', 'moderate', 'high'] },
        preferredStartTime: { type: 'string', description: 'Preferred start time (e.g. 09:00 AM)' },
        preferredEndTime: { type: 'string', description: 'Preferred end time (e.g. 09:00 PM)' },
        foodPreferences: { type: 'array', items: { type: 'string' } },
        crowdPreference: { type: 'string', enum: ['avoid-crowds', 'popular-spots', 'balanced'] }
      }
    }
  }
];

export const ALL_TOOL_DECLARATIONS: CopilotToolDeclaration[] = [
  ...COPILOT_TOOL_DECLARATIONS,
  ...PHASE8_TOOL_DECLARATIONS
];



/**
 * Helper to resolve coordinates from string or [lat, lng] array
 */
function parseCoordinates(input: any, destination: string): Coordinates | null {
  if (!input) return null;
  if (typeof input === 'object' && 'latitude' in input && 'longitude' in input) {
    return input;
  }
  if (Array.isArray(input) && input.length === 2 && typeof input[0] === 'number') {
    return { latitude: input[0], longitude: input[1] };
  }
  if (typeof input === 'string') {
    const coordsMatch = input.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordsMatch) {
      return { latitude: parseFloat(coordsMatch[1]), longitude: parseFloat(coordsMatch[3]) };
    }
    const resolved = resolveLocation({ name: input, location: input, destination });
    return resolved;
  }
  return null;
}

/**
 * Execute an Authoritative Backend Tool
 */
export async function executeCopilotTool(
  toolName: string,
  args: Record<string, any>,
  tripContext: TripContext
): Promise<ToolExecutionResult> {
  const retrievedAt = new Date().toISOString();

  try {
    switch (toolName) {
      // -----------------------------------------------------------------------
      // 1. search_places
      // -----------------------------------------------------------------------
      case 'search_places': {
        const dest = (args.destination || tripContext.destination || '').trim();
        const query = (args.query || '').trim();
        const limit = typeof args.limit === 'number' ? args.limit : 5;

        const res = await placesService.searchPlaces({
          destination: dest,
          query,
          category: args.category === 'all' ? undefined : args.category,
          limit
        });

        const places = (res.places || []).map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          address: p.address,
          latitude: p.latitude,
          longitude: p.longitude,
          rating: p.rating ?? null,
          reviewsCount: p.userRatingsTotal ?? null,
          priceLevel: p.priceLevel ?? null,
          estimatedCost: p.estimatedCost ?? null,
          openingHours: p.openingHours ?? null,
          dataStatus: p.dataStatus
        }));

        return {
          tool: toolName,
          input: args,
          output: {
            destination: dest,
            query,
            totalCount: places.length,
            places
          },
          source: res.source,
          dataStatus: res.dataStatus as any,
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 2. get_place_details
      // -----------------------------------------------------------------------
      case 'get_place_details': {
        const placeId = (args.placeId || '').trim();
        const details = await placesService.getPlaceDetails(placeId);

        if (!details) {
          return {
            tool: toolName,
            input: args,
            output: { error: 'NOT_FOUND', message: `Place details unavailable for "${placeId}"` },
            source: 'places_service',
            dataStatus: 'unavailable',
            retrievedAt
          };
        }

        return {
          tool: toolName,
          input: args,
          output: details,
          source: details.source,
          dataStatus: details.dataStatus as any,
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 3. get_weather
      // -----------------------------------------------------------------------
      case 'get_weather': {
        const dest = args.destination || tripContext.destination;
        const startDate = args.startDate || tripContext.startDate;
        const days = args.days || tripContext.days || 4;

        const forecast = await getAuthoritativeTripForecast(dest, startDate, days);
        return {
          tool: toolName,
          input: args,
          output: {
            destination: forecast.location?.name || dest,
            availability: forecast.availability,
            days: forecast.days
          },
          source: forecast.source,
          dataStatus: forecast.availability as any,
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 4. calculate_route
      // -----------------------------------------------------------------------
      case 'calculate_route': {
        const dest = tripContext.destination || '';
        const origCoords = parseCoordinates(args.origin, dest);
        const destCoords = parseCoordinates(args.destination, dest);
        const mode = args.mode || 'driving';

        if (!origCoords || !destCoords) {
          return {
            tool: toolName,
            input: args,
            output: {
              distanceKm: null,
              travelTimeMinutes: null,
              error: 'COORDINATES_UNRESOLVED',
              message: `Could not resolve verified coordinates for "${args.origin}" or "${args.destination}". Travelia strictly avoids inventing fake coordinates.`
            },
            source: 'route_service',
            dataStatus: 'unavailable',
            retrievedAt
          };
        }

        const routeResult = await activeRouteProvider.getRoute(origCoords, destCoords, mode);
        const distanceKm = routeResult.roadDistanceKm !== null ? routeResult.roadDistanceKm : routeResult.distanceKm;

        return {
          tool: toolName,
          input: args,
          output: {
            origin: args.origin,
            destination: args.destination,
            mode,
            distanceKm,
            travelTimeMinutes: routeResult.travelTimeMinutes,
            distanceType: routeResult.distanceType,
            provider: routeResult.provider,
            dataStatus: routeResult.dataStatus
          },
          source: routeResult.provider,
          dataStatus: routeResult.dataStatus as any,
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 5. calculate_route_matrix
      // -----------------------------------------------------------------------
      case 'calculate_route_matrix': {
        const dest = tripContext.destination || '';
        const rawOrigins: string[] = Array.isArray(args.origins) ? args.origins : [];
        const rawDests: string[] = Array.isArray(args.destinations) ? args.destinations : [];
        const mode = args.mode || 'driving';

        const originCoords = rawOrigins.map(o => parseCoordinates(o, dest)).filter(Boolean) as Coordinates[];
        const destCoords = rawDests.map(d => parseCoordinates(d, dest)).filter(Boolean) as Coordinates[];

        if (originCoords.length === 0 || destCoords.length === 0) {
          return {
            tool: toolName,
            input: args,
            output: { error: 'EMPTY_COORDINATES', message: 'Unable to resolve origin or destination coordinates.' },
            source: 'route_service',
            dataStatus: 'unavailable',
            retrievedAt
          };
        }

        const matrix = await calculateRouteMatrix(originCoords, destCoords, mode);
        return {
          tool: toolName,
          input: args,
          output: matrix,
          source: matrix.provider,
          dataStatus: matrix.dataStatus as any,
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 6. calculate_budget
      // -----------------------------------------------------------------------
      case 'calculate_budget': {
        const detailed = await calculateDetailedTripCost(tripContext, args.targetCurrency);
        return {
          tool: toolName,
          input: args,
          output: detailed,
          source: 'trip_cost_service',
          dataStatus: 'calculated',
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 7. calculate_health_score
      // -----------------------------------------------------------------------
      case 'calculate_health_score': {
        let weatherForecast = null;
        try {
          weatherForecast = await getAuthoritativeTripForecast(tripContext.destination, tripContext.startDate, tripContext.days);
        } catch {}

        const health = calculateDynamicHealthScore(tripContext, undefined, weatherForecast);
        return {
          tool: toolName,
          input: args,
          output: {
            overallScore: health.overallScore,
            ratingLabel: health.ratingLabel,
            summary: health.summary,
            breakdown: health.breakdown
          },
          source: 'health_score_service',
          dataStatus: 'calculated',
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 8. optimize_itinerary
      // -----------------------------------------------------------------------
      case 'optimize_itinerary': {
        const targetSavings = typeof args.targetSavingsPercentage === 'number' ? args.targetSavingsPercentage : 0.15;
        const opt = optimizeTripItinerary(tripContext, targetSavings, {
          targetBudget: args.targetBudget,
          preserveKeywords: args.preserveKeywords,
          targetDay: args.targetDay,
          targetPace: args.targetPace
        });

        return {
          tool: toolName,
          input: args,
          output: {
            summary: opt.summary,
            estimatedSavings: opt.estimatedSavings,
            healthScoreBefore: opt.healthScoreBefore,
            healthScoreAfter: opt.healthScoreAfter,
            distanceSavedKm: opt.distanceSavedKm,
            travelTimeSavedHours: opt.travelTimeSavedHours,
            changesCount: opt.changes.length,
            changes: opt.changes
          },
          source: 'itinerary_optimizer',
          dataStatus: 'calculated',
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 9. simulate_what_if
      // -----------------------------------------------------------------------
      case 'simulate_what_if': {
        const scenario = simulateWhatIfScenario({
          tripContext,
          scenarioType: args.scenarioType,
          parameters: args.parameters || {}
        });

        return {
          tool: toolName,
          input: args,
          output: scenario,
          source: 'what_if_simulator',
          dataStatus: 'calculated',
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 10. search_flights
      // -----------------------------------------------------------------------
      case 'search_flights': {
        const origin = args.origin || 'Mumbai';
        const destination = args.destination || tripContext.destination;
        const res = await flightService.searchFlights({
          origin,
          destination,
          departureDate: args.departureDate || tripContext.startDate,
          returnDate: args.returnDate || tripContext.endDate,
          passengers: args.passengers || tripContext.travelers || 2,
          cabinClass: args.cabinClass || 'economy'
        });

        return {
          tool: toolName,
          input: args,
          output: {
            success: res.success,
            origin: res.origin,
            destination: res.destination,
            outboundCount: res.outboundFlights.length,
            returnCount: res.returnFlights.length,
            outboundFlights: res.outboundFlights,
            returnFlights: res.returnFlights
          },
          source: res.source,
          dataStatus: res.dataStatus,
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 11. convert_currency
      // -----------------------------------------------------------------------
      case 'convert_currency': {
        const amount = Number(args.amount) || 0;
        const from = args.fromCurrency || tripContext.budget?.currency || 'INR';
        const to = args.toCurrency || 'USD';

        const conv = await currencyService.convert(amount, from, to);
        return {
          tool: toolName,
          input: args,
          output: conv,
          source: conv.source,
          dataStatus: conv.dataStatus,
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 12. get_trip_context
      // -----------------------------------------------------------------------
      case 'get_trip_context': {
        const currency = tripContext.budget?.currency || 'INR';
        const cost = calculateTripCost(tripContext);
        const daySummaries = (tripContext.itinerary || []).map(d => ({
          dayNumber: d.dayNumber,
          title: d.title,
          theme: d.theme,
          activityCount: (d.activities || []).length,
          activities: (d.activities || []).map(a => `${a.time ? `${a.time}: ` : ''}${a.activity} (${a.location || 'Local'})`)
        }));

        return {
          tool: toolName,
          input: args,
          output: {
            destination: tripContext.destination,
            country: tripContext.country,
            days: tripContext.days,
            travelers: tripContext.travelers,
            travelDates: tripContext.travelDates,
            budget: {
              currency,
              declaredTotal: tripContext.budget?.total || 0,
              calculatedCost: cost.totalCost,
              spent: tripContext.budget?.spent || cost.totalCost,
              remaining: Math.max(0, (tripContext.budget?.total || 0) - cost.totalCost),
              isOverBudget: cost.totalCost > (tripContext.budget?.total || 0)
            },
            hotel: tripContext.existingBookings?.hotel || tripContext.hotels?.[0]?.name || 'Not booked',
            flights: tripContext.existingBookings?.flights || 'Not booked',
            itinerary: daySummaries
          },
          source: 'trip_context',
          dataStatus: 'live',
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 13. generate_packing_list
      // -----------------------------------------------------------------------
      case 'generate_packing_list': {

        const dest = (args.destination || tripContext.destination || '').trim();
        const duration = typeof args.duration === 'number' ? args.duration : (tripContext.days || 3);
        const tripStyle = args.tripStyle || tripContext.userPreferences?.travelStyle || 'balanced';

        const allActivities = (tripContext.itinerary || []).flatMap(d => d.activities || []);
        const weatherForecast = (tripContext as any).weatherForecast?.days || null;

        const packingResult = generateContextAwarePackingList({
          destination: dest,
          duration,
          tripStyle,
          activities: allActivities,
          weatherForecast,
          userPreferences: tripContext.userPreferences
        });

        return {
          tool: toolName,
          input: args,
          output: packingResult,
          source: 'packing_service',
          dataStatus: 'calculated',
          retrievedAt
        };
      }

      // -----------------------------------------------------------------------
      // 14. personalize_itinerary
      // -----------------------------------------------------------------------
      case 'personalize_itinerary': {
        const sanitizedResult = sanitizeUserPreferences(args);
        const result = personalizeTripItinerary(tripContext, sanitizedResult.sanitized);

        return {
          tool: toolName,
          input: args,
          output: {
            appliedPersonalizations: result.appliedPersonalizations,
            preferenceSummary: result.preferenceSummary,
            totalEstimatedSavings: result.totalEstimatedSavings,
            rejectedSensitiveFields: sanitizedResult.rejectedSensitiveFields
          },
          source: 'personalization_service',
          dataStatus: 'calculated',
          retrievedAt
        };
      }

      default:

        return {
          tool: toolName,
          input: args,
          output: { error: 'UNKNOWN_TOOL', message: `Tool "${toolName}" is not recognized` },
          source: 'copilot_tools',
          dataStatus: 'unavailable',
          retrievedAt
        };
    }
  } catch (err: any) {
    console.error(`[CopilotTools] Tool execution error for "${toolName}":`, err);
    return {
      tool: toolName,
      input: args,
      output: { error: 'TOOL_EXECUTION_ERROR', message: err.message || 'Execution failed' },
      source: 'copilot_tools',
      dataStatus: 'unavailable',
      retrievedAt
    };
  }
}
