import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Route, 
  Clock, 
  Zap, 
  Car, 
  Footprints, 
  Check, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  RotateCw,
  Compass
} from 'lucide-react';
import { TripPlan, DayRoute, Currency } from '../types';
import { generateDayRoute } from '../data/featureData';
import { formatCurrency } from '../data/mockData';
import confetti from 'canvas-confetti';

interface TripMapViewProps {
  trip: TripPlan;
  activeDay: number;
  onSelectDay: (day: number) => void;
  currency: Currency;
}

export const TripMapView: React.FC<TripMapViewProps> = ({
  trip,
  activeDay,
  onSelectDay,
  currency,
}) => {
  const [routeData, setRouteData] = useState<DayRoute>(() => generateDayRoute(trip, activeDay));
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'terrain' | 'satellite' | 'clean'>('clean');

  useEffect(() => {
    setRouteData(generateDayRoute(trip, activeDay));
    setSelectedWaypointId(null);
  }, [activeDay, trip]);

  const handleOptimizeRoute = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setRouteData(prev => ({
        ...prev,
        optimized: true,
        totalTravelTimeMinutes: Math.max(28, prev.totalTravelTimeMinutes - 24),
        totalDistanceKm: Math.max(12.5, Math.round((prev.totalDistanceKm * 0.78) * 10) / 10),
        transitSavings: 'AI optimized route order: Saved 24 mins transit time & ₹350 cab fare by eliminating coastal backtracking.'
      }));
      setIsOptimizing(false);

      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 }
        });
      } catch (e) {}
    }, 800);
  };

  return (
    <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
      
      {/* Header with Title, Day Picker, and Route Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#344E27] text-white flex items-center justify-center shadow-xs">
              <Route className="w-4 h-4 text-[#E5ECE0]" />
            </div>
            <h3 className="font-display font-extrabold text-xl text-[#191919]">
              Interactive Trip Map & Route Optimizer
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold">
              GPS Vector Map
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Visualized daily journey with estimated transit times, leg distances, and intelligent route sequencing.
          </p>
        </div>

        {/* Day Selector & Route Optimizer Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-full text-xs font-bold">
            {trip.itinerary.map(day => (
              <button
                key={day.dayNumber}
                onClick={() => onSelectDay(day.dayNumber)}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  activeDay === day.dayNumber
                    ? 'bg-[#344E27] text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>

          <button
            id="optimize-route-btn"
            onClick={handleOptimizeRoute}
            disabled={isOptimizing || routeData.optimized}
            className={`px-4 py-2 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              routeData.optimized
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-[#344E27] hover:bg-[#273D1C] text-white active:scale-95'
            }`}
          >
            {isOptimizing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Optimizing Route...</span>
              </>
            ) : routeData.optimized ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Route Optimized</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#E5ECE0]" />
                <span>Optimize My Route</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-[#F9FBF8] rounded-2xl border border-[#E5ECE0]">
          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Route Distance</span>
          <span className="text-base font-extrabold text-[#191919]">
            {routeData.totalDistanceKm} km
          </span>
        </div>

        <div className="p-3.5 bg-[#F9FBF8] rounded-2xl border border-[#E5ECE0]">
          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Estimated Transit Time</span>
          <span className="text-base font-extrabold text-[#191919]">
            ~{routeData.totalTravelTimeMinutes} mins
          </span>
        </div>

        <div className="p-3.5 bg-[#F9FBF8] rounded-2xl border border-[#E5ECE0]">
          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Scheduled Stops</span>
          <span className="text-base font-extrabold text-[#344E27]">
            {routeData.waypoints.length} Locations
          </span>
        </div>

        <div className="p-3.5 bg-[#F9FBF8] rounded-2xl border border-[#E5ECE0]">
          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Transit Strategy</span>
          <span className="text-xs font-extrabold text-neutral-800 flex items-center gap-1 mt-0.5">
            <Car className="w-3.5 h-3.5 text-[#344E27]" /> AC Cab / Chauffeur
          </span>
        </div>
      </div>

      {/* Optimized Route Notice */}
      {routeData.optimized && routeData.transitSavings && (
        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{routeData.transitSavings}</span>
        </div>
      )}

      {/* Main Map & Stops Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Vector Interactive Map Canvas */}
        <div className="lg:col-span-7 bg-[#1A2619] rounded-[28px] p-6 text-white relative min-h-[380px] flex flex-col justify-between overflow-hidden shadow-inner border border-[#2D3E2B]">
          
          {/* Subtle Topographical Background Grid Pattern */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Simulated Coastal Road Map Paths */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 350">
            {/* Coastline curve */}
            <path
              d="M 50,0 Q 90,120 70,220 T 110,350"
              fill="none"
              stroke="#2E4A2E"
              strokeWidth="18"
              strokeLinecap="round"
            />
            {/* Route path connecting waypoints */}
            <path
              d="M 120,90 Q 230,110 260,180 T 360,210 Q 320,280 180,290"
              fill="none"
              stroke="#A3E635"
              strokeWidth="4"
              strokeDasharray={routeData.optimized ? "none" : "6 4"}
              className="transition-all duration-700"
            />
            {/* Animated vehicle dot moving along route */}
            <circle cx="260" cy="180" r="5" fill="#FFFFFF" className="animate-ping" />
            <circle cx="260" cy="180" r="4" fill="#A3E635" />
          </svg>

          {/* Top Bar inside Map Canvas */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
              <Navigation className="w-3.5 h-3.5 text-lime-400" />
              <span className="font-bold">{trip.destination} • Day 0{activeDay} Route</span>
            </div>

            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10 text-[10px]">
              <button 
                onClick={() => setMapStyle('clean')}
                className={`px-2.5 py-0.5 rounded-full font-bold ${mapStyle === 'clean' ? 'bg-white/20 text-white' : 'text-neutral-400'}`}
              >
                Vector
              </button>
              <button 
                onClick={() => setMapStyle('terrain')}
                className={`px-2.5 py-0.5 rounded-full font-bold ${mapStyle === 'terrain' ? 'bg-white/20 text-white' : 'text-neutral-400'}`}
              >
                Terrain
              </button>
            </div>
          </div>

          {/* Interactive Stop Pins Over the Canvas */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 my-8">
            {routeData.waypoints.map((wp, i) => {
              const isSelected = selectedWaypointId === wp.id;
              return (
                <div
                  key={wp.id}
                  onClick={() => setSelectedWaypointId(wp.id)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all backdrop-blur-md border ${
                    isSelected
                      ? 'bg-white text-neutral-900 border-lime-400 scale-105 shadow-lg'
                      : 'bg-black/50 text-white hover:bg-black/70 border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                      isSelected ? 'bg-[#344E27] text-white' : 'bg-lime-400 text-neutral-900'
                    }`}>
                      {wp.stopNumber}
                    </span>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      {wp.time}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold truncate">{wp.title}</h5>
                  <p className={`text-[10px] truncate ${isSelected ? 'text-neutral-600' : 'text-neutral-400'}`}>
                    {wp.location}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Map Footer Tip */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-neutral-300 bg-black/40 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-lime-400" />
              <span>Click any stop above or below to inspect transit leg details.</span>
            </span>
            <span className="font-bold text-lime-300">Live Simulation</span>
          </div>

        </div>

        {/* Right: Turn-by-Turn Leg Sequence */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
              Turn-by-Turn Daily Journey
            </h4>
            <span className="text-[11px] text-neutral-500">
              {routeData.segments.length} Transit Legs
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {routeData.segments.map((seg, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-extrabold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#191919] flex items-center gap-1.5">
                        <span className="truncate max-w-[120px] sm:max-w-[150px]">{seg.fromName}</span>
                        <ArrowRight className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-[120px] sm:max-w-[150px]">{seg.toName}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-200/60">
                  <span className="font-semibold text-neutral-600 flex items-center gap-1">
                    <Car className="w-3 h-3 text-[#344E27]" />
                    {seg.distanceKm} km • ~{seg.durationMinutes} mins
                  </span>
                  <span className="text-neutral-500 italic">
                    {seg.aiTip}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
