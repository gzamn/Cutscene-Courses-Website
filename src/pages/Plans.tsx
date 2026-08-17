import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Building2, 
  Globe, 
  Landmark, 
  Loader2, 
  Upload, 
  FileText, 
  X, 
  Zap, 
  Users, 
  HelpCircle, 
  CreditCard,
  Copy,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, collection, getDocs, doc, setDoc, addDoc, query, where, DEFAULT_PLANS, ensureDefaultPlansSeeded } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useRegion } from '../context/RegionContext';
import ValidationTooltip from '../components/ValidationTooltip';

interface PlanItem {
  id: string;
  name: string;
  tagline?: string;
  price: string;
  rawPrice?: number;
  interval?: string;
  description?: string;
  features: string[];
  isPopular?: boolean;
  badge?: string;
  buttonText?: string;
  order?: number;
  active?: boolean;
}

export default function Plans() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { currentRegion } = useRegion();

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);

  // Checkout modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Checkbox and receipt states
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Student Info State
  const [formData, setFormData] = useState({
    fullName: userProfile?.displayName || user?.displayName || '',
    email: user?.email || '',
    phone: userProfile?.phone || '',
  });

  // FAQs state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Prepopulate state when authenticated profile changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: userProfile?.displayName || user.displayName || prev.fullName,
        email: user.email || prev.email,
        phone: userProfile?.phone || prev.phone || ''
      }));
    }
  }, [user, userProfile]);

  // Set default payment method
  useEffect(() => {
    const activeMethods = currentRegion?.paymentMethods?.filter((m: any) => m.active) || [];
    if (activeMethods.length > 0) {
      setSelectedMethod(activeMethods[0].id);
    } else {
      setSelectedMethod('ccp');
    }
  }, [currentRegion]);

  // Fetch plans from Firestore or seed defaults
  useEffect(() => {
    const fetchPlansData = async () => {
      try {
        setLoading(true);
        let snap = await getDocs(collection(db, 'plans'));
        if (snap.empty) {
          await ensureDefaultPlansSeeded();
          snap = await getDocs(collection(db, 'plans'));
        }

        let list = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as PlanItem[];

        // Filter active public plans and sort by order
        list = list.filter(p => p.active !== false && !(p as any).hidden && !(p as any).isHidden);
        list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        if (list.length === 0) {
          list = DEFAULT_PLANS.filter(p => p.active !== false);
        }

        setPlans(list);
      } catch (err) {
        console.error('Error loading membership plans:', err);
        setPlans(DEFAULT_PLANS.filter(p => p.active !== false));
      } finally {
        setLoading(false);
      }
    };

    fetchPlansData();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 1000;
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(base64);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Kindly choose or drop an image file of your transaction receipt.');
      return;
    }
    setReceiptFile(file);
    try {
      const compressed = await compressImage(file);
      setReceiptBase64(compressed);
    } catch (err) {
      console.error('Image compression failed, using raw base64:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptBase64(e.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const openPlanCheckout = (plan: PlanItem) => {
    setSelectedPlan(plan);
    setValidationErrors({});
    setStep('info');
    setIsCheckoutOpen(true);
  };

  const isPlanFree = (plan: PlanItem | null) => {
    if (!plan) return false;
    const p = String(plan.price || '').toLowerCase().trim();
    return p === 'free' || p === '0' || p === '0 da' || p === '$0' || plan.rawPrice === 0;
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      errors.fullName = 'Full Name is required';
    } else if (trimmedName.length < 3) {
      errors.fullName = 'Full Name must contain at least 3 letters.';
    }

    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    const trimmedPhone = formData.phone.trim();
    const cleanPhone = trimmedPhone.replace(/[+\s-()]/g, '');
    if (!trimmedPhone) {
      errors.phone = 'Phone number is required';
    } else if (cleanPhone.length < 9 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
      errors.phone = 'Please enter a valid phone number with 9 to 15 digits.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    // If free plan, process directly
    if (isPlanFree(selectedPlan)) {
      processOrder(true);
    } else {
      setStep('payment');
    }
  };

  const processOrder = async (isFree = false) => {
    if (!user) {
      alert('Please log in or register before confirming your membership order.');
      navigate('/login');
      return;
    }

    if (!selectedPlan) return;

    const errors: { [key: string]: string } = {};

    if (!isFree) {
      if (!termsAgreed) errors.termsAgreed = 'You must agree to the Terms and Conditions.';
      if (!policyAgreed) errors.policyAgreed = 'You must agree to the Privacy Policy.';
      if (!receiptBase64) errors.receipt = 'Please attach your payment receipt before submitting.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setProcessing(true);

    try {
      const payload = {
        uid: user.uid,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        planPrice: selectedPlan.price,
        billingInterval: selectedPlan.interval || 'Per year',
        status: isFree ? 'approved' : 'pending',
        paid: isFree,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        paymentMethod: isFree ? 'Free Instant Activation' : selectedMethod,
        receiptUrl: isFree ? '' : receiptBase64,
        currency: currentRegion?.currency || 'DA',
        regionId: currentRegion?.id || 'dz',
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // Save to plan_purchases collection
      const docRef = await addDoc(collection(db, 'plan_purchases'), payload);
      await setDoc(docRef, { id: docRef.id }, { merge: true });

      // Update user document
      await setDoc(doc(db, 'users', user.uid), {
        displayName: formData.fullName.trim() || user.displayName || '',
        phone: formData.phone.trim(),
        activePlanId: isFree ? selectedPlan.id : userProfile?.activePlanId || null,
        activePlanName: isFree ? selectedPlan.name : userProfile?.activePlanName || null,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setIsCheckoutOpen(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error submitting plan order:', err);
      alert('Could not save your subscription order. Please check your connection and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const faqs = [
    {
      q: "How do subscriptions and masterclass access work?",
      a: "When you choose a plan, you immediately gain access to our full suite of masterclasses, resources, software configurations, and discord community channels. Active plans are billed or renewed according to your chosen cycle."
    },
    {
      q: "What payment methods are supported?",
      a: "We support BaridiMob, CCP wire transfers, Direct Bank deposits in Algeria, as well as international cards and Stripe depending on your selected region."
    },
    {
      q: "Can I upgrade or switch my plan later?",
      a: "Yes! You can upgrade from Individual to Pro or Team at any time. Your new tier and advanced features will activate seamlessly."
    },
    {
      q: "How long does verification take after receipt upload?",
      a: "Our administration team reviews transaction receipts around the clock. Activations are typically completed within 15 to 60 minutes after submission."
    }
  ];

  return (
    <div className="min-h-screen bg-[#07050E] text-white pt-32 pb-24 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-80 right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-[-5%] w-[450px] h-[450px] bg-purple-900/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-lg shadow-purple-950/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Transparent Membership Tiers</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight"
          >
            Choose your plan
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto font-medium"
          >
            7 Days free trial. No credit card required. Unlock world-class video editing masterclasses, tools, and creator assets.
          </motion.p>
        </div>

        {/* 3 Tiers Cards Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Loading Membership Tiers...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto">
            {plans.map((plan, idx) => {
              const isPopular = plan.isPopular || plan.id === 'plan_pro';
              const isFree = isPlanFree(plan);

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.12 }}
                  className={`relative rounded-[2rem] p-8 flex flex-col justify-between transition-all duration-300 ${
                    isPopular
                      ? 'bg-gradient-to-b from-purple-900/90 via-indigo-950/90 to-purple-950/95 border-2 border-purple-400/60 shadow-2xl shadow-purple-600/30 lg:-translate-y-4'
                      : 'bg-zinc-950/80 hover:bg-zinc-900/90 border border-purple-900/20 hover:border-purple-500/30 backdrop-blur-md shadow-xl'
                  }`}
                >
                  {/* Glowing popular pill */}
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold text-[11px] px-4 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-500/50 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      {plan.badge || 'Most Popular'}
                    </div>
                  )}

                  {/* Top content */}
                  <div>
                    {/* Tier Name */}
                    <div className="mb-4">
                      <h3 className="text-2xl font-black text-white tracking-tight">{plan.name}</h3>
                      <p className="text-gray-300/80 text-xs sm:text-sm mt-1 font-medium min-h-[38px]">
                        {plan.tagline || plan.description || 'Access to essential creative resources'}
                      </p>
                    </div>

                    {/* Price & Billing Cycle */}
                    <div className="my-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                          {plan.price}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-purple-300/80 block mt-1">
                        {plan.interval || (isFree ? 'For a Lifetime' : 'Per year')}
                      </span>
                    </div>

                    {/* Choose Plan CTA Button */}
                    <button
                      onClick={() => openPlanCheckout(plan)}
                      className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg mb-8 flex items-center justify-center gap-2 ${
                        isPopular
                          ? 'bg-white text-purple-950 hover:bg-gray-100 hover:scale-[1.02] shadow-white/20'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:scale-[1.02]'
                      }`}
                    >
                      <span>{plan.buttonText || (isFree ? 'Get Started Free' : 'Choose Plan')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Divider */}
                    <div className={`h-px w-full mb-6 ${isPopular ? 'bg-white/15' : 'bg-white/10'}`} />

                    {/* Features Checklist */}
                    <div className="space-y-3.5 mb-6">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-300 block">
                        Included Features:
                      </span>
                      <ul className="space-y-3">
                        {Array.isArray(plan.features) && plan.features.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-3 text-xs sm:text-sm text-gray-200">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isPopular ? 'bg-purple-500/30 text-purple-200' : 'bg-purple-950/60 text-purple-400 border border-purple-500/20'
                            }`}>
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span className="leading-snug">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Security & Guarantee Trust Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 sm:mt-20 max-w-4xl mx-auto bg-zinc-950/60 border border-purple-900/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-md"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-950/50 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">100% Guaranteed Quality & Fast Verification</h4>
              <p className="text-xs text-gray-400 mt-0.5">Secure payment processing with verified receipt handling and 24/7 dedicated support.</p>
            </div>
          </div>
          <Link
            to="/support"
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold uppercase tracking-wider text-purple-300 shrink-0 transition-colors"
          >
            Have Questions? Contact Us
          </Link>
        </motion.div>

        {/* FAQs Section */}
        <div className="mt-20 sm:mt-24 max-w-3xl mx-auto space-y-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Everything you need to know about our subscription tiers and billing.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className="bg-zinc-950/60 border border-purple-900/20 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
                  >
                    <span className="text-sm font-bold text-white">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-xs sm:text-sm text-gray-400 leading-relaxed border-t border-purple-950/20 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* CHECKOUT MODAL (Same buying flow as courses & store products) */}
      <AnimatePresence>
        {isCheckoutOpen && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" 
              onClick={() => setIsCheckoutOpen(false)} 
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-6 sm:p-8 w-full max-w-xl shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Top Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-purple-950/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 text-[10px] font-extrabold uppercase tracking-wider">
                      Membership Checkout
                    </span>
                    <span className="text-xs font-bold text-purple-400">{selectedPlan.name} Tier</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">Complete Your Membership</h3>
                </div>
                <button
                  onClick={() => setIsCheckoutOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Summary Pill */}
              <div className="bg-zinc-900/60 border border-purple-900/20 p-4 rounded-2xl mb-6 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-white">{selectedPlan.name} Membership</div>
                  <div className="text-[11px] text-gray-400">{selectedPlan.interval || 'Annual Subscription'}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-purple-400">{selectedPlan.price}</div>
                  <div className="text-[10px] text-emerald-400 font-bold">Instant Activation</div>
                </div>
              </div>

              {/* Step 1: Student Coordinates */}
              {step === 'info' && (
                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                    <ValidationTooltip isVisible={!!validationErrors.fullName} message={validationErrors.fullName} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. yourname@example.com"
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                    <ValidationTooltip isVisible={!!validationErrors.email} message={validationErrors.email} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                      Phone Number (WhatsApp / Mobile) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 07 93 19 39 21"
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                    <ValidationTooltip isVisible={!!validationErrors.phone} message={validationErrors.phone} />
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-4 mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
                  >
                    {isPlanFree(selectedPlan) ? (
                      <>
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>Confirm Free Membership</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Payment</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: Payment & Receipt Submission */}
              {step === 'payment' && !isPlanFree(selectedPlan) && (
                <div className="space-y-5">
                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 font-mono">
                      Select Payment Method:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(currentRegion?.paymentMethods || [
                        { id: 'baridimob', name: 'BaridiMob Transfer', icon: 'Landmark', details: 'RIP: 00799999002134567890' },
                        { id: 'ccp', name: 'CCP Wire Transfer', icon: 'Building2', details: 'CCP: 21345678 Clé 90' }
                      ]).filter((m: any) => m.active !== false).map((method: any) => (
                        <div
                          key={method.id}
                          onClick={() => setSelectedMethod(method.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                            selectedMethod === method.id
                              ? 'bg-purple-950/40 border-purple-500 text-white shadow-md shadow-purple-900/30'
                              : 'bg-zinc-900/40 border-white/5 text-gray-400 hover:border-purple-900/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white">{method.name}</span>
                            {selectedMethod === method.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </div>
                          {method.details && (
                            <div className="text-[10px] text-purple-300 font-mono mt-1 flex items-center justify-between">
                              <span className="truncate">{method.details}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(method.details, method.id);
                                }}
                                className="p-1 hover:bg-purple-900/40 rounded text-purple-400"
                                title="Copy coordinates"
                              >
                                {copiedKey === method.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Receipt Upload Dropzone */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                      Upload Payment Receipt (Screenshot / Photo) *
                    </label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileChange(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                        dragOver ? 'border-purple-500 bg-purple-950/30' : receiptBase64 ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-purple-900/30 bg-black/40 hover:border-purple-500/40'
                      }`}
                      onClick={() => document.getElementById('plan-receipt-input')?.click()}
                    >
                      <input
                        id="plan-receipt-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                      />
                      {receiptBase64 ? (
                        <div className="flex flex-col items-center gap-2">
                          <img src={receiptBase64} alt="Receipt preview" className="w-24 h-24 object-cover rounded-xl border border-emerald-500/40" />
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Receipt Loaded
                          </span>
                          <span className="text-[10px] text-gray-400">Click to replace photo</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-purple-400 animate-bounce" />
                          <span className="text-xs font-bold text-white">Click or drag receipt photo here</span>
                          <span className="text-[10px] text-gray-400">PNG, JPG or WEBP up to 10MB</span>
                        </div>
                      )}
                    </div>
                    <ValidationTooltip isVisible={!!validationErrors.receipt} message={validationErrors.receipt} />
                  </div>

                  {/* Checkboxes for Terms & Conditions */}
                  <div className="space-y-2 pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 bg-black border-purple-900/40 focus:ring-purple-500 accent-purple-600 mt-0.5"
                      />
                      <span className="text-[11px] text-gray-300">
                        I agree to the <Link to="/terms-and-conditions" target="_blank" className="text-purple-400 underline">Terms and Conditions</Link> of Cutscene Academy.
                      </span>
                    </label>
                    <ValidationTooltip isVisible={!!validationErrors.termsAgreed} message={validationErrors.termsAgreed} />

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={policyAgreed}
                        onChange={(e) => setPolicyAgreed(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 bg-black border-purple-900/40 focus:ring-purple-500 accent-purple-600 mt-0.5"
                      />
                      <span className="text-[11px] text-gray-300">
                        I agree to the <Link to="/privacy-policy" target="_blank" className="text-purple-400 underline">Privacy Policy</Link>.
                      </span>
                    </label>
                    <ValidationTooltip isVisible={!!validationErrors.policyAgreed} message={validationErrors.policyAgreed} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('info')}
                      className="px-5 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-wider text-gray-300 transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => processOrder(false)}
                      className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting Order...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm & Submit Order</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ORDER SUCCESS MODAL */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={() => setShowSuccessModal(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-zinc-950 border border-emerald-500/30 rounded-[2.5rem] p-8 max-w-md w-full text-center shadow-2xl z-10 space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">Order Received!</h3>
                <p className="text-gray-300 text-xs sm:text-sm mt-2 leading-relaxed">
                  Thank you for joining <strong className="text-purple-400">{selectedPlan?.name}</strong>! Your transaction request has been logged. Our administration team is verifying your receipt.
                </p>
              </div>

              <div className="bg-zinc-900/60 border border-white/5 p-4 rounded-2xl text-left text-xs space-y-1.5 text-gray-400">
                <div className="flex justify-between">
                  <span>Student Name:</span>
                  <span className="text-white font-bold">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-white font-bold">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Plan:</span>
                  <span className="text-purple-400 font-bold">{selectedPlan?.name} Tier</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/dashboard');
                  }}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/25"
                >
                  Go to Student Dashboard
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
