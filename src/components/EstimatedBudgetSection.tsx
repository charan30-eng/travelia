import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  Building2,
  UtensilsCrossed,
  Car,
  Ticket,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  Users,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Copy,
  Download,
  Check,
  CheckCircle2,
  AlertCircle,
  PiggyBank,
  Percent,
  SlidersHorizontal,
  Info,
  BadgeCheck,
  Globe,
  ArrowLeftRight,
  Calculator,
  Coins,
  Plane
} from 'lucide-react';
import { TripPlan, BudgetBreakdown, Currency } from '../types';
import { formatCurrency } from '../data/mockData';
import { getFlightDataForDestination } from '../data/flightData';
import {
  CountryCurrencyInfo,
  SUPPORTED_DESTINATION_COUNTRIES,
  detectCountryFromDestination,
  formatINR,
  formatForeign,
  formatForeignCompact,
  getDualCurrency
} from '../data/currencyHelper';
import confetti from 'canvas-confetti';

interface EstimatedBudgetSectionProps {
  trip: TripPlan;
  currency: Currency;
  onViewFullBudget: (subTab?: 'itemized' | 'calculator' | 'optimizer' | 'splitter') => void;
  onToast?: (message: string) => void;
  selectedCountry?: CountryCurrencyInfo;
  onSelectCountry?: (country: CountryCurrencyInfo) => void;
  flightCabinClass?: 'economy' | 'premium' | 'business';
  onSelectFlightCabinClass?: (cabin: 'economy' | 'premium' | 'business') => void;
  includeFlights?: boolean;
  onToggleIncludeFlights?: (include: boolean) => void;
  onUpdateBudget?: (newBudget: BudgetBreakdown, controls?: Partial<TripPlan>) => void;
}

interface CustomDashboardExpense {
  id: string;
  name: string;
  category: 'hotel' | 'food' | 'transportation' | 'activities' | 'flight' | 'miscellaneous';
  amount: number;
  perPerson: boolean;
  active: boolean;
}

export const EstimatedBudgetSection: React.FC<EstimatedBudgetSectionProps> = ({
  trip,
  currency,
  onViewFullBudget,
  onToast,
  selectedCountry: selectedCountryProp,
  onSelectCountry: onSelectCountryProp,
  flightCabinClass: flightCabinClassProp,
  onSelectFlightCabinClass: onSelectFlightCabinClassProp,
  includeFlights: includeFlightsProp,
  onToggleIncludeFlights: onToggleIncludeFlightsProp,
  onUpdateBudget
}) => {
  // Destination Country & Dual Currency Selection State
  const initialCountry = useMemo(() => {
    return selectedCountryProp || detectCountryFromDestination(trip.destination, trip.country);
  }, [selectedCountryProp, trip.destination, trip.country]);

  const [selectedCountryLocal, setSelectedCountryLocal] = useState<CountryCurrencyInfo>(initialCountry);
  const selectedCountry = selectedCountryProp || selectedCountryLocal;

  const [currencyDisplayMode, setCurrencyDisplayMode] = useState<'both' | 'foreign-first'>('both');
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [calcInputINR, setCalcInputINR] = useState<string>('5000');

  // Interactive Simulator State
  const [simulatedTravelers, setSimulatedTravelers] = useState<number>(trip.travelers || 2);

  // Flight Intelligence Data based on Trip Destination
  const destinationFlightPackage = useMemo(() => {
    return getFlightDataForDestination(trip.destination);
  }, [trip.destination]);

  const baseRoundtripFlightPrice = useMemo(() => {
    const outbound = destinationFlightPackage.outboundFlight?.pricePerPerson || 3850;
    const ret = destinationFlightPackage.returnFlight?.pricePerPerson || 4120;
    return outbound + ret;
  }, [destinationFlightPackage]);

  // Flights State in Estimated Budget (Synced with Studio & Dashboard)
  const [includeFlightsLocal, setIncludeFlightsLocal] = useState<boolean>(true);
  const includeFlights = includeFlightsProp !== undefined ? includeFlightsProp : includeFlightsLocal;

  const [flightCabinClassLocal, setFlightCabinClassLocal] = useState<'economy' | 'premium' | 'business'>('economy');
  const flightCabinClass = flightCabinClassProp || flightCabinClassLocal;

  const [customFlightPrice, setCustomFlightPrice] = useState<number | null>(null);
  const [isEditingFlightPrice, setIsEditingFlightPrice] = useState(false);
  const [tempFlightPrice, setTempFlightPrice] = useState('');

  const effectiveFlightPerPerson = useMemo(() => {
    if (customFlightPrice !== null) return customFlightPrice;
    const multiplier = flightCabinClass === 'business' ? 2.3 : flightCabinClass === 'premium' ? 1.45 : 1.0;
    return Math.round(baseRoundtripFlightPrice * multiplier);
  }, [customFlightPrice, flightCabinClass, baseRoundtripFlightPrice]);

  const totalFlightsCost = includeFlights ? effectiveFlightPerPerson * simulatedTravelers : 0;

  // Active Category Details Expansion
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Active Sub-tab in Budget Section
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'daily' | 'optimizer'>('categories');

  // AI Savings Toggles
  const [appliedAiSavings, setAppliedAiSavings] = useState<{ [key: string]: boolean }>({
    'early_pass': false,
    'transit_pass': false,
    'breakfast_combo': false
  });

  // Custom User Expenses added directly on the dashboard
  const [customExpenses, setCustomExpenses] = useState<CustomDashboardExpense[]>([
    {
      id: 'dash-exp-1',
      name: 'Local High-Speed eSIM & Transit Pass',
      category: 'transportation',
      amount: 1400,
      perPerson: true,
      active: true
    },
    {
      id: 'dash-exp-2',
      name: 'Shopping & Local Souvenirs Fund',
      category: 'miscellaneous',
      amount: 2500,
      perPerson: false,
      active: true
    }
  ]);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState<CustomDashboardExpense['category']>('miscellaneous');
  const [newExpensePerPerson, setNewExpensePerPerson] = useState(false);

  const notify = (msg: string) => {
    if (onToast) {
      onToast(msg);
    }
  };

  // AI Savings definitions
  const aiSavingsOptions = [
    {
      id: 'early_pass',
      title: 'Attractions Early-Bird Combo Pass',
      savingAmount: 1200,
      category: 'activities',
      description: 'Group bundle for top monument and heritage site entry tickets.'
    },
    {
      id: 'transit_pass',
      title: 'Shared Transit & Cab Smart Pass',
      savingAmount: 900,
      category: 'transportation',
      description: 'Optimized travel routes eliminate solo taxi deadheading.'
    },
    {
      id: 'breakfast_combo',
      title: 'Complimentary Stay Breakfast Package',
      savingAmount: 1400,
      category: 'food',
      description: 'Included gourmet morning meals at the selected accommodation.'
    }
  ];

  // Dynamic Calculation based on simulated travelers, flights, custom items, and AI savings
  const computedBudget = useMemo(() => {
    const base = trip.budget;
    const baseTravelers = trip.travelers || 2;
    const travelerRatio = simulatedTravelers / baseTravelers;

    // Room sharing logic: hotel rooms scale at ceil(travelers / 2)
    const baseRooms = Math.ceil(baseTravelers / 2);
    const simulatedRooms = Math.ceil(simulatedTravelers / 2);
    const roomRatio = simulatedRooms / (baseRooms || 1);

    let hotel = Math.round(base.hotel * roomRatio);
    let flights = totalFlightsCost;
    let food = Math.round(base.food * travelerRatio);
    let transportation = Math.round(base.transportation * (0.6 + 0.4 * travelerRatio));
    let activities = Math.round(base.activities * travelerRatio);
    let miscellaneous = Math.round(base.miscellaneous * travelerRatio);

    // Apply AI Savings
    if (appliedAiSavings['early_pass']) {
      activities = Math.max(500, activities - (1200 * simulatedTravelers / baseTravelers));
    }
    if (appliedAiSavings['transit_pass']) {
      transportation = Math.max(500, transportation - 900);
    }
    if (appliedAiSavings['breakfast_combo']) {
      food = Math.max(500, food - (1400 * simulatedTravelers / baseTravelers));
    }

    // Apply Custom Expenses
    customExpenses.forEach(exp => {
      if (!exp.active) return;
      const cost = exp.perPerson ? exp.amount * simulatedTravelers : exp.amount;
      if (exp.category === 'hotel') hotel += cost;
      else if (exp.category === 'flight') flights += cost;
      else if (exp.category === 'food') food += cost;
      else if (exp.category === 'transportation') transportation += cost;
      else if (exp.category === 'activities') activities += cost;
      else miscellaneous += cost;
    });

    const total = hotel + flights + food + transportation + activities + miscellaneous;
    const perPerson = Math.round(total / simulatedTravelers);
    const perDay = Math.round(total / (trip.days || 1));

    return {
      hotel,
      flights,
      food,
      transportation,
      activities,
      miscellaneous,
      total,
      perPerson,
      perDay
    };
  }, [trip.budget, trip.travelers, trip.days, simulatedTravelers, totalFlightsCost, appliedAiSavings, customExpenses]);

  // Target Budget Input initialized to trip budget + 15%
  const [targetBudgetInput, setTargetBudgetInput] = useState<number>(() => {
    return Math.round(trip.budget.total * 1.15);
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(Math.round(trip.budget.total * 1.15).toString());

  // Total AI Savings accrued
  const totalSavingsAccrued = useMemo(() => {
    let saved = 0;
    aiSavingsOptions.forEach(opt => {
      if (appliedAiSavings[opt.id]) {
        saved += opt.savingAmount;
      }
    });
    return saved;
  }, [appliedAiSavings]);

  // Category Configuration for Visual Cards
  const categoriesList = [
    {
      id: 'hotel',
      name: 'Accommodations & Stays',
      amount: computedBudget.hotel,
      icon: Building2,
      color: 'bg-blue-500',
      lightBg: 'bg-blue-50 text-blue-800 border-blue-200',
      badgeColor: 'bg-blue-100 text-blue-700',
      details: `${trip.nights} Nights • ${Math.ceil(simulatedTravelers / 2)} Room(s) • ${trip.hotelCategory || 'Mid'} Tier`,
      aiTip: 'Balcony suites & proximity to central metro hubs included in forecast.'
    },
    {
      id: 'flights',
      name: 'Roundtrip Flights & Airfare',
      amount: computedBudget.flights,
      icon: Plane,
      color: 'bg-sky-500',
      lightBg: 'bg-sky-50 text-sky-800 border-sky-200',
      badgeColor: 'bg-sky-100 text-sky-700',
      details: `${destinationFlightPackage.outboundFlight.originCode} ⇄ ${destinationFlightPackage.outboundFlight.destinationCode} • ${destinationFlightPackage.outboundFlight.airline} • ${flightCabinClass.toUpperCase()} • ${simulatedTravelers} Pax`,
      aiTip: includeFlights 
        ? `Roundtrip flights booked in verified window. Includes 7kg cabin & check-in baggage.`
        : 'Flights currently toggled off. Toggle on above to include in total budget.'
    },
    {
      id: 'food',
      name: 'Food, Cafés & Dining',
      amount: computedBudget.food,
      icon: UtensilsCrossed,
      color: 'bg-amber-500',
      lightBg: 'bg-amber-50 text-amber-800 border-amber-200',
      badgeColor: 'bg-amber-100 text-amber-700',
      details: `3 Meals/day • ${trip.foodPreference || 'Casual'} Dining • ${trip.restaurants.length} Handpicked Spots`,
      aiTip: 'Local neighborhood bistros offer authentic flavors at 40% lower cost than luxury hotel dining.'
    },
    {
      id: 'transportation',
      name: 'Transit & Local Cabs',
      amount: computedBudget.transportation,
      icon: Car,
      color: 'bg-emerald-500',
      lightBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      details: `Airport Pickup & Drop • Daily City Hops • ${trip.transportType || 'Cab'} Service`,
      aiTip: 'Grouped geographic clusters eliminate backtracking and peak taxi surge charges.'
    },
    {
      id: 'activities',
      name: 'Sights, Passes & Tours',
      amount: computedBudget.activities,
      icon: Ticket,
      color: 'bg-purple-500',
      lightBg: 'bg-purple-50 text-purple-800 border-purple-200',
      badgeColor: 'bg-purple-100 text-purple-700',
      details: `${trip.touristPlaces.length} Curated Attractions • Guided Walking Tours • Entry Passes`,
      aiTip: 'Scenic heritage attractions have bundle entry options, saving ticket overhead.'
    },
    {
      id: 'miscellaneous',
      name: 'Shopping, Tips & Contingency',
      amount: computedBudget.miscellaneous,
      icon: ShoppingBag,
      color: 'bg-rose-500',
      lightBg: 'bg-rose-50 text-rose-800 border-rose-200',
      badgeColor: 'bg-rose-100 text-rose-700',
      details: `Emergency Buffer • Souvenirs • Gratuities • Incidentals`,
      aiTip: 'Recommended 8–10% contingency buffer keeps your trip stress-free.'
    }
  ];

  // Daily Cost Breakdown Calculation
  const dailyCostBreakdown = useMemo(() => {
    return trip.itinerary.map(day => {
      const activitiesCost = day.activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0) * (simulatedTravelers / (trip.travelers || 2));
      const dailyHotelShare = Math.round(computedBudget.hotel / (trip.days || 1));
      const dailyFoodShare = Math.round(computedBudget.food / (trip.days || 1));
      const dailyTransitShare = Math.round(computedBudget.transportation / (trip.days || 1));
      const dailyMiscShare = Math.round(computedBudget.miscellaneous / (trip.days || 1));
      const dailyFlightShare = Math.round(computedBudget.flights / (trip.days || 1));

      const dayTotal = Math.round(activitiesCost + dailyHotelShare + dailyFlightShare + dailyFoodShare + dailyTransitShare + dailyMiscShare);

      return {
        dayNumber: day.dayNumber,
        title: day.title,
        theme: day.theme,
        activitiesCost: Math.round(activitiesCost),
        dayTotal,
        activityCount: day.activities.length,
        hasFlight: day.dayNumber === 1 || day.dayNumber === trip.days
      };
    });
  }, [trip.itinerary, trip.travelers, trip.days, simulatedTravelers, computedBudget]);

  // Target Budget utilization percentage
  const budgetUtilization = Math.min(150, Math.round((computedBudget.total / (targetBudgetInput || 1)) * 100));
  const isOverBudget = computedBudget.total > targetBudgetInput;
  const varianceAmount = Math.abs(targetBudgetInput - computedBudget.total);

  // Toggle AI Saving Option
  const handleToggleAiSaving = (id: string, title: string, amount: number) => {
    setAppliedAiSavings(prev => {
      const nextVal = !prev[id];
      if (nextVal) {
        notify(`Applied "${title}": Saved ${formatINR(amount)} (${formatForeign(amount, selectedCountry)})! 💸`);
        try {
          confetti({
            particleCount: 30,
            spread: 45,
            origin: { y: 0.7 }
          });
        } catch (e) {}
      } else {
        notify(`Removed "${title}"`);
      }
      return { ...prev, [id]: nextVal };
    });
  };

  // Add Custom Expense Handler
  const handleAddCustomExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseName.trim() || !newExpenseAmount || isNaN(Number(newExpenseAmount))) {
      notify('Please enter a valid expense title and numerical amount in INR');
      return;
    }

    const item: CustomDashboardExpense = {
      id: `dash-exp-${Date.now()}`,
      name: newExpenseName.trim(),
      category: newExpenseCat,
      amount: Number(newExpenseAmount),
      perPerson: newExpensePerPerson,
      active: true
    };

    setCustomExpenses(prev => [...prev, item]);
    setNewExpenseName('');
    setNewExpenseAmount('');
    setShowAddExpense(false);
    notify(`Added "${item.name}" to budget estimate!`);
  };

  const handleToggleCustomExpense = (id: string) => {
    setCustomExpenses(prev =>
      prev.map(item => item.id === id ? { ...item, active: !item.active } : item)
    );
  };

  const handleDeleteCustomExpense = (id: string) => {
    setCustomExpenses(prev => prev.filter(item => item.id !== id));
    notify('Custom expense removed');
  };

  // Copy Formatted Financial Summary in Dual Currency
  const handleCopyBudgetSummary = () => {
    const summary = `
📊 TRAVELIA AI DUAL-CURRENCY ESTIMATED BUDGET: ${trip.destination.toUpperCase()}
Country: ${selectedCountry.flag} ${selectedCountry.countryName} (${selectedCountry.currencyCode} ${selectedCountry.currencySymbol})
Exchange Rate: 1 INR (₹) = ${selectedCountry.ratePerINR < 1 ? selectedCountry.ratePerINR.toFixed(4) : selectedCountry.ratePerINR.toFixed(2)} ${selectedCountry.currencyCode}
--------------------------------------------------
Total Projected Cost: ${formatINR(computedBudget.total)} ≈ ${formatForeign(computedBudget.total, selectedCountry)}
Travelers: ${simulatedTravelers} Pax (${formatINR(computedBudget.perPerson)} ≈ ${formatForeign(computedBudget.perPerson, selectedCountry)} / person)
Duration: ${trip.days} Days / ${trip.nights} Nights (~${formatINR(computedBudget.perDay)} ≈ ${formatForeign(computedBudget.perDay, selectedCountry)} / day)
Target Budget: ${formatINR(targetBudgetInput)} ≈ ${formatForeign(targetBudgetInput, selectedCountry)} (${isOverBudget ? 'Exceeded by ' : 'Under budget by '}${formatINR(varianceAmount)} ≈ ${formatForeign(varianceAmount, selectedCountry)})

CATEGORY BREAKDOWN (INR + ${selectedCountry.currencyCode}):
🏨 Accommodations: ${formatINR(computedBudget.hotel)} ≈ ${formatForeign(computedBudget.hotel, selectedCountry)} (${Math.round((computedBudget.hotel / computedBudget.total) * 100)}%)
✈️ Flights & Airfare: ${formatINR(computedBudget.flights)} ≈ ${formatForeign(computedBudget.flights, selectedCountry)} (${Math.round((computedBudget.flights / computedBudget.total) * 100)}%)
🍽️ Dining & Cafés: ${formatINR(computedBudget.food)} ≈ ${formatForeign(computedBudget.food, selectedCountry)} (${Math.round((computedBudget.food / computedBudget.total) * 100)}%)
🚕 Transit & Rides: ${formatINR(computedBudget.transportation)} ≈ ${formatForeign(computedBudget.transportation, selectedCountry)} (${Math.round((computedBudget.transportation / computedBudget.total) * 100)}%)
🎟️ Sights & Passes: ${formatINR(computedBudget.activities)} ≈ ${formatForeign(computedBudget.activities, selectedCountry)} (${Math.round((computedBudget.activities / computedBudget.total) * 100)}%)
🛍️ Buffer & Contingency: ${formatINR(computedBudget.miscellaneous)} ≈ ${formatForeign(computedBudget.miscellaneous, selectedCountry)} (${Math.round((computedBudget.miscellaneous / computedBudget.total) * 100)}%)

AI Cost Optimizations: ${totalSavingsAccrued > 0 ? `Saved ${formatINR(totalSavingsAccrued)} ≈ ${formatForeign(totalSavingsAccrued, selectedCountry)}` : 'None applied'}
--------------------------------------------------
Generated by Travelia AI Dual-Currency Travel Operating System
    `.trim();

    navigator.clipboard.writeText(summary);
    notify(`Copied Dual-Currency Budget (${selectedCountry.currencyCode} + INR) to clipboard!`);
  };

  // Download Financial Sheet with Dual Currency Data
  const handleDownloadFinancialSummary = () => {
    const data = {
      destination: trip.destination,
      destinationCountry: selectedCountry.countryName,
      countryCode: selectedCountry.countryCode,
      currencyCode: selectedCountry.currencyCode,
      currencySymbol: selectedCountry.currencySymbol,
      exchangeRatePerINR: selectedCountry.ratePerINR,
      travelDates: trip.travelDates,
      travelers: simulatedTravelers,
      days: trip.days,
      nights: trip.nights,
      currencyOverview: {
        baseCurrency: 'INR (₹)',
        targetCurrency: `${selectedCountry.currencyCode} (${selectedCountry.currencySymbol})`,
        rateRule: `1 INR = ${selectedCountry.ratePerINR} ${selectedCountry.currencyCode}`
      },
      flightDetails: {
        included: includeFlights,
        cabinClass: flightCabinClass,
        airline: destinationFlightPackage.outboundFlight.airline,
        route: `${destinationFlightPackage.outboundFlight.originCode} ⇄ ${destinationFlightPackage.outboundFlight.destinationCode}`,
        costPerPersonINR: effectiveFlightPerPerson,
        totalFlightCostINR: computedBudget.flights,
        totalFlightCostForeign: formatForeign(computedBudget.flights, selectedCountry)
      },
      totalBudget: {
        inr: computedBudget.total,
        foreign: Math.round(computedBudget.total * selectedCountry.ratePerINR),
        inrFormatted: formatINR(computedBudget.total),
        foreignFormatted: formatForeign(computedBudget.total, selectedCountry)
      },
      perPerson: {
        inr: computedBudget.perPerson,
        foreign: Math.round(computedBudget.perPerson * selectedCountry.ratePerINR),
        inrFormatted: formatINR(computedBudget.perPerson),
        foreignFormatted: formatForeign(computedBudget.perPerson, selectedCountry)
      },
      perDay: {
        inr: computedBudget.perDay,
        foreign: Math.round(computedBudget.perDay * selectedCountry.ratePerINR),
        inrFormatted: formatINR(computedBudget.perDay),
        foreignFormatted: formatForeign(computedBudget.perDay, selectedCountry)
      },
      targetBudget: {
        inr: targetBudgetInput,
        foreignFormatted: formatForeign(targetBudgetInput, selectedCountry)
      },
      categories: {
        hotel: {
          inr: computedBudget.hotel,
          foreignFormatted: formatForeign(computedBudget.hotel, selectedCountry)
        },
        flights: {
          inr: computedBudget.flights,
          foreignFormatted: formatForeign(computedBudget.flights, selectedCountry)
        },
        food: {
          inr: computedBudget.food,
          foreignFormatted: formatForeign(computedBudget.food, selectedCountry)
        },
        transportation: {
          inr: computedBudget.transportation,
          foreignFormatted: formatForeign(computedBudget.transportation, selectedCountry)
        },
        activities: {
          inr: computedBudget.activities,
          foreignFormatted: formatForeign(computedBudget.activities, selectedCountry)
        },
        miscellaneous: {
          inr: computedBudget.miscellaneous,
          foreignFormatted: formatForeign(computedBudget.miscellaneous, selectedCountry)
        }
      },
      dailyBreakdown: dailyCostBreakdown.map(d => ({
        ...d,
        dayTotalINR: formatINR(d.dayTotal),
        dayTotalForeign: formatForeign(d.dayTotal, selectedCountry)
      })),
      customExpenses,
      aiSavings: {
        inr: totalSavingsAccrued,
        foreignFormatted: formatForeign(totalSavingsAccrued, selectedCountry)
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${trip.destination.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dual_currency_budget.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Dual-Currency Budget Report (JSON) downloaded!');
  };

  // Switch selected country handler
  const handleCountryChange = (countryCode: string) => {
    const found = SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === countryCode);
    if (found) {
      if (onSelectCountryProp) {
        onSelectCountryProp(found);
      } else {
        setSelectedCountryLocal(found);
      }
      notify(`Budget converted to ${found.flag} ${found.countryName} (${found.currencyCode} ${found.currencySymbol}) & INR (₹)`);
      try {
        confetti({
          particleCount: 25,
          spread: 40,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  };

  return (
    <section id="section-budget" className="space-y-6 scroll-mt-24 transition-all">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider">
              Financial Intelligence & Estimation
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-[10px] font-extrabold flex items-center gap-1 border border-[#344E27]/20">
              <Sparkles className="w-3 h-3 text-[#344E27]" /> Live Dual-Currency Costing
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-extrabold flex items-center gap-1 border border-sky-300">
              <Plane className="w-3 h-3 text-sky-600" /> {includeFlights ? `Flights Included (${flightCabinClass.toUpperCase()})` : 'Flights Excluded'}
            </span>
          </div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#191919] mt-0.5">
            Estimated Trip Budget & Cost Breakdown
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Real-time projection showing budget simultaneously in <strong className="text-neutral-700 font-bold">Indian Rupee (₹ INR)</strong> and <strong className="text-[#344E27] font-bold">{selectedCountry.flag} {selectedCountry.countryName} ({selectedCountry.currencyCode})</strong> with live roundtrip airfare, stays, dining, and daily activities.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onUpdateBudget && (
            <button
              onClick={() => {
                onUpdateBudget(computedBudget, { travelers: simulatedTravelers });
                notify('Budget synchronized with Trip Plan & Budget Studio! 🎯');
                try {
                  confetti({
                    particleCount: 35,
                    spread: 45,
                    origin: { y: 0.7 }
                  });
                } catch (e) {}
              }}
              className="px-3.5 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
              title="Sync current calculated budget back to Trip Plan"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Sync to Trip Plan</span>
            </button>
          )}

          <button
            onClick={handleCopyBudgetSummary}
            className="px-3.5 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Copy formatted dual-currency financial summary"
          >
            <Copy className="w-3.5 h-3.5 text-[#344E27]" />
            <span className="hidden sm:inline">Copy Dual Breakdown</span>
          </button>

          <button
            onClick={handleDownloadFinancialSummary}
            className="px-3.5 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Download JSON dual-currency budget report"
          >
            <Download className="w-3.5 h-3.5 text-[#344E27]" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>

          <button
            onClick={() => onViewFullBudget('itemized')}
            className="px-4 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <span>Open Budget Studio</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 1: INTERACTIVE COUNTRY SELECTION & DUAL-CURRENCY CONTROL BAR */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-[#191919] via-[#24331e] to-[#141b12] rounded-[30px] p-5 sm:p-7 text-white border border-[#344E27]/50 shadow-xl space-y-4">
        
        {/* Top Header of the Currency Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#344E27] text-[#E5ECE0] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-emerald-400/30">
                <Globe className="w-3 h-3 text-emerald-400" />
                Dual-Currency Active
              </span>
              <span className="text-xs text-neutral-300 font-medium">
                ₹ Indian Rupee ⇄ {selectedCountry.flag} {selectedCountry.currencyCode} ({selectedCountry.currencyName})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white flex items-center gap-2.5">
                <span>Destination Country:</span>
                <span className="text-emerald-400 font-black">{selectedCountry.flag} {selectedCountry.countryName}</span>
              </h3>
            </div>
          </div>

          {/* Right Controls: Country Select & Live Converter Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Country Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedCountry.countryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
                aria-label="Select Destination Country"
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-extrabold border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer backdrop-blur-md transition-all appearance-none pr-9 shadow-inner"
              >
                {SUPPORTED_DESTINATION_COUNTRIES.map(c => (
                  <option key={c.countryCode} value={c.countryCode} className="bg-neutral-900 text-white py-1">
                    {c.flag} {c.countryName} ({c.currencyCode} {c.currencySymbol})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-300 absolute right-3 top-3.5 pointer-events-none" />
            </div>

            {/* Quick Live Calculator Button */}
            <button
              onClick={() => setIsConverterOpen(!isConverterOpen)}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{isConverterOpen ? 'Close FX Tool' : 'Quick FX Calc'}</span>
            </button>
          </div>
        </div>

        {/* Popular Destination Countries Quick Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Quick Country Selector:
            </span>
            <span className="text-[10px] text-neutral-400">
              Click any country to calculate in both currencies instantly
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['KR', 'JP', 'FR', 'ID', 'TH', 'AE', 'US', 'GB', 'CH', 'SG', 'AU', 'VN'].map(code => {
              const c = SUPPORTED_DESTINATION_COUNTRIES.find(item => item.countryCode === code);
              if (!c) return null;
              const isSelected = selectedCountry.countryCode === c.countryCode;

              return (
                <button
                  key={c.countryCode}
                  onClick={() => handleCountryChange(c.countryCode)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-400 text-neutral-950 font-black shadow-md scale-105 ring-2 ring-emerald-300'
                      : 'bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10'
                  }`}
                >
                  <span className="text-sm">{c.flag}</span>
                  <span>{c.countryName.split(' ')[0]}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-extrabold ${isSelected ? 'bg-neutral-950/20 text-neutral-950' : 'bg-black/30 text-neutral-300'}`}>
                    {c.currencyCode}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Exchange Rate Status & Display Mode Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-emerald-300 font-extrabold bg-emerald-950/70 px-3 py-1.5 rounded-xl border border-emerald-500/40">
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                1 INR (₹) = {selectedCountry.ratePerINR < 1 ? selectedCountry.ratePerINR.toFixed(4) : selectedCountry.ratePerINR.toFixed(2)} {selectedCountry.currencyCode} ({selectedCountry.currencySymbol})
              </span>
            </div>

            <div className="text-neutral-300 text-xs bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
              {selectedCountry.ratePerINR >= 100 
                ? `1,000 ${selectedCountry.currencyCode} ≈ ₹${(1000 / selectedCountry.ratePerINR).toFixed(2)} INR`
                : selectedCountry.ratePerINR >= 1
                  ? `100 ${selectedCountry.currencyCode} ≈ ₹${(100 / selectedCountry.ratePerINR).toFixed(2)} INR`
                  : `1 ${selectedCountry.currencyCode} ≈ ₹${(1 / selectedCountry.ratePerINR).toFixed(2)} INR`
              }
            </div>
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400">Display Priority:</span>
            <button
              onClick={() => {
                setCurrencyDisplayMode(currencyDisplayMode === 'both' ? 'foreign-first' : 'both');
                notify(currencyDisplayMode === 'both' ? `Prioritizing ${selectedCountry.currencyCode}` : 'Prioritizing INR (₹)');
              }}
              className="px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-amber-300 text-xs font-bold border border-amber-300/30 transition-all cursor-pointer"
            >
              {currencyDisplayMode === 'foreign-first' 
                ? `Show INR (₹) First` 
                : `Show ${selectedCountry.currencyCode} (${selectedCountry.currencySymbol}) First`}
            </button>
          </div>
        </div>

        {/* Expandable Live Quick FX Converter */}
        {isConverterOpen && (
          <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/40 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                Instant Foreign Exchange Calculator
              </span>
              <span className="text-[10px] text-neutral-400">
                Live rate based on 1 INR = {selectedCountry.ratePerINR} {selectedCountry.currencyCode}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <div className="flex-1 w-full">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Amount in Indian Rupees (INR ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-neutral-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={calcInputINR}
                    onChange={(e) => setCalcInputINR(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                    placeholder="Enter INR amount (e.g. 5000)"
                  />
                </div>
              </div>

              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-4 h-4" />
              </div>

              <div className="flex-1 w-full">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Converted to {selectedCountry.flag} {selectedCountry.countryName} ({selectedCountry.currencyCode})
                </label>
                <div className="px-4 py-2 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-sm font-black text-emerald-300 min-h-[38px] flex items-center">
                  {formatForeign(Number(calcInputINR) || 0, selectedCountry)}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* FEATURE 2: ROUNDTRIP FLIGHT COST & AIRFARE INTELLIGENCE PANEL */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#0d2238] via-[#112d4a] to-[#0a1b2d] rounded-[28px] p-5 sm:p-6 text-white border border-sky-500/30 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Flight Route & Airline Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-sky-400/30">
                <Plane className="w-3 h-3 text-sky-400" />
                Roundtrip Airfare Costing
              </span>
              <span className="text-xs text-neutral-300 font-medium">
                {destinationFlightPackage.outboundFlight.originCity} ({destinationFlightPackage.outboundFlight.originCode}) ⇄ {destinationFlightPackage.outboundFlight.destinationCity} ({destinationFlightPackage.outboundFlight.destinationCode})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-black text-xl sm:text-2xl text-white">
                {destinationFlightPackage.outboundFlight.airline}
              </h3>
              <span className="text-xs text-neutral-400">
                ({destinationFlightPackage.outboundFlight.flightNumber} / {destinationFlightPackage.returnFlight.flightNumber})
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                Live Route Locked
              </span>
            </div>
          </div>

          {/* Right: Flight Price in Dual Currency & Toggle */}
          <div className="flex flex-col sm:items-end justify-center gap-1 bg-black/40 p-3.5 rounded-2xl border border-sky-500/20">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-neutral-300">
                {includeFlights ? `Include in Total (${simulatedTravelers} Pax):` : 'Flight Status:'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFlights}
                  onChange={(e) => {
                    if (onToggleIncludeFlightsProp) {
                      onToggleIncludeFlightsProp(e.target.checked);
                    } else {
                      setIncludeFlightsLocal(e.target.checked);
                    }
                    notify(e.target.checked ? 'Roundtrip flight fares included in estimated budget' : 'Flight fares excluded from estimated budget');
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500" />
              </label>
            </div>

            {includeFlights ? (
              <div className="text-left sm:text-right mt-1">
                <div className="font-display font-black text-2xl text-white tracking-tight">
                  {formatINR(totalFlightsCost)}
                </div>
                <div className="text-xs font-bold text-sky-300 mt-0.5">
                  ≈ {formatForeign(totalFlightsCost, selectedCountry)}
                </div>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  ~{formatINR(effectiveFlightPerPerson)} ({formatForeign(effectiveFlightPerPerson, selectedCountry)}) / traveler
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-neutral-400 mt-1">
                Excluded from Estimate (Self-Booked)
              </span>
            )}
          </div>
        </div>

        {/* Cabin Class Selector & Quick Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-neutral-400">Cabin Class:</span>
            <div className="flex items-center gap-1.5">
              {(['economy', 'premium', 'business'] as const).map(cls => (
                <button
                  key={cls}
                  onClick={() => {
                    if (onSelectFlightCabinClassProp) {
                      onSelectFlightCabinClassProp(cls);
                    } else {
                      setFlightCabinClassLocal(cls);
                    }
                    setCustomFlightPrice(null);
                    notify(`Cabin class set to ${cls.toUpperCase()}`);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    flightCabinClass === cls && customFlightPrice === null
                      ? 'bg-sky-500 text-neutral-950 font-black shadow-sm'
                      : 'bg-white/10 hover:bg-white/20 text-neutral-300'
                  }`}
                >
                  {cls === 'premium' ? 'Premium Economy' : cls}
                </button>
              ))}
            </div>

            {/* Custom Fare Override */}
            {isEditingFlightPrice ? (
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="number"
                  placeholder="Custom Fare / Pax"
                  value={tempFlightPrice}
                  onChange={(e) => setTempFlightPrice(e.target.value)}
                  className="w-28 px-2 py-1 bg-neutral-900 border border-sky-400 rounded-lg text-xs font-bold text-white focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const val = Number(tempFlightPrice);
                    if (val > 0) {
                      setCustomFlightPrice(val);
                      setIsEditingFlightPrice(false);
                      notify(`Custom flight fare set to ${formatINR(val)} per traveler`);
                    }
                  }}
                  className="px-2 py-1 bg-sky-500 text-neutral-950 text-[10px] font-black rounded-lg cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingFlightPrice(false)}
                  className="text-[10px] text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempFlightPrice(effectiveFlightPerPerson.toString());
                  setIsEditingFlightPrice(true);
                }}
                className="text-[11px] font-bold text-sky-400 hover:underline cursor-pointer ml-1"
              >
                {customFlightPrice !== null ? `Custom: ${formatINR(customFlightPrice)} (Reset)` : 'Custom Fare'}
              </button>
            )}
          </div>

          {/* Quick jump to flight section */}
          <button
            onClick={() => {
              const el = document.getElementById('section-flights');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                el.classList.add('ring-4', 'ring-sky-500/40', 'rounded-3xl', 'transition-all');
                setTimeout(() => el.classList.remove('ring-4', 'ring-sky-500/40'), 1800);
                notify('Scrolled to Live Flight Passes & Gate Terminal details');
              }
            }}
            className="text-xs font-bold text-sky-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View Boarding Passes & Gates</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRIMARY ESTIMATED BUDGET HERO CARD */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-200 shadow-2xs space-y-8">
        
        {/* Top Metric Cards Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Card 1: Grand Total Estimate (Dual Currency + Flights Included) */}
          <div className="md:col-span-2 bg-[#191919] text-white p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-lg border border-neutral-800">
            <div className="relative z-10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Total Estimated Budget</span>
                  <span className="px-1.5 py-0.2 rounded bg-white/10 text-emerald-300 text-[10px] font-extrabold">
                    INR + {selectedCountry.currencyCode}
                  </span>
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#344E27] text-white border border-[#486b36]">
                  {trip.days}D / {trip.nights}N • {simulatedTravelers} Pax
                </span>
              </div>

              {/* Main Total Dual Currency Figures */}
              <div className="pt-2">
                {currencyDisplayMode === 'foreign-first' ? (
                  <div>
                    <div className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
                      {formatForeign(computedBudget.total, selectedCountry)}
                    </div>
                    <div className="text-sm font-extrabold text-emerald-300 mt-1 flex items-center gap-1">
                      <span>≈ {formatINR(computedBudget.total)} INR</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
                      {formatINR(computedBudget.total)}
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-emerald-300 mt-1 flex items-center gap-1">
                      <span>≈ {formatForeign(computedBudget.total, selectedCountry)}</span>
                    </div>
                  </div>
                )}

                {totalSavingsAccrued > 0 && (
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-2">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>-{formatINR(totalSavingsAccrued)} ({formatForeign(totalSavingsAccrued, selectedCountry)}) saved with AI</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row of Card 1: Pace & Per Traveler (Dual Currency) */}
            <div className="relative z-10 pt-4 mt-3 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-neutral-800/80">
              <div className="space-y-0.5">
                <span className="text-neutral-400 block text-[11px]">Daily Cost Pace:</span>
                <div className="font-extrabold text-amber-300">
                  <span>~{formatINR(computedBudget.perDay)} / day</span>
                  <span className="text-neutral-300 text-[11px] block font-semibold">
                    ≈ {formatForeign(computedBudget.perDay, selectedCountry)}
                  </span>
                </div>
              </div>

              <div className="space-y-0.5 text-right sm:text-left">
                <span className="text-neutral-400 block text-[11px]">Cost Per Traveler:</span>
                <div className="font-extrabold text-emerald-300">
                  <span>~{formatINR(computedBudget.perPerson)} / pax</span>
                  <span className="text-neutral-300 text-[11px] block font-semibold">
                    ≈ {formatForeign(computedBudget.perPerson, selectedCountry)}
                  </span>
                </div>
              </div>
            </div>

            {/* Subtle background glow */}
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-[#344E27]/30 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Card 2: Interactive Travelers Pax Stepper */}
          <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Group Size Simulator</span>
                <Users className="w-4 h-4 text-[#344E27]" />
              </div>
              <span className="font-display font-extrabold text-2xl text-[#191919] mt-1 block">
                {simulatedTravelers} {simulatedTravelers === 1 ? 'Traveler' : 'Travelers'}
              </span>
              <div className="mt-1 space-y-0.5">
                <span className="text-xs font-bold text-neutral-700 block">
                  ~{formatINR(computedBudget.perPerson)} per person
                </span>
                <span className="text-[11px] font-bold text-[#344E27] block">
                  ≈ {formatForeign(computedBudget.perPerson, selectedCountry)}
                </span>
              </div>
            </div>

            {/* Stepper Controls */}
            <div className="flex items-center justify-between bg-white p-1.5 rounded-xl border border-neutral-200">
              <button
                onClick={() => {
                  if (simulatedTravelers > 1) {
                    setSimulatedTravelers(prev => prev - 1);
                    notify(`Updated calculation for ${simulatedTravelers - 1} travelers`);
                  }
                }}
                disabled={simulatedTravelers <= 1}
                className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-[#344E27] hover:text-white disabled:opacity-30 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                title="Decrease travelers"
              >
                -
              </button>
              <span className="text-xs font-extrabold text-[#191919]">
                {simulatedTravelers} Pax
              </span>
              <button
                onClick={() => {
                  if (simulatedTravelers < 12) {
                    setSimulatedTravelers(prev => prev + 1);
                    notify(`Updated calculation for ${simulatedTravelers + 1} travelers`);
                  }
                }}
                disabled={simulatedTravelers >= 12}
                className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-[#344E27] hover:text-white disabled:opacity-30 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                title="Increase travelers"
              >
                +
              </button>
            </div>
          </div>

          {/* Card 3: Target Budget Goal & Health Bar */}
          <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Target Budget Goal</span>
                <PiggyBank className="w-4 h-4 text-[#344E27]" />
              </div>

              {isEditingTarget ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    value={tempTarget}
                    onChange={(e) => setTempTarget(e.target.value)}
                    className="w-28 px-2 py-1 bg-white border border-[#344E27] rounded-lg text-xs font-bold focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const val = Number(tempTarget);
                      if (val > 0) {
                        setTargetBudgetInput(val);
                        setIsEditingTarget(false);
                        notify(`Target budget updated to ${formatINR(val)} (${formatForeign(val, selectedCountry)})`);
                      }
                    }}
                    className="px-2 py-1 bg-[#344E27] text-white text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-extrabold text-2xl text-[#191919]">
                      {formatINR(targetBudgetInput)}
                    </span>
                    <button
                      onClick={() => {
                        setTempTarget(targetBudgetInput.toString());
                        setIsEditingTarget(true);
                      }}
                      className="text-[10px] font-bold text-[#344E27] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-[#344E27] block">
                    ≈ {formatForeign(targetBudgetInput, selectedCountry)}
                  </span>
                </div>
              )}

              <span className={`text-[11px] font-bold block mt-1.5 ${isOverBudget ? 'text-rose-600' : 'text-emerald-700'}`}>
                {isOverBudget 
                  ? `Exceeds target by ${formatINR(varianceAmount)} (${formatForeign(varianceAmount, selectedCountry)})`
                  : `Under target by ${formatINR(varianceAmount)} (${formatForeign(varianceAmount, selectedCountry)})`
                }
              </span>
            </div>

            {/* Target Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-extrabold text-neutral-500">
                <span>{budgetUtilization}% of Target</span>
                <span>{isOverBudget ? 'Over Budget' : 'On Track'}</span>
              </div>
              <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, budgetUtilization)}%` }}
                  className={`h-full transition-all duration-300 rounded-full ${
                    budgetUtilization > 100 
                      ? 'bg-rose-500' 
                      : budgetUtilization > 85 
                        ? 'bg-amber-500' 
                        : 'bg-[#344E27]'
                  }`}
                />
              </div>
            </div>
          </div>

        </div>

        {/* PROPORTIONAL CATEGORY DISTRIBUTION BAR */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-600">
            <span className="flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-[#344E27]" />
              Expense Distribution Breakdown
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">
              Hover or click categories to inspect dual amounts
            </span>
          </div>

          <div className="h-4 w-full bg-neutral-100 rounded-xl overflow-hidden flex shadow-inner">
            {categoriesList.map(cat => {
              const pct = Math.max(2, Math.round((cat.amount / computedBudget.total) * 100));
              return (
                <div
                  key={cat.id}
                  style={{ width: `${pct}%` }}
                  className={`${cat.color} h-full transition-all duration-300 hover:opacity-85 cursor-pointer relative group`}
                  onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                  title={`${cat.name}: ${formatINR(cat.amount)} ≈ ${formatForeign(cat.amount, selectedCountry)} (${pct}%)`}
                />
              );
            })}
          </div>

          {/* Quick Category Legend Pills */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
            {categoriesList.map(cat => {
              const pct = Math.round((cat.amount / computedBudget.total) * 100);
              return (
                <button
                  key={cat.id}
                  onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    expandedCategory === cat.id 
                      ? 'bg-neutral-800 text-white font-bold shadow-xs' 
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                  <span>{cat.name.split(' ')[0]}</span>
                  <span className="font-extrabold">{pct}%</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SUB-TABS (Categories / Daily Pace / AI Optimizer) */}
        <div className="border-t border-neutral-100 pt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveSubTab('categories')}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  activeSubTab === 'categories'
                    ? 'bg-[#344E27] text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Itemized Categories ({categoriesList.length})
              </button>

              <button
                onClick={() => setActiveSubTab('daily')}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  activeSubTab === 'daily'
                    ? 'bg-[#344E27] text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Day-by-Day Cost Pace ({trip.days} Days)
              </button>

              <button
                onClick={() => setActiveSubTab('optimizer')}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                  activeSubTab === 'optimizer'
                    ? 'bg-amber-500 text-neutral-950 shadow-2xs'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>AI Cost Savers</span>
                {totalSavingsAccrued > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white text-emerald-800 text-[10px] font-black">
                    -{formatINR(totalSavingsAccrued)}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="px-3 py-1.5 rounded-full bg-white text-[#344E27] hover:bg-[#344E27] hover:text-white border border-[#344E27]/30 text-xs font-bold transition-all flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Expense</span>
            </button>
          </div>

          {/* INLINE ADD CUSTOM EXPENSE FORM WITH DUAL-CURRENCY PREVIEW */}
          {showAddExpense && (
            <form onSubmit={handleAddCustomExpense} className="p-4 rounded-2xl bg-[#E5ECE0]/60 border border-[#344E27]/20 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#344E27] uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" />
                  Add Custom Cost / Buffer Line Item
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="text-neutral-400 hover:text-neutral-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Expense Title (e.g. Scuba Diving Pass)"
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27]"
                  required
                />
                <div>
                  <input
                    type="number"
                    placeholder="Amount in INR (₹)"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27]"
                    required
                  />
                  {newExpenseAmount && !isNaN(Number(newExpenseAmount)) && (
                    <span className="text-[10px] font-extrabold text-[#344E27] block mt-0.5">
                      ≈ {formatForeign(Number(newExpenseAmount), selectedCountry)}
                    </span>
                  )}
                </div>
                <select
                  value={newExpenseCat}
                  onChange={(e) => setNewExpenseCat(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium focus:outline-none cursor-pointer"
                >
                  <option value="activities">Activities & Sights</option>
                  <option value="transportation">Transit & Cabs</option>
                  <option value="flight">Flights & Upgrades</option>
                  <option value="hotel">Accommodations</option>
                  <option value="food">Dining</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newExpensePerPerson}
                    onChange={(e) => setNewExpensePerPerson(e.target.checked)}
                    className="w-4 h-4 rounded text-[#344E27] accent-[#344E27]"
                  />
                  <span>Amount is Per Person (scales with group size: × {simulatedTravelers})</span>
                </label>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Add to Estimated Budget
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: ITEMIZED CATEGORY CARDS (DUAL CURRENCY WITH FLIGHTS) */}
          {activeSubTab === 'categories' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoriesList.map(cat => {
                  const Icon = cat.icon;
                  const pct = Math.round((cat.amount / computedBudget.total) * 100);
                  const isExp = expandedCategory === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 bg-neutral-50/70 hover:bg-[#F4F7F2] ${
                        isExp ? 'border-[#344E27] ring-1 ring-[#344E27] shadow-xs' : 'border-neutral-200/80'
                      }`}
                    >
                      <div>
                        {/* Top row with Dual Currency Output */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl ${cat.badgeColor} flex items-center justify-center shrink-0`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-display font-bold text-sm text-[#191919]">
                                {cat.name}
                              </h4>
                              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                                {pct}% of Total
                              </span>
                            </div>
                          </div>

                          {/* Dual Price for Category */}
                          <div className="text-right shrink-0">
                            <span className="font-display font-extrabold text-base sm:text-lg text-[#191919] block">
                              {formatINR(cat.amount)}
                            </span>
                            <span className="text-[11px] font-extrabold text-[#344E27] block">
                              ≈ {formatForeign(cat.amount, selectedCountry)}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <p className="text-xs text-neutral-600 mt-2.5 leading-relaxed">
                          {cat.details}
                        </p>

                        {/* AI Tip snippet */}
                        <div className="mt-3 p-2.5 rounded-xl bg-white border border-neutral-200/80 text-[11px] text-neutral-600 flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#344E27] shrink-0 mt-0.5" />
                          <span>{cat.aiTip}</span>
                        </div>
                      </div>

                      {/* Bottom action */}
                      <button
                        onClick={() => setExpandedCategory(isExp ? null : cat.id)}
                        className="text-[11px] font-bold text-[#344E27] hover:underline flex items-center justify-between pt-2 border-t border-neutral-200/60 cursor-pointer"
                      >
                        <span>{isExp ? 'Hide Details' : 'View Insights & Pace'}</span>
                        {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExp && (
                        <div className="pt-2 text-xs text-neutral-500 border-t border-neutral-200 space-y-1.5 animate-in fade-in duration-100">
                          <div className="flex justify-between items-center">
                            <span>Share per Traveler:</span>
                            <div className="text-right">
                              <span className="font-bold text-[#191919]">
                                {formatINR(Math.round(cat.amount / simulatedTravelers))}
                              </span>
                              <span className="text-[10px] font-bold text-[#344E27] ml-1">
                                (≈ {formatForeign(Math.round(cat.amount / simulatedTravelers), selectedCountry)})
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Daily Allocation:</span>
                            <div className="text-right">
                              <span className="font-bold text-[#191919]">
                                {formatINR(Math.round(cat.amount / (trip.days || 1)))} / day
                              </span>
                              <span className="text-[10px] font-bold text-[#344E27] ml-1">
                                (≈ {formatForeign(Math.round(cat.amount / (trip.days || 1)), selectedCountry)})
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* CUSTOM DASHBOARD EXPENSES LIST (DUAL CURRENCY) */}
              {customExpenses.length > 0 && (
                <div className="pt-4 space-y-2.5">
                  <span className="text-xs font-extrabold text-[#344E27] uppercase tracking-wider block">
                    Custom User Added Line Items ({customExpenses.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customExpenses.map(exp => {
                      const totalCost = exp.perPerson ? exp.amount * simulatedTravelers : exp.amount;

                      return (
                        <div
                          key={exp.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all ${
                            exp.active ? 'bg-white border-neutral-200 shadow-2xs' : 'bg-neutral-100/60 border-neutral-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={exp.active}
                              onChange={() => handleToggleCustomExpense(exp.id)}
                              className="w-4 h-4 rounded text-[#344E27] accent-[#344E27] cursor-pointer"
                              title="Toggle active"
                            />
                            <div className="min-w-0">
                              <span className={`font-bold block truncate ${exp.active ? 'text-[#191919]' : 'line-through text-neutral-400'}`}>
                                {exp.name}
                              </span>
                              <span className="text-[10px] text-neutral-400 capitalize">
                                {exp.category} • {exp.perPerson ? `Per person (×${simulatedTravelers})` : 'Flat total'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="font-display font-extrabold text-sm text-[#191919] block">
                                {formatINR(totalCost)}
                              </span>
                              <span className="text-[10px] font-bold text-[#344E27] block">
                                ≈ {formatForeign(totalCost, selectedCountry)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteCustomExpense(exp.id)}
                              className="text-neutral-300 hover:text-red-500 p-1 transition-colors cursor-pointer"
                              title="Delete line item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DAY-BY-DAY COST PACE (DUAL CURRENCY) */}
          {activeSubTab === 'daily' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-500">
                Daily projected expense allocation in both <strong className="text-neutral-700">INR (₹)</strong> and <strong className="text-[#344E27]">{selectedCountry.flag} {selectedCountry.currencyCode}</strong> based on scheduled itinerary activities, flights, transit hops, and dining routines.
              </p>

              <div className="space-y-3">
                {dailyCostBreakdown.map((d) => {
                  const pct = Math.round((d.dayTotal / computedBudget.total) * 100);
                  const isHighSpend = d.activitiesCost > 2000;

                  return (
                    <div
                      key={d.dayNumber}
                      className="p-4 rounded-2xl bg-neutral-50 hover:bg-[#F4F7F2] border border-neutral-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#344E27] text-white flex items-center justify-center font-display font-extrabold text-sm shrink-0">
                          D0{d.dayNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-display font-bold text-sm text-[#191919]">
                              {d.title}
                            </h4>
                            {d.hasFlight && (
                              <span className="px-2 py-0.2 rounded-full bg-sky-100 text-sky-800 text-[10px] font-extrabold flex items-center gap-1">
                                <Plane className="w-3 h-3 text-sky-600" />
                                Air Travel Day
                              </span>
                            )}
                            {isHighSpend && (
                              <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                                Activity Intensive
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-neutral-500 block">
                            Theme: {d.theme} • {d.activityCount} Activities
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:pl-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-200">
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                            Daily Estimated Total
                          </span>
                          <span className="font-display font-extrabold text-base text-[#191919] block">
                            {formatINR(d.dayTotal)}
                          </span>
                          <span className="text-[11px] font-bold text-[#344E27] block">
                            ≈ {formatForeign(d.dayTotal, selectedCountry)}
                          </span>
                        </div>

                        <div className="w-20 text-right">
                          <span className="text-[10px] text-neutral-400 block font-semibold">Share of Trip</span>
                          <span className="text-xs font-bold text-[#344E27]">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AI COST OPTIMIZATION SWITCHES (DUAL CURRENCY) */}
          {activeSubTab === 'optimizer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                      Travelia AI Dynamic Cost Reducer
                    </h4>
                    <span className="text-[11px] text-amber-700">
                      Toggle verified discounts and bundled packages to lower your overall trip cost in both currencies.
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-display font-extrabold text-lg text-emerald-800 block">
                    {totalSavingsAccrued > 0 ? `-${formatINR(totalSavingsAccrued)} Saved` : '₹0 Saved'}
                  </span>
                  {totalSavingsAccrued > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 block">
                      ≈ -{formatForeign(totalSavingsAccrued, selectedCountry)}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {aiSavingsOptions.map(opt => {
                  const isApplied = !!appliedAiSavings[opt.id];

                  return (
                    <div
                      key={opt.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isApplied 
                          ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300' 
                          : 'bg-white hover:bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-display font-bold text-sm text-[#191919]">
                            {opt.title}
                          </h5>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            Save {formatINR(opt.savingAmount)} (≈ {formatForeign(opt.savingAmount, selectedCountry)})
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600">
                          {opt.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleAiSaving(opt.id, opt.title, opt.savingAmount)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                          isApplied
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-neutral-100 hover:bg-[#344E27] text-neutral-700 hover:text-white'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Applied & Saved</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Apply Saving</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

    </section>
  );
};
