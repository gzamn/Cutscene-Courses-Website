import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Star, Users, BookOpen, ShieldCheck, Clock, Play, Video, X, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import { db, collection, getDocs, ensureDefaultStudentWorksSeeded } from '../firebase';

export default function Home() {
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<any[]>([]);
  const [studentWorks, setStudentWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Fetch courses
        const snap = await getDocs(collection(db, 'courses'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, 3);
        setCourses(list);

        // Fetch student works
        let worksSnap = await getDocs(collection(db, 'student_works'));
        if (worksSnap.empty) {
          await ensureDefaultStudentWorksSeeded();
          worksSnap = await getDocs(collection(db, 'student_works'));
        }
        const worksList = worksSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(w => w.approved === true || w.status === 'approved');
        const groups: { [key: string]: any } = {};
        worksList.forEach((w: any) => {
          const cId = w.course_id || w.courseId || 'unknown';
          const cTitle = w.course_name || w.courseTitle || 'Other';
          if (!groups[cId]) {
            groups[cId] = {
              courseId: cId,
              courseTitle: cTitle,
              works: []
            };
          }
          const sName = w.student_name || w.studentName || 'Anonymous Student';
          const sAvatar = w.student_avatar || w.studentAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${sName}&backgroundColor=9333ea`;
          groups[cId].works.push({
            id: w.id,
            studentName: sName,
            studentAvatar: sAvatar,
            thumbnail: w.image_url || w.thumbnail || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=400',
            videoUrl: w.video_url || w.url || ''
          });
        });
        setStudentWorks(Object.values(groups));
      } catch (err) {
        console.error("Error loading homepage data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const scrollToStudentsWork = () => {
    const element = document.getElementById('students-work');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const getEmbedVideoUrl = (url: string) => {
    if (!url) return '';
    try {
      // Check for youtu.be links
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      // Check for watch?v=
      if (url.includes('v=')) {
        const id = url.split('v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      // Check Google Drive
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
      // Check for embed links already
      if (url.includes('embed/')) {
        return url;
      }
      return url;
    } catch {
      return url;
    }
  };

  return (
    <div className="bg-black text-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full animate-fade-in">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full text-center flex flex-col items-center pt-8"
            >
              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter uppercase">
                {language === 'ar' ? (
                  <>
                    حاب تتعلم <br />
                    <span className="text-white">مونتاج</span>؟ <br />
                    <span className="text-brand-gradient">Cutscene هـنـا!</span>
                  </>
                ) : (
                  <>
                    {t('hero.title1')} <br />
                    <span className="text-white">{t('hero.title2')}</span>? <br />
                    <span className="text-brand-gradient">{language === 'fr' ? 'Cutscene est ICI !' : 'Cutscene is HERE'}</span>
                  </>
                )}
              </h1>
              
              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
                {t('hero.subtitle')}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto">
                <Link 
                  to="/courses" 
                  className="w-full sm:w-auto px-10 py-5 bg-brand-radial hover:scale-105 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 group shadow-2xl shadow-purple-600/40"
                >
                  {t('hero.explore')}
                  <ArrowRight className={`w-6 h-6 group-hover:translate-x-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
                </Link>
                <button 
                  onClick={scrollToStudentsWork}
                  className="w-full sm:w-auto px-10 py-5 glass-surface hover:bg-white/10 text-white rounded-2xl font-bold text-lg transition-all"
                >
                  {t('hero.studentsWork')}
                </button>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-32 border border-white/5 rounded-[2rem] overflow-hidden glass-surface-dark"
          >
            {[
              { label: t('stats.students'), value: '330+', icon: Users },
              { label: t('stats.courses'), value: '3+', icon: BookOpen },
              { label: t('stats.workshops'), value: '40+', icon: Star },
              { label: t('stats.certified'), value: '100%', icon: ShieldCheck },
            ].map((stat, i) => (
              <div key={i} className={`p-10 text-center border-white/5 ${i !== 3 ? 'md:border-r' : ''} ${i % 2 === 0 ? 'border-r md:border-r-0' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} hover:bg-white/5 transition-colors group`}>
                <div className="flex justify-center mb-4">
                  <stat.icon className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-4xl font-black mb-2 tracking-tighter">{stat.value}</div>
                <div className="text-micro text-gray-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Courses Preview */}
      <section className="py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('courses.title')}</h2>
              <p className="text-gray-400">{t('courses.subtitle')}</p>
            </div>
            <Link to="/courses" className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1">
              {t('courses.seeAll')} <ArrowRight className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-3 flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : courses.length === 0 ? (
              <div className="col-span-3 text-center py-10 bg-zinc-900/30 rounded-2xl border border-dashed border-purple-900/20 max-w-4xl mx-auto w-full">
                <p className="text-gray-400">No courses available yet</p>
              </div>
            ) : (
              courses.map((course) => (
                <motion.div 
                  key={course.id}
                  whileHover={{ y: -10 }}
                  className="bg-black border border-purple-900/20 rounded-2xl overflow-hidden group"
                >
                  {course.isComingSoon ? (
                    <div className="relative h-48 overflow-hidden block">
                      <img 
                        src={course.image} 
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                        <div className="w-12 h-12 bg-black/60 border border-purple-500/30 rounded-full flex items-center justify-center shadow-2xl">
                          <Lock className="w-6 h-6 text-purple-400" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link to={`/courses/${course.id}`} className="relative h-48 overflow-hidden block">
                      <img 
                        src={course.image} 
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider backdrop-blur-md ${
                          (course.level || '').toLowerCase() === 'beginner' 
                            ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                            : (course.level || '').toLowerCase() === 'advanced'
                            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                            : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                        }`}>
                          {course.level}
                        </span>
                        {course.duration && (
                          <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-bold rounded-full flex items-center gap-1.5 border border-white/5">
                            <Clock className="w-3 h-3 text-purple-400" /> {course.duration}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}
                  <div className="p-6">
                    {course.isComingSoon ? (
                      <h3 className="text-xl font-bold mb-2 text-zinc-400 transition-colors">{course.title}</h3>
                    ) : (
                      <Link to={`/courses/${course.id}`}>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">{course.title}</h3>
                      </Link>
                    )}
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                    <div className="flex items-center justify-between">
                      {course.isComingSoon ? (
                        <span className="px-3.5 py-1.5 bg-purple-500/10 text-purple-400 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-purple-500/25 max-w-max select-none shadow-sm flex items-center gap-1.5">
                          <span>🔮</span>
                          <span>{t('course.comingSoon')}</span>
                        </span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-white">
                            {course.price ? `${course.price.toLocaleString()} ${course.currency || 'DA'}` : 'Free'}
                          </span>
                          <div className="flex gap-2">
                            <Link 
                              to={`/courses/${course.id}`}
                              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-purple-900/30 rounded-lg transition-all text-xs font-bold"
                            >
                              {t('courses.details')}
                            </Link>
                            <Link 
                              to={`/payment?courseId=${course.id}`}
                              className="px-4 py-2 bg-brand-radial hover:opacity-90 text-white border border-purple-500/30 rounded-lg transition-all text-sm font-bold shadow-lg shadow-purple-600/10"
                            >
                              {t('courses.getStarted')}
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Students Work Section */}
      <section id="students-work" className="py-24 bg-black relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-900/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('studentsWork.title')}</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              {t('studentsWork.subtitle')}
            </p>
          </div>

          <div className="space-y-20">
            {studentWorks.map((category, idx) => (
              <div key={category.courseId}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center">
                    <Video className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-bold">{category.courseTitle}</h3>
                  <div className="flex-grow h-px bg-purple-900/20 ml-4" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {category.works.map((work: any, i: number) => (
                    <motion.div 
                      key={work.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="group"
                    >
                      <div 
                        onClick={() => work.videoUrl && setActiveVideoUrl(work.videoUrl)}
                        className={`relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-purple-900/20 group-hover:border-purple-500/50 transition-all shadow-xl ${work.videoUrl ? 'cursor-pointer' : ''}`}
                      >
                        <img 
                          src={work.thumbnail} 
                          alt={work.studentName}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {work.videoUrl && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-600/40 transform hover:scale-115 transition-transform duration-300">
                              <Play className="w-6 h-6 text-white fill-current" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/75 to-transparent flex items-center gap-3 z-20">
                          <img
                            src={work.studentAvatar}
                            alt={work.studentName}
                            className="w-8 h-8 rounded-full object-cover border border-purple-500/30 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="text-xs font-bold text-white leading-tight">{work.studentName}</div>
                            <div className="text-[9px] text-purple-300 font-mono tracking-wider uppercase">Verified Scholar</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Overlay Modal */}
      <AnimatePresence>
        {activeVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-[9999] flex-col"
          >
            <div className="relative w-full max-w-4xl aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl">
              <button
                onClick={() => setActiveVideoUrl(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-all border border-white/10 z-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {activeVideoUrl.toLowerCase().endsWith('.mp4') || 
               activeVideoUrl.toLowerCase().endsWith('.webm') || 
               activeVideoUrl.toLowerCase().endsWith('.mov') || 
               activeVideoUrl.toLowerCase().endsWith('.m4v') ? (
                <video
                  src={activeVideoUrl}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                />
              ) : (
                <iframe
                  src={getEmbedVideoUrl(activeVideoUrl)}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video Player"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
