import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Star, Users, BookOpen, ShieldCheck, Clock, Play, Video, X, Lock, Volume2, VolumeX, Compass, Film, Sparkles, Trophy, Award, CheckCircle2, Check, Layers } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SparkleButton, RainbowButton, GlowingCard } from '../components/AnimatedButtons';
import { useState, useEffect } from 'react';
import { db, collection, getDocs, ensureDefaultStudentWorksSeeded, ensureDefaultHeroVideosSeeded, ensureDefaultSpecialOffersSeeded, ensureDefaultStatisticsSeeded } from '../firebase';

export default function Home() {
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [specialOffers, setSpecialOffers] = useState<any[]>([]);
  const [studentWorks, setStudentWorks] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [heroVideoUrl, setHeroVideoUrl] = useState<string>('https://player.mediadelivery.net/embed/674907/2c8123ea-b758-4743-8e78-50f577c890a1?autoplay=true&loop=true&muted=true&preload=true&responsive=true');

  const [continueWatching, setContinueWatching] = useState<any | null>(null);
  const [showContinueWatching, setShowContinueWatching] = useState(false);

  // Auto trigger sliding panel for user resuming custom content
  useEffect(() => {
    try {
      const stored = localStorage.getItem('continue_watching');
      if (stored) {
        const item = JSON.parse(stored);
        if (item && item.courseId && item.currentTime > 5) {
          setContinueWatching(item);
          const timer = setTimeout(() => {
            setShowContinueWatching(true);
          }, 1500);
          return () => clearTimeout(timer);
        }
      }
    } catch (e) {
      console.warn("Failed reading continue_watching local storage", e);
    }
  }, []);

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
        const allList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllCourses(allList);
        const list = allList.slice(0, 3);
        setCourses(list);

        // Fetch statistics
        try {
          let statsSnap = await getDocs(collection(db, 'statistics'));
          if (statsSnap.empty) {
            await ensureDefaultStatisticsSeeded();
            statsSnap = await getDocs(collection(db, 'statistics'));
          }
          const statsList = statsSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() as any }))
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          setStatistics(statsList);
        } catch (statsErr) {
          console.warn("Could not load homepage statistics:", statsErr);
        }

        // Fetch special offers
        let offersSnap = await getDocs(collection(db, 'special_offers'));
        if (offersSnap.empty) {
          await ensureDefaultSpecialOffersSeeded();
          offersSnap = await getDocs(collection(db, 'special_offers'));
        }
        const offersList = offersSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(off => off.active === true);
        setSpecialOffers(offersList);

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
      return `${embedUrl}${separator}autoplay=0&mute=0&controls=1&loop=0&rel=0`;
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
              <RainbowButton 
                to="/courses" 
                className="w-full sm:w-auto text-white rounded-2xl"
              >
                <span className="flex items-center gap-3 font-black text-lg py-1 px-4">
                  {t('hero.explore')}
                  <ArrowRight className={`w-6 h-6 group-hover:translate-x-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
                </span>
              </RainbowButton>
              <SparkleButton 
                onClick={scrollToStudentsWork}
                className="w-full sm:w-auto px-10 py-5 text-white rounded-2xl font-bold text-lg"
              >
                {t('hero.studentsWork')}
              </SparkleButton>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Special Offers Section */}
      {specialOffers && specialOffers.length > 0 && (
        <section className="py-12 relative overflow-hidden bg-black border-y border-purple-900/10">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute -top-[10%] right-[10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[130px] animate-pulse" />
            <div className="absolute -bottom-[10%] left-[5%] w-[350px] h-[350px] bg-purple-950/15 rounded-full blur-[120px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4"
              >
                <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                <span>
                  {language === 'ar' ? 'عروض التوفير الكبرى' : language === 'fr' ? 'Économies Spéciales' : 'Bundle Savings'}
                </span>
              </motion.div>
              
              <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-white">
                {language === 'ar' ? 'باقات التعليم المدمج الحصرية' : language === 'fr' ? 'Offres de Combinaison de Cours' : 'Exclusive Combo Packs'}
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
                {language === 'ar' ? ' وفر أكثر من ٢٥٪ عند اختيار الباقات التعليمية المخصصة. احصل على مراجع كاملة، تقييم مدى الحياة، وشهادة لكل دورة.' : 
                 language === 'fr' ? 'Économisez plus de 25% en associant plusieurs cours. Accès illimité à vie, mentorat complet et certifications incluses.' : 
                 'Save over 25% by choosing our tailored combinations. Get comprehensive masterclasses, lifetime evaluations, and graduate certifications for both courses.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
              {specialOffers.map((offer, index) => {
                const title = language === 'ar' ? (offer.titleAr || offer.titleEn) : language === 'fr' ? (offer.titleFr || offer.titleEn) : offer.titleEn;
                const badge = language === 'ar' ? (offer.badgeAr || offer.badgeEn) : language === 'fr' ? (offer.badgeFr || offer.badgeEn) : offer.badgeEn;
                const savingsPct = Math.round(((offer.originalPrice - offer.price) / (offer.originalPrice || 1)) * 100);

                return (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="h-full"
                  >
                    <GlowingCard className="relative bg-zinc-950/70 border border-purple-900/20 hover:border-purple-500/30 rounded-3xl overflow-hidden flex flex-col h-full transition-all duration-300 group shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-purple-950/10 hover:translate-y-[-4px]">
                      {/* Banner Image - The absolute majority of the design */}
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black shrink-0 border-b border-purple-900/10">
                      <img 
                        src={offer.imageUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800'} 
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Badge overlays */}
                      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                        {badge && (
                          <span className="px-3 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider bg-purple-600 text-white shadow-lg shadow-purple-500/30">
                            {badge}
                          </span>
                        )}
                      </div>

                      <div className="absolute top-4 right-4 z-10">
                        <span className="text-[9px] font-mono font-bold bg-emerald-500 text-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-lg">
                          -{savingsPct}% {language === 'ar' ? 'خصم' : 'OFF'}
                        </span>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-zinc-950/80 to-zinc-950 opacity-90" />
                    </div>

                    {/* Details section */}
                    <div className="p-6 flex flex-col flex-grow justify-between text-left">
                      <div>
                        {/* Name of the bundle */}
                        <h3 className="text-xl font-black tracking-tight text-white mb-2 line-clamp-2 leading-snug group-hover:text-purple-400 transition-colors uppercase">
                          {title}
                        </h3>

                        {/* Price Details */}
                        <div className="flex items-baseline gap-4 mt-6 flex-wrap">
                          <span className="text-sm sm:text-base line-through text-gray-500 font-semibold">
                            {offer.originalPrice?.toLocaleString()} {offer.currency}
                          </span>
                          <span className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                            {offer.price?.toLocaleString()} <span className="text-purple-400 text-xl font-black">{offer.currency}</span>
                          </span>
                        </div>
                      </div>

                      {/* 2 Buttons: Details & Claim Now */}
                      <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-purple-900/10">
                        <SparkleButton
                          onClick={() => setSelectedOffer(offer)}
                          className="px-4 py-3 rounded-xl text-gray-300 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center"
                        >
                          {language === 'ar' ? 'تفاصيل العرض' : language === 'fr' ? 'Détails' : 'Details'}
                        </SparkleButton>

                        <RainbowButton
                          to={`/complete-order?offerId=${offer.id}`}
                          className="px-4 py-3 rounded-xl text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                        >
                          <span>{language === 'ar' ? 'اشترك الآن' : language === 'fr' ? 'S\'inscrire' : 'Claim Now'}</span>
                        </RainbowButton>
                      </div>
                    </div>
                  </GlowingCard>
                </motion.div>
              );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Special Offer Details Modal */}
      <AnimatePresence>
        {selectedOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer" onClick={() => setSelectedOffer(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2rem] p-6 sm:p-8 w-full max-w-lg shadow-2xl z-10 text-left max-h-[85vh] overflow-y-auto font-sans text-white"
            >
              <button 
                type="button"
                onClick={() => setSelectedOffer(null)} 
                className="absolute top-5 right-5 p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white cursor-pointer transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden mb-6 border border-white/5">
                <img 
                  src={selectedOffer.imageUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800'} 
                  alt={language === 'ar' ? (selectedOffer.titleAr || selectedOffer.titleEn) : language === 'fr' ? (selectedOffer.titleFr || selectedOffer.titleEn) : selectedOffer.titleEn}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent flex items-end p-5">
                  <span className="px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider bg-purple-600 text-white shadow-lg">
                    {language === 'ar' ? (selectedOffer.badgeAr || selectedOffer.badgeEn) : language === 'fr' ? (selectedOffer.badgeFr || selectedOffer.badgeEn) : selectedOffer.badgeEn || 'Combo Saver'}
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight mb-2 uppercase">
                {language === 'ar' ? (selectedOffer.titleAr || selectedOffer.titleEn) : language === 'fr' ? (selectedOffer.titleFr || selectedOffer.titleEn) : selectedOffer.titleEn}
              </h3>

              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-6">
                {language === 'ar' ? (selectedOffer.descriptionAr || selectedOffer.descriptionEn) : language === 'fr' ? (selectedOffer.descriptionFr || selectedOffer.descriptionEn) : selectedOffer.descriptionEn}
              </p>

              {/* Included courses checklist inside popup detail modal */}
              {selectedOffer.courseIds && selectedOffer.courseIds.length > 0 && (
                <div className="mb-6 p-4 bg-purple-950/25 border border-purple-900/20 rounded-2xl">
                  <h4 className="text-[10px] font-mono font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      {language === 'ar' ? 'محتويات الباقة المدعومة:' : language === 'fr' ? 'Programmes inclus :' : 'Included Syllabus Modules:'}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {selectedOffer.courseIds.map((cid: string) => {
                      const matched = allCourses.find((c: any) => c.id === cid);
                      return matched ? (
                        <div key={cid} className="flex items-center gap-2.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-xs text-gray-300 font-semibold truncate">
                            {matched.title}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="pt-5 border-t border-purple-900/10 flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    {language === 'ar' ? 'السعر المخفض:' : language === 'fr' ? 'Prix Total :' : 'Promo price'}
                  </span>
                  <div className="text-2xl font-black text-purple-400 font-sans">
                    {selectedOffer.price?.toLocaleString()} {selectedOffer.currency}
                  </div>
                </div>

                <Link
                  to={`/complete-order?offerId=${selectedOffer.id}`}
                  onClick={() => setSelectedOffer(null)}
                  className="px-5 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 inline-flex items-center gap-2"
                >
                  <span>{language === 'ar' ? 'سجل الآن' : language === 'fr' ? 'Claimer' : 'Claim now'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Featured Courses Preview */}
      <section className="py-12 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
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
                  className="h-full"
                >
                  <GlowingCard className="bg-black border border-purple-900/20 rounded-2xl overflow-hidden group flex flex-col h-full">
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
                            <SparkleButton 
                              to={`/courses/${course.id}`}
                              className="px-3 py-2 text-white border border-purple-900/30 rounded-lg text-xs font-bold flex items-center justify-center"
                            >
                              {t('courses.details')}
                            </SparkleButton>
                            <RainbowButton 
                              to={`/payment?courseId=${course.id}`}
                              className="px-4 py-2 text-white border border-purple-500/30 rounded-lg text-sm font-bold flex items-center justify-center"
                            >
                              {t('courses.getStarted')}
                            </RainbowButton>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </GlowingCard>
              </motion.div>
              ))
            )}
          </div>

          {/* Home statistics fall under the section of our courses */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-12 border border-white/5 rounded-[2rem] overflow-hidden glass-surface-dark"
          >
            {(statistics && statistics.length > 0 ? statistics : [
              { id: 'students', value: '590+', labelEn: 'Students', labelFr: 'Étudiants', labelAr: 'طالب', iconName: 'Users' },
              { id: 'courses', value: '3+', labelEn: 'Courses', labelFr: 'Cours', labelAr: 'دورات', iconName: 'BookOpen' },
              { id: 'workshops', value: '40+', labelEn: 'Free Workshops', labelFr: 'Ateliers gratuits', labelAr: 'ورشة عمل مجانية', iconName: 'Star' },
              { id: 'certified', value: '100%', labelEn: 'Certified', labelFr: 'Certifié', labelAr: 'معتمد', iconName: 'ShieldCheck' },
            ]).map((stat, i, arr) => {
              const IconComponent = (Icons as any)[stat.iconName || 'Users'] || Icons.Users;
              const label = language === 'ar' ? (stat.labelAr || stat.labelEn) : language === 'fr' ? (stat.labelFr || stat.labelEn) : stat.labelEn;
              return (
                <div key={stat.id || i} className={`p-10 text-center border-white/5 ${i !== arr.length - 1 ? 'md:border-r' : ''} ${i % 2 === 0 ? 'border-r md:border-r-0' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} hover:bg-white/5 transition-colors group`}>
                  <div className="flex justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-4xl font-black mb-2 tracking-tighter">{stat.value}</div>
                  <div className="text-micro text-gray-500">{label}</div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>



      {/* Students Work Section */}
      <section id="students-work" className="py-12 bg-black relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-900/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('studentsWork.title')}</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              {t('studentsWork.subtitle')}
            </p>
          </div>

          <div className="space-y-12">
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
        {/* Floating Continue Watching window (bottom left) */}
        {showContinueWatching && continueWatching && (
          <motion.div
            initial={{ opacity: 0, x: -120, y: 120, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, y: 80, scale: 0.9 }}
            whileHover={{ 
              scale: 1.02,
              borderColor: "rgba(168, 85, 247, 0.5)",
              boxShadow: "0 25px 60px rgba(168, 85, 247, 0.45)"
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 260, 
              damping: 24,
              mass: 1.1
            }}
            className="fixed bottom-6 left-6 z-[100] max-w-sm w-80 md:w-96 bg-zinc-950/95 border-2 border-purple-500/20 rounded-[2.2rem] p-5 shadow-[0_20px_50px_rgba(168,85,247,0.2)] backdrop-blur-md overflow-hidden flex flex-col font-sans cursor-pointer transition-colors duration-300"
          >
            {/* Ambient colorful top bar indicator */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 animate-pulse" />

            {/* Header section with badge & dismiss button */}
            <div className="flex items-center justify-between mb-3 border-b border-purple-900/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[10px] font-black tracking-widest uppercase text-white font-mono opacity-80">
                  {language === 'ar' ? 'متابعة المشاهدة' : language === 'fr' ? 'REPRENDRE LA LECTURE' : 'CONTINUE WATCHING'}
                </span>
              </div>
              <button
                onClick={() => setShowContinueWatching(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm p-1 hover:bg-white/5 rounded-full"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Main content grid: horizontal image & info */}
            <div className="flex gap-4 items-center">
              {/* Thumbnail representation */}
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-zinc-900 border border-purple-900/10 shrink-0 group">
                <img
                  src={continueWatching.thumbnail}
                  alt={continueWatching.lessonTitle || "Thumbnail"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                  <Play className="w-6 h-6 text-white text-purple-400 drop-shadow animate-pulse" fill="currentColor" />
                </div>
              </div>

              {/* Text specifications */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase font-mono font-bold text-purple-400 tracking-wider mb-0.5 truncate">
                  {continueWatching.courseTitle}
                </div>
                <h4 className="text-xs md:text-sm font-extrabold text-white leading-tight font-sans tracking-wide truncate mb-1" title={continueWatching.lessonTitle}>
                  {continueWatching.lessonTitle}
                </h4>
                
                {/* Timeline Progress Bar. Calculates watch percentage */}
                <div className="mt-2.5 space-y-1">
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full border border-white/5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, (continueWatching.currentTime / continueWatching.duration) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono">
                    <span>
                      {Math.floor(continueWatching.currentTime / 60)}m {Math.floor(continueWatching.currentTime % 60)}s
                    </span>
                    <span>
                      {Math.round((continueWatching.currentTime / continueWatching.duration) * 105 || 100) > 100 
                        ? 100 
                        : Math.round((continueWatching.currentTime / continueWatching.duration) * 100)
                      }% {language === 'ar' ? 'مكتمل' : 'completed'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Play actions block */}
            <div className="mt-4 pt-3 border-t border-purple-900/10 flex items-center justify-end">
              <RainbowButton
                to={`/courses/${continueWatching.courseId}/video/${continueWatching.chapter}/${continueWatching.type}`}
                className="text-[10px] md:text-xs uppercase"
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <Play className="w-3 h-3 inline-block shrink-0" fill="currentColor" />
                  {language === 'ar' ? 'استمرار' : language === 'fr' ? 'Continuer' : 'Continue watching'}
                </span>
              </RainbowButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
