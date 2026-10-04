import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Check, 
  DollarSign, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle, 
  Eye, 
  Clock, 
  ShieldCheck,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { ChatMessage, TripPlan } from '../types';
import { sendChatMessage, OptimizationResult, AIActionProposal } from '../services/aiClient';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripPlan;
  onApplyAction: (actionType: string) => void;
  onOpenOptimizationModal?: (result?: OptimizationResult) => void;
  onApplyOptimization?: (result: OptimizationResult) => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    sender: 'ai',
    text: "Hello! I am Travelia AI, your real-time travel decision & optimization copilot.\n\nI have direct access to Travelia's authoritative engine services:\n• Places (Google Places validation & operating hours)\n• Routes (OSRM road-network transit matrix)\n• Weather (Open-Meteo 16-day forecasts & rain alerts)\n• Budget (Dual-currency itemized cost ledger)\n• Health (7-dimension deterministic scoring)\n• Optimization (Multi-objective Pareto replanner)\n• What-If (Scenario simulations & deltas)\n• Flights (Aviation routes & cabin classes)\n• Currency (Live FX exchange conversions)\n\nAsk me any question or click a domain below to calculate recommendations!",
    timestamp: 'Just now'
  }
];

const SUGGESTED_QUESTIONS = [
  "Explain my Trip Health Score calculation",
  "What if it rains tomorrow?",
  "Reduce unnecessary transit travel and backtracking",
  "Make my trip cheaper without losing top highlights",
  "Which day is too packed with activities?",
  "What if I switch my hotel to cut commute time?",
  "Show budget breakdown in INR and foreign currency",
  "Verify ratings and hours for my tourist sights",
  "Check roundtrip flight baggage and connection schedule",
  "Explain every optimization calculation you performed"
];

const LOADING_STATUSES = [
  "Analyzing itinerary...",
  "Checking your budget...",
  "Calculating route efficiency...",
  "Comparing alternatives...",
  "Preparing recommendations..."
];

export const AIChatModal: React.FC<AIChatModalProps> = ({
  isOpen,
  onClose,
  trip,
  onApplyAction,
  onOpenOptimizationModal,
  onApplyOptimization,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingStatusIdx, setLoadingStatusIdx] = useState(0);
  const [appliedProposalIds, setAppliedProposalIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Contextual loading status rotator while waiting for real API response
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTyping) {
      interval = setInterval(() => {
        setLoadingStatusIdx((prev) => (prev + 1) % LOADING_STATUSES.length);
      }, 1600);
    } else {
      setLoadingStatusIdx(0);
    }
    return () => clearInterval(interval);
  }, [isTyping]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      // Build conversation history for multi-turn Gemini reasoning context
      const history = messages
        .filter((m) => !m.isError)
        .slice(-10)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      // Direct backend API call to POST /api/ai/chat
      const aiResponse = await sendChatMessage(trip, text, history);

      const resolvedOptResult: OptimizationResult | undefined = 
        aiResponse.actionProposal?.optimizationResult || 
        aiResponse.proposedChanges;

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponse.reply || aiResponse.message || "I've analyzed your itinerary.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionProposal: aiResponse.actionProposal as any,
        optimizationResult: resolvedOptResult,
        insights: aiResponse.insights,
        suggestedFollowUps: aiResponse.suggestedFollowUps
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('[AIChatModal] Communication error:', err);
      // Graceful error state with retry (Requirement 13 & 28)
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'ai',
        text: "Travelia AI is temporarily unavailable. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        rawQuery: text
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleApplyClick = (msgId: string, optResult?: OptimizationResult, actionType?: string) => {
    if (optResult && onApplyOptimization) {
      onApplyOptimization(optResult);
      setAppliedProposalIds((prev) => new Set(prev).add(msgId));
    } else if (optResult && onOpenOptimizationModal) {
      onOpenOptimizationModal(optResult);
    } else if (actionType) {
      onApplyAction(actionType);
      setAppliedProposalIds((prev) => new Set(prev).add(msgId));
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-250">
      
      {/* Drawer Header */}
      <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-[#FBFBFB]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#344E27] text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 fill-current text-[#E5ECE0]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-display font-extrabold text-base text-[#191919]">Travelia AI Copilot</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Gemini Active
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 font-medium">
              Live copilot for {trip.destination} • {trip.days} Days • ₹{trip.budget.total.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Close AI Copilot"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 9-Domain Engine Intelligence Strip */}
      <div className="px-4 py-2 bg-neutral-100/70 border-b border-neutral-200/80 flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold">
        <span className="text-neutral-400 uppercase tracking-wider text-[9px] shrink-0">Engine Tools:</span>
        {[
          { label: '📍 Places', query: 'Verify place details, ratings, and operating hours for my trip.' },
          { label: '🗺️ Routes', query: 'Analyze route efficiency and calculate travel transit times between stops.' },
          { label: '🌦️ Weather', query: 'Check the 16-day meteorological forecast and rain advisories.' },
          { label: '💳 Budget', query: 'Audit my itemized budget breakdown across lodging, food, and activities.' },
          { label: '📊 Health', query: 'Explain the 7-dimension Trip Health Score calculation and recommendations.' },
          { label: '⚡ Optimize', query: 'Run multi-objective optimization to eliminate backtracking and reduce costs.' },
          { label: '🔮 What-If', query: 'Simulate a what-if scenario: what if it rains tomorrow?' },
          { label: '✈️ Flights', query: 'Review roundtrip flight logistics, baggage allowance, and boarding details.' },
          { label: '💱 Currency', query: 'Explain the exchange rates and dual-currency breakdown for this destination.' }
        ].map((d) => (
          <button
            key={d.label}
            onClick={() => handleSend(d.query)}
            disabled={isTyping}
            className="px-2.5 py-1 rounded-full bg-white hover:bg-[#344E27] text-neutral-700 hover:text-white border border-neutral-200 hover:border-[#344E27] transition-all whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
            title={`Ask Copilot to analyze ${d.label}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-neutral-50/50">
        {messages.map((msg) => {
          const proposal = msg.actionProposal;
          const optResult = msg.optimizationResult || proposal?.optimizationResult;
          const isApplied = appliedProposalIds.has(msg.id);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-start gap-2.5 max-w-[94%]">
                {msg.sender === 'ai' && (
                  <div className={`w-7 h-7 rounded-full ${msg.isError ? 'bg-amber-600' : 'bg-[#344E27]'} text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1 shadow-xs`}>
                    {msg.isError ? <AlertCircle className="w-4 h-4" /> : 'AI'}
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#344E27] text-white rounded-br-xs shadow-2xs font-medium'
                      : msg.isError
                      ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-xs shadow-2xs space-y-2.5'
                      : 'bg-white text-[#191919] border border-neutral-200/80 rounded-bl-xs shadow-2xs space-y-2.5'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Friendly Error State with Retry Button */}
                  {msg.isError && msg.rawQuery && (
                    <div className="pt-2 border-t border-amber-200 flex items-center gap-2">
                      <button
                        onClick={() => handleSend(msg.rawQuery)}
                        disabled={isTyping}
                        className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                      <span className="text-[11px] text-amber-700">Check server connection and try again.</span>
                    </div>
                  )}

                  {/* AI Diagnostic Insights List */}
                  {msg.insights && msg.insights.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-neutral-100 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        AI Diagnostic Insights
                      </span>
                      {msg.insights.map((ins, i) => (
                        <div key={i} className="text-xs text-neutral-600 flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#344E27] shrink-0 mt-0.5" />
                          <span>{ins}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Structured AI Recommendation / Action Proposal Card */}
                  {(proposal || optResult) && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#F4F6F3] border border-[#D5E0D0] text-[#191919] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#344E27]">
                          <Sparkles className="w-4 h-4 fill-current text-[#344E27]" />
                          <span>{proposal?.label || 'Proposed AI Optimization'}</span>
                        </div>
                        {isApplied ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 font-bold text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Applied
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white font-bold text-neutral-600 border border-neutral-200">
                            Verified AI Plan
                          </span>
                        )}
                      </div>

                      {proposal?.description && (
                        <p className="text-xs text-neutral-600 leading-snug">
                          {proposal.description}
                        </p>
                      )}

                      {/* Verified Metric Badges */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {/* Health Score */}
                        <div className="bg-white p-2 rounded-lg border border-neutral-200 shadow-2xs">
                          <span className="text-[9px] text-neutral-400 uppercase block font-bold">Health Score</span>
                          <div className="flex items-center justify-center gap-1 font-extrabold text-xs text-emerald-700">
                            {optResult ? (
                              <>
                                <span>{optResult.healthScoreBefore}</span>
                                <ArrowRight className="w-2.5 h-2.5 text-neutral-400" />
                                <span className="text-sm font-black text-[#344E27]">{optResult.healthScoreAfter}</span>
                              </>
                            ) : proposal?.healthScoreDelta ? (
                              <span className="text-sm font-black text-[#344E27]">+{proposal.healthScoreDelta}</span>
                            ) : (
                              <span className="text-sm font-black text-[#344E27]">Optimal</span>
                            )}
                          </div>
                        </div>

                        {/* Est. Savings */}
                        <div className="bg-white p-2 rounded-lg border border-neutral-200 shadow-2xs">
                          <span className="text-[9px] text-neutral-400 uppercase block font-bold">Est. Savings</span>
                          <span className="font-extrabold text-xs text-emerald-600 block mt-0.5">
                            ₹{(optResult?.estimatedSavings ?? proposal?.estimatedSavings ?? 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Time Saved */}
                        <div className="bg-white p-2 rounded-lg border border-neutral-200 shadow-2xs">
                          <span className="text-[9px] text-neutral-400 uppercase block font-bold">Time Saved</span>
                          <span className="font-extrabold text-xs text-blue-600 block mt-0.5">
                            {optResult 
                              ? `${Math.round(optResult.travelTimeSavedHours * 10) / 10}h` 
                              : proposal?.travelTimeSavedMins 
                              ? `${proposal.travelTimeSavedMins}m` 
                              : '0m'}
                          </span>
                        </div>
                      </div>

                      {/* Action Approval Buttons (User Approval Mandatory - Requirement 16 & 17) */}
                      <div className="flex items-center gap-2 pt-1">
                        {optResult && onOpenOptimizationModal && (
                          <button
                            onClick={() => onOpenOptimizationModal(optResult)}
                            className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-neutral-100 text-[#344E27] font-bold text-xs border border-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview Diff</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleApplyClick(msg.id, optResult, proposal?.type)}
                          disabled={isApplied}
                          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                            isApplied
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                              : 'bg-[#344E27] hover:bg-[#273D1C] text-white active:scale-98'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isApplied ? 'Changes Applied' : 'Apply Changes'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Suggested follow-up prompt chips */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {msg.suggestedFollowUps.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(sug)}
                          disabled={isTyping}
                          className="px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-[#E5ECE0] text-neutral-700 hover:text-[#344E27] text-[11px] font-semibold transition-colors border border-neutral-200/60 text-left disabled:opacity-50 cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <span className="text-[10px] text-neutral-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {/* Intelligent Contextual Loading State Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2.5 text-xs text-neutral-500 bg-white p-3.5 rounded-2xl border border-neutral-200/70 max-w-[340px] shadow-2xs animate-pulse">
            <div className="flex items-center gap-1 text-[#344E27]">
              <span className="w-2 h-2 bg-[#344E27] rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-[#344E27] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 bg-[#344E27] rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[11px] font-medium text-neutral-600 truncate">
              {LOADING_STATUSES[loadingStatusIdx]}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="p-3 bg-white border-t border-neutral-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            disabled={isTyping}
            className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-[#E5ECE0] text-neutral-700 hover:text-[#344E27] text-[11px] font-semibold whitespace-nowrap transition-colors border border-neutral-200/60 disabled:opacity-50 cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Input Form */}
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
            disabled={isTyping}
            placeholder="Ask AI anything about your trip..."
            className="flex-1 px-4 py-3 rounded-full bg-neutral-100 border border-neutral-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#344E27] focus:bg-white disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-11 h-11 rounded-full bg-[#344E27] hover:bg-[#273D1C] disabled:bg-neutral-300 text-white flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
