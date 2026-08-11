import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Play, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, DEFAULT_COURSES } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

interface WatchItem {
  courseId: string;
  courseTitle: string;
  chapter: number | string;
  type: string;
  currentTime?: number;
  duration?: number;
  thumbnail?: string;
  lessonTitle?: string;
  updatedAt?: string;
}

export function ContinueWatchingWidget() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(false);
  const [watchItem, setWatchItem] = useState<WatchItem | null>(null);

  // Check if current route should suppress the widget (e.g. video player, quiz, exercise)
  const isSuppressedRoute = location.pathname.includes('/video/') || 
                            location.pathname.includes('/quiz/') || 
                            location.pathname.includes('/exercise/');

  useEffect(() => {
    // 1. Check if user already dismissed widget during this browser session
    const isDismissed = sessionStorage.getItem('continue_watching_dismissed') === 'true';
    if (isDismissed || isSuppressedRoute) {
      setIsVisible(false);
      return;
    }

    let isMounted = true;

    async function resolveWatchItem() {
      try {
        let candidateItem: WatchItem | null = null;

        // A. Try loading recent item from localStorage
        const localSaved = localStorage.getItem('continue_watching');
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (parsed && parsed.courseId) {
              const hasValidTime = typeof parsed.currentTime === 'number' && parsed.currentTime > 0;
              const hasValidDur = typeof parsed.duration === 'number' && parsed.duration > 0;
              candidateItem = {
                courseId: parsed.courseId,
                courseTitle: parsed.courseTitle || 'Academy Course',
                chapter: parsed.chapter || 1,
                type: parsed.type || 'session',
                currentTime: hasValidTime ? parsed.currentTime : undefined,
                duration: hasValidDur ? parsed.duration : undefined,
                thumbnail: parsed.thumbnail || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=400',
                lessonTitle: parsed.lessonTitle || `Session ${parsed.chapter || 1}`,
                updatedAt: parsed.updatedAt
              };
            }
          } catch (e) {
            console.warn('Failed to parse continue_watching from localStorage:', e);
          }
        }

        // B. If user logged in, check Firestore progress for an even newer or missing item
        if (user && user.uid) {
          try {
            const progressRef = collection(db, 'progress');
            const q = query(
              progressRef,
              where('uid', '==', user.uid),
              limit(20)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              const items = snap.docs.map(doc => doc.data() as any);
              items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
              const latest = items[0];

              if (latest && latest.courseId) {
                const fsTime = new Date(latest.updatedAt || 0).getTime();
                const localTime = candidateItem?.updatedAt ? new Date(candidateItem.updatedAt).getTime() : 0;

                if (fsTime >= localTime || !candidateItem) {
                  const matchingCourse = DEFAULT_COURSES.find(c => c.id === latest.courseId);
                  const hasValidTime = typeof latest.currentTime === 'number' && latest.currentTime > 0;
                  const hasValidDur = typeof latest.duration === 'number' && latest.duration > 0;

                  candidateItem = {
                    courseId: latest.courseId,
                    courseTitle: matchingCourse?.title || candidateItem?.courseTitle || 'Academy Course',
                    chapter: latest.chapter || 1,
                    type: latest.type || 'session',
                    currentTime: hasValidTime ? latest.currentTime : candidateItem?.currentTime,
                    duration: hasValidDur ? latest.duration : candidateItem?.duration,
                    thumbnail: matchingCourse?.image || candidateItem?.thumbnail || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=400',
                    lessonTitle: latest.lessonTitle || `Session ${latest.chapter || 1}`,
                    updatedAt: latest.updatedAt
                  };
                }
              }
            }
          } catch (fsErr) {
            console.warn('Could not query firestore progress:', fsErr);
          }
        }

        // C. Fallback for new visitors or users with no progress history yet
        if (!candidateItem) {
          const defaultCourse = DEFAULT_COURSES[0];
          candidateItem = {
            courseId: defaultCourse.id,
            courseTitle: defaultCourse.title,
            chapter: 1,
            type: 'session',
            currentTime: undefined,
            duration: undefined,
            thumbnail: defaultCourse.image,
            lessonTitle: language === 'ar' ? 'الجلسة 1: أساسيات المونتاج' : language === 'fr' ? 'Session 1: Les bases du montage' : 'Session 1: Premiere Pro Essentials',
          };
        }

        if (isMounted && candidateItem) {
          setWatchItem(candidateItem);
          // Slight delay for ultra-smooth entrance after page render
          const timer = setTimeout(() => {
            if (isMounted) setIsVisible(true);
          }, 800);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error('Error resolving watch item:', err);
      }
    }

    resolveWatchItem();

    return () => {
      isMounted = false;
    };
  }, [user, location.pathname, isSuppressedRoute, language]);

  const handleDismiss = () => {
    sessionStorage.setItem('continue_watching_dismissed', 'true');
    setIsVisible(false);
  };

  const handleContinue = () => {
    sessionStorage.setItem('continue_watching_dismissed', 'true');
    setIsVisible(false);
    if (watchItem) {
      const targetPath = `/courses/${watchItem.courseId}/video/${watchItem.chapter}/${watchItem.type || 'session'}`;
      navigate(targetPath);
    }
  };

  if (isSuppressedRoute || !watchItem) {
    return null;
  }

  // Check if real recorded player progress exists
  const hasRealProgress = Boolean(
    typeof watchItem.currentTime === 'number' && 
    watchItem.currentTime > 0 && 
    typeof watchItem.duration === 'number' && 
    watchItem.duration > 0
  );

  // Calculate progress percent
  const percent = hasRealProgress 
    ? Math.min(100, Math.max(1, Math.round((watchItem.currentTime! / watchItem.duration!) * 100)))
    : 0;

  // Format time remaining or watched
  const formatSecs = (secs?: number) => {
    if (!secs) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isRtl = language === 'ar';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="continue-watching-widget"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          dir={isRtl ? 'rtl' : 'ltr'}
          className="fixed bottom-6 left-6 z-50 w-[calc(100vw-3rem)] sm:w-88 max-w-sm bg-zinc-950/95 backdrop-blur-xl border border-purple-500/30 shadow-[0_20px_50px_rgba(88,28,135,0.35)] rounded-2xl p-4 text-white group overflow-hidden"
        >
          {/* Subtle Ambient Background Gradient Glow */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-indigo-600/15 rounded-full blur-2xl pointer-events-none" />

          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-purple-900/25 relative z-10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                {language === 'ar' ? 'متابعة التعلم' : language === 'fr' ? 'Reprendre la lecture' : 'Continue Watching'}
              </span>
            </div>

            <button
              id="continue-watching-close-btn"
              onClick={handleDismiss}
              aria-label="Close continue watching prompt"
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Course & Lesson Details Body */}
          <div className="mt-3 flex gap-3 items-center relative z-10">
            {/* Thumbnail Box */}
            <div 
              onClick={handleContinue}
              className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-purple-900/30 group/thumb cursor-pointer bg-zinc-900 shadow-md"
            >
              <img 
                src={watchItem.thumbnail} 
                alt={watchItem.courseTitle}
                className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            {/* Info Column */}
            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="text-xs font-bold text-white truncate group-hover:text-purple-200 transition-colors">
                {watchItem.courseTitle}
              </h4>
              <p className="text-[11px] text-gray-300 truncate font-medium">
                {watchItem.lessonTitle}
              </p>
              
              {hasRealProgress && (
                <div className="flex items-center gap-1.5 text-[10px] text-purple-300 font-mono">
                  <Clock className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>{formatSecs(watchItem.currentTime)} / {formatSecs(watchItem.duration)}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">{percent}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Sleek Progress Bar - Only shown if real player progress exists */}
          {hasRealProgress && (
            <div className="mt-3 relative z-10">
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-purple-900/20">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-3 relative z-10">
            <button
              id="continue-watching-resume-btn"
              onClick={handleContinue}
              className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/25 border border-purple-400/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {language === 'ar' ? 'متابعة الدرس الآن' : language === 'fr' ? 'Continuer la leçon' : 'Resume Lesson'}
              </span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ContinueWatchingWidget;
