import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Lock, Building2, Globe, Landmark, Loader2, Send, Upload, FileText, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, collection, addDoc, query, where, getDocs, doc, getDoc, setDoc } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import AuthFlow from '../components/AuthFlow';

type PaymentMethod = 'ccp' | 'baridimob';

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const searchParams = new URLSearchParams(location.search);
  const courseId = searchParams.get('courseId');
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [selectedMethod, setSelectedMethod] = useState<'ccp' | 'baridimob'>('baridimob');
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
    return course.price; // always standard price
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

    // 1. Full name validation: must be filled and correct formatted text
    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      alert('Full Name is required.');
      return;
    }
    if (trimmedName.length < 3) {
      alert('Your Full Name must contain at least 3 letters.');
      return;
    }
    const nameRegex = /^[\p{L}\s.''-]+$/u;
    if (!nameRegex.test(trimmedName)) {
      alert('Please enter a correct full name (consisting only of letter characters, spaces, and hyphens).');
      return;
    }

    // 2. Email validation: must be filled with a correct formatted email address
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      alert('Electronic Mail Address is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      alert('Please enter a correct email address format (e.g. yourname@domain.com).');
      return;
    }

    // 3. Phone validation: must be filled with a correct formatted phone number
    const trimmedPhone = formData.phone.trim();
    if (!trimmedPhone) {
      alert('Phone Number is required.');
      return;
    }
    const cleanPhone = trimmedPhone.replace(/[+\s-()]/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
      alert('Please enter a correct phone number containing 9 to 15 digits (e.g., 0550123456).');
      return;
    }

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

    // Double check full profile data validation
    const trimmedName = formData.fullName.trim();
    if (!trimmedName || trimmedName.length < 3 || !/^[\p{L}\s.''-]+$/u.test(trimmedName)) {
      alert('Your Full Name must contain at least 3 letters and consist of normal name characters.');
      setStep('info');
      return;
    }

    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      alert('Kindly verify your electronic mail address format.');
      setStep('info');
      return;
    }

    const trimmedPhone = formData.phone.trim();
    const cleanPhone = trimmedPhone.replace(/[+\s-()]/g, '');
    if (!trimmedPhone || cleanPhone.length < 9 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
      alert('Please enter a correct phone number with 9 to 15 digits.');
      setStep('info');
      return;
    }

    if (!termsAgreed) {
      alert('You must review and agree to the Terms & Conditions.');
      return;
    }

    if (!policyAgreed) {
      alert('You must review and agree to the Privacy & Refund Policy.');
      return;
    }

    if (!receiptBase64) {
      alert('Kindly upload or drop a photo of your transaction receipt to complete your purchase.');
      return;
    }

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
        totalPaid: calculateTotal(),
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
                  <span className="text-white font-medium">{course.price.toLocaleString()} {course.currency}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>Course Format</span>
                  <span className="text-purple-400 font-semibold uppercase tracking-widest text-[11px]">Recorded Lectures</span>
                </div>
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>{t('payment.platformFee')}</span>
                  <span className="text-white font-medium">0 {course.currency}</span>
                </div>
                <div className="pt-4 border-t border-purple-900/20 flex justify-between items-center">
                  <span className="text-lg font-bold">{t('payment.totalAmount')}</span>
                  <span className="text-2xl font-black text-purple-500">{calculateTotal().toLocaleString()} {course.currency}</span>
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
                    <div className="space-y-2 text-left font-sans">
                      <label htmlFor="studentFullName" className="block text-sm font-semibold text-gray-300">Student Full Name</label>
                      <input 
                        id="studentFullName"
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        placeholder="e.g. amine rouabhia"
                        className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <label htmlFor="studentPhone" className="block text-sm font-semibold text-gray-300">Phone Number (Required to enroll)</label>
                      <input 
                        id="studentPhone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="e.g. 0550 00 00 00"
                        className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                      />
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
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('baridimob')}
                      className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        selectedMethod === 'baridimob' 
                          ? 'border-purple-600 bg-purple-950/30 text-white shadow-lg shadow-purple-900/10' 
                          : 'border-white/5 bg-zinc-900/40 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-purple-400" />
                      <span className="text-xs font-bold uppercase font-sans">BaridiMob</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('ccp')}
                      className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        selectedMethod === 'ccp' 
                          ? 'border-purple-600 bg-purple-950/30 text-white shadow-lg shadow-purple-900/10' 
                          : 'border-white/5 bg-zinc-900/40 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Landmark className="w-5 h-5 text-purple-400" />
                      <span className="text-xs font-bold uppercase font-sans">CCP</span>
                    </button>
                  </div>

                  {/* Payment Credentials Panel */}
                  <div className="p-6 bg-black border border-purple-500/10 rounded-2xl mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                      <Building2 className="w-24 h-24 text-white" />
                    </div>
                    
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-black mb-3">
                      {selectedMethod === 'baridimob' ? 'BaridiMob Wire details' : 'CCP Transaction Details'}
                    </h4>

                    {selectedMethod === 'baridimob' ? (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-505 font-medium">RIP Account:</span>
                          <span className="font-mono text-purple-300 font-extrabold text-[13px] bg-purple-950/15 border border-purple-500/10 px-2.5 py-1 rounded-md select-all">
                            00799999004164129502
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 italic mt-2">
                          *Transfer using your BaridiMob app and save the digital PDF or photo receipt below.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 font-mono text-[11px]">
                        <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                          <span className="text-gray-500">Name:</span>
                          <span className="text-white font-extrabold select-all">ROUABHIA AMINE</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                          <span className="text-gray-500">Number:</span>
                          <span className="text-white font-extrabold select-all">0041641295</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                          <span className="text-gray-500">Key:</span>
                          <span className="text-white font-extrabold select-all">02</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Address:</span>
                          <span className="text-white font-extrabold select-all">BATNA, BATNA</span>
                        </div>
                      </div>
                    )}
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
                        if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
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
                        onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
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
                  </div>                   {/* Policies Agreement Checkboxes */}
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <label htmlFor="agreeTerms" className="relative flex items-center cursor-pointer mt-0.5">
                        <input
                          id="agreeTerms"
                          type="checkbox"
                          checked={termsAgreed}
                          onChange={(e) => setTermsAgreed(e.target.checked)}
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

                    <div className="flex items-start gap-3">
                      <label htmlFor="agreePolicy" className="relative flex items-center cursor-pointer mt-0.5">
                        <input
                          id="agreePolicy"
                          type="checkbox"
                          checked={policyAgreed}
                          onChange={(e) => setPolicyAgreed(e.target.checked)}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              className="bg-zinc-950 border border-purple-500/25 rounded-[2.5rem] p-10 max-w-md w-full relative z-10 text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <ShieldCheck className="w-10 h-10 animate-bounce cursor-pointer" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">Receipt Uploaded!</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Thank you for enrolling! We have successfully registered your payment receipt. 
                </p>
                <p className="text-purple-300 font-semibold text-xs py-2 bg-purple-950/20 rounded-xl border border-purple-500/10">
                  Verification usually takes 2-3 hours to confirm.
                </p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Your course is currently listed on your dashboard under <strong className="text-gray-300">"Pending Payments"</strong> with locked status while verification runs.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/dashboard');
                }}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-extrabold text-sm uppercase tracking-wider transition-all shadow-lg shadow-purple-650/20 cursor-pointer"
              >
                Go to Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
