import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, ShieldCheck, ArrowRight, CheckCircle2, Lock, Building2, Globe, Landmark, Loader2 } from 'lucide-react';
import { COURSES } from '../types';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';

type PaymentMethod = 'card' | 'bank' | 'edahabia' | 'cib';
type BankTransferType = 'local' | 'eu' | 'international';

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const searchParams = new URLSearchParams(location.search);
  const courseId = searchParams.get('courseId');
  const course = COURSES.find(c => c.id === courseId);
  
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [bankType, setBankType] = useState<BankTransferType>('local');
  const [processing, setProcessing] = useState(false);

  // Student Info State
  const [formData, setFormData] = useState({
    fullName: '',
    email: user?.email || '',
    phone: '',
    format: 'recorded' as 'recorded' | 'online',
    startDate: '2026-05-01' // Example starting date
  });

  const calculateTotal = () => {
    if (!course) return 0;
    return formData.format === 'online' ? course.price + 2000 : course.price;
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone) {
      alert('Please fill in all required fields.');
      return;
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    if (!user || !courseId) {
      alert(t('payment.loginRequired'));
      navigate('/login');
      return;
    }

    if (paymentMethod === 'edahabia') {
      setProcessing(true);
      try {
        const response = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: calculateTotal(),
            currency: course.currency,
            courseTitle: course.title,
            successUrl: `${window.location.origin}/dashboard?payment=success`,
            failureUrl: `${window.location.origin}/payment?courseId=${courseId}&payment=failed`,
          }),
        });

        const data = await response.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          throw new Error(data.error || 'Failed to create checkout session');
        }
      } catch (error) {
        console.error('Payment Error:', error);
        alert(t('payment.error'));
      } finally {
        setProcessing(false);
      }
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
          status: 'active',
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          format: formData.format,
          startDate: formData.format === 'online' ? formData.startDate : null,
          totalPaid: calculateTotal()
        });
      }

      alert(t('payment.success'));
      navigate('/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enrollments');
    } finally {
      setProcessing(false);
    }
  };

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
                <div className="flex justify-between text-gray-400">
                  <span>{t('payment.coursePrice')}</span>
                  <span className="text-white font-medium">{course.price.toLocaleString()} {course.currency}</span>
                </div>
                {formData.format === 'online' && (
                  <div className="flex justify-between text-purple-400">
                    <span>{t('payment.online')} {t('payment.onlineExtra')}</span>
                    <span className="font-medium">+2,000 {course.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>{t('payment.platformFee')}</span>
                  <span className="text-white font-medium">0 {course.currency}</span>
                </div>
                <div className="pt-4 border-t border-purple-900/20 flex justify-between items-center">
                  <span className="text-xl font-bold">{t('payment.totalAmount')}</span>
                  <span className="text-3xl font-black text-purple-500">{calculateTotal().toLocaleString()} {course.currency}</span>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  t('payment.benefit1'),
                  t('payment.benefit2'),
                  t('payment.benefit3'),
                  t('payment.benefit4')
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
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
              {step === 'info' ? (
                <motion.div
                  key="info-step"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-10"
                >
                  <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-purple-500" />
                    {t('payment.infoTitle')}
                  </h2>
                  
                  <form onSubmit={handleInfoSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">{t('support.fullName')}</label>
                        <input 
                          type="text" 
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                          placeholder={t('support.namePlaceholder')}
                          className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">{t('support.emailAddress')}</label>
                        <input 
                          type="email" 
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder={t('support.emailPlaceholder')}
                          className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">{t('payment.phone')}</label>
                        <input 
                          type="tel" 
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder={t('payment.phonePlaceholder')}
                          className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-sm font-semibold text-gray-400">{t('payment.format')}</label>
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, format: 'recorded'})}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                            formData.format === 'recorded' ? 'border-purple-600 bg-purple-600/10' : 'border-purple-900/20 bg-black'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-bold text-sm">{t('payment.recorded')}</div>
                            <div className="text-xs text-gray-500">Learn at your own pace</div>
                          </div>
                          {formData.format === 'recorded' && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, format: 'online'})}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                            formData.format === 'online' ? 'border-purple-600 bg-purple-600/10' : 'border-purple-900/20 bg-black'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-bold text-sm">{t('payment.online')}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-purple-400 font-medium">{t('payment.onlineExtra')}</span>
                              <span className="text-[10px] text-gray-500">•</span>
                              <span className="text-[10px] text-gray-400">{t('payment.startDate')}: {formData.startDate}</span>
                            </div>
                          </div>
                          {formData.format === 'online' && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                        </button>
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
                  className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-10"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <CreditCard className="w-7 h-7 text-purple-500" />
                      {t('payment.method')}
                    </h2>
                    <button 
                      onClick={() => setStep('info')}
                      className="text-sm text-purple-400 hover:underline"
                    >
                      {t('payment.back')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-8">
                    <button 
                      onClick={() => setPaymentMethod('card')}
                      className={`flex items-center justify-between p-6 bg-black border-2 transition-all group rounded-2xl ${
                        paymentMethod === 'card' ? 'border-purple-600' : 'border-purple-900/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          paymentMethod === 'card' ? 'bg-purple-600/20' : 'bg-zinc-800'
                        }`}>
                          <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-purple-500' : 'text-gray-500'}`} />
                        </div>
                        <div className="text-left">
                          <div className={`font-bold transition-colors ${paymentMethod === 'card' ? 'text-white' : 'text-gray-400'}`}>Credit Card</div>
                          <div className="text-gray-500 text-sm">Visa, Mastercard, American Express</div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        paymentMethod === 'card' ? 'border-purple-600' : 'border-gray-700'
                      }`}>
                        {paymentMethod === 'card' && <div className="w-3 h-3 bg-purple-600 rounded-full" />}
                      </div>
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('edahabia')}
                      className={`flex items-center justify-between p-6 bg-black border-2 transition-all group rounded-2xl ${
                        paymentMethod === 'edahabia' ? 'border-purple-600' : 'border-purple-900/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          paymentMethod === 'edahabia' ? 'bg-purple-600/20' : 'bg-zinc-800'
                        }`}>
                          <CreditCard className={`w-6 h-6 ${paymentMethod === 'edahabia' ? 'text-purple-500' : 'text-gray-500'}`} />
                        </div>
                        <div className="text-left">
                          <div className={`font-bold transition-colors ${paymentMethod === 'edahabia' ? 'text-white' : 'text-gray-400'}`}>EDAHABIA / CIB</div>
                          <div className="text-gray-500 text-sm">Algerie Poste & Interbank Cards</div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        paymentMethod === 'edahabia' ? 'border-purple-600' : 'border-gray-700'
                      }`}>
                        {paymentMethod === 'edahabia' && <div className="w-3 h-3 bg-purple-600 rounded-full" />}
                      </div>
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('bank')}
                      className={`flex items-center justify-between p-6 bg-black border-2 transition-all group rounded-2xl ${
                        paymentMethod === 'bank' ? 'border-purple-600' : 'border-purple-900/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          paymentMethod === 'bank' ? 'bg-purple-600/20' : 'bg-zinc-800'
                        }`}>
                          <Building2 className={`w-6 h-6 ${paymentMethod === 'bank' ? 'text-purple-500' : 'text-gray-500'}`} />
                        </div>
                        <div className="text-left">
                          <div className={`font-bold transition-colors ${paymentMethod === 'bank' ? 'text-white' : 'text-gray-400'}`}>{t('payment.bankTransfer')}</div>
                          <div className="text-gray-500 text-sm">BaridiMob, SEPA, SWIFT</div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        paymentMethod === 'bank' ? 'border-purple-600' : 'border-gray-700'
                      }`}>
                        {paymentMethod === 'bank' && <div className="w-3 h-3 bg-purple-600 rounded-full" />}
                      </div>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {paymentMethod === 'card' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-400 mb-2">{t('payment.cardNumber')}</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="0000 0000 0000 0000"
                              className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            />
                            <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-400 mb-2">{t('payment.expiryDate')}</label>
                            <input 
                              type="text" 
                              placeholder="MM/YY"
                              className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-400 mb-2">CVV</label>
                            <input 
                              type="text" 
                              placeholder="123"
                              className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'edahabia' && (
                      <div className="p-8 bg-purple-600/10 border border-purple-600/30 rounded-2xl text-center space-y-4">
                        <CreditCard className="w-12 h-12 text-purple-500 mx-auto" />
                        <div className="space-y-2">
                          <h3 className="font-bold text-lg">External Payment Gateway</h3>
                          <p className="text-sm text-gray-400">
                            You will be redirected to the secure SATIM/Algerie Poste payment portal to complete your transaction.
                          </p>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'bank' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'local', label: 'Local', icon: Landmark, sub: 'BaridiMob' },
                            { id: 'eu', label: 'EU', icon: Globe, sub: 'SEPA' },
                            { id: 'international', label: 'Global', icon: Globe, sub: 'SWIFT' }
                          ].map((type) => (
                            <button
                              key={type.id}
                              onClick={() => setBankType(type.id as BankTransferType)}
                              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                bankType === type.id ? 'border-purple-600 bg-purple-600/10' : 'border-purple-900/20 bg-black'
                              }`}
                            >
                              <type.icon className={`w-5 h-5 ${bankType === type.id ? 'text-purple-500' : 'text-gray-500'}`} />
                              <div className="text-center">
                                <div className="text-xs font-bold">{type.label}</div>
                                <div className="text-[10px] text-gray-500">{type.sub}</div>
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="p-6 bg-black border border-purple-900/30 rounded-2xl space-y-4">
                          <div className="text-sm text-gray-400">
                            {bankType === 'local' ? (
                              <div className="space-y-2">
                                <div className="font-bold text-white mb-2">BaridiMob Details:</div>
                                <div className="flex justify-between"><span>RIP:</span> <span className="text-white font-mono">00799999000123456789</span></div>
                                <div className="flex justify-between"><span>Name:</span> <span className="text-white">Cutscene Academy</span></div>
                              </div>
                            ) : bankType === 'eu' ? (
                              <div className="space-y-2">
                                <div className="font-bold text-white mb-2">SEPA Details:</div>
                                <div className="flex justify-between"><span>IBAN:</span> <span className="text-white font-mono">FR76 3000 6000 0123 4567 8901 234</span></div>
                                <div className="flex justify-between"><span>BIC:</span> <span className="text-white font-mono">BNPAFRPP</span></div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="font-bold text-white mb-2">International Details:</div>
                                <div className="flex justify-between"><span>SWIFT:</span> <span className="text-white font-mono">CUTS DZ AL XXX</span></div>
                                <div className="flex justify-between"><span>Account:</span> <span className="text-white font-mono">1234567890</span></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handlePayment}
                      disabled={processing}
                      className="w-full py-5 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-600/30 group disabled:opacity-50"
                    >
                      {processing ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          {t('payment.pay')} {calculateTotal().toLocaleString()} {course.currency}
                          <ArrowRight className={`w-6 h-6 group-hover:translate-x-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                      <Lock className="w-4 h-4" />
                      <span>{t('payment.secure')}</span>
                    </div>
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
