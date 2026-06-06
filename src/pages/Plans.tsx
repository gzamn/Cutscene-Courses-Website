import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
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
  Loader2,
  Upload,
  Landmark
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
  query,
  where
} from '../firebase';
import ValidationTooltip from '../components/ValidationTooltip';

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
  const [paymentMethod, setPaymentMethod] = useState<'ccp' | 'baridimob'>('baridimob');
  const [processing, setProcessing] = useState(false);

  // New billing & receipts states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [ccpRIP, setCcpRIP] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Pre-fill user data when available
  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.displayName || userProfile.fullName || '');
      setPhone(userProfile.phone || '');
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [userProfile, user]);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Kindly choose or drop an image file of the payment receipt.');
      return;
    }
    setReceiptFile(file);
    setValidationErrors(prev => ({ ...prev, receipt: '' }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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

  const handleChoosePlan = async (plan: any) => {
    if (!user) {
      navigate('/login');
      return;
    }

    // If Free Plan is chosen directly (price is '0 DA') and they don't have subscriptions
    const isFree = plan.price === '0 DA' || plan.name?.toLowerCase().includes('free');
    if (isFree) {
      setProcessing(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          activePlan: 'Free Plan',
          activePlanPrice: '0 DA',
          hasPlan: false,
          subscribed: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        alert('Reverted to Free Plan successfully.');
        window.location.reload();
      } catch (err) {
        console.error('Free plan assignment error:', err);
      } finally {
        setProcessing(false);
      }
      return;
    }

    setCheckoutPlan(plan);
    setPhone(userProfile?.phone || '');
    setReceiptFile(null);
    setReceiptBase64(null);
    setTermsAgreed(false);
    setPolicyAgreed(false);
    setValidationErrors({});
    setCheckoutStep('details');
  };

  const handleRevertFreePlan = () => {
    const confirmCancel = window.confirm('Are you sure you want to cancel your current plan subscription?');
    if (confirmCancel) {
      alert('You will be contacted via phone number to finalize the process.');
    }
  };

  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    // 1. Full name validation: must be filled and correct formatted text
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errors.fullName = 'must be filled before continuing';
    } else if (trimmedName.length < 3) {
      errors.fullName = 'Your Full Name must contain at least 3 letters.';
    } else {
      const nameRegex = /^[\p{L}\s.''-]+$/u;
      if (!nameRegex.test(trimmedName)) {
        errors.fullName = 'Please enter a correct full name (consisting only of letter characters, spaces, and hyphens).';
      }
    }

    // 2. Email validation: must be filled with a correct formatted email address
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'must be filled before continuing';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Please enter a correct email address format (e.g. yourname@domain.com).';
      }
    }

    // 3. Phone validation: must be filled with a correct formatted phone number
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errors.phone = 'must be filled before continuing';
    } else {
      const cleanPhone = trimmedPhone.replace(/[+\s-()]/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
        errors.phone = 'Please enter a correct phone number containing 9 to 15 digits (e.g., 0550123456).';
      }
    }

    // 4. Agreement state validation
    if (!termsAgreed) {
      errors.termsAgreed = 'must be filled before continuing';
    }
    if (!policyAgreed) {
      errors.policyAgreed = 'must be filled before continuing';
    }

    if (!receiptBase64) {
      errors.receipt = 'must be filled before continuing';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setProcessing(true);
    setCheckoutStep('process');

    try {
      // 1. Create check-out confirmation entry in our enrollments ledger
      const planId = 'plan_' + checkoutPlan.name.replace(/\s+/g, '_').toLowerCase();
      const q = query(collection(db, 'enrollments'), where('uid', '==', user.uid), where('courseId', '==', planId));
      const snap = await getDocs(q);

      const payload = {
        uid: user.uid,
        courseId: planId,
        planName: checkoutPlan.name,
        enrolledAt: new Date().toISOString(),
        status: 'pending_verification',
        fullName: fullName,
        email: email,
        phone: phone,
        ccpRIP: ccpRIP,
        format: 'plan',
        totalPaid: checkoutPlan.price,
        price: checkoutPlan.price,
        paid: false,
        receiptUrl: receiptBase64,
        paymentMethod: paymentMethod,
        submittedAt: new Date().toISOString()
      };

      if (snap.empty) {
        await addDoc(collection(db, 'enrollments'), payload);
      } else {
        const docId = snap.docs[0].id;
        await setDoc(doc(db, 'enrollments', docId), payload, { merge: true });
      }

      // Ensure billing phone gets updated on the user profile
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        phone: phone,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setCheckoutStep('success');
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Coult not save your transaction receipt. Kindly check your network and repeat.');
      setCheckoutStep('details');
    } finally {
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
              const isPaidActive = userProfile?.activePlan && userProfile?.activePlan !== 'Free Plan';
              const isFreeCard = plan.name === 'Free Plan' || plan.name?.toLowerCase().includes('free');
              const canRevert = isPaidActive && isFreeCard;
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
                  {canRevert ? (
                    <button
                      onClick={handleRevertFreePlan}
                      className="w-full py-4 rounded-[1.25rem] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer relative z-10 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 hover:text-white border border-purple-900/40 hover:border-purple-500/50 hover:scale-[1.01]"
                    >
                      revert back to this plan
                    </button>
                  ) : (
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
                  )}
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

                  <form onSubmit={handleCompletePayment} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 pb-2">
                    {/* User profile details review */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            if (validationErrors.fullName) {
                              setValidationErrors(prev => ({ ...prev, fullName: '' }));
                            }
                          }}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/30 text-left"
                        />
                        <ValidationTooltip isVisible={!!validationErrors.fullName} message={validationErrors.fullName === 'must be filled before continuing' ? 'Please fill out this field.' : validationErrors.fullName} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                          Electronic Mail Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (validationErrors.email) {
                              setValidationErrors(prev => ({ ...prev, email: '' }));
                            }
                          }}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/30 text-left"
                        />
                        <ValidationTooltip isVisible={!!validationErrors.email} message={validationErrors.email === 'must be filled before continuing' ? 'Please fill out this field.' : validationErrors.email} />
                      </div>
                    </div>

                    {/* Phone registration input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                          Phone Number
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. 0550 00 00 00"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (validationErrors.phone) {
                              setValidationErrors(prev => ({ ...prev, phone: '' }));
                            }
                          }}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-purple-500/30 text-left"
                        />
                        <ValidationTooltip isVisible={!!validationErrors.phone} message={validationErrors.phone === 'must be filled before continuing' ? 'Please fill out this field.' : validationErrors.phone} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                          Your RIP / CCP Account (Optional)
                        </label>
                        <input 
                          type="text" 
                          placeholder="To help associate payment"
                          value={ccpRIP}
                          onChange={(e) => setCcpRIP(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-purple-500/30 text-left"
                        />
                      </div>
                    </div>

                    {/* Choose Payment Method */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                        Select Payment System
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('baridimob')}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                            paymentMethod === 'baridimob' 
                              ? 'border-purple-600 bg-purple-950/20 text-white' 
                              : 'border-white/5 bg-zinc-900/40 text-gray-400 hover:text-white'
                          }`}
                        >
                          <Building2 className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-bold">BaridiMob</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('ccp')}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                            paymentMethod === 'ccp' 
                              ? 'border-purple-600 bg-purple-950/20 text-white' 
                              : 'border-white/5 bg-zinc-900/40 text-gray-400 hover:text-white'
                          }`}
                        >
                          <Landmark className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-bold">CCP</span>
                        </button>
                      </div>
                    </div>

                    {/* Account detailed card */}
                    <div className="p-4 bg-black border border-purple-500/10 rounded-xl relative overflow-hidden text-xs">
                      <h4 className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold mb-1.5">
                        {paymentMethod === 'baridimob' ? 'BaridiMob Wire details' : 'CCP Transaction Details'}
                      </h4>

                      {paymentMethod === 'baridimob' ? (
                        <div className="space-y-1 bg-zinc-950 p-2.5 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">RIP Account:</span>
                            <span className="font-mono text-purple-300 font-bold bg-purple-950/20 px-2 py-0.5 rounded select-all text-xs">
                              00799999004164129502
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 font-mono text-[10px] bg-zinc-950 p-2.5 rounded-lg">
                          <div className="flex justify-between items-center border-b border-white/5 pb-1">
                            <span className="text-gray-500">Name:</span>
                            <span className="text-white font-bold select-all">ROUABHIA AMINE</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-white/5 pb-1">
                            <span className="text-gray-500">Number:</span>
                            <span className="text-white font-bold select-all">0041641295</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Key / Address:</span>
                            <span className="text-white font-bold select-all">02 / BATNA</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Drag & Drop Box */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                        Upload Payment Receipt
                      </label>
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
                        }}
                        onClick={() => document.getElementById('plans-receipt-input')?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 relative overflow-hidden ${
                          dragOver 
                            ? 'border-purple-500 bg-purple-950/25' 
                            : receiptFile 
                              ? 'border-purple-650 bg-zinc-900/60' 
                              : 'border-purple-900/20 bg-black/40 hover:border-purple-500/25'
                        }`}
                      >
                        <input 
                          id="plans-receipt-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                        />

                        {receiptFile ? (
                          <div className="w-full space-y-2">
                            {receiptBase64 && (
                              <img 
                                src={receiptBase64} 
                                alt="Receipt Preview" 
                                className="max-h-24 mx-auto rounded-lg object-contain border border-white/10"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="text-[10px] text-purple-300 font-bold truncate px-6">
                              {receiptFile.name}
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-purple-400" />
                            <div className="text-[10px] text-gray-400">
                              <span className="text-purple-400 font-bold">Click to upload</span> or drag receipt photo
                            </div>
                          </>
                        )}
                      </div>
                      <ValidationTooltip isVisible={!!validationErrors.receipt} message="Please fill out this field." />
                    </div>

                    {/* Policies Agreement Checkboxes */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <div className="flex items-start gap-2.5">
                          <label htmlFor="agreeTermsPlans" className="relative flex items-center cursor-pointer mt-0.5 animate-none">
                            <input
                              id="agreeTermsPlans"
                              type="checkbox"
                              checked={termsAgreed}
                              onChange={(e) => {
                                setTermsAgreed(e.target.checked);
                                if (validationErrors.termsAgreed) {
                                  setValidationErrors(prev => ({ ...prev, termsAgreed: '' }));
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                              termsAgreed 
                                ? 'bg-purple-600 border-purple-500 text-white' 
                                : 'border-purple-900/40 bg-zinc-950 hover:border-purple-500/50'
                            }`}>
                              {termsAgreed && <Check className="w-3 h-3 font-black" />}
                            </div>
                          </label>
                          <span className="text-xs text-gray-400 leading-normal">
                            I hereby agree and consent to the{' '}
                            <Link 
                              to="/terms-and-conditions"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 font-bold hover:underline"
                            >
                              Terms & Conditions
                            </Link>
                          </span>
                        </div>
                        <ValidationTooltip isVisible={!!validationErrors.termsAgreed} message="Please fill out this field." />
                      </div>

                      <div>
                        <div className="flex items-start gap-2.5">
                          <label htmlFor="agreePolicyPlans" className="relative flex items-center cursor-pointer mt-0.5 animate-none">
                            <input
                              id="agreePolicyPlans"
                              type="checkbox"
                              checked={policyAgreed}
                              onChange={(e) => {
                                setPolicyAgreed(e.target.checked);
                                if (validationErrors.policyAgreed) {
                                  setValidationErrors(prev => ({ ...prev, policyAgreed: '' }));
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                              policyAgreed 
                                ? 'bg-purple-600 border-purple-500 text-white' 
                                : 'border-purple-900/40 bg-zinc-950 hover:border-purple-500/50'
                            }`}>
                              {policyAgreed && <Check className="w-3 h-3 font-black" />}
                            </div>
                          </label>
                          <span className="text-xs text-gray-400 leading-normal">
                            I certify that I accept the{' '}
                            <Link 
                              to="/privacy-policy"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 font-bold hover:underline"
                            >
                              Privacy & Refund Policy
                            </Link>
                          </span>
                        </div>
                        <ValidationTooltip isVisible={!!validationErrors.policyAgreed} message="Please fill out this field." />
                      </div>
                    </div>

                    {/* Summary row */}
                    <div className="pt-2 border-t border-purple-900/10 flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-bold">Bundle Price:</span>
                      <span className="text-xl font-black text-purple-400">{checkoutPlan.price}</span>
                    </div>

                    {/* Call to actions */}
                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setCheckoutPlan(null)}
                        className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-1.5"
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
