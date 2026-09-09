import React, { useState } from 'react';
import { Sparkles, ArrowUpRight, Star, MapPin, Compass, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeroOrganicCardProps {
  onSelectDestination?: (dest: string) => void;
}

const HERO_DESTINATIONS = [
  {
    name: 'Goa Coastline',
    country: 'India',
    vibe: 'Golden Palms & Ocean Sunsets',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1200&auto=format&fit=crop',
    rating: '4.9',
    stays: '340+ Stays'
  },
  {
    name: 'Kyoto Temples',
    country: 'Japan',
    vibe: 'Zen Shrines & Bamboo Gardens',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop',
    rating: '4.95',
    stays: '520+ Stays'
  },
  {
    name: 'Amalfi Cliffs',
    country: 'Italy',
    vibe: 'Pastel Villas & Yacht Harbors',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1200&auto=format&fit=crop',
    rating: '4.88',
    stays: '210+ Stays'
  }
];

export const HeroOrganicCard: React.FC<HeroOrganicCardProps> = ({ onSelectDestination }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = HERO_DESTINATIONS[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % HERO_DESTINATIONS.length);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
      
      {/* Background soft ambient glow */}
      <div className="absolute -inset-2 bg-gradient-to-tr from-[#344E27]/10 via-[#E5ECE0]/30 to-amber-100/20 rounded-[48px] blur-xl -z-10" />

      {/* Main Organic Hero Card Container */}
      <div className="relative overflow-hidden rounded-[36px] bg-[#EAE8E3] border border-neutral-200/80 shadow-xl aspect-[4/3] sm:aspect-[16/11] lg:aspect-[16/11]">
        
        {/* Destination Image with crossfade */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.name}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <img
              src={current.image}
              alt={current.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Subtle soft gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Top-Left Organic Floating Badge */}
        <div className="absolute top-5 left-5 z-20">
          <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/40 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#344E27] animate-pulse" />
            <span className="text-xs font-bold text-[#191919]">{current.vibe}</span>
          </div>
        </div>

        {/* Top-Right Quick Switcher Button */}
        <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
          <button
            onClick={handleNext}
            className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-[#191919] text-xs font-bold shadow-sm border border-white/40 flex items-center gap-1.5 transition-all active:scale-95"
            title="Next Destination"
          >
            <span>Next Destination</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#344E27]" />
          </button>
        </div>

        {/* Bottom Destination Info & Floating Social Proof Pill (Directly replicating reference style) */}
        <div className="absolute bottom-5 inset-x-5 z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          
          {/* Destination Title & Stays */}
          <div className="text-white">
            <div className="flex items-center gap-1.5 text-xs text-white/80 mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-amber-300" />
              <span>{current.country}</span>
            </div>
            <h3 className="font-display font-extrabold text-2xl tracking-tight text-white drop-shadow-sm">
              {current.name}
            </h3>
            <p className="text-xs text-white/90 font-medium">
              AI curated stays from {current.stays}
            </p>
          </div>

          {/* Overlapping User Avatars Badge inspired by Lumora reference */}
          <div 
            onClick={() => onSelectDestination && onSelectDestination(current.name)}
            className="bg-white/95 backdrop-blur-md p-2 pl-3 rounded-full shadow-lg border border-white/60 flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform"
          >
            {/* Overlapping Avatars */}
            <div className="flex -space-x-2">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop" 
                alt="Traveler 1" 
                className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
                referrerPolicy="no-referrer"
              />
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop" 
                alt="Traveler 2" 
                className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
                referrerPolicy="no-referrer"
              />
              <img 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&auto=format&fit=crop" 
                alt="Traveler 3" 
                className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="pr-2">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-xs text-[#191919]">100k+</span>
                <span className="text-[10px] text-amber-500 font-bold flex items-center">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {current.rating}
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 font-medium block -mt-0.5">Happy travelers</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
