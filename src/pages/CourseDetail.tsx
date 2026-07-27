import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, BarChart, CheckCircle2, ArrowRight, Play, BookOpen, FileText, Lock, MessageSquare, Send, Calendar, Users, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, collection, query, where, onSnapshot, addDoc, getDocs, doc, getDoc, deleteDoc } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { RainbowButton, SparkleButton } from '../components/AnimatedButtons';
import { useRegion } from '../context/RegionContext';

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const { t, language } = useLanguage();
  const { getCoursePrice } = useRegion();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState<number>(0);

  const isVideoEditingCourse = course && (
    course.id === '1' ||
    course.title?.toLowerCase().includes('video editing') ||
    course.title?.toLowerCase().includes('video-editing') ||
    course.title?.toLowerCase().includes('مونتاج') ||
    course.title?.toLowerCase().includes('cinematic')
  );

  const getFlatLessons = () => {
    if (!course) return [];
    const list: any[] = [];

    if (isVideoEditingCourse) {
      if (course.chapters && course.chapters.length > 0) {
        let globalSessionNum = 1;
        course.chapters.forEach((ch: any, cIdx: number) => {
          let chSessions: any[] = [];
          if (Array.isArray(ch.sessions)) {
            chSessions = ch.sessions.filter((s: any) => s.url);
          } else {
            chSessions = [
              { url: ch.session_url_1 || (cIdx === 0 && !ch.session_url_1 ? ch.session_url : ""), name: ch.session_name_1 || ch.session_name || '' },
              { url: ch.session_url_2, name: ch.session_name_2 },
              { url: ch.session_url_3, name: ch.session_name_3 },
              { url: ch.session_url_4, name: ch.session_name_4 }
            ].filter((s: any) => s.url);
          }

          chSessions.forEach((s: any) => {
            const sNum = globalSessionNum++;
            const sName = s.name || '';
            const topLabel = language === 'ar' ? `الحصة ${sNum}` : language === 'fr' ? `Session ${sNum}` : `Session ${sNum}`;
            const mainTitle = sName || ch.title || (language === 'ar' ? `موضوع الحصة ${sNum}` : language === 'fr' ? `Sujet de Session ${sNum}` : `Session ${sNum} Topic`);

            list.push({
              id: `${sNum}-session`,
              chapter: sNum,
              type: 'session',
              label: sName ? `${topLabel}: ${sName}` : topLabel,
              topLabel,
              mainTitle,
              chapterTitle: ch.title || `Chapter ${cIdx + 1}`,
              isFirstSession: sNum === 1,
              icon: Play,
              thumbnail_url: ch.thumbnail_url || '',
            });
          });
        });
      } else {
        const numChapters = course.id === '1' ? 12 : course.id === '2' ? 18 : course.id === '4' ? 12 : 24;
        for (let chNum = 1; chNum <= numChapters; chNum++) {
          const topLabel = language === 'ar' ? `الحصة ${chNum}` : language === 'fr' ? `Session ${chNum}` : `Session ${chNum}`;
          const mainTitle = language === 'ar' ? `بدء الدرس ${chNum}` : language === 'fr' ? `Démarrer la session ${chNum}` : `Start Session ${chNum}`;
          list.push({
            id: `${chNum}-session`,
            chapter: chNum,
            type: 'session',
            label: topLabel,
            topLabel,
            mainTitle,
            chapterTitle: `Module ${chNum}`,
            isFirstSession: chNum === 1,
            icon: Play,
            thumbnail_url: '',
          });
        }
      }
    } else {
      const numChapters = course.chapters && course.chapters.length > 0 
        ? course.chapters.length 
        : (course.id === '1' ? 12 : course.id === '2' ? 18 : course.id === '4' ? 12 : 24);

      for (let chNum = 1; chNum <= numChapters; chNum++) {
        const chapterObj = course.chapters?.[chNum - 1];
        const chapterTitle = chapterObj?.title || `Module ${chNum}`;

        const topLabel = language === 'ar' ? `الحصة ${chNum}` : language === 'fr' ? `Session ${chNum}` : `Session ${chNum}`;
        const mainTitle = chapterTitle;

        list.push({
          id: `${chNum}-session`,
          chapter: chNum,
          type: 'session',
          label: topLabel,
          topLabel,
          mainTitle,
          chapterTitle,
          isFirstSession: chNum === 1,
          icon: Play,
          thumbnail_url: chapterObj?.thumbnail_url || '',
        });

        const homeworkTopLabel = language === 'ar' ? `تمرين الحصة ${chNum}` : language === 'fr' ? `Exercice ${chNum}` : `Homework ${chNum}`;
        const homeworkMainTitle = chapterTitle;

        list.push({
          id: `${chNum}-homework`,
          chapter: chNum,
          type: 'homework',
          label: homeworkTopLabel,
          topLabel: homeworkTopLabel,
          mainTitle: homeworkMainTitle,
          chapterTitle,
          isFirstSession: false,
          icon: FileText,
          thumbnail_url: chapterObj?.thumbnail_url || '',
        });
      }
    }
    return list;
  };

  const getContinueUrl = () => {
    if (!course) return `/courses/${id}/video/1/session`;
    const flat = getFlatLessons();
    for (const item of flat) {
      if (!completedLessons.has(`${item.chapter}-${item.type}`)) {
        return `/courses/${id}/video/${item.chapter}/${item.type}`;
      }
    }
    return `/courses/${id}/video/1/session`;
  };

  useEffect(() => {
    if (!id) return;

    const fetchCourse = async () => {
      setLoading(true);
      try {
        const courseRef = doc(db, 'courses', id);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
          const data = courseSnap.data();

          // Fetch chapters from subcollection
          const chaptersQuery = query(collection(db, `courses/${id}/chapters`));
          const chaptersSnap = await getDocs(chaptersQuery);
          let chaptersData = [];

          if (!chaptersSnap.empty) {
            chaptersData = chaptersSnap.docs.map(docSnap => {
              const ch = docSnap.data();
              let sessionsList: Array<{ url: string; name: string }> = [];
              if (Array.isArray(ch.sessions)) {
                sessionsList = ch.sessions.filter((s: any) => s.url);
              } else {
                const legacy = [
                  { url: ch.session_url_1 || (ch.session_url || ""), name: ch.session_name_1 || ch.session_name || "" },
                  { url: ch.session_url_2 || "", name: ch.session_name_2 || "" },
                  { url: ch.session_url_3 || "", name: ch.session_name_3 || "" },
                  { url: ch.session_url_4 || "", name: ch.session_name_4 || "" }
                ].filter(s => s.url);
                sessionsList = legacy;
              }

              if (sessionsList.length === 0) {
                sessionsList.push({ url: ch.session_url || "", name: ch.session_name || "Session Video" });
              }

              const dynamicLessons: any[] = [];
              sessionsList.forEach((s, sIdx) => {
                dynamicLessons.push({
                  id: `session_${sIdx + 1}`,
                  type: `session_${sIdx + 1}`,
                  title: s.name ? s.name : `Session ${sIdx + 1}`,
                  video_url: s.url
                });
              });

              if (ch.homework_url) {
                dynamicLessons.push({ id: "homework", type: "homework", title: "Homework Video", video_url: ch.homework_url });
              }

              return {
                id: docSnap.id,
                ...ch,
                lessons: dynamicLessons
              };
            }).sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0));
          }

          setCourse({ id: courseSnap.id, ...data, chapters: chaptersData });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();

    const qReviews = query(collection(db, 'reviews'), where('courseId', '==', id));
    const unsubReviews = onSnapshot(qReviews, (snapshot) => {
      setReviews(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reviews'));

    // Check enrollment
    if (user) {
      const qEnrollment = query(collection(db, 'enrollments'), where('uid', '==', user.uid), where('courseId', '==', id));
      getDocs(qEnrollment).then(snap => {
        if (snap.empty) {
          setIsEnrolled(false);
        } else {
          const anyPaid = snap.docs.some(docSnap => docSnap.data().paid === true);
          setIsEnrolled(anyPaid);
        }
      });

      // Listen to progress
      const qProgress = query(collection(db, 'progress'), where('uid', '==', user.uid), where('courseId', '==', id), where('completed', '==', true));
      const unsubProgress = onSnapshot(qProgress, (snap) => {
        const completed = new Set<string>(snap.docs.map(docSnap => {
          const data = docSnap.data();
          return `${data.chapter}-${data.type}`;
        }));
        setCompletedLessons(completed);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'progress'));

      return () => {
        unsubReviews();
        unsubProgress();
      };
    }

    const qEnrollments = query(collection(db, 'enrollments'), where('courseId', '==', id));
    getDocs(qEnrollments).then(snap => {
      setEnrollmentCount(snap.size);
    }).catch(err => {
      console.error(err);
    });

    return () => unsubReviews();
  }, [id, user]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newReview.comment) return;

    setSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        uid: user.uid,
        courseId: id,
        rating: newReview.rating,
        comment: newReview.comment,
        userName: user.displayName || 'Anonymous Student',
        createdAt: new Date().toISOString()
      });
      setNewReview({ rating: 5, comment: '' });
      alert('Review submitted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      alert('Review deleted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'reviews');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white pt-32 pb-20 animate-pulse">
        {/* Hero Skeleton */}
        <section className="relative py-20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="h-6 w-24 bg-zinc-800/80 rounded-full mb-6" />
                <div className="h-4 w-32 bg-zinc-900/60 rounded mb-6" />
                <div className="space-y-3 mb-6">
                  <div className="h-12 w-full bg-zinc-800/80 rounded-xl" />
                  <div className="h-12 w-3/4 bg-zinc-800/80 rounded-xl" />
                </div>
                <div className="space-y-2.5 mb-8">
                  <div className="h-4 w-full bg-zinc-900/60 rounded" />
                  <div className="h-4 w-full bg-zinc-900/60 rounded" />
                </div>
                <div className="flex gap-6 mb-10">
                  <div className="h-5 w-28 bg-zinc-900/60 rounded" />
                </div>
              </div>
              <div className="aspect-video w-full rounded-3xl bg-zinc-900/60 border border-purple-950/10" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">{t('courses.notFound') || 'Course not found'}</p>
      </div>
    );
  }

  const outcomesList = Array.isArray(course.outcomes)
    ? course.outcomes
    : Array.isArray(course.learningOutcomes)
      ? course.learningOutcomes
      : typeof course.outcomes === 'string'
        ? (course.outcomes as string).split('\n').map(s => s.trim()).filter(Boolean)
        : [
            'Gain professional-grade editing skills',
            'Master advanced workflows and pipelines',
            'Build a standout creative portfolio',
            'Get direct industry-standard credentials'
          ];

  const requirementsList = Array.isArray(course.requirements)
    ? course.requirements
    : typeof course.requirements === 'string'
      ? (course.requirements as string).split('\n').map(s => s.trim()).filter(Boolean)
      : [
          'A computer capable of video editing',
          'No prior knowledge or experience required',
          'A passion to learn and create'
        ];

  return (
    <div className="min-h-screen bg-transparent text-white pt-32 pb-20">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              <span className="px-4 py-1.5 bg-purple-600/25 text-purple-300 text-xs font-bold rounded-full border border-purple-500/20 uppercase tracking-widest inline-block mb-6">
                {course.category}
              </span>
              
              <div className="flex items-center gap-1.5 text-yellow-500 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current text-yellow-500" />
                ))}
                <span className="text-gray-400 text-sm font-medium ml-2">({reviews.length} {t('course.reviews')})</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none mb-6">
                {course.title}
              </h1>

              <p className="text-gray-400 text-lg md:text-xl leading-relaxed mb-8 max-w-xl">
                {course.description}
              </p>

              <div className="flex flex-wrap gap-6 text-sm text-gray-500 mb-10">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" /> {course.duration}
                </span>
                <span className="flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-purple-500" /> {course.level || 'Beginner to Advanced'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {isEnrolled ? (
                  <RainbowButton 
                    to={getContinueUrl()}
                    className="px-10 py-4 font-bold text-lg"
                  >
                    <span>{t('courses.continueLearning')}</span>
                    <ArrowRight className={`w-5 h-5 inline-block ${language === 'ar' ? 'rotate-180' : ''}`} />
                  </RainbowButton>
                ) : course.isComingSoon ? (
                  <button 
                    disabled
                    className="px-10 py-4 bg-zinc-800 text-gray-400 cursor-not-allowed rounded-2xl font-bold text-lg transition-all"
                  >
                    {t('course.comingSoon') || 'Coming Soon'}
                  </button>
                ) : (
                  <RainbowButton 
                    to={`/payment?courseId=${course.id}`}
                    className="px-10 py-4 font-bold text-lg"
                  >
                    <span>{t('courses.getStarted')}</span>
                    <ArrowRight className={`w-5 h-5 inline-block ${language === 'ar' ? 'rotate-180' : ''}`} />
                  </RainbowButton>
                )}
                {!isEnrolled && (
                  <SparkleButton 
                    to={`/courses/${course.id}/video/1/session`}
                    className="px-10 py-4 font-bold text-lg"
                  >
                    <span className="flex items-center gap-2 justify-center">
                      <Play className="w-5 h-5 text-purple-500 fill-current inline-block" />
                      <span>{language === 'ar' ? 'شاهد حصة مجانية' : language === 'fr' ? 'Regarder 1 session GRATUITE' : 'Watch 1 FREE session'}</span>
                    </span>
                  </SparkleButton>
                )}
              </div>
            </div>

            {/* Right Side Video Banner */}
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-purple-500/10 group shadow-[0_0_50px_rgba(168,85,247,0.15)]">
              <img
                src={course.image_url || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200'}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform cursor-pointer">
                  <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Content */}
      <section className="py-20 border-t border-purple-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-16">
              {/* Learning Outcomes & Requirements Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-stretch bg-zinc-950/20 border border-purple-950/10 p-8 rounded-3xl">
                {/* Learning Outcomes */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                    <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-purple-500" />
                    </div>
                    {t('course.outcomes') || 'What You Will Learn'}
                  </h2>
                  <div className="space-y-4">
                    {outcomesList.map((outcome: string, idx: number) => (
                      <div key={idx} className="flex gap-4 p-4 bg-zinc-950/40 border border-purple-950/10 rounded-2xl">
                        <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm leading-relaxed">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vertical Gradient Stylish Simplistic Separator Line */}
                <div className="hidden lg:flex flex-col items-center justify-center px-4">
                  <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-purple-500/30 to-transparent" />
                </div>
                {/* Horizontal Gradient Line for mobile */}
                <div className="block lg:hidden h-[1px] w-full bg-gradient-to-r from-transparent via-purple-500/30 to-transparent my-4" />

                {/* Course Requirements */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                    <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-500" />
                    </div>
                    {t('course.requirements') || 'Course Requirements'}
                  </h2>
                  <div className="space-y-4">
                    {requirementsList.map((req: string, idx: number) => (
                      <div key={idx} className="flex gap-4 p-4 bg-zinc-950/40 border border-purple-950/10 rounded-2xl">
                        <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm leading-relaxed">{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Course Curriculum (Flat Sessions List) */}
              <div>
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-purple-500" />
                  </div>
                  {t('course.curriculum')}
                </h2>
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    {getFlatLessons().map((item) => {
                      const isLocked = !isEnrolled && !item.isFirstSession;
                      const isCompleted = completedLessons.has(`${item.chapter}-${item.type}`);
                      const IconComponent = item.icon;

                      if (isLocked) {
                        return (
                          <div 
                            key={item.id}
                            onClick={() => {
                              alert(t('course.locked'));
                              navigate(`/payment?courseId=${course.id}`);
                            }}
                            className="w-full flex items-center gap-4 p-4 bg-zinc-950/40 border border-purple-900/10 rounded-2xl transition-all cursor-not-allowed opacity-60 text-left hover:bg-zinc-950/60"
                          >
                            <div className="relative w-24 aspect-video bg-zinc-900 rounded-xl overflow-hidden shrink-0 border border-purple-900/20">
                              <img
                                src={item.thumbnail_url || `https://picsum.photos/seed/${course.id}-${item.chapter}-${item.type}/200/120`}
                                alt={item.mainTitle || item.label}
                                className="w-full h-full object-cover opacity-20"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-gray-600" />
                              </div>
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1 block">
                                {item.topLabel || item.chapterTitle}
                              </span>
                              <span className="font-bold text-gray-500 text-sm">
                                {item.mainTitle || item.label}
                              </span>
                            </div>
                            <Lock className="w-4 h-4 text-gray-700 ml-auto shrink-0" />
                          </div>
                        );
                      }

                      return (
                        <RainbowButton
                          key={item.id}
                          to={`/courses/${course.id}/video/${item.chapter}/${item.type}`}
                          className="w-full block text-left"
                        >
                          <span className="flex items-center gap-4 w-full text-left">
                            <span className="relative w-24 aspect-video bg-zinc-900 rounded-xl overflow-hidden shrink-0 border border-purple-900/20 inline-block">
                              <img
                                src={item.thumbnail_url || `https://picsum.photos/seed/${course.id}-${item.chapter}-${item.type}/200/120`}
                                alt={item.mainTitle || item.label}
                                className="w-full h-full object-cover opacity-80"
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute inset-0 flex items-center justify-center">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                                ) : (
                                  <IconComponent className="w-5 h-5 text-purple-500" />
                                )}
                              </span>
                            </span>
                            <span className="flex flex-col text-left">
                              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1 block">
                                {item.topLabel || item.chapterTitle}
                              </span>
                              <span className="font-bold text-white group-hover:text-purple-400 text-sm">
                                {item.mainTitle || item.label}
                              </span>
                              {item.isFirstSession && !isEnrolled && (
                                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1 inline-block">
                                  {language === 'ar' ? 'تجربة مجانية' : language === 'fr' ? 'Essai Gratuit' : 'Free Trial'}
                                </span>
                              )}
                            </span>
                            {isCompleted && (
                              <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto shrink-0" />
                            )}
                          </span>
                        </RainbowButton>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Reviews Section */}
              <div className="pt-20 border-t border-purple-900/20">
                <h2 className="text-3xl font-bold mb-12 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-purple-500" />
                  </div>
                  {t('course.reviews')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                  {reviews.length > 0 ? reviews.map((review: any) => {
                    const isAuthor = user && user.uid === review.uid;
                    const canDelete = isAuthor || isAdmin;
                    return (
                      <div key={review.id} className="bg-zinc-950 border border-purple-900/20 p-6 rounded-3xl space-y-4 relative group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold">
                              {review.userName ? review.userName[0] : 'S'}
                            </div>
                            <div>
                              <div className="font-bold text-sm">{review.userName || 'Student'}</div>
                              <div className="text-xs text-gray-500">
                                {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recent'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-yellow-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current text-yellow-500' : 'opacity-30'}`} />
                              ))}
                            </div>
                            {canDelete && (
                              <button 
                                onClick={() => handleDeleteReview(review.id)}
                                className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                                title="Delete Review"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed italic">"{review.comment}"</p>
                      </div>
                    );
                  }) : (
                    <div className="col-span-2 text-center py-12 bg-zinc-950/30 rounded-3xl border border-dashed border-purple-900/20">
                      <p className="text-gray-500">{t('course.noReviews') || 'No reviews yet'}</p>
                    </div>
                  )}
                </div>

                {/* Review Form */}
                {isEnrolled && (
                  <div className="bg-zinc-950 border border-purple-900/30 p-8 rounded-[2.5rem]">
                    <h3 className="text-xl font-bold mb-6">{t('course.writeReview')}</h3>
                    <form onSubmit={handleReviewSubmit} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-gray-400">{t('course.rating')}:</span>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewReview({ ...newReview, rating: star })}
                              className={`p-1 transition-colors ${newReview.rating >= star ? 'text-yellow-500' : 'text-gray-600'}`}
                            >
                              <Star className={`w-6 h-6 ${newReview.rating >= star ? 'fill-current text-yellow-500' : ''}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <textarea
                          placeholder="Share your thoughts about this course..."
                          value={newReview.comment}
                          onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-2xl p-6 text-white min-h-[150px] focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {submittingReview ? 'Submitting...' : t('course.submitReview')}
                        <Send className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-8">
              {/* Instructor Card */}
              <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 sticky top-32">
                <h3 className="text-xl font-bold mb-6">{t('course.instructor')}</h3>
                <div className="flex items-center gap-4 mb-6">
                  {course.instructor && (
                    <>
                      <img 
                        src={course.instructor.avatar} 
                        alt={course.instructor.name} 
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-600"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="font-bold text-lg">{course.instructor.name}</div>
                        <div className="text-purple-400 text-sm">Professional Instructor</div>
                      </div>
                    </>
                  )}
                </div>
                {course.instructor && (
                  <p className="text-gray-400 text-sm italic leading-relaxed mb-8">
                    "{course.instructor.bio}"
                  </p>
                )}
                
                <div className="space-y-4 pt-8 border-t border-purple-900/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {t('course.lastUpdated')}
                    </span>
                    <span className="text-gray-300">March 2024</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Users className="w-4 h-4" /> {t('stats.students')}
                    </span>
                    <span className="text-gray-300">{enrollmentCount}</span>
                  </div>
                </div>

                <div className="mt-10">
                  {!course.isComingSoon && (
                    <div className="text-3xl font-black text-white mb-6">
                      {getCoursePrice(course).formatted}
                    </div>
                  )}
                  {isEnrolled ? (
                    <RainbowButton 
                      to={getContinueUrl()}
                      className="w-full py-4 text-white font-bold"
                    >
                      <span>{t('courses.continueLearning')}</span>
                      <ArrowRight className={`w-5 h-5 inline-block ${language === 'ar' ? 'rotate-180' : ''}`} />
                    </RainbowButton>
                  ) : course.isComingSoon ? (
                    <button 
                      disabled
                      className="w-full py-4 bg-zinc-800 text-gray-400 cursor-not-allowed rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {t('course.comingSoon') || 'Coming Soon'}
                    </button>
                  ) : (
                    <RainbowButton 
                      to={`/payment?courseId=${course.id}`}
                      className="w-full py-4 text-white font-bold"
                    >
                      <span>{t('courses.getStarted')}</span>
                      <ArrowRight className={`w-5 h-5 inline-block ${language === 'ar' ? 'rotate-180' : ''}`} />
                    </RainbowButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
