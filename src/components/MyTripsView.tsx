import React, { useState } from 'react';
import { 
  Sparkles, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Trash2, 
  Plus, 
  Share2, 
  Copy, 
  Clock, 
  DollarSign,
  Users
} from 'lucide-react';
import { TripPlan, Currency } from '../types';
import { formatCurrency } from '../data/mockData';

interface MyTripsViewProps {
  savedTrips: TripPlan[];
  onOpenTrip: (trip: TripPlan) => void;
  onDeleteTrip: (tripId: string) => void;
  onNewTrip: () => void;
  currency: Currency;
}

export const MyTripsView: React.FC<MyTripsViewProps> = ({
  savedTrips,
  onOpenTrip,
  onDeleteTrip,
  onNewTrip,
  currency,
}) => {
  const [filter, setFilter] = useState<'all' | 'saved' | 'planning'>('all');

  const filteredTrips = savedTrips.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Saved Itineraries</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#191919] uppercase tracking-tight">
            My Trips
          </h1>
          <p className="text-neutral-500 text-sm sm:text-base mt-1">
            Access your AI generated vacation blueprints, custom expenses, and day-by-day plans.
          </p>
        </div>

        <button
          onClick={onNewTrip}
          className="px-5 py-3 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Plan New Trip</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'saved', 'planning'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-all ${
              filter === tab
                ? 'bg-[#344E27] text-white shadow-sm'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            {tab === 'all' ? 'All Trips' : tab}
          </button>
        ))}
      </div>

      {/* Trips Grid */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border border-[#E5E7EB] shadow-2xs max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-[#E5ECE0] text-[#344E27] flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#191919]">No Trips Found</h3>
          <p className="text-xs text-neutral-500 mt-1 mb-6">
            You haven't saved any trips in this category yet.
          </p>
          <button
            onClick={onNewTrip}
            className="px-5 py-2.5 rounded-full bg-[#344E27] text-white text-xs font-bold"
          >
            Generate a Trip with AI
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-[28px] overflow-hidden border border-[#E5E7EB] shadow-2xs hover:shadow-xl transition-all group flex flex-col justify-between"
            >
              {/* Trip Photo Banner */}
              <div className="relative h-48 overflow-hidden bg-neutral-100">
                <img
                  src={trip.heroImage}
                  alt={trip.destination}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-[#344E27] border border-white/60">
                  {trip.days} Days • {trip.nights} Nights
                </div>
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1">
                  <Users className="w-3 h-3 text-amber-300" />
                  <span>{trip.travelers} Pax</span>
                </div>
              </div>

              {/* Trip Details */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-xs text-neutral-400 font-medium mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#344E27]" />
                    <span>{trip.country || 'Destination'}</span>
                  </div>

                  <h3 className="font-display font-bold text-2xl text-[#191919]">
                    {trip.destination}
                  </h3>

                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                    {trip.tagline || 'AI generated personalized vacation itinerary.'}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-600">
                    <Calendar className="w-3.5 h-3.5 text-[#344E27]" />
                    <span>{trip.travelDates || 'Dates Flexible'}</span>
                  </div>
                </div>

                {/* Bottom Bar: Budget & Action */}
                <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-bold block">Total Budget</span>
                    <span className="font-display font-extrabold text-base text-[#191919]">
                      {formatCurrency(trip.budget.total, currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDeleteTrip(trip.id)}
                      className="p-2 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onOpenTrip(trip)}
                      className="px-4 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <span>Open Trip</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
