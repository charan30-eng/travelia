import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PlannerView } from './components/PlannerView';
import { TripDashboardView } from './components/TripDashboardView';
import { BudgetView } from './components/BudgetView';
import { DiscoverView } from './components/DiscoverView';
import { MyTripsView } from './components/MyTripsView';
import { AIChatModal } from './components/AIChatModal';
import { JavaCodeViewer } from './components/JavaCodeViewer';
import { AddActivityModal } from './components/AddActivityModal';
import { AIOptimizationModal } from './components/AIOptimizationModal';
import { 
  TripPlan, 
  Currency, 
  TripPreference, 
  Hotel, 
  BudgetBreakdown, 
  ItineraryActivity 
} from './types';
import { 
  DEFAULT_GOA_TRIP, 
  INITIAL_SAVED_TRIPS, 
  generateTripFromPrompt 
} from './data/mockData';
import { Sparkles, MessageSquare, Bot } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CountryCurrencyInfo, detectCountryFromDestination } from './data/currencyHelper';
import { optimizeTrip, OptimizationResult } from './services/aiClient';
import { calculateTravelDateRange, calculateTripDayDate } from './utils/dateUtils';
import { placesClient } from './services/placesClient';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [currentTrip, setCurrentTrip] = useState<TripPlan>(DEFAULT_GOA_TRIP);
  const [savedTrips, setSavedTrips] = useState<TripPlan[]>(INITIAL_SAVED_TRIPS);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [plannerDestination, setPlannerDestination] = useState<string>('');

  // Shared Budget, Flight & Currency State connecting ALL budget tabs
  const [selectedCountry, setSelectedCountry] = useState<CountryCurrencyInfo>(() =>
    detectCountryFromDestination(DEFAULT_GOA_TRIP.destination, DEFAULT_GOA_TRIP.country)
  );
  const [flightCabinClass, setFlightCabinClass] = useState<'economy' | 'premium' | 'business'>('economy');
  const [includeFlights, setIncludeFlights] = useState<boolean>(true);
  const [budgetSubTab, setBudgetSubTab] = useState<'itemized' | 'calculator' | 'optimizer' | 'splitter'>('itemized');

  // Modals & Panels
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState<boolean>(false);
  const [activeActivityDay, setActiveActivityDay] = useState<number>(1);
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState<boolean>(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  const handleOpenOptimization = async (customResult?: OptimizationResult) => {
    if (customResult) {
      setOptimizationResult(customResult);
      setIsOptimizationModalOpen(true);
      return;
    }
    setIsOptimizing(true);
    try {
      const res = await optimizeTrip(currentTrip);
      setOptimizationResult(res);
      setIsOptimizationModalOpen(true);
    } catch (err) {
      console.error('Failed to run AI optimization:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOptimization = (result: OptimizationResult) => {
    setCurrentTrip((prev) => {
      const updatedItinerary = result.optimizedItinerary && result.optimizedItinerary.length > 0
        ? result.optimizedItinerary
        : prev.itinerary;

      // Calculate new activity budget
      const newActivityTotal = updatedItinerary.reduce(
        (sum, d) => sum + d.activities.reduce((dSum, a) => dSum + (a.estimatedCost || 0), 0),
        0
      );

      const flights = prev.budget.flights || 0;
      const newTotalBudget = prev.budget.hotel + flights + prev.budget.food + prev.budget.transportation + newActivityTotal + prev.budget.miscellaneous;

      const updatedNotes = [
        ...prev.aiNotes,
        `✨ Applied AI Optimization: ${result.summary} (Health Score ${result.healthScoreBefore} → ${result.healthScoreAfter}, Saved: ₹${result.estimatedSavings.toLocaleString('en-IN')})`
      ];

      return {
        ...prev,
        itinerary: updatedItinerary,
        budget: {
          ...prev.budget,
          activities: newActivityTotal,
          total: newTotalBudget
        },
        aiNotes: updatedNotes
      };
    });

    try {
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    setIsOptimizationModalOpen(false);
  };

  const handleViewBudget = (subTab?: 'itemized' | 'calculator' | 'optimizer' | 'splitter') => {
    if (subTab) {
      setBudgetSubTab(subTab);
    }
    setActiveTab('budget');
  };

  // Generate trip handler
  // Generate trip handler connected to Real Places Data Layer
  const handleGenerateTrip = async (
    destination: string, 
    days: number, 
    travelers: number, 
    preferences: TripPreference[],
    customDates?: string,
    startDateInput?: string
  ) => {
    setIsGenerating(true);
    
    try {
      const generated = generateTripFromPrompt(destination, days, travelers, preferences, customDates, startDateInput);
      const cleanDest = (destination || '').split(',')[0].trim();

      // Fetch authentic live hotels and tourist places from Google Places Data Layer
      try {
        const [hotelsRes, attractionsRes] = await Promise.all([
          placesClient.searchHotels(cleanDest, 4),
          placesClient.searchAttractions(cleanDest, 6)
        ]);

        if (hotelsRes && hotelsRes.places.length > 0) {
          generated.hotels = hotelsRes.places.map((p, idx) => 
            placesClient.placeToHotel(p, idx, generated.nights)
          );
        }

        if (attractionsRes && attractionsRes.places.length > 0) {
          generated.touristPlaces = attractionsRes.places.map((p, idx) => 
            placesClient.placeToTouristPlace(p, idx)
          );
        }
      } catch (placesErr) {
        console.warn('[App] Places Data Layer fetch fallback:', placesErr);
      }

      setCurrentTrip(generated);
      setSelectedCountry(detectCountryFromDestination(generated.destination, generated.country));
      setIsGenerating(false);
      setActiveTab('dashboard');

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    } catch (err) {
      console.error('[App] Generation failed:', err);
      setIsGenerating(false);
    }
  };

  // Update trip dates & duration handler
  const handleUpdateTripDates = (newStartDate: string, newDays?: number) => {
    setCurrentTrip((prev) => {
      const targetDays = newDays ?? prev.days;
      const dateRange = calculateTravelDateRange(newStartDate, targetDays);
      
      let updatedItinerary = prev.itinerary;
      if (targetDays !== prev.days) {
        if (targetDays < prev.days) {
          updatedItinerary = prev.itinerary.slice(0, targetDays);
        } else {
          const addedDaysCount = targetDays - prev.days;
          const additionalDays = Array.from({ length: addedDaysCount }).map((_, idx) => {
            const dayNum = prev.days + idx + 1;
            const dayInfo = calculateTripDayDate(dateRange.startDateISO, dayNum);
            return {
              dayNumber: dayNum,
              date: dayInfo.dateISO,
              formattedDate: dayInfo.formattedDay,
              title: `Day ${dayNum} Cultural Highlights & Local Discovery`,
              theme: `Tailored experiences for ${prev.preferences?.join(' & ') || 'Leisure'}`,
              activities: [
                {
                  id: `ext-act-${dayNum}-1`,
                  time: '10:00 AM',
                  activity: `Explore Scenic Landmarks of ${prev.destination}`,
                  location: `Central ${prev.destination}`,
                  estimatedCost: 400 * prev.travelers,
                  duration: '2.5 hrs',
                  aiRecommendation: 'Optimal morning lighting and relaxed walking route.',
                  category: 'sightseeing' as const
                },
                {
                  id: `ext-act-${dayNum}-2`,
                  time: '01:30 PM',
                  activity: `Regional Cuisine & Artisan Dining Experience`,
                  location: `Historic Quarter, ${prev.destination}`,
                  estimatedCost: 650 * prev.travelers,
                  duration: '1.5 hrs',
                  aiRecommendation: 'Savor regional specialties recommended by local concierges.',
                  category: 'food' as const
                },
                {
                  id: `ext-act-${dayNum}-3`,
                  time: '04:30 PM',
                  activity: `Sunset Scenic Leisure & Waterfront Stroll`,
                  location: `Panoramic Viewpoint, ${prev.destination}`,
                  estimatedCost: 300 * prev.travelers,
                  duration: '2.0 hrs',
                  aiRecommendation: 'Golden hour panoramic vista and tranquil evening unwind.',
                  category: 'relaxation' as const
                }
              ]
            };
          });
          updatedItinerary = [...prev.itinerary, ...additionalDays];
        }
      }

      // Re-map dates for all days in itinerary
      const mappedItinerary = updatedItinerary.map((d, idx) => {
        const dayInfo = calculateTripDayDate(dateRange.startDateISO, idx + 1);
        return {
          ...d,
          dayNumber: idx + 1,
          date: dayInfo.dateISO,
          formattedDate: dayInfo.formattedDay
        };
      });

      // Recalculate hotel stay cost for new nights
      const nights = dateRange.nights;
      const currentHotelPricePerNight = prev.hotels?.find(h => h.selected)?.pricePerNight || Math.round(prev.budget.hotel / Math.max(1, prev.nights));
      const newHotelTotal = Math.round(currentHotelPricePerNight * nights);
      const budgetDiff = newHotelTotal - prev.budget.hotel;

      return {
        ...prev,
        startDate: dateRange.startDateISO,
        endDate: dateRange.endDateISO,
        travelDates: dateRange.formattedRange,
        days: dateRange.durationDays,
        nights: dateRange.nights,
        itinerary: mappedItinerary,
        budget: {
          ...prev.budget,
          hotel: newHotelTotal,
          total: prev.budget.total + budgetDiff
        }
      };
    });
  };

  // Start planning from Home / Discover with optional prefilled destination
  const handleStartPlanning = (dest?: string) => {
    setPlannerDestination(dest || '');
    setActiveTab('planner');
  };

  // Save Trip to My Trips
  const handleSaveTrip = (tripToSave: TripPlan) => {
    setSavedTrips((prev) => {
      const exists = prev.some((t) => t.id === tripToSave.id);
      if (exists) {
        return prev.map((t) => (t.id === tripToSave.id ? { ...tripToSave, status: 'saved' } : t));
      }
      return [{ ...tripToSave, status: 'saved' }, ...prev];
    });

    try {
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.7 }
      });
    } catch (e) {}
  };

  // Delete Trip from My Trips
  const handleDeleteTrip = (tripId: string) => {
    setSavedTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  // Open Saved Trip into active Dashboard
  const handleOpenTrip = (trip: TripPlan) => {
    setCurrentTrip(trip);
    setSelectedCountry(detectCountryFromDestination(trip.destination, trip.country));
    setActiveTab('dashboard');
  };

  // Hotel Selection Toggle
  const handleSelectHotel = (hotel: Hotel) => {
    setCurrentTrip((prev) => {
      const updatedHotels = prev.hotels.map((h) => ({
        ...h,
        selected: h.id === hotel.id
      }));

      const newHotelBudget = hotel.pricePerNight * prev.nights;
      const flightCost = prev.budget.flights || 0;
      const newTotal = newHotelBudget + flightCost + prev.budget.food + prev.budget.transportation + prev.budget.activities + prev.budget.miscellaneous;

      return {
        ...prev,
        hotels: updatedHotels,
        budget: {
          ...prev.budget,
          hotel: newHotelBudget,
          flights: flightCost,
          total: newTotal
        }
      };
    });
  };

  // Place Toggle (Add / Remove)
  const handleTogglePlace = (placeId: string) => {
    setCurrentTrip((prev) => ({
      ...prev,
      touristPlaces: prev.touristPlaces.map((p) =>
        p.id === placeId ? { ...p, added: !p.added } : p
      )
    }));
  };

  // Restaurant Toggle (Add / Remove)
  const handleToggleRestaurant = (restId: string) => {
    setCurrentTrip((prev) => ({
      ...prev,
      restaurants: prev.restaurants.map((r) =>
        r.id === restId ? { ...r, added: !r.added } : r
      )
    }));
  };

  // Update Budget from Budget view sliders
  const handleUpdateBudget = (newBudget: BudgetBreakdown, controls: Partial<TripPlan>) => {
    setCurrentTrip((prev) => ({
      ...prev,
      ...controls,
      budget: newBudget
    }));

    try {
      confetti({
        particleCount: 30,
        spread: 45,
        origin: { y: 0.8 }
      });
    } catch (e) {}
  };

  // Add custom activity
  const handleAddActivity = (dayNumber: number) => {
    setActiveActivityDay(dayNumber);
    setIsAddActivityOpen(true);
  };

  const handleConfirmAddActivity = (activity: ItineraryActivity) => {
    setCurrentTrip((prev) => ({
      ...prev,
      itinerary: prev.itinerary.map((d) =>
        d.dayNumber === activeActivityDay
          ? { ...d, activities: [...d.activities, activity] }
          : d
      )
    }));
  };

  // AI Chat Actions
  const handleApplyChatAction = (actionType: string) => {
    if (actionType === 'discount_hotel') {
      setCurrentTrip((prev) => {
        const nights = prev.nights || Math.max(1, (prev.days || 1) - 1);
        const currentHotel = prev.hotels?.find(h => h.selected) || prev.hotels?.[0];
        const lowerTierHotel = prev.hotels?.find(h => !h.selected && h.pricePerNight < (currentHotel?.pricePerNight || 4200));

        if (lowerTierHotel && currentHotel) {
          const savingsPerNight = Math.max(0, currentHotel.pricePerNight - lowerTierHotel.pricePerNight);
          const totalSavings = savingsPerNight * nights;
          const newHotelBudget = lowerTierHotel.pricePerNight * nights;
          return {
            ...prev,
            hotelCategory: 'mid',
            hotels: prev.hotels.map(h => ({ ...h, selected: h.id === lowerTierHotel.id })),
            budget: {
              ...prev.budget,
              hotel: newHotelBudget,
              total: Math.max(0, prev.budget.total - totalSavings)
            },
            aiNotes: [...prev.aiNotes, `Switched hotel to ${lowerTierHotel.name} (saves verified ₹${totalSavings.toLocaleString('en-IN')}).`]
          };
        }

        const currentCost = prev.budget.hotel || 0;
        return {
          ...prev,
          hotelCategory: 'mid',
          budget: {
            ...prev.budget,
            hotel: currentCost,
            total: prev.budget.total
          },
          aiNotes: [...prev.aiNotes, 'Hotel selection optimized to current verified rate.']
        };
      });
    } else if (actionType === 'add_beach') {
      setCurrentTrip((prev) => ({
        ...prev,
        touristPlaces: prev.touristPlaces.map((p) => ({ ...p, added: true })),
        aiNotes: [...prev.aiNotes, 'Added recommended serene beaches to itinerary.']
      }));
    }
  };

  // Smart Replan Suggestion Applier
  const handleApplyReplan = (suggestion: any) => {
    setCurrentTrip((prev) => {
      const updatedNotes = [
        ...prev.aiNotes,
        `⚡ Smart Replan Applied: ${suggestion.title} (${suggestion.disruptionReason})`
      ];

      // If changes include activity modifications
      const updatedItinerary = prev.itinerary.map((day) => {
        if (suggestion.suggestedChanges) {
          const matchingChange = suggestion.suggestedChanges.find(
            (c: any) => c.activityTitle && day.activities.some(a => a.title.toLowerCase().includes(c.activityTitle.toLowerCase()))
          );
          if (matchingChange) {
            return {
              ...day,
              activities: day.activities.map((a) => {
                if (a.title.toLowerCase().includes(matchingChange.activityTitle.toLowerCase())) {
                  return {
                    ...a,
                    title: matchingChange.replacementTitle || a.title,
                    time: matchingChange.newTime || a.time,
                    description: matchingChange.reason || a.description
                  };
                }
                return a;
              })
            };
          }
        }
        return day;
      });

      return {
        ...prev,
        itinerary: updatedItinerary,
        aiNotes: updatedNotes
      };
    });
  };

  // Trip Health Improvement Applier
  const handleApplyHealthImprovement = (improvement: any) => {
    setCurrentTrip((prev) => ({
      ...prev,
      aiNotes: [
        ...prev.aiNotes,
        `🩺 Health Improvement: ${improvement.title} - ${improvement.impact}`
      ]
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#191919]">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'planner') {
            setPlannerDestination('');
          }
          setActiveTab(tab);
        }}
        currency={currency}
        onSelectCurrency={setCurrency}
        savedTripsCount={savedTrips.length}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeView
            onStartPlanning={handleStartPlanning}
            onExplore={() => setActiveTab('discover')}
            currency={currency}
          />
        )}

        {activeTab === 'planner' && (
          <PlannerView
            onGenerateTrip={handleGenerateTrip}
            initialDestination={plannerDestination}
            isGenerating={isGenerating}
          />
        )}

        {activeTab === 'dashboard' && (
          <TripDashboardView
            trip={currentTrip}
            onRegenerate={() => handleGenerateTrip(currentTrip.destination, currentTrip.days, currentTrip.travelers, currentTrip.preferences, currentTrip.travelDates, currentTrip.startDate)}
            onEdit={() => {
              setPlannerDestination(currentTrip.destination);
              setActiveTab('planner');
            }}
            onSaveTrip={handleSaveTrip}
            onViewBudget={handleViewBudget}
            onSelectHotel={handleSelectHotel}
            onTogglePlace={handleTogglePlace}
            onToggleRestaurant={handleToggleRestaurant}
            onAddActivity={handleAddActivity}
            onApplyReplan={handleApplyReplan}
            onApplyHealthImprovement={handleApplyHealthImprovement}
            onTriggerOptimization={() => handleOpenOptimization()}
            onUpdateTripDates={handleUpdateTripDates}
            currency={currency}
            isSaved={savedTrips.some((t) => t.id === currentTrip.id)}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            flightCabinClass={flightCabinClass}
            onSelectFlightCabinClass={setFlightCabinClass}
            includeFlights={includeFlights}
            onToggleIncludeFlights={setIncludeFlights}
            onUpdateBudget={handleUpdateBudget}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetView
            trip={currentTrip}
            onUpdateBudget={handleUpdateBudget}
            currency={currency}
            onBackToDashboard={() => setActiveTab('dashboard')}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            flightCabinClass={flightCabinClass}
            onSelectFlightCabinClass={setFlightCabinClass}
            includeFlights={includeFlights}
            onToggleIncludeFlights={setIncludeFlights}
            initialSubTab={budgetSubTab}
            onSelectSubTab={setBudgetSubTab}
          />
        )}

        {activeTab === 'discover' && (
          <DiscoverView
            onSelectDestination={handleStartPlanning}
            currency={currency}
          />
        )}

        {activeTab === 'my-trips' && (
          <MyTripsView
            savedTrips={savedTrips}
            onOpenTrip={handleOpenTrip}
            onDeleteTrip={handleDeleteTrip}
            onNewTrip={() => {
              setPlannerDestination('');
              setActiveTab('planner');
            }}
            currency={currency}
          />
        )}

        {activeTab === 'javafx' && (
          <JavaCodeViewer />
        )}
      </main>

      {/* FLOATING AI ASSISTANT BUTTON */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          id="floating-ai-assistant-btn"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="px-5 py-3.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white font-extrabold text-sm shadow-xl shadow-[#344E27]/30 hover:shadow-2xl hover:shadow-[#344E27]/40 transition-all flex items-center gap-2.5 group active:scale-95 cursor-pointer border border-[#E5ECE0]/20"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-[#E5ECE0] fill-current group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span>Travelia AI</span>
        </button>
      </div>

      {/* Floating AI Assistant Chat Drawer */}
      <AIChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        trip={currentTrip}
        onApplyAction={handleApplyChatAction}
        onOpenOptimizationModal={handleOpenOptimization}
        onApplyOptimization={handleApplyOptimization}
      />

      {/* AI Before vs After Optimization Review & Approval Modal */}
      <AIOptimizationModal
        isOpen={isOptimizationModalOpen}
        onClose={() => setIsOptimizationModalOpen(false)}
        trip={currentTrip}
        optimizationResult={optimizationResult}
        onApplyOptimization={handleApplyOptimization}
        currency={currency}
      />

      {/* Add Custom Activity Modal */}
      <AddActivityModal
        isOpen={isAddActivityOpen}
        onClose={() => setIsAddActivityOpen(false)}
        dayNumber={activeActivityDay}
        onAdd={handleConfirmAddActivity}
      />

    </div>
  );
}
