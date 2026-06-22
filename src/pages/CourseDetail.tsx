import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, BarChart, CheckCircle2, ArrowRight, Play, Star, Users, ShieldCheck, Calendar, ChevronDown, ChevronUp, BookOpen, Dumbbell, FileText, MessageSquare, Send, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, collection, query, where, onSnapshot, addDoc, getDocs, doc, getDoc } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { RainbowButton, SparkleButton } from '../components/AnimatedButtons';
import { useRegion } from '../context/RegionContext';
import { client, urlFor } from '../lib/sanity';

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { getCoursePrice } = useRegion();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState<number>(0);

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

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviews.length).toFixed(1)
    : '5.0';

  const getContinueUrl = () => {
    if (!course || !course.chapters || course.chapters.length === 0) {
      return `/courses/${id}/video/1/session`;
    }
    
    for (let index = 0; index < course.chapters.length; index++) {
      const chapterNum = index + 1;
      for (const type of ['session', 'exercise', 'homework']) {
        if (!completedLessons.has(`${chapterNum}-${type}`)) {
          return `/courses/${id}/video/${chapterNum}/${type}`;
        }
      }
    }
    
    return `/courses/${id}/video/1/session`;
  };

  const isVideoEditingCourse = course && (
    course.id === '1' ||
    course.title?.toLowerCase().includes('video editing') ||
    course.title?.toLowerCase().includes('video-editing') ||
    course.title?.toLowerCase().includes('مونتاج') ||
    course.title?.toLowerCase().includes('cinematic')
  );

  useEffect(() => {
    if (!id) return;
    const qEnrollments = query(collection(db, 'enrollments'), where('courseId', '==', id));
    getDocs(qEnrollments).then(snap => {
      setEnrollmentCount(snap.size);
    }).catch(err => {
      console.error("Error fetching enrollments count:", err);
    });
  }, [id, isEnrolled]);

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
              return {
                id: docSnap.id,
                ...ch,
                lessons: [
                  { id: "session", type: "session", title: ch.session_name ? `Session ${ch.position || '1'}: ${ch.session_name}` : "Session Video", video_url: ch.session_url || "" },
                  { id: "exercise", type: "exercise", title: "Exercise Video", video_url: ch.exercise_url || "" },
                  { id: "homework", type: "homework", title: "Homework Video", video_url: ch.homework_url || "" }
                ]
              };
            }).sort((a, b) => (a.position || 0) - (b.position || 0));
          } else {
            chaptersData = data.chapters || [];
          }

          setCourse({
            id: courseSnap.id,
            ...data,
            chapters: chaptersData,
            requirements: data.requirements || [],
            learningOutcomes: data.learningOutcomes || [
              "Master professional video editing techniques",
              "Learn advanced color grading and sound design",
              "Understand industry-standard workflows",
              "Create high-quality cinematic content"
            ],
            instructor: data.instructor || {
              name: "Amine Rouabhia",
              avatar: "https://picsum.photos/seed/instructor/200/200",
              bio: "Professional video editor and motion designer with extensive experience."
            },
          });
        } else {
          setCourse(null);
        }
      } catch (error) {
        console.error('Error fetching course from Firestore:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();

    // Listen to reviews
    const qReviews = query(collection(db, 'reviews'), where('courseId', '==', id));
    const unsubReviews = onSnapshot(qReviews, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reviews'));

    // Check enrollment
    if (user) {
      const qEnrollment = query(collection(db, 'enrollments'), where('uid', '==', user.uid), where('courseId', '==', id));
      // Check enrollment and check paid status
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
        const completed = new Set<string>(snap.docs.map(doc => {
          const data = doc.data();
          return `${data.chapter}-${data.type}`;
        }));
        setCompletedLessons(completed);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'progress'));

      return () => {
        unsubReviews();
        unsubProgress();
      };
    }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Course Not Found</h2>
          <Link to="/courses" className="text-purple-400 hover:text-purple-300">Return to Courses</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                  {course.level}
                </span>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-bold">
                    {averageRating} ({reviews.length} {t('course.reviews')})
                  </span>
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                {course.title}
                {course.isComingSoon && (
                  <span className="block text-2xl text-purple-400 mt-2 uppercase tracking-[0.2em] font-black">
                    {t('course.comingSoon') || 'Coming Soon'}
                  </span>
                )}
              </h1>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                {course.detailedDescription}
              </p>
              
              <div className="flex flex-wrap gap-6 mb-10">
                <div className="flex items-center gap-2 text-gray-300">
                  <BarChart className="w-5 h-5 text-purple-500" />
                  <span>{course.level} {t('course.level')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-5 h-5 text-purple-500" />
                  <span>{enrollmentCount} {t('stats.students')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {isEnrolled ? (
                  <RainbowButton 
                    to={getContinueUrl()}
                    className="px-10 py-4 font-bold text-lg"
                  >
                    <span>{t('dashboard.continue')}</span>
                    <ArrowRight className={`w-5 h-5 inline-block ${language === 'ar' ? 'rotate-180' : ''}`} />
                  </RainbowButton>
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
                      <span>{language === 'ar' ? 'شاهد حصة واحدة مجاناً' : language === 'fr' ? 'Regarder 1 session GRATUITE' : 'Watch 1 FREE session'}</span>
                    </span>
                  </SparkleButton>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative aspect-video rounded-3xl overflow-hidden border border-purple-900/30 shadow-2xl shadow-purple-600/10"
            >
              {course.trailerUrl && !course.isComingSoon ? (
                <iframe
                  src={`${getEmbedVideoUrl(course.trailerUrl)}?autoplay=0&rel=0`}
                  title={`${course.title} Trailer`}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <>
                  <img 
                    src={course.image} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {course.isComingSoon && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center shadow-xl shadow-purple-600/40">
                          <Lock className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Course Content */}
      <section className="py-20 border-t border-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-16">
              {/* Learning Outcomes */}
              <div>
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-purple-500" />
                  </div>
                  {t('course.learn')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.learningOutcomes.map((outcome, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-purple-900/20 rounded-2xl">
                      <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                      <span className="text-gray-300">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* requirements */}
              <div>
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-purple-500" />
                  </div>
                  {t('course.requirements')}
                </h2>
                <div className="space-y-4">
                  {course.requirements.map((pre, i) => (
                    <div key={i} className="flex items-center gap-4 text-gray-400">
                      <div className="w-2 h-2 rounded-full bg-purple-600" />
                      <span>{pre}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Course Curriculum */}
              <div>
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-purple-500" />
                  </div>
                  {t('course.curriculum')}
                </h2>
                <div className="space-y-4">
                  {isVideoEditingCourse ? (
                    <div className="flex flex-col gap-10">
                      {course.chapters && course.chapters.map((ch: any, cIdx: number) => {
                        const sessions = [
                          { url: ch.session_url_1 || (cIdx === 0 && !ch.session_url_1 ? ch.session_url : ""), sIdx: 0 },
                          { url: ch.session_url_2, sIdx: 1 },
                          { url: ch.session_url_3, sIdx: 2 },
                          { url: ch.session_url_4, sIdx: 3 }
                        ].filter(s => s.url);

                        const hasExercise = !!ch.exercise_url;

                        return (
                          <div key={ch.id || cIdx} className="space-y-4">
                            <div className="border-l-4 border-purple-500 bg-zinc-950/90 px-6 py-5 rounded-r-2xl flex items-center gap-3 shadow-lg">
                              <span className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)] shrink-0 animate-pulse" />
                              <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                                {ch.title || `Chapter ${ch.position || cIdx + 1}`}
                              </h3>
                            </div>
                            <div className="flex flex-col gap-3">
                              {sessions.map((s) => {
                                const sNum = cIdx * 4 + (s.sIdx + 1);
                                const isFirstSession = sNum === 1;
                                const isLocked = !isEnrolled && !isFirstSession;
                                const isLessonCompleted = completedLessons.has(`${sNum}-session`);
 
                                const getSessionLabel = (num: number, sIdx: number) => {
                                  const sName = ch[`session_name_${sIdx + 1}`] || '';
                                  if (sName) {
                                    if (language === 'ar') return `الحصة ${num}: ${sName}`;
                                    if (language === 'fr') return `Session ${num}: ${sName}`;
                                    return `Session ${num}: ${sName}`;
                                  }
                                  if (language === 'ar') return `الحصة ${num}`;
                                  if (language === 'fr') return `Session ${num}`;
                                  return `Session ${num}`;
                                };
 
                                if (isLocked) {
                                  return (
                                    <button
                                      key={sNum}
                                      onClick={() => {
                                        alert(t('course.locked'));
                                        navigate(`/payment?courseId=${course.id}`);
                                      }}
                                      className="w-full flex items-center gap-4 p-4 bg-zinc-950/40 border border-purple-900/10 rounded-2xl transition-all cursor-not-allowed opacity-60 text-left"
                                    >
                                      <div className="relative w-24 aspect-video bg-zinc-950 rounded-xl overflow-hidden shrink-0 border border-purple-900/20">
                                        <img
                                          src={`https://picsum.photos/seed/${course.id}-\${sNum}-session/200/120`}
                                          alt={getSessionLabel(sNum, s.sIdx)}
                                          className="w-full h-full object-cover opacity-20"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Lock className="w-5 h-5 text-gray-600" />
                                        </div>
                                      </div>
                                      <div className="flex flex-col text-left">
                                        <span className="font-bold text-gray-500 text-sm">
                                          {getSessionLabel(sNum, s.sIdx)}
                                        </span>
                                      </div>
                                      <Lock className="w-4 h-4 text-gray-700 ml-auto shrink-0" />
                                    </button>
                                  );
                                }

                                return (
                                  <RainbowButton
                                    key={sNum}
                                    to={`/courses/${course.id}/video/${sNum}/session`}
                                    className="w-full block"
                                  >
                                    <span className="flex items-center gap-4 w-full text-left">
                                      <span className="relative w-24 aspect-video bg-zinc-950 rounded-xl overflow-hidden shrink-0 border border-purple-900/20 inline-block">
                                        <img
                                          src={`https://picsum.photos/seed/${course.id}-\${sNum}-session/200/120`}
                                          alt={getSessionLabel(sNum, s.sIdx)}
                                          className="w-full h-full object-cover opacity-80"
                                          referrerPolicy="no-referrer"
                                        />
                                        <span className="absolute inset-0 flex items-center justify-center">
                                          {isLessonCompleted ? (
                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                          ) : (
                                            <Play className="w-5 h-5 text-purple-500" />
                                          )}
                                        </span>
                                      </span>
                                      <span className="flex flex-col text-left">
                                        <span className="font-bold text-white group-hover:text-purple-400">
                                          {getSessionLabel(sNum, s.sIdx)}
                                        </span>
                                        {isFirstSession && !isEnrolled && (
                                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1">
                                            Free Trial
                                          </span>
                                        )}
                                      </span>
                                      {isLessonCompleted && (
                                        <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto shrink-0" />
                                      )}
                                    </span>
                                  </RainbowButton>
                                );
                              })}

                              {hasExercise && (() => {
                                const chapPos = ch.position || cIdx + 1;
                                const isLocked = !isEnrolled;
                                const isExerciseCompleted = completedLessons.has(`${chapPos}-exercise`);

                                const getExerciseLabel = () => {
                                  if (language === 'ar') return `تمرين الفصل ${chapPos}`;
                                  if (language === 'fr') return `Exercice du Chapitre ${chapPos}`;
                                  return `Chapter ${chapPos} Practice Exercise`;
                                };

                                return (
                                  <Link
                                    key={`ex-${chapPos}`}
                                    to={isLocked ? '#' : `/courses/${course.id}/video/${chapPos}/exercise`}
                                    onClick={(e) => {
                                      if (isLocked) {
                                        e.preventDefault();
                                        alert(t('course.locked'));
                                        navigate(`/payment?courseId=${course.id}`);
                                      }
                                    }}
                                    className={`flex items-center gap-4 p-4 bg-purple-950/10 border border-purple-500/25 rounded-2xl transition-all group ${
                                      isLocked ? 'cursor-not-allowed opacity-60' : 'hover:border-purple-500/40 hover:bg-purple-950/20'
                                    }`}
                                  >
                                    <div className="relative w-24 aspect-video bg-zinc-950 rounded-xl overflow-hidden shrink-0 border border-purple-500/20">
                                      <img
                                        src={`https://picsum.photos/seed/${course.id}-${chapPos}-exercise/200/120`}
                                        alt={getExerciseLabel()}
                                        className={`w-full h-full object-cover transition-opacity ${
                                          isLocked ? 'opacity-20' : 'opacity-60 group-hover:opacity-100'
                                        }`}
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-purple-950/20">
                                        {isLocked ? (
                                          <Lock className="w-5 h-5 text-gray-600" />
                                        ) : isExerciseCompleted ? (
                                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        ) : (
                                          <Dumbbell className="w-5 h-5 text-purple-400" />
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className={`font-bold transition-colors ${
                                        isLocked ? 'text-gray-500' : 'text-purple-300 group-hover:text-purple-400'
                                      }`}>
                                        {getExerciseLabel()}
                                      </span>
                                    </div>
                                    {isLocked ? (
                                      <Lock className="w-4 h-4 text-gray-700 ml-auto" />
                                    ) : isExerciseCompleted && (
                                      <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                                    )}
                                  </Link>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    course.chapters && course.chapters.length > 0 ? (
                      course.chapters.map((chapter: any, index: number) => (
                        <div key={chapter._id || index} className="border border-purple-900/20 rounded-2xl overflow-hidden bg-zinc-900/30">
                          <button 
                            onClick={() => setExpandedChapter(expandedChapter === index + 1 ? null : index + 1)}
                            className="w-full p-6 flex items-center justify-between hover:bg-purple-900/10 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-purple-600/25 flex items-center justify-center text-purple-300 font-extrabold text-base border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                                {index + 1}
                              </div>
                              <span className="text-xl md:text-2xl font-black text-purple-100 tracking-tight">{chapter.title}</span>
                            </div>
                            {expandedChapter === index + 1 ? <ChevronUp className="w-5 h-5 text-purple-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                          </button>
                          
                          <AnimatePresence>
                            {expandedChapter === index + 1 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-6 pt-0 flex flex-col gap-3">
                                    {chapter.lessons && chapter.lessons.map((lesson: any, lIdx: number) => {
                                      const isFirstSession = index === 0 && lIdx === 0;
                                      const isGraphicDesignRecorded = course.id === '4' && lesson.type !== 'session' && lesson.type !== 'live';
                                      const isLocked = (!isEnrolled && !isFirstSession) || isGraphicDesignRecorded;
                                      const isLessonCompleted = completedLessons.has(`${index + 1}-${lesson.type || 'session'}`);
                                      
                                      return (
                                      <Link 
                                        key={lesson._id || lIdx}
                                        to={isLocked ? '#' : `/courses/${course.id}/video/${index + 1}/${lesson.type || 'session'}`}
                                        onClick={(e) => {
                                          if (isLocked) {
                                            e.preventDefault();
                                            alert(t('course.locked'));
                                            navigate(`/payment?courseId=${course.id}`);
                                          }
                                        }}
                                        className={`flex items-center gap-4 p-3 bg-zinc-950/50 border border-purple-900/10 rounded-xl transition-all group ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:border-purple-500/50'}`}
                                      >
                                        <div className="relative w-24 aspect-video bg-zinc-900 rounded-lg overflow-hidden shrink-0 border border-purple-900/20">
                                          <img 
                                            src={`https://picsum.photos/seed/${course.id}-${index}-${lIdx}/200/120`}
                                            alt={lesson.title}
                                            className={`w-full h-full object-cover transition-opacity ${isLocked ? 'opacity-20' : 'opacity-60 group-hover:opacity-100'}`}
                                            referrerPolicy="no-referrer"
                                          />
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            {isLocked ? (
                                              <Lock className="w-5 h-5 text-gray-600" />
                                            ) : isLessonCompleted ? (
                                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                                            ) : (
                                              <Play className="w-5 h-5 text-purple-500" />
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-col">
                                          <span className={`font-bold transition-colors ${isLocked ? 'text-gray-500' : 'text-gray-300 group-hover:text-purple-400'}`}>
                                            {lesson.title}
                                          </span>
                                          {isFirstSession && !isEnrolled && (
                                            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Free Trial</span>
                                          )}
                                        </div>
                                        {isLocked ? (
                                          <Lock className="w-4 h-4 text-gray-700 ml-auto" />
                                        ) : isLessonCompleted && (
                                          <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                                        )}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    ) : (
                      Array.from({ 
                        length: course.id === '1' ? 12 : course.id === '2' ? 18 : course.id === '4' ? 12 : 24 
                      }, (_, i) => i + 1).map((chapter) => (
                        <div key={chapter} className="border border-purple-900/20 rounded-2xl overflow-hidden bg-zinc-900/30">
                          <button 
                            onClick={() => setExpandedChapter(expandedChapter === chapter ? null : chapter)}
                            className="w-full p-6 flex items-center justify-between hover:bg-purple-900/10 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold">
                                {chapter}
                              </div>
                              <span className="text-lg font-bold">Chapter {chapter}: Master the Basics</span>
                            </div>
                            {expandedChapter === chapter ? <ChevronUp className="w-5 h-5 text-purple-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                          </button>
                          
                          <AnimatePresence>
                            {expandedChapter === chapter && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-6 pt-0 flex flex-col gap-3">
                                  {[
                                    { type: 'session', label: 'Session', icon: Play },
                                    { type: 'exercise', label: 'Exercise', icon: Dumbbell },
                                    { type: 'homework', label: 'Homework', icon: FileText }
                                  ].map((item) => {
                                    const isFirstSession = chapter === 1 && item.type === 'session';
                                    const isGraphicDesignRecorded = course.id === '4' && item.type !== 'session' && item.type !== 'live';
                                    const isLocked = (!isEnrolled && !isFirstSession) || isGraphicDesignRecorded;
                                    const isLessonCompleted = completedLessons.has(`${chapter}-${item.type}`);
                                    
                                    if (isLocked) {
                                      return (
                                        <button
                                          key={item.type}
                                          onClick={() => {
                                            alert(t('course.locked'));
                                            navigate(`/payment?courseId=\${course.id}`);
                                          }}
                                          className="w-full flex items-center gap-4 p-3 bg-zinc-950/50 border border-purple-900/10 rounded-xl transition-all cursor-not-allowed opacity-60 text-left"
                                        >
                                          <div className="relative w-24 aspect-video bg-zinc-900 rounded-lg overflow-hidden shrink-0 border border-purple-900/20">
                                            <img 
                                              src={`https://picsum.photos/seed/${course.id}-\${chapter}-\${item.type}/200/120`}
                                              alt={item.label}
                                              className="w-full h-full object-cover opacity-20"
                                              referrerPolicy="no-referrer"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <Lock className="w-5 h-5 text-gray-600" />
                                            </div>
                                          </div>
                                          <div className="flex flex-col text-left">
                                            <span className="font-bold text-gray-500 text-sm">
                                              {item.label}
                                            </span>
                                          </div>
                                          <Lock className="w-4 h-4 text-gray-700 ml-auto shrink-0" />
                                        </button>
                                      );
                                    }

                                    return (
                                      <RainbowButton
                                        key={item.type}
                                        to={`/courses/${course.id}/video/${chapter}/${item.type}`}
                                        className="w-full block"
                                      >
                                        <span className="flex items-center gap-4 w-full text-left">
                                          <span className="relative w-24 aspect-video bg-zinc-900 rounded-lg overflow-hidden shrink-0 border border-purple-900/20 inline-block">
                                            <img 
                                              src={`https://picsum.photos/seed/${course.id}-\${chapter}-\${item.type}/200/120`}
                                              alt={item.label}
                                              className="w-full h-full object-cover opacity-80"
                                              referrerPolicy="no-referrer"
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center">
                                              {isLessonCompleted ? (
                                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                              ) : (
                                                <item.icon className="w-5 h-5 text-purple-500" />
                                              )}
                                            </span>
                                          </span>
                                          <span className="flex flex-col text-left">
                                            <span className="font-bold text-white group-hover:text-purple-400">
                                              {item.label}
                                            </span>
                                            {isFirstSession && !isEnrolled && (
                                              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest font-black">Free Trial</span>
                                            )}
                                          </span>
                                          {isLessonCompleted && (
                                            <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto shrink-0" />
                                          )}
                                        </span>
                                      </RainbowButton>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    )
                  )}
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
                  {reviews.length > 0 ? reviews.map((review) => (
                    <div key={review.id} className="bg-zinc-950 border border-purple-900/20 p-6 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold">
                            {review.userName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{review.userName}</div>
                            <div className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'opacity-30'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed italic">"{review.comment}"</p>
                    </div>
                  )) : (
                    <div className="col-span-2 text-center py-12 bg-zinc-950/30 rounded-3xl border border-dashed border-purple-900/20">
                      <p className="text-gray-500">{t('course.noReviews')}</p>
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
                              <Star className={`w-6 h-6 ${newReview.rating >= star ? 'fill-current' : ''}`} />
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
                        className="px-8 py-3 bg-brand-radial hover:opacity-90 text-white rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {submittingReview ? 'Submitting...' : t('course.submitReview')}
                        <Send className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Instructor Card */}
              <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 sticky top-32">
                <h3 className="text-xl font-bold mb-6">{t('course.instructor')}</h3>
                <div className="flex items-center gap-4 mb-6">
                  <img 
                    src={course.instructor.avatar} 
                    alt={course.instructor.name} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-600"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="font-bold text-lg">{course.instructor.name}</div>
                    <div className="text-purple-400 text-sm">Professional Editor</div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm italic leading-relaxed mb-8">
                  "{course.instructor.bio}"
                </p>
                
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
                      <span>{t('dashboard.continue')}</span>
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
