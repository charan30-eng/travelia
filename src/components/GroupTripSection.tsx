import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Check, 
  Copy, 
  X
} from 'lucide-react';
import { TripPlan, GroupMember, Currency, ItineraryActivity } from '../types';
import { INITIAL_GROUP_MEMBERS } from '../data/featureData';

interface GroupTripSectionProps {
  trip: TripPlan;
  onAddActivityToDay?: (dayNumber: number, activity: ItineraryActivity) => void;
  currency?: Currency;
}

export const GroupTripSection: React.FC<GroupTripSectionProps> = ({
  trip,
}) => {
  const [members, setMembers] = useState<GroupMember[]>(INITIAL_GROUP_MEMBERS);
  const [isCopied, setIsCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

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
            Invite co-travelers and coordinate your shared trip itinerary in real time.
          </p>
        </div>

        {/* Top Invite Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 transition-all flex items-center gap-1.5 border border-neutral-200 cursor-pointer"
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
            Co-travelers collaborating on this itinerary
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
                <p className="text-[10px] text-neutral-500 capitalize mt-0.5">
                  {member.role === 'organizer' ? 'Lead Organizer' : 'Confirmed Traveler'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                  Co-travelers can view the daily schedule, coordinate plans, and split shared trip expenses.
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
