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

  const handleViewBudget = (subTab?: 'itemized' | 'calculator' | 'optimizer' | 'splitter') => {
    if (subTab) {
      setBudgetSubTab(subTab);
    }
    setActiveTab('budget');
  };

  // Generate trip handler
  const handleGenerateTrip = (
    destination: string, 
    days: number, 
    travelers: number, 
    preferences: TripPreference[]
  ) => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const generated = generateTripFromPrompt(destination, days, travelers, preferences);
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
    }, 1200);
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
      setCurrentTrip((prev) => ({
        ...prev,
        hotelCategory: 'mid',
        budget: {
          ...prev.budget,
          hotel: Math.round(prev.budget.hotel * 0.85),
          total: Math.round(prev.budget.total - 4500)
        },
        aiNotes: [...prev.aiNotes, 'Applied AI ₹4,500 budget reduction optimization.']
      }));
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
            onRegenerate={() => handleGenerateTrip(currentTrip.destination, currentTrip.days, currentTrip.travelers, currentTrip.preferences)}
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
