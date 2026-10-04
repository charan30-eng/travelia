import { TripContext, UserPreferences } from '../types/ai';
import { TraveliaPlace } from '../types/places';
import { WeatherForecast } from '../types/weather';

/**
 * Prompt builder for Travelia Travel Planner Engine.
 * 
 * CORE PRINCIPLE:
 * GEMINI REASONS. TRAVELIA SERVICES VERIFY AND CALCULATE.
 * 
 * Enforces:
 * - Real Places Data Layer (verified attractions, dining, and landmarks)
 * - Authoritative Route Intelligence (road distance and real transit times)
 * - Pacing & Rest Buffers (Trip Health Score optimization)
 * - Explicit distinction between hotel identity and room inventory
 * - Zero fabricated coordinates, ratings, or prices
 * - Deep Personalization based on UserPreferences (travelStyle, budgetPreference, walkingTolerance, etc.)
 */
export function buildTravelPlannerPrompt(
  destination: string,
  days: number,
  travelers: number,
  budgetTotal: number,
  currency: string = 'INR',
  preferences?: {
    pace?: 'relaxed' | 'moderate' | 'packed';
    transportPreference?: string;
    foodPreference?: string;
    activityPreferences?: string[];
  },
  verifiedPlaces?: TraveliaPlace[],
  weatherForecast?: WeatherForecast | null,
  userPreferences?: UserPreferences
): string {

  const verifiedList = verifiedPlaces && verifiedPlaces.length > 0
    ? verifiedPlaces.map(p => 
        `  - ${p.name} (${p.category}) | Rating: ${p.rating ?? 'N/A'} (${p.userRatingsTotal ?? 'N/A'} reviews) | Lat/Lng: ${p.latitude}, ${p.longitude} | Address: ${p.address || 'Central'} [Source: ${p.source}, Status: ${p.dataStatus}]`
      ).join('\n')
    : '  (No pre-queried places; all proposed stops must be validated against Places Data Layer)';

  const weatherSummary = weatherForecast && weatherForecast.days && weatherForecast.days.length > 0
    ? weatherForecast.days.map(d => 
        `  - Day ${d.dayNumber ?? 1}: ${d.condition || 'Clear'}, High ${d.temperatureMaxC ?? 'N/A'}°C, Rain Risk: ${d.precipitationProbability ?? 0}%`
      ).join('\n')
    : '  (Weather forecast unavailable; avoid extreme outdoor commitments without indoor alternatives)';

  return `You are Travelia's Expert Itinerary Planner.
Your mission is to construct a balanced, geographically coherent, and factually grounded ${days}-day itinerary for ${destination}.

==================================================
CORE PRINCIPLE:
GEMINI REASONS. TRAVELIA SERVICES VERIFY AND CALCULATE.
==================================================

1. FACTUAL GROUNDING:
   - Only include verified places and real attractions.
   - Do NOT invent fake tourist spots, artificial coordinates, or fabricated ratings.
   - If proposing a stop, it must be verifiable through the Places Data Layer.

2. GEOGRAPHIC ROUTE INTELLIGENCE:
   - Order activities within each day to minimize road travel time.
   - Cluster stops by neighborhood/region (e.g. North Goa vs South Goa; East Tokyo vs West Tokyo).
   - Never schedule zigzag travel back and forth across a city.
   - All transit estimates will be verified against Travelia's Route Engine (road routing).

3. SCHEDULE PACING & TRIP HEALTH:
   - Relaxed Pace: 2 to 3 quality stops per day with 90-minute leisure/meal buffers.
   - Moderate Pace: 3 to 4 stops per day with 60-minute buffers.
   - Packed Pace: Maximum 5 stops per day.
   - Schedule indoor cultural activities during the hottest midday hours or during high-precipitation periods.

4. BUDGETARY ACCURACY:
   - Total Trip Ceiling: ${currency} ${budgetTotal.toLocaleString('en-IN')} for ${travelers} traveler(s).
   - Differentiate free attractions (beaches, historic promenades, public parks) from ticketed monuments.
   - For accommodations: Hotel identity and location are verified, but room tariffs must come from confirmed inventory providers. If unpriced, state "Price unavailable".

5. PERSONALIZATION RULES (STRICTLY NON-SENSITIVE):
   - Relaxed traveler: Schedule fewer activities (2-3 stops/day), incorporate generous 90-minute buffers, start later (${userPreferences?.preferredStartTime || '10:00 AM'}).
   - Adventure traveler: Schedule more outdoor activities (treks, trails, watersports, scenic lookouts).
   - Budget traveler: Prioritize lower-cost or free alternatives (public viewpoints, heritage walks, local street food hubs).
   - Walking tolerance: If 'low', minimize walking distances, cluster stops nearby, note taxi/transit drops. If 'high', incorporate pedestrian paths.
   - Food preferences: Match dining stops to preferred cuisine: ${(userPreferences?.foodPreferences || []).join(', ') || preferences?.foodPreference || 'authentic regional'}.
   - Crowd preference: If 'avoid-crowds', schedule early morning / off-peak windows or tranquil scenic spots.
   - Start / End hours: Honor preferred active window from ${userPreferences?.preferredStartTime || '09:00 AM'} to ${userPreferences?.preferredEndTime || '09:00 PM'}.

====================
TRIP SPECIFICATIONS
====================
Destination: ${destination}
Duration: ${days} Days
Travelers: ${travelers}
Budget Ceiling: ${currency} ${budgetTotal.toLocaleString('en-IN')}
Travel Style: ${userPreferences?.travelStyle || 'balanced'}
Budget Preference: ${userPreferences?.budgetPreference || 'moderate'}
Preferred Pace: ${userPreferences?.pacePreference || preferences?.pace || 'moderate'}
Walking Tolerance: ${userPreferences?.walkingTolerance || 'moderate'}
Preferred Active Hours: ${userPreferences?.preferredStartTime || '09:00 AM'} – ${userPreferences?.preferredEndTime || '09:00 PM'}
Crowd Preference: ${userPreferences?.crowdPreference || 'balanced'}
Food Preferences: ${(userPreferences?.foodPreferences || []).join(', ') || preferences?.foodPreference || 'casual local dining'}
Activity Themes: ${(userPreferences?.activityPreferences || preferences?.activityPreferences || []).join(', ') || 'Sightseeing, Culture, Relaxation'}

VERIFIED CANDIDATE PLACES IN ${destination.toUpperCase()}:
${verifiedList}

DESTINATION WEATHER FORECAST:
${weatherSummary}


=========================
REQUIRED OUTPUT FORMAT (JSON ONLY)
=========================
Respond with a single valid JSON object structured as follows:
{
  "destination": "${destination}",
  "days": ${days},
  "travelers": ${travelers},
  "overallTheme": "Theme summary",
  "pacingStrategy": "Explanation of how stops were clustered to prevent transit fatigue",
  "itinerary": [
    {
      "dayNumber": 1,
      "title": "Day Title",
      "theme": "Day Theme",
      "region": "Specific neighborhood or district",
      "activities": [
        {
          "time": "09:00 AM",
          "activity": "Verified Stop Name",
          "location": "Address or neighborhood",
          "category": "sightseeing" | "food" | "relaxation" | "adventure",
          "duration": "2h",
          "estimatedCost": 200,
          "notes": "Practical tip or admission guidance"
        }
      ]
    }
  ],
  "warnings": [
    "Any timing or seasonal considerations"
  ]
}
`;
}
