import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  Search, 
  Lock, 
  Sparkles, 
  ShoppingBag, 
  Play, 
  Music, 
  FileCode, 
  Video, 
  Image as ImageIcon, 
  Volume2, 
  AlertCircle,
  FolderOpen,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  db, 
  handleFirestoreError, 
  OperationType, 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc,
  doc,
  getDoc
} from '../firebase';

// Helper to match category to an icon
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Softwares':
      return <FileCode className="w-5 h-5 text-purple-400" />;
    case 'Videos':
      return <Video className="w-5 h-5 text-blue-400" />;
    case 'Images':
      return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    case 'Music':
      return <Music className="w-5 h-5 text-amber-400" />;
    case 'Sound Effects':
      return <Volume2 className="w-5 h-5 text-red-400" />;
    default:
      return <FolderOpen className="w-5 h-5 text-gray-400" />;
  }
};

const DEFAULT_DOWNLOADABLES = [
  {
    name: 'DaVinci Resolve Cinematic PowerGrades & Luts',
    category: 'Softwares',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80',
    downloadUrl: 'https://download.blackmagicdesign.com/DaVinciResolve/DaVinci_Resolve_18.6_Mac.dmg',
    description: 'Professional color grading presets crafted for cinematic skin tones, moody teal & orange highlights, and high-dynamic range environments.',
  },
  {
    name: 'Adobe Premiere Motion Graphics (MOGRT) Templates Pack',
    category: 'Softwares',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=500&q=80',
    downloadUrl: 'https://get.adobe.com/premierepro/',
    description: 'Dynamic typography elements, intros, social media lower thirds, and callout graphics that you can drag and drop directly onto your timeline.',
  },
  {
    name: '4K Cinematic Drone Overlays & Real Light Leaks',
    category: 'Videos',
    imageUrl: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=500&q=80',
    downloadUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    description: 'Raw high-quality optical overlays including natural sun flares, anamorphic light streaks, and micro-dust structures for video editing.',
  },
  {
    name: 'VHS Vintage Glitch Textures & Lo-Fi Noise Loop',
    category: 'Videos',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=500&q=80',
    downloadUrl: 'https://www.w3schools.com/html/movie.mp4',
    description: 'Analog videotape static transitions, tracking lines, and retro color distortions to overlay over secondary videos for a true nostalgia aesthetic.',
  },
  {
    name: 'Moody Neo-Cyberpunk LUT Visual Map Reference',
    category: 'Images',
    imageUrl: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=500&q=80',
    downloadUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
    description: 'High-definition styleboards framing night city palettes, neon balance keys, and color harmony schemes for your cinematic pre-production.',
  },
  {
    name: 'Studio Portrait High-Res Key Lightmaps Pack',
    category: 'Images',
    imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=500&q=80',
    downloadUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80',
    description: 'Specially shot shadow filters (gobos) and clean lightmap PNG textures to simulate complex window and blind lighting in digital environments.',
  },
  {
    name: 'Epic Orchestral Hope & Triumph Cinematic Theme',
    category: 'Music',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
    downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    description: 'Sweeping strings, massive acoustic percussion, and heroic brass progressions ideal for video intros, trailer soundtracks, and climax scenes.',
  },
  {
    name: 'Moody Lo-Fi Cyber Ambient Synth background track',
    category: 'Music',
    imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=500&q=80',
    downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    description: 'Slow-tempo hardware synthesizer oscillations and hypnotic electric beats designed for background loops, coding, or modern talk vlogs.',
  },
  {
    name: 'Subtle Cinematic Rise & Transition Swooshes (Stereo)',
    category: 'Sound Effects',
    imageUrl: 'https://images.unsplash.com/photo-1484755560693-a4074577af3a?auto=format&fit=crop&w=500&q=80',
    downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    description: 'Rich low frequency impacts, atmospheric tension risers, and quick panning wind transitions to emphasize sudden scene changes.',
  },
  {
    name: 'Futuristic UI Audio Feedback & Cybernetic Clicks',
    category: 'Sound Effects',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
    downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    description: 'High-pitch telemetry tick, synthetic cursor sound effects, error chimes, and server buzz triggers for app editors or modern tech montages.',
  }
];

export default function Downloadables() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [downloadables, setDownloadables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Softwares');
  const [showLockModal, setShowLockModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [selectedInstallItem, setSelectedInstallItem] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [config, setConfig] = useState<any>(null);

  const categories = ['Softwares', 'Videos', 'Images', 'Music', 'Sound Effects'];

  // Fetch website configuration for coming soon flags
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'config', 'settings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data());
        }
      } catch (err) {
        console.error('Error fetching settings config:', err);
      }
    };
    fetchConfig();
  }, []);

  const isCategoryComingSoon = (category: string) => {
    if (!config) return true; // Default to true if config hasn't loaded yet
    switch (category) {
      case 'Softwares':
        return config.isSoftwaresComingSoon !== false;
      case 'Videos':
        return config.isVideosComingSoon !== false;
      case 'Images':
        return config.isImagesComingSoon !== false;
      case 'Music':
        return config.isMusicComingSoon !== false;
      case 'Sound Effects':
        return config.isSoundEffectsComingSoon !== false;
      default:
        return false;
    }
  };

  const getComingSoonText = (category: string) => {
    if (!config) {
      return 'Prepare yourself for premium industry-standard content. Releases are being compiled!';
    }
    switch (category) {
      case 'Softwares':
        return config.softwaresComingSoonText || 'Software resources are coming soon.';
      case 'Videos':
        return config.videosComingSoonText || 'Video overlays are coming soon.';
      case 'Images':
        return config.imagesComingSoonText || 'Image assets are coming soon.';
      case 'Music':
        return config.musicComingSoonText || 'Music collections are coming soon.';
      case 'Sound Effects':
        return config.soundEffectsComingSoonText || 'Sound effects are coming soon.';
      default:
        return 'Coming soon...';
    }
  };

  // Fetch downloadables
  useEffect(() => {
    const fetchDownloadables = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'downloadables'));
        let list = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (list.length === 0) {
          console.log('No downloads found. Auto-seeding premium items...');
          for (let i = 0; i < DEFAULT_DOWNLOADABLES.length; i++) {
            const item = DEFAULT_DOWNLOADABLES[i];
            await addDoc(collection(db, 'downloadables'), {
              ...item,
              order: i + 1,
              createdAt: new Date().toISOString()
            });
          }
          const seededSnapshot = await getDocs(collection(db, 'downloadables'));
          list = seededSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        }

        // Sort downloadables by order ascending
        list.sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0));

        setDownloadables(list);
      } catch (err: any) {
        console.error('Downloadables load failed:', err);
        handleFirestoreError(err, OperationType.LIST, 'downloadables');
      } finally {
        setLoading(false);
      }
    };

    fetchDownloadables();
  }, []);

  // Check enrollment/plan access
  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      // 1. Admin always has full access
      if (userProfile?.role === 'admin') {
        setHasAccess(true);
        setCheckingAccess(false);
        return;
      }

      // 2. Active subscription plans DO NOT grant access anymore as per client requests.
      // Access is granted strictly by enrolling/purchasing courses.

      // 3. User bought a course check (enrollments collection)
      try {
        const qEnrollments = query(collection(db, 'enrollments'), where('uid', '==', user.uid));
        const enrollSnap = await getDocs(qEnrollments);
        if (!enrollSnap.empty) {
          // Verify that they have an enrollment record representing a course, not a plan bundle
          const hasCourseEnrollment = enrollSnap.docs.some(doc => {
            const data = doc.data();
            return data.format !== 'plan' && data.courseId && !data.courseId.startsWith('plan_');
          });
          setHasAccess(hasCourseEnrollment);
        } else {
          setHasAccess(false);
        }
      } catch (err) {
        console.error('Error verifying enrollments:', err);
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkUserAccess();
  }, [user, userProfile]);

  const handleDownload = async (item: any) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!hasAccess) {
      setShowLockModal(true);
      return;
    }
    
    // Add record of this download chosen by the student
    const CDN_BASE = "https://Websitestorage.b-cdn.net";
    const filePath = item.downloadUrl || "";
    const fullUrl = filePath.startsWith('http://') || filePath.startsWith('https://') 
      ? filePath 
      : `${CDN_BASE}/${filePath}`;

    try {
      const qExist = query(
        collection(db, 'user_downloads'),
        where('uid', '==', user.uid),
        where('downloadableId', '==', item.id)
      );
      const existSnap = await getDocs(qExist);
      if (existSnap.empty) {
        await addDoc(collection(db, 'user_downloads'), {
          uid: user.uid,
          downloadableId: item.id,
          name: item.name,
          category: item.category,
          imageUrl: item.imageUrl || '',
          downloadUrl: fullUrl,
          description: item.description || '',
          savedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to save to user library:', err);
    }

    // Perform actual file download
    const link = document.createElement('a');
    link.href = fullUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const filteredItems = downloadables.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-black pt-36 pb-24 text-white relative">
      {/* Background radial highlight */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[70%] h-[40%] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Header Block */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto mb-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold text-xs uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Premium Asset Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-6">
            DOWNLOADABLES
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Boost your editing projects with professional softwares, overlays, high-fidelity stock presets, royalty-free dynamic music loops, and hand-designed audio effects.
          </p>
        </motion.div>

        {/* Access status header card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto mb-12"
        >
          {checkingAccess ? (
            <div className="glass-surface-dark border p-5 rounded-3xl flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Verifying authorization clearance...</span>
            </div>
          ) : hasAccess ? (
            <div className="bg-gradient-to-r from-purple-950/40 to-emerald-950/40 border border-emerald-500/20 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Full Access Cleared</h3>
                  <p className="text-xs text-gray-400">Thanks for being an active student/subscriber at CUTSCENE. You are permitted to download everything!</p>
                </div>
              </div>
              <div className="px-5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-wider shrink-0">
                Premium Unlocked
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-purple-950/30 to-zinc-950/50 border border-red-500/10 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Asset Catalog Locked</h3>
                  <p className="text-xs text-gray-400">Downloads are available exclusively for students enrolled in any of our courses or active plan subscribers.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/courses')}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-xl text-xs font-bold transition-all text-gray-200"
                >
                  Browse Courses
                </button>
                <button
                  onClick={() => navigate('/plans')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all text-white flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  View Plans
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Filters and Search Bar Container */}
        <div className="max-w-4xl mx-auto mb-12 flex flex-col gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search downloads by name, tools, or descriptors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950/70 border border-purple-900/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40 transition-all shadow-inner"
            />
          </div>

          {/* Subsections Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shrink-0 transition-all border ${
                  activeCategory === cat 
                    ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.35)]' 
                    : 'bg-zinc-950/40 text-gray-400 hover:text-white border-white/5 hover:bg-zinc-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Downloadables Catalog Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-purple-400 font-mono">LOADING DIGITAL VAULT...</span>
          </div>
        ) : isCategoryComingSoon(activeCategory) ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto py-16 px-8 rounded-[2.5rem] bg-zinc-950/70 border border-purple-900/15 text-center relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85%] h-24 bg-purple-600/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-6">
              {getCategoryIcon(activeCategory)}
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-[10px] uppercase tracking-wider mb-4">
              Coming Soon
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight mb-3">
              {activeCategory} Vault
            </h3>
            
            <p className="text-sm text-gray-400 leading-relaxed mb-6 px-4">
              {getComingSoonText(activeCategory)}
            </p>

            <div className="border-t border-purple-900/10 pt-6">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/5">
                Target Stage: Under Assembly
              </span>
            </div>
          </motion.div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
            <FolderOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">No assets match your matching criteria</p>
            <p className="text-xs text-gray-600 mt-1">Try entering another keyword or switching categories</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  key={item.id}
                  className="group transition-all hover:-translate-y-1 relative flex flex-col bg-transparent"
                >
                  {/* Image/Thumbnail Frame (aspect-square + big) */}
                  <div className="aspect-square w-full overflow-hidden bg-zinc-950/80 rounded-[1.5rem] border border-purple-950/20 shadow-lg relative shrink-0 mb-3.5">
                    <img 
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80'} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95 group-hover:brightness-100"
                    />
                  </div>

                  {/* Body Info */}
                  <div className="text-left flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-white mb-3.5 leading-snug group-hover:text-purple-400 transition-colors line-clamp-3">
                        {item.name}
                      </h3>
                    </div>

                    {/* Download & Install controls */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full mt-auto">
                      <button
                        onClick={() => {
                          setSelectedInstallItem(item);
                          setShowInstallModal(true);
                        }}
                        className="w-full py-2 px-3 bg-zinc-900/50 hover:bg-zinc-800 border border-purple-950/25 hover:border-purple-800/30 text-gray-300 hover:text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Guide
                      </button>

                      <button
                        onClick={() => handleDownload(item)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          hasAccess 
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(147,51,234,0.25)]'
                            : 'bg-zinc-900 hover:bg-zinc-805 border border-white/5 text-gray-400'
                        }`}
                      >
                        {hasAccess ? (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-gray-500" />
                            Unlock
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* DETAILED ENROLLMENT LOCK POPUP DIALOG */}
      <AnimatePresence>
        {showLockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer" 
              onClick={() => setShowLockModal(false)}
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl overflow-hidden text-center z-10"
            >
              {/* Top ambient highlight */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-24 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

              <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-6">
                <Lock className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                Premium Key Required
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                To download premium files, softwares, sound libraries, and video assets, you must purchase an academy course or pay for an active membership package first!
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLockModal(false);
                    navigate('/plans');
                  }}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all focus:outline-none flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(147,51,234,0.4)]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  View Premium Plans
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLockModal(false);
                    navigate('/courses');
                  }}
                  className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-gray-300 font-bold text-sm transition-all"
                >
                  Browse Academy Courses
                </button>
                <button
                  type="button"
                  onClick={() => setShowLockModal(false)}
                  className="w-full text-xs text-gray-500 hover:text-gray-400 mt-2 font-semibold"
                >
                  Close & Browse Content Only
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HOW TO INSTALL GUIDE MODAL */}
      <AnimatePresence>
        {showInstallModal && selectedInstallItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer" 
              onClick={() => {
                setShowInstallModal(false);
                setSelectedInstallItem(null);
              }}
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10"
            >
              {/* Top glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-24 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-4 mb-6 border-b border-purple-950/30 pb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-900/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Play className="w-5 h-5 fill-purple-400" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">{selectedInstallItem.category} Guide</span>
                  <h3 className="text-lg font-black text-white tracking-tight leading-none mt-1">
                    Install: {selectedInstallItem.name}
                  </h3>
                </div>
              </div>

              {/* Video Player Section */}
              {selectedInstallItem.guideVideoUrl ? (
                <div className="mb-6">
                  {(() => {
                    const url = selectedInstallItem.guideVideoUrl;
                    const isEmbed = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.includes('iframe') || url.includes('embed') || url.includes('player.bunny.net');

                    if (isEmbed) {
                      let embedUrl = url;
                      if (url.includes('youtube.com/watch?v=')) {
                        embedUrl = url.replace('youtube.com/watch?v=', 'youtube.com/embed/');
                      } else if (url.includes('youtu.be/')) {
                        embedUrl = `https://www.youtube.com/embed/${url.split('youtu.be/')[1]}`;
                      }
                      return (
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-purple-900/20 shadow-lg bg-black">
                          <iframe
                            src={embedUrl}
                            className="absolute inset-x-0 inset-y-0 w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Guide Player"
                          />
                        </div>
                      );
                    }

                    return (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-purple-900/20 shadow-lg bg-black">
                        <video
                          src={url}
                          controls
                          className="w-full h-full object-contain"
                          poster={selectedInstallItem.imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80"}
                        />
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="mb-6 p-4 rounded-2xl bg-black border border-purple-900/10 text-left flex items-start gap-3">
                  <Play className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Guide Walkthrough Stream</span>
                    <p className="text-xs text-gray-500 leading-snug">No guide video has been configured for this premium asset yet.</p>
                  </div>
                </div>
              )}

              {/* Guide Contents */}
              <div className="text-left text-sm text-gray-300 space-y-4 mb-6 scrollbar-thin">
                <div>
                  <p className="text-xs text-gray-400 mb-4 font-medium">Follow these straightforward deployment steps to use this asset in your active projects:</p>
                  
                  {selectedInstallItem.category === 'Softwares' && (
                    <ul className="space-y-3">
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">1</span>
                        <span>Click the <strong className="text-white font-black">Download</strong> button and wait for the installer package to complete downloading on your local file system.</span>
                      </li>
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">2</span>
                        <span>Mount the package installer. If on MacOS, open the DMG. If on Windows, execute the system executable (.exe) wizard.</span>
                      </li>
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">3</span>
                        <span>Authorize system privileges when prompted, select standard plugins directories, and complete setup directives.</span>
                      </li>
                    </ul>
                  )}

                  {selectedInstallItem.category === 'Videos' && (
                    <ul className="space-y-3">
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">1</span>
                        <span>Download the cinematic dynamic templates overlay or matte pack.</span>
                      </li>
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">2</span>
                        <span>Import the raw cinematic overlays directly into your choice editor program (Premiere Pro, Resolve, or After Effects).</span>
                      </li>
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">3</span>
                        <span>Assign track layout blend filters to <strong className="text-white">Screen</strong> or <strong className="text-white">Linear Dodge (Add)</strong> to naturally clear deep canvas blacks.</span>
                      </li>
                    </ul>
                  )}

                  {selectedInstallItem.category === 'Images' && (
                    <ul className="space-y-3">
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">1</span>
                        <span>Download high fidelity photorealistic backdrop, alphamaps, or matte layers.</span>
                      </li>
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">2</span>
                        <span>Drop the texture or model layers seamlessly into target active software timelines like Photoshop, Figma, or Blender.</span>
                      </li>
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">3</span>
                        <span>Perform scale or adjustment layer filters matching your customized production render dimensions.</span>
                      </li>
                    </ul>
                  )}

                  {selectedInstallItem.category === 'Music' && (
                    <ul className="space-y-3">
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">1</span>
                        <span>Download lossless and studio-optimized lofi beats or stem collections.</span>
                      </li>
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">2</span>
                        <span>Integrate raw waves or audio presets onto empty DAW sample tracks or audio tracks (Ableton, FL Studio, Logic).</span>
                      </li>
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">3</span>
                        <span>Set active project session BPM values matching details inside file details metadata.</span>
                      </li>
                    </ul>
                  )}

                  {selectedInstallItem.category === 'Sound Effects' && (
                    <ul className="space-y-3">
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">1</span>
                        <span>Download individual click triggers, swoop sfx, impact textures, or acoustic chimes.</span>
                      </li>
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">2</span>
                        <span>Arrange individual SFX files directly on action triggers or clip nodes inside sound maps in Audition, Premiere, or DAWs.</span>
                      </li>
                      <li className="flex gap-3 text-xs leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-[10px]">3</span>
                        <span>Fine-tune decay patterns and master outputs matching atmosphere expectations in cinematic or UI frameworks.</span>
                      </li>
                    </ul>
                  )}

                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowInstallModal(false);
                  setSelectedInstallItem(null);
                }}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-805 border border-white/5 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Close Guide
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
