import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Calendar, Tag, Pin, Newspaper, ArrowRight, ArrowLeft } from 'lucide-react';
import { db, collection, query, orderBy, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

interface UpdateItem {
  id: string;
  title: string;
  content: string;
  category: string;
  pinned?: boolean;
  createdAt: string;
  createdBy?: string;
}

export default function Updates() {
  const { t, language, isRTL } = useLanguage();
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(0);

  // Load last read timestamp and listen to updates
  useEffect(() => {
    // Retrieve last time user viewed updates
    const stored = localStorage.getItem('cutscene_updates_last_read');
    if (stored) {
      setLastReadTimestamp(parseInt(stored));
    } else {
      // If never read, set to yesterday to highlight current ones
      setLastReadTimestamp(Date.now() - 24 * 60 * 60 * 1000);
    }

    const updatesCollectionRef = collection(db, 'updates');
    const q = query(updatesCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as UpdateItem[];
        setUpdates(list);
        setLoading(false);

        // Update last read to now in localStorage on mount so next visits know they are read
        localStorage.setItem('cutscene_updates_last_read', Date.now().toString());
      },
      (error) => {
        console.error('Error listening to updates:', error);
        handleFirestoreError(error, OperationType.LIST, 'updates');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter and sort updates
  const categories = ['All', 'Announcement', 'Feature', 'News', 'Event'];
  
  const filteredUpdates = updates.filter((item) => {
    if (activeCategory === 'All') return true;
    return item.category?.toLowerCase() === activeCategory.toLowerCase();
  });

  // Sort: Pinned first, then by createdAt desc
  const sortedUpdates = [...filteredUpdates].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getCategoryColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'announcement':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'feature':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'news':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'event':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-850 text-gray-400 border-white/5';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center space-y-4 mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full text-xs font-bold text-purple-400 uppercase tracking-widest"
          >
            <Bell className="w-3.5 h-3.5 animate-pulse" />
            <span>{language === 'ar' ? 'ابق على اطلاع' : language === 'fr' ? 'Restez Informé' : 'STAY INFORMED'}</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-gray-150 to-purple-400 bg-clip-text text-transparent"
          >
            {language === 'ar' ? 'آخر الأخبار والإعلانات' : language === 'fr' ? 'Actualités & Annonces' : 'Academy Updates & News'}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm md:text-base text-gray-400 max-w-xl mx-auto leading-relaxed"
          >
            {language === 'ar'
              ? 'تابع جميع مستجدات الأكاديمية والميزات المضافة والفعاليات القادمة.'
              : language === 'fr'
              ? 'Toutes les nouveautés de l\'académie, les fonctionnalités ajoutées et les événements.'
              : 'Keep up with the latest updates, feature announcements, and notifications direct from the team.'}
          </motion.p>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 border-b border-purple-950/10 pb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                activeCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/10'
                  : 'bg-zinc-950 border-purple-900/10 text-gray-450 hover:border-purple-500/20 hover:text-white'
              }`}
            >
              {cat === 'All' 
                ? (language === 'ar' ? 'الكل' : language === 'fr' ? 'Tout' : 'All')
                : cat}
            </button>
          ))}
        </div>

        {/* Main Stream / Content Area */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-zinc-955/40 border border-purple-900/10 rounded-[2rem] p-8 animate-pulse space-y-4">
                <div className="h-4 w-1/4 bg-zinc-800 rounded-md" />
                <div className="h-6 w-3/4 bg-zinc-800 rounded-md" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-zinc-900 rounded-md" />
                  <div className="h-3 w-5/6 bg-zinc-900 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedUpdates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950/40 border border-purple-900/10 rounded-[2.5rem] p-12 text-center space-y-6 max-w-lg mx-auto"
          >
            <div className="w-16 h-16 bg-purple-950/20 text-purple-400 border border-purple-900/20 rounded-full flex items-center justify-center mx-auto">
              <Newspaper className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">No notifications yet</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                Check back shortly. Any exciting announcements, tools, and updates will show up here.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence mode="popLayout">
              {sortedUpdates.map((item, idx) => {
                const isNew = new Date(item.createdAt).getTime() > lastReadTimestamp;
                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    className="relative bg-zinc-955/35 border border-purple-900/10 hover:border-purple-500/20 rounded-[2.2rem] p-8 md:p-10 transition-all duration-300 group hover:shadow-2xl hover:shadow-purple-700/5 overflow-hidden flex flex-col md:flex-row gap-6 md:gap-8 justify-between items-start"
                  >
                    {/* Glow effect */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-2xl pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
                    
                    <div className="space-y-4 flex-grow text-left">
                      
                      {/* Meta information indicators */}
                      <div className="flex flex-wrap items-center gap-3">
                        {item.pinned && (
                          <span className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                            <Pin className="w-3 h-3 fill-amber-500/10 shrink-0" />
                            <span>{language === 'ar' ? 'مثبت' : 'Pinned'}</span>
                          </span>
                        )}

                        <span className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest border rounded-lg ${getCategoryColor(item.category)}`}>
                          <Tag className="w-2.5 h-2.5 inline-block mr-1 shrink-0 align-middle -mt-0.5" />
                          <span>{item.category || 'Announcement'}</span>
                        </span>

                        <span className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{new Date(item.createdAt).toLocaleDateString(language === 'ar' ? 'ar' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </span>

                        {isNew && !item.pinned && (
                          <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" title="New Announcement!" />
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="text-xl md:text-2xl font-extrabold text-white group-hover:text-purple-400 transition-colors tracking-tight leading-snug">
                        {item.title}
                      </h2>

                      {/* Content block with elegant wrapping support */}
                      <p className="text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                        {item.content}
                      </p>

                    </div>

                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}
