/**
 * Travelia Date Formatting & Travel Date Range Utilities
 * Computes deterministic date ranges for itinerary duration sliders and planners.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export interface TravelDateRangeResult {
  formattedRange: string;
  startDate: Date;
  endDate: Date;
  startDateFormatted: string;
  endDateFormatted: string;
  startDateISO: string;
  endDateISO: string;
  durationDays: number;
  nights: number;
}

export function getTodayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isWithinWeatherForecastWindow(dateISO: string): boolean {
  if (!dateISO) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isoMatch = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const target = isoMatch 
      ? new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), 12, 0, 0)
      : new Date(dateISO);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 16;
  } catch {
    return false;
  }
}

export interface TripDayDateResult {
  dateISO: string;
  formattedDay: string;
  formattedFull: string;
  weekday: string;
}

export function calculateTripDayDate(
  startDateInput: Date | string = getTodayISO(),
  dayNumber: number = 1
): TripDayDateResult {
  let start: Date;
  if (typeof startDateInput === 'string') {
    const isoMatch = startDateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      start = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), 12, 0, 0);
    } else {
      start = new Date(startDateInput);
    }
  } else if (startDateInput instanceof Date) {
    start = new Date(startDateInput.getTime());
  } else {
    start = new Date();
  }

  if (isNaN(start.getTime())) {
    start = new Date();
  }

  const targetDate = new Date(start.getTime());
  targetDate.setDate(start.getDate() + (dayNumber - 1));

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateISO = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
  
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const wd = weekdays[targetDate.getDay()];
  const fwd = fullWeekdays[targetDate.getDay()];
  const mo = months[targetDate.getMonth()];
  const fmo = fullMonths[targetDate.getMonth()];
  const day = targetDate.getDate();
  const yr = targetDate.getFullYear();

  return {
    dateISO,
    formattedDay: `${wd}, ${mo} ${day}`,
    formattedFull: `${fwd}, ${fmo} ${day}, ${yr}`,
    weekday: fwd
  };
}

/**
 * Calculates dynamic travel date ranges based on a start date and duration days.
 * E.g., start: 2026-10-05, days: 5 -> "Oct 5 – Oct 9, 2026" (4 Nights)
 */
export function calculateTravelDateRange(
  startDateInput?: Date | string,
  durationDays: number = 5
): TravelDateRangeResult {
  const safeStartDateInput = startDateInput || getTodayISO();
  const safeDays = Math.max(1, Math.round(durationDays || 1));
  const safeNights = Math.max(0, safeDays - 1);

  let start: Date;
  if (typeof safeStartDateInput === 'string') {
    // If format is YYYY-MM-DD, parse year, month, day to avoid timezone skew
    const isoMatch = safeStartDateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      start = new Date(year, month, day, 12, 0, 0);
    } else {
      start = new Date(safeStartDateInput);
    }
  } else if (safeStartDateInput instanceof Date) {
    start = new Date(safeStartDateInput.getTime());
  } else {
    start = new Date();
  }

  if (isNaN(start.getTime())) {
    start = new Date();
  }

  // End date is start date + (days - 1)
  const end = new Date(start.getTime());
  end.setDate(start.getDate() + safeNights);

  const startMonth = MONTH_NAMES[start.getMonth()];
  const startDay = start.getDate();
  const startYear = start.getFullYear();

  const endMonth = MONTH_NAMES[end.getMonth()];
  const endDay = end.getDate();
  const endYear = end.getFullYear();

  let formattedRange: string;
  if (startYear === endYear) {
    formattedRange = `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
  } else {
    formattedRange = `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const startDateISO = `${startYear}-${pad(start.getMonth() + 1)}-${pad(startDay)}`;
  const endDateISO = `${endYear}-${pad(end.getMonth() + 1)}-${pad(endDay)}`;

  return {
    formattedRange,
    startDate: start,
    endDate: end,
    startDateFormatted: `${startMonth} ${startDay}, ${startYear}`,
    endDateFormatted: `${endMonth} ${endDay}, ${endYear}`,
    startDateISO,
    endDateISO,
    durationDays: safeDays,
    nights: safeNights
  };
}
