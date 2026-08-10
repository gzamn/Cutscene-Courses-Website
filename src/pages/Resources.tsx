import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Search, 
  ExternalLink, 
  HelpCircle, 
  Loader2, 
  Globe, 
  Grid,
  Laptop,
  BookOpen,
  Film
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { db, handleFirestoreError, OperationType, collection, addDoc, getDocs } from '../firebase';
import { SparkleButton } from '../components/AnimatedButtons';

interface UsefulResource {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
  url: string;
  order: number;
  active: boolean;
}

const DEFAULT_RESOURCES = [
  {
    name: "Pexels Free Stock Footage",
    description: "The best free stock videos, clips, and footage shared by the talented Pexels community.",
    category: "Free Stock Footage",
    logoUrl: "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=200&auto=format&fit=crop",
    url: "https://www.pexels.com/videos/",
    active: true,
    order: 1
  },
  {
    name: "Adobe Firefly",
    description: "Use generative AI and simple text prompts to create highest quality creative variations, vectors, and effects.",
    category: "AI Tools",
    logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop",
    url: "https://firefly.adobe.com/",
    active: true,
    order: 2
  },
  {
    name: "DaVinci Resolve Training",
    description: "Official Blackmagic Design interactive lessons, training books, and certification resources.",
    category: "Learning Resources",
    logoUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=200&auto=format&fit=crop",
    url: "https://www.blackmagicdesign.com/products/davinciresolve/training",
    active: true,
    order: 3
  },
  {
    name: "Mixkit Asset Hub",
    description: "Awesome free assets for your next video project: Premiere Pro templates, transitions, sound effects, and stock music.",
    category: "Free Stock Footage",
    logoUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=200&auto=format&fit=crop",
    url: "https://mixkit.co/",
    active: true,
    order: 4
  }
];

export default function Resources() {
  const { language } = useLanguage();
  
  const [resources, setResources] = useState<UsefulResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Translations
  const langText = {
    title: {
      en: "USEFUL RESOURCES",
      fr: "RESSOURCES UTILES",
      ar: "المصادر المفيدة"
    },
    subtitle: {
      en: "A curated catalog of premium external assets, creative utilities, AI tools, and training portals.",
      fr: "Un catalogue sélectionné d'actifs externes, d'utilitaires créatifs, d'outils d'IA et de portails de formation.",
      ar: "دليل منسق بعناية من الملفات الخارجية، والأدوات الإبداعية، والذكاء الاصطناعي، ومواقع التدريب."
    },
    searchPlaceholder: {
      en: "Search resources by name or description...",
      fr: "Rechercher des ressources par nom ou description...",
      ar: "ابحث في المصادر بالاسم أو الوصف..."
    },
    visitBtn: {
      en: "Visit Website",
      fr: "Visiter le Site",
      ar: "زيارة الموقع"
    },
    allCategories: {
      en: "All Categories",
      fr: "Toutes Catégories",
      ar: "جميع الفئات"
    }
  };

  const getL = (key: keyof typeof langText) => {
    return langText[key][language as 'en' | 'fr' | 'ar'] || langText[key]['en'];
  };

  // Fetch Resources
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'useful_resources'));
        let list = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UsefulResource[];

        if (list.length === 0) {
          console.log('No resources found in database. Seeding defaults...');
          for (const item of DEFAULT_RESOURCES) {
            try {
              await addDoc(collection(db, 'useful_resources'), {
                ...item,
                createdAt: new Date().toISOString()
              });
            } catch (seedErr) {
              console.warn('Auto-seeding resources failed (expected for non-admins):', seedErr);
            }
          }
          const seededSnapshot = await getDocs(collection(db, 'useful_resources'));
          list = seededSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as UsefulResource[];
        }

        // Sort by order ascending
        list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        
        // Filter out inactive resources
        const activeList = list.filter(r => r.active !== false);
        setResources(activeList);

      } catch (err: any) {
        console.error('Failed to load useful resources:', err);
        handleFirestoreError(err, OperationType.LIST, 'useful_resources');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  // Get list of unique categories
  const categories = ['All', ...Array.from(new Set(resources.map(r => r.category)))];

  // Filtered resources list
  const filteredResources = resources.filter(resource => {
    if (!resource) return false;
    const matchesCategory = selectedCategory === 'All' || resource.category === selectedCategory;
    const q = (searchQuery || '').toLowerCase();
    const nameMatch = (resource.name || '').toLowerCase().includes(q);
    const descMatch = (resource.description || '').toLowerCase().includes(q);
    const catMatch = (resource.category || '').toLowerCase().includes(q);
    return matchesCategory && (nameMatch || descMatch || catMatch);
  });

  const getCategoryIcon = (category: string) => {
    switch((category || '').toLowerCase()) {
      case 'ai tools':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case 'free stock footage':
        return <Film className="w-3.5 h-3.5 text-purple-400" />;
      case 'learning resources':
        return <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white pt-28 pb-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title section */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'أدوات ومصادر' : 'CREATIVE TOOLS'}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-4"
          >
            {getL('title')}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-400 text-sm sm:text-base leading-relaxed"
          >
            {getL('subtitle')}
          </motion.p>
        </div>

        {/* Filters and Search Bar row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 mb-12">
          
          {/* Categories select tags */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`py-2 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedCategory === category
                    ? 'bg-purple-950/40 border-purple-500 text-purple-300 shadow-md'
                    : 'bg-zinc-950/40 border-purple-950/15 text-gray-400 hover:border-purple-900/20 hover:text-white'
                }`}
              >
                {category === 'All' ? getL('allCategories') : category}
              </button>
            ))}
          </div>

          {/* Search bar input */}
          <div className="relative max-w-sm w-full">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getL('searchPlaceholder')}
              className="w-full bg-zinc-950/40 border border-purple-950/20 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-purple-500/40 focus:bg-black transition-all text-white placeholder-gray-550"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>

        </div>

        {/* Loading */}
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-16 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/15 max-w-md mx-auto">
            <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">No resource matches your query.</p>
          </div>
        ) : (
          /* Resources Grid list */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredResources.map((resource) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                className="bg-zinc-950/40 rounded-[2rem] border border-purple-950/20 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between hover:border-purple-900/40 transition-all shadow-xl"
              >
                <div className="flex items-center gap-5">
                  {/* Web Logo image */}
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-purple-950/25 bg-zinc-900">
                    <img 
                      src={resource.logoUrl} 
                      alt={resource.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Info details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-lg text-white leading-tight">
                        {resource.name}
                      </h3>
                      {/* Badge */}
                      <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full bg-purple-950/30 border border-purple-900/20 text-[9px] font-bold text-purple-400 uppercase tracking-wider">
                        {getCategoryIcon(resource.category)}
                        {resource.category}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed max-w-md">
                      {resource.description}
                    </p>
                  </div>
                </div>

                {/* Go Visit Button */}
                <div className="w-full sm:w-auto self-end sm:self-center shrink-0">
                  <SparkleButton
                    onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
                    className="w-full sm:w-auto py-3.5 px-6 font-bold uppercase text-[11px]"
                  >
                    <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      {getL('visitBtn')}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </SparkleButton>
                </div>

              </motion.div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
