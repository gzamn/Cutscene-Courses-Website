import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, User, LayoutDashboard, Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logout } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { user, userProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

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
    { name: t('nav.student_work'), path: '/student-work' },
    { name: t('nav.contact'), path: '/support' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-surface-dark border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-3 group shrink-0" onClick={() => setIsOpen(false)}>
              <img 
                src="https://i.imgur.com/GbSMeSE.png" 
                alt="Cutscene Logo" 
                className="w-9 h-9 object-cover rounded-xl group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-white leading-none">
                  CUTSCENE
                </span>
                <span className="text-micro text-purple-400">Academy</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-6">
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
              {userProfile?.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => 
                    `transition-colors font-semibold whitespace-nowrap text-sm sm:text-base flex items-center gap-1 border border-purple-900/40 bg-purple-950/20 px-2.5 py-1 rounded-lg ${
                      isActive ? 'text-purple-300 border-purple-500/50 bg-purple-900/40' : 'text-purple-400 hover:text-purple-300 hover:bg-purple-900/20'
                    }`
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-md shadow-purple-500/50 animate-pulse" />
                  Admin
                </NavLink>
              )}
            </div>
          </div>

          {/* Desktop Auth Controls & Language Switcher */}
          <div className="hidden lg:flex items-center gap-4">
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

          {/* Mobile hamburger menu button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-400 hover:text-white transition-colors focus:outline-none"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X className="w-6 h-6 animate-fade-in" /> : <Menu className="w-6 h-6 animate-fade-in" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-purple-900/10 flex flex-col gap-4 animate-fade-in">
            {/* Mobile Nav Links */}
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => 
                    `transition-colors font-medium text-base py-2 border-b border-white/5 ${
                      isActive ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
              {userProfile?.role === 'admin' && (
                <NavLink
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => 
                    `transition-colors font-semibold text-base flex items-center gap-2 py-2 border-b border-white/5 ${
                      isActive ? 'text-purple-300' : 'text-purple-400 hover:text-purple-300'
                    }`
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-md shadow-purple-500/50 animate-pulse" />
                  Admin Portal
                </NavLink>
              )}
            </div>

            {/* Mobile Actions (Language + Auth) */}
            <div className="flex flex-col gap-4 pt-2">
              {/* Language Switcher */}
              <div className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-xl border border-purple-900/20">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-500" />
                  Select Language
                </span>
                <div className="flex items-center gap-1">
                  {(['en', 'fr', 'ar'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setIsOpen(false);
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded transition-all ${
                        language === lang 
                          ? 'bg-purple-600 text-white' 
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* User Session */}
              {user ? (
                <div className="flex flex-col gap-3">
                  <NavLink
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center gap-3 py-2 border-b border-white/5 transition-colors font-medium text-base ${
                        isActive ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'
                      }`
                    }
                  >
                    <LayoutDashboard className="w-5 h-5 text-purple-500" />
                    <span>{t('nav.dashboard')}</span>
                  </NavLink>
                  <NavLink
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center gap-3 py-2 border-b border-white/5 transition-colors font-medium text-base ${
                        isActive ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'
                      }`
                    }
                  >
                    <User className="w-5 h-5 text-purple-500" />
                    <span>{t('nav.profile')}</span>
                  </NavLink>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 py-2 text-gray-300 hover:text-red-400 transition-colors font-medium text-base text-left"
                  >
                    <LogOut className="w-5 h-5 text-red-500" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              ) : (
                <NavLink
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center px-6 py-3 bg-brand-radial rounded-xl font-bold text-base transition-opacity hover:opacity-90 text-white block"
                >
                  {t('nav.login')}
                </NavLink>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
