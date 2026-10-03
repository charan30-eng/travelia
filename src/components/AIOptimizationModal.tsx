import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  ArrowRight, 
  Check, 
  Clock, 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  ChevronRight, 
  HelpCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { OptimizationResult } from '../../server/types/ai';
import { Currency } from '../types';
import { formatCurrency } from '../data/mockData';
import confetti from 'canvas-confetti';

interface AIOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: any;
  optimizationResult: OptimizationResult | null;
  onApplyOptimization?: (result: OptimizationResult) => void;
  onApply?: (result: OptimizationResult) => void;
  currency?: Currency;
}

export const AIOptimizationModal: React.FC<AIOptimizationModalProps> = ({
  isOpen,
  onClose,
  trip,
  optimizationResult,
  onApplyOptimization,
  onApply,
  currency = 'INR'
}) => {
  const [expandedReasonIndex, setExpandedReasonIndex] = useState<number | null>(null);
  const activeCurrency: Currency = (currency as Currency) || 'INR';

  if (!isOpen || !optimizationResult) return null;

  const handleApplyClick = () => {
    if (onApplyOptimization) {
      onApplyOptimization(optimizationResult);
    } else if (onApply) {
      onApply(optimizationResult);
    }
    try {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 }
      });
    } catch {}
    onClose();
  };

  const {
    summary,
    healthScoreBefore,
    healthScoreAfter,
    costBefore,
    costAfter,
    estimatedSavings,
    travelTimeHoursBefore,
    travelTimeHoursAfter,
    travelTimeSavedHours,
    changes,
    explanations
  } = optimizationResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#344E27] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-[#E5ECE0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-lg text-[#191919]">
                  AI Itinerary & Budget Optimization
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                  Review & Approve
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Inspect AI-computed schedule improvements before committing changes to your live trip.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Summary Narrative Banner */}
          <div className="p-4 rounded-2xl bg-neutral-900 text-white flex items-start gap-3 shadow-inner">
            <Sparkles className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <span className="font-bold text-lime-300 block">AI Strategic Diagnostic:</span>
              <p className="text-neutral-300">{summary}</p>
            </div>
          </div>

          {/* BEFORE VS AFTER METRICS COMPARISON GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            
            {/* 1. Cost Comparison */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                Total Expenditure
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs line-through text-neutral-400 font-semibold">
                  {formatCurrency(costBefore, activeCurrency)}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-display font-black text-lg text-[#344E27]">
                  {formatCurrency(costAfter, activeCurrency)}
                </span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                {estimatedSavings > 0
                  ? `Saves ${formatCurrency(estimatedSavings, activeCurrency)}`
                  : 'Budget Balanced'}
              </span>
            </div>

            {/* 2. Transit Time Comparison */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                Transit & Travel Time
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs line-through text-neutral-400 font-semibold">
                  {travelTimeHoursBefore}h
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-display font-black text-lg text-[#344E27]">
                  {travelTimeHoursAfter}h
                </span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                {travelTimeSavedHours > 0 
                  ? `Saved ~${travelTimeSavedHours} hrs${optimizationResult.travelDistanceSavedKm ? ` (${optimizationResult.travelDistanceSavedKm} km)` : ''} in road transit`
                  : `Optimal linear route (~${travelTimeHoursAfter}h transit)`}
              </span>
            </div>

            {/* 3. Health Score Comparison */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                Trip Health Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs line-through text-neutral-400 font-semibold">
                  {healthScoreBefore}/100
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-display font-black text-lg text-emerald-600">
                  {healthScoreAfter}/100
                </span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                {healthScoreAfter > healthScoreBefore 
                  ? `+${healthScoreAfter - healthScoreBefore} Pts Improvement`
                  : healthScoreAfter === healthScoreBefore
                  ? `Maintained ${healthScoreAfter}/100 Balance`
                  : `${healthScoreAfter - healthScoreBefore} Pts Adjustment`}
              </span>
            </div>

          </div>

          {/* ITEM-BY-ITEM PROPOSED CHANGES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-extrabold text-sm text-[#191919]">
                Proposed Itinerary Adjustments ({changes.length})
              </h4>
              <span className="text-[11px] text-neutral-400 font-medium">
                Click any change to inspect AI reasoning
              </span>
            </div>

            <div className="space-y-2.5">
              {changes.map((change, idx) => (
                <div
                  key={idx}
                  onClick={() => setExpandedReasonIndex(expandedReasonIndex === idx ? null : idx)}
                  className="p-3.5 rounded-2xl border border-neutral-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          change.action === 'reschedule' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {change.action}
                        </span>
                        <span className="text-xs font-bold text-neutral-500">
                          Day 0{change.dayNumber}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 text-xs font-bold text-[#191919]">
                        <span className="line-through text-neutral-400 font-medium">
                          {change.oldActivity?.name}
                        </span>
                        <ArrowRight className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="text-[#344E27]">
                          {change.newActivity?.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {change.costDiff < 0 && (
                        <span className="text-xs font-black text-emerald-700 block">
                          Saves {formatCurrency(Math.abs(change.costDiff), activeCurrency)}
                        </span>
                      )}
                      {change.timeDiffMinutes && change.timeDiffMinutes < 0 && (
                        <span className="text-[10px] text-neutral-500 block">
                          {Math.abs(change.timeDiffMinutes)}m less transit
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Why this change explanation */}
                  <div className="mt-2.5 pt-2 border-t border-neutral-100 text-[11px] text-neutral-600 flex items-start gap-1.5 bg-neutral-50 p-2 rounded-xl">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-neutral-800">Why this change?</strong> {change.reason}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KEY REASONING BULLETS */}
          {explanations.length > 0 && (
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
              <span className="text-xs font-bold text-neutral-800 block">
                🧠 Algorithmic Insights & Feasibility Rationale:
              </span>
              <ul className="space-y-1.5 text-xs text-neutral-600">
                {explanations.map((exp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* WARNINGS / ADVISORIES */}
          {optimizationResult.warnings && optimizationResult.warnings.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Feasibility & Budget Advisory:
              </span>
              <ul className="space-y-1.5 text-xs text-amber-800">
                {optimizationResult.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-[#FBFBFB] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-neutral-700 transition-colors cursor-pointer"
          >
            Reject Changes
          </button>

          <button
            onClick={handleApplyClick}
            className="px-7 py-3 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#344E27]/20 hover:shadow-xl transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4 text-lime-400" />
            <span>Apply Changes to Live Trip</span>
          </button>
        </div>

      </div>
    </div>
  );
};
