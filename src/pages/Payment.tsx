import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Lock, Building2, Globe, Landmark, Loader2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, collection, addDoc, query, where, getDocs, doc, getDoc, setDoc } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import AuthFlow from '../components/AuthFlow';

type PaymentMethod = 'card' | 'bank' | 'edahabia' | 'cib';
type BankTransferType = 'local' | 'eu' | 'international';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('edahabia');
  const [bankType, setBankType] = useState<BankTransferType>('local');
  const [processing, setProcessing] = useState(false);

  // Student Info State
  const [formData, setFormData] = useState({
    fullName: '',
    email: user?.email || '',
    phone: '',
    format: 'recorded',
    startDate: '2026-06-01'
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
              format: (data.formatAvailability && !data.formatAvailability.includes('recorded')) ? 'online' : 'recorded'
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
    if (course.id === '4') return course.price;
    return formData.format === 'online' ? course.price + 2000 : course.price;
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone) {
      alert('Please complete your profile details and phone number before proceeding.');
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

  const handleTelegramPayment = async () => {
    if (!user || !courseId) {
      alert(t('payment.loginRequired'));
      navigate('/login');
      return;
    }

    setProcessing(true);
    try {
      // Check if already enrolled
      const q = query(collection(db, 'enrollments'), where('uid', '==', user.uid), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        await addDoc(collection(db, 'enrollments'), {
          uid: user.uid,
          courseId: courseId,
          enrolledAt: new Date().toISOString(),
          status: 'pending_telegram',
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          format: formData.format,
          startDate: formData.format === 'online' ? formData.startDate : null,
          totalPaid: calculateTotal(),
          paid: false // Added boolean: default unpaid, exclusively commanded in Firebase
        });
      }

      // Ensure/Create a matching user profile for every enrollment in the Firestore database
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || formData.email,
        displayName: formData.fullName || user.displayName || '',
        phone: formData.phone,
        isEnroller: true, // Mark them as enroller AND user
        isUser: true,
        role: 'enroller',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Redirect to Telegram
      window.location.href = 'https://t.me/gzamine';
    } catch (error) {
      console.error('Telegram redirect or save error:', error);
      window.location.href = 'https://t.me/gzamine';
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
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
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

            <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8">
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
                  <h3 className="font-bold text-lg mb-1">{course.title}</h3>
                  <div className="text-purple-400 text-sm font-semibold uppercase tracking-wider">{course.level}</div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>{t('payment.coursePrice')}</span>
                  <span className="text-white font-medium">{course.price.toLocaleString()} {course.currency}</span>
                </div>
                {formData.format === 'online' && (
                  <div className="flex justify-between text-purple-400 text-sm">
                    <span>{t('payment.online')} {t('payment.onlineExtra')}</span>
                    <span className="font-medium">+2,000 {course.currency}</span>
                  </div>
                )}
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
                  <div key={i} className="flex items-center gap-3 text-xs text-gray-400">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
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
                // Ask them to login or signup and pop the AuthFlow box to them
                <motion.div
                  key="auth-login-step"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-10 shadow-2xl shadow-purple-900/5"
                >
                  <AuthFlow 
                    onSuccess={() => {
                      // Will re-render and head directly to course format choice
                    }}
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
                  className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-10"
                >
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-purple-500" />
                    {t('payment.infoTitle')}
                  </h2>

                  {/* Student Profile Info Summary */}
                  <div className="p-4 bg-zinc-900/50 border border-purple-900/20 rounded-2xl flex items-center justify-between mb-8 text-left">
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 font-mono">Enrolling Student</div>
                      <div className="font-bold text-sm text-white">{formData.fullName || userProfile?.displayName || user.displayName || 'No Name Found'}</div>
                      <div className="text-xs text-gray-400">{formData.email || user.email} {formData.phone ? `| ${formData.phone}` : ''}</div>
                    </div>
                  </div>
                  
                  <form onSubmit={handleInfoSubmit} className="space-y-6">
                    {!userProfile?.phone && (
                      <div className="space-y-2 text-left">
                        <label className="block text-sm font-semibold text-gray-400">Phone Number (Required to enroll)</label>
                        <input 
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="e.g. 0550 00 00 00"
                          className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="block text-sm font-semibold text-gray-400 text-left">{t('payment.format')}</label>
                      <div className="grid grid-cols-1 gap-3">
                        {(!course.formatAvailability || course.formatAvailability.includes('recorded')) && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, format: 'recorded'})}
                            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                              formData.format === 'recorded' ? 'border-purple-600 bg-purple-600/10' : 'border-purple-900/20 bg-black'
                            }`}
                          >
                            <div className="text-left">
                              <div className="font-bold text-sm text-white">{t('payment.recorded')}</div>
                              <div className="text-xs text-gray-500">Learn at your own pace</div>
                            </div>
                            {formData.format === 'recorded' && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                          </button>
                        )}
                        {(!course.formatAvailability || course.formatAvailability.includes('online')) && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, format: 'online'})}
                            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                              formData.format === 'online' ? 'border-purple-600 bg-purple-600/10' : 'border-purple-900/20 bg-black'
                            }`}
                          >
                            <div className="text-left">
                              <div className="font-bold text-sm text-white">{t('payment.online')}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-purple-400 font-medium">{t('payment.onlineExtra')}</span>
                                <span className="text-[10px] text-gray-500">•</span>
                                <span className="text-[10px] text-gray-400">{t('payment.startDate')}: {formData.startDate}</span>
                              </div>
                            </div>
                            {formData.format === 'online' && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Final Price banner - put the final price just under making the choice between recorded and online */}
                    <div className="p-6 bg-purple-950/20 border border-purple-500/20 rounded-2xl flex items-center justify-between mt-6">
                      <div className="text-left">
                        <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Final Price</div>
                        <div className="text-xs text-gray-400">All fees included</div>
                      </div>
                      <div className="text-3xl font-black text-white">
                        {calculateTotal().toLocaleString()} {course.currency}
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-5 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-600/30 group"
                    >
                      {t('payment.next')}
                      <ArrowRight className={`w-6 h-6 group-hover:translate-x-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="payment-step"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-10 text-center"
                >
                  <div className="flex items-center justify-between mb-8 text-left">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                      <Send className="w-7 h-7 text-purple-500" />
                      {t('payment.method')}
                    </h2>
                    <button 
                      onClick={() => setStep('info')}
                      className="text-sm text-purple-400 hover:underline"
                    >
                      {t('payment.back')}
                    </button>
                  </div>

                  <div className="my-10 space-y-4">
                    <div className="w-20 h-20 bg-purple-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
                      <Send className="w-10 h-10 text-purple-500 animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-black text-white px-2">
                      Contact us on telegram to complete the payment
                    </h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                      To complete your purchase for <strong className="text-purple-400">{course.title}</strong>, click the button below to message our administrator on Telegram. We will provide payment instructions and activate your course immediately.
                    </p>
                  </div>

                  <button 
                    onClick={handleTelegramPayment}
                    disabled={processing}
                    className="w-full py-5 bg-[#229ED9] hover:bg-[#1A8DB8] text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/10 group disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        Open Telegram
                        <ArrowRight className={`w-6 h-6 group-hover:translate-x-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-6">
                    <Lock className="w-4 h-4" />
                    <span>Secure Telegram Support</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trust Badges */}
            <div className="flex justify-center gap-8 opacity-40 grayscale pt-8">
              <img src="https://picsum.photos/seed/visa/100/40" alt="Visa" className="h-6 object-contain" referrerPolicy="no-referrer" />
              <img src="https://picsum.photos/seed/mastercard/100/40" alt="Mastercard" className="h-6 object-contain" referrerPolicy="no-referrer" />
              <img src="https://picsum.photos/seed/stripe/100/40" alt="Stripe" className="h-6 object-contain" referrerPolicy="no-referrer" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
