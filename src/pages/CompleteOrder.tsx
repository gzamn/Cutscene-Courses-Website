import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Lock, Building2, Globe, Landmark, Loader2, Send, Upload, FileText, Check, X, Layers, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, collection, addDoc, query, where, getDocs, doc, getDoc, setDoc, DEFAULT_SPECIAL_OFFERS } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useRegion } from '../context/RegionContext';
import AuthFlow from '../components/AuthFlow';
import ValidationTooltip from '../components/ValidationTooltip';
import { SparkleButton, RainbowButton } from '../components/AnimatedButtons';

export default function CompleteOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const { currentRegion, getOfferPrice } = useRegion();
  const searchParams = new URLSearchParams(location.search);
  const offerId = searchParams.get('offerId') || 'bundle-creative';
  
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);

  const getOfferOriginalPriceFormatted = (off: any) => {
    if (!off) return '';
    const baseOriginal = off.originalPrice !== undefined ? Number(off.originalPrice) : 0;
    const converted = Math.round(baseOriginal * (currentRegion?.multiplier || 1));
    return `${converted.toLocaleString()} ${currentRegion?.symbol || '$'}`;
  };

  useEffect(() => {
    const activeMethods = currentRegion?.paymentMethods?.filter((m: any) => m.active) || [];
    if (activeMethods.length > 0) {
      setSelectedMethod(activeMethods[0].id);
    } else {
      setSelectedMethod('');
    }
  }, [currentRegion]);

  // Checkbox and receipt states
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Student Info State
  const [formData, setFormData] = useState({
    fullName: '',
    email: user?.email || '',
    phone: '',
  });

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

  useEffect(() => {
    const fetchOfferData = async () => {
      try {
        setLoading(true);
        // Load target offer from collection or fallbacks
        const offersRef = collection(db, 'special_offers');
        const snap = await getDocs(offersRef);
        let foundOffer = null;
        
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
          foundOffer = list.find(o => o.id === offerId);
        }

        if (!foundOffer) {
          // Fallback to defaults
          foundOffer = DEFAULT_SPECIAL_OFFERS.find(o => o.id === offerId) || DEFAULT_SPECIAL_OFFERS[0];
        }

        setOffer(foundOffer);

        // Fetch courses for inclusion lookup
        const coursesSnap = await getDocs(collection(db, 'courses'));
        if (!coursesSnap.empty) {
          const courseList = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
          setCourses(courseList);
        }
      } catch (err) {
        console.error('Error fetching bundle or course info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOfferData();
  }, [offerId]);

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

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    // Name validations
    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      errors.fullName = 'must be filled before continuing';
    } else if (trimmedName.length < 3) {
      errors.fullName = 'Your Full Name must contain at least 3 letters.';
    } else {
      const nameRegex = /^[\p{L}\s.''-]+$/u;
      if (!nameRegex.test(trimmedName)) {
        errors.fullName = 'Please enter a correct full name (only letters, spaces, and hyphens).';
      }
    }

    // Email validates
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      errors.email = 'must be filled before continuing';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Please enter a correct email address format (e.g. name@domain.com).';
      }
    }

    // Phone validation
    const trimmedPhone = formData.phone.trim();
    if (!trimmedPhone) {
      errors.phone = 'must be filled before continuing';
    } else {
      const cleanPhone = trimmedPhone.replace(/[+\s-()]/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
        errors.phone = 'Please enter a correct phone number containing 9 to 15 digits.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    if (user && formData.phone && !userProfile?.phone) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          phone: formData.phone.trim(),
          phoneVerified: true,
          updatedAt: new Date().toISOString()
         }, { merge: true });
      } catch (err) {
        console.error("Error saving backup phone number:", err);
      }
    }

    setStep('payment');
  };

  const handleReceiptPayment = async () => {
    if (!user || !offer) {
      alert('Authentication is required to enroll.');
      return;
    }

    const errors: { [key: string]: string } = {};

    // Validate info profiles
    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      errors.fullName = 'must be filled before continuing';
    } else if (trimmedName.length < 3 || !/^[\p{L}\s.''-]+$/u.test(trimmedName)) {
      errors.fullName = 'Your Full Name must contain at least 3 letters and consist of normal name characters.';
    }

    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = 'must be filled before continuing';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Kindly verify your electronic mail address format.';
    }

    const trimmedPhone = formData.phone.trim();
    const cleanPhone = trimmedPhone.replace(/[+\s-()]/g, '');
    if (!trimmedPhone) {
      errors.phone = 'must be filled before continuing';
    } else if (cleanPhone.length < 9 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
      errors.phone = 'Please enter a correct phone number with 9 to 15 digits.';
    }

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
      if (errors.fullName || errors.email || errors.phone) {
        setStep('info');
      }
      return;
    }

    setValidationErrors({});
    setProcessing(true);
    try {
      // Create a pending combo enrollment record inside firestore
      const enrollmentPayload = {
        uid: user.uid,
        offerId: offer.id,
        isBundle: true,
        courseIds: offer.courseIds || [],
        enrolledAt: new Date().toISOString(),
        status: 'pending_verification',
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        totalPaid: getOfferPrice(offer).formatted,
        currency: currentRegion.currency,
        regionId: currentRegion.id,
        paid: false,
        receiptUrl: receiptBase64,
        paymentMethod: selectedMethod,
        submittedAt: new Date().toISOString()
      };

      // Add as dynamic custom enrollment record mapped to the bundle
      await addDoc(collection(db, 'enrollments'), enrollmentPayload);

      // Save billing credentials to user's main profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || formData.email,
        displayName: formData.fullName || user.displayName || '',
        phone: formData.phone,
        isUser: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Offer checkout transaction error:', error);
      alert('Could not save your transaction receipt. Kindly check your connection and repeat.');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Combo Offer Not Found</h2>
          <p className="text-gray-400 mb-6 font-medium">This package may have expired or is currently unavailable.</p>
          <SparkleButton to="/" className="inline-block px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs">
            Return to Homepage
          </SparkleButton>
        </div>
      </div>
    );
  }

  // Localized descriptors
  const localizedTitle = language === 'ar' ? (offer.titleAr || offer.titleEn) : language === 'fr' ? (offer.titleFr || offer.titleEn) : offer.titleEn;
  const childCourses = (offer.courseIds || []).map((cid: string) => courses.find(c => c.id === cid)).filter(Boolean);

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 relative">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[450px] h-[450px] bg-purple-600/5 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Breadcrumb controls */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-400 hover:text-white transition-all hover:-translate-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'ar' ? 'العودة للرئيسية' : language === 'fr' ? "Retour à l'accueil" : 'Back to Home'}</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Main Form Fields (Left 8 columns on desktop) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="p-8 md:p-10 bg-zinc-950/40 border border-purple-900/20 rounded-[2rem] shadow-2xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-800" />
              
              {/* Step indicator pipeline */}
              <div className="flex items-center gap-6 mb-10 border-b border-white/5 pb-6">
                <button
                  type="button"
                  onClick={() => setStep('info')}
                  className={`flex items-center gap-3 text-xs font-mono uppercase tracking-widest pb-1 transition-all ${
                    step === 'info' ? 'text-purple-400 font-extrabold border-b-2 border-purple-400' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === 'info' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-gray-400'
                  }`}>
                    1
                  </span>
                  <span>{language === 'ar' ? 'بيانات المشترك' : language === 'fr' ? 'Coordonnées de l\'étudiant' : 'Student details'}</span>
                </button>
                
                <ArrowRight className="w-4 h-4 text-gray-700 shrink-0" />

                <button
                  type="button"
                  disabled={!formData.fullName || !formData.email || !formData.phone}
                  onClick={() => setStep('payment')}
                  className={`flex items-center gap-3 text-xs font-mono uppercase tracking-widest pb-1 transition-all ${
                    step === 'payment' ? 'text-purple-400 font-extrabold border-b-2 border-purple-400' : 'text-gray-500 disabled:opacity-50 hover:text-white'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === 'payment' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-gray-400'
                  }`}>
                    2
                  </span>
                  <span>{language === 'ar' ? 'إجراء الدفع والوصل' : language === 'fr' ? 'Paiement & Reçu' : 'Credentials & Receipt'}</span>
                </button>
              </div>

              {/* Guest Authentication Prompt */}
              {!user && (
                <div className="mb-8">
                  <div className="p-6 bg-purple-950/20 border border-purple-500/20 rounded-2xl mb-8 flex items-start gap-4">
                    <ShieldCheck className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-black mb-1">
                        {language === 'ar' ? 'الحساب مطلوب للمشاهدة والمتابعة' : language === 'fr' ? 'Connexion requise d\'abord' : 'Account registration required'}
                      </h4>
                      <p className="text-xs text-gray-400 leading-normal">
                        {language === 'ar' ? 'يرجى تسجيل الدخول أو إنشاء حساب جديد مجاناً لتسجيل الباقة تحت اسمك وتفعيل محاضراتك الإلكترونية بسهولة.' :
                         language === 'fr' ? 'Veuillez vous connecter ou créer un compte gratuit pour lier ce bundle à vos accès académiques.' :
                         'Please login or create your free account fast below. This links your permanent student profile to your lifetime bundle classes.'}
                      </p>
                    </div>
                  </div>
                  <AuthFlow onSuccess={() => {}} />
                </div>
              )}

              {/* Step Forms */}
              {user && (
                <div>
                  <AnimatePresence mode="wait">
                    {step === 'info' ? (
                      <motion.form
                        key="info-form"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        onSubmit={handleInfoSubmit}
                        className="space-y-6"
                      >
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-purple-400 mb-2">
                            {language === 'ar' ? 'الاسم واللقب بالكامل *' : 'Student Full Name *'}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Amine Rouabhia"
                            value={formData.fullName}
                            onChange={(e) => {
                              setFormData({ ...formData, fullName: e.target.value });
                              if (validationErrors.fullName) setValidationErrors({ ...validationErrors, fullName: '' });
                            }}
                            className="w-full bg-black/60 border border-purple-900/30 rounded-xl px-5 py-4 focus:ring-1 focus:ring-purple-600 focus:border-purple-500 transition-all font-semibold outline-none placeholder:text-gray-600 text-sm"
                          />
                          <ValidationTooltip isVisible={!!validationErrors.fullName} message={validationErrors.fullName === 'must be filled before continuing' ? 'Please fill out this field.' : validationErrors.fullName} />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-purple-400 mb-2">
                            {language === 'ar' ? 'البريد الإلكتروني المعتمد *' : 'Electronic Mail Address *'}
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => {
                              setFormData({ ...formData, email: e.target.value });
                              if (validationErrors.email) setValidationErrors({ ...validationErrors, email: '' });
                            }}
                            className="w-full bg-black/60 border border-purple-900/30 rounded-xl px-5 py-4 focus:ring-1 focus:ring-purple-600 focus:border-purple-500 transition-all font-semibold outline-none placeholder:text-gray-600 text-sm"
                          />
                          <ValidationTooltip isVisible={!!validationErrors.email} message={validationErrors.email === 'must be filled before continuing' ? 'Please fill out this field.' : validationErrors.email} />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-purple-400 mb-2">
                            {language === 'ar' ? 'رقم الهاتف الشخصي (هادئ لتسهيل إرسال التنبيهات) *' : 'Mobile Phone Number *'}
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. 07 93 19 39 21"
                            value={formData.phone}
                            onChange={(e) => {
                              setFormData({ ...formData, phone: e.target.value });
                              if (validationErrors.phone) setValidationErrors({ ...validationErrors, phone: '' });
                            }}
                            className="w-full bg-black/60 border border-purple-900/30 rounded-xl px-5 py-4 focus:ring-1 focus:ring-purple-600 focus:border-purple-500 transition-all font-semibold outline-none placeholder:text-gray-600 text-sm"
                          />
                          <ValidationTooltip isVisible={!!validationErrors.phone} message={validationErrors.phone === 'must be filled before continuing' ? 'Please fill out this field.' : validationErrors.phone} />
                        </div>

                        <div className="pt-6">
                          <button
                            type="submit"
                            className="w-full inline-flex items-center justify-center gap-2 px-8 py-5 rounded-2xl bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white font-black uppercase tracking-widest text-xs sm:text-sm shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
                          >
                            <span>{language === 'ar' ? 'متابعة لإجراءات الدفع' : 'Proceed to Payment Credentials'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.form>
                    ) : (
                      <motion.div
                        key="payment-step"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6"
                      >
                        {/* Selector of payment route */}
                        <div className="grid grid-cols-2 gap-4 pb-4">
                          {currentRegion?.paymentMethods?.filter((m: any) => m.active).map((method: any) => {
                            const IconComp = method.id === 'ccp' || method.id === 'bank' ? Landmark : CreditCard;
                            return (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => setSelectedMethod(method.id)}
                                className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                  selectedMethod === method.id 
                                    ? 'bg-purple-950/30 border-purple-500 text-white shadow-lg' 
                                    : 'bg-black/40 border-purple-900/20 text-gray-400 hover:border-purple-500/20'
                                }`}
                              >
                                <IconComp className={`w-6 h-6 mb-4 ${selectedMethod === method.id ? 'text-purple-400 font-bold' : ''}`} />
                                <div>
                                  <div className="text-xs font-black tracking-wide uppercase">{method.name}</div>
                                  <div className="text-[9px] font-mono text-gray-500 uppercase mt-1">E-Transfer App</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Payment Guides Panel */}
                        <div className="p-6 bg-black/50 border border-purple-950/30 rounded-2xl">
                          <div className="text-[10px] font-mono font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>
                              {currentRegion?.paymentMethods?.find((m: any) => m.id === selectedMethod)?.name || 'Payment Info'} Details
                            </span>
                          </div>

                          <div className="space-y-1 bg-zinc-950 p-3.5 rounded-xl text-left whitespace-pre-wrap font-mono text-gray-300 text-xs leading-relaxed">
                            {currentRegion?.paymentMethods?.find((m: any) => m.id === selectedMethod)?.instructions || 'No details required.'}
                          </div>
                        </div>

                        {/* File Upload Box */}
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-purple-400 mb-2">
                            {language === 'ar' ? 'صورة وصل التحويل الإلكتروني أو الحوالة *' : 'Attach transaction receipt jpeg / png *'}
                          </label>
                          
                          <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOver(false);
                              if (e.dataTransfer.files?.[0]) {
                                handleFileChange(e.dataTransfer.files[0]);
                                setValidationErrors(prev => ({ ...prev, receipt: '' }));
                              }
                            }}
                            onClick={() => document.getElementById('bundle-receipt-file-input')?.click()}
                            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-4 relative overflow-hidden backdrop-blur-sm ${
                              dragOver
                                ? 'border-purple-500 bg-purple-950/20'
                                : receiptFile
                                  ? 'border-emerald-600/50 bg-emerald-950/5'
                                  : 'border-purple-900/30 bg-black/40 hover:border-purple-500/30'
                            }`}
                          >
                            <input
                              id="bundle-receipt-file-input"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleFileChange(e.target.files[0]);
                                  setValidationErrors(prev => ({ ...prev, receipt: '' }));
                                }
                              }}
                            />

                            {receiptFile ? (
                              <div className="w-full space-y-4">
                                {receiptBase64 && (
                                  <img
                                    src={receiptBase64}
                                    alt="Receipt attachment asset"
                                    className="max-h-48 mx-auto rounded-xl object-contain border border-white/10 shadow-lg"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <div>
                                  <p className="text-xs text-emerald-400 font-bold truncate max-w-sm mx-auto">
                                    {receiptFile.name}
                                  </p>
                                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                                    {(receiptFile.size / 1024).toFixed(1)} KB • Tap to swap file
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-inner">
                                  <Upload className="w-5 h-5 shrink-0" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-white mb-1">
                                    {language === 'ar' ? 'انقر هنا أو اسحب صورة الوصل' : 'Tap to choose or drag transaction receipt here'}
                                  </p>
                                  <p className="text-[10px] text-gray-500">
                                    {language === 'ar' ? 'يدعم الصور بصيغة JPG, PNG' : 'Supports image formats (JPG, PNG, WEBP)'}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                          <ValidationTooltip isVisible={!!validationErrors.receipt} message="Please fill out this field." />
                        </div>

                        {/* Policies agreements */}
                        <div className="space-y-4 pt-2">
                          <label className="flex items-start gap-3.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={termsAgreed}
                              onChange={(e) => {
                                setTermsAgreed(e.target.checked);
                                if (validationErrors.termsAgreed) setValidationErrors({ ...validationErrors, termsAgreed: '' });
                              }}
                              className="sr-only"
                            />
                            <div className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center transition-all ${
                              termsAgreed ? 'bg-purple-600 border-purple-500 text-white' : 'bg-black border-purple-900/30'
                            }`}>
                              {termsAgreed && <Check className="w-4.5 h-4.5 font-bold" />}
                            </div>
                            <span className="text-xs text-gray-400 leading-tight">
                              I confirm all input details are true, and I agree completely with the{' '}
                              <Link to="/terms-and-conditions" target="_blank" className="text-purple-400 hover:underline font-bold">Terms & Conditions</Link>.
                            </span>
                          </label>
                          <ValidationTooltip isVisible={!!validationErrors.termsAgreed} message="Please fill out this field." />

                          <label className="flex items-start gap-3.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={policyAgreed}
                              onChange={(e) => {
                                setPolicyAgreed(e.target.checked);
                                if (validationErrors.policyAgreed) setValidationErrors({ ...validationErrors, policyAgreed: '' });
                              }}
                              className="sr-only"
                            />
                            <div className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center transition-all ${
                              policyAgreed ? 'bg-purple-600 border-purple-500 text-white' : 'bg-black border-purple-900/30'
                            }`}>
                              {policyAgreed && <Check className="w-4.5 h-4.5 font-bold" />}
                            </div>
                            <span className="text-xs text-gray-400 leading-tight">
                              I acknowledge and consent to the student enrollments and verification process details inside the{' '}
                              <Link to="/privacy-policy" target="_blank" className="text-purple-400 hover:underline font-bold">Privacy Policy</Link>.
                            </span>
                          </label>
                          <ValidationTooltip isVisible={!!validationErrors.policyAgreed} message="Please fill out this field." />
                        </div>

                        {/* Action Submit */}
                        <div className="pt-6 flex gap-4">
                          <button
                            type="button"
                            onClick={() => setStep('info')}
                            className="px-6 py-4 rounded-xl border border-purple-900/20 text-gray-400 hover:text-white hover:border-purple-500/25 transition-all text-xs font-bold uppercase tracking-wider"
                          >
                            Back
                          </button>
                          
                          <RainbowButton
                            type="button"
                            disabled={processing}
                            onClick={handleReceiptPayment}
                            className="flex-1 text-xs sm:text-sm font-black uppercase tracking-widest"
                          >
                            {processing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin shrink-0 inline-block mr-2" />
                                <span>Processing enrollment...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 inline-block mr-2" />
                                <span>Submit Receipt & Complete Order</span>
                              </>
                            )}
                          </RainbowButton>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Offer Summary Card (Right 5 columns on desktop) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-zinc-950 border border-purple-900/20 rounded-[2rem] p-8 overflow-hidden relative shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl" />
              
              <h3 className="text-xs font-mono font-black text-purple-400 uppercase tracking-widest mb-6">
                {language === 'ar' ? 'ملخص باقة الطلب' : 'Ordered Bundle Summary'}
              </h3>

              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-6 border border-white/5 relative">
                <img
                  src={offer.imageUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400'}
                  alt={localizedTitle}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 p-4">
                  <h4 className="text-sm font-black text-white">{localizedTitle}</h4>
                </div>
              </div>

              {/* Inclusions checklist details */}
              <div className="bg-black/50 border border-purple-900/10 p-5 rounded-2xl mb-8 space-y-4">
                <div className="flex items-center gap-2 text-xs text-purple-300 font-extrabold uppercase tracking-wide">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Includes {childCourses?.length || 0} Academic Curriculums</span>
                </div>

                <div className="space-y-2.5">
                  {childCourses && childCourses.map((cc: any) => (
                    <div key={cc.id} className="flex items-start gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        ✓
                      </span>
                      <div className="text-gray-300">
                        <span className="font-extrabold text-white">{cc.title}</span>
                        <span className="block text-[9.5px] text-gray-500 font-medium">Unlocks immediate permanent lifetime access upon validation</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing metrics */}
              <div className="space-y-3.5 border-t border-purple-900/15 pt-6 font-medium text-xs">
                <div className="flex justify-between items-center text-gray-400">
                  <span>Regular Total Price</span>
                  <span className="line-through">{getOfferOriginalPriceFormatted(offer)}</span>
                </div>

                <div className="flex justify-between items-center text-emerald-400 font-semibold bg-emerald-500/5 border border-emerald-500/10 rounded-lg py-1.5 px-3">
                  <span>Special Combo Discount</span>
                  <span>- {Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100)}%</span>
                </div>

                <div className="flex justify-between items-end border-t border-purple-950 pt-5 text-gray-300">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500">Order Investment</span>
                    <span className="text-[9px] text-purple-500 italic">One-time payment, no recurring billing</span>
                  </div>
                  <span className="text-2xl md:text-3xl font-black text-purple-400 leading-none font-mono">
                    {getOfferPrice(offer).formatted}
                  </span>
                </div>
              </div>
            </div>

            {/* Refund & Security guarantees card */}
            <div className="p-6 bg-zinc-950/20 border border-purple-900/15 rounded-2xl flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-black mb-1">
                  100% Student Security Guarantee
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                  Upon receipt validation, you are immediately enrolled in both curricula. For billing inquiries, contact us directly at support@cutscene-academy.com.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL TRIGGERED */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-purple-500/20 p-8 md:p-10 rounded-[2.5rem] text-center max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500" />
              
              <div className="w-16 h-16 rounded-full bg-emerald-600/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black mb-4 tracking-tight">
                {language === 'ar' ? 'تم استلام طلب الباقة بنجاح' : 'Combo Order Received Successfully!'}
              </h3>
              
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                {language === 'ar' ? 'نشكرك على التسجيل! تم رفع صورة الوصل وتقديم طلبك لفريق المراجعة بنجاح. سيتم مراجعة طلبك وتفعيل الباقة بالكامل لحسابك خلال مدة أقصاها ٢٤ ساعة وسنتصل بك.' :
                 'Thank you for enrolling in this promotional bundle! Your invoice/receipt has been queued for verification. The academy review staff will validate your transfer of funds and toggle your lifetime access to both curriculums inside your student workspace within 24 hours.'}
              </p>

              <SparkleButton
                to="/"
                className="w-full font-black text-xs sm:text-sm uppercase tracking-wider py-4 rounded-xl"
              >
                <span>Return to Homepage</span>
                <ArrowRight className="w-4 h-4 inline-block ml-2" />
              </SparkleButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
