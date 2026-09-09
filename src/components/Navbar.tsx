import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Bell, 
  User, 
  Check, 
  ChevronDown, 
  Compass, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Bookmark, 
  Code2, 
  Sun,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react';
import { Currency } from '../types';

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currency: Currency;
  onSelectCurrency: (c: Currency) => void;
  savedTripsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  currency,
  onSelectCurrency,
  savedTripsCount,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const notifications = [
    {
      id: 'n1',
      title: 'Flight Price Drop: Goa',
      desc: 'Roundtrip flights to Goa dropped 18% for Nov dates.',
      time: '10m ago',
      unread: true
    },
    {
      id: 'n2',
      title: 'AI Itinerary Optimized',
      desc: 'Grouped North Goa sightseeing to save 2 hours transit.',
      time: '1h ago',
      unread: true
    },
    {
      id: 'n3',
      title: 'Monsoon Retreats Live',
      desc: 'Explore 24 new heritage villas with private plunge pools.',
      time: '1d ago',
      unread: false
    }
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'planner', label: 'Plan Trip' },
    { id: 'dashboard', label: 'Trip Dashboard' },
    { id: 'discover', label: 'Discover' },
    { id: 'my-trips', label: 'My Trips', badge: savedTripsCount > 0 ? savedTripsCount : undefined },
    { id: 'budget', label: 'Budget' },
    { id: 'javafx', label: 'JavaFX Code', icon: Code2, isPill: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FBFBFB]/90 backdrop-blur-md border-b border-[#E5E7EB] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo inspired by Lumora aesthetic */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          id="brand-logo"
        >
          <div className="w-9 h-9 rounded-xl bg-[#344E27] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 fill-current text-[#E5ECE0]" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-xl tracking-tight text-[#191919] uppercase flex items-center gap-1.5">
              TRAVELIA <span className="text-[#344E27] font-semibold text-xs tracking-wider px-1.5 py-0.5 rounded bg-[#E5ECE0] border border-[#344E27]/20">AI</span>
            </span>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            if (item.isPill) {
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`ml-2 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isActive 
                      ? 'bg-[#191919] text-white shadow-sm' 
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {item.label}
                </button>
              );
            }

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`relative px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'text-[#191919] font-bold bg-[#EAEFE8]/80'
                    : 'text-[#555] hover:text-[#191919] hover:bg-neutral-100/70'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {item.label}
                  {item.badge && (
                    <span className="w-4 h-4 rounded-full bg-[#344E27] text-white text-[10px] flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-3">
          {/* Currency Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
              className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-white border border-[#E5E7EB] text-[#191919] hover:border-neutral-400 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <span>{currency}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showCurrencyMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-2xl shadow-xl border border-neutral-200 py-1.5 z-50">
                {(['INR', 'USD', 'EUR', 'GBP'] as Currency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onSelectCurrency(c);
                      setShowCurrencyMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 text-xs font-medium flex items-center justify-between hover:bg-[#F4F6F3] ${
                      currency === c ? 'text-[#344E27] font-bold' : 'text-neutral-700'
                    }`}
                  >
                    <span>{c}</span>
                    {currency === c && <Check className="w-3.5 h-3.5 text-[#344E27]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Icon with popover */}
          <div className="relative" ref={notifRef}>
            <button
              id="notifications-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 rounded-full bg-white hover:bg-neutral-100 border border-[#E5E7EB] flex items-center justify-center text-[#191919] transition-colors relative shadow-2xs"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#344E27] rounded-full ring-2 ring-white" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#191919]">Travel Alerts</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold">2 new</span>
                  </div>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-neutral-400 hover:text-neutral-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto mt-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="py-2.5 flex items-start gap-3 hover:bg-neutral-50 px-2 rounded-xl transition-colors">
                      <div className="w-2 h-2 rounded-full bg-[#344E27] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-[#191919]">{n.title}</p>
                        <p className="text-xs text-neutral-600 mt-0.5">{n.desc}</p>
                        <span className="text-[10px] text-neutral-400 mt-1 block">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar inspired by reference 3D avatar */}
          <div className="relative" ref={profileRef}>
            <button
              id="user-profile-btn"
              onClick={() => setShowProfile(!showProfile)}
              className="w-10 h-10 rounded-full ring-2 ring-[#E5ECE0] overflow-hidden bg-[#E2E8F0] hover:ring-[#344E27] transition-all flex items-center justify-center"
              aria-label="User Profile"
            >
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" 
                alt="Traveler Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4 z-50">
                <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
                  <div className="w-11 h-11 rounded-full overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" 
                      alt="Traveler Avatar" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#191919]">Elena Vance</h4>
                    <p className="text-xs text-neutral-500">Explorer Gold Tier</p>
                  </div>
                </div>

                <div className="py-2 text-xs space-y-1">
                  <button 
                    onClick={() => { onSelectTab('my-trips'); setShowProfile(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-neutral-700 hover:bg-[#F4F6F3] font-medium flex items-center gap-2"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#344E27]" />
                    My Saved Trips ({savedTripsCount})
                  </button>
                  <button 
                    onClick={() => { onSelectTab('budget'); setShowProfile(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-neutral-700 hover:bg-[#F4F6F3] font-medium flex items-center gap-2"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-[#344E27]" />
                    Budget Preferences
                  </button>
                  <button 
                    onClick={() => { onSelectTab('javafx'); setShowProfile(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-neutral-700 hover:bg-[#F4F6F3] font-medium flex items-center gap-2"
                  >
                    <Code2 className="w-3.5 h-3.5 text-[#344E27]" />
                    Java / JavaFX Architecture
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
