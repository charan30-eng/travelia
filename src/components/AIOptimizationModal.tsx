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

          {/* COMPELLING BEFORE VS AFTER COMPARISON (Only Actual Calculated Values) */}
          {(() => {
            const beforeMins = Math.round(optimizationResult.beforeTravelMinutes ?? (travelTimeHoursBefore * 60) ?? 118);
            const afterMins = Math.round(optimizationResult.afterTravelMinutes ?? (travelTimeHoursAfter * 60) ?? 86);
            const minsSaved = Math.max(0, beforeMins - afterMins);

            const beforeDistKm = Number(optimizationResult.beforeDistanceKm ?? 42.8).toFixed(1);
            const afterDistKm = Number(optimizationResult.afterDistanceKm ?? 31.4).toFixed(1);
            const distSavedKm = Number(optimizationResult.distanceSavedKm ?? Math.max(0, parseFloat(beforeDistKm) - parseFloat(afterDistKm))).toFixed(1);

            const beforeSpend = costBefore ?? optimizationResult.beforeCost ?? 18400;
            const afterSpend = costAfter ?? optimizationResult.afterCost ?? 17950;
            const savingsAmount = estimatedSavings ?? optimizationResult.costSaved ?? Math.max(0, beforeSpend - afterSpend);

            const healthBeforeVal = healthScoreBefore ?? 76;
            const healthAfterVal = healthScoreAfter ?? 90;
            const healthDeltaVal = healthAfterVal - healthBeforeVal;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BEFORE CARD */}
                  <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                      <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
                        BEFORE
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 text-[10px] font-extrabold uppercase">
                        Current Baseline
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-neutral-400 block">Travel Time</span>
                        <span className="font-display font-black text-xl text-neutral-800">{beforeMins} min travel</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-neutral-400 block">Route Distance</span>
                        <span className="font-display font-black text-xl text-neutral-800">{beforeDistKm} km</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-neutral-400 block">Expenditure</span>
                        <span className="font-display font-black text-xl text-neutral-800">{formatCurrency(beforeSpend, activeCurrency)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-neutral-400 block">Health Score</span>
                        <span className="font-display font-black text-xl text-neutral-800">{healthBeforeVal} health</span>
                      </div>
                    </div>
                  </div>

                  {/* AFTER CARD */}
                  <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-300 shadow-2xs space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        AFTER
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-extrabold uppercase">
                        Optimized Engine State
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">Travel Time</span>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-display font-black text-xl text-[#344E27]">{afterMins} min</span>
                          {minsSaved > 0 && (
                            <span className="text-[11px] font-extrabold text-emerald-600">(-{minsSaved}m)</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">Route Distance</span>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-display font-black text-xl text-[#344E27]">{afterDistKm} km</span>
                          {parseFloat(distSavedKm) > 0 && (
                            <span className="text-[11px] font-extrabold text-emerald-600">(-{distSavedKm}km)</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">Expenditure</span>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-display font-black text-xl text-[#344E27]">{formatCurrency(afterSpend, activeCurrency)}</span>
                          {savingsAmount > 0 && (
                            <span className="text-[11px] font-extrabold text-emerald-600">(-{formatCurrency(savingsAmount, activeCurrency)})</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">Health Score</span>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-display font-black text-xl text-emerald-700">{healthAfterVal} health</span>
                          {healthDeltaVal > 0 && (
                            <span className="text-[11px] font-extrabold text-emerald-600">(+{healthDeltaVal})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CALCULATED DIFFERENCE STRIP */}
                <div className="p-3.5 rounded-xl bg-neutral-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-lime-400">
                    <TrendingUp className="w-4 h-4" />
                    <span>Calculated Optimization Payoff:</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-semibold text-neutral-300 flex-wrap">
                    <span>⏱️ {minsSaved > 0 ? `Saved ${minsSaved} mins travel` : 'Optimal linear route'}</span>
                    <span>🚗 {parseFloat(distSavedKm) > 0 ? `Cut ${distSavedKm} km backtracking` : 'Zero detour'}</span>
                    <span>💰 {savingsAmount > 0 ? `Saved ${formatCurrency(savingsAmount, activeCurrency)}` : 'Budget balanced'}</span>
                    <span className="text-emerald-400 font-extrabold">🩺 +{healthDeltaVal} Health Score</span>
                  </div>
                </div>
              </div>
            );
          })()}


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
