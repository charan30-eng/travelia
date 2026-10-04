import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  MapPin, 
  Star, 
  ArrowRight, 
  Calendar, 
  Clock, 
  Filter,
  Check,
  Compass,
  Building2,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Globe,
  Info,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { FEATURED_DESTINATIONS, formatCurrency } from '../data/mockData';
import { Currency, TraveliaPlace, PlacesResponse } from '../types';
import { placesClient } from '../services/placesClient';
import { PlaceStatusBadge } from './PlaceStatusBadge';

interface DiscoverViewProps {
  onSelectDestination: (destName: string) => void;
  currency: Currency;
}

const CATEGORIES = [
  'All',
  'Beaches',
  'Mountains',
  'Historical',
  'Adventure',
  'Romantic',
  'Family',
  'Nature',
  'Food'
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  onSelectDestination,
  currency,
}) => {
  const [activeMode, setActiveMode] = useState<'destinations' | 'places'>('destinations');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real Places Explorer State
  const [selectedDestination, setSelectedDestination] = useState<string>('Goa, India');
  const [placesLoading, setPlacesLoading] = useState<boolean>(false);
  const [placesData, setPlacesData] = useState<PlacesResponse | null>(null);
  const [placesError, setPlacesError] = useState<string | null>(null);

  // Filtered featured destinations
  const filteredDestinations = FEATURED_DESTINATIONS.filter((d) => {
    const matchesCat = selectedCategory === 'All' || d.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Fetch real places whenever selectedDestination or activeMode changes
  useEffect(() => {
    if (activeMode === 'places' && selectedDestination) {
      loadRealPlaces(selectedDestination);
    }
  }, [activeMode, selectedDestination]);

  const loadRealPlaces = async (destName: string) => {
    setPlacesLoading(true);
    setPlacesError(null);
    try {
      const cleanDest = destName.split(',')[0].trim();
      const res = await placesClient.searchAttractions(cleanDest, 12);
      setPlacesData(res);
    } catch (err: any) {
      console.warn('Failed to load places:', err);
      setPlacesError(err?.message || 'Unable to connect to Places provider. Click below to retry.');
    } finally {
      setPlacesLoading(false);
    }
  };

  const handleExploreDestinationPlaces = (destName: string) => {
    setSelectedDestination(destName);
    setActiveMode('places');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Top Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real Places Data Layer • Google Places API (New)</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#191919] uppercase tracking-tight">
            Discover Dream Destinations
          </h1>
          <p className="text-neutral-500 text-sm sm:text-base mt-1">
            Browse verified live attractions, landmarks & accommodations backed by Google Places.
          </p>
        </div>

        {/* Search & Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Mode Switcher */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-full border border-neutral-200 self-start sm:self-auto">
            <button
              onClick={() => setActiveMode('destinations')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeMode === 'destinations'
                  ? 'bg-[#344E27] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Destinations
            </button>
            <button
              onClick={() => {
                setActiveMode('places');
                if (!placesData) loadRealPlaces(selectedDestination);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'places'
                  ? 'bg-[#344E27] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Verified Places</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeMode === 'destinations' ? "Search beaches, alps, shrines..." : "Filter places..."}
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white border border-neutral-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27] shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: FEATURED DESTINATIONS VIEW */}
      {/* ========================================================================= */}
      {activeMode === 'destinations' && (
        <div className="space-y-8">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#344E27] text-white shadow-sm'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Destination Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDestinations.map((dest) => (
              <div
                key={dest.id}
                className="bg-white rounded-[26px] overflow-hidden border border-[#E5E7EB] shadow-2xs hover:shadow-xl transition-all group flex flex-col justify-between"
              >
                {/* Image Banner */}
                <div className="relative h-52 overflow-hidden bg-neutral-100">
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-[#191919] border border-white/40">
                    {dest.category}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                    <span>{dest.rating}</span>
                    <span className="text-[10px] text-white/70">({dest.reviews})</span>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-neutral-400 font-medium mb-1">
                      <MapPin className="w-3.5 h-3.5 text-[#344E27]" />
                      <span>{dest.country}</span>
                    </div>
                    
                    <h3 className="font-display font-bold text-xl text-[#191919]">
                      {dest.name}
                    </h3>
                    
                    <p className="text-xs text-neutral-600 mt-1.5 line-clamp-2">
                      {dest.description}
                    </p>

                    {/* Highlights tags */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {dest.highlights.map((h, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-medium">
                          {h}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#344E27]" />
                        <span>Best: {dest.bestSeason}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>{dest.duration}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions: View Verified Places & Plan with AI */}
                  <div className="mt-5 pt-4 border-t border-neutral-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-bold block">Estimated Cost</span>
                        <span className="font-extrabold text-sm text-[#191919]">
                          {formatCurrency(dest.pricePerDay, currency)}
                          <span className="text-[10px] text-neutral-400 font-normal"> /day</span>
                        </span>
                      </div>

                      <button
                        onClick={() => onSelectDestination(`${dest.name}, ${dest.country}`)}
                        className="px-3.5 py-1.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Plan Trip</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleExploreDestinationPlaces(`${dest.name}, ${dest.country}`)}
                      className="w-full py-1.5 rounded-xl bg-neutral-50 hover:bg-[#E5ECE0] text-neutral-600 hover:text-[#344E27] text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 border border-neutral-200 cursor-pointer"
                    >
                      <Compass className="w-3 h-3" />
                      <span>Explore Verified Sights</span>
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: REAL PLACES EXPLORER VIEW (LIVE GOOGLE PLACES DATA LAYER) */}
      {/* ========================================================================= */}
      {activeMode === 'places' && (
        <div className="space-y-6">
          {/* Destination Selector Bar & Status Header */}
          <div className="bg-white p-5 rounded-[24px] border border-neutral-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E5ECE0] flex items-center justify-center text-[#344E27]">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Active Destination</span>
                  {/* Honest Data Source Status Badge */}
                  {placesData && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      placesData.dataStatus === 'live'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : placesData.dataStatus === 'cached'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        placesData.dataStatus === 'live' ? 'bg-emerald-500 animate-pulse' : placesData.dataStatus === 'cached' ? 'bg-blue-500' : 'bg-amber-500'
                      }`} />
                      {placesData.dataStatus === 'live' ? '● Live Google Places' : placesData.dataStatus === 'cached' ? '● Cached Google Data' : '◉ Curated Demo Data'}
                    </span>
                  )}
                </div>
                <h2 className="font-display font-extrabold text-xl text-[#191919]">
                  {selectedDestination}
                </h2>
              </div>
            </div>

            {/* Quick Destination Switcher Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#344E27]"
              >
                <option value="Goa, India">Goa, India</option>
                <option value="Paris, France">Paris, France</option>
                <option value="Kyoto, Japan">Kyoto, Japan</option>
                <option value="Bali, Indonesia">Bali, Indonesia</option>
                <option value="Amalfi Coast, Italy">Amalfi Coast, Italy</option>
                <option value="Swiss Alps, Switzerland">Swiss Alps, Switzerland</option>
                <option value="Kerala, India">Kerala, India</option>
                <option value="Rajasthan, India">Rajasthan, India</option>
              </select>

              <button
                onClick={() => onSelectDestination(selectedDestination)}
                className="px-4 py-2 rounded-xl bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Plan Trip Here</span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {placesLoading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-[24px] border border-neutral-200">
              <Loader2 className="w-8 h-8 text-[#344E27] animate-spin" />
              <p className="font-bold text-sm text-[#191919]">
                Finding real places in {selectedDestination}...
              </p>
              <p className="text-xs text-neutral-400">
                Calling Google Places API (New) & normalizing verified coordinates
              </p>
            </div>
          )}

          {/* Error State — Resilient UX */}
          {!placesLoading && placesError && (
            <div className="py-16 text-center bg-rose-50/70 rounded-[24px] border border-rose-200/80 p-8 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="font-bold text-sm text-neutral-800">Unable to load live places</p>
              <p className="text-xs text-neutral-600 max-w-md mx-auto">{placesError}</p>
              <button
                onClick={() => loadRealPlaces(selectedDestination)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Places Search</span>
              </button>
            </div>
          )}

          {/* Places Grid */}
          {!placesLoading && placesData && placesData.places.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {placesData.places
                .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.address || '').toLowerCase().includes(searchQuery.toLowerCase()))
                .map((place, idx) => (
                  <div
                    key={place.id || idx}
                    className="bg-white rounded-[24px] overflow-hidden border border-[#E5E7EB] shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between group"
                  >
                    {/* Visual */}
                    <div className="relative h-44 overflow-hidden bg-neutral-100">
                      <img
                        src={place.photos?.[0]?.uri || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=600&auto=format&fit=crop'}
                        alt={place.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Category Tag */}
                      <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#344E27] uppercase">
                        {place.category.replace(/_/g, ' ')}
                      </div>

                      {/* Source Indicator */}
                      <div className="absolute top-2.5 right-2.5">
                        <PlaceStatusBadge status={place.dataStatus} source={place.source} />
                      </div>

                      {/* Rating */}
                      {place.rating !== undefined && (
                        <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px] font-bold text-white flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                          <span>{place.rating}</span>
                          {place.userRatingsTotal && (
                            <span className="text-[10px] text-white/70">({place.userRatingsTotal})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-display font-bold text-base text-[#191919] group-hover:text-[#344E27] transition-colors line-clamp-1">
                          {place.name}
                        </h4>
                        
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#344E27] shrink-0" />
                          <span>{place.address || `${place.latitude.toFixed(3)}, ${place.longitude.toFixed(3)}`}</span>
                        </p>

                        {place.description && (
                          <p className="text-xs text-neutral-600 mt-2 line-clamp-2">
                            {place.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-neutral-500 font-medium">
                          {place.openingHours?.openNow !== undefined ? (
                            place.openingHours.openNow ? (
                              <span className="text-emerald-700 font-bold">Open Now</span>
                            ) : (
                              <span className="text-neutral-500">Closed</span>
                            )
                          ) : (
                            <span>Verified Location</span>
                          )}
                        </span>

                        <button
                          onClick={() => onSelectDestination(selectedDestination)}
                          className="px-3 py-1 rounded-full bg-[#E5ECE0] hover:bg-[#344E27] text-[#344E27] hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                        >
                          Plan with Sight
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Empty State */}
          {!placesLoading && placesData && placesData.places.length === 0 && (
            <div className="py-16 text-center bg-white rounded-[24px] border border-neutral-200 space-y-2">
              <Info className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="font-bold text-sm text-[#191919]">No places found for this search.</p>
              <p className="text-xs text-neutral-500">Try switching destination or clearing your search filters.</p>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
