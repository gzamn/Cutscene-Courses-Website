import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { GraduationCap, Mail, Lock, ArrowRight, Github } from 'lucide-react';

export default function Login() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center pt-20 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
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
          <Link to="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="p-2 bg-purple-600 rounded-xl group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Cutscene</span>
          </Link>
          <h2 className="text-3xl font-extrabold text-white mb-2">Welcome back</h2>
          <p className="text-gray-400">Please enter your details to sign in</p>
        </div>

        <form className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-12 py-4 border border-purple-900/30 placeholder-gray-500 text-white rounded-2xl bg-black focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-12 py-4 border border-purple-900/30 placeholder-gray-500 text-white rounded-2xl bg-black focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-purple-900 rounded bg-black"
              />
              <label htmlFor="remember-me" className="ml-2 block text-gray-400">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all shadow-lg shadow-purple-600/20"
            >
              Sign in
              <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>

        <div className="relative mt-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-purple-900/30"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-zinc-950 text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <button className="flex items-center justify-center gap-2 py-3 px-4 bg-black border border-purple-900/30 rounded-2xl text-white hover:bg-zinc-900 transition-all font-medium">
            <Github className="w-5 h-5" />
            Github
          </button>
          <button className="flex items-center justify-center gap-2 py-3 px-4 bg-black border border-purple-900/30 rounded-2xl text-white hover:bg-zinc-900 transition-all font-medium">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <a href="#" className="font-bold text-purple-400 hover:text-purple-300 transition-colors">
            Sign up for free
          </a>
        </p>
      </motion.div>
    </div>
  );
}
