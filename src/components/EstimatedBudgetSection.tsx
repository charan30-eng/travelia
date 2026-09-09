import React, { useState, useMemo } from 'react';
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
  BadgeCheck
} from 'lucide-react';
import { TripPlan, BudgetBreakdown, Currency } from '../types';
import { formatCurrency } from '../data/mockData';
import confetti from 'canvas-confetti';

interface EstimatedBudgetSectionProps {
  trip: TripPlan;
  currency: Currency;
  onViewFullBudget: () => void;
  onToast?: (message: string) => void;
}

interface CustomDashboardExpense {
  id: string;
  name: string;
  category: 'hotel' | 'food' | 'transportation' | 'activities' | 'miscellaneous';
  amount: number;
  perPerson: boolean;
  active: boolean;
}

export const EstimatedBudgetSection: React.FC<EstimatedBudgetSectionProps> = ({
  trip,
  currency,
  onViewFullBudget,
  onToast
}) => {
  // Interactive Simulator State
  const [simulatedTravelers, setSimulatedTravelers] = useState<number>(trip.travelers || 2);
  const [targetBudgetInput, setTargetBudgetInput] = useState<number>(
    Math.round(trip.budget.total * 1.15)
  );
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(targetBudgetInput.toString());

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
      name: 'Roundtrip Flights / Train Tickets',
      category: 'transportation',
      amount: 6000,
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

  // Dynamic Calculation based on simulated travelers, custom items, and AI savings
  const computedBudget = useMemo(() => {
    const base = trip.budget;
    const baseTravelers = trip.travelers || 2;
    const travelerRatio = simulatedTravelers / baseTravelers;

    // Room sharing logic: hotel rooms scale at ceil(travelers / 2)
    const baseRooms = Math.ceil(baseTravelers / 2);
    const simulatedRooms = Math.ceil(simulatedTravelers / 2);
    const roomRatio = simulatedRooms / (baseRooms || 1);

    let hotel = Math.round(base.hotel * roomRatio);
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
      else if (exp.category === 'food') food += cost;
      else if (exp.category === 'transportation') transportation += cost;
      else if (exp.category === 'activities') activities += cost;
      else miscellaneous += cost;
    });

    const total = hotel + food + transportation + activities + miscellaneous;
    const perPerson = Math.round(total / simulatedTravelers);
    const perDay = Math.round(total / (trip.days || 1));

    return {
      hotel,
      food,
      transportation,
      activities,
      miscellaneous,
      total,
      perPerson,
      perDay
    };
  }, [trip.budget, trip.travelers, trip.days, simulatedTravelers, appliedAiSavings, customExpenses]);

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
      aiTip: 'Balcony suites & ocean proximity included in the current forecast.'
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
      aiTip: 'Local coastal bistros offer premium flavor at 40% lower cost than luxury hotel restaurants.'
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
      aiTip: 'Grouped geographic clusters eliminate backtracking and surge pricing.'
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
      aiTip: '2 scenic attractions have free public access, saving ticket overhead.'
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
      // Sum up explicit activities cost for this day
      const activitiesCost = day.activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0) * (simulatedTravelers / (trip.travelers || 2));
      const dailyHotelShare = Math.round(computedBudget.hotel / (trip.days || 1));
      const dailyFoodShare = Math.round(computedBudget.food / (trip.days || 1));
      const dailyTransitShare = Math.round(computedBudget.transportation / (trip.days || 1));
      const dailyMiscShare = Math.round(computedBudget.miscellaneous / (trip.days || 1));

      const dayTotal = Math.round(activitiesCost + dailyHotelShare + dailyFoodShare + dailyTransitShare + dailyMiscShare);

      return {
        dayNumber: day.dayNumber,
        title: day.title,
        theme: day.theme,
        activitiesCost: Math.round(activitiesCost),
        dayTotal,
        activityCount: day.activities.length
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
        notify(`Applied "${title}": Saved ${formatCurrency(amount, currency)}! 💸`);
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
      notify('Please enter a valid expense title and numerical amount');
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

  // Copy Formatted Financial Summary
  const handleCopyBudgetSummary = () => {
    const summary = `
📊 TRAVELIA AI ESTIMATED BUDGET BRIEFING: ${trip.destination.toUpperCase()}
--------------------------------------------------
Total Projected Cost: ${formatCurrency(computedBudget.total, currency)}
Travelers: ${simulatedTravelers} Pax (${formatCurrency(computedBudget.perPerson, currency)} / person)
Duration: ${trip.days} Days / ${trip.nights} Nights (~${formatCurrency(computedBudget.perDay, currency)} / day)
Target Budget: ${formatCurrency(targetBudgetInput, currency)} (${isOverBudget ? 'Exceeded by ' : 'Under budget by '}${formatCurrency(varianceAmount, currency)})

CATEGORY BREAKDOWN:
🏨 Accommodations: ${formatCurrency(computedBudget.hotel, currency)} (${Math.round((computedBudget.hotel / computedBudget.total) * 100)}%)
🍽️ Dining & Cafés: ${formatCurrency(computedBudget.food, currency)} (${Math.round((computedBudget.food / computedBudget.total) * 100)}%)
🚕 Transit & Rides: ${formatCurrency(computedBudget.transportation, currency)} (${Math.round((computedBudget.transportation / computedBudget.total) * 100)}%)
🎟️ Sights & Passes: ${formatCurrency(computedBudget.activities, currency)} (${Math.round((computedBudget.activities / computedBudget.total) * 100)}%)
🛍️ Buffer & Contingency: ${formatCurrency(computedBudget.miscellaneous, currency)} (${Math.round((computedBudget.miscellaneous / computedBudget.total) * 100)}%)

AI Cost Optimizations: ${totalSavingsAccrued > 0 ? `Saved ${formatCurrency(totalSavingsAccrued, currency)}` : 'None applied'}
--------------------------------------------------
Generated by Travelia AI Travel Operating System
    `.trim();

    navigator.clipboard.writeText(summary);
    notify('Budget breakdown copied to clipboard!');
  };

  // Download Financial Sheet
  const handleDownloadFinancialSummary = () => {
    const data = {
      destination: trip.destination,
      travelDates: trip.travelDates,
      travelers: simulatedTravelers,
      days: trip.days,
      nights: trip.nights,
      currency,
      totalBudget: computedBudget.total,
      perPerson: computedBudget.perPerson,
      perDay: computedBudget.perDay,
      targetBudget: targetBudgetInput,
      categories: {
        hotel: computedBudget.hotel,
        food: computedBudget.food,
        transportation: computedBudget.transportation,
        activities: computedBudget.activities,
        miscellaneous: computedBudget.miscellaneous
      },
      dailyBreakdown: dailyCostBreakdown,
      customExpenses,
      aiSavings: totalSavingsAccrued
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${trip.destination.toLowerCase()}_budget_estimate.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Financial budget report downloaded!');
  };

  return (
    <section id="section-budget" className="space-y-6">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider">
              Financial Intelligence & Estimation
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-[10px] font-extrabold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live Dynamic Costing
            </span>
          </div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#191919] mt-0.5">
            Estimated Trip Budget & Cost Breakdown
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Real-time projection across stay tiers, dining choices, daily activity passes, and transport routes tailored to your itinerary.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyBudgetSummary}
            className="px-3.5 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Copy formatted financial summary"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy Breakdown</span>
          </button>

          <button
            onClick={handleDownloadFinancialSummary}
            className="px-3.5 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Download JSON budget report"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={onViewFullBudget}
            className="px-4 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <span>Open Budget Studio</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PRIMARY ESTIMATED BUDGET HERO CARD */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-200 shadow-2xs space-y-8">
        
        {/* Top Metric Cards Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Card 1: Grand Total Estimate */}
          <div className="md:col-span-2 bg-[#191919] text-white p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-lg border border-neutral-800">
            <div className="relative z-10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Total Estimated Budget ({currency})
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#344E27] text-white border border-[#486b36]">
                  {trip.days}D / {trip.nights}N • {simulatedTravelers} Pax
                </span>
              </div>
              <div className="flex items-baseline gap-2 pt-2">
                <span className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
                  {formatCurrency(computedBudget.total, currency)}
                </span>
                {totalSavingsAccrued > 0 && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    -{formatCurrency(totalSavingsAccrued, currency)} saved
                  </span>
                )}
              </div>
            </div>

            <div className="relative z-10 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-neutral-800/80">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Pace:</span>
                <span className="font-extrabold text-amber-300">
                  ~{formatCurrency(computedBudget.perDay, currency)} / day
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Per Traveler:</span>
                <span className="font-extrabold text-emerald-300">
                  ~{formatCurrency(computedBudget.perPerson, currency)} / pax
                </span>
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
              <span className="text-[11px] text-neutral-500">
                ~{formatCurrency(computedBudget.perPerson, currency)} per person
              </span>
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

          {/* Card 3: Target Budget & Health Bar */}
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
                        notify(`Target budget updated to ${formatCurrency(val, currency)}`);
                      }
                    }}
                    className="px-2 py-1 bg-[#344E27] text-white text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <span className="font-display font-extrabold text-2xl text-[#191919]">
                    {formatCurrency(targetBudgetInput, currency)}
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
              )}

              <span className={`text-[11px] font-bold block ${isOverBudget ? 'text-rose-600' : 'text-emerald-700'}`}>
                {isOverBudget 
                  ? `Exceeds target by ${formatCurrency(varianceAmount, currency)}`
                  : `Comfortably under target by ${formatCurrency(varianceAmount, currency)}`
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
              Hover or click categories to inspect
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
                  title={`${cat.name}: ${formatCurrency(cat.amount, currency)} (${pct}%)`}
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
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div className="flex items-center gap-2">
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
                    -{formatCurrency(totalSavingsAccrued, currency)}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="px-3 py-1.5 rounded-full bg-white text-[#344E27] hover:bg-[#344E27] hover:text-white border border-[#344E27]/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Expense</span>
            </button>
          </div>

          {/* INLINE ADD CUSTOM EXPENSE FORM */}
          {showAddExpense && (
            <form onSubmit={handleAddCustomExpense} className="p-4 rounded-2xl bg-[#E5ECE0]/60 border border-[#344E27]/20 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#344E27] uppercase tracking-wider">
                  Add Custom Cost / Buffer Line Item
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="text-neutral-400 hover:text-neutral-700 text-xs font-bold"
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
                <input
                  type="number"
                  placeholder="Amount in INR"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  className="px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27]"
                  required
                />
                <select
                  value={newExpenseCat}
                  onChange={(e) => setNewExpenseCat(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium focus:outline-none"
                >
                  <option value="activities">Activities & Sights</option>
                  <option value="transportation">Transit & Cabs</option>
                  <option value="hotel">Accommodations</option>
                  <option value="food">Dining</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
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

          {/* TAB 1: ITEMIZED CATEGORY CARDS */}
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
                        {/* Top row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl ${cat.badgeColor} flex items-center justify-center`}>
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

                          <span className="font-display font-extrabold text-lg text-[#191919]">
                            {formatCurrency(cat.amount, currency)}
                          </span>
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
                        <span>{isExp ? 'Hide Details' : 'View Insights'}</span>
                        {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExp && (
                        <div className="pt-2 text-xs text-neutral-500 border-t border-neutral-200 space-y-1.5 animate-in fade-in duration-100">
                          <div className="flex justify-between">
                            <span>Share per Traveler:</span>
                            <span className="font-bold text-[#191919]">
                              {formatCurrency(Math.round(cat.amount / simulatedTravelers), currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Daily Allocation:</span>
                            <span className="font-bold text-[#191919]">
                              {formatCurrency(Math.round(cat.amount / (trip.days || 1)), currency)} / day
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* CUSTOM DASHBOARD EXPENSES LIST */}
              {customExpenses.length > 0 && (
                <div className="pt-4 space-y-2.5">
                  <span className="text-xs font-extrabold text-[#344E27] uppercase tracking-wider block">
                    Custom User Added Line Items ({customExpenses.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customExpenses.map(exp => (
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
                          <span className="font-display font-extrabold text-sm text-[#191919]">
                            {formatCurrency(exp.perPerson ? exp.amount * simulatedTravelers : exp.amount, currency)}
                          </span>
                          <button
                            onClick={() => handleDeleteCustomExpense(exp.id)}
                            className="text-neutral-300 hover:text-red-500 p-1 transition-colors"
                            title="Delete line item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DAY-BY-DAY COST PACE */}
          {activeSubTab === 'daily' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-500">
                Daily projected expense allocation based on programmed itinerary activities, transport transfers, and dining routines.
              </p>

              <div className="space-y-3">
                {dailyCostBreakdown.map((d, index) => {
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
                          <div className="flex items-center gap-2">
                            <h4 className="font-display font-bold text-sm text-[#191919]">
                              {d.title}
                            </h4>
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
                          <span className="font-display font-extrabold text-base text-[#191919]">
                            {formatCurrency(d.dayTotal, currency)}
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

          {/* TAB 3: AI COST OPTIMIZATION SWITCHES */}
          {activeSubTab === 'optimizer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                      Travelia AI Dynamic Cost Reducer
                    </h4>
                    <span className="text-[11px] text-amber-700">
                      Toggle verified discounts and bundled packages to lower your overall trip cost instantly.
                    </span>
                  </div>
                </div>

                <span className="font-display font-extrabold text-lg text-emerald-800">
                  {totalSavingsAccrued > 0 ? `-${formatCurrency(totalSavingsAccrued, currency)} Saved` : '₹0 Saved'}
                </span>
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
                        <div className="flex items-center gap-2">
                          <h5 className="font-display font-bold text-sm text-[#191919]">
                            {opt.title}
                          </h5>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            Save {formatCurrency(opt.savingAmount, currency)}
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
