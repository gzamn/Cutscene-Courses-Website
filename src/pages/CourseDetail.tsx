import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, BarChart, CheckCircle2, ArrowRight, Play, Star, Users, ShieldCheck, Calendar, ChevronDown, ChevronUp, BookOpen, Dumbbell, FileText, MessageSquare, Send, Lock } from 'lucide-react';
import { COURSES } from '../types';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const course = COURSES.find(c => c.id === id);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Listen to reviews
    const qReviews = query(collection(db, 'reviews'), where('courseId', '==', id));
    const unsubReviews = onSnapshot(qReviews, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reviews'));

    // Check enrollment
    if (user) {
      const qEnrollment = query(collection(db, 'enrollments'), where('uid', '==', user.uid), where('courseId', '==', id));
      getDocs(qEnrollment).then(snap => {
        setIsEnrolled(!snap.empty);
      });
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
                  <span className="text-sm font-bold">4.9 (120+ {t('course.reviews')})</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                {course.title}
              </h1>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                {course.detailedDescription}
              </p>
              
              <div className="flex flex-wrap gap-6 mb-10">
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <BarChart className="w-5 h-5 text-purple-500" />
                  <span>{course.level} {t('course.level')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-5 h-5 text-purple-500" />
                  <span>330+ {t('stats.students')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {isEnrolled ? (
                  <Link 
                    to="/dashboard"
                    className="px-10 py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                  >
                    {t('dashboard.continue')}
                    <ArrowRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                  </Link>
                ) : (
                  <Link 
                    to={`/payment?courseId=${course.id}`}
                    className="px-10 py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                  >
                    {t('courses.getStarted')}
                    <ArrowRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                  </Link>
                )}
                <button className="px-10 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-bold text-lg transition-all border border-purple-900/30 flex items-center justify-center gap-2">
                  <Play className="w-5 h-5 text-purple-500 fill-current" />
                  Watch Trailer
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative aspect-video rounded-3xl overflow-hidden border border-purple-900/30 shadow-2xl shadow-purple-600/10 group"
            >
              <img 
                src={course.image} 
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center shadow-xl shadow-purple-600/40 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
                </div>
              </div>
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
                  {Array.from({ 
                    length: course.id === '1' ? 12 : course.id === '2' ? 18 : 24 
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
                                const isLocked = !isEnrolled && !isFirstSession;
                                
                                return (
                                  <Link 
                                    key={item.type}
                                    to={isLocked ? '#' : `/courses/${course.id}/video/${chapter}/${item.type}`}
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
                                        src={`https://picsum.photos/seed/${course.id}-${chapter}-${item.type}/200/120`}
                                        alt={item.label}
                                        className={`w-full h-full object-cover transition-opacity ${isLocked ? 'opacity-20' : 'opacity-60 group-hover:opacity-100'}`}
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        {isLocked ? (
                                          <Lock className="w-5 h-5 text-gray-600" />
                                        ) : (
                                          <item.icon className="w-5 h-5 text-purple-500" />
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className={`font-bold transition-colors ${isLocked ? 'text-gray-500' : 'text-gray-300 group-hover:text-purple-400'}`}>
                                        {item.label}
                                      </span>
                                      {isFirstSession && !isEnrolled && (
                                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Free Trial</span>
                                      )}
                                    </div>
                                    {isLocked && (
                                      <Lock className="w-4 h-4 text-gray-700 ml-auto" />
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
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
                    <span className="text-gray-300">330+</span>
                  </div>
                </div>

                <div className="mt-10">
                  <div className="text-3xl font-black text-white mb-6">
                    {course.price.toLocaleString()} {course.currency}
                  </div>
                  {isEnrolled ? (
                    <Link 
                      to="/dashboard"
                      className="w-full py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                    >
                      {t('dashboard.continue')}
                      <ArrowRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                    </Link>
                  ) : (
                    <Link 
                      to={`/payment?courseId=${course.id}`}
                      className="w-full py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                    >
                      {t('courses.getStarted')}
                      <ArrowRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                    </Link>
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
