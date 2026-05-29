import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import AuthFlow from '../components/AuthFlow';

export default function Login() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center pt-28 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-8 bg-zinc-950 p-10 rounded-[2.5rem] border border-purple-900/30 relative z-10 shadow-2xl shadow-purple-600/5"
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4 group">
            <img 
              src="https://i.imgur.com/GbSMeSE.png" 
              alt="Cutscene Logo" 
              className="w-10 h-10 object-cover rounded-xl group-hover:scale-110 transition-transform"
            />
            <span className="text-2xl font-bold text-white tracking-tight">Cutscene</span>
          </div>
        </div>

        <AuthFlow onSuccess={() => navigate('/dashboard')} />
      </motion.div>
    </div>
  );
}

