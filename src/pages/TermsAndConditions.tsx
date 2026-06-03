import { motion } from 'motion/react';
import { FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 cursor-pointer group"
          id="terms-back-btn"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Go back</span>
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/30 rounded-full border border-purple-500/30 text-purple-400 text-sm font-bold mb-6">
            <FileText className="w-4 h-4" />
            Legal Documentation
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 uppercase">Terms & Conditions</h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            Please read these terms and conditions carefully as they govern active usage of our learning systems.
          </p>
        </div>

        {/* Content Box */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950/60 border border-purple-900/30 p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden backdrop-blur-md space-y-8"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="prose prose-invert text-gray-300 text-sm leading-relaxed space-y-6 font-sans">
            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 1 — Purpose</h3>
              <p className="text-gray-300">
                These Terms and Conditions govern the enrollment in and use of the recorded video editing course ("the Course") offered by the Video Editing Academy ("the Academy"). By completing enrollment and paying the full fee, you signify consent to terms herein.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 2 — Access Requirements</h3>
              <p className="text-gray-300">
                Access to curriculum chapters, tutorial assets, software packages, and discord rooms requires a successful verification of payment via BaridiMob or CCP bank deposit. Verified students receive user profiles on the server granting non-transferable individual access.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 3 — Intended Use / Scope</h3>
              <p className="text-gray-300">
                All training videos, sample directories, stock overlays, LUTs presets, and instructor evaluations are provided exclusively for personal educational development. Commercial redistribution, resale, or group-sharing is strictly punishable under intellectual property rules.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 4 — Academic Evaluations</h3>
              <p className="text-gray-300">
                Students must submit their assignments and project works directly through the dashboard. Instructors evaluate files sequentially; feedback cycles require up to 48 hours.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 5 — Account Security</h3>
              <p className="text-gray-300">
                Users are responsible for locking their account secrets. Secondary sharing of student credentials immediately terminates enrollment with no rights reserved for compensation.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 6 — Course Formats</h3>
              <p className="text-gray-300">
                Course curriculum are sold on a fully pre-recorded chapter basis. No physical delivery elements are required or promised. Everything is hosted over direct cloud streaming servers.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 7 — Intellectual property laws</h3>
              <p className="text-gray-300">
                All materials inside are copyrighted video files. Screen scraping, unauthorized mirroring, or exporting resource templates without permissions is forbidden and automatically flagged.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 8 — Conduct and Discipline</h3>
              <p className="text-gray-300">
                Interaction within community servers or comment boards must remain highly professional. Harassment, excessive spam, or offensive dialogue results in direct block lists.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 9 — Continuous Updating</h3>
              <p className="text-gray-300">
                The academy reserves rights to change software tools, replace presets, or expand homework tasks on a continuous update cycle to improve educational relevance.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 10 — System Demands</h3>
              <p className="text-gray-300">
                Students must own compliant PC computing hardware capable of running video editing softwares (Adobe Premiere, After Effects, DaVinci Resolve) to accomplish lesson targets.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 11 — Account Deletion</h3>
              <p className="text-gray-300">
                Violators committing piracy or resource exploitation lose login access permanently upon assessment from administrators.
              </p>
            </div>

            <div>
              <h3 className="text-purple-400 font-extrabold uppercase text-xs tracking-wider font-mono mb-2">Article 12 — Jurisdiction & Contact</h3>
              <p className="text-gray-300">
                These terms are governed by national regulations. Administrative enquiries are overseen via designated contact desks.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
