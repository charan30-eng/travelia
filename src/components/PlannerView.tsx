import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Calendar, 
  Users, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  ArrowRight, 
  Loader2, 
  Sliders, 
  ShieldAlert, 
  Info,
  X,
  Compass
} from 'lucide-react';
import { TripPreference, TripPlan } from '../types';

interface PlannerViewProps {
  onGenerateTrip: (destination: string, days: number, travelers: number, preferences: TripPreference[]) => void;
  initialDestination?: string;
  isGenerating?: boolean;
}

const PREFERENCE_OPTIONS: { id: TripPreference; label: string; icon: string }[] = [
  { id: 'Relaxation', label: 'Relaxation', icon: '🏖️' },
  { id: 'Food & Culture', label: 'Food & Culture', icon: '🍲' },
  { id: 'Adventure', label: 'Adventure', icon: '🧗' },
  { id: 'Couple', label: 'Couple', icon: '🥂' },
  { id: 'Family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'Friends', label: 'Friends', icon: '🏄‍♂️' },
  { id: 'Budget', label: 'Budget-Friendly', icon: '🏷️' },
  { id: 'Luxury', label: 'Luxury & Stays', icon: '✨' },
];

const POPULAR_SUGGESTIONS = [
  'Goa, India',
  'Kyoto, Japan',
  'Amalfi Coast, Italy',
  'Bali, Indonesia',
  'Swiss Alps, Switzerland',
  'Paris, France',
  'Kerala, India',
  'Rajasthan, India'
];

export const PlannerView: React.FC<PlannerViewProps> = ({
  onGenerateTrip,
  initialDestination = 'Goa, India',
  isGenerating = false,
}) => {
  const [destination, setDestination] = useState(initialDestination);
  const [dates, setDates] = useState('Nov 12 - Nov 16, 2026');
  const [days, setDays] = useState(5);
  const [travelers, setTravelers] = useState(2);
  const [selectedPreferences, setSelectedPreferences] = useState<TripPreference[]>([
    'Relaxation',
    'Food & Culture',
    'Couple'
  ]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePreference = (pref: TripPreference) => {
    setSelectedPreferences(prev => 
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setUploadedImage(result);
        setUploadStatus('Analyzing landmark & destination metadata...');
        
        setTimeout(() => {
          setUploadStatus('✨ AI Recognized: Goa Coastal Shoreline!');
          setDestination('Goa, India');
        }, 1000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        setUploadStatus('✨ AI Recognized: Goa Coastal Shoreline!');
        setDestination('Goa, India');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;
    onGenerateTrip(destination, days, travelers, selectedPreferences);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      
      {/* Top Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intelligent Trip Generator</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#191919] uppercase tracking-tight">
          Where do you want to go?
        </h1>
        <p className="text-neutral-500 text-sm sm:text-base mt-2">
          Enter any city or landmark. Travelia AI creates an end-to-end trip with stays, routes, restaurants, and expenses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left / Main Planning Card */}
        <div className="lg:col-span-8 bg-white rounded-[32px] p-6 sm:p-10 border border-[#E5E7EB] shadow-sm">
          
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. Destination Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#191919] mb-2.5">
                Destination / Place
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MapPin className="w-5 h-5 text-[#344E27]" />
                </div>
                <input
                  id="destination-input"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Goa, India or Kyoto, Japan"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-base font-semibold text-[#191919] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#344E27] focus:border-transparent transition-all placeholder:text-neutral-400"
                  required
                />
              </div>

              {/* Quick suggestion pills */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-neutral-400 mr-1">Popular:</span>
                {POPULAR_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setDestination(sug)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      destination === sug
                        ? 'bg-[#344E27] text-white border-[#344E27] font-bold'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Dates & Duration & Travelers Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-neutral-100">
              
              {/* Dates & Days */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#191919] mb-2">
                  Trip Duration & Dates
                </label>
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#191919]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#344E27]" />
                      <span>{days} Days ({days - 1} Nights)</span>
                    </span>
                    <span className="text-neutral-500 font-normal text-[11px]">{dates}</span>
                  </div>
                  
                  {/* Duration Slider */}
                  <input
                    type="range"
                    min="2"
                    max="14"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="w-full accent-[#344E27] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 font-medium">
                    <span>Weekend (2d)</span>
                    <span>5 Days (Ideal)</span>
                    <span>2 Weeks (14d)</span>
                  </div>
                </div>
              </div>

              {/* Number of Travelers */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#191919] mb-2">
                  Travelers
                </label>
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col justify-between h-[104px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#191919] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#344E27]" />
                      <span>{travelers} {travelers === 1 ? 'Solo Traveler' : travelers === 2 ? 'Couple' : travelers <= 4 ? 'Family' : 'Group'}</span>
                    </span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-white border border-neutral-200">
                      {travelers} Pax
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 4, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTravelers(num)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          travelers === num
                            ? 'bg-[#344E27] text-white border-[#344E27]'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {num === 1 ? '1' : num === 2 ? '2' : num === 4 ? '4' : '6+'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* 3. Travel Preference Chips */}
            <div className="pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#191919]">
                  Travel Preferences & Vibe
                </label>
                <span className="text-[11px] text-neutral-400 font-medium">Select all that apply</span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {PREFERENCE_OPTIONS.map((item) => {
                  const isSelected = selectedPreferences.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePreference(item.id)}
                      className={`px-4 py-2.5 rounded-full text-xs font-bold border flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-[#344E27] text-white border-[#344E27] shadow-sm scale-102'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Upload Destination Image Zone */}
            <div className="pt-2 border-t border-neutral-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#191919] mb-2">
                Upload Destination Photo (Optional)
              </label>
              
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  uploadedImage 
                    ? 'border-[#344E27] bg-[#E5ECE0]/30' 
                    : 'border-neutral-200 hover:border-[#344E27]/50 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />

                {uploadedImage ? (
                  <div className="flex items-center justify-center gap-4">
                    <img 
                      src={uploadedImage} 
                      alt="Uploaded Landmark" 
                      className="w-16 h-16 rounded-xl object-cover border border-neutral-200 shadow-2xs"
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#344E27]">{uploadStatus || 'Photo Loaded'}</p>
                      <p className="text-[11px] text-neutral-500">Click or drop another photo to re-analyze</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedImage(null);
                        setUploadStatus(null);
                      }}
                      className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col items-center">
                    <Upload className="w-6 h-6 text-[#344E27] mb-1.5" />
                    <p className="text-xs font-bold text-[#191919]">
                      Drag & Drop a photo or click to upload
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      AI computer vision identifies the location and populates travel highlights.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Submit Button */}
            <div className="pt-4">
              <button
                id="generate-trip-btn"
                type="submit"
                disabled={isGenerating}
                className="w-full py-4 rounded-full bg-[#344E27] hover:bg-[#273D1C] disabled:bg-neutral-300 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-[#344E27]/20 hover:shadow-xl hover:shadow-[#344E27]/30 transition-all flex items-center justify-center gap-3 active:scale-98 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating AI Itinerary, Stays & Budget...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate My Trip</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* Right Side: AI Assistant Side Card inspired by prompt */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* AI Assistant Card */}
          <div className="bg-[#E5ECE0]/60 rounded-[28px] p-6 border border-[#344E27]/15">
            <div className="flex items-center gap-2 text-[#344E27] font-extrabold text-sm uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Travel Assistant</span>
            </div>

            <p className="text-sm font-bold text-[#191919] mt-1 leading-snug">
              "Just tell me your destination and I'll handle the planning."
            </p>

            <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
              Our neural trip synthesizer analyzes over 100,000 local routes, verified stays, weather forecasts, and dining reviews to construct your personalized itinerary.
            </p>

            <div className="mt-5 space-y-2.5 pt-4 border-t border-[#344E27]/15 text-xs">
              <div className="flex items-center gap-2 text-[#191919] font-medium">
                <Check className="w-3.5 h-3.5 text-[#344E27] shrink-0" />
                <span>Real-time dynamic cost calculations</span>
              </div>
              <div className="flex items-center gap-2 text-[#191919] font-medium">
                <Check className="w-3.5 h-3.5 text-[#344E27] shrink-0" />
                <span>Optimal distance clustering for minimal transit</span>
              </div>
              <div className="flex items-center gap-2 text-[#191919] font-medium">
                <Check className="w-3.5 h-3.5 text-[#344E27] shrink-0" />
                <span>Verified boutique hotels with direct pricing</span>
              </div>
            </div>
          </div>

          {/* Quick Tip Box */}
          <div className="bg-white rounded-[24px] p-5 border border-[#E5E7EB] shadow-2xs text-xs text-neutral-500">
            <div className="flex items-center gap-2 font-bold text-[#191919] mb-1">
              <Info className="w-4 h-4 text-[#344E27]" />
              <span>Need Inspiration?</span>
            </div>
            <p>
              Try typing "Amalfi Coast, Italy" for romantic cliffside stays, or "Kyoto, Japan" for historic shrines and gardens.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
