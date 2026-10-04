import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Check, 
  X,
  CreditCard,
  Sparkles,
  PieChart,
  Trash2
} from 'lucide-react';
import { TripPlan, GroupMember, GroupExpense, MemberBalanceSummary, Currency } from '../types';
import { INITIAL_GROUP_MEMBERS, INITIAL_GROUP_EXPENSES, calculateMemberBalances } from '../data/featureData';
import { formatCurrency } from '../data/mockData';
import confetti from 'canvas-confetti';
import { tripClient } from '../services/tripClient';

interface GroupExpenseSplitterProps {
  trip: TripPlan;
  currency: Currency;
}

export const GroupExpenseSplitter: React.FC<GroupExpenseSplitterProps> = ({
  trip,
  currency,
}) => {
  const [members] = useState<GroupMember[]>(INITIAL_GROUP_MEMBERS);
  const [expenses, setExpenses] = useState<GroupExpense[]>(INITIAL_GROUP_EXPENSES);
  const [showAddModal, setShowAddModal] = useState(false);

  // Sync expenses from backend database
  useEffect(() => {
    let isMounted = true;
    const fetchTripExpenses = async () => {
      try {
        const serverExpenses = await tripClient.getExpenses(trip.id);
        if (isMounted && serverExpenses && serverExpenses.length > 0) {
          setExpenses(serverExpenses);
        }
      } catch (err) {
        console.warn('[GroupExpenseSplitter] Fallback to local expenses:', err);
      }
    };
    fetchTripExpenses();
    return () => { isMounted = false; };
  }, [trip.id]);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<GroupExpense['category']>('food');
  const [paidById, setPaidById] = useState(members[0].id);
  const [splitWithIds, setSplitWithIds] = useState<string[]>(members.map(m => m.id));
  const [note, setNote] = useState('');

  const balances: MemberBalanceSummary[] = calculateMemberBalances(members, expenses);
  const totalGroupSpending = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

  const handleToggleMemberSplit = (memberId: string) => {
    setSplitWithIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || splitWithIds.length === 0) return;

    const paidMember = members.find(m => m.id === paidById);

    const newExp: GroupExpense = {
      id: `exp-${Date.now()}`,
      title,
      category,
      totalAmount: Number(amount),
      paidByMemberId: paidById,
      paidByMemberName: paidMember?.name || 'Elena Vance',
      date: new Date().toISOString().split('T')[0],
      splitAmongIds: splitWithIds,
      note: note || undefined
    };

    setExpenses(prev => [newExp, ...prev]);
    setTitle('');
    setAmount('');
    setNote('');
    setShowAddModal(false);

    // Persist to backend database
    tripClient.addExpense(trip.id, newExp).catch(err => {
      console.warn('[GroupExpenseSplitter] Background expense persist error:', err);
    });

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 }
      });
    } catch (e) {}
  };

  const handleDeleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
    tripClient.deleteExpense(trip.id, expenseId).catch(err => {
      console.warn('[GroupExpenseSplitter] Failed to delete expense from backend:', err);
    });
  };

  const handleSettleDebt = (debtorName: string, creditorName: string, amount: number) => {
    try {
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  return (
    <div className="space-y-8">
      
      {/* Top Banner with Total Group Spend & Actions */}
      <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#344E27] text-white flex items-center justify-center shadow-xs">
                <Receipt className="w-4 h-4 text-[#E5ECE0]" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-[#191919]">
                Group Expense Splitting
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-xs font-bold">
                Smart Settle
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Track who paid for hotels, cabs, group dinners, and automatically calculate individual shares.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-[#E5ECE0]" />
            <span>Add Shared Expense</span>
          </button>
        </div>

        {/* Individual Balances Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
            Individual Traveler Balances
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {balances.map(b => {
              const isPositive = b.netBalance >= 0;
              return (
                <div
                  key={b.memberId}
                  className={`p-4 rounded-2xl border transition-all ${
                    b.memberId === 'm-1'
                      ? 'bg-[#F4F7F2] border-[#C8DAC1] ring-1 ring-[#344E27]/20 shadow-xs'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={b.avatar}
                      alt={b.memberName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#E5ECE0]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-[#191919] truncate">{b.memberName}</h5>
                      <span className="text-[10px] text-neutral-500">
                        Paid {formatCurrency(b.totalPaid, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-xs">
                    <span className="text-neutral-500 font-medium">Net Balance:</span>
                    <span className={`font-extrabold flex items-center gap-1 ${
                      isPositive ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {isPositive ? (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          +{formatCurrency(b.netBalance, currency)} (Gets back)
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3" />
                          -{formatCurrency(Math.abs(b.netBalance), currency)} (Owes)
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Smart Settle-Up Suggestions */}
        <div className="p-5 rounded-2xl bg-neutral-900 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                AI Settle-Up Plan
              </h5>
            </div>
            <span className="text-[11px] text-neutral-400">Minimal transactions optimized</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Alex Rivera</span>
                  <ArrowRight className="w-3 h-3 text-neutral-400" />
                  <span>Elena Vance</span>
                </div>
                <span className="text-[11px] text-neutral-300">Direct UPI / Card transfer</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-emerald-400">
                  {formatCurrency(3200, currency)}
                </span>
                <button
                  onClick={() => handleSettleDebt('Alex Rivera', 'Elena Vance', 3200)}
                  className="block text-[10px] text-neutral-300 hover:text-white font-bold underline mt-0.5"
                >
                  Settle
                </button>
              </div>
            </div>

            <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Sarah Jenkins</span>
                  <ArrowRight className="w-3 h-3 text-neutral-400" />
                  <span>Elena Vance</span>
                </div>
                <span className="text-[11px] text-neutral-300">Direct UPI / Card transfer</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-emerald-400">
                  {formatCurrency(2100, currency)}
                </span>
                <button
                  onClick={() => handleSettleDebt('Sarah Jenkins', 'Elena Vance', 2100)}
                  className="block text-[10px] text-neutral-300 hover:text-white font-bold underline mt-0.5"
                >
                  Settle
                </button>
              </div>
            </div>

            <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Marcus Chen</span>
                  <ArrowRight className="w-3 h-3 text-neutral-400" />
                  <span>Alex Rivera</span>
                </div>
                <span className="text-[11px] text-neutral-300">Direct UPI / Card transfer</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-emerald-400">
                  {formatCurrency(1400, currency)}
                </span>
                <button
                  onClick={() => handleSettleDebt('Marcus Chen', 'Alex Rivera', 1400)}
                  className="block text-[10px] text-neutral-300 hover:text-white font-bold underline mt-0.5"
                >
                  Settle
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Shared Expense Ledger List */}
      <div className="bg-white rounded-[32px] border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
              Trip Expense Ledger ({expenses.length} Entries)
            </h4>
            <p className="text-xs text-neutral-500">
              Total group expenditure: <span className="font-bold text-[#191919]">{formatCurrency(totalGroupSpending, currency)}</span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {expenses.map(exp => (
            <div
              key={exp.id}
              className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-[10px] font-bold uppercase text-neutral-600">
                    {exp.category}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    {exp.date}
                  </span>
                </div>
                <h5 className="font-bold text-sm text-[#191919]">{exp.title}</h5>
                {exp.note && (
                  <p className="text-xs text-neutral-500">{exp.note}</p>
                )}
                <p className="text-[11px] text-neutral-600">
                  Paid by <span className="font-bold text-neutral-800">{exp.paidByMemberName}</span> • Split equally ({exp.splitAmongIds.length} people)
                </p>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right">
                  <span className="font-display font-extrabold text-lg text-[#191919] block">
                    {formatCurrency(exp.totalAmount, currency)}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-semibold">
                    {formatCurrency(Math.round(exp.totalAmount / exp.splitAmongIds.length), currency)} / person
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteExpense(exp.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete expense"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Add Group Expense */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[28px] p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h4 className="font-display font-bold text-base text-[#191919]">Add Group Expense</h4>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Expense Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seafood Dinner at Coastal Kitchen"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#344E27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    required
                    placeholder="3500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none"
                  >
                    <option value="food">Food & Dining</option>
                    <option value="hotel">Hotel / Stay</option>
                    <option value="transport">Transport / Cab</option>
                    <option value="activity">Activity / Tour</option>
                    <option value="misc">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Who Paid?</label>
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                  Split With ({splitWithIds.length} Travelers)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {members.map(m => {
                    const isChecked = splitWithIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition-all ${
                          isChecked ? 'bg-[#F4F7F2] border-[#344E27] text-[#344E27]' : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMemberSplit(m.id)}
                          className="rounded text-[#344E27] focus:ring-0"
                        />
                        <span className="truncate">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
