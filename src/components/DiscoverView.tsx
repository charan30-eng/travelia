import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  MapPin, 
  Star, 
  ArrowRight, 
  Calendar, 
  Clock, 
  Filter,
  Check
} from 'lucide-react';
import { FEATURED_DESTINATIONS, formatCurrency } from '../data/mockData';
import { Currency } from '../types';

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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = FEATURED_DESTINATIONS.filter((d) => {
    const matchesCat = selectedCategory === 'All' || d.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Top Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated AI Destination Explorer</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#191919] uppercase tracking-tight">
            Discover Dream Destinations
          </h1>
          <p className="text-neutral-500 text-sm sm:text-base mt-1">
            Browse trending international spots and generate instant end-to-end itineraries.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search beaches, shrines, alps..."
            className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-neutral-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27] shadow-2xs"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
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
        {filtered.map((dest) => (
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

              {/* Bottom Price & Button */}
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Estimated Cost</span>
                  <span className="font-extrabold text-sm text-[#191919]">
                    {formatCurrency(dest.pricePerDay, currency)}
                    <span className="text-[10px] text-neutral-400 font-normal"> /day</span>
                  </span>
                </div>

                <button
                  onClick={() => onSelectDestination(`${dest.name}, ${dest.country}`)}
                  className="px-4 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Plan with AI</span>
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
