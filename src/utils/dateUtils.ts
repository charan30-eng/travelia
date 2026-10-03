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

/**
 * Calculates dynamic travel date ranges based on a start date and duration days.
 * E.g., start: 2026-11-12, days: 5 -> "Nov 12 – Nov 16, 2026" (4 Nights)
 */
export function calculateTravelDateRange(
  startDateInput: Date | string = '2026-11-12',
  durationDays: number = 5
): TravelDateRangeResult {
  const safeDays = Math.max(1, Math.round(durationDays || 1));
  const safeNights = Math.max(0, safeDays - 1);

  let start: Date;
  if (typeof startDateInput === 'string') {
    // If format is YYYY-MM-DD, parse year, month, day to avoid timezone skew
    const isoMatch = startDateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      start = new Date(year, month, day, 12, 0, 0);
    } else {
      start = new Date(startDateInput);
    }
  } else if (startDateInput instanceof Date) {
    start = new Date(startDateInput.getTime());
  } else {
    start = new Date(2026, 10, 12, 12, 0, 0);
  }

  if (isNaN(start.getTime())) {
    start = new Date(2026, 10, 12, 12, 0, 0);
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
    if (startMonth === endMonth) {
      formattedRange = `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
    } else {
      formattedRange = `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
    }
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
