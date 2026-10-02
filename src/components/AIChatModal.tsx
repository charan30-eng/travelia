import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Check, 
  Plus, 
  DollarSign, 
  Compass, 
  Umbrella,
  ArrowRight
} from 'lucide-react';
import { ChatMessage, TripPlan } from '../types';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripPlan;
  onApplyAction: (actionType: string) => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    sender: 'ai',
    text: "Hello! I'm Travelia AI, your neural travel copilot. How can I fine-tune your itinerary or budget today?",
    timestamp: 'Just now'
  }
];

const SUGGESTED_QUESTIONS = [
  'What are the must-see attractions?',
  'Replan Day 2 activities for evening',
  'Can you recommend authentic local dining?',
  'Can you reduce the total trip cost?',
  'What are local customs & emergency numbers?'
];

export const AIChatModal: React.FC<AIChatModalProps> = ({
  isOpen,
  onClose,
  trip,
  onApplyAction,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let aiReply = "I have analyzed your request against local availability and route models.";
      let actionPrompt: ChatMessage['actionPrompt'] | undefined;

      const lower = text.toLowerCase();
      if (lower.includes('health') || lower.includes('score') || lower.includes('diagnostic')) {
        aiReply = `Your itinerary has an AI Trip Health Score of 92/100 ("Exceptional Balance"). Schedule pace is well-tempered with 2.5h rest buffers and optimal route transit times under 20 mins between stops.`;
      } else if (lower.includes('replan') || lower.includes('rain') || lower.includes('disrupt') || lower.includes('storm')) {
        aiReply = `I've prepared a Smart Replan for ${trip.destination}. For rainy afternoon conditions, outdoor beach watersports are swapped with indoor cultural museum visits and coastal spice plantation lunch.`;
        actionPrompt = { type: 'add_beach', label: 'Review Smart Replan Options' };
      } else if (lower.includes('emergency') || lower.includes('custom') || lower.includes('safety') || lower.includes('phrase')) {
        aiReply = `Official tourist helpline is 1363 (National) and Tourist Police is +91-832-2419400. In Goa, remember: "Deu borem korum" means Thank You, and drinking alcohol on public sands is strictly prohibited.`;
      } else if (lower.includes('cheap') || lower.includes('budget') || lower.includes('save') || lower.includes('reduce')) {
        aiReply = "Yes! I found several ways to reduce the estimated cost by approximately ₹4,500 while keeping the main experiences. I've optimized nearby attraction passes and balanced transit modes.";
        actionPrompt = { type: 'discount_hotel', label: 'Apply Budget Optimization' };
      } else if (lower.includes('beach') || lower.includes('beaches') || lower.includes('coast')) {
        aiReply = "I've discovered 3 stunning beaches nearby: Morjim (serene & turtle nesting), Ashwem (palm-shaded boho shacks), and Palolem (tranquil crescent bay). Would you like me to insert them into your afternoon schedule?";
        actionPrompt = { type: 'add_beach', label: 'Insert 3 Beaches to Itinerary' };
      } else if (lower.includes('food') || lower.includes('seafood') || lower.includes('dish') || lower.includes('restaurant')) {
        aiReply = `For ${trip.destination}, don't miss authentic Kingfish Rawa Fry, Crab Xec Xec, Goan Prawn Curry, and Bebinca layer cake. I've highlighted verified local eateries in your dining tab.`;
        actionPrompt = { type: 'add_restaurant', label: 'Pin Recommended Restaurants' };
      } else if (lower.includes('pack') || lower.includes('luggage') || lower.includes('cloth')) {
        aiReply = "Packing Checklist for " + trip.destination + ": Light linen shirts, UV sunglasses, reef-safe sunscreen, waterproof phone pouch, comfortable slip-on sneakers for fort treks, and universal power adapter.";
      } else {
        aiReply = `Got it! I have updated your trip preferences for ${trip.destination}. Stays, timing slots, and daily travel expenses have been aligned to your preferences.`;
      }

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionPrompt
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-250">
      
      {/* Drawer Header */}
      <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-[#FBFBFB]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#344E27] text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 fill-current text-[#E5ECE0]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-display font-extrabold text-base text-[#191919]">Travelia AI</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-neutral-500 font-medium">
              Assistant for {trip.destination}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-neutral-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start gap-2.5 max-w-[85%]">
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-[#344E27] text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                  AI
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#344E27] text-white rounded-br-xs shadow-2xs font-medium'
                    : 'bg-white text-[#191919] border border-neutral-200/80 rounded-bl-xs shadow-2xs'
                }`}
              >
                <p>{msg.text}</p>

                {/* Optional Interactive Action Trigger in AI message */}
                {msg.actionPrompt && (
                  <button
                    onClick={() => {
                      onApplyAction(msg.actionPrompt!.type);
                    }}
                    className="mt-3 w-full py-2 px-3 rounded-xl bg-[#E5ECE0] hover:bg-[#344E27] text-[#344E27] hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{msg.actionPrompt.label}</span>
                  </button>
                )}
              </div>
            </div>

            <span className="text-[10px] text-neutral-400 mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 bg-white p-3 rounded-2xl border border-neutral-200/60 max-w-[120px] shadow-2xs">
            <span className="w-2 h-2 bg-[#344E27] rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-[#344E27] rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 bg-[#344E27] rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      <div className="p-3 bg-white border-t border-neutral-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-[#E5ECE0] text-neutral-700 hover:text-[#344E27] text-[11px] font-semibold whitespace-nowrap transition-colors border border-neutral-200/60"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-4 border-t border-neutral-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything about your trip..."
            className="flex-1 px-4 py-3 rounded-full bg-neutral-100 border border-neutral-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27] focus:bg-white"
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className="w-11 h-11 rounded-full bg-[#344E27] hover:bg-[#273D1C] disabled:bg-neutral-300 text-white flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
