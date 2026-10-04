import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Trash2, 
  Plus, 
  Copy, 
  Clock, 
  DollarSign,
  Users,
  Edit3,
  Archive,
  ArchiveRestore,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TripPlan, Currency } from '../types';
import { formatCurrency } from '../data/mockData';
import confetti from 'canvas-confetti';

interface MyTripsViewProps {
  savedTrips: TripPlan[];
  onOpenTrip: (trip: TripPlan) => void;
  onDeleteTrip: (tripId: string) => void;
  onNewTrip: () => void;
  onDuplicateTrip?: (trip: TripPlan) => void;
  onArchiveTrip?: (tripId: string) => void;
  onEditTrip?: (trip: TripPlan) => void;
  currency: Currency;
}

export const MyTripsView: React.FC<MyTripsViewProps> = ({
  savedTrips,
  onOpenTrip,
  onDeleteTrip,
  onNewTrip,
  onDuplicateTrip,
  onArchiveTrip,
  onEditTrip,
  currency,
}) => {
  const [filter, setFilter] = useState<'all' | 'persisted' | 'active' | 'archived' | 'demo'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3200);
  };

  const isTripDemo = (trip: TripPlan) => {
    return Boolean(
      (trip as any).isDemo || 
      (trip as any).dataSource === 'DEMO DATA' || 
      trip.id.startsWith('trip-goa-') || 
      trip.id.startsWith('trip-kerala-')
    );
  };

  const isTripArchived = (trip: TripPlan) => {
    return trip.status === 'completed' || (trip as any).status === 'archived' || (trip as any).isArchived === true;
  };

  // Prioritize persisted user trips over demo trips
  const sortedTrips = useMemo(() => {
    return [...savedTrips].sort((a, b) => {
      const aIsDemo = isTripDemo(a);
      const bIsDemo = isTripDemo(b);
      // Real persisted trips first
      if (!aIsDemo && bIsDemo) return -1;
      if (aIsDemo && !bIsDemo) return 1;
      // Active before archived
      const aArchived = isTripArchived(a);
      const bArchived = isTripArchived(b);
      if (!aArchived && bArchived) return -1;
      if (aArchived && !bArchived) return 1;
      return 0;
    });
  }, [savedTrips]);

  const filteredTrips = useMemo(() => {
    return sortedTrips.filter((trip) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = trip.destination.toLowerCase().includes(q);
        const matchesCountry = (trip.country || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCountry) return false;
      }

      const isDemo = isTripDemo(trip);
      const isArchived = isTripArchived(trip);

      if (filter === 'persisted') return !isDemo && !isArchived;
      if (filter === 'active') return !isArchived;
      if (filter === 'archived') return isArchived;
      if (filter === 'demo') return isDemo;
      return true;
    });
  }, [sortedTrips, filter, searchQuery]);

  const persistedCount = savedTrips.filter(t => !isTripDemo(t) && !isTripArchived(t)).length;
  const archivedCount = savedTrips.filter(t => isTripArchived(t)).length;

  const handleDuplicate = (e: React.MouseEvent, trip: TripPlan) => {
    e.stopPropagation();
    if (onDuplicateTrip) {
      onDuplicateTrip(trip);
      showNotice(`Duplicated "${trip.destination}" to your portfolio!`);
      try {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
      } catch (err) {}
    }
  };

  const handleArchiveToggle = (e: React.MouseEvent, trip: TripPlan) => {
    e.stopPropagation();
    if (onArchiveTrip) {
      onArchiveTrip(trip.id);
      const wasArchived = isTripArchived(trip);
      showNotice(wasArchived ? `Restored "${trip.destination}" to active trips.` : `Archived "${trip.destination}".`);
    }
  };

  const handleDelete = (e: React.MouseEvent, tripId: string, destName: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the trip to ${destName}?`)) {
      onDeleteTrip(tripId);
      showNotice(`Trip to ${destName} deleted.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Toast Notice */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#191919] text-white px-5 py-3 rounded-2xl shadow-2xl border border-neutral-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{actionNotice}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trip Portfolio Management</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#191919] uppercase tracking-tight">
            My Trips
          </h1>
          <p className="text-neutral-500 text-sm sm:text-base mt-1">
            Persisted trip itineraries, simulated replans, and custom group travel budgets stored in your local engine database.
          </p>
        </div>

        <button
          onClick={onNewTrip}
          className="px-5 py-3 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Plan New Trip</span>
        </button>
      </div>

      {/* Controls Bar: Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: `All Trips (${savedTrips.length})` },
            { id: 'persisted', label: `Persisted (${persistedCount})` },
            { id: 'active', label: 'Active' },
            { id: 'archived', label: `Archived (${archivedCount})` },
            { id: 'demo', label: 'Demo Templates' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#344E27] text-white shadow-sm'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full text-xs bg-white border border-neutral-200 focus:border-[#344E27] focus:ring-2 focus:ring-[#344E27]/20 outline-none transition-all"
          />
        </div>
      </div>

      {/* Trips Grid */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border border-[#E5E7EB] shadow-2xs max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-[#E5ECE0] text-[#344E27] flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#191919]">No Trips Found</h3>
          <p className="text-xs text-neutral-500 mt-1 mb-6">
            {searchQuery 
              ? `No itineraries match "${searchQuery}".` 
              : `You don't have any trips under the "${filter}" filter.`}
          </p>
          <button
            onClick={onNewTrip}
            className="px-5 py-2.5 rounded-full bg-[#344E27] text-white text-xs font-bold cursor-pointer"
          >
            Create New Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => {
            const isDemo = isTripDemo(trip);
            const isArchived = isTripArchived(trip);

            return (
              <div
                key={trip.id}
                className={`bg-white rounded-[28px] overflow-hidden border transition-all flex flex-col justify-between group ${
                  isArchived 
                    ? 'border-neutral-200 opacity-75 hover:opacity-100' 
                    : !isDemo 
                      ? 'border-emerald-200 shadow-sm hover:shadow-xl hover:border-emerald-400' 
                      : 'border-[#E5E7EB] shadow-2xs hover:shadow-lg'
                }`}
              >
                {/* Trip Photo Banner */}
                <div className="relative h-48 overflow-hidden bg-neutral-100">
                  <img
                    src={trip.heroImage}
                    alt={trip.destination}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Status Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-[#344E27] border border-white/60">
                      {trip.days}D • {trip.nights}N
                    </div>

                    {isArchived ? (
                      <span className="bg-neutral-800/90 backdrop-blur-md text-neutral-200 border border-neutral-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase shadow-xs">
                        ARCHIVED
                      </span>
                    ) : isDemo ? (
                      <span className="bg-amber-100/95 backdrop-blur-md text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase shadow-xs">
                        DEMO TEMPLATE
                      </span>
                    ) : (
                      <span className="bg-emerald-100/95 backdrop-blur-md text-emerald-900 border border-emerald-300/80 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase shadow-xs flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                        PERSISTED
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1">
                    <Users className="w-3 h-3 text-amber-300" />
                    <span>{trip.travelers} Pax</span>
                  </div>
                </div>

                {/* Trip Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-neutral-400 font-medium mb-1">
                      <MapPin className="w-3.5 h-3.5 text-[#344E27]" />
                      <span>{trip.country || 'Destination'}</span>
                    </div>

                    <h3 className="font-display font-black text-2xl text-[#191919] group-hover:text-[#344E27] transition-colors">
                      {trip.destination}
                    </h3>

                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                      {trip.tagline || trip.tripOverview || 'AI generated personalized vacation itinerary.'}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-neutral-600">
                      <Calendar className="w-3.5 h-3.5 text-[#344E27]" />
                      <span>{trip.travelDates || 'Dates Flexible'}</span>
                    </div>
                  </div>

                  {/* Actions & Budget Section */}
                  <div className="pt-4 border-t border-neutral-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-bold block">Estimated Budget</span>
                        <span className="font-display font-black text-base text-[#191919]">
                          {formatCurrency(trip.budget.total, currency)}
                        </span>
                      </div>

                      {/* Micro actions: Duplicate, Edit, Archive, Delete */}
                      <div className="flex items-center gap-1">
                        {onDuplicateTrip && (
                          <button
                            onClick={(e) => handleDuplicate(e, trip)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-[#344E27] hover:bg-[#E5ECE0] transition-colors cursor-pointer"
                            title="Duplicate Trip"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onEditTrip && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTrip(trip);
                            }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Trip Inputs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onArchiveTrip && (
                          <button
                            onClick={(e) => handleArchiveToggle(e, trip)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title={isArchived ? "Restore Trip" : "Archive Trip"}
                          >
                            {isArchived ? (
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDelete(e, trip.id, trip.destination)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Trip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Primary Open Button */}
                    <button
                      onClick={() => onOpenTrip(trip)}
                      className="w-full py-2.5 rounded-2xl bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.99]"
                    >
                      <span>Open Itinerary Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
