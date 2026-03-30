import { useLocation, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CreditCard, ShieldCheck, ArrowRight, CheckCircle2, Lock, Smartphone } from 'lucide-react';
import { COURSES } from '../types';

export default function Payment() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const courseId = searchParams.get('courseId');
  const course = COURSES.find(c => c.id === courseId);

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Course Not Selected</h2>
          <Link to="/courses" className="text-purple-400 hover:text-purple-300">Browse Courses</Link>
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
              <h1 className="text-4xl font-bold mb-4">Complete your order</h1>
              <p className="text-gray-400">Join 330+ students already learning with us.</p>
            </div>

            <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-purple-500" />
                Order Summary
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
                  <span>Course Price</span>
                  <span className="text-white font-medium">{course.price.toLocaleString()} {course.currency}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Platform Fee</span>
                  <span className="text-white font-medium">0 {course.currency}</span>
                </div>
                <div className="pt-4 border-t border-purple-900/20 flex justify-between items-center">
                  <span className="text-xl font-bold">Total Amount</span>
                  <span className="text-3xl font-black text-purple-500">{course.price.toLocaleString()} {course.currency}</span>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  'Lifetime access to course materials',
                  'Certificate of completion',
                  'Access to private student community',
                  'Direct support from instructor'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Payment Methods */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-10">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <CreditCard className="w-7 h-7 text-purple-500" />
                Payment Method
              </h2>

              <div className="grid grid-cols-1 gap-4 mb-8">
                <button className="flex items-center justify-between p-6 bg-black border-2 border-purple-600 rounded-2xl transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white">Mobile Payment</div>
                      <div className="text-gray-500 text-sm">Dahabshiil, Telesom, Somnet</div>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-purple-600 flex items-center justify-center">
                    <div className="w-3 h-3 bg-purple-600 rounded-full" />
                  </div>
                </button>

                <button className="flex items-center justify-between p-6 bg-zinc-900/30 border-2 border-transparent hover:border-purple-900/30 rounded-2xl transition-all group opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-400">Credit Card</div>
                      <div className="text-gray-600 text-sm">Visa, Mastercard (Coming Soon)</div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="Enter your mobile number"
                    className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>

                <button className="w-full py-5 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-600/30 group">
                  Pay {course.price.toLocaleString()} {course.currency}
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Secure encrypted transaction</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex justify-center gap-8 opacity-40 grayscale">
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
