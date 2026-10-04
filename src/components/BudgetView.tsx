import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  Building2, 
  UtensilsCrossed, 
  Car, 
  Ticket, 
  Sliders, 
  Sparkles, 
  Check, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Copy, 
  Printer, 
  RefreshCw, 
  Users, 
  Receipt, 
  TrendingDown, 
  Info, 
  Plane, 
  ShoppingBag, 
  ArrowRight,
  ArrowLeft,
  PieChart,
  Layers,
  FileSpreadsheet,
  BadgeCheck,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Globe,
  ArrowLeftRight
} from 'lucide-react';
import { TripPlan, BudgetBreakdown, Currency, CustomBudgetItem } from '../types';
import { formatCurrency } from '../data/mockData';
import { 
  CountryCurrencyInfo, 
  SUPPORTED_DESTINATION_COUNTRIES, 
  detectCountryFromDestination, 
  formatINR, 
  formatForeign 
} from '../data/currencyHelper';
import { getFlightDataForDestination } from '../data/flightData';
import { GroupExpenseSplitter } from './GroupExpenseSplitter';
import confetti from 'canvas-confetti';

interface BudgetViewProps {
  trip: TripPlan;
  onUpdateBudget: (newBudget: BudgetBreakdown, controls: Partial<TripPlan>) => void;
  currency: Currency;
  onBackToDashboard?: () => void;
  selectedCountry?: CountryCurrencyInfo;
  onSelectCountry?: (country: CountryCurrencyInfo) => void;
  flightCabinClass?: 'economy' | 'premium' | 'business';
  onSelectFlightCabinClass?: (cabin: 'economy' | 'premium' | 'business') => void;
  includeFlights?: boolean;
  onToggleIncludeFlights?: (include: boolean) => void;
  initialSubTab?: 'itemized' | 'calculator' | 'optimizer' | 'splitter';
  onSelectSubTab?: (subTab: 'itemized' | 'calculator' | 'optimizer' | 'splitter') => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  trip,
  onUpdateBudget,
  currency,
  onBackToDashboard,
  selectedCountry: selectedCountryProp,
  onSelectCountry: onSelectCountryProp,
  flightCabinClass: flightCabinClassProp,
  onSelectFlightCabinClass: onSelectFlightCabinClassProp,
  includeFlights: includeFlightsProp,
  onToggleIncludeFlights: onToggleIncludeFlightsProp,
  initialSubTab,
  onSelectSubTab,
}) => {
  // Main Tab: 'itemized' | 'calculator' | 'optimizer' | 'splitter'
  const [budgetTab, setBudgetTab] = useState<'itemized' | 'calculator' | 'optimizer' | 'splitter'>(initialSubTab || 'itemized');

  // Synchronize when initialSubTab changes from parent
  useEffect(() => {
    if (initialSubTab) {
      setBudgetTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleTabChange = (tab: 'itemized' | 'calculator' | 'optimizer' | 'splitter') => {
    setBudgetTab(tab);
    if (onSelectSubTab) {
      onSelectSubTab(tab);
    }
  };

  // Destination Country & Currency for dual-currency support (synced with App & Dashboard)
  const initialCountry = useMemo(() => {
    return selectedCountryProp || detectCountryFromDestination(trip.destination, trip.country);
  }, [selectedCountryProp, trip.destination, trip.country]);

  const [selectedCountryLocal, setSelectedCountryLocal] = useState<CountryCurrencyInfo>(initialCountry);
  const selectedCountry = selectedCountryProp || selectedCountryLocal;

  // Destination Flight Package & Airfare Calculation
  const flightData = useMemo(() => {
    return getFlightDataForDestination(trip.destination, trip.origin);
  }, [trip.destination, trip.origin]);

  const baseRoundtripFlightPrice = useMemo(() => {
    if (flightData.isSameCity) return 0;
    const outbound = flightData.outboundFlight?.pricePerPerson || 3850;
    const ret = flightData.returnFlight?.pricePerPerson || 4120;
    return outbound + ret;
  }, [flightData]);

  // Interactive Calculator State
  const [travelers, setTravelers] = useState(trip.travelers || 2);
  const [nights, setNights] = useState(trip.nights || 4);
  const [hotelTier, setHotelTier] = useState<'budget' | 'mid' | 'luxury'>(trip.hotelCategory || 'mid');
  const [foodTier, setFoodTier] = useState<'street' | 'casual' | 'finedining'>(trip.foodPreference || 'casual');
  const [transportTier, setTransportTier] = useState<'public' | 'cab' | 'rental' | 'private'>(trip.transportType || 'cab');
  const [activityTier, setActivityTier] = useState<'relaxed' | 'moderate' | 'packed'>(trip.activityLevel || 'moderate');

  // Flight Options in Budget View (Synced with parent & EstimatedBudgetSection)
  const [includeFlightsLocal, setIncludeFlightsLocal] = useState<boolean>(true);
  const includeFlights = includeFlightsProp !== undefined ? includeFlightsProp : includeFlightsLocal;

  const [flightCabinClassLocal, setFlightCabinClassLocal] = useState<'economy' | 'premium' | 'business'>('economy');
  const flightCabinClass = flightCabinClassProp || flightCabinClassLocal;

  const flightMultiplier = flightCabinClass === 'business' ? 2.3 : flightCabinClass === 'premium' ? 1.45 : 1.0;
  const flightPerPerson = Math.round(baseRoundtripFlightPrice * flightMultiplier);
  const totalFlightsCost = includeFlights ? flightPerPerson * travelers : 0;

  // Custom User Expenses list
  const [customItems, setCustomItems] = useState<CustomBudgetItem[]>([
    {
      id: 'cust-1',
      title: 'Local High-Speed SIM & Pocket WiFi',
      category: 'miscellaneous',
      amount: 1400,
      perPerson: true,
      enabled: true
    },
    {
      id: 'cust-2',
      title: 'Travel Insurance & Health Cover',
      category: 'miscellaneous',
      amount: 600,
      perPerson: true,
      enabled: true
    },
    {
      id: 'cust-3',
      title: 'Local Souvenirs & Market Shopping Fund',
      category: 'miscellaneous',
      amount: 3000,
      perPerson: false,
      enabled: true
    }
  ]);

  // New Custom Item Form State
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<CustomBudgetItem['category']>('miscellaneous');
  const [newPerPerson, setNewPerPerson] = useState(false);

  // Optimization State
  const [appliedSavings, setAppliedSavings] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // --- ITEM-BY-ITEM REAL COSTS FROM ACTIVE TRIP ---
  const selectedHotel = trip.hotels.find(h => h.selected) || trip.hotels[0];
  const hotelBaseCost = selectedHotel ? selectedHotel.pricePerNight * nights : (hotelTier === 'budget' ? 2500 : hotelTier === 'mid' ? 4500 : 9000) * nights;

  // Selected tourist attractions
  const addedPlaces = trip.touristPlaces.filter(p => p.added);
  const placesCost = addedPlaces.reduce((sum, p) => sum + (p.entryCost * travelers), 0);

  // Selected restaurants
  const addedRestaurants = trip.restaurants.filter(r => r.added);
  const diningCost = addedRestaurants.length > 0 
    ? addedRestaurants.reduce((sum, r) => sum + r.averagePrice, 0) + (Math.max(0, (nights + 1) * 2 - addedRestaurants.length) * 800 * travelers)
    : (foodTier === 'street' ? 500 : foodTier === 'casual' ? 950 : 2200) * (nights + 1) * travelers;

  // Itinerary activities
  const itineraryActivitiesCost = trip.itinerary.reduce((acc, day) => {
    return acc + day.activities.reduce((daySum, act) => daySum + (act.estimatedCost || 0), 0);
  }, 0);

  const activitiesCost = itineraryActivitiesCost > 0 ? itineraryActivitiesCost : (activityTier === 'relaxed' ? 1500 : activityTier === 'moderate' ? 3000 : 5500) * travelers;

  // Transportation cost
  const transportDailyRate = transportTier === 'public' ? 350 : transportTier === 'rental' ? 850 : transportTier === 'cab' ? 1300 : 2600;
  const transportCost = transportDailyRate * (nights + 1);

  // Custom Items Sum
  const customItemsCost = customItems
    .filter(item => item.enabled)
    .reduce((sum, item) => sum + (item.perPerson ? item.amount * travelers : item.amount), 0);

  // Base Misc Buffer
  const baseMiscBuffer = 2000;

  // Savings deductions
  const totalSavingsDeduction = appliedSavings.length * 1500;

  // FINAL DYNAMIC BUDGET BREAKDOWN WITH FLIGHTS
  const currentBudgetBreakdown: BudgetBreakdown = useMemo(() => {
    const finalHotel = Math.max(0, hotelBaseCost - (appliedSavings.includes('hotel_deal') ? 2000 : 0));
    const finalFlights = totalFlightsCost;
    const finalFood = Math.max(0, diningCost - (appliedSavings.includes('dining_pass') ? 1200 : 0));
    const finalTransport = Math.max(0, transportCost - (appliedSavings.includes('transit_pass') ? 800 : 0));
    const finalActivities = Math.max(0, (placesCost + activitiesCost) - (appliedSavings.includes('combo_ticket') ? 1000 : 0));
    const finalMisc = baseMiscBuffer + customItemsCost;
    const finalTotal = finalHotel + finalFlights + finalFood + finalTransport + finalActivities + finalMisc;

    return {
      hotel: finalHotel,
      flights: finalFlights,
      food: finalFood,
      transportation: finalTransport,
      activities: finalActivities,
      miscellaneous: finalMisc,
      total: finalTotal
    };
  }, [hotelBaseCost, totalFlightsCost, diningCost, transportCost, placesCost, activitiesCost, baseMiscBuffer, customItemsCost, appliedSavings]);

  // Percentages for visual chart
  const hotelPct = Math.round((currentBudgetBreakdown.hotel / currentBudgetBreakdown.total) * 100) || 0;
  const flightsPct = Math.round(((currentBudgetBreakdown.flights || 0) / currentBudgetBreakdown.total) * 100) || 0;
  const foodPct = Math.round((currentBudgetBreakdown.food / currentBudgetBreakdown.total) * 100) || 0;
  const transportPct = Math.round((currentBudgetBreakdown.transportation / currentBudgetBreakdown.total) * 100) || 0;
  const actPct = Math.round((currentBudgetBreakdown.activities / currentBudgetBreakdown.total) * 100) || 0;
  const miscPct = Math.max(1, 100 - hotelPct - flightsPct - foodPct - transportPct - actPct);

  // Toggle Custom Item
  const handleToggleCustomItem = (id: string) => {
    setCustomItems(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };

  // Delete Custom Item
  const handleDeleteCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== id));
  };

  // Add Custom Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount || Number(newAmount) <= 0) return;

    const newItem: CustomBudgetItem = {
      id: `cust-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      amount: Number(newAmount),
      perPerson: newPerPerson,
      enabled: true
    };

    setCustomItems(prev => [...prev, newItem]);
    setNewTitle('');
    setNewAmount('');
    setNewPerPerson(false);
    setShowAddCustomModal(false);
    showToast(`Added "${newItem.title}" to trip budget`);
  };

  // Presets
  const handleApplyPreset = (preset: 'backpacker' | 'balanced' | 'luxury') => {
    const setCabin = (cls: 'economy' | 'premium' | 'business') => {
      if (onSelectFlightCabinClassProp) onSelectFlightCabinClassProp(cls);
      else setFlightCabinClassLocal(cls);
    };
    const setFlights = (inc: boolean) => {
      if (onToggleIncludeFlightsProp) onToggleIncludeFlightsProp(inc);
      else setIncludeFlightsLocal(inc);
    };

    if (preset === 'backpacker') {
      setHotelTier('budget');
      setFoodTier('street');
      setTransportTier('public');
      setActivityTier('relaxed');
      setCabin('economy');
      setFlights(true);
      showToast('🎒 Applied Backpacker Saver Preset');
    } else if (preset === 'balanced') {
      setHotelTier('mid');
      setFoodTier('casual');
      setTransportTier('cab');
      setActivityTier('moderate');
      setCabin('economy');
      setFlights(true);
      showToast('✨ Applied Best Value Balanced Preset');
    } else {
      setHotelTier('luxury');
      setFoodTier('finedining');
      setTransportTier('private');
      setActivityTier('packed');
      setCabin('business');
      setFlights(true);
      showToast('👑 Applied Luxury VIP Getaway Preset');
    }
  };

  // Toggle AI Savings
  const handleToggleSaving = (savingKey: string, savingTitle: string, discount: number) => {
    if (appliedSavings.includes(savingKey)) {
      setAppliedSavings(prev => prev.filter(k => k !== savingKey));
      showToast(`Removed: ${savingTitle}`);
    } else {
      setAppliedSavings(prev => [...prev, savingKey]);
      showToast(`Applied ${savingTitle} (Saved ${formatINR(discount)})`);
      try {
        confetti({
          particleCount: 35,
          spread: 45,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  };

  // Apply to Trip Plan & Return to Dashboard
  const handleApplyToTrip = () => {
    onUpdateBudget(currentBudgetBreakdown, {
      travelers,
      nights,
      days: nights + 1,
      hotelCategory: hotelTier,
      foodPreference: foodTier,
      transportType: transportTier,
      activityLevel: activityTier
    });
    showToast('🎉 Budget parameters & airfare successfully synchronized to active trip!');
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {}
    if (onBackToDashboard) {
      setTimeout(() => {
        onBackToDashboard();
      }, 700);
    }
  };

  // Copy Budget Breakdown to Clipboard in Dual Currency
  const handleCopyBudgetSummary = () => {
    const summaryText = `
📍 TRAVELIA AI TRIP BUDGET BREAKDOWN: ${trip.destination.toUpperCase()}
Country: ${selectedCountry.flag} ${selectedCountry.countryName} (${selectedCountry.currencyCode})
Duration: ${nights} Nights (${nights + 1} Days) | Travelers: ${travelers} Pax
---------------------------------------------
🏨 Accommodations: ${formatINR(currentBudgetBreakdown.hotel)} ≈ ${formatForeign(currentBudgetBreakdown.hotel, selectedCountry)}
✈️ Flights & Airfare: ${formatINR(currentBudgetBreakdown.flights || 0)} ≈ ${formatForeign(currentBudgetBreakdown.flights || 0, selectedCountry)}
🍽️ Food & Dining: ${formatINR(currentBudgetBreakdown.food)} ≈ ${formatForeign(currentBudgetBreakdown.food, selectedCountry)}
🚕 Transportation: ${formatINR(currentBudgetBreakdown.transportation)} ≈ ${formatForeign(currentBudgetBreakdown.transportation, selectedCountry)}
🎟️ Activities & Sights: ${formatINR(currentBudgetBreakdown.activities)} ≈ ${formatForeign(currentBudgetBreakdown.activities, selectedCountry)}
🎒 Misc Items & Buffer: ${formatINR(currentBudgetBreakdown.miscellaneous)} ≈ ${formatForeign(currentBudgetBreakdown.miscellaneous, selectedCountry)}
---------------------------------------------
TOTAL ESTIMATE: ${formatINR(currentBudgetBreakdown.total)} ≈ ${formatForeign(currentBudgetBreakdown.total, selectedCountry)}
Per Traveler: ~${formatINR(Math.round(currentBudgetBreakdown.total / travelers))} ≈ ${formatForeign(Math.round(currentBudgetBreakdown.total / travelers), selectedCountry)}
Generated by Travelia AI Dual-Currency Budget Studio
    `.trim();

    navigator.clipboard.writeText(summaryText);
    showToast(`📋 Formatted dual-currency summary (${selectedCountry.currencyCode} + INR) copied!`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
      
      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#191919] text-white px-5 py-3 rounded-2xl shadow-xl border border-neutral-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <BadgeCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* TOP NAVIGATION & BACK TO DASHBOARD BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-200 shadow-2xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4 text-[#344E27]" />
            <span>← Back to Trip Dashboard</span>
          </button>
        )}

        {/* Currency & Destination Quick Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto ml-auto">
          <span className="text-xs font-bold text-neutral-500 hidden sm:inline">Destination Currency:</span>
          <div className="relative">
            <select
              value={selectedCountry.countryCode}
              onChange={(e) => {
                const found = SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === e.target.value);
                if (found) {
                  if (onSelectCountryProp) {
                    onSelectCountryProp(found);
                  } else {
                    setSelectedCountryLocal(found);
                  }
                  showToast(`Currency converted to ${found.flag} ${found.countryName} (${found.currencyCode})`);
                }
              }}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#344E27] cursor-pointer appearance-none pr-8 shadow-2xs"
            >
              {SUPPORTED_DESTINATION_COUNTRIES.map(c => (
                <option key={c.countryCode} value={c.countryCode}>
                  {c.flag} {c.countryName} ({c.currencyCode})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* HEADER & MAIN TAB SWITCHER */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold uppercase tracking-wider border border-[#344E27]/20">
          <DollarSign className="w-3.5 h-3.5" />
          <span>Real-Time Expense Engine & Dual Currency</span>
        </div>
        <h1 className="font-display font-black text-3xl sm:text-4xl text-[#191919] uppercase tracking-tight">
          Trip Budget & Cost Intelligence
        </h1>
        <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed">
          Transparent, live cost tracking for {trip.destination} showing values in <strong className="text-neutral-700">₹ INR</strong> & <strong className="text-[#344E27]">{selectedCountry.flag} {selectedCountry.countryName} ({selectedCountry.currencyCode})</strong> with flights, stay tiers, dining, and group expense splitting.
        </p>

        {/* 4 Main Tabs (ALL KEPT INTACT & CONNECTED) */}
        <div className="inline-flex items-center p-1.5 rounded-full bg-neutral-200/80 border border-neutral-300 gap-1 mt-3 flex-wrap justify-center shadow-2xs">
          <button
            onClick={() => handleTabChange('itemized')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
              budgetTab === 'itemized'
                ? 'bg-[#344E27] text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Line-By-Line Audit</span>
          </button>

          <button
            onClick={() => handleTabChange('calculator')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
              budgetTab === 'calculator'
                ? 'bg-[#344E27] text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Scenario Simulator</span>
          </button>

          <button
            onClick={() => handleTabChange('optimizer')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
              budgetTab === 'optimizer'
                ? 'bg-[#344E27] text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Cost Optimizer</span>
            {appliedSavings.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-black">
                {appliedSavings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('splitter')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
              budgetTab === 'splitter'
                ? 'bg-[#344E27] text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group Splitter</span>
          </button>
        </div>
      </div>

      {/* TOP TOTAL HERO CARD (Shared across Itemized, Calculator & Optimizer) */}
      {budgetTab !== 'splitter' && (
        <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-200/90 shadow-sm space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Big Number & Action Buttons */}
            <div className="lg:col-span-5 flex flex-col items-start border-b lg:border-b-0 lg:border-r border-neutral-100 pb-6 lg:pb-0 lg:pr-8">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider">
                  Total Estimated Trip Cost
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  {selectedCountry.flag} {selectedCountry.currencyCode} + INR
                </span>
              </div>

              <div className="font-display font-black text-4xl sm:text-5xl text-[#191919] tracking-tight mt-1">
                {formatINR(currentBudgetBreakdown.total)}
              </div>
              <div className="text-sm sm:text-base font-extrabold text-[#344E27] mt-1">
                ≈ {formatForeign(currentBudgetBreakdown.total, selectedCountry)}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mt-2 font-medium">
                <span className="font-bold text-[#344E27]">
                  ~ {formatINR(Math.round(currentBudgetBreakdown.total / travelers))} ({formatForeign(Math.round(currentBudgetBreakdown.total / travelers), selectedCountry)}) / person
                </span>
                <span>•</span>
                <span>{travelers} Travelers</span>
                <span>•</span>
                <span>{nights} Nights ({nights + 1} Days)</span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-2.5 mt-6">
                <button
                  id="apply-budget-btn"
                  onClick={handleApplyToTrip}
                  className="px-5 py-2.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply to Trip Plan & Return</span>
                </button>

                <button
                  onClick={handleCopyBudgetSummary}
                  className="px-4 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Copy formatted budget text"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Summary</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="p-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                  title="Print Budget Breakdown"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>

              {appliedSavings.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{appliedSavings.length} AI discount optimizations active!</span>
                </div>
              )}
            </div>

            {/* Right: Visual Progress Distribution Bar & Category Badges */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold text-[#191919] mb-2">
                  <span>Category Distribution Breakdown</span>
                  <span className="text-neutral-500 font-medium">100% Total Allocations</span>
                </div>
                
                {/* Multi-color segment bar */}
                <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-neutral-100 shadow-inner">
                  <div style={{ width: `${hotelPct}%` }} className="bg-[#344E27] transition-all duration-300" title={`Stay: ${hotelPct}%`} />
                  <div style={{ width: `${flightsPct}%` }} className="bg-[#0284C7] transition-all duration-300" title={`Flights: ${flightsPct}%`} />
                  <div style={{ width: `${foodPct}%` }} className="bg-[#F59E0B] transition-all duration-300" title={`Dining: ${foodPct}%`} />
                  <div style={{ width: `${transportPct}%` }} className="bg-[#3B82F6] transition-all duration-300" title={`Transit: ${transportPct}%`} />
                  <div style={{ width: `${actPct}%` }} className="bg-[#8B5CF6] transition-all duration-300" title={`Activities: ${actPct}%`} />
                  <div style={{ width: `${miscPct}%` }} className="bg-neutral-400 transition-all duration-300" title={`Misc/Buffer: ${miscPct}%`} />
                </div>
              </div>

              {/* 6 Quick Category Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                
                {/* Stay */}
                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-bold">
                    <Building2 className="w-3.5 h-3.5 text-[#344E27]" />
                    <span>Stay</span>
                  </div>
                  <span className="font-extrabold text-xs text-[#191919] block mt-1">
                    {formatINR(currentBudgetBreakdown.hotel)}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">{hotelPct}%</span>
                </div>

                {/* Flights */}
                <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100">
                  <div className="flex items-center gap-1.5 text-xs text-sky-800 font-bold">
                    <Plane className="w-3.5 h-3.5 text-sky-600" />
                    <span>Flights</span>
                  </div>
                  <span className="font-extrabold text-xs text-[#191919] block mt-1">
                    {formatINR(currentBudgetBreakdown.flights || 0)}
                  </span>
                  <span className="text-[10px] text-sky-700 font-medium">{flightsPct}%</span>
                </div>

                {/* Dining */}
                <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                    <span>Dining</span>
                  </div>
                  <span className="font-extrabold text-xs text-[#191919] block mt-1">
                    {formatINR(currentBudgetBreakdown.food)}
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">{foodPct}%</span>
                </div>

                {/* Transit */}
                <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-xs text-blue-800 font-bold">
                    <Car className="w-3.5 h-3.5 text-blue-600" />
                    <span>Transit</span>
                  </div>
                  <span className="font-extrabold text-xs text-[#191919] block mt-1">
                    {formatINR(currentBudgetBreakdown.transportation)}
                  </span>
                  <span className="text-[10px] text-blue-700 font-medium">{transportPct}%</span>
                </div>

                {/* Activities */}
                <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100">
                  <div className="flex items-center gap-1.5 text-xs text-purple-800 font-bold">
                    <Ticket className="w-3.5 h-3.5 text-purple-600" />
                    <span>Sights</span>
                  </div>
                  <span className="font-extrabold text-xs text-[#191919] block mt-1">
                    {formatINR(currentBudgetBreakdown.activities)}
                  </span>
                  <span className="text-[10px] text-purple-700 font-medium">{actPct}%</span>
                </div>

                {/* Misc */}
                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-bold">
                    <ShoppingBag className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Misc Buffer</span>
                  </div>
                  <span className="font-extrabold text-xs text-[#191919] block mt-1">
                    {formatINR(currentBudgetBreakdown.miscellaneous)}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">{miscPct}%</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ITEMIZED REAL COSTS & CUSTOM EXPENSES */}
      {/* ========================================================================= */}
      {budgetTab === 'itemized' && (
        <div className="space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold text-[#344E27] uppercase tracking-wider">
                Line-By-Line Audit
              </span>
              <h3 className="font-display font-extrabold text-2xl text-[#191919] mt-0.5">
                Itemized Trip Cost Details
              </h3>
            </div>

            <button
              onClick={() => setShowAddCustomModal(true)}
              className="px-4 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Expense (Visa, Scuba, etc.)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Roundtrip Flights & Airfare */}
            <div className="bg-white rounded-[28px] p-6 border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                    <Plane className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#191919]">Roundtrip Flights</h4>
                    <span className="text-[11px] text-neutral-400">
                      {flightData.outboundFlight.originCode} ⇄ {flightData.outboundFlight.destinationCode} • {travelers} Pax
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-sm text-[#191919] block">
                    {formatINR(totalFlightsCost)}
                  </span>
                  <span className="text-[10px] font-bold text-sky-700 block">
                    ≈ {formatForeign(totalFlightsCost, selectedCountry)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#191919] block">
                      {flightData.outboundFlight.airline} ({flightCabinClass.toUpperCase()})
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      ~{formatINR(flightPerPerson)} ({formatForeign(flightPerPerson, selectedCountry)}) / traveler
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeFlights}
                      onChange={(e) => {
                        if (onToggleIncludeFlightsProp) {
                          onToggleIncludeFlightsProp(e.target.checked);
                        } else {
                          setIncludeFlightsLocal(e.target.checked);
                        }
                      }}
                      className="w-4 h-4 rounded text-[#344E27] accent-[#344E27]"
                    />
                    <span>Include</span>
                  </label>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  {(['economy', 'premium', 'business'] as const).map(cls => (
                    <button
                      key={cls}
                      onClick={() => {
                        if (onSelectFlightCabinClassProp) {
                          onSelectFlightCabinClassProp(cls);
                        } else {
                          setFlightCabinClassLocal(cls);
                        }
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        flightCabinClass === cls
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {cls === 'premium' ? 'Premium Economy' : cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Hotel & Stays */}
            <div className="bg-white rounded-[28px] p-6 border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#191919]">Accommodation</h4>
                    <span className="text-[11px] text-neutral-400">{nights} Nights ({hotelTier} tier)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-sm text-[#191919] block">
                    {formatINR(currentBudgetBreakdown.hotel)}
                  </span>
                  <span className="text-[10px] font-bold text-[#344E27] block">
                    ≈ {formatForeign(currentBudgetBreakdown.hotel, selectedCountry)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#191919] block">
                    {selectedHotel ? selectedHotel.name : 'Ocean Pearl Boutique Resort'}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {formatINR(selectedHotel?.pricePerNight || 4500)} / night × {nights} nights
                  </span>
                </div>
                <span className="text-xs font-extrabold text-[#344E27]">
                  {formatINR(hotelBaseCost)}
                </span>
              </div>
            </div>

            {/* 3. Dining & Meals */}
            <div className="bg-white rounded-[28px] p-6 border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#191919]">Food & Dining</h4>
                    <span className="text-[11px] text-neutral-400">{addedRestaurants.length} saved spot(s) + daily meals</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-sm text-[#191919] block">
                    {formatINR(currentBudgetBreakdown.food)}
                  </span>
                  <span className="text-[10px] font-bold text-[#344E27] block">
                    ≈ {formatForeign(currentBudgetBreakdown.food, selectedCountry)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {addedRestaurants.length > 0 ? (
                  addedRestaurants.map(r => (
                    <div key={r.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
                      <span className="font-bold text-[#191919]">{r.name} ({r.cuisine})</span>
                      <span className="font-extrabold text-neutral-700">{formatINR(r.averagePrice)}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-600">Daily Breakfast, Lunch & Dinners ({foodTier} style)</span>
                    <span className="font-extrabold text-neutral-700">{formatINR(diningCost)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Sights & Activities */}
            <div className="bg-white rounded-[28px] p-6 border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#191919]">Sights & Activities</h4>
                    <span className="text-[11px] text-neutral-400">Entry fees & experience passes</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-sm text-[#191919] block">
                    {formatINR(currentBudgetBreakdown.activities)}
                  </span>
                  <span className="text-[10px] font-bold text-[#344E27] block">
                    ≈ {formatForeign(currentBudgetBreakdown.activities, selectedCountry)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {addedPlaces.map(p => (
                  <div key={p.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#191919]">{p.name}</span>
                    <span className="font-extrabold text-neutral-700">
                      {p.entryCost === 0 ? 'Free' : formatINR(p.entryCost * travelers)}
                    </span>
                  </div>
                ))}
                {addedPlaces.length === 0 && (
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-600">Scheduled itinerary experiences & passes</span>
                    <span className="font-extrabold text-neutral-700">{formatINR(activitiesCost)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Transportation */}
            <div className="bg-white rounded-[28px] p-6 border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#191919]">Local Transportation</h4>
                    <span className="text-[11px] text-neutral-400">{transportTier} mode • {nights + 1} Days</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-sm text-[#191919] block">
                    {formatINR(currentBudgetBreakdown.transportation)}
                  </span>
                  <span className="text-[10px] font-bold text-[#344E27] block">
                    ≈ {formatForeign(currentBudgetBreakdown.transportation, selectedCountry)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#191919] block capitalize">
                    {transportTier === 'public' ? 'Public Buses & Ferries' : transportTier === 'rental' ? 'Scooter / Self-Drive Car' : transportTier === 'cab' ? 'App Cabs & Taxis' : 'Private Chauffeur'}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {formatINR(transportDailyRate)} / day × {nights + 1} days
                  </span>
                </div>
                <span className="font-extrabold text-neutral-700">{formatINR(transportCost)}</span>
              </div>
            </div>

          </div>

          {/* CUSTOM USER EXPENSES SECTION */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-[#191919]">Custom & Additional Expenses</h4>
                  <span className="text-xs text-neutral-400">Visa fees, souvenirs fund, or optional buffers</span>
                </div>
              </div>

              <button
                onClick={() => setShowAddCustomModal(true)}
                className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="divide-y divide-neutral-100">
              {customItems.map(item => {
                const totalItemCost = item.perPerson ? item.amount * travelers : item.amount;
                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggleCustomItem(item.id)}
                        className="w-4 h-4 rounded text-[#344E27] accent-[#344E27] cursor-pointer"
                      />
                      <div>
                        <span className={`text-xs font-bold block ${item.enabled ? 'text-[#191919]' : 'text-neutral-400 line-through'}`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-neutral-400 capitalize">
                          {item.category} {item.perPerson && `• (${formatINR(item.amount)} × ${travelers} pax)`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-xs font-extrabold ${item.enabled ? 'text-[#191919]' : 'text-neutral-400'}`}>
                          {formatINR(totalItemCost)}
                        </span>
                        <span className="text-[10px] font-bold text-[#344E27] block">
                          ≈ {formatForeign(totalItemCost, selectedCountry)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteCustomItem(item.id)}
                        className="text-neutral-300 hover:text-red-500 transition-colors p-1"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SCENARIO CALCULATOR & SLIDERS */}
      {/* ========================================================================= */}
      {budgetTab === 'calculator' && (
        <div className="space-y-8">
          
          {/* Preset Buttons */}
          <div className="bg-white rounded-[28px] p-6 border border-neutral-200 shadow-2xs space-y-4">
            <div>
              <span className="text-xs font-extrabold text-[#344E27] uppercase tracking-wider">
                Instant Presets
              </span>
              <h3 className="font-display font-bold text-lg text-[#191919]">
                Choose a Travel Style Archetype
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleApplyPreset('backpacker')}
                className="p-4 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left transition-all group cursor-pointer"
              >
                <span className="text-xs font-black text-[#191919] block group-hover:text-[#344E27]">
                  🎒 Backpacker Saver
                </span>
                <span className="text-[11px] text-neutral-500 block mt-1">
                  Budget stays, economy flights, street food & public buses.
                </span>
              </button>

              <button
                onClick={() => handleApplyPreset('balanced')}
                className="p-4 rounded-2xl bg-[#E5ECE0]/60 hover:bg-[#E5ECE0] border border-[#344E27]/30 text-left transition-all group cursor-pointer"
              >
                <span className="text-xs font-black text-[#344E27] block">
                  ✨ Smart Explorer (Best Value)
                </span>
                <span className="text-[11px] text-neutral-600 block mt-1">
                  Boutique 3-4★ stays, standard flights, casual bistros & cabs.
                </span>
              </button>

              <button
                onClick={() => handleApplyPreset('luxury')}
                className="p-4 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left transition-all group cursor-pointer"
              >
                <span className="text-xs font-black text-[#191919] block group-hover:text-[#344E27]">
                  👑 Luxury VIP Getaway
                </span>
                <span className="text-[11px] text-neutral-500 block mt-1">
                  5★ suites, business class flights, fine dining & private chauffeur.
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Parameter Controls */}
          <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-neutral-200 shadow-2xs space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="font-display font-extrabold text-xl text-[#191919]">
                  Fine-Tune Parameter Sliders
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Adjust guest counts, nights, flights, and comfort tiers to see live recalculation.
                </p>
              </div>

              <button
                onClick={handleApplyToTrip}
                className="px-5 py-2.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer"
              >
                Save & Apply to Trip
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Travelers */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex justify-between text-xs font-bold text-[#191919]">
                  <span>Travelers Count</span>
                  <span className="text-[#344E27] font-extrabold">{travelers} Pax</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={travelers}
                  onChange={(e) => setTravelers(Number(e.target.value))}
                  className="w-full accent-[#344E27] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 font-medium">
                  <span>Solo (1)</span>
                  <span>Couple (2)</span>
                  <span>Group (8)</span>
                </div>
              </div>

              {/* Nights */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex justify-between text-xs font-bold text-[#191919]">
                  <span>Duration</span>
                  <span className="text-[#344E27] font-extrabold">{nights} Nights ({nights + 1} Days)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={nights}
                  onChange={(e) => setNights(Number(e.target.value))}
                  className="w-full accent-[#344E27] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 font-medium">
                  <span>Quick (1n)</span>
                  <span>Standard (4n)</span>
                  <span>Long Stay (14n)</span>
                </div>
              </div>

              {/* Roundtrip Flights Tier */}
              <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#191919]">
                  <span className="flex items-center gap-1">
                    <Plane className="w-3.5 h-3.5 text-sky-600" />
                    <span>Flight Airfare</span>
                  </span>
                  <span className="text-sky-800 font-extrabold">{includeFlights ? flightCabinClass.toUpperCase() : 'EXCLUDED'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(['economy', 'premium', 'business'] as const).map((cls) => (
                    <button
                      key={cls}
                      onClick={() => {
                        if (onSelectFlightCabinClassProp) {
                          onSelectFlightCabinClassProp(cls);
                        } else {
                          setFlightCabinClassLocal(cls);
                        }
                        if (onToggleIncludeFlightsProp) {
                          onToggleIncludeFlightsProp(true);
                        } else {
                          setIncludeFlightsLocal(true);
                        }
                      }}
                      className={`py-1.5 text-[11px] font-bold rounded-xl capitalize transition-all cursor-pointer ${
                        flightCabinClass === cls && includeFlights
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {cls === 'premium' ? 'Premium' : cls}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const nextVal = !includeFlights;
                    if (onToggleIncludeFlightsProp) {
                      onToggleIncludeFlightsProp(nextVal);
                    } else {
                      setIncludeFlightsLocal(nextVal);
                    }
                  }}
                  className="text-[10px] text-sky-700 font-bold hover:underline block pt-0.5 cursor-pointer"
                >
                  {includeFlights ? 'Exclude flight from total' : '+ Include flight tickets'}
                </button>
              </div>

              {/* Hotel Category */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="text-xs font-bold text-[#191919] block">Hotel Tier</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['budget', 'mid', 'luxury'] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setHotelTier(tier)}
                      className={`py-2 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer ${
                        hotelTier === tier
                          ? 'bg-[#344E27] text-white shadow-2xs'
                          : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dining Style */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="text-xs font-bold text-[#191919] block">Dining Style</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'street', label: 'Street/Cafe' },
                    { id: 'casual', label: 'Casual' },
                    { id: 'finedining', label: 'Fine Dining' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setFoodTier(item.id as any)}
                      className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        foodTier === item.id
                          ? 'bg-[#344E27] text-white shadow-2xs'
                          : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transportation */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="text-xs font-bold text-[#191919] block">Transportation</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'public', label: 'Public Transit' },
                    { id: 'cab', label: 'App Cabs' },
                    { id: 'rental', label: 'Rental Scooter' },
                    { id: 'private', label: 'Chauffeur' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTransportTier(item.id as any)}
                      className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        transportTier === item.id
                          ? 'bg-[#344E27] text-white shadow-2xs'
                          : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AI COST OPTIMIZER */}
      {/* ========================================================================= */}
      {budgetTab === 'optimizer' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#E5ECE0] to-emerald-50 rounded-[32px] p-6 sm:p-8 border border-[#344E27]/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#344E27] text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-xl text-[#344E27]">
                  AI Dynamic Savings Engine
                </h3>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Actionable smart travel hacks tailored for {trip.destination}. Click any optimization to apply instant savings!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'hotel_deal',
                title: 'Early Booking Accommodation Deal',
                category: 'Accommodation',
                discount: 2000,
                desc: 'Reserve boutique eco-resort 3 weeks early to unlock complimentary breakfast & airport shuttle.'
              },
              {
                id: 'dining_pass',
                title: 'Local Coastal Dining Smart Pass',
                category: 'Dining',
                discount: 1200,
                desc: 'Opt for authentic family-run beach shacks for lunches instead of high-markup hotel dining.'
              },
              {
                id: 'transit_pass',
                title: 'Shared Transit & Cab Smart Pass',
                category: 'Transit',
                discount: 800,
                desc: 'Combine city rapid rail with group app cabs to eliminate peak-hour deadheading.'
              },
              {
                id: 'combo_ticket',
                title: 'Heritage Sights & Attractions Combo Pass',
                category: 'Activities',
                discount: 1000,
                desc: 'Pre-purchase multi-attraction combo ticket for top heritage and monument entries.'
              }
            ].map(opt => {
              const isApplied = appliedSavings.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  className={`p-5 rounded-[24px] border transition-all flex flex-col justify-between ${
                    isApplied 
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs' 
                      : 'bg-white border-neutral-200 shadow-2xs hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 uppercase">
                        {opt.category}
                      </span>
                      <span className="text-xs font-black text-emerald-700">
                        Save {formatINR(opt.discount)} (≈ {formatForeign(opt.discount, selectedCountry)})
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-sm text-[#191919] mt-2">
                      {opt.title}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleSaving(opt.id, opt.title, opt.discount)}
                    className={`mt-4 w-full py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isApplied
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-[#E5ECE0] hover:bg-[#344E27] text-[#344E27] hover:text-white'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Discount Applied</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Apply {formatINR(opt.discount)} Saving</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GROUP EXPENSE SPLITTER */}
      {/* ========================================================================= */}
      {budgetTab === 'splitter' && (
        <GroupExpenseSplitter trip={trip} currency={currency} />
      )}

      {/* ADD CUSTOM EXPENSE MODAL */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-display font-bold text-lg text-[#191919]">
                Add Custom Expense Line Item
              </h3>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Expense Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Scuba Diving Pass, Visa Fee, Souvenirs"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#344E27]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Amount (in INR ₹)
                  </label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="2500"
                    min="1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#344E27]"
                    required
                  />
                  {newAmount && Number(newAmount) > 0 && (
                    <span className="text-[10px] font-extrabold text-[#344E27] block mt-0.5">
                      ≈ {formatForeign(Number(newAmount), selectedCountry)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#344E27]"
                  >
                    <option value="flight">Flights & Upgrades</option>
                    <option value="activities">Activities & Tours</option>
                    <option value="hotel">Stay & Accommodations</option>
                    <option value="food">Dining & Groceries</option>
                    <option value="miscellaneous">Shopping & Misc</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="per-person-check"
                  checked={newPerPerson}
                  onChange={(e) => setNewPerPerson(e.target.checked)}
                  className="w-4 h-4 rounded text-[#344E27] accent-[#344E27] cursor-pointer"
                />
                <label htmlFor="per-person-check" className="text-xs font-medium text-neutral-700 cursor-pointer">
                  Multiply by number of travelers ({travelers} pax)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Add to Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
