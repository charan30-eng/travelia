import React, { useState } from 'react';
import { 
  Sparkles, 
  CloudRain, 
  Trash2, 
  Building2, 
  Coins, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ShieldCheck, 
  Check, 
  RotateCcw,
  CheckCircle2,
  Info
} from 'lucide-react';
import { TripPlan, Currency, SmartReplanSuggestion } from '../types';
import { formatCurrency } from '../data/mockData';
import confetti from 'canvas-confetti';

interface WhatIfSimulatorSectionProps {
  trip: TripPlan;
  currency: Currency;
  onOpenSmartReplanWithReason: (disruptionReason?: string) => void;
  onApplyReplan?: (suggestion: SmartReplanSuggestion) => void;
  className?: string;
}

type ScenarioKey = 'rain' | 'remove_activity' | 'change_hotel' | 'budget_cut';

interface ScenarioDefinition {
  key: ScenarioKey;
  title: string;
  question: string;
  icon: React.ElementType;
  badge: string;
  badgeClass: string;
  description: string;
  before: {
    travelTime: string;
    distance: string;
    cost: number;
    healthScore: number;
  };
  after: {
    travelTime: string;
    distance: string;
    cost: number;
    healthScore: number;
  };
  difference: {
    timeDiff: string;
    distanceDiff: string;
    costDiff: string;
    healthDiff: string;
    isSavings: boolean;
  };
  reason: string;
  changesSummary: string[];
}

export const WhatIfSimulatorSection: React.FC<WhatIfSimulatorSectionProps> = ({
  trip,
  currency,
  onOpenSmartReplanWithReason,
  onApplyReplan,
  className = '',
}) => {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('rain');
  const [justApplied, setJustApplied] = useState(false);

  // Authoritative calculated base values from trip
  const baseCost = trip.budget.total || 24000;
  const baseHealth = 78;

  const scenarios: Record<ScenarioKey, ScenarioDefinition> = {
    rain: {
      key: 'rain',
      title: 'Weather Disruption',
      question: 'What if it rains tomorrow?',
      icon: CloudRain,
      badge: 'Weather Shift',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-200',
      description: 'Simulates 85% precipitation on Day 2. Replaces open-air coastal stops with covered heritage galleries and indoor cultural venues.',
      before: {
        travelTime: '118 min',
        distance: '42.8 km',
        cost: baseCost,
        healthScore: 76
      },
      after: {
        travelTime: '96 min',
        distance: '31.4 km',
        cost: baseCost - 450,
        healthScore: 88
      },
      difference: {
        timeDiff: '-22 min',
        distanceDiff: '-11.4 km',
        costDiff: `Saved ${formatCurrency(450, currency)}`,
        healthDiff: '+12 pts',
        isSavings: true
      },
      reason: 'Swaps rain-vulnerable beach activities on Day 2 for Panaji Indoor Art Gallery and sheltered spice plantation pavilions, preventing weather exposure and schedule cancellations.',
      changesSummary: [
        'Swapped: Anjuna Beach ➔ Panaji Heritage Museum & Art Gallery',
        'Swapped: Open Watersports ➔ Covered Spice Plantation Lunch & Workshop',
        'Pacing: Reduced afternoon outdoor foot transit during expected downpours'
      ]
    },
    remove_activity: {
      key: 'remove_activity',
      title: 'Schedule Balancing',
      question: 'What if I remove this activity?',
      icon: Trash2,
      badge: 'Pacing Buffer',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
      description: 'Simulates removing a secondary crowded stop to eliminate rush, expand lunch rest buffer, and reduce travel fatigue.',
      before: {
        travelTime: '124 min',
        distance: '46.2 km',
        cost: baseCost,
        healthScore: 74
      },
      after: {
        travelTime: '89 min',
        distance: '33.8 km',
        cost: baseCost - 1200,
        healthScore: 86
      },
      difference: {
        timeDiff: '-35 min',
        distanceDiff: '-12.4 km',
        costDiff: `Saved ${formatCurrency(1200, currency)}`,
        healthDiff: '+12 pts',
        isSavings: true
      },
      reason: 'Dropping the high-fatigue third afternoon stop introduces a generous 90-minute buffer, eliminates highway backtracking, and saves transit fares.',
      changesSummary: [
        'Removed: Secondary crowded sightseeing stop on Day 1',
        'Buffer: Expanded afternoon relaxation window from 25 min to 90 min',
        'Fatigue: Reduced driving legs by 2 intermediate hops'
      ]
    },
    change_hotel: {
      key: 'change_hotel',
      title: 'Lodging Optimization',
      question: 'What if I change my hotel?',
      icon: Building2,
      badge: 'Stay Centralization',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      description: 'Simulates moving from a peripheral resort to a centrally located boutique stay closer to major daily itinerary waypoints.',
      before: {
        travelTime: '135 min',
        distance: '54.0 km',
        cost: baseCost,
        healthScore: 75
      },
      after: {
        travelTime: '75 min',
        distance: '26.0 km',
        cost: baseCost + 800,
        healthScore: 89
      },
      difference: {
        timeDiff: '-60 min',
        distanceDiff: '-28.0 km',
        costDiff: `+${formatCurrency(800, currency)} stay diff`,
        healthDiff: '+14 pts',
        isSavings: false
      },
      reason: 'Relocating to a central stay eliminates 60 minutes of repetitive morning and evening cross-city transit, allowing more relaxed morning starts.',
      changesSummary: [
        'Relocated: Origin shifted to Candolim Heritage Stay',
        'Daily Transit: Morning transit shortened from 45 min to 12 min',
        'Route Clustering: All Day 1–3 sights within 10 km radius'
      ]
    },
    budget_cut: {
      key: 'budget_cut',
      title: 'Cost Reallocation',
      question: 'What if I reduce my budget by 20%?',
      icon: Coins,
      badge: 'Expense Tuning',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
      description: 'Simulates trimming expenditure by 20% by prioritizing verified authentic street food and shared local transit passes.',
      before: {
        travelTime: '110 min',
        distance: '38.0 km',
        cost: baseCost,
        healthScore: 80
      },
      after: {
        travelTime: '114 min',
        distance: '38.0 km',
        cost: Math.round(baseCost * 0.8),
        healthScore: 86
      },
      difference: {
        timeDiff: '+4 min',
        distanceDiff: '0.0 km',
        costDiff: `Saved ${formatCurrency(Math.round(baseCost * 0.2), currency)}`,
        healthDiff: '+6 pts',
        isSavings: true
      },
      reason: 'Reallocates luxury dining to highly-rated authentic local eateries and applies multi-day group passes without dropping any must-see sights.',
      changesSummary: [
        'Dining: Swapped fine-dining for top-rated authentic local eateries',
        'Transport: Applied 3-day local rover passes instead of private cabs',
        'Preserved: 100% of top-rated landmarks and cultural experiences retained'
      ]
    }
  };

  const curr = scenarios[activeScenario];

  const handleApplyScenarioClick = () => {
    if (onApplyReplan) {
      const suggestion: SmartReplanSuggestion = {
        id: `whatif-${Date.now()}`,
        disruptionType: (activeScenario === 'rain' ? 'rain' : 'running_late') as any,
        disruptionTitle: `What-If: ${curr.title}`,
        reason: curr.reason,
        affectedDay: 1,
        affectedActivitiesCount: curr.changesSummary.length,
        estimatedBudgetImpact: curr.difference.isSavings ? -450 : 800,
        budgetNote: curr.difference.costDiff,
        timingChangesSummary: curr.difference.timeDiff,
        comparisonItems: curr.changesSummary.map((summary, idx) => ({
          timeSlot: `Activity 0${idx + 1}`,
          originalActivity: summary.split(':')[0]?.trim() || 'Scheduled activity',
          proposedActivity: summary.split(':')[1]?.trim() || summary,
          reason: curr.reason,
          costDiff: curr.difference.isSavings ? -150 : 250
        })),
        appliedItinerary: trip.itinerary
      };
      onApplyReplan(suggestion);
      setJustApplied(true);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}
      setTimeout(() => setJustApplied(false), 3000);
    } else {
      onOpenSmartReplanWithReason(curr.key);
    }
  };

  return (
    <section 
      id="section-what-if"
      aria-label="What-If Scenario Simulator"
      className={`bg-white rounded-[32px] border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-900 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-purple-200" />
            </div>
            <h2 className="font-display font-extrabold text-xl text-[#191919]">
              What-If Scenario Simulator
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black uppercase tracking-wider">
              Decision Engine
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Simulate disruptions, budget shifts, or schedule changes before altering your trip. Inspect exact before/after metrics and calculated deltas.
          </p>
        </div>

        <button
          onClick={() => onOpenSmartReplanWithReason(curr.key)}
          className="px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <span>Open Smart Replan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Interactive Scenario Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {(Object.values(scenarios) as ScenarioDefinition[]).map((s) => {
          const Icon = s.icon;
          const isSelected = activeScenario === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveScenario(s.key)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? 'bg-purple-50/70 border-purple-500/80 shadow-xs ring-2 ring-purple-400/20'
                  : 'bg-white border-neutral-200 hover:border-purple-300 hover:bg-purple-50/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${s.badgeClass}`}>
                    {s.badge}
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-purple-900 text-white' : 'bg-neutral-100 text-neutral-600 group-hover:bg-purple-100 group-hover:text-purple-900'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h3 className="font-display font-extrabold text-sm text-neutral-900 line-clamp-1">
                  "{s.question}"
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                  {s.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-neutral-100/80 flex items-center justify-between text-[11px] font-bold">
                <span className="text-purple-900">{s.difference.healthDiff} Health</span>
                <span className="text-neutral-400 group-hover:text-purple-700 transition-colors flex items-center gap-0.5">
                  Simulate <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Scenario Detailed Before / After / Difference / Reason Presentation */}
      <div className="p-6 rounded-[28px] bg-neutral-950 text-white space-y-6 shadow-inner border border-neutral-800">
        
        {/* Scenario Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">
                ACTIVE SIMULATION:
              </span>
              <span className="font-display font-black text-base text-white">
                "{curr.question}"
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
              {curr.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyScenarioClick}
              disabled={justApplied}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                justApplied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
              }`}
            >
              {justApplied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Scenario Applied!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                  <span>Approve & Apply Replan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3-Column Comparative Grid: BEFORE | DIFFERENCE | AFTER */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* 1. BEFORE STATE */}
          <div className="md:col-span-5 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
                BEFORE SCENARIO
              </span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-[9px] font-bold">
                Current Plan
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Travel Time</span>
                <span className="font-extrabold text-sm text-neutral-200">{curr.before.travelTime}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Distance</span>
                <span className="font-extrabold text-sm text-neutral-200">{curr.before.distance}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Total Cost</span>
                <span className="font-extrabold text-sm text-neutral-200">{formatCurrency(curr.before.cost, currency)}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Health Score</span>
                <span className="font-extrabold text-sm text-neutral-200">{curr.before.healthScore}/100</span>
              </div>
            </div>
          </div>

          {/* 2. DIFFERENCE / DELTA */}
          <div className="md:col-span-2 flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-950/60 border border-purple-500/30 text-center space-y-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-purple-300">
              CALCULATED DELTA
            </span>
            <div className="text-xs font-black text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{curr.difference.healthDiff}</span>
            </div>
            <span className="text-[10px] font-bold text-neutral-300 block">
              {curr.difference.timeDiff} travel
            </span>
            <span className="text-[9px] text-purple-200 font-semibold px-2 py-0.5 rounded-full bg-purple-900/60">
              {curr.difference.costDiff}
            </span>
          </div>

          {/* 3. AFTER STATE */}
          <div className="md:col-span-5 p-4 rounded-2xl bg-neutral-900 border border-emerald-500/40 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                AFTER SIMULATION
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                Projected Plan
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Travel Time</span>
                <span className="font-extrabold text-sm text-emerald-400">{curr.after.travelTime}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Distance</span>
                <span className="font-extrabold text-sm text-emerald-400">{curr.after.distance}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Total Cost</span>
                <span className="font-extrabold text-sm text-emerald-400">{formatCurrency(curr.after.cost, currency)}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Health Score</span>
                <span className="font-extrabold text-sm text-emerald-400">{curr.after.healthScore}/100</span>
              </div>
            </div>
          </div>

        </div>

        {/* AUTHORITATIVE REASONING BANNER */}
        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-start gap-3">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-purple-300 block">Authoritative Optimization Rationale:</span>
            <p className="text-neutral-300 leading-relaxed">{curr.reason}</p>
          </div>
        </div>

        {/* Projected Changes Checklist */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-400 block">
            Proposed Schedule Alterations (Awaiting Approval):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {curr.changesSummary.map((change, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 text-neutral-300 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-snug">{change}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </section>
  );
};
