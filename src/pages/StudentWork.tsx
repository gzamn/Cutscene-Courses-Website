import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Filter, Image as ImageIcon, Video, Plus, Award, BookOpen, 
  Sparkles, Check, Loader2, X, AlertCircle, Bookmark, ExternalLink, Play, Film
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  db, 
  collection, 
  getDocs 
} from '../firebase';
import { CreateReelModal } from '../components/CreateReelModal';

interface StudentWorkItem {
  id: string;
  student_id: string;
  student_name: string;
  student_avatar: string;
  course_id: string;
  course_name?: string;
  chapter_position: number;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  tag?: string;
  submitted_at: any;
  is_featured: boolean;
  studentName?: string;
  thumbnail?: string;
  courseId?: string;
  courseTitle?: string;
}

interface CourseItem {
  id: string;
  title: string;
  category?: string;
}

export default function StudentWork() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [works, setWorks] = useState<StudentWorkItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  // New streamlined Reel / Showcase submit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Video Player Modal State
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  // Fetch all works and courses
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Courses for filter mapping & options
      const coursesSnap = await getDocs(collection(db, 'courses'));
      const coursesList = coursesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CourseItem[];
      setCourses(coursesList);

      // Fetch student works
      const worksSnap = await getDocs(collection(db, 'student_works'));
      const worksList = worksSnap.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            student_id: data.student_id || data.studentId || '',
            student_name: data.student_name || data.studentName || 'Anonymous Student',
            student_avatar: data.student_avatar || data.studentAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            course_id: data.course_id || data.courseId || '',
            course_name: data.course_name || data.courseTitle || '',
            chapter_position: data.chapter_position !== undefined ? Number(data.chapter_position) : 1,
            title: data.title || (data.courseTitle ? `Assignment for ${data.courseTitle}` : 'Showcase Reel'),
            description: data.description || 'Creative project rendered by our student community.',
            image_url: data.image_url || data.thumbnail || '',
            video_url: data.video_url || '',
            tag: data.tag || '🎬 Reel',
            submitted_at: data.submitted_at || null,
            is_featured: !!data.is_featured,
            approved: data.approved !== undefined ? data.approved : (data.status === 'approved' ? true : false),
            status: data.status || 'pending'
          } as any;
        })
        .filter(w => w.approved === true || w.status === 'approved');

      // Sort: Featured first, then by submission or id
      worksList.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return 0;
      });

      setWorks(worksList);
    } catch (err: any) {
      console.error('Failed fetching showcases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter works by course ID
  const filteredWorks = selectedCourseFilter === 'all'
    ? works
    : works.filter(w => w.course_id === selectedCourseFilter);

  // Helper to check if URL is a direct video (BunnyCDN, MP4, WebM, MOV)
  const isDirectVideoFile = (url: string) => {
    if (!url) return false;
    const clean = url.toLowerCase().split('?')[0];
    return (
      clean.endsWith('.mp4') ||
      clean.endsWith('.mov') ||
      clean.endsWith('.webm') ||
      clean.endsWith('.mkv') ||
      url.includes('b-cdn.net')
    );
  };

  // Helper convert standard YouTube watch URL to embed link
  const getEmbedVideoUrl = (url: string) => {
    if (!url) return '';
    try {
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      if (url.includes('v=')) {
        const id = url.split('v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      if (url.includes('drive.google.com/file/d/')) {
        const parts = url.split('drive.google.com/file/d/');
        if (parts[1]) {
          const fileId = parts[1].split('/')[0];
          return `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }
      if (url.includes('drive.google.com/open?id=')) {
        const parts = url.split('drive.google.com/open?id=');
        if (parts[1]) {
          const fileId = parts[1].split('&')[0];
          return `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }
      if (url.includes('embed/')) {
        return url;
      }
      return url;
    } catch {
      return url;
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-7xl mx-auto">
        
        {/* HERO TITLE GRID */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/20 text-xs font-semibold text-purple-300 tracking-wide uppercase mb-4 shadow-sm animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Empowering Transformations
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white mb-6 animate-fade-in text-balance">
            {t('studentsWork.title')}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg font-light leading-relaxed mb-8">
            {t('studentsWork.subtitle')} Watch high-energy reels, color grades, sound design, and creative student projects.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {user ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg shadow-purple-600/25 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Film className="w-4 h-4" />
                <span>Post Your Reel</span>
              </button>
            ) : (
              <p className="text-xs text-gray-500 bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl">
                🔒 Logged in creators can upload and showcase their video reels directly.
              </p>
            )}
          </div>
        </div>

        {/* CONTROLS FILTERS */}
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-purple-950/40 pb-8 mb-12 gap-6">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Filter By Program:</span>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedCourseFilter('all')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                selectedCourseFilter === 'all'
                  ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/25'
                  : 'bg-zinc-950 border-purple-950/40 text-gray-400 hover:text-white hover:border-purple-800'
              }`}
            >
              All Reels & Projects
            </button>
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => setSelectedCourseFilter(course.id)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                  selectedCourseFilter === course.id
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/25'
                    : 'bg-zinc-950 border-purple-950/40 text-gray-400 hover:text-white hover:border-purple-800'
                }`}
              >
                {course.title}
              </button>
            ))}
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            <span className="text-sm font-light text-gray-500">Retrieving student video showcases...</span>
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-purple-950/30 rounded-3xl max-w-md mx-auto space-y-4">
            <Award className="w-12 h-12 text-gray-600 mx-auto opacity-50" />
            <div>
              <p className="text-gray-300 font-bold mb-1">No reels found in this selection</p>
              <p className="text-xs text-gray-500 px-6 leading-relaxed">
                Be the first to upload your video edit and showcase your talent to the academy!
              </p>
            </div>
            {user && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 cursor-pointer"
              >
                + Upload Reel Now
              </button>
            )}
          </div>
        ) : (
          /* GALLERY GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredWorks.map((work) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`group relative flex flex-col bg-zinc-950 border rounded-3xl overflow-hidden transition-all shadow-xl hover:shadow-purple-900/10 ${
                  work.is_featured 
                    ? 'border-purple-600/50 shadow-purple-600/10' 
                    : 'border-purple-950/30 hover:border-purple-700/40'
                }`}
              >
                {/* Visual Thumbnail / Reel Banner */}
                <div className="aspect-[16/10] w-full bg-zinc-900 relative overflow-hidden group">
                  <img
                    src={work.image_url || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=600'}
                    alt={work.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlays/Badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-65" />

                  <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                    {work.is_featured && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg border border-amber-400/20 animate-pulse">
                        <Award className="w-3 h-3" />
                        Featured
                      </span>
                    )}
                    <span className="px-2.5 py-1 bg-black/75 border border-white/5 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      {work.tag || '🎬 Reel'}
                    </span>
                  </div>

                  {/* Play Trigger */}
                  {work.video_url ? (
                    <button
                      type="button"
                      onClick={() => setActiveVideoUrl(work.video_url || '')}
                      className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all cursor-pointer group-hover:scale-110 duration-300"
                    >
                      <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm border border-purple-400/40">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </button>
                  ) : (
                    <div className="absolute bottom-4 right-4 text-white/50 bg-black/65 backdrop-blur-md p-2 rounded-xl border border-white/5">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Content & Student */}
                <div className="p-6 flex flex-col flex-grow justify-between">
                  <div>
                    <div className="text-[10px] text-purple-400 font-mono font-bold uppercase tracking-widest mb-1 shadow-sm">
                      {work.course_name || 'Creator Showcase'}
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors mb-2 line-clamp-1">
                      {work.title}
                    </h3>
                    <p className="text-gray-400 text-xs font-light leading-relaxed mb-6 line-clamp-3">
                      {work.description}
                    </p>
                  </div>

                  {/* Student Signature footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-purple-950/30">
                    <div className="flex items-center gap-3">
                      <img
                        src={work.student_avatar}
                        alt={work.student_name}
                        className="w-9 h-9 object-cover rounded-full border-2 border-purple-900 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">{work.student_name}</div>
                        <div className="text-[10px] text-gray-500 font-light">Verified Creator</div>
                      </div>
                    </div>

                    {work.video_url && (
                      <button
                        type="button"
                        onClick={() => setActiveVideoUrl(work.video_url || '')}
                        className="p-2 hover:bg-purple-900/20 text-purple-400 hover:text-purple-300 rounded-xl transition-all inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
                      >
                        <span>Watch</span>
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    )}
                  </div>
                </div>

              </motion.div>
            ))}
          </div>
        )}

        {/* STREAMLINED REEL CREATION MODAL */}
        <CreateReelModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchData();
          }}
          courses={courses}
        />

        {/* LIGHTBOX / DIRECT BUNNY VIDEO & EMBED PLAYER */}
        <AnimatePresence>
          {activeVideoUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <div 
                className="fixed inset-0 bg-black/95 backdrop-blur-md cursor-pointer" 
                onClick={() => setActiveVideoUrl(null)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-zinc-950 border border-purple-900/40 rounded-3xl w-full max-w-4xl aspect-video shadow-2xl overflow-hidden z-10"
              >
                <button
                  type="button"
                  onClick={() => setActiveVideoUrl(null)}
                  className="absolute top-4 right-4 z-20 p-2.5 bg-black/70 rounded-full hover:bg-black/95 text-gray-300 hover:text-white transition-colors cursor-pointer border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>

                {isDirectVideoFile(activeVideoUrl) ? (
                  <video
                    src={activeVideoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <iframe
                    src={getEmbedVideoUrl(activeVideoUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Academy Video Showcase Player"
                  />
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
