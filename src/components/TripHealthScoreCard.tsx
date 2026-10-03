import React, { useState } from 'react';
import { 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  X, 
  ShieldCheck, 
  TrendingUp, 
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { TripPlan, TripHealthScore, HealthScoreImprovement, HealthMetric } from '../types';
import { calculateTripHealthScore } from '../data/featureData';
import confetti from 'canvas-confetti';

interface TripHealthScoreCardProps {
  trip: TripPlan;
  onApplyImprovement: (improvement: HealthScoreImprovement) => void;
  onTriggerOptimization?: () => void;
}

export const TripHealthScoreCard: React.FC<TripHealthScoreCardProps> = ({
  trip,
  onApplyImprovement,
  onTriggerOptimization,
}) => {
  const [healthData, setHealthData] = useState<TripHealthScore>(() => calculateTripHealthScore(trip));
  const [showImproveModal, setShowImproveModal] = useState(false);

  // Dynamically recompute whenever itinerary, budget, or activities change
  React.useEffect(() => {
    setHealthData(calculateTripHealthScore(trip));
  }, [trip]);

  const handleApply = (imp: HealthScoreImprovement) => {
    onApplyImprovement(imp);
    setHealthData(prev => ({
      ...prev,
      improvements: prev.improvements.map(i => i.id === imp.id ? { ...i, applied: true } : i)
    }));

    try {
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  const getMetricColor = (score: number) => {
    if (score >= 90) return 'bg-[#344E27] text-emerald-800';
    if (score >= 80) return 'bg-emerald-600 text-emerald-700';
    return 'bg-amber-500 text-amber-700';
  };

  return (
    <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#344E27] text-white flex items-center justify-center shadow-xs">
              <Activity className="w-4 h-4 text-[#E5ECE0]" />
            </div>
            <h3 className="font-display font-extrabold text-xl text-[#191919]">
              AI Trip Health Score
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold">
              Itinerary Diagnostics
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Comprehensive algorithmic analysis of pacing, budget allocation, transit efficiency, and rest time.
          </p>
        </div>

        <button
          onClick={() => {
            if (onTriggerOptimization) {
              onTriggerOptimization();
            } else {
              setShowImproveModal(true);
            }
          }}
          className="px-5 py-2.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E5ECE0]" />
          <span>Improve Trip with AI</span>
        </button>
      </div>

      {/* Main Score Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left: 100-Point Dial Card */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-neutral-900 text-white flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#344E27]/30 to-transparent pointer-events-none" />
          
          <span className="text-[11px] uppercase font-bold tracking-wider text-[#E5ECE0]">
            Overall Health Rating
          </span>

          <div className="relative flex items-center justify-center">
            {/* Circular Gauge */}
            <div className="w-28 h-28 rounded-full border-4 border-white/10 flex items-center justify-center relative">
              <div className="text-center">
                <span className="font-display font-black text-4xl text-white block">
                  {healthData.overallScore}
                </span>
                <span className="text-[10px] text-neutral-400 font-bold uppercase">/ 100</span>
              </div>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-[#344E27] text-emerald-200 text-xs font-extrabold border border-emerald-500/30">
            {healthData.ratingLabel}
          </span>

          <p className="text-[11px] text-neutral-300 leading-relaxed max-w-xs">
            {healthData.summary}
          </p>
        </div>

        {/* Right: 6 Category Breakdown Bars */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {(Object.values(healthData.metrics) as HealthMetric[]).map((metric, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#191919]">{metric.name}</span>
                <span className="text-[#344E27]">{metric.score}/100</span>
              </div>

              <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getMetricColor(metric.score)}`}
                  style={{ width: `${metric.score}%` }}
                />
              </div>

              <p className="text-[11px] text-neutral-500 leading-snug">
                {metric.insight}
              </p>
            </div>
          ))}
        </div>

      </div>

      {/* MODAL: Improve My Trip with AI */}
      {showImproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-[28px] p-6 shadow-2xl border border-neutral-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#344E27] text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4 text-[#E5ECE0]" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-[#191919]">
                    AI Trip Health Recommendations
                  </h4>
                  <p className="text-xs text-neutral-500">Apply individual optimizations to boost overall trip health score.</p>
                </div>
              </div>
              <button onClick={() => setShowImproveModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {healthData.improvements.map(imp => (
                <div
                  key={imp.id}
                  className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-start justify-between gap-3 hover:border-neutral-300 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#191919]">{imp.title}</span>
                      <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {imp.impact}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {imp.description}
                    </p>
                  </div>

                  {imp.applied ? (
                    <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" /> Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApply(imp)}
                      className="px-4 py-1.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold shrink-0 transition-all cursor-pointer"
                    >
                      Accept
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowImproveModal(false)}
                className="px-5 py-2 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
