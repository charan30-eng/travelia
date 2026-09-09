import React, { useState, useEffect } from 'react';
import {
  X,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  User,
  Users,
  Check,
  CheckCircle2,
  ShieldCheck,
  Luggage,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  Tag,
  AlertCircle,
  Clock,
  Calendar,
  Download,
  Share2,
  Lock,
  ChevronRight,
  Copy,
  Info,
  HeartHandshake
} from 'lucide-react';
import { TripPlan, Currency, FlightSegment, FlightOption, FlightPassenger, FlightBookingRecord } from '../types';
import { formatCurrency } from '../data/mockData';
import confetti from 'canvas-confetti';

interface FlightBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripPlan;
  currency: Currency;
  outboundFlight: FlightSegment;
  returnFlight: FlightSegment;
  onBookingComplete: (booking: FlightBookingRecord) => void;
  onToast: (message: string) => void;
}

export const FlightBookingModal: React.FC<FlightBookingModalProps> = ({
  isOpen,
  onClose,
  trip,
  currency,
  outboundFlight,
  returnFlight,
  onBookingComplete,
  onToast
}) => {
  // Step tracker: 1=Travelers, 2=Seats, 3=Addons, 4=Payment, 5=Confirmation
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Flight legs selection
  const [selectedOutbound, setSelectedOutbound] = useState<FlightSegment>(outboundFlight);
  const [selectedReturn, setSelectedReturn] = useState<FlightSegment>(returnFlight);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(true);

  // Travelers count & list
  const travelerCount = Math.max(1, trip.travelers || 2);
  const [passengers, setPassengers] = useState<FlightPassenger[]>([
    {
      id: 'pax-1',
      type: 'adult',
      title: 'Mr',
      firstName: 'Charan',
      lastName: 'Sivakumar',
      age: 28,
      gender: 'male',
      seatOutbound: '12A',
      seatReturn: '14D',
      mealPreference: 'Standard Vegetarian',
      passportOrId: 'G84920194'
    },
    ...(travelerCount > 1
      ? [
          {
            id: 'pax-2',
            type: 'adult' as const,
            title: 'Ms',
            firstName: 'Priya',
            lastName: 'Sharma',
            age: 27,
            gender: 'female' as const,
            seatOutbound: '12B',
            seatReturn: '14E',
            mealPreference: 'Jain Meal',
            passportOrId: 'A71029481'
          }
        ]
      : [])
  ]);

  // Primary contact
  const [contactEmail, setContactEmail] = useState<string>('charansivakumar30@gmail.com');
  const [contactPhone, setContactPhone] = useState<string>('+91 98765 43210');
  const [whatsappAlerts, setWhatsappAlerts] = useState<boolean>(true);

  // Seat selection state
  const [activeSeatLeg, setActiveSeatLeg] = useState<'outbound' | 'return'>('outbound');
  const [activePassengerIndex, setActivePassengerIndex] = useState<number>(0);

  // Add-ons
  const [baggageTier, setBaggageTier] = useState<'standard' | 'hand-only' | 'plus5kg' | 'plus10kg'>('standard');
  const [hasInsurance, setHasInsurance] = useState<boolean>(true);
  const [hasFlexibleCancellation, setHasFlexibleCancellation] = useState<boolean>(false);
  const [carbonOffset, setCarbonOffset] = useState<boolean>(true);

  // Promo code
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>({
    code: 'TRAVELIA500',
    discount: 500
  });
  const [promoError, setPromoError] = useState<string | null>(null);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'split'>('upi');
  const [upiId, setUpiId] = useState<string>('charan@okhdfcbank');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [cardDetails, setCardDetails] = useState({
    number: '4532 •••• •••• 8821',
    holder: 'CHARAN SIVAKUMAR',
    expiry: '09/29',
    cvv: '•••'
  });
  const [selectedBank, setSelectedBank] = useState<string>('HDFC Bank');

  // Confirmed booking record
  const [completedBooking, setCompletedBooking] = useState<FlightBookingRecord | null>(null);

  useEffect(() => {
    setSelectedOutbound(outboundFlight);
    setSelectedReturn(returnFlight);
  }, [outboundFlight, returnFlight]);

  if (!isOpen) return null;

  // Pricing calculations
  const outboundBase = selectedOutbound.pricePerPerson * passengers.length;
  const returnBase = isRoundTrip ? selectedReturn.pricePerPerson * passengers.length : 0;
  const baseFareTotal = outboundBase + returnBase;

  // Taxes and airport fees (approx 12% in India)
  const taxesAndFees = Math.round(baseFareTotal * 0.12);

  // Seat charges
  const seatChargeOutbound = passengers.reduce((sum, p) => {
    if (p.seatOutbound?.startsWith('1')) return sum + 650; // Front / Extra legroom
    if (p.seatOutbound?.includes('A') || p.seatOutbound?.includes('F')) return sum + 250; // Window
    if (p.seatOutbound?.includes('C') || p.seatOutbound?.includes('D')) return sum + 200; // Aisle
    return sum; // Middle free
  }, 0);

  const seatChargeReturn = isRoundTrip
    ? passengers.reduce((sum, p) => {
        if (p.seatReturn?.startsWith('1')) return sum + 650;
        if (p.seatReturn?.includes('A') || p.seatReturn?.includes('F')) return sum + 250;
        if (p.seatReturn?.includes('C') || p.seatReturn?.includes('D')) return sum + 200;
        return sum;
      }, 0)
    : 0;

  const totalSeatCharges = seatChargeOutbound + seatChargeReturn;

  // Add-ons calculations
  let baggageDelta = 0;
  if (baggageTier === 'hand-only') baggageDelta = -400 * passengers.length;
  if (baggageTier === 'plus5kg') baggageDelta = 1200 * passengers.length;
  if (baggageTier === 'plus10kg') baggageDelta = 2100 * passengers.length;

  const insuranceTotal = hasInsurance ? 199 * passengers.length : 0;
  const flexCancelTotal = hasFlexibleCancellation ? 399 * passengers.length : 0;
  const carbonOffsetTotal = carbonOffset ? 49 * passengers.length : 0;

  const promoDiscount = appliedPromo ? appliedPromo.discount : 0;

  const grandTotal = Math.max(
    0,
    baseFareTotal +
      taxesAndFees +
      totalSeatCharges +
      baggageDelta +
      insuranceTotal +
      flexCancelTotal +
      carbonOffsetTotal -
      promoDiscount
  );

  // Apply promo code handler
  const handleApplyPromo = () => {
    const cleaned = promoCodeInput.trim().toUpperCase();
    if (cleaned === 'TRAVELIA500' || cleaned === 'FLY500') {
      setAppliedPromo({ code: cleaned, discount: 500 });
      setPromoError(null);
      onToast(`Promo code ${cleaned} applied! Saved ₹500`);
    } else if (cleaned === 'FLYGOA' || cleaned === 'BEACH1000') {
      setAppliedPromo({ code: cleaned, discount: 1000 });
      setPromoError(null);
      onToast(`Super promo ${cleaned} applied! Saved ₹1,000`);
    } else if (!cleaned) {
      setPromoError('Please enter a voucher code');
    } else {
      setPromoError('Invalid or expired coupon code. Try TRAVELIA500 or FLYGOA');
    }
  };

  // Add / remove passenger
  const handleAddPassenger = () => {
    if (passengers.length >= 6) {
      onToast('Maximum 6 passengers per single transaction');
      return;
    }
    const newIdx = passengers.length + 1;
    const newPax: FlightPassenger = {
      id: `pax-${newIdx}`,
      type: 'adult',
      title: 'Mr',
      firstName: '',
      lastName: '',
      age: 26,
      gender: 'male',
      seatOutbound: `14${String.fromCharCode(65 + passengers.length)}`,
      seatReturn: `15${String.fromCharCode(65 + passengers.length)}`,
      mealPreference: 'Standard Vegetarian'
    };
    setPassengers([...passengers, newPax]);
    onToast(`Added Passenger ${newIdx}`);
  };

  const handleRemovePassenger = (id: string) => {
    if (passengers.length <= 1) {
      onToast('At least one traveler is required');
      return;
    }
    setPassengers(passengers.filter(p => p.id !== id));
  };

  // Update passenger field
  const updatePassenger = (index: number, field: keyof FlightPassenger, val: any) => {
    const next = [...passengers];
    next[index] = { ...next[index], [field]: val };
    setPassengers(next);
  };

  // Handle seat map selection
  const handleSelectSeat = (seatNum: string) => {
    const currentPax = passengers[activePassengerIndex];
    if (!currentPax) return;

    if (activeSeatLeg === 'outbound') {
      updatePassenger(activePassengerIndex, 'seatOutbound', seatNum);
    } else {
      updatePassenger(activePassengerIndex, 'seatReturn', seatNum);
    }

    // Move to next passenger if available
    if (activePassengerIndex < passengers.length - 1) {
      setActivePassengerIndex(activePassengerIndex + 1);
    }
  };

  // Handle Final Payment & Ticket Issuance
  const handleConfirmAndPay = () => {
    setIsProcessingPayment(true);

    setTimeout(() => {
      setIsProcessingPayment(false);
      const generatedPnr = `TRV-${selectedOutbound.airlineCode}${Math.floor(1000 + Math.random() * 9000)}`;

      const newBookingRecord: FlightBookingRecord = {
        id: `bk-${Date.now()}`,
        pnr: generatedPnr,
        bookingDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        status: 'ticketed',
        tripId: trip.id,
        destination: trip.destination,
        outboundFlight: {
          ...selectedOutbound,
          bookingRef: generatedPnr,
          seatAssignment: passengers.map(p => p.seatOutbound).filter(Boolean).join(', ')
        },
        returnFlight: {
          ...selectedReturn,
          bookingRef: generatedPnr,
          seatAssignment: passengers.map(p => p.seatReturn).filter(Boolean).join(', ')
        },
        passengers: passengers,
        contactEmail,
        contactPhone,
        totalAmount: grandTotal,
        paymentMethod,
        paymentRef: `TXN-${Date.now().toString().slice(-8)}`,
        hasTravelInsurance: hasInsurance,
        hasFlexibleCancellation,
        extraBaggageKg: baggageTier === 'plus5kg' ? 5 : baggageTier === 'plus10kg' ? 10 : 0,
        carbonOffset,
        promoCodeApplied: appliedPromo?.code,
        discountAmount: appliedPromo?.discount
      };

      setCompletedBooking(newBookingRecord);
      setCurrentStep(5);
      onBookingComplete(newBookingRecord);

      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      onToast(`Flight booked successfully! PNR: ${generatedPnr}`);
    }, 1400);
  };

  // Download official E-Ticket
  const handleDownloadETicket = () => {
    if (!completedBooking) return;
    const ticketDoc = {
      airlineBookingReference: completedBooking.pnr,
      bookingStatus: 'CONFIRMED & ISSUED (IATA)',
      issueDate: completedBooking.bookingDate,
      itinerary: {
        destination: trip.destination,
        outbound: completedBooking.outboundFlight,
        returnFlight: isRoundTrip ? completedBooking.returnFlight : null
      },
      passengers: completedBooking.passengers,
      contact: {
        email: completedBooking.contactEmail,
        phone: completedBooking.contactPhone
      },
      paymentSummary: {
        totalPaid: completedBooking.totalAmount,
        currency: currency,
        method: completedBooking.paymentMethod,
        transactionRef: completedBooking.paymentRef
      }
    };

    const blob = new Blob([JSON.stringify(ticketDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `E-TICKET_${completedBooking.pnr}_${trip.destination.toUpperCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast('E-Ticket & Tax Invoice downloaded successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden my-auto">
        
        {/* MODAL TOP HEADER */}
        <div className="bg-[#344E27] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 relative">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Instant Airline Direct Booking
              </span>
              <span className="text-xs text-neutral-300 font-semibold">IATA Accredited</span>
            </div>
            <h2 className="font-display font-black text-xl sm:text-2xl text-white mt-1">
              Book Flights to {trip.destination}
            </h2>
            <p className="text-xs text-neutral-300">
              {selectedOutbound.originCity} ({selectedOutbound.originCode}) ⇄ {selectedOutbound.destinationCity} ({selectedOutbound.destinationCode}) • Direct in-app ticket issuance
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 sm:static w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEPPER PROGRESS BAR (Steps 1 to 4) */}
        {currentStep < 5 && (
          <div className="bg-neutral-50 px-6 py-3 border-b border-neutral-200 shrink-0">
            <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-bold">
              
              <button
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-1.5 cursor-pointer ${
                  currentStep === 1 ? 'text-[#344E27]' : currentStep > 1 ? 'text-emerald-700' : 'text-neutral-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    currentStep === 1
                      ? 'bg-[#344E27] text-white'
                      : currentStep > 1
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                </div>
                <span>1. Travelers</span>
              </button>

              <div className={`h-0.5 flex-1 mx-2 ${currentStep > 1 ? 'bg-emerald-600' : 'bg-neutral-200'}`} />

              <button
                onClick={() => setCurrentStep(2)}
                className={`flex items-center gap-1.5 cursor-pointer ${
                  currentStep === 2 ? 'text-[#344E27]' : currentStep > 2 ? 'text-emerald-700' : 'text-neutral-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    currentStep === 2
                      ? 'bg-[#344E27] text-white'
                      : currentStep > 2
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                </div>
                <span>2. Seat Map</span>
              </button>

              <div className={`h-0.5 flex-1 mx-2 ${currentStep > 2 ? 'bg-emerald-600' : 'bg-neutral-200'}`} />

              <button
                onClick={() => setCurrentStep(3)}
                className={`flex items-center gap-1.5 cursor-pointer ${
                  currentStep === 3 ? 'text-[#344E27]' : currentStep > 3 ? 'text-emerald-700' : 'text-neutral-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    currentStep === 3
                      ? 'bg-[#344E27] text-white'
                      : currentStep > 3
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
                </div>
                <span>3. Add-ons</span>
              </button>

              <div className={`h-0.5 flex-1 mx-2 ${currentStep > 3 ? 'bg-emerald-600' : 'bg-neutral-200'}`} />

              <button
                onClick={() => setCurrentStep(4)}
                className={`flex items-center gap-1.5 cursor-pointer ${
                  currentStep === 4 ? 'text-[#344E27]' : 'text-neutral-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    currentStep === 4 ? 'bg-[#344E27] text-white' : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  4
                </div>
                <span>4. Payment</span>
              </button>

            </div>
          </div>
        )}

        {/* MODAL BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          
          {/* ========================================================================= */}
          {/* STEP 1: TRAVELERS & CONTACT DETAILS */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              
              {/* Flight Summary Strip */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#344E27]">
                      Flight Itinerary Overview
                    </span>
                    <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Roundtrip Confirmed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-neutral-600 font-semibold cursor-pointer flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={isRoundTrip}
                        onChange={e => setIsRoundTrip(e.target.checked)}
                        className="rounded text-[#344E27] focus:ring-[#344E27]"
                      />
                      <span>Include Return Flight</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Outbound */}
                  <div className="bg-white p-3 rounded-xl border border-neutral-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold block uppercase">Outbound Leg</span>
                      <span className="font-extrabold text-[#191919]">{selectedOutbound.airline} • {selectedOutbound.flightNumber}</span>
                      <span className="text-neutral-500 block">{selectedOutbound.originCode} ➔ {selectedOutbound.destinationCode} ({selectedOutbound.departureTime})</span>
                    </div>
                    <span className="font-display font-extrabold text-sm text-[#191919]">
                      {formatCurrency(selectedOutbound.pricePerPerson, currency)}/pax
                    </span>
                  </div>

                  {/* Return */}
                  {isRoundTrip ? (
                    <div className="bg-white p-3 rounded-xl border border-neutral-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold block uppercase">Return Leg</span>
                        <span className="font-extrabold text-[#191919]">{selectedReturn.airline} • {selectedReturn.flightNumber}</span>
                        <span className="text-neutral-500 block">{selectedReturn.originCode} ➔ {selectedReturn.destinationCode} ({selectedReturn.departureTime})</span>
                      </div>
                      <span className="font-display font-extrabold text-sm text-[#191919]">
                        {formatCurrency(selectedReturn.pricePerPerson, currency)}/pax
                      </span>
                    </div>
                  ) : (
                    <div className="bg-neutral-100 p-3 rounded-xl border border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 text-xs">
                      One-way flight selected (Return excluded)
                    </div>
                  )}
                </div>
              </div>

              {/* Passengers Input Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-[#191919] flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#344E27]" />
                      <span>Passenger Details ({passengers.length})</span>
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Enter names exactly as they appear on official government photo ID / passport.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPassenger}
                    className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-[#344E27] hover:text-white text-[#191919] text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>+ Add Passenger</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {passengers.map((pax, index) => (
                    <div
                      key={pax.id}
                      className="p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#344E27] uppercase tracking-wider">
                          Passenger {index + 1} (Adult)
                        </span>
                        {passengers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePassenger(pax.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        {/* Title */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                            Title
                          </label>
                          <select
                            value={pax.title}
                            onChange={e => updatePassenger(index, 'title', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-semibold text-neutral-800 focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                          >
                            <option value="Mr">Mr</option>
                            <option value="Ms">Ms</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Dr">Dr</option>
                          </select>
                        </div>

                        {/* First Name */}
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                            First & Middle Name *
                          </label>
                          <input
                            type="text"
                            value={pax.firstName}
                            placeholder="e.g. Charan"
                            onChange={e => updatePassenger(index, 'firstName', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-medium text-neutral-800 focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                          />
                        </div>

                        {/* Last Name */}
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={pax.lastName}
                            placeholder="e.g. Sivakumar"
                            onChange={e => updatePassenger(index, 'lastName', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-medium text-neutral-800 focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                          />
                        </div>

                        {/* Age */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                            Age
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="110"
                            value={pax.age}
                            onChange={e => updatePassenger(index, 'age', parseInt(e.target.value) || 25)}
                            className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-medium text-neutral-800 focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                          />
                        </div>

                        {/* Gender */}
                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                            Gender
                          </label>
                          <select
                            value={pax.gender}
                            onChange={e => updatePassenger(index, 'gender', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-semibold text-neutral-800 focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        {/* Meal Preference */}
                        <div className="sm:col-span-4">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                            In-Flight Meal
                          </label>
                          <select
                            value={pax.mealPreference || 'Standard Vegetarian'}
                            onChange={e => updatePassenger(index, 'mealPreference', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-medium text-neutral-800 focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                          >
                            <option value="Standard Vegetarian">Standard Vegetarian</option>
                            <option value="Standard Non-Vegetarian">Standard Non-Vegetarian</option>
                            <option value="Jain Meal">Jain Meal (Strict Veg)</option>
                            <option value="Diabetic Friendly">Diabetic Friendly</option>
                            <option value="Fruit Platter">Fresh Fruit Platter</option>
                          </select>
                        </div>

                        {/* Passport / Govt ID */}
                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                            DigiYatra / Govt ID (Optional)
                          </label>
                          <input
                            type="text"
                            value={pax.passportOrId || ''}
                            placeholder="Aadhaar / Passport"
                            onChange={e => updatePassenger(index, 'passportOrId', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-medium text-neutral-800 focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Primary Contact & E-ticket Destination */}
              <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="font-display font-extrabold text-sm text-[#191919]">
                  Where should we send your E-Tickets & Gate Alerts?
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-medium text-neutral-800 focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                    />
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">
                      Confirmed PNR and tax invoice will be sent here.
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                      Mobile Number (for SMS & WhatsApp) *
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-medium text-neutral-800 focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                    />
                    <label className="text-[10px] text-neutral-600 font-semibold cursor-pointer flex items-center gap-1.5 mt-1.5">
                      <input
                        type="checkbox"
                        checked={whatsappAlerts}
                        onChange={e => setWhatsappAlerts(e.target.checked)}
                        className="rounded text-[#344E27] focus:ring-[#344E27]"
                      />
                      <span>Receive real-time WhatsApp gate and baggage belt alerts</span>
                    </label>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: CABIN SEAT MAP & SELECTION */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-[#191919]">
                    Select Preferred Airplane Seats
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Choose seats for each traveler. Middle seats are completely free!
                  </p>
                </div>

                {/* Leg Toggle */}
                {isRoundTrip && (
                  <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-full border border-neutral-200">
                    <button
                      onClick={() => setActiveSeatLeg('outbound')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        activeSeatLeg === 'outbound'
                          ? 'bg-[#344E27] text-white'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Outbound Leg ({selectedOutbound.originCode} ➔ {selectedOutbound.destinationCode})
                    </button>
                    <button
                      onClick={() => setActiveSeatLeg('return')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        activeSeatLeg === 'return'
                          ? 'bg-[#344E27] text-white'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Return Leg ({selectedReturn.originCode} ➔ {selectedReturn.destinationCode})
                    </button>
                  </div>
                )}
              </div>

              {/* Active Passenger Selector */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-neutral-500">Selecting for:</span>
                {passengers.map((pax, idx) => {
                  const assigned = activeSeatLeg === 'outbound' ? pax.seatOutbound : pax.seatReturn;
                  const isActive = activePassengerIndex === idx;

                  return (
                    <button
                      key={pax.id}
                      onClick={() => setActivePassengerIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-[#191919] text-white shadow-xs'
                          : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{pax.firstName || `Passenger ${idx + 1}`}</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-[#344E27] text-white text-[10px]">
                        Seat {assigned || 'None'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Seat Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-md bg-white border border-neutral-300" />
                  <span className="text-neutral-600">Standard Free (₹0)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-md bg-blue-50 border border-blue-300" />
                  <span className="text-neutral-600">Window / Aisle (+₹250)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-md bg-purple-50 border border-purple-300" />
                  <span className="text-neutral-600">Extra Legroom Front (+₹650)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-md bg-[#344E27] text-white text-[8px] flex items-center justify-center font-bold">✓</div>
                  <span className="text-neutral-900 font-bold">Selected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-md bg-neutral-200 opacity-60" />
                  <span className="text-neutral-400">Occupied</span>
                </div>
              </div>

              {/* Fuselage Cabin Grid */}
              <div className="bg-neutral-100/70 p-6 rounded-3xl border border-neutral-200 max-w-lg mx-auto">
                
                {/* Nose / Cockpit */}
                <div className="w-24 h-8 bg-neutral-300 rounded-t-full mx-auto mb-4 flex items-center justify-center text-[10px] font-bold text-neutral-600 uppercase">
                  Cockpit
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-400 mb-2">
                  <span>A</span>
                  <span>B</span>
                  <span>C</span>
                  <span className="text-[10px] text-neutral-400 uppercase">Aisle</span>
                  <span>D</span>
                  <span>E</span>
                  <span>F</span>
                </div>

                {/* Rows */}
                <div className="space-y-2">
                  {[1, 2, 3, 4, 11, 12, 14, 15].map(rowNum => {
                    const isExtraLegroom = rowNum === 1 || rowNum === 12;
                    const seats = ['A', 'B', 'C', 'AISLE', 'D', 'E', 'F'];

                    return (
                      <div key={rowNum} className="grid grid-cols-7 gap-2 items-center">
                        {seats.map((col, cIdx) => {
                          if (col === 'AISLE') {
                            return (
                              <div key={cIdx} className="text-center text-[10px] font-bold text-neutral-400">
                                Row {rowNum}
                              </div>
                            );
                          }

                          const seatId = `${rowNum}${col}`;
                          const isOccupied = rowNum === 2 && (col === 'A' || col === 'B');
                          const isSelectedByPax = passengers.some(p =>
                            activeSeatLeg === 'outbound' ? p.seatOutbound === seatId : p.seatReturn === seatId
                          );

                          let seatPrice = 0;
                          let seatBg = 'bg-white border-neutral-300 text-neutral-700 hover:border-[#344E27]';
                          if (isExtraLegroom) {
                            seatPrice = 650;
                            seatBg = 'bg-purple-50 border-purple-200 text-purple-800 hover:border-purple-400';
                          } else if (col === 'A' || col === 'F') {
                            seatPrice = 250;
                            seatBg = 'bg-blue-50 border-blue-200 text-blue-800 hover:border-blue-400';
                          } else if (col === 'C' || col === 'D') {
                            seatPrice = 200;
                            seatBg = 'bg-blue-50/60 border-blue-100 text-blue-700 hover:border-blue-300';
                          }

                          if (isSelectedByPax) {
                            seatBg = 'bg-[#344E27] border-[#344E27] text-white font-black shadow-xs';
                          } else if (isOccupied) {
                            seatBg = 'bg-neutral-200 border-neutral-200 text-neutral-400 cursor-not-allowed';
                          }

                          return (
                            <button
                              key={cIdx}
                              disabled={isOccupied}
                              onClick={() => handleSelectSeat(seatId)}
                              title={`Seat ${seatId} (${seatPrice === 0 ? 'Free' : `+₹${seatPrice}`})`}
                              className={`h-9 rounded-lg border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${seatBg}`}
                            >
                              {isSelectedByPax ? <Check className="w-3.5 h-3.5 text-white" /> : seatId}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
                  <span>Selected Seats Total:</span>
                  <span className="font-extrabold text-[#191919]">
                    {formatCurrency(totalSeatCharges, currency)}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: BAGGAGE, MEALS & TRAVEL PROTECTION */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display font-extrabold text-lg text-[#191919]">
                  Baggage & Travel Protection Add-ons
                </h3>
                <p className="text-xs text-neutral-500">
                  Tailor your baggage allowance and protect your trip against unexpected delays.
                </p>
              </div>

              {/* Baggage Tier Selector */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider block">
                  1. Check-In & Cabin Baggage
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Option 1: Standard Included */}
                  <div
                    onClick={() => setBaggageTier('standard')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      baggageTier === 'standard'
                        ? 'bg-[#E5ECE0]/60 border-[#344E27] ring-1 ring-[#344E27]'
                        : 'bg-white border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-bold text-sm text-[#191919]">Standard Baggage</span>
                        <span className="text-xs font-bold text-emerald-700">Included</span>
                      </div>
                      <p className="text-xs text-neutral-600">
                        • 7 kg Cabin Bag<br />
                        • 15 kg Check-in per traveler
                      </p>
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-2 block">Standard airline allowance</span>
                  </div>

                  {/* Option 2: Extra 5kg */}
                  <div
                    onClick={() => setBaggageTier('plus5kg')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      baggageTier === 'plus5kg'
                        ? 'bg-[#E5ECE0]/60 border-[#344E27] ring-1 ring-[#344E27]'
                        : 'bg-white border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-bold text-sm text-[#191919]">+5 kg Extra Check-In</span>
                        <span className="text-xs font-bold text-[#344E27]">+₹1,200/pax</span>
                      </div>
                      <p className="text-xs text-neutral-600">
                        • 7 kg Cabin Bag<br />
                        • 20 kg Total Check-in
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold mt-2 block">Ideal for shopping & gifts</span>
                  </div>

                  {/* Option 3: Hand Baggage Only (Saver) */}
                  <div
                    onClick={() => setBaggageTier('hand-only')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      baggageTier === 'hand-only'
                        ? 'bg-[#E5ECE0]/60 border-[#344E27] ring-1 ring-[#344E27]'
                        : 'bg-white border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-bold text-sm text-[#191919]">Cabin-Only Saver</span>
                        <span className="text-xs font-bold text-emerald-700">-₹400/pax</span>
                      </div>
                      <p className="text-xs text-neutral-600">
                        • 7 kg Cabin Bag only<br />
                        • No check-in luggage
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold mt-2 block">Save ₹400 per person</span>
                  </div>

                </div>
              </div>

              {/* Travel Insurance & Zero Cancellation */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider block">
                  2. Travel Protection & Flex
                </span>

                <div className="space-y-2.5">
                  {/* Insurance */}
                  <label className="p-4 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 flex items-start gap-3.5 cursor-pointer transition-colors block">
                    <input
                      type="checkbox"
                      checked={hasInsurance}
                      onChange={e => setHasInsurance(e.target.checked)}
                      className="mt-1 rounded text-[#344E27] focus:ring-[#344E27] w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-[#191919]">
                            Comprehensive Travel & Medical Insurance
                          </span>
                          <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Recommended
                          </span>
                        </div>
                        <span className="font-bold text-xs text-[#344E27]">₹199 / person</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Covers emergency hospitalization up to ₹5,00,000, checked baggage loss up to ₹25,000, and ₹10,000 for flight delay & missed connections.
                      </p>
                    </div>
                  </label>

                  {/* Free Reschedule / Cancellation */}
                  <label className="p-4 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 flex items-start gap-3.5 cursor-pointer transition-colors block">
                    <input
                      type="checkbox"
                      checked={hasFlexibleCancellation}
                      onChange={e => setHasFlexibleCancellation(e.target.checked)}
                      className="mt-1 rounded text-[#344E27] focus:ring-[#344E27] w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm text-[#191919]">
                          Flexible Reschedule & Zero Cancellation Guarantee
                        </span>
                        <span className="font-bold text-xs text-[#344E27]">₹399 / person</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        100% airline cancellation refund or free date modification up to 4 hours before departure without airline penalty fees.
                      </p>
                    </div>
                  </label>

                  {/* Carbon Offset */}
                  <label className="p-4 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 flex items-start gap-3.5 cursor-pointer transition-colors block">
                    <input
                      type="checkbox"
                      checked={carbonOffset}
                      onChange={e => setCarbonOffset(e.target.checked)}
                      className="mt-1 rounded text-[#344E27] focus:ring-[#344E27] w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-[#191919]">
                            Green Flight Carbon Offset Initiative
                          </span>
                          <span className="px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            🌱 Eco-Certified
                          </span>
                        </div>
                        <span className="font-bold text-xs text-[#344E27]">₹49 / person</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Funds Western Ghats mangrove reforestation to neutralize ~80 kg CO₂ per traveler.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Promo Code Box */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider block">
                  Airline Promo Code & Coupons
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    placeholder="Enter TRAVELIA500 or FLYGOA"
                    onChange={e => {
                      setPromoCodeInput(e.target.value);
                      setPromoError(null);
                    }}
                    className="flex-1 p-2.5 rounded-xl border border-neutral-300 bg-white font-mono text-xs uppercase focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2.5 rounded-xl bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Apply Coupon
                  </button>
                </div>

                {appliedPromo && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-100 p-2 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Coupon "{appliedPromo.code}" applied! You saved ₹{appliedPromo.discount}</span>
                  </div>
                )}

                {promoError && (
                  <span className="text-xs text-rose-600 font-semibold block">{promoError}</span>
                )}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: IN-APP PAYMENT & CHECKOUT */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left: Payment Method Selection */}
                <div className="lg:col-span-7 space-y-5">
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-[#191919]">
                      Select In-App Payment Mode
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Zero convenience charges. Secured with 256-bit bank-grade encryption.
                    </p>
                  </div>

                  {/* Payment Tabs */}
                  <div className="grid grid-cols-4 gap-2 bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200 text-xs font-bold">
                    <button
                      onClick={() => setPaymentMethod('upi')}
                      className={`py-2 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        paymentMethod === 'upi'
                          ? 'bg-white text-[#344E27] shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Instant UPI</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`py-2 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'bg-white text-[#344E27] shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Card</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`py-2 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        paymentMethod === 'netbanking'
                          ? 'bg-white text-[#344E27] shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>NetBanking</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('split')}
                      className={`py-2 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        paymentMethod === 'split'
                          ? 'bg-white text-[#344E27] shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Group Split</span>
                    </button>
                  </div>

                  {/* TAB 4.1: UPI PAYMENT */}
                  {paymentMethod === 'upi' && (
                    <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#344E27] uppercase">Pay via UPI Apps</span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Zero Surcharge
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                          <div
                            key={app}
                            className="flex-1 py-2 px-2 bg-white border border-neutral-200 rounded-xl text-center text-xs font-bold text-neutral-700 shadow-2xs"
                          >
                            {app}
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                          Enter VPA / UPI ID
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={upiId}
                            onChange={e => setUpiId(e.target.value)}
                            placeholder="user@okhdfcbank"
                            className="flex-1 p-2.5 rounded-xl border border-neutral-300 bg-white font-mono text-xs focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                          />
                          <span className="px-3 py-2 bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold flex items-center">
                            Verified ✓
                          </span>
                        </div>
                      </div>

                      {/* QR Scanner option */}
                      <div className="pt-2 border-t border-neutral-200 flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl border border-neutral-300 flex items-center justify-center shrink-0">
                          <QrCode className="w-7 h-7 text-[#344E27]" />
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-[#191919] block">Scan Dynamic QR Code</span>
                          <span className="text-neutral-500 text-[11px]">
                            Scan directly from your mobile UPI app for 5-second one-tap approval.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4.2: CARD PAYMENT */}
                  {paymentMethod === 'card' && (
                    <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
                      {/* Realistic Visual Card */}
                      <div className="w-full h-40 rounded-2xl bg-gradient-to-tr from-[#191919] to-[#344E27] p-5 text-white shadow-md flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-extrabold text-sm tracking-wider">TRAVELIA AIR</span>
                          <span className="font-mono text-xs opacity-80">VISA PLATINUM</span>
                        </div>
                        <div className="font-mono text-lg tracking-widest text-center my-auto">
                          {cardDetails.number}
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-[8px] block opacity-60">CARD HOLDER</span>
                            <span>{cardDetails.holder}</span>
                          </div>
                          <div>
                            <span className="text-[8px] block opacity-60">EXPIRES</span>
                            <span>{cardDetails.expiry}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card inputs */}
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                            Card Number
                          </label>
                          <input
                            type="text"
                            value={cardDetails.number}
                            onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-mono focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                              Valid Thru (MM/YY)
                            </label>
                            <input
                              type="text"
                              value={cardDetails.expiry}
                              onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                              className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-mono focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                              CVV
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              value={cardDetails.cvv}
                              onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                              className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-mono focus:ring-2 focus:ring-[#344E27] focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4.3: NETBANKING */}
                  {paymentMethod === 'netbanking' && (
                    <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3 text-xs">
                      <span className="font-bold text-[#344E27] uppercase text-[10px] block">
                        Select Your Authorized Bank
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra'].map(bank => (
                          <button
                            key={bank}
                            type="button"
                            onClick={() => setSelectedBank(bank)}
                            className={`p-3 rounded-xl border font-bold text-left transition-all cursor-pointer ${
                              selectedBank === bank
                                ? 'bg-[#344E27] text-white border-[#344E27]'
                                : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            {bank}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 4.4: GROUP SPLIT */}
                  {paymentMethod === 'split' && (
                    <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#344E27]" />
                        <span className="font-display font-bold text-sm text-[#191919]">
                          Split Flight Costs With {passengers.length} Travelers
                        </span>
                      </div>
                      <p className="text-neutral-600">
                        Each traveler pays an equal share of{' '}
                        <strong className="text-[#344E27]">
                          {formatCurrency(Math.round(grandTotal / passengers.length), currency)}
                        </strong>
                        . We will generate instant UPI payment requests for your group members.
                      </p>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 font-mono text-[11px] text-neutral-500">
                        UPI Share Request: https://travelia.ai/pay/split-{trip.id.slice(0, 6)}
                      </div>
                    </div>
                  )}

                  {/* Security Guarantees */}
                  <div className="flex items-center gap-3 text-xs text-neutral-500 pt-2">
                    <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>256-bit SSL secured • PCI-DSS Level 1 compliant gateway</span>
                  </div>
                </div>

                {/* Right: Order Summary Breakdown */}
                <div className="lg:col-span-5 bg-neutral-50 rounded-2xl p-5 border border-neutral-200 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="font-display font-extrabold text-base text-[#191919] pb-3 border-b border-neutral-200">
                      Fare Summary Breakdown
                    </h4>

                    <div className="space-y-2.5 text-xs text-neutral-600 pt-3">
                      <div className="flex items-center justify-between">
                        <span>Base Airfare ({passengers.length} Pax)</span>
                        <span className="font-semibold text-[#191919]">{formatCurrency(baseFareTotal, currency)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Airline Fuel & Airport UDF Fees</span>
                        <span className="font-semibold text-[#191919]">{formatCurrency(taxesAndFees, currency)}</span>
                      </div>

                      {totalSeatCharges > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Selected Seats</span>
                          <span className="font-semibold text-[#191919]">{formatCurrency(totalSeatCharges, currency)}</span>
                        </div>
                      )}

                      {baggageDelta !== 0 && (
                        <div className="flex items-center justify-between">
                          <span>Baggage Tier ({baggageTier})</span>
                          <span className="font-semibold text-[#191919]">
                            {baggageDelta > 0 ? `+${formatCurrency(baggageDelta, currency)}` : formatCurrency(baggageDelta, currency)}
                          </span>
                        </div>
                      )}

                      {hasInsurance && (
                        <div className="flex items-center justify-between">
                          <span>Travel Insurance</span>
                          <span className="font-semibold text-[#191919]">{formatCurrency(insuranceTotal, currency)}</span>
                        </div>
                      )}

                      {hasFlexibleCancellation && (
                        <div className="flex items-center justify-between">
                          <span>Zero Cancellation Flex</span>
                          <span className="font-semibold text-[#191919]">{formatCurrency(flexCancelTotal, currency)}</span>
                        </div>
                      )}

                      {carbonOffset && (
                        <div className="flex items-center justify-between">
                          <span>Carbon Offset (80kg CO₂)</span>
                          <span className="font-semibold text-[#191919]">{formatCurrency(carbonOffsetTotal, currency)}</span>
                        </div>
                      )}

                      {appliedPromo && (
                        <div className="flex items-center justify-between text-emerald-700 font-bold">
                          <span>Promo Discount ({appliedPromo.code})</span>
                          <span>-{formatCurrency(promoDiscount, currency)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-200">
                    <div className="flex items-baseline justify-between mb-4">
                      <div>
                        <span className="text-xs text-neutral-400 font-bold block uppercase">Grand Total</span>
                        <span className="text-[10px] text-emerald-700 font-semibold">Includes all taxes & fees</span>
                      </div>
                      <span className="font-display font-black text-2xl text-[#191919]">
                        {formatCurrency(grandTotal, currency)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessingPayment}
                      onClick={handleConfirmAndPay}
                      className="w-full py-3.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] disabled:bg-neutral-400 text-white font-extrabold text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Issuing Airline PNR...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Pay & Issue E-Tickets ({formatCurrency(grandTotal, currency)})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: CONFIRMATION & OFFICIAL E-TICKET SCREEN */}
          {/* ========================================================================= */}
          {currentStep === 5 && completedBooking && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Green Success Banner */}
              <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="font-display font-black text-2xl text-emerald-950">
                  Flight Tickets Confirmed & Issued!
                </h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  Your airline booking reference has been registered with the airline systems. Confirmation sent to <strong>{completedBooking.contactEmail}</strong>.
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-emerald-300 text-xs font-black text-[#191919] mt-2">
                  <span>Airline PNR:</span>
                  <span className="text-[#344E27] tracking-wider">{completedBooking.pnr}</span>
                </div>
              </div>

              {/* Digital E-Ticket Boarding Pass View */}
              <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="bg-[#191919] text-white p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Plane className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 block uppercase">Airline Booking</span>
                      <h4 className="font-display font-black text-base text-white">
                        {completedBooking.outboundFlight.airline} & {completedBooking.returnFlight.airline}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block uppercase font-bold">Transaction Ref</span>
                    <span className="font-mono text-xs text-neutral-200">{completedBooking.paymentRef}</span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Flight 1: Outbound */}
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#344E27] uppercase">
                        Outbound • {completedBooking.outboundFlight.flightNumber}
                      </span>
                      <span className="text-xs text-neutral-500 font-bold">{completedBooking.outboundFlight.departureDate}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-display font-black text-2xl text-[#191919]">{completedBooking.outboundFlight.originCode}</span>
                        <span className="text-neutral-500 block font-semibold">{completedBooking.outboundFlight.originCity}</span>
                        <span className="text-neutral-700 font-extrabold">{completedBooking.outboundFlight.departureTime}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-neutral-400 font-bold">{completedBooking.outboundFlight.duration}</span>
                        <ArrowRight className="w-4 h-4 text-[#344E27]" />
                        <span className="text-[10px] text-emerald-700 font-bold">Non-Stop</span>
                      </div>
                      <div className="text-right">
                        <span className="font-display font-black text-2xl text-[#191919]">{completedBooking.outboundFlight.destinationCode}</span>
                        <span className="text-neutral-500 block font-semibold">{completedBooking.outboundFlight.destinationCity}</span>
                        <span className="text-neutral-700 font-extrabold">{completedBooking.outboundFlight.arrivalTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Passengers & Assigned Seats Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {completedBooking.passengers.map((p, idx) => (
                      <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-[#191919] block">
                            {p.title} {p.firstName} {p.lastName}
                          </span>
                          <span className="text-[11px] text-neutral-500">Meal: {p.mealPreference}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 uppercase font-bold block">Assigned Seats</span>
                          <span className="font-extrabold text-[#344E27]">
                            {p.seatOutbound || '12A'} {isRoundTrip ? `/ ${p.seatReturn || '14D'}` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Machine Barcode */}
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col items-center justify-center space-y-1">
                    <div className="w-56 h-10 bg-[repeating-linear-gradient(90deg,#191919,#191919_2px,transparent_2px,transparent_6px,#191919_6px,#191919_9px,transparent_9px,transparent_11px)] rounded-xs" />
                    <span className="text-[10px] font-mono tracking-widest text-neutral-400">
                      *M1PASS/{completedBooking.pnr}/{completedBooking.paymentRef}*
                    </span>
                  </div>

                  {/* Download and Calendar buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadETicket}
                      className="py-2.5 px-4 rounded-xl bg-[#191919] hover:bg-neutral-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF E-Ticket</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToast('Flight details added to Google Calendar!')}
                      className="py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Add to Calendar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToast('E-Ticket passes synced to Apple Wallet & Google Wallet!')}
                      className="py-2.5 px-4 rounded-xl bg-[#E5ECE0] hover:bg-[#344E27] hover:text-white text-[#344E27] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Sync to Mobile Wallet</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER CONTROLS */}
        <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 flex items-center justify-between shrink-0">
          {currentStep > 1 && currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 rounded-full border border-neutral-300 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-all flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => {
                // validation on step 1
                if (currentStep === 1) {
                  const emptyName = passengers.some(p => !p.firstName.trim() || !p.lastName.trim());
                  if (emptyName) {
                    onToast('Please enter first and last name for all passengers');
                    return;
                  }
                  if (!contactEmail.includes('@')) {
                    onToast('Please enter a valid contact email');
                    return;
                  }
                }
                setCurrentStep(currentStep + 1);
              }}
              className="px-6 py-2.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : currentStep === 5 ? (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold transition-all shadow-md cursor-pointer ml-auto"
            >
              Return to Trip Dashboard
            </button>
          ) : null}
        </div>

      </div>
    </div>
  );
};
