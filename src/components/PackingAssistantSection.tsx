import React, { useState } from 'react';
import { 
  Luggage, 
  Check, 
  Plus, 
  Trash2, 
  Sparkles, 
  FileText, 
  Smartphone, 
  Shirt, 
  Heart, 
  Compass, 
  CheckCircle2, 
  RotateCcw
} from 'lucide-react';
import { TripPlan, PackingItem } from '../types';
import { generateSmartPackingList } from '../data/featureData';
import confetti from 'canvas-confetti';

interface PackingAssistantSectionProps {
  trip: TripPlan;
}

export const PackingAssistantSection: React.FC<PackingAssistantSectionProps> = ({
  trip,
}) => {
  const [items, setItems] = useState<PackingItem[]>(() => generateSmartPackingList(trip));
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<PackingItem['category']>('essentials');
  const [isGenerating, setIsGenerating] = useState(false);

  const totalItems = items.length;
  const packedItems = items.filter(i => i.checked).length;
  const progressPercent = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  const categories = [
    { id: 'all', label: 'All Items', icon: Luggage },
    { id: 'clothing', label: 'Clothing', icon: Shirt },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'electronics', label: 'Electronics', icon: Smartphone },
    { id: 'essentials', label: 'Essentials', icon: Heart },
    { id: 'activity_gear', label: 'Activity Gear', icon: Compass },
  ];

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter(i => i.category === activeCategory);

  const handleToggleItem = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const nextChecked = !item.checked;
        if (nextChecked && packedItems + 1 === totalItems) {
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 }
            });
          } catch (e) {}
        }
        return { ...item, checked: nextChecked };
      }
      return item;
    }));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    const newItem: PackingItem = {
      id: `pack-${Date.now()}`,
      name: newItemName,
      category: newItemCategory,
      checked: false,
      isCustom: true,
      aiSuggestedReason: 'Custom user added item.'
    };

    setItems(prev => [newItem, ...prev]);
    setNewItemName('');
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleRegenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setItems(generateSmartPackingList(trip));
      setIsGenerating(false);

      try {
        confetti({
          particleCount: 35,
          spread: 45,
          origin: { y: 0.7 }
        });
      } catch (e) {}
    }, 600);
  };

  return (
    <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#344E27] text-white flex items-center justify-center shadow-xs">
              <Luggage className="w-4 h-4 text-[#E5ECE0]" />
            </div>
            <h3 className="font-display font-extrabold text-xl text-[#191919]">
              AI Smart Packing Assistant
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold">
              Checklist Engine
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Tailored packing list for {trip.days} days in {trip.destination} based on planned activities & weather forecast.
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={isGenerating}
          className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-extrabold text-neutral-800 transition-all flex items-center gap-1.5 border border-neutral-200 self-start md:self-auto cursor-pointer"
        >
          {isGenerating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
              <span>Generating List...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-[#344E27]" />
              <span>Regenerate with AI</span>
            </>
          )}
        </button>
      </div>

      {/* Progress Bar Banner */}
      <div className="p-5 rounded-2xl bg-[#F4F7F2] border border-[#D8E4D3] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#344E27] uppercase tracking-wider">
              Packing Progress
            </span>
            <span className="text-neutral-600 font-semibold">
              ({packedItems} of {totalItems} items ready)
            </span>
          </div>
          <span className="font-extrabold text-[#191919]">{progressPercent}%</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-white border border-[#D8E4D3] overflow-hidden">
          <div
            className="h-full bg-[#344E27] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          const count = cat.id === 'all' 
            ? items.length 
            : items.filter(i => i.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#344E27] text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add Custom Item Form */}
      <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row items-center gap-2 pt-2">
        <input
          type="text"
          placeholder="Add custom packing item (e.g. Scuba snorkel mask)..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 w-full px-4 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#344E27]"
        />

        <select
          value={newItemCategory}
          onChange={(e: any) => setNewItemCategory(e.target.value)}
          className="w-full sm:w-40 px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none"
        >
          <option value="clothing">Clothing</option>
          <option value="documents">Documents</option>
          <option value="electronics">Electronics</option>
          <option value="essentials">Essentials</option>
          <option value="activity_gear">Activity Gear</option>
        </select>

        <button
          type="submit"
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {filteredItems.map(item => (
          <div
            key={item.id}
            onClick={() => handleToggleItem(item.id)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
              item.checked
                ? 'bg-[#F9FBF8] border-neutral-200 opacity-70'
                : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                item.checked
                  ? 'bg-[#344E27] text-white'
                  : 'border-2 border-neutral-300 hover:border-[#344E27]'
              }`}>
                {item.checked && <Check className="w-3.5 h-3.5" />}
              </div>

              <div className="min-w-0">
                <p className={`text-xs font-bold ${
                  item.checked ? 'line-through text-neutral-400' : 'text-[#191919]'
                }`}>
                  {item.name}
                </p>
                {item.aiSuggestedReason && (
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                    {item.aiSuggestedReason}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteItem(item.id);
              }}
              className="text-neutral-300 hover:text-rose-600 p-1 transition-colors"
              aria-label="Remove item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};
