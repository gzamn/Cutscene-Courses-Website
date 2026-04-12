import { Link, NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, User, LayoutDashboard, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logout } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { user, userProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.courses'), path: '/courses' },
    { name: t('nav.ai'), path: '/ai' },
    { name: t('nav.contact'), path: '/support' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-surface-dark border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center py-4 gap-4 md:justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="p-2 bg-brand-radial rounded-xl group-hover:scale-105 transition-transform shadow-lg shadow-purple-600/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-white leading-none">
                  CUTSCENE
                </span>
                <span className="text-micro text-purple-400">Academy</span>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) => 
                    `transition-colors font-medium whitespace-nowrap text-sm sm:text-base ${
                      isActive ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-purple-900/20">
              <Globe className="w-4 h-4 text-purple-500 mx-1" />
              {(['en', 'fr', 'ar'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                    language === lang 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            {user ? (
              <div className="flex items-center gap-4 ml-2 pl-4 border-l border-purple-900/30">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => 
                    `flex items-center gap-2 transition-colors font-medium text-sm sm:text-base ${
                      isActive ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('nav.dashboard')}</span>
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) => 
                    `flex items-center gap-2 transition-colors font-medium text-sm sm:text-base ${
                      isActive ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'
                    }`
                  }
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('nav.profile')}</span>
                </NavLink>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-300 hover:text-red-400 transition-colors font-medium text-sm sm:text-base"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('nav.logout')}</span>
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) => 
                  `ml-2 px-6 py-2 bg-brand-radial rounded-xl font-bold text-sm sm:text-base transition-opacity hover:opacity-90 ${
                    isActive ? 'opacity-100' : 'opacity-80'
                  }`
                }
              >
                {t('nav.login')}
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
