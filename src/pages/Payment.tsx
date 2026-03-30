import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CreditCard, Shield, CheckCircle2, ArrowLeft, Lock } from 'lucide-react';
import { COURSES } from '../types';

export default function Payment() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const course = COURSES.find(c => c.id === courseId) || COURSES[0];

  return (
    <div className="min-h-screen bg-black pt-40 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <Link to="/courses" className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to courses
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 sticky top-32"
            >
              <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>
              
              <div className="flex gap-4 mb-6">
                <img src={course.image} alt={course.title} className="w-20 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <div>
                  <h4 className="text-white font-bold text-sm leading-tight mb-1">{course.title}</h4>
                  <p className="text-gray-500 text-xs">{course.duration} • {course.level}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-purple-900/20 pt-6 mb-6">
                <div className="flex justify-between text-gray-400">
                  <span>Course Price</span>
                  <span>{course.price.toLocaleString()} {course.currency}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Platform Fee</span>
                  <span>0 {course.currency}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-xl pt-3">
                  <span>Total</span>
                  <span>{course.price.toLocaleString()} {course.currency}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-white font-semibold text-sm">What's included:</h4>
                {[
                  'Lifetime access to content',
                  'Certificate of completion',
                  'Downloadable resources',
                  'Community support access'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-purple-500" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-purple-500" />
                Registration & Payment
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">First Name</label>
                    <input type="text" className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Last Name</label>
                    <input type="text" className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">E-mail Address</label>
                    <input type="email" placeholder="amine@example.com" className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Phone Number</label>
                    <input type="tel" placeholder="05 xx xxxx" className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Card Number</label>
                  <div className="relative">
                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500" />
                    <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Expiry Date</label>
                    <input type="text" placeholder="MM/YY" className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">CVV</label>
                    <div className="relative">
                      <input type="text" placeholder="123" className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500" />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-lg mt-8 transition-all shadow-lg shadow-purple-600/20">
                  Register
                </button>

                <p className="text-center text-gray-500 text-sm mt-4 flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" /> Secure SSL Encrypted Payment
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
