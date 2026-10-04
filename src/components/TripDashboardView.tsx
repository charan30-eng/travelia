import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Edit3, 
  Bookmark, 
  Share2, 
  Calendar, 
  Clock, 
  MapPin, 
  Star, 
  Plus, 
  Trash2, 
  Check, 
  ChevronRight, 
  DollarSign, 
  Users, 
  Building2, 
  UtensilsCrossed, 
  Compass, 
  ArrowUpRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Map,
  ShieldCheck,
  Printer,
  Copy,
  Download,
  CalendarDays,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  Eye,
  X,
  PlaneTakeoff,
  Plane,
  Award,
  ArrowUpDown,
  Navigation,
  CheckSquare,
  Square,
  BadgeCheck,
  CloudRain,
  Zap,
  HelpCircle,
  Activity
} from 'lucide-react';
import { TripPlan, Hotel, Restaurant, TouristPlace, Currency, SmartReplanSuggestion, HealthScoreImprovement, ItineraryActivity, BudgetBreakdown } from '../types';
import { formatCurrency } from '../data/mockData';
import { getFlightDataForDestination } from '../data/flightData';
import { detectCountryFromDestination, formatINR, formatForeign, CountryCurrencyInfo } from '../data/currencyHelper';
import { calculateTripHealthScore } from '../data/featureData';
import { SmartReplanModal } from './SmartReplanModal';
import { TripMapView } from './TripMapView';
import { GroupTripSection } from './GroupTripSection';
import { TravelSafetySection } from './TravelSafetySection';
import { EstimatedBudgetSection } from './EstimatedBudgetSection';
import { TripFlightsSection } from './TripFlightsSection';
import { TripHealthScoreCard } from './TripHealthScoreCard';
import { WhatIfSimulatorSection } from './WhatIfSimulatorSection';
import confetti from 'canvas-confetti';
import { calculateTravelDateRange, calculateTripDayDate, getTodayISO, isWithinWeatherForecastWindow } from '../utils/dateUtils';
import { PlaceStatusBadge } from './PlaceStatusBadge';

interface TripDashboardViewProps {
  trip: TripPlan;
  onRegenerate: () => void;
  onEdit: () => void;
  onSaveTrip: (trip: TripPlan) => void;
  onViewBudget: (subTab?: 'itemized' | 'calculator' | 'optimizer' | 'splitter') => void;
  onSelectHotel: (hotel: Hotel) => void;
  onTogglePlace: (placeId: string) => void;
  onToggleRestaurant: (restId: string) => void;
  onAddActivity: (dayNumber: number) => void;
  onApplyReplan?: (suggestion: SmartReplanSuggestion) => void;
  onApplyHealthImprovement?: (improvement: HealthScoreImprovement) => void;
  onTriggerOptimization?: () => void;
  currency: Currency;
  isSaved?: boolean;
  selectedCountry?: CountryCurrencyInfo;
  onSelectCountry?: (country: CountryCurrencyInfo) => void;
  flightCabinClass?: 'economy' | 'premium' | 'business';
  onSelectFlightCabinClass?: (cabin: 'economy' | 'premium' | 'business') => void;
  includeFlights?: boolean;
  onToggleIncludeFlights?: (include: boolean) => void;
  onUpdateBudget?: (newBudget: BudgetBreakdown, controls?: Partial<TripPlan>) => void;
  onUpdateTripDates?: (newStartDate: string, newDays?: number) => void;
}

export const TripDashboardView: React.FC<TripDashboardViewProps> = ({
  trip,
  onRegenerate,
  onEdit,
  onSaveTrip,
  onViewBudget,
  onSelectHotel,
  onTogglePlace,
  onToggleRestaurant,
  onAddActivity,
  onApplyReplan,
  onApplyHealthImprovement,
  onTriggerOptimization,
  currency,
  isSaved = false,
  selectedCountry,
  onSelectCountry,
  flightCabinClass = 'economy',
  onSelectFlightCabinClass,
  includeFlights = true,
  onToggleIncludeFlights,
  onUpdateBudget,
  onUpdateTripDates,
}) => {
  const [activeDay, setActiveDay] = useState<number>(1);
  const [justSaved, setJustSaved] = useState(isSaved);
  const [isSmartReplanOpen, setIsSmartReplanOpen] = useState(false);
  const [replanPresetDisruption, setReplanPresetDisruption] = useState<string | undefined>(undefined);
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);
  const [editStartDate, setEditStartDate] = useState(trip.startDate || getTodayISO());
  const [editDays, setEditDays] = useState(trip.days || 5);

  React.useEffect(() => {
    setJustSaved(isSaved);
  }, [isSaved]);

  React.useEffect(() => {
    if (trip.startDate) setEditStartDate(trip.startDate);
    if (trip.days) setEditDays(trip.days);
  }, [trip.startDate, trip.days]);

  const previewDateRange = useMemo(() => {
    return calculateTravelDateRange(editStartDate, editDays);
  }, [editStartDate, editDays]);

  const isPreviewWeatherLive = useMemo(() => {
    return isWithinWeatherForecastWindow(editStartDate);
  }, [editStartDate]);

  // Dynamic flight package matching trip destination (Korea, Japan, Paris, Goa, etc.)
  const flightData = useMemo(() => {
    return getFlightDataForDestination(trip.destination);
  }, [trip.destination]);

  // Destination Country & Currency Information for Dual-Currency Display (synced with App)
  const destinationCountry = useMemo(() => {
    return selectedCountry || detectCountryFromDestination(trip.destination, trip.country);
  }, [selectedCountry, trip.destination, trip.country]);

  // Unified Flight & Airfare Calculation (Identical across Dashboard & Budget Studio)
  const baseRoundtripAirfarePerTraveler = useMemo(() => {
    return (flightData.outboundFlight?.pricePerPerson || 3850) + (flightData.returnFlight?.pricePerPerson || 4120);
  }, [flightData]);

  const cabinMultiplier = flightCabinClass === 'business' ? 2.3 : flightCabinClass === 'premium' ? 1.45 : 1.0;
  const flightPerPersonEffective = Math.round(baseRoundtripAirfarePerTraveler * cabinMultiplier);
  const totalAirfareCost = includeFlights ? flightPerPersonEffective * (trip.travelers || 2) : 0;

  // Unified Non-flight total & Grand Total with Airfare
  const nonFlightCategoriesTotal = (trip.budget.hotel || 0) + (trip.budget.food || 0) + (trip.budget.transportation || 0) + (trip.budget.activities || 0) + (trip.budget.miscellaneous || 0);
  const totalTripBudgetWithAirfare = nonFlightCategoriesTotal + totalAirfareCost;

  // Deterministic Trip Health Score calculation
  const healthScoreData = useMemo(() => {
    return calculateTripHealthScore(trip);
  }, [trip]);

  // Aggregate Route metrics across days
  const routeStats = useMemo(() => {
    let totalMinutes = 0;
    let totalKm = 0;
    trip.itinerary.forEach(d => {
      d.activities.forEach(a => {
        totalMinutes += a.commuteMinutes || 18;
        totalKm += a.commuteDistanceKm || 5.2;
      });
    });
    return {
      totalMinutes: Math.round(totalMinutes),
      totalKm: Math.round(totalKm * 10) / 10
    };
  }, [trip.itinerary]);

  // Total opportunities count
  const optimizationOpportunitiesCount = useMemo(() => {
    let count = 0;
    if (healthScoreData.overallScore < 90) count += 1;
    if (routeStats.totalMinutes > 75) count += 1;
    if (trip.itinerary.some(d => d.activities.length >= 4)) count += 1;
    return Math.max(count, 1);
  }, [healthScoreData, routeStats, trip.itinerary]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-4', 'ring-[#344E27]/40', 'rounded-3xl', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-[#344E27]/40');
      }, 1800);
    }
  };

  const handleFlightTabClick = () => {
    scrollToSection('section-flights');
    showToast(`Viewing ${flightData.outboundFlight.originCode} ➔ ${flightData.outboundFlight.destinationCode} Flights & Boarding Passes`);
  };

  const handleBudgetTabClick = () => {
    const el = document.getElementById('section-budget');
    if (el) {
      scrollToSection('section-budget');
      showToast(`Connected to Estimated Budget: ₹ INR & ${destinationCountry.flag} ${destinationCountry.currencyCode} (${includeFlights ? `${flightCabinClass.toUpperCase()} Airfare Included` : 'Flights Excluded'})`);
    } else {
      onViewBudget('itemized');
    }
  };

  // Trip Status
  const [tripStatus, setTripStatus] = useState<'planning' | 'confirmed' | 'active' | 'completed'>('planning');

  // Share & Export Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Completed Activities tracker: set of activity IDs
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());

  // Expanded Activity Details
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  // Category filter for daily activities
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>('all');

  // Filters for Hotels, Sights & Restaurants
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [placeFilter, setPlaceFilter] = useState<string>('all');
  const [restFilter, setRestFilter] = useState<string>('all');

  // Quick Detail Modals for Hotel, Place, or Restaurant
  const [detailModalItem, setDetailModalItem] = useState<{
    type: 'hotel' | 'place' | 'restaurant';
    data: any;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSave = () => {
    onSaveTrip(trip);
    setJustSaved(true);
    showToast('Trip successfully saved to your saved trips portfolio!');
    try {
      confetti({
        particleCount: 35,
        spread: 45,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  const handleOpenSmartReplanWithReason = (disruption?: string) => {
    setReplanPresetDisruption(disruption);
    setIsSmartReplanOpen(true);
  };

  const handleApplyReplanSuggestion = (suggestion: SmartReplanSuggestion) => {
    if (onApplyReplan) {
      onApplyReplan(suggestion);
    }
  };

  const handleApplyRouteOptimization = (dayNumber: number, optimizedOrder: string[]) => {
    if (onSaveTrip && optimizedOrder && optimizedOrder.length > 0) {
      const updatedItinerary = trip.itinerary.map(day => {
        if (day.dayNumber === dayNumber) {
          const actMap = new Map(day.activities.map(a => [a.id, a]));
          const reorderedActivities: ItineraryActivity[] = [];
          
          optimizedOrder.forEach(id => {
            const act = actMap.get(id);
            if (act) {
              reorderedActivities.push(act);
              actMap.delete(id);
            }
          });
          actMap.forEach(act => reorderedActivities.push(act));

          return {
            ...day,
            activities: reorderedActivities
          };
        }
        return day;
      });

      onSaveTrip({
        ...trip,
        itinerary: updatedItinerary
      });
    }

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch (e) {}
    showToast(`Route optimized for Day 0${dayNumber}: Backtracking eliminated!`);
  };

  // Toggle Activity Completion
  const toggleActivityCompletion = (actId: string, actTitle: string) => {
    setCompletedActivities(prev => {
      const next = new Set(prev);
      if (next.has(actId)) {
        next.delete(actId);
        showToast(`Marked "${actTitle}" as pending`);
      } else {
        next.add(actId);
        showToast(`Completed "${actTitle}"! 🎉`);
        try {
          confetti({
            particleCount: 25,
            spread: 40,
            origin: { y: 0.7 }
          });
        } catch (e) {}
      }
      return next;
    });
  };

  // Copy Itinerary Text
  const handleCopyItinerary = () => {
    const summary = `
✈️ TRAVELIA AI TRIP ITINERARY: ${trip.destination.toUpperCase()}
Duration: ${trip.days} Days / ${trip.nights} Nights • Travelers: ${trip.travelers} Pax
Budget Estimate: ${formatCurrency(trip.budget.total, currency)}
--------------------------------------------------
${trip.itinerary.map(day => `
DAY 0${day.dayNumber}: ${day.title} (${day.theme})
${day.activities.map(act => `  • ${act.time} - ${act.activity} (${act.location}) [${act.duration}]`).join('\n')}
`).join('\n')}
--------------------------------------------------
Generated by Travelia AI Travel Operating System
    `.trim();

    navigator.clipboard.writeText(summary);
    showToast('Itinerary briefing copied to clipboard!');
  };

  // Download .ics Calendar File
  const handleDownloadCalendar = () => {
    const icsEvents = trip.itinerary.flatMap((day, dayIdx) => {
      return day.activities.map((act, actIdx) => {
        return `BEGIN:VEVENT
SUMMARY:${act.activity} - ${trip.destination}
DESCRIPTION:${act.description || act.aiRecommendation || 'Trip activity'}
LOCATION:${act.location}
STATUS:CONFIRMED
END:VEVENT`;
      });
    }).join('\n');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Travelia AI//Trip Itinerary//EN
CALSCALE:GREGORIAN
${icsEvents}
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${trip.destination.toLowerCase()}_trip_itinerary.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported calendar (.ics) file downloaded!');
  };

  // Selected Day Details
  const currentDayData = trip.itinerary.find(d => d.dayNumber === activeDay) || trip.itinerary[0];

  // Activities for selected day with filter
  const filteredDayActivities = useMemo(() => {
    if (!currentDayData) return [];
    if (activityCategoryFilter === 'all') return currentDayData.activities;
    return currentDayData.activities.filter(a => a.category?.toLowerCase() === activityCategoryFilter.toLowerCase());
  }, [currentDayData, activityCategoryFilter]);

  // Completion calculation for selected day
  const dayCompletedCount = currentDayData?.activities.filter(a => completedActivities.has(a.id)).length || 0;
  const dayTotalCount = currentDayData?.activities.length || 0;
  const dayProgressPct = dayTotalCount > 0 ? Math.round((dayCompletedCount / dayTotalCount) * 100) : 0;

  // Filtered lists
  const filteredHotels = useMemo(() => {
    if (hotelFilter === 'all') return trip.hotels;
    return trip.hotels.filter(h => h.category?.toLowerCase() === hotelFilter.toLowerCase());
  }, [trip.hotels, hotelFilter]);

  const filteredPlaces = useMemo(() => {
    if (placeFilter === 'all') return trip.touristPlaces;
    return trip.touristPlaces.filter(p => p.category?.toLowerCase() === placeFilter.toLowerCase());
  }, [trip.touristPlaces, placeFilter]);

  const filteredRestaurants = useMemo(() => {
    if (restFilter === 'all') return trip.restaurants;
    return trip.restaurants.filter(r => r.priceLevel?.toLowerCase() === restFilter.toLowerCase() || r.cuisine?.toLowerCase().includes(restFilter.toLowerCase()));
  }, [trip.restaurants, restFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#191919] text-white px-5 py-3 rounded-2xl shadow-2xl border border-neutral-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <BadgeCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* TOP HERO BANNER */}
      <div className="relative rounded-[36px] overflow-hidden bg-neutral-900 text-white shadow-xl min-h-[340px] flex flex-col justify-between p-6 sm:p-10 border border-neutral-800">
        
        {/* Background Image with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={trip.heroImage}
            alt={trip.destination}
            className="w-full h-full object-cover opacity-45 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/45 to-neutral-950/20" />
        </div>

        {/* Top Badges & Actions */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#344E27]/90 text-[#E5ECE0] text-xs font-bold backdrop-blur-md border border-[#344E27]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Verified Travel Plan</span>
            </div>

            {((trip as any).isDemo || (trip as any).dataSource === 'DEMO DATA' || trip.id.startsWith('trip-goa-') || trip.id.startsWith('trip-kerala-')) ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-400/90 text-neutral-950 backdrop-blur-md border border-amber-300 shadow-xs uppercase tracking-wider">
                DEMO DATA
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/90 text-white backdrop-blur-md border border-emerald-400 shadow-xs uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-200" />
                PERSISTED
              </span>
            )}
            
            {/* Interactive Travel Dates Badge */}
            <button
              id="hero-change-dates-btn"
              onClick={() => setIsDatePickerModalOpen(true)}
              title="Click to view or edit travel dates"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold text-white border border-white/20 hover:border-white/40 transition-all cursor-pointer group"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-300 group-hover:scale-110 transition-transform" />
              <span>{trip.travelDates}</span>
              <span className="text-[10px] text-emerald-200/90 font-medium underline decoration-dotted ml-0.5">Edit Dates</span>
            </button>

            {/* Trip Status Pill Dropdown */}
            <div className="relative inline-block">
              <select
                value={tripStatus}
                onChange={(e) => {
                  setTripStatus(e.target.value as any);
                  showToast(`Trip status updated to ${e.target.value.toUpperCase()}`);
                }}
                aria-label="Trip Status"
                className="px-3 py-1 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-xs font-extrabold text-amber-300 border border-amber-400/40 cursor-pointer focus:outline-none"
              >
                <option value="planning" className="bg-neutral-900 text-white">⏳ Status: Planning</option>
                <option value="confirmed" className="bg-neutral-900 text-white">✅ Status: Confirmed & Booked</option>
                <option value="active" className="bg-neutral-900 text-white">🚗 Status: On The Road</option>
                <option value="completed" className="bg-neutral-900 text-white">🏆 Status: Completed</option>
              </select>
            </div>
          </div>

          {/* Top Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onTriggerOptimization && (
              <button
                id="hero-ai-optimize-btn"
                onClick={onTriggerOptimization}
                className="px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 text-xs font-black shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ring-2 ring-emerald-300/50"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>AI Optimize Itinerary</span>
              </button>
            )}

            <button
              onClick={() => handleOpenSmartReplanWithReason()}
              className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-neutral-950" />
              <span>Smart Replan</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share & Export</span>
            </button>

            <button
              id="regenerate-trip-btn"
              onClick={onRegenerate}
              className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>

            <button
              onClick={onEdit}
              className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Input</span>
            </button>

            <button
              id="save-trip-header-btn"
              onClick={handleSave}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                justSaved 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-[#344E27] hover:bg-[#273D1C] text-white shadow-md'
              }`}
            >
              {justSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save Trip</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hero Bottom Details */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pt-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#E5ECE0]">
                {trip.days} Days • {trip.nights} Nights • {trip.travelers} Traveler(s)
              </span>
              <span className="text-xs text-neutral-400">•</span>
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <PlaneTakeoff className="w-3.5 h-3.5" />
                Upcoming Trip
              </span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight uppercase">
              {trip.destination}
            </h1>
            <p className="text-neutral-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {trip.tripOverview}
            </p>
          </div>

          {/* Quick Flight & Budget Summary Interactive Tabs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              id="hero-flight-tab-btn"
              onClick={handleFlightTabClick}
              title="Click to view live flight logistics & boarding passes"
              className="bg-white/10 hover:bg-white/20 active:scale-[0.98] backdrop-blur-md p-4 rounded-2xl border border-white/20 hover:border-emerald-400/60 transition-all flex items-center justify-between gap-5 group shadow-lg text-left cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-neutral-300 block">Roundtrip Flight</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider ml-1">
                    Live Route
                  </span>
                </div>
                <span className="font-display font-extrabold text-xl text-white block mt-0.5">
                  {flightData.outboundFlight.originCode} ➔ {flightData.outboundFlight.destinationCode}
                </span>
                <span className="text-[11px] text-emerald-300 font-semibold block">
                  {flightData.outboundFlight.airline} {flightData.outboundFlight.flightNumber} • {flightData.outboundFlight.status === 'on-time' ? 'On Time' : 'Confirmed'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/20 group-hover:bg-emerald-600 flex items-center justify-center text-white transition-all group-hover:scale-110 shadow-sm shrink-0">
                <Plane className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </div>
            </button>

            <div className="flex flex-col gap-1.5">
              <button
                id="hero-budget-tab-btn"
                onClick={handleBudgetTabClick}
                title="Click to view Estimated Budget Breakdown in Dual Currency with Flights"
                className="bg-white/10 hover:bg-white/20 active:scale-[0.98] backdrop-blur-md p-4 rounded-2xl border border-white/20 hover:border-emerald-400/60 transition-all flex items-center justify-between gap-5 group shadow-lg text-left cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-neutral-300 block">Estimated Budget</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider ml-1">
                      {destinationCountry.flag} Dual FX + {includeFlights ? `${flightCabinClass.toUpperCase()}` : 'No Flights'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                    <span className="font-display font-extrabold text-2xl text-white">
                      {formatINR(totalTripBudgetWithAirfare)}
                    </span>
                    <span className="text-xs font-bold text-emerald-300">
                      ≈ {formatForeign(totalTripBudgetWithAirfare, destinationCountry)}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-300 font-semibold block mt-0.5">
                    ~ {formatINR(Math.round(totalTripBudgetWithAirfare / trip.travelers))} ({formatForeign(Math.round(totalTripBudgetWithAirfare / trip.travelers), destinationCountry)}) / person
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#344E27] group-hover:bg-[#273D1C] flex items-center justify-center text-white transition-all group-hover:scale-110 shadow-sm shrink-0">
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </button>

              {/* Connected Budget Tabs Quick Jump Bridge */}
              <div className="flex items-center gap-1.5 overflow-x-auto px-1 py-0.5 text-[10px] font-bold">
                <button
                  onClick={() => scrollToSection('section-budget')}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/25 text-neutral-200 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  ⬇️ In-Page Breakdown
                </button>
                <button
                  onClick={() => onViewBudget('itemized')}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/25 text-neutral-200 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  🧾 Line Audit
                </button>
                <button
                  onClick={() => onViewBudget('calculator')}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/25 text-neutral-200 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  🎛️ Simulator
                </button>
                <button
                  onClick={() => onViewBudget('optimizer')}
                  className="px-2 py-0.5 rounded-md bg-amber-400/20 hover:bg-amber-400/35 text-amber-200 transition-colors whitespace-nowrap cursor-pointer"
                >
                  ✨ AI Optimizer
                </button>
                <button
                  onClick={() => onViewBudget('splitter')}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/25 text-neutral-200 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  👥 Splitter
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE TRIP INTELLIGENCE DASHBOARD BAR */}
      {/* Communicates: Destination, Dates, Travelers, Budget, Weather, Health Score, Route Efficiency, Activities, Optimization Opportunities */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#344E27] bg-[#E5ECE0] px-2.5 py-0.5 rounded-full border border-[#344E27]/20">
                Engine State Verified
              </span>
              <span className="text-xs text-neutral-400 font-semibold">•</span>
              <span className="text-xs text-neutral-500 font-medium">
                {trip.destination} • {trip.travelDates} ({trip.days} Days / {trip.nights} Nights)
              </span>
            </div>
            <h2 className="font-display font-black text-xl text-[#191919] mt-1">
              Trip Intelligence & Optimization Health Overview
            </h2>
          </div>

          {onTriggerOptimization && (
            <button
              onClick={onTriggerOptimization}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Review {optimizationOpportunitiesCount} Optimization Opportunities</span>
            </button>
          )}
        </div>

        {/* 8-Dimension Intelligence Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* 1. Destination */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase">
              <MapPin className="w-3 h-3 text-[#344E27]" />
              <span>Destination</span>
            </div>
            <p className="font-display font-black text-xs sm:text-sm text-[#191919] mt-1 truncate">
              {trip.destination}
            </p>
            <span className="text-[10px] text-neutral-500 block truncate">
              {destinationCountry.countryName || 'Verified Sights'}
            </span>
          </div>

          {/* 2. Dates & Duration */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase">
              <Calendar className="w-3 h-3 text-blue-600" />
              <span>Dates</span>
            </div>
            <p className="font-display font-black text-xs sm:text-sm text-[#191919] mt-1 truncate">
              {trip.days}D / {trip.nights}N
            </p>
            <span className="text-[10px] text-neutral-500 block truncate">
              {trip.travelDates}
            </span>
          </div>

          {/* 3. Travelers */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase">
              <Users className="w-3 h-3 text-purple-600" />
              <span>Travelers</span>
            </div>
            <p className="font-display font-black text-xs sm:text-sm text-[#191919] mt-1">
              {trip.travelers} Traveler{trip.travelers > 1 ? 's' : ''}
            </p>
            <span className="text-[10px] text-neutral-500 block">
              {trip.travelers <= 2 ? 'Couple/Duo' : 'Group Trip'}
            </span>
          </div>

          {/* 4. Budget */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase">
              <DollarSign className="w-3 h-3 text-emerald-600" />
              <span>Budget</span>
            </div>
            <p className="font-display font-black text-xs sm:text-sm text-[#191919] mt-1 truncate">
              {formatINR(totalTripBudgetWithAirfare)}
            </p>
            <span className="text-[10px] text-neutral-500 block truncate">
              Dual-FX {destinationCountry.currencyCode}
            </span>
          </div>

          {/* 5. Weather */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase">
              <CloudRain className="w-3 h-3 text-sky-600" />
              <span>Weather</span>
            </div>
            <p className="font-display font-black text-xs sm:text-sm text-[#191919] mt-1 truncate">
              {isPreviewWeatherLive ? 'Live Met 16d' : 'Climate Model'}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold block truncate">
              ~26°C • Rain Guard
            </span>
          </div>

          {/* 6. Health Score */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 uppercase">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Health Score</span>
            </div>
            <p className="font-display font-black text-xs sm:text-sm text-emerald-950 mt-1">
              {healthScoreData.overallScore} / 100
            </p>
            <span className="text-[10px] text-emerald-700 font-bold block">
              {healthScoreData.overallScore >= 85 ? '🟢 Excellent' : healthScoreData.overallScore >= 75 ? '🟡 Balanced' : '🟠 Inefficient'}
            </span>
          </div>

          {/* 7. Route Efficiency */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase">
              <Compass className="w-3 h-3 text-amber-600" />
              <span>Route Matrix</span>
            </div>
            <p className="font-display font-black text-xs sm:text-sm text-[#191919] mt-1 truncate">
              {routeStats.totalKm} km
            </p>
            <span className="text-[10px] text-neutral-500 block truncate">
              ~{routeStats.totalMinutes}m Transit (OSRM)
            </span>
          </div>

          {/* 8. Optimization */}
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800 uppercase">
              <Zap className="w-3 h-3 text-amber-600" />
              <span>Optimization</span>
            </div>
            <p className="font-display font-black text-xs sm:text-sm text-amber-950 mt-1">
              {optimizationOpportunitiesCount} Pending
            </p>
            <span className="text-[10px] text-amber-700 font-bold block truncate">
              What-If & Replan Ready
            </span>
          </div>
        </div>
      </div>

      {/* QUICK FEATURE NAVIGATION JUMP-BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <button
          onClick={() => scrollToSection('section-health')}
          className="p-3 rounded-2xl bg-white border border-emerald-500/40 hover:border-emerald-600 transition-all flex items-center gap-2 shadow-2xs group text-left cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition-all shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-neutral-400 block uppercase">Health Score</span>
            <span className="text-xs font-extrabold text-emerald-800 truncate block">Diagnostics</span>
          </div>
        </button>

        <button
          onClick={() => scrollToSection('section-whatif')}
          className="p-3 rounded-2xl bg-white border border-rose-300 hover:border-rose-500 transition-all flex items-center gap-2 shadow-2xs group text-left cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center group-hover:scale-105 transition-all shrink-0">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-neutral-400 block uppercase">What-If</span>
            <span className="text-xs font-extrabold text-rose-700 truncate block">Simulation</span>
          </div>
        </button>

        {onTriggerOptimization ? (
          <button
            onClick={onTriggerOptimization}
            className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-300 hover:border-emerald-500 transition-all flex items-center gap-2 shadow-2xs group text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-xl bg-[#344E27] text-white flex items-center justify-center group-hover:scale-105 transition-all shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-neutral-400 block uppercase">Optimizer</span>
              <span className="text-xs font-extrabold text-[#344E27] truncate block">Before/After</span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => handleOpenSmartReplanWithReason()}
            className="p-3 rounded-2xl bg-white border border-neutral-200 hover:border-[#344E27] transition-all flex items-center gap-2 shadow-2xs group text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center group-hover:scale-105 transition-all shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-neutral-400 block uppercase">Replan</span>
              <span className="text-xs font-extrabold text-[#191919] truncate block">Smart Engine</span>
            </div>
          </button>
        )}

        <button
          onClick={() => scrollToSection('section-budget')}
          className="p-3 rounded-2xl bg-white border border-[#344E27]/30 hover:border-[#344E27] transition-all flex items-center gap-2 shadow-2xs group text-left cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-[#344E27] text-white flex items-center justify-center group-hover:scale-105 transition-all shrink-0">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-neutral-400 block uppercase">Budget ({destinationCountry.currencyCode})</span>
            <span className="text-xs font-extrabold text-[#344E27] truncate block">
              {formatINR(totalTripBudgetWithAirfare)}
            </span>
          </div>
        </button>

        <button
          onClick={() => scrollToSection('section-flights')}
          className="p-3 rounded-2xl bg-white border border-neutral-200 hover:border-[#344E27] transition-all flex items-center gap-2 shadow-2xs group text-left cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center group-hover:bg-[#344E27] group-hover:text-white transition-colors shrink-0">
            <Plane className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-neutral-400 block uppercase">Aviation</span>
            <span className="text-xs font-extrabold text-[#191919] truncate block">Flights</span>
          </div>
        </button>

        <button
          onClick={() => scrollToSection('section-map')}
          className="p-3 rounded-2xl bg-white border border-neutral-200 hover:border-[#344E27] transition-all flex items-center gap-2 shadow-2xs group text-left cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center group-hover:bg-[#344E27] group-hover:text-white transition-colors shrink-0">
            <Map className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-neutral-400 block uppercase">Route</span>
            <span className="text-xs font-extrabold text-[#191919] truncate block">Map</span>
          </div>
        </button>

        <button
          onClick={() => scrollToSection('section-group')}
          className="p-3 rounded-2xl bg-white border border-neutral-200 hover:border-[#344E27] transition-all flex items-center gap-2 shadow-2xs group text-left cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center group-hover:bg-[#344E27] group-hover:text-white transition-colors shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-neutral-400 block uppercase">Group</span>
            <span className="text-xs font-extrabold text-[#191919] truncate block">Members</span>
          </div>
        </button>

        <button
          onClick={() => scrollToSection('section-safety')}
          className="p-3 rounded-2xl bg-white border border-neutral-200 hover:border-[#344E27] transition-all flex items-center gap-2 shadow-2xs group text-left cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center group-hover:bg-[#344E27] group-hover:text-white transition-colors shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-neutral-400 block uppercase">Safety</span>
            <span className="text-xs font-extrabold text-[#191919] truncate block">Guide</span>
          </div>
        </button>
      </div>

      {/* FEATURE: AI TRIP HEALTH SCORE CARD */}
      <div id="section-health">
        <TripHealthScoreCard
          trip={trip}
          onApplyImprovement={onApplyHealthImprovement || (() => {})}
          onTriggerOptimization={onTriggerOptimization}
        />
      </div>

      {/* FEATURE: WHAT-IF SCENARIO SIMULATOR */}
      <div id="section-whatif">
        <WhatIfSimulatorSection
          trip={trip}
          currency={currency}
          onOpenSmartReplanWithReason={handleOpenSmartReplanWithReason}
          onApplyReplan={handleApplyReplanSuggestion}
        />
      </div>

      {/* ========================================================================= */}
      {/* ITINERARY TIMELINE & ACTIVITY MASTER HUB */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider">
                Day-By-Day Schedule
              </span>
              <span className="text-xs text-neutral-300">•</span>
              <span className="text-xs font-semibold text-neutral-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#344E27]" />
                {trip.travelDates}
              </span>
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#191919] mt-0.5">
              Personalized Daily Itinerary
            </h2>
          </div>

          {/* Day Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {trip.itinerary.map((day) => {
              const dayDate = day.formattedDate || (trip.startDate ? calculateTripDayDate(trip.startDate, day.dayNumber).formattedDay : null);
              return (
                <button
                  key={day.dayNumber}
                  onClick={() => {
                    setActiveDay(day.dayNumber);
                    setActivityCategoryFilter('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex flex-col items-center min-w-[76px] ${
                    activeDay === day.dayNumber
                      ? 'bg-[#344E27] text-white shadow-sm ring-2 ring-[#344E27]/30'
                      : 'bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200'
                  }`}
                >
                  <span className="leading-tight">Day 0{day.dayNumber}</span>
                  {dayDate && (
                    <span className={`text-[10px] font-medium leading-tight mt-0.5 ${activeDay === day.dayNumber ? 'text-emerald-200' : 'text-neutral-400'}`}>
                      {dayDate}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Timeline Details */}
        {trip.itinerary
          .filter((d) => d.dayNumber === activeDay)
          .map((day) => (
            <div
              key={day.dayNumber}
              className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#E5E7EB] shadow-2xs space-y-6"
            >
              {/* Day Header with Live Progress */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E5ECE0] text-[#344E27]">
                      DAY 0{day.dayNumber}
                    </span>
                    {(day.formattedDate || (trip.startDate && calculateTripDayDate(trip.startDate, day.dayNumber).formattedFull)) && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#344E27]" />
                        <span>{day.formattedDate ? `${day.formattedDate}, ${trip.startDate?.slice(0, 4) || '2026'}` : calculateTripDayDate(trip.startDate, day.dayNumber).formattedFull}</span>
                      </span>
                    )}
                    <span className="text-xs font-semibold text-neutral-500">
                      {dayCompletedCount} of {dayTotalCount} Activities Completed
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl text-[#191919] mt-2">
                    {day.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Theme: {day.theme}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAddActivity(day.dayNumber)}
                    className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-[#344E27] text-neutral-700 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Activity</span>
                  </button>

                  <button
                    onClick={() => handleOpenSmartReplanWithReason('running_late')}
                    className="px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Replan Day</span>
                  </button>
                </div>
              </div>

              {/* Day Activity Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-neutral-500">
                  <span>Daily Progress</span>
                  <span>{dayProgressPct}% Done</span>
                </div>
                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${dayProgressPct}%` }}
                    className="h-full bg-[#344E27] transition-all duration-300 rounded-full"
                  />
                </div>
              </div>

              {/* Activity Category Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2">
                {[
                  { id: 'all', label: 'All Activities' },
                  { id: 'sightseeing', label: 'Sightseeing' },
                  { id: 'food', label: 'Dining' },
                  { id: 'relaxation', label: 'Relaxation' },
                  { id: 'adventure', label: 'Adventure' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActivityCategoryFilter(cat.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      activityCategoryFilter === cat.id
                        ? 'bg-neutral-800 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Activities Vertical Timeline */}
              <div className="relative pl-6 sm:pl-8 space-y-6 border-l-2 border-dashed border-[#C8DAC1] pt-2">
                {filteredDayActivities.map((act, index) => {
                  const isDone = completedActivities.has(act.id);
                  const isExpanded = expandedActivityId === act.id;

                  return (
                    <div key={act.id} className="relative group">
                      
                      {/* Circle / Checkbox on timeline */}
                      <button
                        onClick={() => toggleActivityCompletion(act.id, act.activity)}
                        title={isDone ? "Mark as pending" : "Mark as completed"}
                        className={`absolute -left-[31px] sm:-left-[39px] top-2 w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isDone 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'bg-white border-2 border-[#344E27] hover:border-emerald-600 text-transparent hover:text-emerald-600'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>

                      {/* Activity Item Card */}
                      <div className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-2.5 ${
                        isDone 
                          ? 'bg-emerald-50/40 border-emerald-200' 
                          : 'bg-neutral-50 hover:bg-[#F4F7F2] border-neutral-200/80'
                      }`}>
                        
                        {/* Top Metadata Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-[#344E27] text-white">
                              {act.time}
                            </span>
                            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                              {act.category}
                            </span>
                            {isDone && (
                              <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                                Completed
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-[#191919]">
                              {act.estimatedCost === 0 ? 'Free' : formatCurrency(act.estimatedCost, currency)}
                            </span>
                            <button
                              onClick={() => setExpandedActivityId(isExpanded ? null : act.id)}
                              className="text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                              title="Toggle details"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h4 className={`font-display font-bold text-base ${isDone ? 'line-through text-neutral-500' : 'text-[#191919]'}`}>
                          {act.activity}
                        </h4>

                        <p className="text-xs text-neutral-600 leading-relaxed">
                          {act.aiRecommendation || 'Enjoy this curated travel experience.'}
                        </p>

                        {/* Quick details */}
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#344E27]" />
                            {act.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#344E27]" />
                            {act.duration}
                          </span>
                        </div>

                        {/* Expandable Pro Travel Details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-neutral-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
                            <div className="p-3 rounded-xl bg-white border border-neutral-200">
                              <span className="font-bold text-[#344E27] block mb-0.5">💡 AI Insider Tip</span>
                              <span className="text-neutral-600 text-[11px]">
                                Arrive 15 mins before to beat crowds. Photography lighting is ideal during this slot.
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-neutral-200">
                              <span className="font-bold text-[#344E27] block mb-0.5">🧭 Navigation & Attire</span>
                              <span className="text-neutral-600 text-[11px]">
                                Casual comfortable walking footwear recommended. Keep water bottle handy.
                              </span>
                            </div>
                          </div>
                        )}

                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))}
      </section>

      {/* FEATURE 2: INTERACTIVE TRIP MAP & ROUTE OPTIMIZER */}
      <div id="section-map">
        <TripMapView
          trip={trip}
          activeDay={activeDay}
          onSelectDay={(day) => setActiveDay(day)}
          onApplyOptimizedRoute={handleApplyRouteOptimization}
          currency={currency}
        />
      </div>

      {/* FEATURE 4: GROUP TRIP COLLABORATION SECTION */}
      <div id="section-group">
        <GroupTripSection trip={trip} />
      </div>

      {/* FEATURE 6: ESTIMATED BUDGET & FINANCIAL INTELLIGENCE */}
      <EstimatedBudgetSection
        trip={trip}
        currency={currency}
        onViewFullBudget={onViewBudget}
        onToast={showToast}
        selectedCountry={destinationCountry}
        onSelectCountry={onSelectCountry}
        flightCabinClass={flightCabinClass}
        onSelectFlightCabinClass={onSelectFlightCabinClass}
        includeFlights={includeFlights}
        onToggleIncludeFlights={onToggleIncludeFlights}
        onUpdateBudget={onUpdateBudget}
      />

      {/* FEATURE 7: FLIGHT BOOKINGS & AIRPORT INTELLIGENCE */}
      <TripFlightsSection
        trip={trip}
        currency={currency}
        onToast={showToast}
      />

      {/* ========================================================================= */}
      {/* HOTEL RECOMMENDATIONS SECTION (WITH FILTER & DETAIL MODAL) */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider">
              Handpicked Stays
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#191919] mt-0.5">
              AI Selected Accommodations
            </h2>
          </div>

          {/* Hotel Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full self-start sm:self-auto">
            {['all', 'luxury', 'mid', 'budget'].map(cat => (
              <button
                key={cat}
                onClick={() => setHotelFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer ${
                  hotelFilter === cat
                    ? 'bg-[#344E27] text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {cat === 'all' ? 'All Stays' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredHotels.map((hotel) => (
            <div
              key={hotel.id}
              className={`bg-white rounded-[24px] overflow-hidden border transition-all flex flex-col justify-between ${
                hotel.selected 
                  ? 'border-[#344E27] ring-2 ring-[#344E27] shadow-md' 
                  : 'border-[#E5E7EB] shadow-2xs hover:shadow-md'
              }`}
            >
              {/* Hotel Image with Badges */}
              <div className="relative h-48 overflow-hidden bg-neutral-100">
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-[#344E27] uppercase">
                    {hotel.category || 'Standard'} Tier
                  </div>
                  <PlaceStatusBadge status={hotel.dataStatus} source={hotel.source} />
                </div>
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px] font-bold text-white flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                  <span>{hotel.rating}</span>
                </div>
              </div>

              {/* Hotel Details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-bold text-base text-[#191919]">
                      {hotel.name}
                    </h4>
                    <button
                      onClick={() => setDetailModalItem({ type: 'hotel', data: hotel })}
                      className="text-neutral-400 hover:text-[#344E27] p-1"
                      title="View Stay Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-[#344E27]" />
                    {hotel.location}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {hotel.amenities.map((am, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] text-neutral-600 font-medium"
                      >
                        {am}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price & Selection Button */}
                <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Per Night</span>
                    <span className="font-display font-extrabold text-lg text-[#191919]">
                      {formatCurrency(hotel.pricePerNight, currency)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectHotel(hotel);
                      showToast(`Selected "${hotel.name}" as your active stay`);
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      hotel.selected
                        ? 'bg-[#344E27] text-white shadow-xs'
                        : 'bg-[#E5ECE0] hover:bg-[#344E27] text-[#344E27] hover:text-white'
                    }`}
                  >
                    {hotel.selected ? 'Selected Stay' : 'Select Stay'}
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* TOURIST ATTRACTIONS SECTION */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider">
              Must-Visit Sights
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#191919] mt-0.5">
              Top Tourist Attractions
            </h2>
          </div>

          {/* Place Category Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full self-start sm:self-auto">
            {['all', 'Beach', 'Heritage', 'Nature', 'Market'].map(cat => (
              <button
                key={cat}
                onClick={() => setPlaceFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer ${
                  placeFilter === cat
                    ? 'bg-[#344E27] text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {cat === 'all' ? 'All Sights' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredPlaces.map((place) => (
            <div
              key={place.id}
              className="bg-white rounded-[24px] overflow-hidden border border-[#E5E7EB] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="relative h-44 overflow-hidden bg-neutral-100">
                <img
                  src={place.image}
                  alt={place.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <div className="bg-[#344E27]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase">
                    {place.category}
                  </div>
                  <PlaceStatusBadge status={place.dataStatus} source={place.source} />
                </div>
                <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px] font-bold text-white flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                  <span>{place.rating}</span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-bold text-base text-[#191919]">
                      {place.name}
                    </h4>
                    <button
                      onClick={() => setDetailModalItem({ type: 'place', data: place })}
                      className="text-neutral-400 hover:text-[#344E27] p-1"
                      title="View Attraction Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-neutral-500 mt-0.5">
                    {place.location} • {place.estimatedDuration}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1.5 line-clamp-2">
                    {place.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#191919]">
                    {place.entryCost === 0 ? 'Free Entry' : formatCurrency(place.entryCost, currency)}
                  </span>

                  <button
                    onClick={() => {
                      onTogglePlace(place.id);
                      showToast(place.added ? `Removed "${place.name}" from itinerary` : `Added "${place.name}" to itinerary`);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      place.added
                        ? 'bg-[#344E27] text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {place.added ? 'In Itinerary' : '+ Add Place'}
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RESTAURANT SECTION */}
      {/* ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider">
              Culinary Highlights
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#191919] mt-0.5">
              AI Recommended Restaurants
            </h2>
          </div>

          {/* Restaurant Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full self-start sm:self-auto">
            {['all', '$$', '$$$', 'Seafood'].map(cat => (
              <button
                key={cat}
                onClick={() => setRestFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer ${
                  restFilter === cat
                    ? 'bg-[#344E27] text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {cat === 'all' ? 'All Dining' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredRestaurants.map((rest) => (
            <div
              key={rest.id}
              className="bg-white rounded-[24px] overflow-hidden border border-[#E5E7EB] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="relative h-44 overflow-hidden bg-neutral-100">
                <img
                  src={rest.image}
                  alt={rest.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-[#344E27]">
                  {rest.aiRecommendedBadge}
                </div>
                <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px] font-bold text-white flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                  <span>{rest.rating}</span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-bold text-base text-[#191919]">
                      {rest.name}
                    </h4>
                    <button
                      onClick={() => setDetailModalItem({ type: 'restaurant', data: rest })}
                      className="text-neutral-400 hover:text-[#344E27] p-1"
                      title="View Dining Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-neutral-500 mt-0.5">
                    {rest.cuisine} • {rest.priceLevel}
                  </p>
                  <p className="text-xs text-neutral-600 mt-2 font-medium">
                    Specialty: {rest.specialty}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Avg Meal (2 Pax)</span>
                    <span className="text-xs font-bold text-[#191919]">
                      {formatCurrency(rest.averagePrice, currency)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onToggleRestaurant(rest.id);
                      showToast(rest.added ? `Removed "${rest.name}" from dining list` : `Saved "${rest.name}" to trip dining list`);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      rest.added
                        ? 'bg-[#344E27] text-white'
                        : 'bg-[#E5ECE0] hover:bg-[#344E27] text-[#344E27] hover:text-white'
                    }`}
                  >
                    {rest.added ? 'Added' : 'Add to Trip'}
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURE: TRAVEL SAFETY & LOCAL GUIDANCE */}
      <div id="section-safety">
        <TravelSafetySection destination={trip.destination} />
      </div>

      {/* SMART REPLAN MODAL */}
      <SmartReplanModal
        isOpen={isSmartReplanOpen}
        onClose={() => {
          setIsSmartReplanOpen(false);
          setReplanPresetDisruption(undefined);
        }}
        trip={trip}
        activeDayNumber={activeDay}
        initialDisruptionType={replanPresetDisruption}
        onApplySuggestion={handleApplyReplanSuggestion}
      />

      {/* ========================================================================= */}
      {/* SHARE & EXPORT MODAL */}
      {/* ========================================================================= */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-[#191919]">
                    Share & Export Itinerary
                  </h3>
                  <span className="text-xs text-neutral-400">Export calendar, copy text briefing, or print</span>
                </div>
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Calendar Download */}
              <button
                onClick={handleDownloadCalendar}
                className="w-full p-4 rounded-2xl bg-neutral-50 hover:bg-[#E5ECE0] border border-neutral-200 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-[#191919] block">
                      Export to Calendar (.ics)
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Sync all {trip.days} days with Google Calendar, Apple Calendar or Outlook
                    </span>
                  </div>
                </div>
                <Download className="w-4 h-4 text-neutral-400 group-hover:text-[#344E27]" />
              </button>

              {/* Option 2: Copy Text Briefing */}
              <button
                onClick={handleCopyItinerary}
                className="w-full p-4 rounded-2xl bg-neutral-50 hover:bg-[#E5ECE0] border border-neutral-200 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Copy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-[#191919] block">
                      Copy Formatted Summary
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Perfect for pasting into WhatsApp group or Email to co-travelers
                    </span>
                  </div>
                </div>
                <Copy className="w-4 h-4 text-neutral-400 group-hover:text-[#344E27]" />
              </button>

              {/* Option 3: Print Sheet */}
              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  window.print();
                }}
                className="w-full p-4 rounded-2xl bg-neutral-50 hover:bg-[#E5ECE0] border border-neutral-200 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-[#191919] block">
                      Print / Save as PDF
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Formatted physical printout with daily schedule
                    </span>
                  </div>
                </div>
                <Printer className="w-4 h-4 text-neutral-400 group-hover:text-[#344E27]" />
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ITEM DETAIL MODAL (HOTEL, PLACE, RESTAURANT) */}
      {/* ========================================================================= */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            
            {/* Image */}
            <div className="relative h-56 w-full bg-neutral-100">
              <img
                src={detailModalItem.data.image}
                alt={detailModalItem.data.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setDetailModalItem(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#344E27] capitalize">
                  {detailModalItem.type} Details
                </div>
                {(detailModalItem.data.dataStatus || detailModalItem.data.source) && (
                  <PlaceStatusBadge 
                    status={detailModalItem.data.dataStatus} 
                    source={detailModalItem.data.source} 
                  />
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 pt-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[#191919]">
                    {detailModalItem.data.name}
                  </h3>
                  <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#344E27]" />
                    {detailModalItem.data.location}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-bold text-amber-800 border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  <span>{detailModalItem.data.rating}</span>
                </div>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                {detailModalItem.data.description || detailModalItem.data.specialty || 'Curated recommendation for your trip.'}
              </p>

              {/* Specific info */}
              {detailModalItem.type === 'hotel' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {detailModalItem.data.amenities?.map((am: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-neutral-100 text-[11px] text-neutral-700 font-medium">
                        ✓ {am}
                      </span>
                    ))}
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#E5ECE0]/60 border border-[#344E27]/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#344E27]">Room Price</span>
                    <span className="font-display font-extrabold text-base text-[#191919]">
                      {detailModalItem.data.pricePerNight != null
                        ? `${formatCurrency(detailModalItem.data.pricePerNight, currency)} / night`
                        : 'Price unavailable (Live tariff on request)'}
                    </span>
                  </div>
                </div>
              )}

              {detailModalItem.type === 'place' && (
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-600">Duration: {detailModalItem.data.estimatedDuration}</span>
                  <span className="font-extrabold text-[#191919]">
                    {detailModalItem.data.entryCost === 0 ? 'Free Entry' : formatCurrency(detailModalItem.data.entryCost, currency)}
                  </span>
                </div>
              )}

              {detailModalItem.type === 'restaurant' && (
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-600">Cuisine: {detailModalItem.data.cuisine}</span>
                  <span className="font-extrabold text-[#191919]">
                    Avg ~ {formatCurrency(detailModalItem.data.averagePrice, currency)}
                  </span>
                </div>
              )}

              <button
                onClick={() => setDetailModalItem(null)}
                className="w-full py-2.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white font-extrabold text-xs transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CHANGE TRAVEL DATES & DURATION MODAL */}
      {isDatePickerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 space-y-6 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[#191919]">
                    Change Travel Dates
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Modifying dates dynamically reschedules the itinerary, accommodation & live weather.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDatePickerModalOpen(false)}
                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-5">
              {/* Departure Date Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#191919] mb-2 flex items-center justify-between">
                  <span>Departure Start Date</span>
                  {isPreviewWeatherLive ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      🟢 Live Weather Active (≤16d)
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                      📅 Seasonal Climate Model
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  id="dashboard-edit-start-date"
                  min={getTodayISO()}
                  value={editStartDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setEditStartDate(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-2.5 text-sm font-bold text-neutral-800 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white rounded-2xl border border-neutral-300 focus:border-[#344E27] focus:ring-2 focus:ring-[#344E27]/20 outline-none transition-all cursor-pointer"
                />
              </div>

              {/* Duration Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#191919] mb-2">
                  <span>Trip Duration: {editDays} Days</span>
                  <span className="text-neutral-500 font-medium">({previewDateRange.nights} Nights)</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="14"
                  value={editDays}
                  onChange={(e) => setEditDays(Number(e.target.value))}
                  className="w-full accent-[#344E27] cursor-pointer"
                  aria-label="Trip duration slider"
                />
                
                {/* Duration Presets */}
                <div className="flex justify-between text-[11px] font-medium pt-2">
                  {[
                    { label: 'Weekend (2d)', val: 2 },
                    { label: '5 Days (Ideal)', val: 5 },
                    { label: '1 Week (7d)', val: 7 },
                    { label: '2 Weeks (14d)', val: 14 }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setEditDays(preset.val)}
                      className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                        editDays === preset.val
                          ? 'bg-[#344E27] text-white font-bold shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Preview Box */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Calculated Travel Window Preview
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-neutral-500">Departure</span>
                    <p className="text-sm font-extrabold text-[#191919]">{previewDateRange.startDateFormatted}</p>
                  </div>
                  <span className="text-neutral-300 font-light text-xl">→</span>
                  <div className="text-right">
                    <span className="text-[11px] text-neutral-500">Return</span>
                    <p className="text-sm font-extrabold text-[#191919]">{previewDateRange.endDateFormatted}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-xs font-semibold text-[#344E27]">
                  <span>Total Schedule:</span>
                  <span>{previewDateRange.formattedRange} ({editDays} Days)</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsDatePickerModalOpen(false)}
                className="px-4 py-2.5 rounded-full text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="apply-travel-dates-btn"
                onClick={() => {
                  if (onUpdateTripDates) {
                    onUpdateTripDates(editStartDate, editDays);
                  }
                  setIsDatePickerModalOpen(false);
                  showToast(`Travel dates updated to: ${previewDateRange.formattedRange}!`);
                }}
                className="px-6 py-2.5 rounded-full bg-[#344E27] hover:bg-[#2b4120] text-white text-xs font-bold shadow-md shadow-[#344E27]/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply Travel Dates</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
