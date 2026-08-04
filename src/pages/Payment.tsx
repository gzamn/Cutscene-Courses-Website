import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Lock, Building2, Globe, Landmark, Loader2, Send, Upload, FileText, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, collection, addDoc, query, where, getDocs, doc, getDoc, setDoc } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useRegion } from '../context/RegionContext';
import AuthFlow from '../components/AuthFlow';
import ValidationTooltip from '../components/ValidationTooltip';

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const { currentRegion, getCoursePrice } = useRegion();
  const searchParams = new URLSearchParams(location.search);
  const courseId = searchParams.get('courseId');
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  useEffect(() => {
    const activeMethods = currentRegion?.paymentMethods?.filter((m: any) => m.active) || [];
    if (activeMethods.length > 0) {
      setSelectedMethod(activeMethods[0].id);
    } else {
      setSelectedMethod('');
    }
  }, [currentRegion]);
  const [processing, setProcessing] = useState(false);

  // Checkbox and receipt states
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Student Info State (format choice removed)
  const [formData, setFormData] = useState({
    fullName: '',
    email: user?.email || '',
    phone: '',
    format: 'recorded',
    startDate: null
  });

  // Prepopulate state when authenticated profile changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: userProfile?.displayName || user.displayName || prev.fullName || '',
        email: userProfile?.email || user.email || prev.email || '',
        phone: userProfile?.phone || prev.phone || '',
      }));
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    const fetchCourse = async () => {
      try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
          const data = courseSnap.id ? { id: courseSnap.id, ...courseSnap.data() } as any : null;
          setCourse(data);
          if (data) {
            setFormData(prev => ({
              ...prev,
              format: 'recorded'
            }));
          }
        }
      } catch (err) {
        console.error("Error fetching course in payment page:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  const calculateTotal = () => {
    if (!course) return 0;
    return getCoursePrice(course).value;
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

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    // 1. Full name validation: must be filled and correct formatted text
    const trimmedName = formData.fullName.trim();
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
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      errors.email = 'must be filled before continuing';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Please enter a correct email address format (e.g. yourname@domain.com).';
      }
    }

    // 3. Phone validation: must be filled with a correct formatted phone number
    const trimmedPhone = formData.phone.trim();
    if (!trimmedPhone) {
      errors.phone = 'must be filled before continuing';
    } else {
      const cleanPhone = trimmedPhone.replace(/[+\s-()]/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
        errors.phone = 'Please enter a correct phone number containing 9 to 15 digits (e.g., 07 93 19 39 21).';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    if (user && formData.phone && !userProfile?.phone) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          phone: formData.phone.trim(),
          phoneVerified: true,
          updatedAt: new Date().toISOString()
         }, { merge: true });
      } catch (err) {
        console.error("Error saving missing phone number:", err);
      }
    }

    setStep('payment');
  };

  const handleReceiptPayment = async () => {
    if (!user || !courseId) {
      alert(t('payment.loginRequired'));
      navigate('/login');
      return;
    }

    const errors: { [key: string]: string } = {};

    // Double check full profile data validation
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
      // In case we have student info errors, redirect to info step
      if (errors.fullName || errors.email || errors.phone) {
        setStep('info');
      }
      return;
    }

    setValidationErrors({});
    setProcessing(true);
    try {
      // 1. Create or overwrite a pending enrollment
      const q = query(collection(db, 'enrollments'), where('uid', '==', user.uid), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      
      const payload = {
        uid: user.uid,
        courseId: courseId,
        enrolledAt: new Date().toISOString(),
        status: 'pending_verification',
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        format: 'recorded', // always recorded format
        totalPaid: getCoursePrice(course).formatted,
        currency: currentRegion.currency,
        regionId: currentRegion.id,
        paid: false,
        receiptUrl: receiptBase64,
        paymentMethod: selectedMethod,
        submittedAt: new Date().toISOString()
      };

      if (snap.empty) {
        await addDoc(collection(db, 'enrollments'), payload);
      } else {
        // Overwrite existing record to let students retry or update receipt
        const docId = snap.docs[0].id;
        await setDoc(doc(db, 'enrollments', docId), payload, { merge: true });
      }

      // Ensure user document has billing coordinates
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || formData.email,
        displayName: formData.fullName || user.displayName || '',
        phone: formData.phone,
        isUser: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Clear files/form and pop up beautiful success message loader
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Receipt submission error:', error);
      alert('Coult not save your transaction receipt. Kindly check your network and repeat.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">{t('payment.noCourse')}</h2>
          <Link to="/courses" className="text-purple-400 hover:text-purple-300">{t('nav.courses')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Go Back button */}
        <div className="mb-8">
          <Link
            to={`/courses/${courseId || ''}`}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all hover:-translate-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('course.back') || 'Go Back To Course'}</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left Column: Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-4xl font-bold mb-4">{t('payment.completeOrder')}</h1>
              <p className="text-gray-400">{t('payment.joinStudents')}</p>
            </div>

            <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 shadow-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-purple-500" />
                {t('payment.orderSummary')}
              </h2>
              <div className="flex items-center gap-6 mb-8 p-4 bg-black rounded-2xl border border-purple-900/20">
                <img 
                  src={course.image} 
                  alt={course.title} 
                  className="w-24 h-24 rounded-xl object-cover border border-purple-900/30"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-bold text-lg mb-1 text-white">{course.title}</h3>
                  <div className="text-purple-400 text-sm font-semibold uppercase tracking-wider">{course.level}</div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>{t('payment.coursePrice')}</span>
                  <span className="text-white font-medium">{getCoursePrice(course).formatted}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>Course Format</span>
                  <span className="text-purple-400 font-semibold uppercase tracking-widest text-[11px]">Recorded Lectures</span>
                </div>
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>{t('payment.platformFee')}</span>
                  <span className="text-white font-medium">0 {currentRegion.currency}</span>
                </div>
                <div className="pt-4 border-t border-purple-900/20 flex justify-between items-center">
                  <span className="text-lg font-bold">{t('payment.totalAmount')}</span>
                  <span className="text-2xl font-black text-purple-500">{getCoursePrice(course).formatted}</span>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  t('payment.benefit1'),
                  t('payment.benefit2'),
                  t('payment.benefit3'),
                  t('payment.benefit4')
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs text-gray-400">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Multi-step Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <AnimatePresence mode="wait">
              {!user ? (
                <motion.div
                  key="auth-login-step"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-10 shadow-2xl shadow-purple-900/5"
                >
                  <AuthFlow 
                    onSuccess={() => {}}
                    isEnrollmentFlow={true}
                    titleOverride="Login or Signup to Enroll"
                    subtitleOverride="Please verify your session and telephone details to finalize student coordinates"
                  />
                </motion.div>
              ) : step === 'info' ? (
                <motion.div
                  key="info-step"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-10 shadow-xl"
                >
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                    <CheckCircle2 className="w-7 h-7 text-purple-500" />
                    {t('payment.infoTitle') || 'Student Registration'}
                  </h2>

                  <div className="p-4 bg-zinc-900/50 border border-purple-900/20 rounded-2xl flex items-center justify-between mb-8 text-left">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 font-mono">Enrolling Student</div>
                      <div className="font-bold text-sm text-white">{formData.fullName || userProfile?.displayName || user.displayName || 'No Name Found'}</div>
                      <div className="text-xs text-gray-400">{formData.email || user.email} {formData.phone ? `| ${formData.phone}` : ''}</div>
                    </div>
                  </div>
                  
                  <form onSubmit={handleInfoSubmit} className="space-y-6">
                    <div className="space-y-2 text-left font-sans font-medium">
                      <label htmlFor="studentFullName" className="block text-sm font-semibold text-gray-300">Student Full Name</label>
                      <input 
                        id="studentFullName"
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData({...formData, fullName: e.target.value});
                          if (validationErrors.fullName) {
                            setValidationErrors(prev => ({ ...prev, fullName: '' }));
                          }
                        }}
                        placeholder="e.g. amine rouabhia"
                        className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                      />
                      <ValidationTooltip isVisible={!!validationErrors.fullName} message={validationErrors.fullName === 'must be filled before continuing' ? 'Please fill out this field.' : validationErrors.fullName} />
                    </div>

                    <div className="space-y-2 text-left">
                      <label htmlFor="studentPhone" className="block text-sm font-semibold text-gray-300">Phone Number (Required to enroll)</label>
                      <input 
                        id="studentPhone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({...formData, phone: e.target.value});
                          if (validationErrors.phone) {
                            setValidationErrors(prev => ({ ...prev, phone: '' }));
                          }
                        }}
                        placeholder="e.g. 07 93 19 39 21"
                        className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                      />
                      <ValidationTooltip isVisible={!!validationErrors.phone} message={validationErrors.phone === 'must be filled before continuing' ? 'Please fill out this field.' : validationErrors.phone} />
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="block text-sm font-semibold text-gray-350">Delivery Format</label>
                      <div className="p-4 rounded-2xl bg-zinc-900/50 border border-purple-500/20 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-sm text-white">Pre-Recorded Academy Mode</div>
                          <div className="text-xs text-gray-400">Unlock files instantly & study at your own convenience</div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-purple-400" />
                      </div>
                    </div>

                    {/* Final Price banner */}
                    <div className="p-6 bg-purple-950/20 border border-purple-500/20 rounded-2xl flex items-center justify-between mt-6">
                      <div className="text-left">
                        <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Total Fee</div>
                        <div className="text-xs text-gray-400">No recurring costs</div>
                      </div>
                      <div className="text-3xl font-black text-white font-sans">
                        {calculateTotal().toLocaleString()} {course.currency}
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-5 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-650/20 group cursor-pointer"
                    >
                      <span>Proceed to Payment</span>
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="payment-step"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-10 text-left relative"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                      <Send className="w-6 h-6 text-purple-400" />
                      <span>Academy Payment Box</span>
                    </h2>
                    <button 
                      onClick={() => setStep('info')}
                      className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-mono font-bold uppercase cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                  </div>

                  {/* Payment System Buttons Toggle */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {currentRegion?.paymentMethods?.filter((m: any) => m.active).map((method: any) => {
                      const IconComp = method.id === 'ccp' || method.id === 'bank' ? Landmark : CreditCard;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedMethod(method.id)}
                          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                            selectedMethod === method.id 
                              ? 'border-purple-600 bg-purple-950/30 text-white shadow-lg shadow-purple-900/10' 
                              : 'border-white/5 bg-zinc-900/40 text-gray-400 hover:text-white'
                          }`}
                        >
                          <IconComp className="w-5 h-5 text-purple-400" />
                          <span className="text-xs font-bold font-sans leading-tight">{method.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Payment Credentials Panel */}
                  <div className="p-6 bg-black border border-purple-500/10 rounded-2xl mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                      <Landmark className="w-24 h-24 text-white" />
                    </div>
                    
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-black mb-3 text-left">
                      {currentRegion?.paymentMethods?.find((m: any) => m.id === selectedMethod)?.name || 'Payment Details'} Details
                    </h4>

                    <div className="space-y-1.5 bg-zinc-950 p-3.5 rounded-xl text-left whitespace-pre-wrap font-mono text-gray-300 text-xs leading-relaxed">
                      {currentRegion?.paymentMethods?.find((m: any) => m.id === selectedMethod)?.instructions || 'No details required.'}
                    </div>
                  </div>

                  {/* Click/Drag File Upload Box */}
                  <div className="mb-6">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
                      Upload Payment Receipt Asset
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
                      onClick={() => document.getElementById('payment-receipt-input')?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
                        dragOver 
                          ? 'border-purple-500 bg-purple-950/25' 
                          : receiptFile 
                            ? 'border-purple-600/60 bg-zinc-900/60' 
                            : 'border-purple-900/20 bg-black/40 hover:border-purple-500/25'
                      }`}
                    >
                      <input 
                        id="payment-receipt-input"
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
                        <div className="w-full space-y-3">
                          {receiptBase64 && (
                            <img 
                              src={receiptBase64} 
                              alt="Receipt preview" 
                              className="max-h-36 mx-auto rounded-lg object-contain border border-white/10"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="text-xs text-purple-300 font-bold truncate px-6">
                            {receiptFile.name}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {(receiptFile.size / 1024).toFixed(1)} KB • Click to swap file
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white mb-0.5">Click or drag receipt photo here</p>
                            <p className="text-[10px] text-gray-500">Supports image files (JPG, PNG, WEBP)</p>
                          </div>
                        </>
                      )}
                    </div>
                    <ValidationTooltip isVisible={!!validationErrors.receipt} message="Please fill out this field." />
                  </div>                   {/* Policies Agreement Checkboxes */}
                  <div className="space-y-4 mb-8">
                    <div>
                      <div className="flex items-start gap-3">
                        <label htmlFor="agreeTerms" className="relative flex items-center cursor-pointer mt-0.5">
                          <input
                            id="agreeTerms"
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
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            termsAgreed 
                              ? 'bg-purple-600 border-purple-500 text-white' 
                              : 'border-purple-900/40 bg-black hover:border-purple-500/50'
                          }`}>
                            {termsAgreed && <Check className="w-3.5 h-3.5 font-bold" />}
                          </div>
                        </label>
                        <span className="text-xs text-gray-400 leading-normal">
                          I hereby agree and consent to the{' '}
                          <Link 
                            prev-state-check="terms"
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
                      <div className="flex items-start gap-3">
                        <label htmlFor="agreePolicy" className="relative flex items-center cursor-pointer mt-0.5">
                          <input
                            id="agreePolicy"
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
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            policyAgreed 
                              ? 'bg-purple-600 border-purple-500 text-white' 
                              : 'border-purple-900/40 bg-black hover:border-purple-500/50'
                          }`}>
                            {policyAgreed && <Check className="w-3.5 h-3.5 font-bold" />}
                          </div>
                        </label>
                        <span className="text-xs text-gray-400 leading-normal">
                          I certify that I accept the{' '}
                          <Link 
                            prev-state-check="policy"
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

                  {/* Submit Action Button */}
                  <button 
                    onClick={handleReceiptPayment}
                    disabled={processing}
                    className="w-full py-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-650/20 group cursor-pointer"
                  >
                    {processing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>Submit Payment Receipt</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-gray-500 text-[10px] font-mono mt-4">
                    <Lock className="w-3.5 h-3.5" />
                    <span>SECURE DIRECT VERIFICATION PORTAL</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trust Badges */}
            <div className="flex justify-center gap-8 opacity-40 grayscale pt-6">
              <span className="font-sans text-[11px] uppercase tracking-widest text-gray-500 font-bold">100% Secure Transact Setup</span>
            </div>
          </motion.div>
        </div>
      </div>





      {/* SUCCESS CONFIRMATION POPUP MODAL */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/92 backdrop-blur-xl" 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: { type: "spring", damping: 25, stiffness: 120 }
              }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-500/20 rounded-[2.5rem] p-10 max-w-md w-full relative z-10 text-center space-y-6 shadow-[0_25px_60px_-15px_rgba(147,51,234,0.3)] overflow-hidden"
            >
              {/* Premium Top Light Flare */}
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent pointer-events-none" />

              {/* Icon Section with concentric pulsing rings and particles */}
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                {/* Concentric pulsing background rings */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [1, 1.4, 1.8], opacity: [0.15, 0.05, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-emerald-500"
                />
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [1, 1.3, 1.6], opacity: [0.2, 0.08, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
                  className="absolute inset-0 rounded-full bg-purple-500"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.25)] relative z-10"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 10, delay: 0.2 }}
                  >
                    <ShieldCheck className="w-10 h-10 cursor-pointer" />
                  </motion.div>
                </motion.div>

                {/* Customized Premium Emitter Floating Confetti Particles */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const angle = (i / 24) * 360 + Math.random() * 15;
                  const distance = 70 + Math.random() * 110;
                  const x = Math.cos((angle * Math.PI) / 180) * distance;
                  const y = Math.sin((angle * Math.PI) / 180) * distance;
                  const size = Math.random() * 7 + 3;
                  const colors = ['#c084fc', '#60a5fa', '#34d399', '#fca5a5', '#fb7185', '#fef08a'];
                  const color = colors[i % colors.length];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ 
                        opacity: [0, 1, 1, 0], 
                        scale: [0, 1.3, 1, 0.3], 
                        x: x, 
                        y: y,
                        rotate: Math.random() * 360
                      }}
                      transition={{ 
                        duration: 1.8, 
                        ease: "easeOut", 
                        delay: 0.3 + Math.random() * 0.3 
                      }}
                      className="absolute pointer-events-none rounded-full"
                      style={{ 
                        width: size, 
                        height: size, 
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}`,
                        left: 'calc(50% - 4px)',
                        top: 'calc(50% - 4px)'
                      }}
                    />
                  );
                })}
              </div>

              {/* Text Section with staggered slide-up animations */}
              <div className="space-y-4">
                <motion.h3 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-black text-white tracking-tight font-sans"
                >
                  Receipt Uploaded!
                </motion.h3>
                
                <motion.p 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-gray-400 text-sm leading-relaxed max-w-[90%] mx-auto font-sans"
                >
                  Thank you for enrolling! We have successfully registered your payment receipt.
                </motion.p>
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="text-purple-300 font-semibold text-xs py-3 px-4 bg-purple-950/20 rounded-2xl border border-purple-550/15 max-w-[95%] mx-auto shadow-inner"
                >
                  Verification usually takes 2-3 hours to confirm.
                </motion.div>
                
                <motion.p 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="text-gray-500 text-xs leading-relaxed max-w-[90%] mx-auto font-sans"
                >
                  Your course is currently listed on your dashboard under <strong className="text-gray-300">"Pending Payments"</strong> with locked status while verification runs.
                </motion.p>
              </div>

              {/* Large, Beautiful Action Button with a custom hover scale and spring transition */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="pt-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/dashboard');
                  }}
                  className="w-full py-4.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-extrabold text-sm uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_25px_rgba(124,58,237,0.45)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  Go to Dashboard
                </button>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
