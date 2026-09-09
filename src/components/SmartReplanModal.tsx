import React, { useState } from 'react';
import { 
  Sparkles, 
  CloudRain, 
  Sun, 
  DoorClosed, 
  AlertTriangle, 
  PlaneLanding, 
  Clock, 
  FastForward, 
  Check, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { TripPlan, DisruptionType, SmartReplanSuggestion, Currency } from '../types';
import { DISRUPTION_OPTIONS, generateSmartReplan } from '../data/featureData';
import { formatCurrency } from '../data/mockData';
import confetti from 'canvas-confetti';

interface SmartReplanModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripPlan;
  onApplyReplan: (replan: SmartReplanSuggestion) => void;
  currency: Currency;
  initialDisruption?: DisruptionType;
  initialDay?: number;
}

export const SmartReplanModal: React.FC<SmartReplanModalProps> = ({
  isOpen,
  onClose,
  trip,
  onApplyReplan,
  currency,
  initialDisruption = 'rain',
  initialDay = 1
}) => {
  const [selectedDisruption, setSelectedDisruption] = useState<DisruptionType>(initialDisruption);
  const [selectedDay, setSelectedDay] = useState<number>(initialDay);
  const [customNote, setCustomNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestion, setSuggestion] = useState<SmartReplanSuggestion | null>(null);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const res = generateSmartReplan(trip, selectedDisruption, selectedDay);
      setSuggestion(res);
      setIsProcessing(false);
    }, 600);
  };

  const handleAccept = () => {
    if (suggestion) {
      onApplyReplan(suggestion);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}
      onClose();
    }
  };

  const getDisruptionIcon = (type: DisruptionType) => {
    switch (type) {
      case 'rain': return <CloudRain className="w-4 h-4 text-sky-600" />;
      case 'bad_weather': return <Sun className="w-4 h-4 text-amber-600" />;
      case 'attraction_closed': return <DoorClosed className="w-4 h-4 text-rose-600" />;
      case 'traffic_delay': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'transit_delay': return <PlaneLanding className="w-4 h-4 text-indigo-600" />;
      case 'running_late': return <Clock className="w-4 h-4 text-purple-600" />;
      case 'skip_activity': return <FastForward className="w-4 h-4 text-emerald-600" />;
      default: return <Sparkles className="w-4 h-4 text-[#344E27]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-[#F4F6F3] border-b border-[#E5EAE1] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#344E27] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-[#E5ECE0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-lg text-[#191919]">Smart Replan with AI</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#344E27]/10 text-[#344E27] text-[10px] font-bold uppercase tracking-wider">
                  Adaptive Engine
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Instantly adapt to rain, delays, or closures while preserving hotel bookings and budget limits.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: Select Disruption & Affected Day */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                1. Select Disruption Condition
              </label>
              
              {/* Day Selector */}
              <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full text-xs font-bold">
                <span className="text-neutral-500 px-2">Day:</span>
                {trip.itinerary.map(day => (
                  <button
                    key={day.dayNumber}
                    onClick={() => setSelectedDay(day.dayNumber)}
                    className={`px-3 py-1 rounded-full transition-all ${
                      selectedDay === day.dayNumber
                        ? 'bg-[#344E27] text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Day {day.dayNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* Disruption Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {DISRUPTION_OPTIONS.map((opt) => {
                const isSelected = selectedDisruption === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedDisruption(opt.id)}
                    className={`p-3.5 rounded-2xl text-left transition-all border flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#EAEFE8] border-[#344E27] ring-1 ring-[#344E27] shadow-xs'
                        : 'bg-white hover:bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {getDisruptionIcon(opt.id)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#191919]">{opt.label}</h4>
                      <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5 leading-snug">
                        {opt.defaultDescription}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Calculating Optimal Replan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#E5ECE0]" />
                    <span>Generate AI Plan Comparison</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* STEP 2: AI Plan Comparison View */}
          {suggestion && (
            <div className="pt-4 border-t border-neutral-200 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* AI Reason & Diagnosis Banner */}
              <div className="bg-[#F4F7F2] p-4 rounded-2xl border border-[#D8E4D3] flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-[#344E27] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-[#E5ECE0]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider">AI Replan Diagnosis</span>
                    <span className="text-[11px] text-neutral-500">• Day {suggestion.affectedDay}</span>
                  </div>
                  <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                    {suggestion.reason}
                  </p>
                </div>
              </div>

              {/* Impact Metrics Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Affected Activities</span>
                  <span className="text-sm font-extrabold text-[#191919]">
                    {suggestion.affectedActivitiesCount} Stops Rescheduled
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Estimated Budget Impact</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {suggestion.estimatedBudgetImpact === 0 ? (
                      <span className="text-sm font-extrabold text-emerald-700">₹0 (Zero Variation)</span>
                    ) : suggestion.estimatedBudgetImpact < 0 ? (
                      <span className="text-sm font-extrabold text-emerald-700 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Saves {formatCurrency(Math.abs(suggestion.estimatedBudgetImpact), currency)}
                      </span>
                    ) : (
                      <span className="text-sm font-extrabold text-amber-700 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +{formatCurrency(suggestion.estimatedBudgetImpact, currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Schedule Safety</span>
                  <span className="text-sm font-extrabold text-[#344E27] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Verified Shelter
                  </span>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                    Schedule Comparison (Current vs. AI Suggested)
                  </h4>
                  <span className="text-[11px] text-neutral-500">Day {suggestion.affectedDay} Itinerary</span>
                </div>

                <div className="space-y-2.5">
                  {suggestion.comparisonItems.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:border-neutral-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Original */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Current Plan</span>
                          <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-neutral-500 line-through">
                          {item.originalActivity}
                        </p>
                      </div>

                      {/* Divider / Arrow */}
                      <div className="hidden md:flex items-center justify-center px-2">
                        <div className="w-8 h-8 rounded-full bg-[#EAEFE8] text-[#344E27] flex items-center justify-center">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Right: AI Suggested */}
                      <div className="flex-1 space-y-1 bg-[#F9FBF8] p-2.5 rounded-xl border border-[#E5ECE0]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#344E27] uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Suggested
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#191919]">
                          {item.newActivity}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {item.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#FBFBFB] border-t border-neutral-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Keep Current Plan
          </button>

          {suggestion ? (
            <button
              onClick={handleAccept}
              className="px-6 py-2.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Accept & Apply AI Replan</span>
            </button>
          ) : (
            <span className="text-xs text-neutral-400 italic">Select condition and generate comparison</span>
          )}
        </div>

      </div>
    </div>
  );
};
