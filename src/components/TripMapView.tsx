import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Compass,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Train,
  Bike,
  Info,
  Sliders,
  Share2,
  Leaf
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configure Leaflet's default marker icons for bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
import { TripPlan, DayRoute, RouteWaypoint, RouteSegment, Currency } from '../types';
import { 
  buildDayWaypoints, 
  buildRouteSegments, 
  optimizeWaypointSequence, 
  TRANSIT_MODES, 
  TransitMode, 
  OptimizedRouteResult,
  calculateHaversineDistance,
  resolveCityProfile,
  generateCurvedRoute
} from '../data/geoRouting';
import { formatCurrency } from '../data/mockData';
import confetti from 'canvas-confetti';

interface TripMapViewProps {
  trip: TripPlan;
  activeDay: number;
  onSelectDay: (day: number) => void;
  onApplyOptimizedRoute?: (dayNumber: number, optimizedOrder: string[]) => void;
  currency?: Currency;
}

export const TripMapView: React.FC<TripMapViewProps> = ({
  trip,
  activeDay,
  onSelectDay,
  onApplyOptimizedRoute,
  currency: currencyProp = 'INR'
}) => {
  const currency: Currency = (currencyProp as Currency) || 'INR';
  // Transit & Map Style States
  const [transitMode, setTransitMode] = useState<TransitMode>('cab');
  const [mapLayer, setMapLayer] = useState<'vector' | 'streets' | 'terrain' | 'satellite'>('vector');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(null);

  // Optimization States
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizedRouteResult | null>(null);

  // Simulation States
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 4>(1);
  const [simProgress, setSimProgress] = useState(0); // 0 to 1
  const [activeSimLeg, setActiveSimLeg] = useState(0);
  const [simVehicleCoords, setSimVehicleCoords] = useState<[number, number] | null>(null);
  const [simArrivedMessage, setSimArrivedMessage] = useState<string | null>(null);

  // Waypoints state
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>(() => 
    buildDayWaypoints(trip, activeDay)
  );
  const [originalWaypoints, setOriginalWaypoints] = useState<RouteWaypoint[]>(() => 
    buildDayWaypoints(trip, activeDay)
  );

  // Recalculate whenever day or trip changes
  useEffect(() => {
    const freshWaypoints = buildDayWaypoints(trip, activeDay);
    setWaypoints(freshWaypoints);
    setOriginalWaypoints(freshWaypoints);
    setSelectedWaypointId(null);
    setIsOptimized(false);
    setOptimizationResult(null);
    setIsSimulating(false);
    setSimProgress(0);
    setActiveSimLeg(0);
    setSimVehicleCoords(null);
  }, [activeDay, trip.id, trip.destination]);

  // Calculated route segments based on current waypoints and transit mode
  const segments = useMemo(() => {
    return buildRouteSegments(waypoints, trip.destination, transitMode);
  }, [waypoints, trip.destination, transitMode]);

  // Aggregate stats
  const totalDistanceKm = useMemo(() => {
    const sum = segments.reduce((acc, s) => acc + s.distanceKm, 0);
    return Math.round(sum * 10) / 10;
  }, [segments]);

  const totalTransitMinutes = useMemo(() => {
    return segments.reduce((acc, s) => acc + s.durationMinutes, 0);
  }, [segments]);

  const totalTransitCost = useMemo(() => {
    const costInINR = Math.round(totalDistanceKm * TRANSIT_MODES[transitMode].costPerKmINR);
    return formatCurrency(costInINR, currency);
  }, [totalDistanceKm, transitMode, currency]);

  const carbonSavedKg = useMemo(() => {
    const cabEmissions = totalDistanceKm * TRANSIT_MODES.cab.co2GramsPerKm;
    const currentEmissions = totalDistanceKm * TRANSIT_MODES[transitMode].co2GramsPerKm;
    const saved = Math.max(0, (cabEmissions - currentEmissions) / 1000);
    return Math.round(saved * 10) / 10;
  }, [totalDistanceKm, transitMode]);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polylineGlowRef = useRef<L.Polyline | null>(null);
  const polylineFlowRef = useRef<L.Polyline | null>(null);
  const curvedLegsRef = useRef<[number, number][][]>([]);
  const markersRef = useRef<L.Marker[]>([]);
  const simMarkerRef = useRef<L.Marker | null>(null);
  const simAnimationRef = useRef<number | null>(null);

  // Helper to re-center on the current route bounds
  const handleFitBounds = () => {
    if (!leafletMapRef.current || waypoints.length === 0) return;
    const latLngs = waypoints.map(wp => wp.coords);
    const bounds = L.latLngBounds(latLngs);
    leafletMapRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 15, animate: true });
  };

  // Initialize or Update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not yet created
    if (!leafletMapRef.current) {
      const initialCenter = waypoints[0]?.coords || [35.0116, 135.7681];
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 13,
        minZoom: 3, // Prevents zooming out to multiple repeated world map copies
        maxBounds: [
          [-85, -180],
          [85, 180]
        ],
        maxBoundsViscosity: 1.0, // Hard stop at world edges
        worldCopyJump: false,
        zoomControl: false,
        attributionControl: false
      });
      leafletMapRef.current = map;

      // Add zoom control in bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    const map = leafletMapRef.current;

    // 1. Update Tile Layer based on mapLayer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }

    const commonTileOpts: L.TileLayerOptions = {
      minZoom: 3,
      noWrap: true, // Prevents horizontal repetition of world maps
      bounds: [[-85, -180], [85, 180]]
    };

    if (mapLayer === 'vector') {
      // High-performance crisp dark vector canvas by Esri (no API key required, zero watermark)
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          ...commonTileOpts,
          maxZoom: 16,
          attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap'
        }
      ).addTo(map);

      // Add reference layer for street names, cities, and landmarks
      labelLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          ...commonTileOpts,
          maxZoom: 16,
          opacity: 0.95
        }
      ).addTo(map);
    } else if (mapLayer === 'streets') {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          ...commonTileOpts,
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
      ).addTo(map);
    } else if (mapLayer === 'terrain') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        {
          ...commonTileOpts,
          maxZoom: 18,
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, USGS, NPS'
        }
      ).addTo(map);
    } else if (mapLayer === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          ...commonTileOpts,
          maxZoom: 18,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping'
        }
      ).addTo(map);
    }

    // 2. Clear previous markers and polylines
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (polylineRef.current) map.removeLayer(polylineRef.current);
    if (polylineGlowRef.current) map.removeLayer(polylineGlowRef.current);
    if (polylineFlowRef.current) map.removeLayer(polylineFlowRef.current);

    // 3. Draw Aesthetic Curved Route Polyline (Organic Bézier Arcs)
    const { allCurvedCoords, legCurves } = generateCurvedRoute(waypoints);
    curvedLegsRef.current = legCurves;

    // Layer 1: Soft Ambient Neon Glow
    polylineGlowRef.current = L.polyline(allCurvedCoords, {
      color: '#22C55E',
      weight: 12,
      opacity: 0.28,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'aesthetic-ambient-glow'
    }).addTo(map);

    // Layer 2: Core Vibrant Lime Accent Line
    polylineRef.current = L.polyline(allCurvedCoords, {
      color: '#A3E635',
      weight: 4.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Layer 3: Flowing Animated Energy Pulse Line
    polylineFlowRef.current = L.polyline(allCurvedCoords, {
      color: '#FFFFFF',
      weight: 2,
      opacity: 0.85,
      dashArray: '8, 14',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'aesthetic-travel-path'
    }).addTo(map);

    // 4. Create custom numbered markers
    const newMarkers: L.Marker[] = [];
    waypoints.forEach((wp, idx) => {
      const isStartHotel = idx === 0;
      const isEndHotel = idx === waypoints.length - 1;
      const isHotel = isStartHotel || isEndHotel;
      const isSelected = selectedWaypointId === wp.id;

      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'}">
          ${isSelected ? '<div class="absolute -inset-2 rounded-full bg-lime-400/40 animate-ping"></div>' : ''}
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shadow-lg border-2 ${
            isHotel 
              ? 'bg-[#344E27] text-amber-200 border-amber-300' 
              : 'bg-[#191919] text-[#A3E635] border-[#A3E635]'
          }">
            ${isStartHotel ? '★' : isEndHotel ? '⚑' : wp.stopNumber}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker-div',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(wp.coords, { icon: customIcon }).addTo(map);

      // Popup
      const popupHtml = `
        <div class="p-3 text-white max-w-[220px]">
          <div class="flex items-center justify-between text-[10px] text-lime-300 font-bold mb-1">
            <span>STOP #${wp.stopNumber}</span>
            <span>${wp.time}</span>
          </div>
          <h4 class="font-bold text-xs text-white leading-tight mb-1">${wp.title}</h4>
          <p class="text-[11px] text-neutral-300 mb-2 truncate">${wp.location}</p>
          <div class="flex items-center justify-between text-[10px] border-t border-white/10 pt-1.5">
            <span class="text-neutral-400 capitalize">${wp.category}</span>
            <span class="text-lime-400 font-semibold">${wp.cost > 0 ? formatCurrency(wp.cost, currency) : 'Included'}</span>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml, { offset: [0, -10] });

      marker.on('click', () => {
        setSelectedWaypointId(wp.id);
      });

      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;

    // 5. Fit bounds with padding
    if (allCurvedCoords.length > 0) {
      const bounds = L.latLngBounds(allCurvedCoords);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    }

    // Invalidate size in case of layout changes
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

  }, [waypoints, mapLayer, isOptimized, selectedWaypointId, currency]);

  // Clean up leaflet map on unmount
  useEffect(() => {
    const handleResize = () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (simAnimationRef.current) {
        cancelAnimationFrame(simAnimationRef.current);
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      tileLayerRef.current = null;
      labelLayerRef.current = null;
      polylineRef.current = null;
      polylineGlowRef.current = null;
      polylineFlowRef.current = null;
      curvedLegsRef.current = [];
      markersRef.current = [];
      simMarkerRef.current = null;
    };
  }, []);

  // Center on selected waypoint when chosen
  useEffect(() => {
    if (selectedWaypointId && leafletMapRef.current) {
      const wp = waypoints.find(w => w.id === selectedWaypointId);
      if (wp) {
        leafletMapRef.current.panTo(wp.coords, { animate: true, duration: 0.8 });
        const markerIdx = waypoints.findIndex(w => w.id === selectedWaypointId);
        if (markerIdx !== -1 && markersRef.current[markerIdx]) {
          markersRef.current[markerIdx].openPopup();
        }
      }
    }
  }, [selectedWaypointId, waypoints]);

  // Interactive Route Optimization Handler
  const handleOptimizeRoute = () => {
    setIsOptimizing(true);
    setIsSimulating(false);

    setTimeout(() => {
      const result = optimizeWaypointSequence(originalWaypoints, trip.destination, transitMode, currency);
      setOptimizationResult(result);
      setWaypoints(result.optimizedWaypoints);
      setIsOptimized(true);
      setIsOptimizing(false);

      // Re-order itinerary activities in parent if callback provided
      if (onApplyOptimizedRoute) {
        const intermediateIds = result.optimizedWaypoints
          .slice(1, -1)
          .map(w => w.id);
        onApplyOptimizedRoute(activeDay, intermediateIds);
      }

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 }
        });
      } catch (e) {}
    }, 900);
  };

  // Revert back to unoptimized sequence
  const handleRevertOptimization = () => {
    setWaypoints(originalWaypoints);
    setIsOptimized(false);
    setOptimizationResult(null);
    setIsSimulating(false);
  };

  // Live Vehicle Simulation Engine
  const startSimulation = () => {
    if (waypoints.length < 2) return;
    setIsSimulating(true);
    setSimProgress(0);
    setActiveSimLeg(0);
    setSimArrivedMessage(null);

    const map = leafletMapRef.current;
    if (!map) return;

    // Create or reset simulation vehicle marker
    if (simMarkerRef.current) {
      map.removeLayer(simMarkerRef.current);
    }

    const startPos = waypoints[0].coords;
    const modeConfig = TRANSIT_MODES[transitMode];
    const vehicleIconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute -inset-3 rounded-full bg-lime-400/40 animate-ping"></div>
        <div class="w-9 h-9 rounded-2xl bg-lime-400 text-neutral-950 flex items-center justify-center shadow-2xl border-2 border-white font-extrabold text-sm transform -rotate-12 transition-transform">
          ${transitMode === 'walking' ? '🚶' : transitMode === 'bike' ? '🚲' : transitMode === 'metro' ? '🚇' : '🚗'}
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'sim-vehicle-icon',
      html: vehicleIconHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const simMarker = L.marker(startPos, { icon, zIndexOffset: 1000 }).addTo(map);
    simMarkerRef.current = simMarker;

    // Simulation timing loop
    let currentLeg = 0;
    let legFraction = 0;
    const baseSpeed = 0.0035; // speed multiplier

    const animateStep = () => {
      if (currentLeg >= waypoints.length - 1) {
        // Simulation finished
        setIsSimulating(false);
        setSimProgress(1);
        setSimArrivedMessage(`🎉 Day 0${activeDay} Journey Simulation Complete! All ${waypoints.length} stops covered smoothly.`);
        try {
          confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
        } catch (e) {}
        return;
      }

      legFraction += baseSpeed * simSpeed;

      if (legFraction >= 1) {
        legFraction = 0;
        currentLeg++;
        setActiveSimLeg(currentLeg);

        if (currentLeg < waypoints.length) {
          const reachedWp = waypoints[currentLeg];
          setSimArrivedMessage(`📍 Arrived at: ${reachedWp.title}`);
        }
      }

      if (currentLeg < waypoints.length - 1) {
        const legPoints = curvedLegsRef.current[currentLeg] || [
          waypoints[currentLeg].coords,
          waypoints[currentLeg + 1].coords
        ];

        // Smooth sub-fraction interpolation along the aesthetic curved arc
        const totalPoints = legPoints.length;
        const exactIdx = legFraction * (totalPoints - 1);
        const lowIdx = Math.floor(exactIdx);
        const highIdx = Math.min(totalPoints - 1, lowIdx + 1);
        const subFrac = exactIdx - lowIdx;

        const pA = legPoints[lowIdx];
        const pB = legPoints[highIdx];
        const currentLat = pA[0] + (pB[0] - pA[0]) * subFrac;
        const currentLng = pA[1] + (pB[1] - pA[1]) * subFrac;
        const curCoords: [number, number] = [currentLat, currentLng];

        simMarker.setLatLng(curCoords);
        setSimVehicleCoords(curCoords);

        // Overall progress
        const overallFraction = (currentLeg + legFraction) / (waypoints.length - 1);
        setSimProgress(Math.min(1, Math.round(overallFraction * 100) / 100));
      }

      simAnimationRef.current = requestAnimationFrame(animateStep);
    };

    simAnimationRef.current = requestAnimationFrame(animateStep);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simAnimationRef.current) {
      cancelAnimationFrame(simAnimationRef.current);
    }
  };

  // Google Maps Universal Link Generator
  const generateGoogleMapsUrl = () => {
    if (waypoints.length < 2) return '#';
    const origin = encodeURIComponent(`${waypoints[0].title}, ${trip.destination}`);
    const destination = encodeURIComponent(`${waypoints[waypoints.length - 1].title}, ${trip.destination}`);
    const intermediate = waypoints.slice(1, -1).map(w => encodeURIComponent(`${w.title}, ${trip.destination}`)).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${intermediate}&travelmode=${transitMode === 'walking' ? 'walking' : transitMode === 'bike' ? 'bicycling' : transitMode === 'metro' ? 'transit' : 'driving'}`;
  };

  const selectedWaypoint = waypoints.find(w => w.id === selectedWaypointId);
  const cityProfile = resolveCityProfile(trip.destination);

  return (
    <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
      
      {/* Header with Title, Day Picker, and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#344E27] text-white flex items-center justify-center shadow-xs">
              <Route className="w-4 h-4 text-[#E5ECE0]" />
            </div>
            <h3 className="font-display font-extrabold text-xl text-[#191919]">
              Interactive Trip Map & Route Optimizer
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold flex items-center gap-1">
              <Compass className="w-3 h-3 text-[#344E27]" />
              GPS Vector Map
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Visualized daily journey with estimated transit times, leg distances, and intelligent route sequencing for {trip.destination}.
          </p>
        </div>

        {/* Day Selector & Route Optimizer Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-full text-xs font-bold">
            {trip.itinerary.map(day => (
              <button
                key={day.dayNumber}
                onClick={() => onSelectDay(day.dayNumber)}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
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
            onClick={isOptimized ? handleRevertOptimization : handleOptimizeRoute}
            disabled={isOptimizing}
            className={`px-4 py-2 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              isOptimized
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                : 'bg-[#344E27] hover:bg-[#273D1C] text-white active:scale-95'
            }`}
          >
            {isOptimizing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sequencing Waypoints...</span>
              </>
            ) : isOptimized ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Optimized (Click to Revert)</span>
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
        <div className="p-3.5 bg-[#F9FBF8] rounded-2xl border border-[#E5ECE0] transition-all hover:border-[#344E27]/30">
          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Route Distance</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-extrabold text-[#191919]">
              {totalDistanceKm} km
            </span>
            {isOptimized && optimizationResult && (
              <span className="text-[10px] font-bold text-emerald-600">
                (-{optimizationResult.distanceSavedKm} km)
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-[#F9FBF8] rounded-2xl border border-[#E5ECE0] transition-all hover:border-[#344E27]/30">
          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Estimated Transit Time</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-extrabold text-[#191919]">
              ~{totalTransitMinutes} mins
            </span>
            {isOptimized && optimizationResult && (
              <span className="text-[10px] font-bold text-emerald-600">
                (-{optimizationResult.minutesSaved} mins)
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-[#F9FBF8] rounded-2xl border border-[#E5ECE0] transition-all hover:border-[#344E27]/30">
          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Scheduled Stops</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-extrabold text-[#344E27]">
              {waypoints.length} Locations
            </span>
            <span className="text-[10px] text-neutral-400 font-semibold">1 Start • 1 Return</span>
          </div>
        </div>

        {/* Transit Strategy with Interactive Selector */}
        <div className="relative p-3.5 bg-[#F9FBF8] rounded-2xl border border-[#E5ECE0] transition-all hover:border-[#344E27]/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-neutral-500 block">Transit Strategy</span>
            <button 
              onClick={() => setShowModeSelector(!showModeSelector)}
              className="text-[10px] text-[#344E27] font-bold underline hover:text-[#273D1C] cursor-pointer"
            >
              Switch Mode
            </button>
          </div>
          
          <button
            onClick={() => setShowModeSelector(!showModeSelector)}
            className="w-full text-left mt-0.5 flex items-center justify-between cursor-pointer group"
          >
            <span className="text-xs font-extrabold text-neutral-800 flex items-center gap-1.5 truncate">
              {transitMode === 'cab' && <Car className="w-3.5 h-3.5 text-[#344E27]" />}
              {transitMode === 'metro' && <Train className="w-3.5 h-3.5 text-sky-600" />}
              {transitMode === 'walking' && <Footprints className="w-3.5 h-3.5 text-emerald-600" />}
              {transitMode === 'bike' && <Bike className="w-3.5 h-3.5 text-amber-600" />}
              <span>{TRANSIT_MODES[transitMode].name}</span>
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400 group-hover:text-neutral-700" />
          </button>

          {/* Mode Selector Dropdown */}
          {showModeSelector && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-neutral-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider px-2 py-1 block">
                Select Transit Strategy
              </span>
              {(Object.keys(TRANSIT_MODES) as TransitMode[]).map((modeKey) => {
                const config = TRANSIT_MODES[modeKey];
                const isSelected = transitMode === modeKey;
                return (
                  <button
                    key={modeKey}
                    onClick={() => {
                      setTransitMode(modeKey);
                      setShowModeSelector(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer ${
                      isSelected ? 'bg-[#E5ECE0] text-[#344E27]' : 'hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div className="mt-0.5">
                      {modeKey === 'cab' && <Car className="w-4 h-4 text-[#344E27]" />}
                      {modeKey === 'metro' && <Train className="w-4 h-4 text-sky-600" />}
                      {modeKey === 'walking' && <Footprints className="w-4 h-4 text-emerald-600" />}
                      {modeKey === 'bike' && <Bike className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{config.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-[#344E27]" />}
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-tight mt-0.5">{config.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Optimized Route Notice & Comparison Banner */}
      {isOptimized && optimizationResult && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-[#F9FBF8] rounded-2xl border border-emerald-200 text-xs text-emerald-950 font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-emerald-900 block">{optimizationResult.savingsNarrative}</span>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">
                Stops re-sequenced geographically to eliminate zigzag travel. Itinerary on dashboard updated.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-extrabold">
              Saved ~{optimizationResult.minutesSaved} Mins
            </span>
            <button
              onClick={handleRevertOptimization}
              className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 underline cursor-pointer"
            >
              Reset Sequence
            </button>
          </div>
        </div>
      )}

      {/* Main Map & Stops Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Vector & Satellite Interactive Map Canvas */}
        <div className="lg:col-span-7 bg-[#1A2619] rounded-[28px] p-5 text-white relative min-h-[460px] flex flex-col justify-between overflow-hidden shadow-inner border border-[#2D3E2B]">
          
          {/* Top Floating Bar inside Map Canvas */}
          <div className="relative z-30 flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs shadow-md">
                <Navigation className="w-3.5 h-3.5 text-lime-400" />
                <span className="font-bold truncate max-w-[140px] sm:max-w-none">
                  {trip.destination} • Day 0{activeDay} Route
                </span>
              </div>
              <button
                onClick={handleFitBounds}
                title="Fit Route to View"
                className="flex items-center gap-1.5 bg-black/60 hover:bg-black/90 active:scale-95 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/15 text-[11px] font-bold text-lime-400 hover:text-lime-300 transition-all cursor-pointer shadow-md"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Fit Route</span>
              </button>
            </div>

            {/* Map Layer Switcher: Vector | Streets | Terrain | Satellite */}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/15 text-[10px] shadow-md">
              <button 
                onClick={() => setMapLayer('vector')}
                className={`px-2.5 py-1 rounded-full font-bold cursor-pointer transition-all ${
                  mapLayer === 'vector' ? 'bg-lime-400 text-neutral-950 font-extrabold shadow-sm' : 'text-neutral-300 hover:text-white'
                }`}
                title="Sleek Dark Vector Canvas"
              >
                Vector
              </button>
              <button 
                onClick={() => setMapLayer('streets')}
                className={`px-2.5 py-1 rounded-full font-bold cursor-pointer transition-all ${
                  mapLayer === 'streets' ? 'bg-lime-400 text-neutral-950 font-extrabold shadow-sm' : 'text-neutral-300 hover:text-white'
                }`}
                title="OpenStreetMap Streets"
              >
                Streets
              </button>
              <button 
                onClick={() => setMapLayer('terrain')}
                className={`px-2.5 py-1 rounded-full font-bold cursor-pointer transition-all ${
                  mapLayer === 'terrain' ? 'bg-lime-400 text-neutral-950 font-extrabold shadow-sm' : 'text-neutral-300 hover:text-white'
                }`}
                title="Topographical Terrain"
              >
                Terrain
              </button>
              <button 
                onClick={() => setMapLayer('satellite')}
                className={`px-2.5 py-1 rounded-full font-bold cursor-pointer transition-all ${
                  mapLayer === 'satellite' ? 'bg-lime-400 text-neutral-950 font-extrabold shadow-sm' : 'text-neutral-300 hover:text-white'
                }`}
                title="Satellite World Imagery"
              >
                Satellite
              </button>
            </div>
          </div>

          {/* Leaflet Real Interactive Map Viewport */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-[320px] rounded-2xl overflow-hidden relative shadow-inner border border-white/10 z-10"
          />

          {/* Live Simulation Floating HUD (When Active) */}
          {isSimulating && (
            <div className="absolute top-16 left-6 right-6 z-40 bg-black/85 backdrop-blur-md rounded-2xl border border-lime-400/40 p-3 shadow-2xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" />
                  <span className="font-extrabold text-white">Live Route Simulation</span>
                  <span className="text-[10px] text-lime-300 bg-lime-400/20 px-2 py-0.5 rounded-full font-bold">
                    Leg {activeSimLeg + 1} of {segments.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSimSpeed(simSpeed === 1 ? 2 : simSpeed === 2 ? 4 : 1)}
                    className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold text-neutral-200 cursor-pointer"
                  >
                    {simSpeed}x Speed
                  </button>
                  <button
                    onClick={stopSimulation}
                    className="px-2.5 py-0.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-[10px] font-bold text-red-300 cursor-pointer"
                  >
                    Stop
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div 
                  className="bg-lime-400 h-full transition-all duration-300"
                  style={{ width: `${Math.round(simProgress * 100)}%` }}
                />
              </div>

              {simArrivedMessage && (
                <p className="text-[11px] text-lime-300 font-semibold mt-1.5 truncate animate-in fade-in">
                  {simArrivedMessage}
                </p>
              )}
            </div>
          )}

          {/* Interactive Stop Pins Chips Carousel Under Map */}
          <div className="relative z-30 mt-3 flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {waypoints.map((wp, idx) => {
              const isSelected = selectedWaypointId === wp.id;
              const isHotel = idx === 0 || idx === waypoints.length - 1;
              return (
                <div
                  key={wp.id}
                  onClick={() => setSelectedWaypointId(wp.id)}
                  className={`px-3 py-2 rounded-xl cursor-pointer transition-all shrink-0 flex items-center gap-2 backdrop-blur-md border ${
                    isSelected
                      ? 'bg-white text-neutral-900 border-lime-400 scale-105 shadow-lg'
                      : 'bg-black/50 text-white hover:bg-black/70 border-white/15'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                    isSelected ? 'bg-[#344E27] text-white' : isHotel ? 'bg-amber-400 text-neutral-950' : 'bg-lime-400 text-neutral-950'
                  }`}>
                    {idx === 0 ? '★' : idx === waypoints.length - 1 ? '⚑' : wp.stopNumber}
                  </span>
                  <div className="text-left">
                    <span className="text-[11px] font-bold block max-w-[110px] truncate leading-tight">
                      {wp.title}
                    </span>
                    <span className={`text-[9px] block ${isSelected ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      {wp.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Map Footer Bar with Live Simulation Trigger & Inspection Tip */}
          <div className="relative z-30 flex items-center justify-between text-[11px] text-neutral-300 bg-black/50 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10 mt-3">
            <span className="flex items-center gap-1.5 truncate">
              <Compass className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              <span className="truncate">
                {selectedWaypoint 
                  ? `Inspecting: Stop #${selectedWaypoint.stopNumber} • ${selectedWaypoint.title}`
                  : 'Click any stop or transit leg to inspect real-time navigation.'}
              </span>
            </span>

            {/* Live Simulation Button (Actually clickable!) */}
            <button
              id="live-simulation-btn"
              onClick={isSimulating ? stopSimulation : startSimulation}
              className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0 ${
                isSimulating 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-lime-400 hover:bg-lime-300 text-neutral-950 active:scale-95'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3 h-3" />
                  <span>Pause Simulation</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Live Simulation</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right: Turn-by-Turn Leg Sequence */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
                Turn-by-Turn Daily Journey
              </h4>
              <span className="text-[11px] font-bold text-neutral-400">
                ({segments.length} Transit Legs)
              </span>
            </div>

            {/* Direct Google Maps Navigation Link */}
            <a
              href={generateGoogleMapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-[#344E27] hover:text-[#273D1C] flex items-center gap-1 hover:underline"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Turn-by-Turn Segments List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {segments.map((seg, idx) => {
              const isExpanded = expandedLegIndex === idx;
              const isSimActive = isSimulating && activeSimLeg === idx;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setExpandedLegIndex(isExpanded ? null : idx);
                    // Center map on this leg's starting waypoint
                    const fromWp = waypoints.find(w => w.id === seg.fromId);
                    if (fromWp && leafletMapRef.current) {
                      leafletMapRef.current.panTo(fromWp.coords, { animate: true });
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2 cursor-pointer ${
                    isSimActive
                      ? 'bg-lime-50 border-lime-400 ring-2 ring-lime-400/50 shadow-md'
                      : isExpanded
                      ? 'bg-white border-[#344E27] shadow-sm'
                      : 'bg-neutral-50 hover:bg-neutral-100/70 border-neutral-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${
                        isSimActive ? 'bg-lime-400 text-neutral-950 animate-bounce' : 'bg-[#E5ECE0] text-[#344E27]'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#191919] flex items-center gap-1.5">
                          <span className="truncate max-w-[110px] sm:max-w-[140px]">{seg.fromName}</span>
                          <ArrowRight className="w-3 h-3 text-neutral-400 shrink-0" />
                          <span className="truncate max-w-[110px] sm:max-w-[140px]">{seg.toName}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-neutral-400 font-semibold shrink-0">
                      Leg 0{idx + 1}
                    </span>
                  </div>

                  {/* Distance, Duration & AI Navigation Tip */}
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-200/60">
                    <span className="font-semibold text-neutral-700 flex items-center gap-1">
                      {transitMode === 'cab' && <Car className="w-3 h-3 text-[#344E27]" />}
                      {transitMode === 'metro' && <Train className="w-3 h-3 text-sky-600" />}
                      {transitMode === 'walking' && <Footprints className="w-3 h-3 text-emerald-600" />}
                      {transitMode === 'bike' && <Bike className="w-3 h-3 text-amber-600" />}
                      {seg.distanceKm} km • ~{seg.durationMinutes} mins
                    </span>
                    <span className="text-neutral-500 italic truncate max-w-[190px] sm:max-w-[220px]" title={seg.aiTip}>
                      {seg.aiTip}
                    </span>
                  </div>

                  {/* Expandable Step Details */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-neutral-200/80 text-[11px] text-neutral-600 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase">
                        <span>Route Directions</span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(seg.fromName + ', ' + trip.destination)}&destination=${encodeURIComponent(seg.toName + ', ' + trip.destination)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#344E27] hover:underline flex items-center gap-0.5"
                        >
                          Navigate Leg <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <p className="text-neutral-700">
                        Depart <strong className="text-neutral-900">{seg.fromName}</strong> heading towards destination along primary arterial route.
                      </p>
                      <div className="bg-neutral-100/80 p-2 rounded-xl text-[10px] text-neutral-600 flex items-center gap-1.5">
                        <Info className="w-3 h-3 text-[#344E27] shrink-0" />
                        <span>Estimated traffic: Low to moderate. Typical wait time ~{TRANSIT_MODES[transitMode].fixedWaitMinutes} mins.</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Eco / Cost Savings Summary Bar */}
          <div className="p-3 bg-[#F9FBF8] rounded-2xl border border-[#E5ECE0] flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-neutral-700">
              <Leaf className="w-4 h-4 text-emerald-600" />
              <span>Transit Budget & Carbon</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-[10px] font-extrabold">
                Est. {totalTransitCost}
              </span>
              {carbonSavedKg > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  -{carbonSavedKg} kg CO₂
                </span>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
