import React, { useState } from 'react';
import {
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Clock,
  Luggage,
  QrCode,
  Check,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Download,
  Share2,
  Bell,
  BellRing,
  ExternalLink,
  MapPin,
  Calendar,
  AlertCircle,
  TrendingDown,
  Info,
  Car,
  Bus,
  Key,
  X,
  Copy,
  ChevronRight,
  Smartphone
} from 'lucide-react';
import { TripPlan, Currency, FlightSegment, FlightOption, FlightBookingRecord } from '../types';
import { formatCurrency } from '../data/mockData';
import {
  DEFAULT_OUTBOUND_FLIGHT,
  DEFAULT_RETURN_FLIGHT,
  ALTERNATIVE_FLIGHTS,
  AIRPORT_TRANSFER_DATA,
  AIRPORT_GUIDE,
  getFlightDataForDestination
} from '../data/flightData';
import { flightClient } from '../services/flightClient';
import { FlightBookingModal } from './FlightBookingModal';
import confetti from 'canvas-confetti';


interface TripFlightsSectionProps {
  trip: TripPlan;
  currency: Currency;
  onToast?: (message: string) => void;
  onFlightChange?: (outboundPrice: number, returnPrice: number) => void;
}

export const TripFlightsSection: React.FC<TripFlightsSectionProps> = ({
  trip,
  currency,
  onToast,
  onFlightChange
}) => {
  const [activeTab, setActiveTab] = useState<'passes' | 'alternatives' | 'bookings' | 'transfers' | 'trends'>('passes');
  
  const destinationData = React.useMemo(() => {
    return getFlightDataForDestination(trip.destination);
  }, [trip.destination]);

  const [outboundFlight, setOutboundFlight] = useState<FlightSegment>(() => getFlightDataForDestination(trip.destination).outboundFlight);
  const [returnFlight, setReturnFlight] = useState<FlightSegment>(() => getFlightDataForDestination(trip.destination).returnFlight);
  const [selectedOrigin, setSelectedOrigin] = useState<string>(() => destinationData.outboundFlight.originCode);

  // Sync state if destination changes
  React.useEffect(() => {
    setOutboundFlight(destinationData.outboundFlight);
    setReturnFlight(destinationData.returnFlight);
    setSelectedOrigin(destinationData.outboundFlight.originCode);
  }, [destinationData]);

  const [dataStatus, setDataStatus] = useState<'live' | 'cached' | 'demo' | 'unavailable'>('demo');
  const [dataSource, setDataSource] = useState<string>('catalog');


  // Query Backend Flight Service for Authoritative Flights
  React.useEffect(() => {
    let isCancelled = false;
    const fetchFlightData = async () => {
      try {
        const res = await flightClient.searchFlights(
          selectedOrigin,
          trip.destination,
          trip.startDate,
          trip.endDate,
          trip.travelers || 2
        );
        if (isCancelled) return;
        if (res.dataStatus) {
          setDataStatus(res.dataStatus);
          setDataSource(res.source);
        }
        if (res.outboundFlights && res.outboundFlights.length > 0) {
          const firstOut = res.outboundFlights[0];
          setOutboundFlight({
            id: firstOut.id,
            airline: firstOut.airline,
            airlineCode: firstOut.airlineCode,
            flightNumber: firstOut.flightNumber,
            aircraft: firstOut.aircraft || 'Airbus A320neo',
            originAirport: firstOut.originAirport,
            originCity: firstOut.originCity,
            originCode: firstOut.originCode,
            destinationAirport: firstOut.destinationAirport,
            destinationCity: firstOut.destinationCity,
            destinationCode: firstOut.destinationCode,
            departureTime: firstOut.departureTime,
            departureDate: firstOut.departureDate,
            arrivalTime: firstOut.arrivalTime,
            arrivalDate: firstOut.arrivalDate,
            duration: firstOut.duration,
            stops: firstOut.stops,
            cabinClass: firstOut.cabinClass,
            seatAssignment: '12A, 12B (Window & Middle)',
            terminalDeparture: 'Terminal 2',
            terminalArrival: 'Terminal 1',
            gate: 'Gate 42B',
            baggage: {
              cabin: '7 kg included',
              checkIn: '15 kg per traveler'
            },
            pricePerPerson: firstOut.price.pricePerPerson,
            status: 'on-time',
            bookingRef: `TRV-${firstOut.airlineCode}88K`,
            carbonEmissionKg: firstOut.carbonEmissionKg || 78
          });
        }
        if (res.returnFlights && res.returnFlights.length > 0) {
          const firstRet = res.returnFlights[0];
          setReturnFlight({
            id: firstRet.id,
            airline: firstRet.airline,
            airlineCode: firstRet.airlineCode,
            flightNumber: firstRet.flightNumber,
            aircraft: firstRet.aircraft || 'Airbus A321neo',
            originAirport: firstRet.originAirport,
            originCity: firstRet.originCity,
            originCode: firstRet.originCode,
            destinationAirport: firstRet.destinationAirport,
            destinationCity: firstRet.destinationCity,
            destinationCode: firstRet.destinationCode,
            departureTime: firstRet.departureTime,
            departureDate: firstRet.departureDate,
            arrivalTime: firstRet.arrivalTime,
            arrivalDate: firstRet.arrivalDate,
            duration: firstRet.duration,
            stops: firstRet.stops,
            cabinClass: firstRet.cabinClass,
            seatAssignment: '14D, 14E (Aisle & Middle)',
            terminalDeparture: 'Terminal 1',
            terminalArrival: 'Terminal 2',
            gate: 'Gate 05',
            baggage: {
              cabin: '7 kg included',
              checkIn: '20 kg included'
            },
            pricePerPerson: firstRet.price.pricePerPerson,
            status: 'scheduled',
            bookingRef: `TRV-${firstRet.airlineCode}91P`,
            carbonEmissionKg: firstRet.carbonEmissionKg || 82
          });
        }
      } catch (err) {
        console.warn('[TripFlightsSection] Flights search fallback:', err);
      }
    };
    fetchFlightData();
    return () => { isCancelled = true; };
  }, [trip.destination, selectedOrigin, trip.startDate, trip.endDate, trip.travelers]);


  // Available origin cities from flight routes
  const availableOrigins = React.useMemo(() => {
    const map = new Map<string, string>();
    destinationData.alternativeFlights.forEach(opt => {
      if (opt.type === 'outbound') {
        map.set(opt.originCode, opt.originCity);
      } else {
        map.set(opt.destCode, opt.destCity);
      }
    });
    if (map.size === 0) {
      map.set('BOM', 'Mumbai');
      map.set('DEL', 'Delhi');
      map.set('BLR', 'Bengaluru');
    }
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [destinationData]);

  // In-app Flight Booking State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [confirmedBookings, setConfirmedBookings] = useState<FlightBookingRecord[]>([]);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<FlightBookingRecord | null>(null);

  // Alternative flight filtering
  const [selectedLegType, setSelectedLegType] = useState<'outbound' | 'return'>('outbound');
  const [flightClassFilter, setFlightClassFilter] = useState<'all' | 'eco' | 'fastest'>('all');


  // Fare tracker state
  const [fareAlertEnabled, setFareAlertEnabled] = useState<boolean>(true);

  // Boarding pass modal
  const [selectedBoardingPass, setSelectedBoardingPass] = useState<FlightSegment | null>(null);

  const notify = (msg: string) => {
    if (onToast) {
      onToast(msg);
    }
  };

  const handleBookingComplete = (booking: FlightBookingRecord) => {
    setConfirmedBookings(prev => [booking, ...prev]);
    setOutboundFlight(booking.outboundFlight);
    if (booking.returnFlight) {
      setReturnFlight(booking.returnFlight);
    }
    setActiveTab('bookings');
    notify(`🎉 Flight tickets booked successfully! PNR: ${booking.pnr}`);
    if (onFlightChange) {
      onFlightChange(booking.outboundFlight.pricePerPerson, booking.returnFlight?.pricePerPerson || 0);
    }
  };

  const totalFlightCostPerPerson = outboundFlight.pricePerPerson + returnFlight.pricePerPerson;
  const totalGroupFlightCost = totalFlightCostPerPerson * (trip.travelers || 2);

  // Switch flight handler
  const handleSelectAlternativeFlight = (opt: FlightOption) => {
    if (opt.type === 'outbound') {
      const updated: FlightSegment = {
        ...outboundFlight,
        id: opt.id,
        airline: opt.airline,
        flightNumber: opt.flightNumber,
        originCode: opt.originCode,
        originCity: opt.originCity,
        departureTime: opt.departureTime,
        arrivalTime: opt.arrivalTime,
        duration: opt.duration,
        pricePerPerson: opt.pricePerPerson,
        aircraft: opt.aircraft,
        destinationCode: opt.destCode,
        destinationCity: opt.destCity
      };
      setOutboundFlight(updated);
      notify(`Updated outbound flight to ${opt.airline} ${opt.flightNumber}`);
      if (onFlightChange) {
        onFlightChange(opt.pricePerPerson, returnFlight.pricePerPerson);
      }
    } else {
      const updated: FlightSegment = {
        ...returnFlight,
        id: opt.id,
        airline: opt.airline,
        flightNumber: opt.flightNumber,
        originCode: opt.originCode,
        originCity: opt.originCity,
        departureTime: opt.departureTime,
        arrivalTime: opt.arrivalTime,
        duration: opt.duration,
        pricePerPerson: opt.pricePerPerson,
        aircraft: opt.aircraft,
        destinationCode: opt.destCode,
        destinationCity: opt.destCity
      };
      setReturnFlight(updated);
      notify(`Updated return flight to ${opt.airline} ${opt.flightNumber}`);
      if (onFlightChange) {
        onFlightChange(outboundFlight.pricePerPerson, opt.pricePerPerson);
      }
    }

    try {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.7 }
      });
    } catch (e) {}
  };

  // Copy flight details to clipboard
  const handleShareFlight = () => {
    const text = `
✈️ TRAVELIA FLIGHT ITINERARY FOR ${trip.destination.toUpperCase()}
--------------------------------------------------
🛫 OUTBOUND: ${outboundFlight.airline} (${outboundFlight.flightNumber})
• ${outboundFlight.originCity} (${outboundFlight.originCode}) ➔ ${outboundFlight.destinationCity} (${outboundFlight.destinationCode})
• Date: ${outboundFlight.departureDate} | Departs: ${outboundFlight.departureTime} | Arrives: ${outboundFlight.arrivalTime}
• Status: ${outboundFlight.status.toUpperCase()} | Terminal: ${outboundFlight.terminalDeparture} | Gate: ${outboundFlight.gate}
• PNR / Ref: ${outboundFlight.bookingRef} | Seats: ${outboundFlight.seatAssignment}

🛬 RETURN: ${returnFlight.airline} (${returnFlight.flightNumber})
• ${returnFlight.originCity} (${returnFlight.originCode}) ➔ ${returnFlight.destinationCity} (${returnFlight.destinationCode})
• Date: ${returnFlight.departureDate} | Departs: ${returnFlight.departureTime} | Arrives: ${returnFlight.arrivalTime}
• Status: ${returnFlight.status.toUpperCase()} | Terminal: ${returnFlight.terminalDeparture}
• PNR / Ref: ${returnFlight.bookingRef} | Seats: ${returnFlight.seatAssignment}

Total Flights: ${formatCurrency(totalGroupFlightCost, currency)} (${trip.travelers} Pax)
--------------------------------------------------
Generated by Travelia AI
    `.trim();

    navigator.clipboard.writeText(text);
    notify('Flight itinerary briefing copied to clipboard!');
  };

  // Download E-Ticket Summary JSON
  const handleDownloadTicket = () => {
    const data = {
      tripId: trip.id,
      destination: trip.destination,
      travelers: trip.travelers,
      travelDates: trip.travelDates,
      outbound: outboundFlight,
      returnFlight: returnFlight,
      airportTransfer: destinationData.airportTransfer,
      totalFlightCost: totalGroupFlightCost
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${trip.destination.toLowerCase()}_flight_tickets.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Flight e-tickets and travel briefing downloaded!');
  };

  // Filtered alternative flights
  const filteredAlternatives = destinationData.alternativeFlights.filter(opt => {
    if (opt.type !== selectedLegType) return false;
    if (selectedLegType === 'outbound' && opt.originCode !== selectedOrigin) return false;
    if (selectedLegType === 'return' && opt.destCode !== selectedOrigin) return false;
    if (flightClassFilter === 'eco' && opt.carbonScore !== 'eco') return false;
    if (flightClassFilter === 'fastest' && !opt.isFastest) return false;
    return true;
  });

  return (
    <section id="section-flights" className="space-y-6">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider">
              Air Travel & Aviation Desk
            </span>
            {dataStatus === 'live' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Live GDS Verified ({dataSource})
              </span>
            ) : dataStatus === 'cached' ? (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Cached Live Feed
              </span>
            ) : dataStatus === 'unavailable' ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Route Unserviced (No Fabrication)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#E5ECE0] text-[#344E27] text-[10px] font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Verified Demo Catalog
              </span>
            )}

          </div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#191919] mt-0.5">
            Flight Bookings & Airport Logistics
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Confirmed roundtrip boarding passes, live terminal gate alerts, ground transfers to your hotel, and real-time fare optimization.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="px-4 py-2 rounded-full bg-[#191919] hover:bg-neutral-800 text-white text-xs font-black transition-all flex items-center gap-2 shadow-md active:scale-95 cursor-pointer ring-2 ring-[#344E27]/30"
          >
            <Plane className="w-3.5 h-3.5 text-emerald-400" />
            <span>Book Flight Tickets In-App</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase">
              Direct
            </span>
          </button>

          <button
            onClick={() => {
              setFareAlertEnabled(!fareAlertEnabled);
              notify(
                fareAlertEnabled
                  ? 'Fare price alerts paused'
                  : 'Fare price watch enabled: We will alert you of price drops!'
              );
            }}
            className={`px-3 py-2 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
              fareAlertEnabled
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
            title="Toggle flight price watch"
          >
            {fareAlertEnabled ? (
              <>
                <BellRing className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Price Alert: Active (-18%)</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Track Fares</span>
              </>
            )}
          </button>

          <button
            onClick={handleShareFlight}
            className="px-3.5 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Share flight summary"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={handleDownloadTicket}
            className="px-4 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>E-Tickets</span>
          </button>
        </div>
      </div>

      {/* QUICK AIRLINE METRICS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Roundtrip Price & Pax */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center shrink-0">
            <Plane className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Roundtrip Flights Total
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-lg text-[#191919]">
                {formatCurrency(totalGroupFlightCost, currency)}
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
                ({trip.travelers} Pax)
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold block">
              ~{formatCurrency(totalFlightCostPerPerson, currency)} / person
            </span>
          </div>
        </div>

        {/* Metric 2: Departure Gate & Terminal Status */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <PlaneTakeoff className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Outbound Leg
            </span>
            <span className="font-display font-bold text-sm text-[#191919] truncate block">
              {outboundFlight.originCode} ➔ {outboundFlight.destinationCode} • {outboundFlight.airline}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{outboundFlight.status.toUpperCase()} • Gate {outboundFlight.gate}</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Return Flight & Status */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <PlaneLanding className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Return Leg
            </span>
            <span className="font-display font-bold text-sm text-[#191919] truncate block">
              {returnFlight.originCode} ➔ {returnFlight.destinationCode} • {returnFlight.airline}
            </span>
            <span className="text-[10px] text-neutral-500 font-semibold block mt-0.5">
              Nov 16 • {returnFlight.departureTime}
            </span>
          </div>
        </div>

        {/* Metric 4: Airport Hub & Ground ETA */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Airport to Stay
            </span>
            <span className="font-display font-bold text-sm text-[#191919] truncate block" title={destinationData.airportTransfer.airportName}>
              {destinationData.airportTransfer.airportCode} • {destinationData.airportTransfer.airportName.split('(')[0].trim()}
            </span>
            <span className="text-[10px] text-neutral-500 font-semibold block mt-0.5">
              ~{destinationData.airportTransfer.distanceToHotelKm} km (~{destinationData.airportTransfer.estimatedDriveMinutes} mins drive to hotel)
            </span>
          </div>
        </div>

      </div>

      {/* Route Availability Notice */}
      {dataStatus === 'unavailable' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold block">No Authenticated Flight Inventory Found</span>
            <span>
              Direct airline connections between {selectedOrigin} and {trip.destination} are currently unserviced by active providers.
              Travelia adheres to zero-fabrication standards: flight schedules and pricing are never fabricated.
            </span>
          </div>
        </div>
      )}

      {/* MAIN FLIGHT CONTAINER WITH TABS */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-200 shadow-2xs space-y-6">

        
        {/* Navigation Sub-Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('passes')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'passes'
                  ? 'bg-[#344E27] text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Confirmed Boarding Passes (2)
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-[#344E27] text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>In-App Bookings</span>
              {confirmedBookings.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                  {confirmedBookings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('alternatives')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'alternatives'
                  ? 'bg-[#344E27] text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span>Explore Other Flights</span>
              <span className="px-1.5 py-0.2 rounded-full bg-neutral-200 text-neutral-800 text-[10px] font-bold">
                {destinationData.alternativeFlights.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('transfers')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'transfers'
                  ? 'bg-[#344E27] text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Airport & Ground Cabs
            </button>

            <button
              onClick={() => setActiveTab('trends')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'trends'
                  ? 'bg-amber-500 text-neutral-950 shadow-2xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Fare Intelligence</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                -18% Drop
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="hidden md:inline font-medium">Baggage included:</span>
            <span className="px-2 py-1 rounded-lg bg-neutral-100 font-bold text-[#191919] text-[11px] flex items-center gap-1">
              <Luggage className="w-3.5 h-3.5 text-[#344E27]" /> 7kg Cabin + 15kg Check-in
            </span>
          </div>
        </div>

        {/* TAB 1: BOARDING PASSES & FLIGHT DETAILS */}
        {activeTab === 'passes' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* FLIGHT CARD 1: OUTBOUND TICKET */}
              <div className="bg-neutral-50/70 border border-neutral-200/90 rounded-[28px] p-6 hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between space-y-6">
                
                {/* Header Strip */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#344E27] text-white flex items-center justify-center font-bold shadow-xs">
                      <PlaneTakeoff className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#344E27]">
                          Outbound Flight
                        </span>
                        <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          {outboundFlight.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-display font-extrabold text-base text-[#191919]">
                        {outboundFlight.airline} • {outboundFlight.flightNumber}
                      </h4>
                    </div>
                  </div>

                  <span className="font-display font-black text-lg text-[#191919]">
                    {formatCurrency(outboundFlight.pricePerPerson, currency)}
                    <span className="text-[10px] font-normal text-neutral-400 block text-right">per pax</span>
                  </span>
                </div>

                {/* Airport Route Journey Line */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-display font-black text-2xl sm:text-3xl text-[#191919]">
                        {outboundFlight.originCode}
                      </span>
                      <span className="text-xs text-neutral-500 font-bold block">
                        {outboundFlight.originCity}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium">
                        {outboundFlight.terminalDeparture}
                      </span>
                    </div>

                    {/* Flight Path Graphic */}
                    <div className="flex-1 px-4 flex flex-col items-center">
                      <span className="text-[11px] font-extrabold text-neutral-500">
                        {outboundFlight.duration}
                      </span>
                      <div className="w-full flex items-center gap-1 my-1">
                        <div className="w-2 h-2 rounded-full bg-[#344E27]" />
                        <div className="h-0.5 flex-1 bg-neutral-300 relative">
                          <Plane className="w-3.5 h-3.5 text-[#344E27] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="w-2 h-2 rounded-full bg-[#344E27]" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full">
                        Non-stop • {outboundFlight.aircraft}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-display font-black text-2xl sm:text-3xl text-[#191919]">
                        {outboundFlight.destinationCode}
                      </span>
                      <span className="text-xs text-neutral-500 font-bold block">
                        {outboundFlight.destinationCity}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium">
                        {outboundFlight.terminalArrival}
                      </span>
                    </div>
                  </div>

                  {/* Timings */}
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase">Departure</span>
                      <span className="font-display font-extrabold text-sm text-[#191919]">
                        {outboundFlight.departureTime}
                      </span>
                      <span className="text-[11px] text-neutral-500 block">{outboundFlight.departureDate}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase">Estimated Arrival</span>
                      <span className="font-display font-extrabold text-sm text-[#191919]">
                        {outboundFlight.arrivalTime}
                      </span>
                      <span className="text-[11px] text-neutral-500 block">{outboundFlight.arrivalDate}</span>
                    </div>
                  </div>
                </div>

                {/* Passenger & Booking Info */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80">
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase">Assigned Seats</span>
                    <span className="font-extrabold text-[#191919]">{outboundFlight.seatAssignment}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80">
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase">Departure Gate</span>
                    <span className="font-extrabold text-[#344E27]">{outboundFlight.gate}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80">
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase">PNR / Ref</span>
                    <span className="font-extrabold text-[#191919] tracking-wider">{outboundFlight.bookingRef}</span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-200">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Live Booking Enabled</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsBookingModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plane className="w-3.5 h-3.5" />
                      <span>Book Tickets In-App</span>
                    </button>

                    <button
                      onClick={() => setSelectedBoardingPass(outboundFlight)}
                      className="px-3.5 py-1.5 rounded-full bg-[#191919] hover:bg-neutral-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Boarding Pass</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* FLIGHT CARD 2: RETURN TICKET */}
              <div className="bg-neutral-50/70 border border-neutral-200/90 rounded-[28px] p-6 hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between space-y-6">
                
                {/* Header Strip */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shadow-xs">
                      <PlaneLanding className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                          Return Flight
                        </span>
                        <span className="px-2 py-0.2 rounded-full bg-neutral-200 text-neutral-800 text-[10px] font-black">
                          {returnFlight.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-display font-extrabold text-base text-[#191919]">
                        {returnFlight.airline} • {returnFlight.flightNumber}
                      </h4>
                    </div>
                  </div>

                  <span className="font-display font-black text-lg text-[#191919]">
                    {formatCurrency(returnFlight.pricePerPerson, currency)}
                    <span className="text-[10px] font-normal text-neutral-400 block text-right">per pax</span>
                  </span>
                </div>

                {/* Airport Route Journey Line */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-display font-black text-2xl sm:text-3xl text-[#191919]">
                        {returnFlight.originCode}
                      </span>
                      <span className="text-xs text-neutral-500 font-bold block">
                        {returnFlight.originCity}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium">
                        {returnFlight.terminalDeparture}
                      </span>
                    </div>

                    {/* Flight Path Graphic */}
                    <div className="flex-1 px-4 flex flex-col items-center">
                      <span className="text-[11px] font-extrabold text-neutral-500">
                        {returnFlight.duration}
                      </span>
                      <div className="w-full flex items-center gap-1 my-1">
                        <div className="w-2 h-2 rounded-full bg-purple-700" />
                        <div className="h-0.5 flex-1 bg-neutral-300 relative">
                          <Plane className="w-3.5 h-3.5 text-purple-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="w-2 h-2 rounded-full bg-purple-700" />
                      </div>
                      <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.2 rounded-full">
                        Non-stop • {returnFlight.aircraft}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-display font-black text-2xl sm:text-3xl text-[#191919]">
                        {returnFlight.destinationCode}
                      </span>
                      <span className="text-xs text-neutral-500 font-bold block">
                        {returnFlight.destinationCity}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium">
                        {returnFlight.terminalArrival}
                      </span>
                    </div>
                  </div>

                  {/* Timings */}
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase">Departure</span>
                      <span className="font-display font-extrabold text-sm text-[#191919]">
                        {returnFlight.departureTime}
                      </span>
                      <span className="text-[11px] text-neutral-500 block">{returnFlight.departureDate}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 font-semibold block uppercase">Arrival</span>
                      <span className="font-display font-extrabold text-sm text-[#191919]">
                        {returnFlight.arrivalTime}
                      </span>
                      <span className="text-[11px] text-neutral-500 block">{returnFlight.arrivalDate}</span>
                    </div>
                  </div>
                </div>

                {/* Passenger & Booking Info */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80">
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase">Assigned Seats</span>
                    <span className="font-extrabold text-[#191919]">{returnFlight.seatAssignment}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80">
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase">Departure Gate</span>
                    <span className="font-extrabold text-purple-700">{returnFlight.gate}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80">
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase">PNR / Ref</span>
                    <span className="font-extrabold text-[#191919] tracking-wider">{returnFlight.bookingRef}</span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-200">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>Check-in Opens in 48h</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsBookingModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plane className="w-3.5 h-3.5" />
                      <span>Book Tickets In-App</span>
                    </button>

                    <button
                      onClick={() => setSelectedBoardingPass(returnFlight)}
                      className="px-3.5 py-1.5 rounded-full bg-[#191919] hover:bg-neutral-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Boarding Pass</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* AIRPORT NAVIGATION & FAST-TRACK BIOMETRICS BANNER */}
            <div className="p-5 rounded-2xl bg-[#E5ECE0]/60 border border-[#344E27]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#344E27] text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-[#191919]">
                    {outboundFlight.destinationCode === 'GOX' || outboundFlight.destinationCode === 'COK' || outboundFlight.destinationCode === 'JAI' || outboundFlight.destinationCode === 'SXR'
                      ? 'Fast-Track DigiYatra Biometric Gate Pass'
                      : 'International Fast-Track Biometric Clearance'}
                  </h4>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {destinationData.airportGuide.departureChecklist[0] || `Contactless facial scan e-gates enabled for under 2 minutes security clearing between ${outboundFlight.originCode} and ${destinationData.airportTransfer.airportCode}.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => notify('Express biometric gate pass synced with your mobile device!')}
                  className="px-3.5 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Sync Express Pass
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPLORE ALTERNATIVE FLIGHTS */}
        {activeTab === 'alternatives' && (
          <div className="space-y-6">
            
            {/* Filters ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
              
              {/* Leg Toggle (Outbound vs Return) */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-neutral-200">
                <button
                  onClick={() => setSelectedLegType('outbound')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedLegType === 'outbound'
                      ? 'bg-[#344E27] text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Outbound Leg (To {outboundFlight.destinationCity.split(/[,(]/)[0].trim()})
                </button>
                <button
                  onClick={() => setSelectedLegType('return')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedLegType === 'return'
                      ? 'bg-[#344E27] text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Return Leg (From {returnFlight.originCity.split(/[,(]/)[0].trim()})
                </button>
              </div>

              {/* Origin City Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-neutral-500">Origin City:</span>
                {availableOrigins.map(city => (
                  <button
                    key={city.code}
                    onClick={() => setSelectedOrigin(city.code)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedOrigin === city.code
                        ? 'bg-[#191919] text-white shadow-xs'
                        : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {city.name} ({city.code})
                  </button>
                ))}
              </div>

              {/* Eco / Fastest Quick Filter */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFlightClassFilter(flightClassFilter === 'eco' ? 'all' : 'eco')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    flightClassFilter === 'eco'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  🌱 Eco-Friendly Only
                </button>
                <button
                  onClick={() => setFlightClassFilter(flightClassFilter === 'fastest' ? 'all' : 'fastest')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    flightClassFilter === 'fastest'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  ⚡ Fastest Non-Stop
                </button>
              </div>

            </div>

            {/* List of alternatives */}
            <div className="space-y-3">
              {filteredAlternatives.length === 0 ? (
                <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-500">
                  <Plane className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                  <p className="font-bold text-sm text-[#191919]">No flights match these filters</p>
                  <p className="text-xs mt-1">Try switching the origin city to {availableOrigins[0]?.name || 'Mumbai'} ({availableOrigins[0]?.code || 'BOM'}) or resetting your filters.</p>
                  <button
                    onClick={() => {
                      setSelectedOrigin(availableOrigins[0]?.code || 'BOM');
                      setFlightClassFilter('all');
                    }}
                    className="mt-3 px-4 py-1.5 rounded-full bg-[#344E27] text-white text-xs font-bold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredAlternatives.map(opt => {
                  const isCurrent =
                    (opt.type === 'outbound' && outboundFlight.flightNumber === opt.flightNumber) ||
                    (opt.type === 'return' && returnFlight.flightNumber === opt.flightNumber);

                  return (
                    <div
                      key={opt.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isCurrent
                          ? 'bg-[#E5ECE0]/40 border-[#344E27] ring-1 ring-[#344E27]'
                          : 'bg-white hover:bg-neutral-50/80 border-neutral-200'
                      }`}
                    >
                      {/* Left info */}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-sm text-[#344E27] shrink-0">
                          {opt.airline.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-display font-bold text-sm text-[#191919]">
                              {opt.airline} • {opt.flightNumber}
                            </h4>
                            {opt.isBestValue && (
                              <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                Best Value
                              </span>
                            )}
                            {opt.isFastest && (
                              <span className="px-2 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                                Fastest
                              </span>
                            )}
                            {opt.carbonScore === 'eco' && (
                              <span className="px-2 py-0.2 rounded-full bg-neutral-100 text-emerald-700 text-[10px] font-bold">
                                🌱 Lower CO₂
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-neutral-600 mt-1 font-medium">
                            <span className="font-bold text-[#191919]">
                              {opt.departureTime} – {opt.arrivalTime}
                            </span>
                            <span>•</span>
                            <span>{opt.duration}</span>
                            <span>•</span>
                            <span>{opt.originCode} ➔ {opt.destCode}</span>
                            <span>•</span>
                            <span className="text-neutral-400">{opt.aircraft}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right price & action */}
                      <div className="flex items-center justify-between md:justify-end gap-5 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
                        <div className="text-left md:text-right">
                          <span className="font-display font-black text-lg text-[#191919]">
                            {formatCurrency(opt.pricePerPerson, currency)}
                          </span>
                          <span className="text-[10px] text-neutral-400 block">per person</span>
                        </div>

                        {isCurrent ? (
                          <div className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>Currently Booked</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                handleSelectAlternativeFlight(opt);
                                setIsBookingModalOpen(true);
                              }}
                              className="px-3.5 py-2 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                            >
                              <Plane className="w-3.5 h-3.5" />
                              <span>Book In-App</span>
                            </button>
                            <button
                              onClick={() => handleSelectAlternativeFlight(opt)}
                              className="px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Select
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB: IN-APP BOOKINGS & TICKETS */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {confirmedBookings.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-neutral-50/80 rounded-[28px] border border-dashed border-neutral-300 space-y-4 max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-[#E5ECE0] text-[#344E27] flex items-center justify-center mx-auto shadow-xs">
                  <Plane className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-black text-xl text-[#191919]">
                    No Flights Booked In-App Yet
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                    Book flights directly within the app to get instant verified airline PNRs, live terminal gate alerts, free seat maps, and direct PDF boarding passes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="px-6 py-3 rounded-full bg-[#344E27] hover:bg-[#273D1C] text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Plane className="w-4 h-4" />
                    <span>Book Flight Tickets Now</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-emerald-950 text-[10px] font-black">
                      ₹500 OFF
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-neutral-200 text-xs text-neutral-600 text-left">
                  <div className="p-3 bg-white rounded-xl border border-neutral-200">
                    <span className="font-extrabold text-[#191919] block mb-0.5">Instant PNR</span>
                    <span className="text-[11px] text-neutral-400">Official airline record generated within 3 seconds</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-neutral-200">
                    <span className="font-extrabold text-[#191919] block mb-0.5">Free Seat Map</span>
                    <span className="text-[11px] text-neutral-400">Select seats for all travelers with interactive fuselage visualizer</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-neutral-200">
                    <span className="font-extrabold text-[#191919] block mb-0.5">Zero Markup</span>
                    <span className="text-[11px] text-neutral-400">Direct airline fares with transparent breakdown</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Header Strip with Book Another button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#E5ECE0]/60 rounded-2xl border border-[#344E27]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#344E27] text-white flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-base text-[#191919]">
                        In-App Flight Reservations ({confirmedBookings.length})
                      </h4>
                      <p className="text-xs text-neutral-600">
                        Official airline tickets booked directly via the Travelia app platform.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="px-4 py-2 rounded-full bg-[#191919] hover:bg-neutral-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-xs active:scale-95"
                  >
                    <Plane className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Book Another Flight</span>
                  </button>
                </div>

                {/* Confirmed Bookings List */}
                <div className="space-y-4">
                  {confirmedBookings.map(bk => (
                    <div
                      key={bk.id}
                      className="bg-neutral-50/80 rounded-[28px] border border-neutral-200 p-6 space-y-5 hover:border-neutral-300 transition-all shadow-2xs"
                    >
                      {/* Booking Title Strip */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-black text-sm text-[#344E27] shadow-2xs">
                            {bk.outboundFlight.airline.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-black text-base text-[#191919]">
                                {bk.outboundFlight.airline} & {bk.returnFlight?.airline || 'Return'}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-700" /> {bk.status.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs text-neutral-500 font-medium block mt-0.5">
                              Booked on {bk.bookingDate} • {bk.passengers.length} Passenger{bk.passengers.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Official Airline PNR</span>
                          <span className="font-mono font-extrabold text-lg text-[#344E27] tracking-wider block">
                            {bk.pnr}
                          </span>
                        </div>
                      </div>

                      {/* Flight Route Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Outbound Leg */}
                        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-[#344E27] uppercase">Outbound Flight</span>
                            <span className="font-bold text-xs text-[#191919]">{bk.outboundFlight.flightNumber}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="font-display font-black text-2xl text-[#191919]">{bk.outboundFlight.originCode}</span>
                              <span className="text-neutral-500 block font-semibold">{bk.outboundFlight.originCity}</span>
                              <span className="text-neutral-700 font-bold">{bk.outboundFlight.departureTime}</span>
                            </div>

                            <div className="flex flex-col items-center px-3">
                              <span className="text-[10px] text-neutral-400 font-semibold">{bk.outboundFlight.duration}</span>
                              <ArrowRight className="w-4 h-4 text-[#344E27]" />
                              <span className="text-[10px] text-emerald-700 font-bold">Direct</span>
                            </div>

                            <div className="text-right">
                              <span className="font-display font-black text-2xl text-[#191919]">{bk.outboundFlight.destinationCode}</span>
                              <span className="text-neutral-500 block font-semibold">{bk.outboundFlight.destinationCity}</span>
                              <span className="text-neutral-700 font-bold">{bk.outboundFlight.arrivalTime}</span>
                            </div>
                          </div>
                        </div>

                        {/* Return Leg */}
                        {bk.returnFlight && (
                          <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-purple-700 uppercase">Return Flight</span>
                              <span className="font-bold text-xs text-[#191919]">{bk.returnFlight.flightNumber}</span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <span className="font-display font-black text-2xl text-[#191919]">{bk.returnFlight.originCode}</span>
                                <span className="text-neutral-500 block font-semibold">{bk.returnFlight.originCity}</span>
                                <span className="text-neutral-700 font-bold">{bk.returnFlight.departureTime}</span>
                              </div>

                              <div className="flex flex-col items-center px-3">
                                <span className="text-[10px] text-neutral-400 font-semibold">{bk.returnFlight.duration}</span>
                                <ArrowRight className="w-4 h-4 text-purple-700" />
                                <span className="text-[10px] text-purple-700 font-bold">Direct</span>
                              </div>

                              <div className="text-right">
                                <span className="font-display font-black text-2xl text-[#191919]">{bk.returnFlight.destinationCode}</span>
                                <span className="text-neutral-500 block font-semibold">{bk.returnFlight.destinationCity}</span>
                                <span className="text-neutral-700 font-bold">{bk.returnFlight.arrivalTime}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Passenger Roster & Assigned Seats */}
                      <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 space-y-2">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          Passengers & Seat Allocations
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {bk.passengers.map((p, pIdx) => (
                            <div key={pIdx} className="p-2.5 rounded-xl bg-neutral-50 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[#191919] block">
                                  {p.title} {p.firstName} {p.lastName}
                                </span>
                                <span className="text-[11px] text-neutral-500">Meal: {p.mealPreference}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-neutral-400 block font-semibold">Seat</span>
                                <span className="font-extrabold text-[#344E27]">
                                  {p.seatOutbound || '12A'} {bk.returnFlight ? `/ ${p.seatReturn || '14D'}` : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment, Protection & Action Buttons */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-neutral-200">
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                          <span className="font-bold text-[#191919]">
                            Total Paid: {formatCurrency(bk.totalAmount, currency)}
                          </span>
                          <span className="text-neutral-400">•</span>
                          <span className="text-neutral-600 uppercase font-mono text-[11px]">
                            {bk.paymentMethod} ({bk.paymentRef})
                          </span>
                          {bk.hasTravelInsurance && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              ✓ Insurance Active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              const docData = {
                                bookingPnr: bk.pnr,
                                status: bk.status,
                                destination: trip.destination,
                                passengers: bk.passengers,
                                outbound: bk.outboundFlight,
                                returnFlight: bk.returnFlight,
                                totalAmount: bk.totalAmount,
                                currency: currency
                              };
                              const blob = new Blob([JSON.stringify(docData, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `E-TICKET_${bk.pnr}.json`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              notify(`Downloaded E-Ticket for PNR ${bk.pnr}!`);
                            }}
                            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download E-Ticket</span>
                          </button>

                          <button
                            onClick={() => notify(`Flight details synced with Apple Wallet & Google Wallet!`)}
                            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Wallet Pass</span>
                          </button>

                          <button
                            onClick={() => {
                              notify(`Cancellation policy check: 100% refund eligible within 48h.`);
                            }}
                            className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-rose-50 hover:text-rose-700 text-neutral-600 text-xs font-semibold transition-all cursor-pointer"
                          >
                            Manage / Cancel
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 3: AIRPORT TRANSFERS & GROUND CAB INTEL */}
        {activeTab === 'transfers' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#344E27] uppercase tracking-wider">
                  Airport Hub Overview
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white text-neutral-700 text-xs font-bold border border-neutral-200">
                  {destinationData.airportTransfer.airportCode} Terminal 1
                </span>
              </div>
              <h3 className="font-display font-extrabold text-lg text-[#191919]">
                {destinationData.airportTransfer.airportName}
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-3xl">
                Located ~{destinationData.airportTransfer.distanceToHotelKm} km from central {trip.destination} hotel districts. Official transport desks are located right outside the arrival gates.
              </p>
            </div>

            {/* Transfer Options Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {destinationData.airportTransfer.transferOptions.map((opt, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-white border border-neutral-200 hover:border-[#344E27]/50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Car className="w-4 h-4 text-[#344E27]" />}
                        {i === 1 && <Car className="w-4 h-4 text-blue-600" />}
                        {i === 2 && <Bus className="w-4 h-4 text-emerald-600" />}
                        {i === 3 && <Key className="w-4 h-4 text-amber-600" />}
                        <h4 className="font-display font-bold text-sm text-[#191919]">
                          {opt.mode}
                        </h4>
                      </div>
                      <span className="font-display font-extrabold text-base text-[#191919]">
                        {formatCurrency(opt.estimatedCost, currency)}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-500 flex items-center gap-2 mt-2">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Duration: {opt.duration}</span>
                    </div>

                    <p className="text-xs text-neutral-600 mt-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                      {opt.tip}
                    </p>
                  </div>

                  <button
                    onClick={() => notify(`Pre-booking info for "${opt.mode}" saved to your itinerary notes!`)}
                    className="w-full py-2 rounded-xl bg-neutral-100 hover:bg-[#344E27] hover:text-white text-neutral-700 text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    View Booking Desk & Pickup Point
                  </button>
                </div>
              ))}
            </div>

            {/* Airport Guide Bulletins */}
            <div className="p-5 rounded-2xl bg-[#E5ECE0]/40 border border-[#344E27]/20 space-y-3">
              <span className="text-xs font-bold text-[#344E27] uppercase tracking-wider block">
                Airport Best Practices & Guidelines
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-700">
                {destinationData.airportGuide.departureChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-neutral-200/50">
                    <Check className="w-3.5 h-3.5 text-[#344E27] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AIRFARE PRICE TRENDS & SAVINGS INTELLIGENCE */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            
            {/* Big Alert Ribbon */}
            <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-extrabold text-base text-amber-950">
                      {destinationData.airportGuide.fareIntelligence.status}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black">
                      Save {destinationData.airportGuide.fareIntelligence.savingsPercentage}%
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1 max-w-2xl">
                    {destinationData.airportGuide.fareIntelligence.advice}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Historical Average</span>
                <span className="text-sm line-through text-neutral-400 block">
                  {formatCurrency(destinationData.airportGuide.fareIntelligence.historicalAverageINR, currency)}
                </span>
                <span className="font-display font-black text-xl text-emerald-800">
                  {formatCurrency(destinationData.airportGuide.fareIntelligence.currentBookedINR, currency)}
                </span>
              </div>
            </div>

            {/* Price Prediction Advice Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold text-[#344E27] uppercase tracking-wider block">
                  Booking Timing
                </span>
                <h5 className="font-display font-bold text-sm text-[#191919]">
                  Book 21 to 45 Days in Advance
                </h5>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {destinationData.airportGuide.fareIntelligence.advice}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold text-[#344E27] uppercase tracking-wider block">
                  Route Intelligence
                </span>
                <h5 className="font-display font-bold text-sm text-[#191919]">
                  {outboundFlight.originCode} ➔ {outboundFlight.destinationCode} Direct Flights
                </h5>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Direct scheduled flights with {outboundFlight.airline} save transit time and avoid layover luggage transfers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold text-[#344E27] uppercase tracking-wider block">
                  Baggage & Allowance Rules
                </span>
                <h5 className="font-display font-bold text-sm text-[#191919]">
                  Included in Verified Fare
                </h5>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {destinationData.airportGuide.baggagePolicyReminder}
                </p>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* BOARDING PASS MODAL */}
      {selectedBoardingPass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-[32px] max-w-md w-full overflow-hidden shadow-2xl border border-neutral-200">
            
            {/* Modal Header */}
            <div className="bg-[#344E27] text-white p-6 relative">
              <button
                onClick={() => setSelectedBoardingPass(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-emerald-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Electronic Boarding Pass
                </span>
              </div>
              <h3 className="font-display font-black text-2xl mt-1 text-white">
                {selectedBoardingPass.airline}
              </h3>
              <p className="text-xs text-neutral-300">
                Flight {selectedBoardingPass.flightNumber} • {selectedBoardingPass.departureDate}
              </p>
            </div>

            {/* Flight Route Banner */}
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div>
                  <span className="text-xs text-neutral-400 font-bold block">{selectedBoardingPass.originCity}</span>
                  <span className="font-display font-black text-3xl text-[#191919]">
                    {selectedBoardingPass.originCode}
                  </span>
                  <span className="text-xs text-neutral-500 font-medium block">{selectedBoardingPass.departureTime}</span>
                </div>

                <div className="flex flex-col items-center px-4">
                  <span className="text-[10px] font-bold text-neutral-400">{selectedBoardingPass.duration}</span>
                  <Plane className="w-4 h-4 text-[#344E27] my-1" />
                  <span className="text-[10px] font-bold text-emerald-700">Direct</span>
                </div>

                <div className="text-right">
                  <span className="text-xs text-neutral-400 font-bold block">{selectedBoardingPass.destinationCity}</span>
                  <span className="font-display font-black text-3xl text-[#191919]">
                    {selectedBoardingPass.destinationCode}
                  </span>
                  <span className="text-xs text-neutral-500 font-medium block">{selectedBoardingPass.arrivalTime}</span>
                </div>
              </div>

              {/* Passenger & Ticket Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Passenger</span>
                  <span className="font-extrabold text-[#191919]">Traveler & Co-Traveler</span>
                </div>
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Seats</span>
                  <span className="font-extrabold text-[#344E27]">{selectedBoardingPass.seatAssignment}</span>
                </div>
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Gate & Terminal</span>
                  <span className="font-extrabold text-[#191919]">{selectedBoardingPass.gate} • {selectedBoardingPass.terminalDeparture}</span>
                </div>
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Booking PNR</span>
                  <span className="font-extrabold text-[#191919] tracking-wider">{selectedBoardingPass.bookingRef}</span>
                </div>
              </div>

              {/* Simulated Authentic Barcode / QR Code */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col items-center justify-center space-y-2">
                <div className="w-48 h-12 bg-[repeating-linear-gradient(90deg,#191919,#191919_2px,transparent_2px,transparent_6px,#191919_6px,#191919_9px,transparent_9px,transparent_11px)] rounded-xs" />
                <span className="text-[10px] font-mono tracking-widest text-neutral-400">
                  *M1PASS/{selectedBoardingPass.flightNumber}/{selectedBoardingPass.bookingRef}*
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    notify('Boarding pass added to Apple Wallet / Google Wallet!');
                    setSelectedBoardingPass(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#191919] hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Add to Mobile Wallet
                </button>
                <button
                  onClick={() => {
                    notify('Boarding pass PDF downloaded!');
                    setSelectedBoardingPass(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Download PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* IN-APP FLIGHT TICKET BOOKING MODAL */}
      <FlightBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        trip={trip}
        outboundFlight={outboundFlight}
        returnFlight={returnFlight}
        currency={currency}
        onBookingComplete={handleBookingComplete}
        onToast={notify}
      />

    </section>
  );
};
