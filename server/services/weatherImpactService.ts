/**
 * Authoritative Deterministic Weather Impact Analysis Engine
 * 
 * Evaluates whether meteorological forecast materially affects scheduled activities.
 * Classifies activities into outdoor / indoor / mixed profiles.
 * Applies configurable, documented thresholds (no magic numbers scattered in code).
 */

import { 
  ActivityWeatherProfile, 
  WeatherImpact, 
  WeatherImpactConfig, 
  WeatherDay, 
  WeatherDataState 
} from '../types/weather';
import { ItineraryActivity } from '../../src/types';

/**
 * Standard Configurable Weather Impact Thresholds
 * 
 * - highRainProbability: >= 60% probability triggers high severity for outdoor events.
 * - moderateRainProbability: 35% - 59% triggers moderate caution / rescheduling.
 * - heavyPrecipitationMm: >= 5.0 mm indicates continuous heavy downpour.
 * - highWindKph: >= 35.0 km/h disrupts coastal, marine, and high-altitude activities.
 * - extremeHeatC: >= 38.0 °C induces midday heat exhaustion risks.
 * - extremeColdC: <= 5.0 °C requires specialized winter gear.
 */
export const DEFAULT_WEATHER_IMPACT_CONFIG: WeatherImpactConfig = {
  highRainProbability: 60,
  moderateRainProbability: 35,
  heavyPrecipitationMm: 5.0,
  highWindKph: 35.0,
  extremeHeatC: 38.0,
  extremeColdC: 5.0
};

/**
 * Classifies an activity into its environmental profile:
 * 'outdoor' | 'indoor' | 'mixed' | 'unknown'
 */
export function classifyActivityWeatherProfile(
  activity: Partial<ItineraryActivity> & { name?: string; activity?: string; weatherProfile?: ActivityWeatherProfile; tags?: string[] }
): ActivityWeatherProfile {
  if (activity.weatherProfile && activity.weatherProfile !== 'unknown') {
    return activity.weatherProfile;
  }

  const nameText = `${activity.activity || activity.name || ''} ${activity.location || ''}`.toLowerCase();
  const category = (activity.category || '').toLowerCase();

  // 1. Explicit Indoor Indicators
  const indoorKeywords = [
    'museum', 'gallery', 'art center', 'palace interior', 'thali', 'restaurant',
    'bistro', 'cafe', 'café', 'dining', 'lunch', 'dinner', 'breakfast', 'brunch',
    'shopping mall', 'market arcade', 'covered passage', 'tea ceremony', 'spa',
    'aquarium', 'theatre', 'theater', 'workshop', 'pavilion', 'veranda', 'indoor'
  ];

  if (indoorKeywords.some(kw => nameText.includes(kw))) {
    return 'indoor';
  }

  // 2. Explicit Outdoor Indicators
  const outdoorKeywords = [
    'beach', 'watersport', 'scuba', 'snorkel', 'kayak', 'catamaran', 'boat',
    'sailing', 'cruise', 'fort', 'rampart', 'hike', 'hiking', 'trek', 'trekking',
    'safari', 'waterfall', 'pool', 'swim', 'swimming', 'cliff', 'sunset stroll',
    'walking tour', 'promenade', 'rice terrace', 'garden', 'park', 'viewpoint',
    'outdoor', 'cycle', 'cycling', 'island'
  ];

  if (outdoorKeywords.some(kw => nameText.includes(kw))) {
    return 'outdoor';
  }

  // 3. Category heuristics
  if (category === 'food' || category === 'relaxation') {
    return 'indoor';
  }

  if (category === 'adventure') {
    return 'outdoor';
  }

  if (nameText.includes('temple') || nameText.includes('shrine') || nameText.includes('bazaar') || nameText.includes('street market')) {
    return 'mixed';
  }

  // Default to outdoor for open-air sightseeing
  return 'outdoor';
}

/**
 * Deterministically evaluates the meteorological impact on a single activity.
 */
export function evaluateActivityWeatherImpact(
  activity: Partial<ItineraryActivity> & { name?: string; activity?: string; id?: string; location?: string; time?: string; estimatedCost?: number | string; category?: string },
  weatherDay: WeatherDay | null,
  config: WeatherImpactConfig = DEFAULT_WEATHER_IMPACT_CONFIG
): WeatherImpact {
  const profile = classifyActivityWeatherProfile(activity);
  const actId = activity.id || activity.activity || 'unknown-activity';
  const actName = activity.activity || (activity as any).name || 'Scheduled Activity';
  const time = activity.time || '';

  // 1. If forecast is not available for this date
  if (!weatherDay) {
    return {
      activityId: actId,
      activityName: actName,
      time,
      profile,
      severity: 'none',
      reasons: ['Weather forecast unavailable for this date.'],
      affected: false,
      recommendedAction: 'unavailable'
    };
  }

  const precipProb = weatherDay.precipitationProbability;
  const precipMm = weatherDay.precipitationMm;
  const tempMax = weatherDay.temperatureMaxC;
  const windKph = weatherDay.windSpeedKph;

  // 2. Indoor activities are sheltered from precipitation
  if (profile === 'indoor') {
    const reasons: string[] = [];
    if (precipProb != null && precipProb >= config.highRainProbability) {
      reasons.push(`Precipitation forecast (${precipProb}%), but venue is sheltered indoors.`);
    } else {
      reasons.push('Sheltered indoor venue; unaffected by ambient weather.');
    }

    return {
      activityId: actId,
      activityName: actName,
      time,
      profile,
      severity: 'none',
      reasons,
      affected: false,
      precipitationProbability: precipProb,
      precipitationMm: precipMm,
      temperature: tempMax,
      windSpeedKph: windKph,
      recommendedAction: 'keep'
    };
  }

  // 3. Outdoor activities evaluation
  const reasons: string[] = [];
  let severity: 'none' | 'low' | 'moderate' | 'high' = 'none';
  let recommendedAction: WeatherImpact['recommendedAction'] = 'keep';
  let affected = false;

  // Severe rain check
  const isHighRain = (precipProb != null && precipProb >= config.highRainProbability) ||
                     (precipMm != null && precipMm >= config.heavyPrecipitationMm);

  const isModerateRain = (precipProb != null && precipProb >= config.moderateRainProbability && precipProb < config.highRainProbability);

  // Severe wind check (especially hazardous for boats/beaches/watersports)
  const isHighWind = windKph != null && windKph >= config.highWindKph;
  const isMarineOrCliff = actName.toLowerCase().includes('boat') ||
                          actName.toLowerCase().includes('cruise') ||
                          actName.toLowerCase().includes('catamaran') ||
                          actName.toLowerCase().includes('cliff') ||
                          actName.toLowerCase().includes('water');

  // Heat check
  const isExtremeHeat = tempMax != null && tempMax >= config.extremeHeatC;

  if (isHighRain) {
    severity = 'high';
    affected = true;
    recommendedAction = 'replace';
    reasons.push(`High precipitation probability (${precipProb ?? 0}%${precipMm != null ? `, ${precipMm}mm` : ''}) compromises outdoor activity.`);
  } else if (isHighWind && isMarineOrCliff) {
    severity = 'high';
    affected = true;
    recommendedAction = 'reschedule';
    reasons.push(`Strong wind speeds (${windKph} km/h) exceed safety thresholds for coastal / marine transit.`);
  } else if (isModerateRain) {
    severity = 'moderate';
    affected = true;
    recommendedAction = 'monitor';
    reasons.push(`Moderate precipitation probability (${precipProb}%); consider carrying weather protection or scheduling indoor backup.`);
  } else if (isHighWind) {
    severity = 'moderate';
    affected = true;
    recommendedAction = 'monitor';
    reasons.push(`Brisk winds (${windKph} km/h) may impact open-air comfort.`);
  } else if (isExtremeHeat) {
    severity = 'moderate';
    affected = true;
    recommendedAction = 'reschedule';
    reasons.push(`Peak daytime temperatures (${tempMax}°C) present heat exhaustion risk during midday outdoor touring.`);
  } else {
    reasons.push(`Favorable weather conditions (${weatherDay.condition || 'Clear'}, ${tempMax != null ? `${tempMax}°C` : ''}).`);
  }

  // Mixed profile dampening (mixed locations have partial shelter)
  if (profile === 'mixed' && severity === 'high') {
    severity = 'moderate';
    recommendedAction = 'monitor';
    reasons.push('Venue has partial canopy / sheltered arcades.');
  }

  return {
    activityId: actId,
    activityName: actName,
    time,
    profile,
    severity,
    reasons,
    affected,
    precipitationProbability: precipProb,
    precipitationMm: precipMm,
    temperature: tempMax,
    windSpeedKph: windKph,
    recommendedAction
  };
}

/**
 * Evaluates the entire day's activities against the day's meteorological forecast.
 */
export function evaluateDayWeatherImpact(
  activities: ItineraryActivity[],
  weatherDay: WeatherDay | null,
  dayNumber: number,
  config: WeatherImpactConfig = DEFAULT_WEATHER_IMPACT_CONFIG
): {
  dayNumber: number;
  date: string;
  weather: WeatherDay | null;
  availability: WeatherDataState;
  impacts: WeatherImpact[];
  affectedCount: number;
  highSeverityCount: number;
  outdoorCount: number;
  indoorCount: number;
  advisory: string;
} {
  const impacts = (activities || []).map(a => evaluateActivityWeatherImpact(a, weatherDay, config));
  const affectedCount = impacts.filter(i => i.affected).length;
  const highSeverityCount = impacts.filter(i => i.severity === 'high').length;
  const outdoorCount = impacts.filter(i => i.profile === 'outdoor').length;
  const indoorCount = impacts.filter(i => i.profile === 'indoor').length;

  const date = weatherDay?.date || `Day ${dayNumber}`;
  const availability: WeatherDataState = weatherDay ? 'live' : 'unavailable';

  let advisory = '';
  if (!weatherDay) {
    advisory = `Forecast unavailable for Day 0${dayNumber}. Schedule retained without weather modification.`;
  } else if (highSeverityCount > 0) {
    const rainText = weatherDay.precipitationProbability != null ? `${weatherDay.precipitationProbability}% rain probability` : 'severe weather';
    advisory = `Day 0${dayNumber} forecast flags ${rainText} (${weatherDay.condition || 'Rain'}). ${highSeverityCount} outdoor activity/activities exposed; indoor cultural alternatives recommended.`;
  } else if (affectedCount > 0) {
    advisory = `Moderate weather conditions expected on Day 0${dayNumber} (${weatherDay.condition || 'Variable'}). Keep umbrellas accessible or monitor timing.`;
  } else {
    advisory = `Optimal travel conditions on Day 0${dayNumber} (${weatherDay.condition || 'Clear'}, ${weatherDay.temperatureMaxC != null ? `${weatherDay.temperatureMaxC}°C` : ''}). Outdoor itinerary fully viable.`;
  }

  return {
    dayNumber,
    date,
    weather: weatherDay,
    availability,
    impacts,
    affectedCount,
    highSeverityCount,
    outdoorCount,
    indoorCount,
    advisory
  };
}
