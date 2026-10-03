import { TripContext, WeatherReplanRequest, WeatherReplanResponse, ActivityChange, OptimizationResult } from '../types/ai';
import { calculateDynamicHealthScore } from './healthScoreService';
import { calculateTripCost } from './tripCostService';
import { calculateTripRouteMetrics } from '../../src/data/geoRouting';
import { ItineraryDay } from '../../src/types';

export function replanItineraryForWeather(req: WeatherReplanRequest): WeatherReplanResponse {
  const { tripContext, dayNumber, condition, rainChancePercent } = req;
  const healthBefore = calculateDynamicHealthScore(tripContext);
  const costBefore = calculateTripCost(tripContext);
  const routeBefore = calculateTripRouteMetrics(tripContext);

  const targetDay = tripContext.itinerary.find(d => d.dayNumber === dayNumber) || tripContext.itinerary[0];
  const revisedDay: ItineraryDay = JSON.parse(JSON.stringify(targetDay));

  const changes: ActivityChange[] = [];
  const destination = tripContext.destination.split(',')[0];

  revisedDay.activities.forEach((act, idx) => {
    const actLower = act.activity.toLowerCase();
    const isOutdoor = actLower.includes('beach') || 
                      actLower.includes('watersport') || 
                      actLower.includes('scuba') || 
                      actLower.includes('kayak') || 
                      actLower.includes('fort') || 
                      actLower.includes('hike') || 
                      actLower.includes('outdoor') ||
                      actLower.includes('swim');

    if (isOutdoor && changes.length < 3) {
      const travelers = Math.max(1, tripContext.travelers || 2);
      let indoorName = `${destination} Regional Heritage Museum & Art Gallery`;
      let indoorLocation = `Central ${destination} Cultural Enclave`;
      let indoorReason = `Precipitation risk (${rainChancePercent}%). Swapped outdoor activity for indoor air-conditioned heritage museum.`;
      let newCost = 250 * travelers;

      if (actLower.includes('lunch') || actLower.includes('dinner') || actLower.includes('food')) {
        indoorName = `Covered Veranda Seafood Tasting & Cultural Spice Workshop`;
        indoorLocation = `Sheltered Heritage Estate, ${destination}`;
        indoorReason = `Rain forecast during meal hour. Moved to sheltered covered botanical veranda.`;
        newCost = (Number(act.estimatedCost) && Number(act.estimatedCost) > 0) ? Number(act.estimatedCost) : 650 * travelers;
      } else if (actLower.includes('sunset') || actLower.includes('stroll')) {
        indoorName = `Panoramic Sheltered Sea-Facing Lounge & Live Acoustic Set`;
        indoorLocation = `Coastal Cliff Veranda, ${destination}`;
        indoorReason = `High rain likelihood during sunset. Relocated to weather-protected lounge with floor-to-ceiling glass vista.`;
        newCost = 350 * travelers;
      }

      const oldName = act.activity;
      const oldCost = act.estimatedCost || 0;
      act.activity = indoorName;
      act.location = indoorLocation;
      act.estimatedCost = newCost;
      act.aiRecommendation = `☔ Weather Replan: ${indoorReason}`;

      changes.push({
        action: 'replace',
        dayNumber,
        activityIndex: idx,
        oldActivity: {
          name: oldName,
          time: act.time,
          cost: oldCost,
          location: act.location
        },
        newActivity: {
          name: indoorName,
          time: act.time,
          cost: newCost,
          location: indoorLocation
        },
        reason: indoorReason,
        costDiff: newCost - oldCost,
        timeDiffMinutes: 0
      });
    }
  });

  // Calculate revised health score, costs, and routes deterministically
  const updatedItinerary = tripContext.itinerary.map(d => d.dayNumber === dayNumber ? revisedDay : d);
  const updatedTripContext: TripContext = {
    ...tripContext,
    itinerary: updatedItinerary
  };

  const costAfter = calculateTripCost(updatedTripContext);
  const routeAfter = calculateTripRouteMetrics(updatedTripContext);
  const healthAfter = calculateDynamicHealthScore({
    ...updatedTripContext,
    budget: {
      ...updatedTripContext.budget,
      spent: costAfter.totalCost
    }
  });

  const estimatedSavings = Math.max(0, costBefore.totalCost - costAfter.totalCost);
  const travelTimeSavedHours = Math.max(0, Math.round((routeBefore.totalTravelHours - routeAfter.totalTravelHours) * 10) / 10);
  const travelTimeSavedMinutes = Math.round(travelTimeSavedHours * 60);

  return {
    dayNumber,
    condition,
    summary: `Re-planned Day 0${dayNumber} for ${destination} due to ${condition} (${rainChancePercent}% rain chance). Protected schedule with ${changes.length} indoor cultural and sheltered dining alternatives.`,
    affectedActivitiesCount: changes.length,
    healthScoreBefore: healthBefore.overallScore,
    healthScoreAfter: healthAfter.overallScore,
    changes,
    revisedDay,
    travelTimeSavedMinutes,
    estimatedSavings,
    confidence: 0.95
  };
}

export function createWeatherOptimizationResult(
  tripContext: TripContext,
  replan: WeatherReplanResponse
): OptimizationResult {
  const updatedItinerary = tripContext.itinerary.map(d => d.dayNumber === replan.dayNumber ? replan.revisedDay : d);
  const healthBefore = replan.healthScoreBefore;
  const healthAfter = replan.healthScoreAfter;
  
  const costBefore = calculateTripCost(tripContext);
  const costAfter = calculateTripCost({ ...tripContext, itinerary: updatedItinerary });
  const estimatedSavings = Math.max(0, costBefore.totalCost - costAfter.totalCost);

  const routeBefore = calculateTripRouteMetrics(tripContext);
  const routeAfter = calculateTripRouteMetrics({ ...tripContext, itinerary: updatedItinerary });

  const travelTimeHoursBefore = routeBefore.totalTravelHours;
  const travelTimeHoursAfter = routeAfter.totalTravelHours;
  const travelTimeSavedHours = Math.max(0, Math.round((travelTimeHoursBefore - travelTimeHoursAfter) * 10) / 10);
  const travelDistanceKmBefore = routeBefore.totalDistanceKm;
  const travelDistanceKmAfter = routeAfter.totalDistanceKm;
  const travelDistanceSavedKm = Math.max(0, Math.round((travelDistanceKmBefore - travelDistanceKmAfter) * 10) / 10);

  return {
    type: 'full_itinerary_optimization',
    summary: replan.summary,
    healthScoreBefore: healthBefore,
    healthScoreAfter: healthAfter,
    costBefore: costBefore.totalCost,
    costAfter: costAfter.totalCost,
    estimatedSavings,
    travelTimeHoursBefore,
    travelTimeHoursAfter,
    travelTimeSavedHours,
    travelDistanceKmBefore,
    travelDistanceKmAfter,
    travelDistanceSavedKm,
    resolvedConflictsCount: Math.max(1, replan.affectedActivitiesCount),
    changes: replan.changes,
    explanations: replan.changes.map(c => c.reason),
    warnings: [`Weather alert: ${replan.condition} expected on Day 0${replan.dayNumber}. Outdoor stops relocated indoors.`],
    confidence: 0.95,
    optimizedItinerary: updatedItinerary
  };
}
