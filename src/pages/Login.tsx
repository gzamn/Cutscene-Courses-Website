import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Github, Chrome } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 pt-28">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-400">
            {isLogin ? 'Enter your details to access your dashboard' : 'Join our community of learners today'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Full Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="John Doe"
                  className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
              <input 
                type="email" 
                placeholder="name@example.com"
                className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-black border border-purple-900/30 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {isLogin && (
            <div className="text-right">
              <button className="text-sm text-purple-400 hover:text-purple-300">Forgot password?</button>
            </div>
          )}

          <button className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 group mt-6">
            {isLogin ? 'Sign In' : 'Create Account'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8">
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-purple-900/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-zinc-950 text-gray-500 uppercase tracking-wider">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 py-3 bg-black border border-purple-900/30 rounded-xl text-gray-300 hover:bg-zinc-900 transition-colors">
              <Chrome className="w-5 h-5" /> Google
            </button>
            <button className="flex items-center justify-center gap-2 py-3 bg-black border border-purple-900/30 rounded-xl text-gray-300 hover:bg-zinc-900 transition-colors">
              <Github className="w-5 h-5" /> GitHub
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-gray-400">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-purple-400 font-bold hover:text-purple-300"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
