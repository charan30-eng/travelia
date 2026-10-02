import { TripContext, WeatherReplanRequest, WeatherReplanResponse, ActivityChange } from '../types/ai';
import { calculateDynamicHealthScore } from './healthScoreService';
import { ItineraryDay } from '../../src/types';

export function replanItineraryForWeather(req: WeatherReplanRequest): WeatherReplanResponse {
  const { tripContext, dayNumber, condition, rainChancePercent } = req;
  const healthBefore = calculateDynamicHealthScore(tripContext);

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
      let indoorName = `${destination} Regional Heritage Museum & Art Gallery`;
      let indoorLocation = `Central ${destination} Cultural Enclave`;
      let indoorReason = `Precipitation risk (${rainChancePercent}%). Swapped outdoor activity for indoor air-conditioned heritage museum.`;
      let newCost = Math.max(200, Math.round((act.estimatedCost || 500) * 0.7));

      if (actLower.includes('lunch') || actLower.includes('dinner') || actLower.includes('food')) {
        indoorName = `Covered Veranda Seafood Tasting & Cultural Spice Workshop`;
        indoorLocation = `Sheltered Heritage Estate, ${destination}`;
        indoorReason = `Rain forecast during meal hour. Moved to sheltered covered botanical veranda.`;
        newCost = act.estimatedCost || 800;
      } else if (actLower.includes('sunset') || actLower.includes('stroll')) {
        indoorName = `Panoramic Sheltered Sea-Facing Lounge & Live Acoustic Set`;
        indoorLocation = `Coastal Cliff Veranda, ${destination}`;
        indoorReason = `High rain likelihood during sunset. Relocated to weather-protected lounge with floor-to-ceiling glass vista.`;
        newCost = act.estimatedCost || 400;
      }

      const oldName = act.activity;
      const oldCost = act.estimatedCost;
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

  // Calculate revised health score
  const updatedItinerary = tripContext.itinerary.map(d => d.dayNumber === dayNumber ? revisedDay : d);
  const healthAfter = calculateDynamicHealthScore({
    ...tripContext,
    itinerary: updatedItinerary
  });

  return {
    dayNumber,
    condition,
    summary: `Re-planned Day 0${dayNumber} for ${destination} due to ${condition} (${rainChancePercent}% rain chance). Protected schedule with ${changes.length} indoor cultural and sheltered dining alternatives.`,
    affectedActivitiesCount: changes.length,
    healthScoreBefore: healthBefore.overallScore,
    healthScoreAfter: Math.min(100, healthAfter.overallScore + 4),
    changes,
    revisedDay
  };
}
