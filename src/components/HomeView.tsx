import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowUpRight, 
  Star, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Coins, 
  Compass, 
  Plane,
  Building2,
  UtensilsCrossed,
  Layers,
  ChevronRight
} from 'lucide-react';
import { HeroOrganicCard } from './HeroOrganicCard';
import { FEATURED_DESTINATIONS, formatCurrency } from '../data/mockData';
import { Currency } from '../types';

interface HomeViewProps {
  onStartPlanning: (dest?: string) => void;
  onExplore: () => void;
  currency: Currency;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartPlanning,
  onExplore,
  currency,
}) => {
  // Feature cards matching the exact 3-card layout at the bottom of the Lumora reference image!
  const referenceBottomCards = [
    {
      id: 'card-1',
      title: 'Ocean Pearl Resort',
      location: 'Candolim, Goa',
      price: 4500,
      priceLabel: 'Price:',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=300&auto=format&fit=crop',
      destination: 'Goa, India'
    },
    {
      id: 'card-2',
      title: 'Kyoto Machiya Villa',
      location: 'Gion, Kyoto',
      price: 8200,
      priceLabel: 'Price:',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=300&auto=format&fit=crop',
      destination: 'Kyoto, Japan'
    },
    {
      id: 'card-3',
      title: 'Amalfi Cliffside Suite',
      location: 'Positano, Italy',
      price: 14500,
      priceLabel: 'Price:',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=300&auto=format&fit=crop',
      destination: 'Amalfi Coast, Italy'
    }
  ];

  return (
    <div className="min-h-screen pb-20">
      
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-14 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Bold Geometric Typography & CTAs */}
          <div className="lg:col-span-6 flex flex-col items-start">
            
            {/* AI Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold uppercase tracking-wider mb-6 border border-[#344E27]/15 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Generation Travel Operating System</span>
            </div>

            {/* Massive Geometric All-Caps Headline inspired by Lumora reference */}
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-[58px] leading-[1.08] tracking-tight text-[#191919] uppercase mb-6">
              PLAN YOUR <br />
              <span className="text-[#344E27]">PERFECT TRIP</span> <br />
              WITH AI
            </h1>

            {/* Supporting Subtext */}
            <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-xl mb-8">
              Tell us where you want to go. Our AI creates your itinerary, finds stays, discovers experiences, recommends restaurants, and calculates your estimated budget.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <button
                id="hero-start-planning-btn"
                onClick={() => onStartPlanning()}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white font-bold text-base shadow-lg shadow-[#344E27]/20 hover:shadow-xl hover:shadow-[#344E27]/30 transition-all flex items-center justify-center gap-2.5 group active:scale-98"
              >
                <span>Start Planning</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                id="hero-explore-destinations-btn"
                onClick={onExplore}
                className="w-full sm:w-auto px-7 py-4 rounded-full bg-white hover:bg-neutral-50 text-[#191919] font-bold text-base border border-[#E5E7EB] hover:border-neutral-400 transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-98"
              >
                <span>Explore Destinations</span>
              </button>
            </div>

            {/* Quick trust micro-stats */}
            <div className="mt-10 pt-6 border-t border-neutral-200/70 w-full flex items-center gap-6 sm:gap-10 text-xs text-neutral-500 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#344E27]" />
                <span>Zero Booking Markups</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#344E27]" />
                <span>Real-Time Expense Math</span>
              </div>
            </div>

          </div>

          {/* Right Column: Signature Organic Image Card inspired by Lumora */}
          <div className="lg:col-span-6">
            <HeroOrganicCard onSelectDestination={(dest) => onStartPlanning(dest)} />
          </div>

        </div>

        {/* 3 BOTTOM FEATURE CARDS inspired directly by the reference image (Aura Lamp / Lume Light / Nova Shine style) */}
        <div className="mt-12 lg:mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {referenceBottomCards.map((card) => (
            <div
              key={card.id}
              onClick={() => onStartPlanning(card.destination)}
              className="bg-white rounded-[22px] p-3.5 border border-[#E5E7EB] shadow-2xs hover:shadow-md hover:border-[#344E27]/40 transition-all cursor-pointer group flex items-center gap-4 relative"
            >
              {/* Left Rounded Image Thumbnail */}
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-neutral-100 shrink-0">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Text & Price & Star Rating */}
              <div className="flex-1 min-w-0 pr-8">
                <h4 className="font-bold text-sm text-[#191919] truncate group-hover:text-[#344E27] transition-colors">
                  {card.title}
                </h4>
                
                <p className="text-xs text-neutral-500 mt-0.5">
                  <span className="font-medium">{card.priceLabel}</span>{' '}
                  <span className="font-bold text-[#191919]">
                    {formatCurrency(card.price, currency)}
                  </span>
                  <span className="text-[10px] text-neutral-400">/day</span>
                </p>

                {/* 5 Golden Stars */}
                <div className="flex items-center gap-0.5 mt-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"
                    />
                  ))}
                </div>
              </div>

              {/* Diagonal Up-Right Arrow Icon Button matching reference */}
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-neutral-100 group-hover:bg-[#344E27] text-neutral-600 group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* STATISTICS STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8">
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#E5E7EB] shadow-2xs grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#191919] block tracking-tight">
              10K+
            </span>
            <span className="text-xs sm:text-sm text-neutral-500 font-medium mt-1 block">
              Trips Planned
            </span>
          </div>

          <div>
            <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#344E27] block tracking-tight">
              500+
            </span>
            <span className="text-xs sm:text-sm text-neutral-500 font-medium mt-1 block">
              Destinations
            </span>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1">
              <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#191919] tracking-tight">
                4.9/5
              </span>
              <Star className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]" />
            </div>
            <span className="text-xs sm:text-sm text-neutral-500 font-medium mt-1 block">
              Traveler Rating
            </span>
          </div>

          <div>
            <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#191919] block tracking-tight">
              {formatCurrency(24000000, currency)}
            </span>
            <span className="text-xs sm:text-sm text-neutral-500 font-medium mt-1 block">
              Estimated Budget Saved
            </span>
          </div>
        </div>
      </section>

      {/* HOW TRAVELIA AI WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#344E27] bg-[#E5ECE0] px-3 py-1 rounded-full border border-[#344E27]/15">
            Effortless 3-Step Flow
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#191919] mt-3">
            How Travelia AI Works
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base mt-2">
            Replace dozens of messy browser tabs and spreadsheet calculations with a unified AI planner.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-[26px] p-7 border border-[#E5E7EB] shadow-2xs hover:shadow-md transition-shadow relative">
            <div className="w-12 h-12 rounded-2xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center font-display font-extrabold text-xl mb-5">
              1
            </div>
            <h3 className="font-display font-bold text-xl text-[#191919] mb-2">
              Enter or Upload Destination
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Type your dream city or drag in an Instagram travel photo. Our AI scans landmarks and suggests best travel dates.
            </p>
          </div>

          <div className="bg-white rounded-[26px] p-7 border border-[#E5E7EB] shadow-2xs hover:shadow-md transition-shadow relative">
            <div className="w-12 h-12 rounded-2xl bg-[#344E27] text-white flex items-center justify-center font-display font-extrabold text-xl mb-5">
              2
            </div>
            <h3 className="font-display font-bold text-xl text-[#191919] mb-2">
              AI Builds Full Dashboard
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Instant custom vertical timeline with hotels, restaurants, tourist attractions, durations, and local tips.
            </p>
          </div>

          <div className="bg-white rounded-[26px] p-7 border border-[#E5E7EB] shadow-2xs hover:shadow-md transition-shadow relative">
            <div className="w-12 h-12 rounded-2xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center font-display font-extrabold text-xl mb-5">
              3
            </div>
            <h3 className="font-display font-bold text-xl text-[#191919] mb-2">
              Optimize & Track Budget
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Dynamically adjust group sizes, stay categories, and dining styles. Save and export your plan with 1-click.
            </p>
          </div>

        </div>
      </section>

      {/* TRENDING DESTINATIONS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-[#344E27] tracking-wider uppercase">
              Trending Experiences
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#191919] mt-1">
              Popular AI Destinations
            </h2>
          </div>
          <button
            onClick={onExplore}
            className="text-xs sm:text-sm font-bold text-[#344E27] hover:underline flex items-center gap-1"
          >
            <span>View All (500+)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_DESTINATIONS.slice(0, 4).map((dest) => (
            <div
              key={dest.id}
              className="bg-white rounded-[24px] overflow-hidden border border-[#E5E7EB] shadow-2xs hover:shadow-lg transition-all group flex flex-col"
            >
              {/* Image with Tag */}
              <div className="relative h-48 overflow-hidden bg-neutral-100">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-[#191919] border border-white/40">
                  {dest.category}
                </div>
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                  <span>{dest.rating}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-xs text-neutral-400 font-medium mb-1">
                    <MapPin className="w-3 h-3 text-[#344E27]" />
                    <span>{dest.country}</span>
                  </div>
                  <h4 className="font-display font-bold text-lg text-[#191919]">
                    {dest.name}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                    {dest.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-bold block">Avg Budget</span>
                    <span className="font-extrabold text-sm text-[#191919]">
                      {formatCurrency(dest.pricePerDay, currency)}
                      <span className="text-[10px] text-neutral-400 font-normal"> /day</span>
                    </span>
                  </div>

                  <button
                    onClick={() => onStartPlanning(`${dest.name}, ${dest.country}`)}
                    className="px-3.5 py-2 rounded-full bg-[#E5ECE0] hover:bg-[#344E27] text-[#344E27] hover:text-white text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <span>Plan</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

      </section>

    </div>
  );
};
