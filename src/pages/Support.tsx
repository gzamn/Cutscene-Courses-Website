import { motion } from 'motion/react';
import { Mail, MessageCircle, Phone, ArrowRight, HelpCircle, Send, CheckCircle2 } from 'lucide-react';

export default function Support() {
  return (
    <div className="min-h-screen bg-black text-white pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/30 rounded-full border border-purple-500/30 text-purple-400 text-sm font-bold mb-6"
          >
            <HelpCircle className="w-4 h-4" />
            Support Center
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">How can we help?</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Our support team is here to help you with any questions or issues you may have. 
            Reach out to us through any of the channels below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            { 
              title: 'Email Support', 
              desc: 'For general inquiries and billing questions.', 
              contact: 'cutscenedz@gmail.com', 
              icon: Mail,
              action: 'Send Email'
            },
            { 
              title: 'WhatsApp Support', 
              desc: 'Get quick answers to your technical questions.', 
              contact: '+213 558 006 704', 
              icon: MessageCircle,
              action: 'Chat Now'
            },
            { 
              title: 'Phone Support', 
              desc: 'Available Sunday to Thursday, 9am - 5pm.', 
              contact: '+213 791 575 149', 
              icon: Phone,
              action: 'Call Us'
            }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 group hover:bg-zinc-900 transition-all"
            >
              <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <item.icon className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">{item.desc}</p>
              <div className="text-white font-bold mb-8">{item.contact}</div>
              <button className="flex items-center gap-2 text-purple-400 font-bold hover:text-purple-300 transition-colors group/btn">
                {item.action}
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-12 bg-purple-600 text-white flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-6">Send us a message</h2>
              <p className="text-purple-100 mb-8 leading-relaxed">
                Have a specific question or feedback? Fill out the form and our team will get back to you within 24 hours.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span>Expert technical support</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span>Quick response times</span>
                </div>
              </div>
            </div>
            
            <div className="p-12">
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Your name"
                    className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="Your email"
                    className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Message</label>
                  <textarea 
                    rows={4}
                    placeholder="How can we help?"
                    className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                  />
                </div>
                <button className="w-full py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group shadow-lg shadow-purple-600/20">
                  Send Message
                  <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
