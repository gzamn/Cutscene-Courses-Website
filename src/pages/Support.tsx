import { motion } from 'motion/react';
import { Mail, MessageSquare, Phone, MapPin, Send, HelpCircle } from 'lucide-react';

export default function Support() {
  return (
    <div className="min-h-screen bg-black pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Contact Support</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8">
              <h3 className="text-xl font-bold text-white mb-6">Get in Touch</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="p-3 bg-purple-900/30 rounded-xl text-purple-400">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Email Us</p>
                    <p className="text-white font-medium">support@purpleacademy.com</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-3 bg-purple-900/30 rounded-xl text-purple-400">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Call Us</p>
                    <p className="text-white font-medium">+1 (555) 000-0000</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-3 bg-purple-900/30 rounded-xl text-purple-400">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Visit Us</p>
                    <p className="text-white font-medium">123 Tech Avenue, Silicon Valley, CA</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-purple-600 rounded-3xl p-8 text-white">
              <HelpCircle className="w-10 h-10 mb-4 opacity-80" />
              <h3 className="text-xl font-bold mb-2">Help Center</h3>
              <p className="text-purple-100 mb-6">Check our documentation and FAQs for quick answers.</p>
              <button className="w-full py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition-colors">
                Visit Help Center
              </button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 md:p-12"
            >
              <h3 className="text-2xl font-bold text-white mb-8">Send us a Message</h3>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Your Name</label>
                    <input type="text" className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                    <input type="email" className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500" placeholder="john@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Subject</label>
                  <input type="text" className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500" placeholder="How can we help?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Message</label>
                  <textarea rows={6} className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500 resize-none" placeholder="Tell us more about your inquiry..."></textarea>
                </div>
                <button className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group">
                  Send Message
                  <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
