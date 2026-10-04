'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, FileText, 
  MapPin, HelpCircle, User, Sparkles, ChevronRight, Video, 
  ArrowLeft, X, Check, CalendarCheck, CalendarDays, ExternalLink
} from 'lucide-react';
import { ASTROLOGERS, Astrologer, getAstrologerById } from '@/constants/astrologers';
import { consultationService } from '@/services/consultation.service';
import { useCheckout } from '@/hooks/useCheckout';
import Toast from '@/components/ui/toast/Toast';
import { supabase } from '@/lib/supabase';

export default function UserConsultations() {
  const { initiateCheckout, loading: checkoutLoading, error: checkoutError, setError: setCheckoutError } = useCheckout();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'book' | 'my-bookings'>('book');

  // Booking Flow States
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [selectedAstrologer, setSelectedAstrologer] = useState<Astrologer | null>(ASTROLOGERS[0]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [birthName, setBirthName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthTime, setBirthTime] = useState<string>('');
  const [birthPlace, setBirthPlace] = useState<string>('');
  const [consultationReason, setConsultationReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  
  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Booking result/success state
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // User Bookings Dashboard states
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Initialize and resolve user ID
  useEffect(() => {
    const initUser = async () => {
      const resolvedId = await consultationService.resolveDbUserId();
      setDbUserId(resolvedId);
    };
    initUser();
  }, []);

  // Automatic redirect to WhatsApp countdown timer
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown === 0) {
      if (bookingSuccess?.whatsappUrl) {
        window.location.href = bookingSuccess.whatsappUrl;
      }
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, bookingSuccess]);

  // Fetch Bookings list
  const loadUserBookings = useCallback(async () => {
    if (!dbUserId) return;
    setLoadingBookings(true);
    try {
      const { data } = await consultationService.getUserBookings(dbUserId);
      setUserBookings(data || []);
    } catch (err) {
      console.error('Failed to load user bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  }, [dbUserId]);

  // Load bookings when changing tabs
  useEffect(() => {
    if (activeTab === 'my-bookings') {
      loadUserBookings();
    }
  }, [activeTab, loadUserBookings]);

  // Pricing calculations for Gokul Vivaham Consultation
  const originalPrice = 1499;
  const platformDiscount = 300;
  const standardDiscountedPrice = 1199;

  const getCouponDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return Number(((standardDiscountedPrice * Number(appliedCoupon.discount_value)) / 100).toFixed(2));
    } else {
      return Math.min(standardDiscountedPrice, Number(appliedCoupon.discount_value));
    }
  };

  const couponDiscount = getCouponDiscount();
  const baseTaxableAmount = Number((standardDiscountedPrice - couponDiscount).toFixed(2));
  const gstAmount = 0; // No GST while the business is unregistered.
  const finalFee = Number((baseTaxableAmount + gstAmount).toFixed(2));

  // Date selection logic (Generate next 14 days)
  const getNext14Days = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      dates.push({
        dayName: nextDate.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: nextDate.getDate(),
        month: nextDate.toLocaleDateString('en-US', { month: 'short' }),
        isoString: nextDate.toISOString().split('T')[0]
      });
    }
    return dates;
  };

  const next14Days = getNext14Days();

  // Handle Coupon Check
  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const { data: coupons } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .gt('expiry_date', new Date().toISOString());

      const coupon = coupons?.[0];
      if (coupon && (coupon.uses_count || 0) < (coupon.max_uses || 100)) {
        setAppliedCoupon(coupon);
        setCouponSuccess(`Coupon "${coupon.code}" applied! Save ₹${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : ''}`);
      } else {
        setCouponError('Invalid or expired coupon code.');
        setAppliedCoupon(null);
      }
    } catch (e) {
      setCouponError('Error verifying coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  // Payment Execution
  const handleProceedToPayment = async () => {
    if (!selectedDate || !consultationReason || !birthName || !birthDate || !birthTime || !birthPlace) {
      setCheckoutError('Please complete all selection steps, including birth details.');
      return;
    }

    if (consultationReason === 'Other' && !otherReason.trim()) {
      setCheckoutError('Please explain your reason for consultation.');
      return;
    }

    const finalReason = consultationReason === 'Other' ? `Other: ${otherReason}` : consultationReason;
    const formattedNotes = `Name: ${birthName} | DOB: ${birthDate} | TOB: ${birthTime} | POB: ${birthPlace}${otherReason ? ` | Notes: ${otherReason}` : ''}`;

    const bookingDetails = {
      consultationDate: selectedDate,
      consultationReason: finalReason,
      notes: formattedNotes,
      astrologerId: selectedAstrologer?.id || ASTROLOGERS[0].id
    };

    // Open Razorpay flow
    await initiateCheckout({
      paymentType: 'consultation',
      couponCode: appliedCoupon?.code || undefined,
      bookingDetails: bookingDetails,
      onSuccess: (data: any) => {
        const bookedName = birthName || data.user?.name || 'Valued Member';
        const formattedDate = selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric'
        }) : 'N/A';

        // Generate WhatsApp redirect link
        const whatsappMsg = `Hello Gokul Murugan,

I have successfully booked a Marriage Astrology Consultation through Gokul Vivaham.

Booking Details:
Name: ${bookedName}
Consultation Date: ${formattedDate}
Consultation Reason: ${finalReason}

Please guide me regarding the next steps.

Thank you.`;

        const encodedMsg = encodeURIComponent(whatsappMsg);
        const whatsappUrl = `https://wa.me/919444559071?text=${encodedMsg}`;

        setBookingSuccess({
          astrologer: selectedAstrologer || ASTROLOGERS[0],
          customerName: bookedName,
          date: selectedDate,
          reason: finalReason,
          details: bookingDetails,
          invoiceNumber: data.transaction?.invoice_number || `GV-INV-${Math.floor(100000 + Math.random() * 900000)}`,
          whatsappUrl: whatsappUrl,
          // Pricing snapshots at time of checkout
          originalPrice,
          platformDiscount,
          standardDiscountedPrice,
          couponDiscount,
          baseTaxableAmount,
          gstAmount,
          finalFee
        });

        setSuccessMsg('Consultation booked and payment verified successfully!');
        setRedirectCountdown(3); // Start automatic redirect in 3 seconds

        // Reset selections
        setSelectedDate(null);
        setBirthName('');
        setBirthDate('');
        setBirthTime('');
        setBirthPlace('');
        setConsultationReason('');
        setOtherReason('');
        setAppliedCoupon(null);
        setCouponCode('');
        setCurrentStep(1);
      },
      onCancel: () => {
        console.log('Payment cancelled');
      }
    });
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this astrologer consultation booking? A cancellation request will be sent.')) return;
    setCancellingId(bookingId);
    try {
      const res = await consultationService.cancelBooking(bookingId);
      if (res.success) {
        setSuccessMsg('Booking cancelled successfully.');
        loadUserBookings();
      } else {
        setCheckoutError('Failed to cancel booking. Please try again.');
      }
    } catch (e) {
      setCheckoutError('Error cancelling booking.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left relative">
      
      {/* Toast Notifications */}
      {checkoutError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[150] min-w-[300px]">
          <Toast message={checkoutError} type="error" onClose={() => setCheckoutError(null)} />
        </div>
      )}
      {successMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[150] min-w-[300px]">
          <Toast message={successMsg} type="success" onClose={() => setSuccessMsg(null)} />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-550 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-gold-500 animate-pulse" />
          Vedic Astrologer Consultations
        </h1>
        <p className="text-xs text-zinc-550 dark:text-zinc-400 font-light">
          Gain divine clarity on matching, Dosha remedies, and alliance timings with our certified senior astrologers.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-zinc-250 dark:border-zinc-800 text-sm gap-6">
        <button
          onClick={() => { setActiveTab('book'); setBookingSuccess(null); }}
          className={`pb-3 font-semibold transition-all relative ${
            activeTab === 'book' && !bookingSuccess
              ? 'text-maroon-700 dark:text-gold-450 border-b-2 border-maroon-600 dark:border-gold-500'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-150'
          }`}
        >
          Book Consultation
        </button>
        <button
          onClick={() => { setActiveTab('my-bookings'); setBookingSuccess(null); }}
          className={`pb-3 font-semibold transition-all relative ${
            activeTab === 'my-bookings'
              ? 'text-maroon-700 dark:text-gold-450 border-b-2 border-maroon-600 dark:border-gold-500'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-150'
          }`}
        >
          My Bookings Dashboard
          {userBookings.filter(b => b.payment_status === 'approved').length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[8px] text-white font-mono font-bold">
              {userBookings.filter(b => b.payment_status === 'approved').length}
            </span>
          )}
        </button>
      </div>      {/* BOOKING SUCCESS SCREEN */}
      {bookingSuccess && (
        <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 shadow-xl flex flex-col items-center text-center gap-6 animate-fade-in max-w-2xl mx-auto my-8">
          <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-16 w-16 animate-bounce" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-emerald-450">Consultation Booked Successfully!</h2>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed font-light">
              Your one-on-one session has been scheduled and approved. Meeting details have been dispatched to your email.
            </p>
          </div>

          {/* WhatsApp Auto-Redirect Notice */}
          <div className="w-full p-4 rounded-2xl bg-maroon-700/5 border border-maroon-600/10 text-xs text-maroon-850 dark:text-gold-450 flex flex-col items-center gap-2">
            <span className="font-semibold flex items-center gap-1.5 animate-pulse">
              💬 Connecting with Astrologer Gokul Murugan
            </span>
            <p className="font-light text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {redirectCountdown !== null && redirectCountdown > 0 ? (
                <>Redirecting to WhatsApp automatically in <strong className="font-bold font-mono text-xs">{redirectCountdown}</strong> seconds to guide you on next steps...</>
              ) : (
                <>Opening WhatsApp link...</>
              )}
            </p>
            <a
              href={bookingSuccess.whatsappUrl}
              className="mt-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full uppercase tracking-wider text-[10px] shadow-md transition-transform hover:scale-[1.02] flex items-center gap-1.5 cursor-pointer"
            >
              Proceed to WhatsApp Now
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Booking Details Grid */}
          <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-150 dark:border-zinc-800 text-left flex flex-col gap-4 text-xs">
            <span className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider font-mono border-b border-zinc-100 dark:border-zinc-850 pb-2">Booking Summary</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 uppercase font-mono">Customer Name</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{bookingSuccess.customerName}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 uppercase font-mono">Lead Astrologer</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{bookingSuccess.astrologer.name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 uppercase font-mono">Selected Date</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {new Date(bookingSuccess.date).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 uppercase font-mono">Consultation Reason</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{bookingSuccess.reason}</span>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[10px] text-zinc-405 uppercase font-mono">Invoice Reference</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">{bookingSuccess.invoiceNumber}</span>
              </div>
            </div>
          </div>

          {/* Pricing breakdown Paid */}
          <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-150 dark:border-zinc-800 text-left flex flex-col gap-3 text-xs leading-normal">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-2">
              <span className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider font-mono">Financial Breakdown</span>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                ₹{bookingSuccess.platformDiscount} Off
              </span>
            </div>

            <div className="flex justify-between text-zinc-500">
              <span>Original Base Price:</span>
              <span className="font-mono line-through">₹{bookingSuccess.originalPrice}</span>
            </div>

            <div className="flex justify-between text-zinc-550 dark:text-zinc-400">
              <span>Platform Discount:</span>
              <span className="font-mono text-emerald-600">-₹{bookingSuccess.platformDiscount}</span>
            </div>

            <div className="flex justify-between text-zinc-750 dark:text-zinc-300 font-semibold">
              <span>Discounted Base:</span>
              <span className="font-mono">₹{bookingSuccess.standardDiscountedPrice}</span>
            </div>

            {bookingSuccess.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-650 dark:text-emerald-500">
                <span>Coupon Code Discount:</span>
                <span className="font-mono">-₹{bookingSuccess.couponDiscount}</span>
              </div>
            )}

            <div className="flex justify-between text-zinc-550 dark:text-zinc-400">
              <span>Net Taxable Base Value:</span>
              <span className="font-mono">₹{bookingSuccess.baseTaxableAmount}</span>
            </div>

            <div className="flex justify-between text-zinc-555 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-850 pb-2">
              <span>GST (not charged):</span>
              <span className="font-mono">₹{bookingSuccess.gstAmount}</span>
            </div>

            <div className="flex justify-between font-bold text-zinc-900 dark:text-white pt-1">
              <span>Final Paid Amount:</span>
              <span className="font-mono text-maroon-700 dark:text-gold-450 text-sm">₹{bookingSuccess.finalFee}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => { setActiveTab('my-bookings'); setBookingSuccess(null); }}
              className="px-6 py-2.5 rounded-full luxury-gradient text-white text-xs font-bold uppercase tracking-wider shadow cursor-pointer transition-transform hover:scale-[1.02] focus:outline-none"
            >
              View My Bookings
            </button>
            <button
              onClick={() => setBookingSuccess(null)}
              className="px-6 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 dark:hover:bg-zinc-950/20 cursor-pointer focus:outline-none"
            >
              Book Another
            </button>
          </div>
        </div>
      )}

      {/* BOOKING FLOW TAB */}
      {activeTab === 'book' && !bookingSuccess && (
        <div className="max-w-3xl mx-auto w-full bg-white dark:bg-zinc-900 border border-sandal-200 dark:border-zinc-800/80 rounded-3xl shadow-xl overflow-hidden animate-fade-in flex flex-col">
          
          {/* Stepper Progress Indicator */}
          <div className="bg-sandal-50/40 dark:bg-zinc-950/40 px-6 py-5 border-b border-sandal-200/20 dark:border-zinc-800/60 flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                currentStep >= 1 ? 'bg-maroon-700 dark:bg-gold-550 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
              }`}>1</span>
              <span className={`font-semibold ${currentStep >= 1 ? 'text-maroon-800 dark:text-gold-450' : 'text-zinc-400'}`}>Date</span>
            </div>
            <div className="h-px flex-1 bg-zinc-250 dark:bg-zinc-800 mx-4" />
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                currentStep >= 2 ? 'bg-maroon-700 dark:bg-gold-550 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
              }`}>2</span>
              <span className={`font-semibold ${currentStep >= 2 ? 'text-maroon-800 dark:text-gold-450' : 'text-zinc-400'}`}>Birth Details</span>
            </div>
            <div className="h-px flex-1 bg-zinc-250 dark:bg-zinc-800 mx-4" />
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                currentStep >= 3 ? 'bg-maroon-700 dark:bg-gold-550 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
              }`}>3</span>
              <span className={`font-semibold ${currentStep >= 3 ? 'text-maroon-800 dark:text-gold-450' : 'text-zinc-400'}`}>Reason</span>
            </div>
            <div className="h-px flex-1 bg-zinc-250 dark:bg-zinc-800 mx-4" />
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                currentStep >= 4 ? 'bg-maroon-700 dark:bg-gold-550 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
              }`}>4</span>
              <span className={`font-semibold ${currentStep >= 4 ? 'text-maroon-800 dark:text-gold-450' : 'text-zinc-400'}`}>Review &amp; Pay</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 flex flex-col gap-6 text-left">
            {/* STEP 1: SELECT DATE */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {/* Exclusive Vedic Astrologer Profile summary */}
                <div className="flex flex-col md:flex-row gap-5 p-5 rounded-2xl bg-gradient-to-br from-sandal-50/30 to-white dark:from-zinc-900/40 dark:to-zinc-950 border border-sandal-200/30 dark:border-zinc-800/60 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gold-400/5 dark:bg-gold-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="p-0.5 rounded-xl bg-gradient-to-tr from-maroon-700 via-gold-500 to-amber-500 shadow-sm">
                      <div className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center font-serif text-lg font-black text-maroon-700 dark:text-gold-450 relative overflow-hidden">
                        GM
                        <Sparkles className="absolute bottom-1 right-1 h-2.5 w-2.5 text-gold-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="px-2 py-0.5 w-max rounded-full bg-gold-400/10 text-gold-750 dark:text-gold-450 text-[9px] font-bold uppercase font-mono tracking-wider">
                        ★ Lead Astrologer
                      </span>
                      <h3 className="text-base font-serif font-bold text-zinc-900 dark:text-zinc-100">{selectedAstrologer?.name}</h3>
                      <p className="text-[10px] text-maroon-750 dark:text-gold-450 font-serif tracking-wide">{selectedAstrologer?.title}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center text-[11px] text-zinc-550 dark:text-zinc-400 leading-normal pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-850/80 pt-3 md:pt-0">
                    <p className="italic font-light">"Providing divine clarity on horoscope matching, compatibility analysis, and dosha remedies to help you make confident matrimonial decisions."</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-mono">Select Appointment Date</h2>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 font-light mt-0.5">Please choose a convenient date for your astrologer consultation session:</p>
                  
                  {/* Calendar cards list */}
                  <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-thin mt-2">
                    {next14Days.map((d, index) => {
                      const isSelected = selectedDate === d.isoString;
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(d.isoString)}
                          className={`flex flex-col items-center justify-center min-w-[65px] p-3 rounded-xl border transition-all cursor-pointer focus:outline-none ${
                            isSelected
                              ? 'border-maroon-600 dark:border-gold-500 bg-maroon-600/10 dark:bg-gold-500/15 font-semibold text-maroon-800 dark:text-gold-450 scale-[1.02]'
                              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 text-zinc-650 dark:text-zinc-400'
                          }`}
                        >
                          <span className="text-[8px] uppercase tracking-wider font-mono font-medium">{d.dayName}</span>
                          <span className="text-base font-serif font-black dark:text-zinc-100 mt-0.5">{d.dayNum}</span>
                          <span className="text-[8px] uppercase tracking-wider font-mono font-medium mt-0.5">{d.month}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Standard date picker option for custom dates */}
                  <div className="flex flex-col gap-1.5 mt-3 text-xs w-full sm:max-w-xs">
                    <label className="font-bold text-zinc-550 dark:text-zinc-455 uppercase tracking-wider text-[9px] font-mono">Or Choose Another Date:</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={selectedDate || ''}
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Min is tomorrow
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none text-xs text-zinc-805 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!selectedDate}
                    className="px-6 py-2.5 rounded-full luxury-gradient text-white text-xs font-bold uppercase tracking-wider shadow cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.01] focus:outline-none flex items-center gap-1"
                  >
                    Continue to Birth Details <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ENTER BIRTH DETAILS */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-5 animate-fade-in text-xs">
                <div className="flex flex-col gap-1 text-left">
                  <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-mono">Birth Details</h2>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 font-light mt-0.5">Please provide the birth details of the prospective bride/groom (mandatory):</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-zinc-550 dark:text-zinc-455 uppercase tracking-wider text-[9px] font-mono">Full Name *</label>
                    <input
                      type="text"
                      placeholder="Enter birth name"
                      value={birthName}
                      onChange={(e) => setBirthName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100 text-xs"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-zinc-550 dark:text-zinc-455 uppercase tracking-wider text-[9px] font-mono">Date of Birth *</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100 text-xs"
                    />
                  </div>

                  {/* Time of Birth */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-zinc-550 dark:text-zinc-455 uppercase tracking-wider text-[9px] font-mono">Time of Birth *</label>
                    <input
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100 text-xs"
                    />
                  </div>

                  {/* Place of Birth */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-zinc-550 dark:text-zinc-455 uppercase tracking-wider text-[9px] font-mono">Place of Birth *</label>
                    <input
                      type="text"
                      placeholder="e.g. Chennai, Tamil Nadu"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-5 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-655 dark:text-zinc-350 text-xs font-bold uppercase hover:bg-zinc-50 dark:hover:bg-zinc-950/20 cursor-pointer focus:outline-none flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Date
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!birthName.trim() || !birthDate || !birthTime || !birthPlace.trim()}
                    className="px-6 py-2.5 rounded-full luxury-gradient text-white text-xs font-bold uppercase tracking-wider shadow cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.01] focus:outline-none flex items-center gap-1"
                  >
                    Continue to Reason <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REASON FOR CONSULTATION */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-5 animate-fade-in text-xs">
                <div className="flex flex-col gap-1 text-left">
                  <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-mono">Reason For Consultation</h2>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 font-light mt-0.5">Please select the category that best describes your inquiry (mandatory):</p>
                </div>

                {/* Dropdown Field */}
                <div className="flex flex-col gap-1.5 mt-1 text-left">
                  <label className="font-bold text-zinc-550 dark:text-zinc-455 uppercase tracking-wider text-[9px] font-mono">Select Category *</label>
                  <select
                    value={consultationReason}
                    onChange={(e) => {
                      setConsultationReason(e.target.value);
                      if (e.target.value !== 'Other') setOtherReason('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100 text-xs dark:bg-zinc-900"
                  >
                    <option value="" disabled>-- Select a consultation category --</option>
                    <option value="Marriage Matching (Porutham)">Marriage Matching (Porutham)</option>
                    <option value="Love Marriage Analysis">Love Marriage Analysis</option>
                    <option value="Arranged Marriage Compatibility">Arranged Marriage Compatibility</option>
                    <option value="Second Marriage Consultation">Second Marriage Consultation</option>
                    <option value="Dosham Analysis">Dosham Analysis</option>
                    <option value="Marriage Delay Analysis">Marriage Delay Analysis</option>
                    <option value="Family Compatibility Analysis">Family Compatibility Analysis</option>
                    <option value="General Matrimonial Guidance">General Matrimonial Guidance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Conditional Text Area if "Other" is selected */}
                {consultationReason === 'Other' && (
                  <div className="flex flex-col gap-1.5 animate-fade-in text-left">
                    <label className="font-bold text-zinc-550 dark:text-zinc-455 uppercase tracking-wider text-[9px] font-mono">Please specify your reason *</label>
                    <textarea
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      rows={4}
                      placeholder="Please details what you'd like to consult the astrologer about (minimum 10 characters)..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none dark:text-zinc-100 font-light"
                    />
                  </div>
                )}

                <div className="flex justify-between mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-5 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 text-xs font-bold uppercase hover:bg-zinc-50 dark:hover:bg-zinc-950/20 cursor-pointer focus:outline-none flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Birth Details
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    disabled={!consultationReason || (consultationReason === 'Other' && otherReason.trim().length < 5)}
                    className="px-6 py-2.5 rounded-full luxury-gradient text-white text-xs font-bold uppercase tracking-wider shadow cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.01] focus:outline-none flex items-center gap-1"
                  >
                    Continue to Review <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW BOOKING & PAYMENT */}
            {currentStep === 4 && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div className="flex flex-col gap-1 text-left">
                  <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-mono">Review Your Consultation</h2>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 font-light mt-0.5">Please review your booking details before proceeding to payment:</p>
                </div>

                {/* Review Details Table Card */}
                <div className="w-full bg-zinc-50/60 dark:bg-zinc-950/30 rounded-2xl p-5 border border-zinc-150/60 dark:border-zinc-850/80 text-xs grid grid-cols-1 sm:grid-cols-2 gap-5 leading-normal">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-mono">Selected Vedic Scholar</span>
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <User className="h-4 w-4 text-maroon-700 dark:text-gold-450 shrink-0" />
                      {selectedAstrologer?.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-light italic mt-0.5 pl-5">{selectedAstrologer?.title}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-mono">Consultation Date</span>
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-maroon-700 dark:text-gold-450 shrink-0" />
                      {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      }) : 'N/A'}
                    </span>
                  </div>

                  {/* Birth Details Block */}
                  <div className="flex flex-col gap-1 sm:col-span-2 border-t border-zinc-150 dark:border-zinc-850/60 pt-4">
                    <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-mono">Birth Details</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-1.5 p-3 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 text-[11px]">
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-[9px] text-zinc-400 font-mono">Name:</span>
                        <span className="font-bold text-foreground">{birthName}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-[9px] text-zinc-400 font-mono">Date of Birth:</span>
                        <span className="font-bold text-foreground">
                          {birthDate ? new Date(birthDate).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-[9px] text-zinc-400 font-mono">Time of Birth:</span>
                        <span className="font-bold text-foreground">{birthTime}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-[9px] text-zinc-400 font-mono">Place of Birth:</span>
                        <span className="font-bold text-foreground">{birthPlace}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2 border-t border-zinc-150 dark:border-zinc-850/60 pt-4">
                    <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-mono">Consultation Reason</span>
                    <span className="font-bold text-foreground flex items-start gap-1.5 leading-relaxed">
                      <FileText className="h-4 w-4 text-maroon-700 dark:text-gold-450 shrink-0 mt-0.5" />
                      {consultationReason === 'Other' ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground dark:text-zinc-100 font-semibold">Other Special Consultation Inquiry</span>
                          <p className="text-[10px] bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-2.5 rounded-lg italic font-light text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl font-mono">
                            "{otherReason}"
                          </p>
                        </div>
                      ) : (
                        consultationReason
                      )}
                    </span>
                  </div>
                </div>

                {/* Price Matrix & Coupon Block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-2">
                  <div className="flex flex-col gap-3 text-xs bg-zinc-50/30 dark:bg-zinc-950/20 p-5 rounded-2xl border border-zinc-150/40 dark:border-zinc-850/60 leading-normal">
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-2">
                      <span className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider font-mono">Pricing Breakdown</span>
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase">
                        ₹{platformDiscount} Platform Off
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-zinc-550 dark:text-zinc-400 mt-1">
                      <span>Original Price:</span>
                      <span className="font-mono line-through text-zinc-400">₹{originalPrice.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-zinc-550 dark:text-zinc-400">
                      <span>Platform Discount:</span>
                      <span className="font-mono text-emerald-600 font-medium">-₹{platformDiscount.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-semibold border-b border-zinc-100 dark:border-zinc-850/40 pb-2">
                      <span>Discounted Price:</span>
                      <span className="font-mono">₹{standardDiscountedPrice.toLocaleString('en-IN')}</span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-500 border-b border-zinc-100 dark:border-zinc-850/40 pb-2">
                        <span>Coupon Discount ({appliedCoupon.code}):</span>
                        <span className="font-mono">-₹{couponDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-zinc-550 dark:text-zinc-400">
                      <span>Net Taxable Base:</span>
                      <span className="font-mono">₹{baseTaxableAmount.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-zinc-550 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-850 pb-2">
                      <span>GST (not charged):</span>
                      <span className="font-mono">₹{gstAmount.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-sm font-bold text-zinc-900 dark:text-zinc-100 pt-1">
                      <span>Final Payable Amount:</span>
                      <span className="font-mono text-maroon-700 dark:text-gold-450 text-base">₹{finalFee.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Coupon Codes Panel */}
                  <div className="flex flex-col gap-2 bg-zinc-50/30 dark:bg-zinc-950/20 p-5 rounded-2xl border border-zinc-150/40 dark:border-zinc-850/60 leading-normal">
                    <span className="text-[9px] font-bold text-zinc-455 uppercase tracking-wider font-mono">Apply Coupon Code</span>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-relaxed font-light mb-1">Enter a valid promotion code to receive immediate checkout discounts:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. ASTRO20"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-transparent uppercase font-mono"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading}
                        className="px-4 py-2 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold uppercase rounded-xl transition-all cursor-pointer focus:outline-none"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && <span className="text-[10px] text-red-655 dark:text-red-400 mt-1">{couponError}</span>}
                    {couponSuccess && <span className="text-[10px] text-emerald-655 dark:text-emerald-500 font-semibold mt-1">{couponSuccess}</span>}
                  </div>
                </div>

                {/* Stepper Footer buttons */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-5 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 text-xs font-bold uppercase hover:bg-zinc-50 dark:hover:bg-zinc-950/20 cursor-pointer focus:outline-none flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Reason
                  </button>
                  <button
                    onClick={handleProceedToPayment}
                    disabled={checkoutLoading}
                    className="px-8 py-3 luxury-gradient rounded-full text-white text-xs font-bold uppercase tracking-wider shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 hover:scale-[1.01] focus:outline-none"
                  >
                    {checkoutLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Initializing Gateway...
                      </>
                    ) : (
                      <>
                        Proceed to Payment (₹{finalFee.toLocaleString('en-IN')})
                      </>
                    )}
                  </button>
                </div>
                
                <div className="flex justify-center items-center gap-1 text-[9px] text-zinc-450 dark:text-zinc-550 italic mt-2">
                  🔒 Secure Encrypted Connection. By continuing, you agree to our booking policies.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* USER BOOKINGS DASHBOARD TAB */}
      {activeTab === 'my-bookings' && (
        <div className="flex flex-col gap-4">
          
          {loadingBookings ? (
            <div className="flex flex-col gap-6 items-center justify-center min-h-[250px] py-12">
              <div className="w-8 h-8 border-4 border-maroon-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-550 dark:text-zinc-400 font-light">Retrieving booking log...</span>
            </div>
          ) : userBookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 items-stretch">
              {userBookings.map((booking) => {
                const astrologer = getAstrologerById(booking.astrologer_id);
                
                const isApproved = booking.payment_status === 'approved';
                const isCancelled = booking.payment_status === 'cancelled';
                const isPending = booking.payment_status === 'pending';

                // Format date
                const formattedDate = new Date(booking.consultation_date).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric', weekday: 'short'
                });

                // Simulated meet link based on booking ID
                const googleMeetUrl = booking.meeting_url;

                return (
                  <div
                    key={booking.id}
                    className={`p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-md border flex flex-col justify-between transition-all relative overflow-hidden ${
                      isApproved 
                        ? 'border-emerald-500/30' 
                        : isCancelled 
                        ? 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/10 opacity-75' 
                        : 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/5'
                    }`}
                  >
                    
                    {/* Top Status Banner */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] text-zinc-455 uppercase font-mono">Astrologer</span>
                        <span className="text-xs font-serif font-bold text-zinc-850 dark:text-zinc-100">
                          {astrologer?.name || 'Vedic Astrologer'}
                        </span>
                      </div>
                      
                      {/* Status Badges */}
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-900/10'
                          : isCancelled
                          ? 'bg-zinc-100 text-zinc-455 border-zinc-900/10 dark:bg-zinc-800 dark:text-zinc-400'
                          : 'bg-amber-500/10 text-amber-600 border-amber-900/10 animate-pulse'
                      }`}>
                        {booking.payment_status}
                      </span>
                    </div>

                    <div className="h-px bg-zinc-100 dark:bg-zinc-800/80 my-3" />

                    {/* Booked Date details */}
                    <div className="flex flex-col gap-2.5 text-xs text-left font-light text-zinc-650 dark:text-zinc-350 leading-relaxed mb-6">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-zinc-400 shrink-0" />
                        <span>
                          <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Date:</strong> {formattedDate}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                        <span>
                          <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Reason:</strong> {booking.consultation_reason}
                        </span>
                      </div>
                      
                      {/* Notes / Details */}
                      {booking.notes && (
                        <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-150/40 dark:border-zinc-850/60 w-full text-[10px] font-sans italic leading-relaxed text-zinc-500 dark:text-zinc-400">
                          {booking.notes}
                        </div>
                      )}
                    </div>

                    {/* CTA Actions */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-3 border-t border-zinc-100 dark:border-zinc-850 pt-4">
                      {isApproved && (
                        <>
                          {googleMeetUrl ? <a
                            href={googleMeetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-center text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow transition-all flex items-center justify-center gap-1.5 focus:outline-none"
                          >
                            <Video className="h-4 w-4" />
                            Join Video Call
                            <ExternalLink className="h-3 w-3" />
                          </a> : <span className="text-xs">Meeting link will appear after scheduling.</span>}
                          {booking.scheduled_at && <span className="text-xs">{new Date(booking.scheduled_at).toLocaleString()} · {booking.duration_minutes || 30} minutes</span>}
                          
                          <a href="https://wa.me/919444559071" className="text-xs underline">Contact office to change slot</a>
                        </>
                      )}

                      {isPending && (
                        <>
                          <button
                            disabled
                            className="flex-1 py-2 px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-xl text-center text-[10px] font-bold uppercase tracking-wider cursor-default"
                          >
                            Awaiting Gateway Capture
                          </button>
                          
                          <a href="https://wa.me/919444559071" className="text-xs underline">Contact office to change slot</a>
                        </>
                      )}

                      {isCancelled && (
                        <button
                          disabled
                          className="w-full py-2 px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-xl text-center text-[10px] font-bold uppercase tracking-wider cursor-default"
                        >
                          Booking Cancelled
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-3xl min-h-[300px] gap-3 text-center p-4">
              <Calendar className="h-10 w-10 text-zinc-300 dark:text-zinc-700 animate-bounce" />
              <div className="flex flex-col gap-1 max-w-sm">
                <span className="font-serif font-bold text-zinc-600 dark:text-zinc-400 text-sm">No bookings found</span>
                <p className="text-xs text-zinc-550 leading-normal font-light">
                  You have not scheduled any astrologer consultations yet. Go to the "Book Consultation" tab to schedule your first session.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

