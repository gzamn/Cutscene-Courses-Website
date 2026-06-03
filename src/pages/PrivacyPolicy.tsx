import { motion } from 'motion/react';
import { FileText, ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 cursor-pointer group"
          id="privacy-back-btn"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Go back</span>
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/30 rounded-full border border-purple-500/30 text-purple-400 text-sm font-bold mb-6">
            <Shield className="w-4 h-4" />
            Integrity Protection Guidelines
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 uppercase">Privacy & Refund Policy</h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Review how your profile details are stored and our exact refund policies before completing transactions.
          </p>
        </div>

        {/* Content Box */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950/60 border border-purple-900/30 p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden backdrop-blur-md space-y-12"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="prose prose-invert text-gray-300 text-sm leading-relaxed space-y-8 font-sans">
            
            {/* Part I — Privacy Directive */}
            <div>
              <h2 className="text-white text-lg font-bold border-b border-purple-500/10 pb-2 mb-4 uppercase tracking-tight flex items-center gap-2">
                <span className="text-purple-400">Part I —</span> Privacy Directive
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 1 — Data Collection</h3>
                  <p className="text-gray-300">
                    We receive basic registration files: your fullName, email credentials, phone coordinates, and billing deposit images. This is safely held under SSL configurations.
                  </p>
                </div>

                <div>
                  <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 2 — Usage Framework</h3>
                  <p className="text-gray-300">
                    User details are utilized purely to process enrollment and support accounts. We protect your billing files by encoding them as encrypted base64 elements in secure Cloud Firestore partitions.
                  </p>
                </div>

                <div>
                  <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 3 — Third-Party Disclosure</h3>
                  <p className="text-gray-300">
                    The academy does not trade, rent, or distribute personal indicators to third parties or marketing brokers.
                  </p>
                </div>

                <div>
                  <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 4 — Storage Life</h3>
                  <p className="text-gray-300">
                    Data objects stay active during the dynamic existence of your course usage or until requested for removal.
                  </p>
                </div>
              </div>
            </div>

            {/* Part II — Refund Directives */}
            <div>
              <h2 className="text-white text-lg font-bold border-b border-purple-500/10 pb-2 mb-4 uppercase tracking-tight flex items-center gap-2">
                <span className="text-purple-400">Part II —</span> Refund Directives
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 5 — Service Nature</h3>
                  <p className="text-gray-300">
                    All items sold inside the Academy (including pre-recorded lectures, software packages, LUTs bundles, sound effects libraries, overlay layers) are directly classified as digital files. Once payment receipts are verified and profiles are unlocked, refunds are strictly excluded.
                  </p>
                </div>

                <div>
                  <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 6 — Refund Window</h3>
                  <p className="text-gray-300">
                    If your purchase receipt is still pending verification and you choose to cancel, you may request database deletion. Once a certified admin unlocks the course, all cancellations become void.
                  </p>
                </div>

                <div>
                  <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 7 — Payment Rejections</h3>
                  <p className="text-gray-300">
                    If a submitted receipt contains false image hashes, wrong accounts, or unreadable deposits, our admins reject the item. You will be requested to upload a verified bill instead.
                  </p>
                </div>

                <div>
                  <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 8 — Administrative Decisions</h3>
                  <p className="text-gray-300">
                    Verification rulings executed by system administrators regarding receipt correctness are non-negotiable.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
