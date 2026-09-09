import React, { useState } from 'react';
import { Sparkles, X, Clock, MapPin, DollarSign, Plus } from 'lucide-react';
import { ItineraryActivity } from '../types';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  onAdd: (activity: ItineraryActivity) => void;
}

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  dayNumber,
  onAdd,
}) => {
  const [time, setTime] = useState('03:30 PM');
  const [activity, setActivity] = useState('');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState('500');
  const [duration, setDuration] = useState('1.5 hrs');
  const [aiTip, setAiTip] = useState('Great photo lighting during mid-afternoon.');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity.trim()) return;

    onAdd({
      id: `act-custom-${Date.now()}`,
      time,
      activity,
      location: location || 'Local Area',
      estimatedCost: Number(cost) || 0,
      duration: duration || '1 hr',
      aiRecommendation: aiTip,
      category: 'sightseeing'
    });

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
              Add Custom Activity
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:text-neutral-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Activity Name</label>
            <input
              type="text"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="e.g. Scuba Diving at Grand Island"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27]"
              required
            />
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
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-bold text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold shadow-sm"
            >
              Add Activity
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
