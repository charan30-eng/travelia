import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ThumbsUp, 
  ThumbsDown, 
  Check, 
  Copy, 
  Sparkles, 
  Plus, 
  Share2, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  DollarSign,
  MapPin,
  X
} from 'lucide-react';
import { TripPlan, GroupMember, SuggestedPlace, Currency, ItineraryActivity } from '../types';
import { INITIAL_GROUP_MEMBERS, INITIAL_SUGGESTED_PLACES } from '../data/featureData';
import { formatCurrency } from '../data/mockData';
import confetti from 'canvas-confetti';

interface GroupTripSectionProps {
  trip: TripPlan;
  onAddActivityToDay: (dayNumber: number, activity: ItineraryActivity) => void;
  currency: Currency;
}

export const GroupTripSection: React.FC<GroupTripSectionProps> = ({
  trip,
  onAddActivityToDay,
  currency,
}) => {
  const [members, setMembers] = useState<GroupMember[]>(INITIAL_GROUP_MEMBERS);
  const [suggestions, setSuggestions] = useState<SuggestedPlace[]>(INITIAL_SUGGESTED_PLACES);
  const [isCopied, setIsCopied] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Suggest Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Sight' | 'Food' | 'Beach' | 'Nightlife' | 'Activity'>('Activity');
  const [newLocation, setNewLocation] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const shareableUrl = `https://travelia.ai/trip/${trip.id}?join=true`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(shareableUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleVote = (suggestionId: string, type: 'up' | 'down') => {
    setSuggestions(prev => prev.map(s => {
      if (s.id !== suggestionId) return s;

      const currentUserId = 'm-1';
      const existingVoteIdx = s.votes.findIndex(v => v.userId === currentUserId);
      let updatedVotes = [...s.votes];

      if (existingVoteIdx !== -1) {
        if (updatedVotes[existingVoteIdx].vote === type) {
          // Toggle off
          updatedVotes.splice(existingVoteIdx, 1);
        } else {
          // Switch vote
          updatedVotes[existingVoteIdx].vote = type;
        }
      } else {
        updatedVotes.push({ userId: currentUserId, vote: type });
      }

      const upCount = updatedVotes.filter(v => v.vote === 'up').length;
      const downCount = updatedVotes.filter(v => v.vote === 'down').length;
      const newScore = upCount - downCount;
      const totalPossible = members.length;
      const newStatus = (upCount / totalPossible) >= 0.5 ? 'approved' : 'voting';

      return {
        ...s,
        votes: updatedVotes,
        score: newScore,
        status: newStatus
      };
    }));
  };

  const handleCreateSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newSug: SuggestedPlace = {
      id: `sug-${Date.now()}`,
      suggestedBy: 'm-1',
      suggestedByName: 'Elena Vance (You)',
      title: newTitle,
      category: newCategory,
      location: newLocation || trip.destination,
      estimatedCost: Number(newCost) || 0,
      description: newDesc || 'Recommended by group traveler.',
      votes: [{ userId: 'm-1', vote: 'up' }],
      score: 1,
      status: 'voting'
    };

    setSuggestions(prev => [newSug, ...prev]);
    setNewTitle('');
    setNewLocation('');
    setNewCost('');
    setNewDesc('');
    setShowSuggestModal(false);

    try {
      confetti({
        particleCount: 30,
        spread: 45,
        origin: { y: 0.7 }
      });
    } catch (e) {}
  };

  const handleAddInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName) return;

    const newMem: GroupMember = {
      id: `m-${Date.now()}`,
      name: inviteName,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?q=80&w=200&auto=format&fit=crop`,
      role: 'co-traveler',
      status: 'active',
      voteCount: 0
    };

    setMembers(prev => [...prev, newMem]);
    setInviteName('');
    setInviteEmail('');
    setShowInviteModal(false);
  };

  const handleAddToItinerary = (sug: SuggestedPlace) => {
    const act: ItineraryActivity = {
      id: `act-group-${Date.now()}`,
      time: '03:30 PM',
      activity: sug.title,
      location: sug.location,
      estimatedCost: sug.estimatedCost,
      duration: '2 hrs',
      aiRecommendation: `Approved by group consensus (${sug.score} upvotes).`,
      category: sug.category === 'Food' ? 'food' : sug.category === 'Activity' ? 'adventure' : 'sightseeing',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop'
    };

    onAddActivityToDay(1, act);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  return (
    <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#344E27] text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4 text-[#E5ECE0]" />
            </div>
            <h3 className="font-display font-extrabold text-xl text-[#191919]">
              Group Trip Collaboration
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold">
              Travel Together
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Invite co-travelers, suggest must-visit spots, and vote on activities in real time.
          </p>
        </div>

        {/* Top Invite & Suggest Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 transition-all flex items-center gap-1.5 border border-neutral-200"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-500" />
                <span>Copy Invite Link</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#E5ECE0]" />
            <span>Invite Traveler</span>
          </button>
        </div>
      </div>

      {/* Trip Members Roster */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
            Trip Members ({members.length})
          </h4>
          <span className="text-xs text-neutral-500">
            All members can vote and submit suggestions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {members.map(member => (
            <div
              key={member.id}
              className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center gap-3 hover:border-neutral-300 transition-all"
            >
              <img
                src={member.avatar}
                alt={member.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#E5ECE0]"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h5 className="text-xs font-bold text-[#191919] truncate">{member.name}</h5>
                  {member.role === 'organizer' && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                      Host
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                  <ThumbsUp className="w-2.5 h-2.5 text-[#344E27]" /> {member.voteCount} Votes Cast
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Places & Live Voting Board */}
      <div className="space-y-4 pt-4 border-t border-neutral-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
              Activity Voting Board ({suggestions.length} Suggestions)
            </h4>
            <p className="text-xs text-neutral-500">
              Activities with 50%+ group approval can be added directly to the daily itinerary.
            </p>
          </div>

          <button
            onClick={() => setShowSuggestModal(true)}
            className="px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-extrabold flex items-center gap-1.5 self-start sm:self-auto shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Suggest a Place</span>
          </button>
        </div>

        {/* Suggestions List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map(sug => {
            const hasUpvoted = sug.votes.some(v => v.userId === 'm-1' && v.vote === 'up');
            const hasDownvoted = sug.votes.some(v => v.userId === 'm-1' && v.vote === 'down');
            const totalVotes = sug.votes.length;
            const approvalPercentage = Math.round((sug.votes.filter(v => v.vote === 'up').length / members.length) * 100);

            return (
              <div
                key={sug.id}
                className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-bold">
                      {sug.category}
                    </span>
                    {sug.status === 'approved' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Group Approved
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Voting in Progress
                      </span>
                    )}
                  </div>

                  <h5 className="font-display font-bold text-base text-[#191919]">
                    {sug.title}
                  </h5>

                  <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-neutral-400" /> {sug.location}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-neutral-800">
                      {sug.estimatedCost > 0 ? formatCurrency(sug.estimatedCost, currency) : 'Free Admission'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {sug.description}
                  </p>

                  <p className="text-[10px] text-neutral-400">
                    Suggested by <span className="font-bold text-neutral-700">{sug.suggestedByName}</span>
                  </p>
                </div>

                {/* Consensus Bar & Vote Buttons */}
                <div className="pt-3 border-t border-neutral-100 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="text-neutral-600">Consensus Meter</span>
                      <span className="text-[#344E27]">{approvalPercentage}% Approved</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div 
                        className="h-full bg-[#344E27] rounded-full transition-all duration-500"
                        style={{ width: `${approvalPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleVote(sug.id, 'up')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                          hasUpvoted
                            ? 'bg-[#344E27] text-white shadow-xs'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{sug.votes.filter(v => v.vote === 'up').length}</span>
                      </button>

                      <button
                        onClick={() => handleVote(sug.id, 'down')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                          hasDownvoted
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {sug.status === 'approved' && (
                      <button
                        onClick={() => handleAddToItinerary(sug)}
                        className="px-3.5 py-1.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add to Itinerary</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Suggest Place */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[28px] p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h4 className="font-display font-bold text-base text-[#191919]">Suggest Place to Group</h4>
              <button onClick={() => setShowSuggestModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSuggestion} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Place or Activity Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scuba Diving at Grande Island"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#344E27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none"
                  >
                    <option value="Activity">Activity</option>
                    <option value="Sight">Sightseeing</option>
                    <option value="Food">Food & Dining</option>
                    <option value="Beach">Beach</option>
                    <option value="Nightlife">Nightlife</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Est. Cost ({currency})</label>
                  <input
                    type="number"
                    placeholder="1200"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. South Goa Shore"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Why should we visit?</label>
                <textarea
                  rows={2}
                  placeholder="Great dolphin views and crystal clear waters."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuggestModal(false)}
                  className="px-4 py-2 rounded-full border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  Submit Suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Invite Traveler */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[28px] p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h4 className="font-display font-bold text-base text-[#191919]">Invite Co-Traveler</h4>
              <button onClick={() => setShowInviteModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddInvite} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Traveler Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#344E27]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="maya@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#F4F6F3] rounded-xl text-xs text-neutral-600 space-y-1">
                <span className="font-bold text-[#344E27] block">Instant Collaboration Access</span>
                <p className="text-[11px]">
                  Co-travelers can vote on places, view the daily schedule, and split shared trip expenses.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-full border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
