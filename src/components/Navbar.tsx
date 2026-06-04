import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, User, LayoutDashboard, Globe, Menu, X, Bell, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logout, db, collection, query, orderBy, onSnapshot } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { user, userProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(false);
  const [isMobileUpdatesOpen, setIsMobileUpdatesOpen] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const updatesMenuRef = useRef<HTMLDivElement>(null);
  const mobileUpdatesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
      if (updatesMenuRef.current && !updatesMenuRef.current.contains(event.target as Node)) {
        setIsUpdatesOpen(false);
      }
      if (mobileUpdatesMenuRef.current && !mobileUpdatesMenuRef.current.contains(event.target as Node)) {
        setIsMobileUpdatesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch announcements for notifications
  useEffect(() => {
    const q = query(collection(db, 'updates'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setUpdates(items);
      
      const lastCheckedStr = localStorage.getItem('cutscene_updates_checked');
      if (items.length > 0) {
        if (!lastCheckedStr) {
          setHasUnread(true);
        } else {
          const lastCheckedTime = new Date(lastCheckedStr).getTime();
          const newestTime = items[0].createdAt ? new Date(items[0].createdAt).getTime() : 0;
          if (newestTime > lastCheckedTime) {
            setHasUnread(true);
          } else {
            setHasUnread(false);
          }
        }
      }
    }, (error) => console.error('Error fetching updates in Navbar:', error));
    return unsub;
  }, []);

  const toggleUpdatesDropdown = () => {
    setIsUpdatesOpen(!isUpdatesOpen);
    setHasUnread(false);
    localStorage.setItem('cutscene_updates_checked', new Date().toISOString());
  };

  const toggleMobileUpdatesDropdown = () => {
    setIsMobileUpdatesOpen(!isMobileUpdatesOpen);
    setHasUnread(false);
    localStorage.setItem('cutscene_updates_checked', new Date().toISOString());
  };

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
    { name: t('nav.downloadables'), path: '/downloadables' },
    { name: t('nav.plans'), path: '/plans' },
    { name: t('nav.updates'), path: '/updates' },
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
            <div className="hidden md:flex items-center gap-6">
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

          {/* Desktop Auth Controls & Language Switcher */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Switcher Hamburger Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} 
                className="flex items-center gap-2 bg-zinc-900/50 hover:bg-zinc-800/80 px-2.5 py-1.5 rounded-xl border border-purple-900/10 text-gray-300 hover:text-white transition-all text-xs font-bold cursor-pointer"
                title="Change Language"
                aria-expanded={isLangMenuOpen}
              >
                <Globe className="w-4 h-4 text-purple-500" />
                <span className="text-[10px] text-purple-400 font-extrabold tracking-wider bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/10 uppercase">
                  {language}
                </span>
              </button>
              
              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 py-1.5 px-2 w-28 bg-zinc-950/95 border border-purple-900/25 rounded-2xl shadow-2xl backdrop-blur-md z-50 flex flex-col gap-1 transition-all animate-fade-in">
                  {(['en', 'fr', 'ar'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setIsLangMenuOpen(false);
                      }}
                      className={`px-3 py-1.5 text-left text-xs font-bold rounded-lg transition-all flex items-center justify-between ${
                        language === lang 
                          ? 'bg-purple-650 text-white shadow-xs' 
                          : 'text-gray-400 hover:text-gray-250 hover:bg-white/5'
                      }`}
                    >
                      <span className="uppercase">{lang}</span>
                      {language === lang && <span className="w-1.5 h-1.5 rounded-full bg-white block animate-pulse" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Latest News / Updates Bell Dropdown */}
            <div className="relative" ref={updatesMenuRef}>
              <button 
                onClick={toggleUpdatesDropdown}
                className="relative p-2 text-gray-400 hover:text-white transition-all cursor-pointer rounded-full hover:bg-zinc-900"
                title={`${updates.length} Updates`}
              >
                <Bell className="w-4 h-4 text-purple-400" />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full ring-2 ring-zinc-950 animate-pulse" />
                )}
              </button>

              {isUpdatesOpen && (
                <div className={`absolute right-0 mt-3 w-80 bg-zinc-950/98 border border-purple-900/25 rounded-2xl shadow-2xl p-4 backdrop-blur-md z-50 flex flex-col gap-3 animate-fade-in max-h-[380px] overflow-y-auto ${language === 'ar' ? 'left-0 right-auto' : ''}`}>
                  <div className="flex items-center justify-between border-b border-purple-950/20 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'آخر الإعلانات والتحديثات' : language === 'fr' ? 'Dernières Annonces' : 'Academy Updates'}
                    </span>
                    {updates.length > 0 && (
                      <span className="text-[9px] font-mono font-bold bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/10">
                        {updates.length}
                      </span>
                    )}
                  </div>

                  {updates.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-[11.5px] text-gray-500">{language === 'ar' ? 'لا يوجد إعلانات جديدة' : language === 'fr' ? 'Aucune mise à jour' : 'No recent updates available'}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 divide-y divide-purple-950/15">
                      {updates.slice(0, 5).map((item) => (
                        <div key={item.id} className="pt-2.5 first:pt-0 group text-left">
                          <div className="flex items-start gap-2.5">
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 uppercase tracking-widest ${
                              item.category?.toLowerCase() === 'announcement' ? 'bg-purple-500' :
                              item.category?.toLowerCase() === 'feature' ? 'bg-blue-500' :
                              item.category?.toLowerCase() === 'news' ? 'bg-green-500' :
                              'bg-amber-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[12px] font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-1 leading-tight">{item.title}</h4>
                              <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{item.content}</p>
                              <div className="flex items-center gap-2 mt-1.5 text-[9px] text-gray-500 font-mono">
                                <Clock className="w-3 h-3 text-purple-600/80 shrink-0" />
                                <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</span>
                                {item.pinned && (
                                  <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.5 rounded font-bold font-sans">PINNED</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-purple-950/20 pt-2 mt-1">
                    <Link
                      to="/updates"
                      onClick={() => setIsUpdatesOpen(false)}
                      className="block text-center text-[10px] font-black uppercase tracking-wider text-purple-400 hover:text-white transition-all bg-purple-950/10 hover:bg-purple-950/30 py-2 rounded-xl border border-purple-500/10"
                    >
                      {language === 'ar' ? 'عرض جميع الإعلانات' : language === 'fr' ? 'Voir toutes les annonces' : 'View All Announcements'}
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {user ? (
              <div className="relative flex items-center ml-2 border-l border-purple-900/10 pl-4" ref={profileMenuRef}>
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 flex flex-col gap-1 bg-zinc-950/95 border border-purple-900/25 p-2 rounded-2xl shadow-2xl backdrop-blur-md z-50 transition-all animate-fade-in">
                    <NavLink
                      to="/dashboard"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all w-full text-left ${
                          isActive ? 'text-purple-400 bg-white/5' : 'text-gray-300 hover:text-purple-400 hover:bg-white/5'
                        }`
                      }
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{t('nav.dashboard')}</span>
                    </NavLink>
                    
                    <NavLink
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all w-full text-left ${
                          isActive ? 'text-purple-400 bg-white/5' : 'text-gray-300 hover:text-purple-400 hover:bg-white/5'
                        }`
                      }
                    >
                      <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{t('nav.profile')}</span>
                    </NavLink>

                    {userProfile?.role === 'admin' && (
                      <NavLink
                        to="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={({ isActive }) => 
                          `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-purple-900/25 w-full text-left ${
                            isActive ? 'text-white bg-purple-900/40 border-purple-500/50' : 'text-purple-400 bg-purple-950/20 hover:text-purple-300 hover:bg-purple-900/20'
                          }`
                        }
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-md shadow-purple-500/50 animate-pulse shrink-0" />
                        <span>Admin</span>
                      </NavLink>
                    )}

                    <div className="border-t border-purple-900/10 my-1 font-mono" />

                    <button
                      onClick={() => {
                        handleLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-all w-full text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                )}

                {/* Profile Picture Trigger Theme (Hamburger Icon) */}
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="relative group transition-transform hover:scale-105 active:scale-95 focus:outline-none cursor-pointer shrink-0"
                  title="Open Account Menu"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-indigo-650 rounded-full opacity-60 blur-xs group-hover:opacity-100 transition duration-300" />
                  <img
                    src={userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                    alt="Profile Avatar"
                    className="relative w-9 h-9 rounded-full object-cover border border-white/10"
                    referrerPolicy="no-referrer"
                  />
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
          <div className="flex md:hidden items-center gap-1.5">
            {/* Mobile Updates bell dropdown */}
            <div className="relative" ref={mobileUpdatesMenuRef}>
              <button 
                onClick={toggleMobileUpdatesDropdown}
                className="relative p-2 text-gray-400 hover:text-white transition-all cursor-pointer rounded-full"
                title={`${updates.length} Updates`}
              >
                <Bell className="w-5 h-5 text-purple-400" />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full ring-2 ring-zinc-950 animate-pulse" />
                )}
              </button>

              {isMobileUpdatesOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-zinc-950 border border-purple-900/25 rounded-2xl shadow-2xl p-4 backdrop-blur-md z-50 flex flex-col gap-3 animate-fade-in max-h-[350px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-purple-950/20 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'آخر التحديثات' : language === 'fr' ? 'Dernières Annonces' : 'Updates'}
                    </span>
                    {updates.length > 0 && (
                      <span className="text-[9px] font-mono font-bold bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/10">
                        {updates.length}
                      </span>
                    )}
                  </div>

                  {updates.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-[11px] text-gray-500">No updates yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 divide-y divide-purple-950/15">
                      {updates.slice(0, 5).map((item) => (
                        <div key={item.id} className="pt-2.5 first:pt-0 group text-left">
                          <div className="flex items-start gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 uppercase tracking-widest ${
                              item.category?.toLowerCase() === 'announcement' ? 'bg-purple-500' :
                              item.category?.toLowerCase() === 'feature' ? 'bg-blue-500' :
                              item.category?.toLowerCase() === 'news' ? 'bg-green-500' :
                              'bg-amber-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[11.5px] font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-1 leading-tight">{item.title}</h4>
                              <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{item.content}</p>
                              <div className="flex items-center gap-2 mt-1 text-[8.5px] text-gray-500 font-mono">
                                <Clock className="w-2.5 h-2.5 text-purple-600/80 shrink-0" />
                                <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-purple-950/20 pt-2 mt-1">
                    <Link
                      to="/updates"
                      onClick={() => setIsMobileUpdatesOpen(false)}
                      className="block text-center text-[10px] font-black uppercase tracking-wider text-purple-400 hover:text-white transition-all bg-purple-950/10 hover:bg-purple-950/30 py-2 rounded-xl border border-purple-400/10"
                    >
                      View All
                    </Link>
                  </div>
                </div>
              )}
            </div>

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
          <div className="md:hidden py-4 border-t border-purple-900/10 flex flex-col gap-4 animate-fade-in">
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
