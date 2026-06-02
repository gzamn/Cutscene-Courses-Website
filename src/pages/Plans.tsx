import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  CreditCard, 
  Lock, 
  Building2, 
  Send, 
  Loader2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  db, 
  handleFirestoreError, 
  OperationType, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  setDoc,
  query
} from '../firebase';

const DEFAULT_PLANS = [
  {
    name: 'Free Plan',
    price: '0 DA',
    description: 'Perfect for beginners getting started. Get access to basic sample tutorials and basic community access.',
    features: [
      'Access to Free Chapter Lessons',
      'Standard 720p Overlay Stock',
      'Basic Discord Channel Access',
      'Web-Only Support Response'
    ],
    isPopular: false,
    order: 0
  },
  {
    name: 'Starter Editor Bundle',
    price: '4,900 DA',
    description: 'Perfect for beginners getting started with video editing, basic templates and sound libraries.',
    features: [
      'Access to Basic Softwares',
      '100+ Premium Stock Sound Effects',
      'Standard 1080p Overlay Stock',
      'Community Discord Access',
      'Email Support Response'
    ],
    isPopular: false,
    order: 1
  },
  {
    name: 'Pro Creator Membership',
    price: '9,900 DA',
    description: 'Our most chosen program for creators looking to turn video editing into a high-paying career.',
    features: [
      'Access to ALL Premium Software & LUTs',
      '1,000+ sound effects & cinematic loops',
      'Unlimited 4K Video Drone Overlays',
      'Live evaluation & mentor homework checks',
      'Official completion certificates upon graduation',
      'Premium Discord Mastermind channels'
    ],
    isPopular: true,
    order: 2
  },
  {
    name: 'Master Studio Enterprise',
    price: '19,900 DA',
    description: 'For agencies, studios, and elite directors who need full enterprise coverage and private evaluations.',
    features: [
      'Everything in Pro Creator pack',
      '1-on-1 private call consultation per chapter',
      'Custom sound effects sound designing requested',
      'Lifetime priority updates first-access',
      'Priority 24/7 VIP whatsapp support queue'
    ],
    isPopular: false,
    order: 3
  }
];

export default function Plans() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<any | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'process' | 'success'>('details');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'baridimob'>('card');
  const [processing, setProcessing] = useState(false);

  // Fetch plans from Firestore
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const plansSnapshot = await getDocs(collection(db, 'plans'));
        let list = plansSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (list.length === 0) {
          console.log('Plans collection is empty. Auto-seeding subscriptions...');
          for (const plan of DEFAULT_PLANS) {
            await addDoc(collection(db, 'plans'), plan);
          }
          const seededSnapshot = await getDocs(collection(db, 'plans'));
          list = seededSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } else {
          // Check if Free Plan is missing in the database list
          const hasFreePlan = list.some(p => p.name === 'Free Plan' || p.name?.toLowerCase().includes('free'));
          if (!hasFreePlan) {
            console.log('Seeding Free Plan specifically into existing plans collection...');
            const freePlan = DEFAULT_PLANS[0];
            await addDoc(collection(db, 'plans'), freePlan);
            const refreshSnapshot = await getDocs(collection(db, 'plans'));
            list = refreshSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
          }
        }

        // Sort plans by 'order'
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setPlans(list);
      } catch (err: any) {
        console.error('Error fetching plans:', err);
        handleFirestoreError(err, OperationType.LIST, 'plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleChoosePlan = (plan: any) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setCheckoutPlan(plan);
    setPhone(userProfile?.phone || '');
    setCheckoutStep('details');
  };

  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      alert('Kindly fill in your phone number for registration contact.');
      return;
    }

    setProcessing(true);
    setCheckoutStep('process');

    try {
      // 1. Save plan details and subscription status to the user's Firestore document
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        activePlan: checkoutPlan.name,
        activePlanPrice: checkoutPlan.price,
        hasPlan: true,
        subscribed: true,
        phone: phone,
        planPurchasedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Clear state and show success confirmation screen
      setTimeout(() => {
        setProcessing(false);
        setCheckoutStep('success');
      }, 1500);

    } catch (err) {
      console.error('Checkout error:', err);
      alert('There was an issue updating your subscription in the database.');
      setCheckoutStep('details');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-36 pb-24 text-white relative">
      {/* Background decoration highlight */}
      <div className="absolute top-10 left-1/3 -translate-x-1/2 w-[60%] h-[35%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Header Block */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold text-xs uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Academy Memberships
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-6">
            CHOOSE YOUR PLAN
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Gain immediate unlimited entry to all premium downloads, presets, software licenses, 1-on-1 assignments evaluations, and private Discord channels.
          </p>
        </motion.div>

        {/* Account subscription status check */}
        {user && userProfile?.activePlan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto mb-12"
          >
            <div className="bg-gradient-to-r from-purple-950/20 to-zinc-950/40 border border-purple-500/20 px-6 py-5 rounded-3xl flex items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">Active Subscription: {userProfile.activePlan}</h4>
                  <p className="text-xs text-gray-500">Your profile details reflect full access to downloadables.</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/downloadables')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold transition-all text-white"
              >
                Go to Downloads
              </button>
            </div>
          </motion.div>
        )}

        {/* Pricing Matrix */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-purple-400 font-mono">LOADING MEMBERSHIP BUNDLES...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {plans.map((plan, idx) => {
              const matchesSelectedProfile = userProfile?.activePlan === plan.name;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.1 }}
                  key={plan.id || idx}
                  className={`relative rounded-[2.5rem] p-8 text-left flex flex-col justify-between transition-all duration-300 md:scale-100 ${
                    plan.isPopular 
                      ? 'bg-gradient-to-b from-purple-950/40 via-zinc-950 to-zinc-950 border-2 border-purple-500 shadow-[0_0_50px_rgba(158,58,235,0.25)] md:scale-105 z-10' 
                      : 'bg-zinc-950/60 border border-purple-900/10 hover:border-purple-500/25 hover:bg-zinc-950 hover:shadow-[0_0_35px_rgba(87,44,242,0.1)]'
                  }`}
                >
                  {/* Subtle purple radial background light only for popular card to emphasize saturation */}
                  {plan.isPopular && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(158,58,235,0.12),transparent_70%)] rounded-[2.5rem] pointer-events-none" />
                  )}

                  {/* Popular decorative accent tag */}
                  {plan.isPopular && (
                    <div className="absolute top-0 right-10 -translate-y-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-800 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-lg shadow-purple-500/40 border border-purple-400/20">
                      <Sparkles className="w-3.5 h-3.5 text-purple-200 animate-pulse animate-duration-1000" />
                      Most Popular
                    </div>
                  )}

                  {/* Top info */}
                  <div className="relative z-10 w-full">
                    <h3 className={`text-2xl font-black mb-2 truncate ${
                      plan.isPopular ? 'text-white' : 'text-gray-300'
                    }`}>
                      {plan.name}
                    </h3>
                    <p className="text-xs text-gray-400 min-h-[40px] leading-relaxed mb-6">
                      {plan.description}
                    </p>

                    <div className="flex items-baseline gap-2 mb-8">
                      <span className={`text-4xl sm:text-5xl font-black tracking-tight ${
                        plan.isPopular ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-purple-400' : 'text-white'
                      }`}>
                        {plan.price}
                      </span>
                      <span className="text-[10px] text-purple-400/70 font-bold uppercase tracking-wider">
                        /month
                      </span>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-4 mb-8">
                      {Array.isArray(plan.features) && plan.features.map((feature: string, fIdx: number) => (
                        <li key={fIdx} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                            plan.isPopular ? 'bg-purple-500/20 text-purple-300 border border-purple-400/20' : 'bg-purple-950/20 text-purple-400 border border-purple-900/30'
                          }`}>
                            <Check className="w-3.5 h-3.5 font-bold" />
                          </div>
                          <span className={`text-xs leading-normal ${
                            plan.isPopular ? 'text-gray-200 font-medium' : 'text-gray-400'
                          }`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions purchase button */}
                  <button
                    onClick={() => handleChoosePlan(plan)}
                    disabled={matchesSelectedProfile}
                    className={`w-full py-4 rounded-[1.25rem] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer relative z-10 ${
                      matchesSelectedProfile
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold cursor-not-allowed'
                        : plan.isPopular
                          ? 'bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.02] active:scale-[0.98]'
                          : 'bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 hover:text-white border border-purple-900/40 hover:border-purple-500/50 hover:scale-[1.01]'
                    }`}
                  >
                    {matchesSelectedProfile ? (
                      'Your Active Plan'
                    ) : (
                      <>
                        Choose Bundle
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAILED CHECKOUT SIMULATED DIALOG MODAL */}
      <AnimatePresence>
        {checkoutPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/90 backdrop-blur-md cursor-pointer" 
              onClick={() => !processing && setCheckoutPlan(null)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/40 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left"
            >
              {checkoutStep === 'details' && (
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                    Complete Order
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-6">
                    Confirm your details to finalize your subscription to <span className="text-purple-400 font-bold">{checkoutPlan.name}</span> membership package.
                  </p>

                  <form onSubmit={handleCompletePayment} className="space-y-5">
                    {/* User profile details review */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                        Account Details
                      </label>
                      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-white/5 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Name:</span>
                          <span className="font-semibold text-gray-200">{userProfile?.displayName || user?.displayName || 'Student Profile'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Email:</span>
                          <span className="font-semibold text-gray-200">{user?.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Phone registration input */}
                    <div>
                      <label htmlFor="checkoutPhone" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                        Registration Contact Phone Number
                      </label>
                      <input 
                        id="checkoutPhone"
                        type="text" 
                        required
                        placeholder="e.g. 0550 00 00 00"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-650 focus:outline-none focus:border-purple-500/30 transition-all"
                      />
                    </div>

                    {/* Choose Payment Method */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
                        Select Payment System
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            paymentMethod === 'card' 
                              ? 'border-purple-600 bg-purple-950/20 text-white' 
                              : 'border-white/5 bg-zinc-900/40 text-gray-400 hover:text-white'
                          }`}
                        >
                          <CreditCard className="w-5 h-5 text-purple-400" />
                          <span className="text-xs font-bold">Edahabia / CIB</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('baridimob')}
                          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            paymentMethod === 'baridimob' 
                              ? 'border-purple-600 bg-purple-950/20 text-white' 
                              : 'border-white/5 bg-zinc-900/40 text-gray-400 hover:text-white'
                          }`}
                        >
                          <Building2 className="w-5 h-5 text-purple-400" />
                          <span className="text-xs font-bold">BaridiMob Pay</span>
                        </button>
                      </div>
                    </div>

                    {/* Summary row */}
                    <div className="pt-2 border-t border-purple-900/10 flex items-center justify-between text-sm">
                      <span className="text-gray-400 font-bold">Amount Due:</span>
                      <span className="text-2xl font-black text-purple-400">{checkoutPlan.price}</span>
                    </div>

                    {/* Call to actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setCheckoutPlan(null)}
                        className="flex-1 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-gray-300 font-bold text-xs uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Complete Order
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {checkoutStep === 'process' && (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                  <h4 className="font-bold text-lg text-white mb-1">Processing Transactions...</h4>
                  <p className="text-xs text-gray-400">Verifying secure escrow and provisioning subscription keys...</p>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="text-center py-6 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                    Purchase Completed!
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-6">
                    Congratulations! Your subscription is now fully updated in our database. You have full unlock clearance to download premium softwares, audio elements, overlays, and stock videos.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutPlan(null);
                      navigate('/downloadables');
                    }}
                    className="px-8 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/30"
                  >
                    Gain Assets Access
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
