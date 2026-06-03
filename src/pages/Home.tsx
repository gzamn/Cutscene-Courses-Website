import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Star, Users, BookOpen, ShieldCheck, Clock, Play, Video, X, Lock, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import { db, collection, getDocs, ensureDefaultStudentWorksSeeded, ensureDefaultHeroVideosSeeded } from '../firebase';

export default function Home() {
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<any[]>([]);
  const [studentWorks, setStudentWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [heroVideoUrl, setHeroVideoUrl] = useState<string>('https://player.mediadelivery.net/embed/674907/2c8123ea-b758-4743-8e78-50f577c890a1?autoplay=true&loop=true&muted=true&preload=true&responsive=true');

  const [wordIdx, setWordIdx] = useState(0);
  const animatedWords = [
    { en: 'video editing', fr: 'montage vidéo', ar: 'مونتاج فيديو' },
    { en: 'graphic design', fr: 'design graphique', ar: 'تصميم جرافيك' },
    { en: 'motion design', fr: 'motion design', ar: 'موشن ديزاين' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIdx((prev) => (prev + 1) % animatedWords.length);
    }, 2500); // 1.5s transition + 1.0s hold duration = 2.5s total per index step
    return () => clearInterval(interval);
  }, [animatedWords.length]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Fetch courses
        const snap = await getDocs(collection(db, 'courses'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, 3);
        setCourses(list);

        // Fetch hero background video
        try {
          let heroSnap = await getDocs(collection(db, 'hero_videos'));
          if (heroSnap.empty) {
            await ensureDefaultHeroVideosSeeded();
            heroSnap = await getDocs(collection(db, 'hero_videos'));
          }
          let heroList = heroSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          
          // Let's check if the old mixkit video is still marked as active, or if hero_videos is outdated.
          // We upgrade the database's hero1 record to the requested mediadelivery iframe video.
          const oldHero1 = heroList.find(h => h.id === 'hero1');
          if (oldHero1 && oldHero1.videoUrl && oldHero1.videoUrl.includes('mixkit.co')) {
            console.log("Upgrading database hero1 document to the requested mediadelivery player link...");
            const { doc, setDoc } = await import('../firebase');
            await setDoc(doc(db, 'hero_videos', 'hero1'), {
              title: 'CUTSCENE Academy Intro Video',
              videoUrl: 'https://player.mediadelivery.net/embed/674907/2c8123ea-b758-4743-8e78-50f577c890a1?autoplay=true&loop=true&muted=true&preload=true&responsive=true',
              isActive: true,
              createdAt: new Date().toISOString()
            }, { merge: true });
            // Re-fetch list
            heroSnap = await getDocs(collection(db, 'hero_videos'));
            heroList = heroSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          }

          const activeHero = heroList.find(h => h.isActive) || heroList[0];
          if (activeHero && activeHero.videoUrl) {
            setHeroVideoUrl(activeHero.videoUrl);
          }
        } catch (heroErr) {
          console.warn("Could not load hero video config from Firestore:", heroErr);
        }

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

  const getHeroIframeSrc = (url: string) => {
    const embedUrl = getEmbedVideoUrl(url);
    if (!embedUrl) return '';
    if (embedUrl.includes('player.mediadelivery.net')) {
      let finalUrl = embedUrl;
      // Force autoplay to false, and muted to false (case-insensitive and support digits)
      finalUrl = finalUrl
        .replace(/autoplay=true/i, 'autoplay=false')
        .replace(/autoplay=1/i, 'autoplay=0')
        .replace(/muted=true/i, 'muted=false')
        .replace(/muted=1/i, 'muted=0');
      if (!finalUrl.toLowerCase().includes('autoplay=')) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'autoplay=false';
      }
      if (!finalUrl.toLowerCase().includes('muted=')) {
        finalUrl += '&muted=false';
      }
      return finalUrl;
    }
    if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
      const videoId = embedUrl.includes('embed/') ? embedUrl.split('embed/')[1]?.split('?')[0] : '';
      const separator = embedUrl.includes('?') ? '&' : '?';
      return `${embedUrl}${separator}autoplay=0&mute=0&controls=1&loop=1&playlist=${videoId}&rel=0`;
    }
    return embedUrl;
  };

  const isDirectVideo = (url: string) => {
    if (!url) return true;
    const lower = url.toLowerCase();
    return (
      lower.includes('.mp4') || 
      lower.includes('.webm') || 
      lower.includes('.ogg') || 
      lower.includes('vjs.zencdn.net') || 
      lower.includes('mixkit.co')
    ) && (
      !lower.includes('player.mediadelivery.net') &&
      !lower.includes('youtube.com') && 
      !lower.includes('youtu.be') && 
      !lower.includes('drive.google.com') && 
      !lower.includes('vimeo.com')
    );
  };

  return (
    <div className="bg-black text-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-12 overflow-hidden w-full">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        </div>
 
        {/* Centered Video Container. Made interactive so users can control play, pause, fullscreen, and volume */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full mb-8 flex flex-col items-center">
          <div className="relative aspect-video overflow-hidden group bg-zinc-950 rounded-2xl md:rounded-[2rem] border border-purple-500/10 shadow-[0_10px_40px_rgba(147,51,234,0.15)] w-full">
            
            {isDirectVideo(heroVideoUrl) ? (
              <video
                key={heroVideoUrl}
                className="w-full h-full object-cover"
                controls
                loop
                playsInline
              >
                <source src={heroVideoUrl} type="video/mp4" />
                {/* Fallback sources */}
                <source src="https://assets.mixkit.co/videos/preview/mixkit-cinematic-intro-of-a-video-editor-at-work-43750-large.mp4" type="video/mp4" />
                <source src="https://vjs.zencdn.net/v/oceans.mp4" type="video/mp4" />
              </video>
            ) : (
              <iframe
                key={heroVideoUrl}
                title="Hero Background Video"
                className="w-full h-full absolute inset-0 border-0 z-0"
                src={getHeroIframeSrc(heroVideoUrl)}
                allow="encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            )}

            {/* Subtle overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/35 pointer-events-none" />
          </div>

          {/* Website title text placed directly under the video with consistent spacing and glowing shadow */}
          <div className="mt-8 text-center z-10 w-full animate-fade-in">
            <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl px-8 py-5 rounded-3xl border border-white/[0.12] inline-block mx-auto max-w-[95%] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.5),0_12px_40px_rgba(147,51,234,0.22)]">
              {/* Highlight flare effect at the top */}
              <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-purple-400/55 to-transparent opacity-75 pointer-events-none" />
              
              {language === 'ar' ? (
                <h1 className="text-xs xs:text-sm sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight leading-normal flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-2 text-center">
                  <span className="text-white">حاب تتعلم</span>
                  <span className="text-purple-400 font-black inline-flex relative overflow-hidden h-[1.25em] items-center justify-start w-[140px] xs:w-[160px] sm:w-[210px] md:w-[260px] lg:w-[310px]">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={wordIdx}
                        initial={{ y: '80%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '-80%', opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                        className="whitespace-nowrap inline-block uppercase"
                      >
                        {animatedWords[wordIdx].ar}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="text-white">؟ Cutscene هنا!</span>
                </h1>
              ) : language === 'fr' ? (
                <h1 className="text-xs xs:text-sm sm:text-lg md:text-xl lg:text-2.5xl xl:text-3xl font-extrabold tracking-tight leading-normal flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-2 text-center">
                  <span className="text-white">Vous voulez apprendre</span>
                  <span className="text-purple-400 font-black inline-flex relative overflow-hidden h-[1.25em] items-center justify-start w-[170px] xs:w-[200px] sm:w-[260px] md:w-[330px] lg:w-[410px]">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={wordIdx}
                        initial={{ y: '80%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '-80%', opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                        className="whitespace-nowrap inline-block uppercase"
                      >
                        {animatedWords[wordIdx].fr}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="text-white">? CUTSCENE est là !</span>
                </h1>
              ) : (
                <h1 className="text-xs xs:text-sm sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight leading-normal flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-2 text-center">
                  <span className="text-white">Want to learn</span>
                  <span className="text-purple-400 font-black inline-flex relative overflow-hidden h-[1.25em] items-center justify-start w-[150px] xs:w-[175px] sm:w-[220px] md:w-[285px] lg:w-[350px]">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={wordIdx}
                        initial={{ y: '80%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '-80%', opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                        className="whitespace-nowrap inline-block uppercase"
                      >
                        {animatedWords[wordIdx].en}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="text-white">? CUTSCENE is here!</span>
                </h1>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full animate-fade-in">
          
          {/* Description follows on rest of the page */}
          <div className="max-w-4xl mx-auto text-center mt-12 mb-6 px-4">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-10 w-full sm:w-auto"
            >
              <Link 
                to="/courses" 
                className="w-full sm:w-auto px-10 py-5 bg-brand-radial hover:scale-105 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 group shadow-2xl shadow-purple-600/40 cursor-pointer"
              >
                {t('hero.explore')}
                <ArrowRight className={`w-6 h-6 group-hover:translate-x-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
              </Link>
              <button 
                onClick={scrollToStudentsWork}
                className="w-full sm:w-auto px-10 py-5 glass-surface hover:bg-white/10 text-white rounded-2xl font-bold text-lg transition-all cursor-pointer"
              >
                {t('hero.studentsWork')}
              </button>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-16 sm:mt-24 border border-white/5 rounded-[2rem] overflow-hidden glass-surface-dark"
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
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center shrink-0">
                      <Video className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold">{category.courseTitle}</h3>
                  </div>
                  <div className="flex-grow h-px bg-purple-900/20" />
                  <Link
                    to="/student-work"
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-purple-400 hover:text-purple-300 font-bold text-xs sm:text-sm rounded-xl transition-all whitespace-nowrap cursor-pointer group shrink-0"
                  >
                    <span>See All</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
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
