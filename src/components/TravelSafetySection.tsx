import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Phone, 
  HeartHandshake, 
  AlertOctagon, 
  Languages, 
  Copy, 
  Check, 
  Info, 
  Sun, 
  Droplets,
  BookOpen,
  Coffee,
  Building2,
  DollarSign,
  Camera
} from 'lucide-react';
import { SafetyInfo } from '../types';
import { getSafetyInfo } from '../data/featureData';

interface TravelSafetySectionProps {
  destination: string;
}

export const TravelSafetySection: React.FC<TravelSafetySectionProps> = ({
  destination,
}) => {
  const safety: SafetyInfo = getSafetyInfo(destination);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'emergency' | 'customs' | 'phrases' | 'tips'>('emergency');

  const handleCopyNumber = (num: string, idx: number) => {
    try {
      navigator.clipboard.writeText(num);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (e) {
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const getCustomIcon = (iconName: string) => {
    switch (iconName) {
      case 'Coffee': return <Coffee className="w-4 h-4 text-amber-700" />;
      case 'Building2': return <Building2 className="w-4 h-4 text-indigo-700" />;
      case 'DollarSign': return <DollarSign className="w-4 h-4 text-emerald-700" />;
      case 'Camera': return <Camera className="w-4 h-4 text-rose-700" />;
      default: return <HeartHandshake className="w-4 h-4 text-[#344E27]" />;
    }
  };

  return (
    <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#344E27] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#E5ECE0]" />
            </div>
            <h3 className="font-display font-extrabold text-xl text-[#191919]">
              Travel Safety & Local Guidance
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold">
              Verified Intel
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Official emergency contacts, tourist safety advisories, cultural etiquette, and essential Konkani phrases.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-full text-xs font-bold self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('emergency')}
            className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
              activeTab === 'emergency' ? 'bg-[#344E27] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Emergency Contacts
          </button>
          <button
            onClick={() => setActiveTab('customs')}
            className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
              activeTab === 'customs' ? 'bg-[#344E27] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Local Customs
          </button>
          <button
            onClick={() => setActiveTab('phrases')}
            className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
              activeTab === 'phrases' ? 'bg-[#344E27] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Local Phrases
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
              activeTab === 'tips' ? 'bg-[#344E27] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Safety Tips
          </button>
        </div>
      </div>

      {/* TAB 1: Emergency Contacts */}
      {activeTab === 'emergency' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-in fade-in duration-150">
          {safety.emergencyContacts.map((contact, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#191919]">{contact.label}</span>
                  <span className="px-2 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">
                    {contact.category}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">{contact.description}</p>
              </div>

              <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between">
                <span className="font-display font-extrabold text-sm text-[#344E27]">
                  {contact.number}
                </span>

                <button
                  onClick={() => handleCopyNumber(contact.number, idx)}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-700 flex items-center gap-1 shadow-2xs transition-all"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-[10px] text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Local Customs */}
      {activeTab === 'customs' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-in fade-in duration-150">
          {safety.localCustoms.map((custom, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-2xs">
                  {getCustomIcon(custom.icon)}
                </div>
                <h5 className="text-xs font-bold text-[#191919]">{custom.title}</h5>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed pl-9">
                {custom.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Local Phrases */}
      {activeTab === 'phrases' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-150">
          {safety.usefulPhrases.map((phrase, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#344E27]">{phrase.phrase}</span>
                <span className="text-[10px] font-bold uppercase text-neutral-400">{phrase.category}</span>
              </div>
              <p className="text-[11px] text-neutral-500 italic">
                "{phrase.phonetic}"
              </p>
              <p className="text-xs text-neutral-800 font-semibold pt-1 border-t border-neutral-200/50">
                {phrase.meaning}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Safety Tips */}
      {activeTab === 'tips' && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          {safety.touristSafetyTips.map((tip, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-start gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-[#E5ECE0] text-[#344E27] flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                {idx + 1}
              </div>
              <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                {tip}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
