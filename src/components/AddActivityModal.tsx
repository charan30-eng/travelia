import React, { useState, useEffect } from 'react';
import { Sparkles, X, Clock, MapPin, DollarSign, Plus, Search, Loader2 } from 'lucide-react';
import { ItineraryActivity, TraveliaPlace } from '../types';
import { placesClient } from '../services/placesClient';
import { PlaceStatusBadge } from './PlaceStatusBadge';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  onAdd: (activity: ItineraryActivity) => void;
  destination?: string;
}

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  dayNumber,
  onAdd,
  destination = '',
}) => {
  const [time, setTime] = useState('03:30 PM');
  const [activity, setActivity] = useState('');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState('500');
  const [duration, setDuration] = useState('1.5 hrs');
  const [aiTip, setAiTip] = useState('Great photo lighting during mid-afternoon.');
  
  // Real Places Suggestion State
  const [selectedPlace, setSelectedPlace] = useState<TraveliaPlace | null>(null);
  const [suggestions, setSuggestions] = useState<TraveliaPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search Places Data Layer when typing activity or destination
  useEffect(() => {
    if (!isOpen) {
      setSuggestions([]);
      return;
    }

    const trimmed = activity.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const cleanDest = (destination || '').split(',')[0].trim();
        const res = await placesClient.searchPlaces({
          destination: cleanDest || 'Goa',
          query: trimmed,
          limit: 4
        });
        if (!isCancelled && res.places && res.places.length > 0) {
          setSuggestions(res.places);
        } else if (!isCancelled) {
          setSuggestions([]);
        }
      } catch {
        if (!isCancelled) setSuggestions([]);
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [activity, destination, isOpen]);

  if (!isOpen) return null;

  const handleSelectPlace = (place: TraveliaPlace) => {
    setSelectedPlace(place);
    setActivity(place.name);
    setLocation(place.address || place.name);
    if (place.estimatedCost !== undefined && place.estimatedCost !== null) {
      setCost(place.estimatedCost.toString());
    } else if (place.priceLevel === 0) {
      setCost('0');
    }
    if (place.bestTimeToVisit) {
      setAiTip(`Recommended visit: ${place.bestTimeToVisit}`);
    } else if (place.rating) {
      setAiTip(`Rated ${place.rating}★ on verified Places Data Layer`);
    }
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity.trim()) return;

    const coords: [number, number] | undefined = selectedPlace 
      ? [selectedPlace.latitude, selectedPlace.longitude] 
      : undefined;

    const category = selectedPlace?.category === 'restaurant'
      ? 'food'
      : selectedPlace?.category === 'beach' || selectedPlace?.category === 'park'
      ? 'relaxation'
      : 'sightseeing';

    onAdd({
      id: `act-custom-${Date.now()}`,
      time,
      activity,
      location: location || 'Local Area',
      estimatedCost: Number(cost) || 0,
      duration: duration || '1 hr',
      aiRecommendation: aiTip,
      category,
      coords,
      imageUrl: selectedPlace?.photos?.[0]?.uri
    });

    // Reset and close
    setSelectedPlace(null);
    setSuggestions([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#344E27] px-2 py-0.5 rounded bg-[#E5ECE0]">
              Day 0{dayNumber}
            </span>
            <h3 className="font-display font-bold text-lg text-[#191919] mt-1">
              Add Verified Activity
            </h3>
          </div>
          <button 
            onClick={() => {
              setSelectedPlace(null);
              setSuggestions([]);
              onClose();
            }} 
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-neutral-700">Activity / Place Name</label>
              {selectedPlace && (
                <PlaceStatusBadge status={selectedPlace.dataStatus} source={selectedPlace.source} />
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={activity}
                onChange={(e) => {
                  setActivity(e.target.value);
                  if (selectedPlace && selectedPlace.name !== e.target.value) {
                    setSelectedPlace(null);
                  }
                }}
                placeholder="e.g. Scuba Diving at Grand Island or Baga Beach"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27] pr-8"
                required
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-neutral-400 animate-spin absolute right-2.5 top-3" />
              )}
            </div>

            {/* Places Autocomplete Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-neutral-100">
                <div className="px-3 py-1.5 bg-neutral-50 text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Verified Places Suggestions</span>
                  <Sparkles className="w-3 h-3 text-[#344E27]" />
                </div>
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPlace(p)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-[#E5ECE0]/50 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#191919] group-hover:text-[#344E27] truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {p.address || `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`}
                      </p>
                    </div>
                    <PlaceStatusBadge status={p.dataStatus} source={p.source} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Time Slot</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 02:00 PM"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Duration</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 2 hrs"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Candolim Beach"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Cost (₹)</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">AI Recommendation Tip</label>
            <input
              type="text"
              value={aiTip}
              onChange={(e) => setAiTip(e.target.value)}
              placeholder="e.g. Book online to skip ticketing lines"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedPlace(null);
                setSuggestions([]);
                onClose();
              }}
              className="px-4 py-2 rounded-full text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              Add Activity
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
