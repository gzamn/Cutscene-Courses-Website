import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Play, FileText, Dumbbell, CheckCircle2, Loader2, Upload, Send, Bot, User, Star, Trash2, Lock, ShieldAlert, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, storage, handleFirestoreError, OperationType, collection, query, where, onSnapshot, addDoc, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc, ref, uploadBytes, getDownloadURL } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

const getLessonVideoUrl = (course: any, chapterStr: string, typeStr: string) => {
  if (!course) return '';
  
  // 1. Try to find in flat lessons array (e.g. { chapter: 1, type: 'session', video_url: '...' })
  if (course.lessons && Array.isArray(course.lessons)) {
    const lesson = course.lessons.find((l: any) => 
      parseInt(l.chapter) === parseInt(chapterStr) && 
      (l.type === typeStr || l.id === typeStr)
    );
    if (lesson && lesson.video_url) return lesson.video_url;
  }

  // 2. Try to find in chapters array (e.g. { title: 'Intro', lessons: [{ type: 'session', video_url: '...' }] })
  if (course.chapters && Array.isArray(course.chapters)) {
    const chapterIdx = parseInt(chapterStr) - 1;
    const targetChapter = course.chapters[chapterIdx];
    if (targetChapter && targetChapter.lessons && Array.isArray(targetChapter.lessons)) {
      const lesson = targetChapter.lessons.find((l: any) => 
        l.type === typeStr || l.id === typeStr
      );
      if (lesson && lesson.video_url) return lesson.video_url;
    }
  }

  // 3. Fallback to top-level video_url coordinate if present on the document itself
  if (course.video_url) return course.video_url;

  return '';
};

export default function VideoPlayer() {
  const { id, chapter, type } = useParams<{ id: string; chapter: string; type: string }>();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Homework State
  const [homeworkVideo, setHomeworkVideo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [homeworkLinkInput, setHomeworkLinkInput] = useState('');
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: '10%', left: '10%' });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const homework = course?.homeworks?.find((h: any) => h.chapter === parseInt(chapter || '0'));
  const isFirstSession = parseInt(chapter || '0') === 1 && type === 'session';
  const totalChapters = course ? (course.chapters?.length || course.lessons?.length || 12) : 12;
  const types = ['session', 'exercise', 'homework'];
  
  const getNextLessonLink = () => {
    const currentChapter = parseInt(chapter || '1');
    const currentTypeIndex = types.indexOf(type || 'session');
    
    if (currentTypeIndex < types.length - 1) {
      return `/courses/${id}/video/${currentChapter}/${types[currentTypeIndex + 1]}`;
    } else if (currentChapter < totalChapters) {
      return `/courses/${id}/video/${currentChapter + 1}/session`;
    } else {
      return '/dashboard';
    }
  };
  
  const nextLink = getNextLessonLink();
  const isLastLesson = nextLink === '/dashboard';

  // Watermark movement
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({
        top: `${Math.floor(Math.random() * 80) + 5}%`,
        left: `${Math.floor(Math.random() * 80) + 5}%`
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Window focus detection
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => {
      // Delay slightly to evaluate the activeElement after focus shift is resolved
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'IFRAME') {
          // Ignore if focus is inside the video stream iframe to keep actions like play/pause uninterrupted
          return;
        }
        setIsWindowFocused(false);
      }, 200);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsWindowFocused(false);
      } else {
        setIsWindowFocused(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Screenshot deterrents
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        alert('Screenshots are disabled for security reasons.');
      }
      // Block Cmd+Shift+3/4 (Mac) - limited but deterrent
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4')) {
        console.warn('Screenshot shortcut detected');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (videoContainerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    if (!id || !chapter || !type) {
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    // Fetch Course doc from Firestore
    const fetchCourse = async () => {
      try {
        const courseRef = doc(db, 'courses', id);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists() && isSubscribed) {
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
                title: ch.title,
                position: ch.position,
                is_preview: ch.is_preview,
                lessons: [
                  { id: "session", type: "session", title: "Session Video", video_url: ch.session_url || "" },
                  { id: "exercise", type: "exercise", title: "Exercise Video", video_url: ch.exercise_url || "" },
                  { id: "homework", type: "homework", title: "Homework Video", video_url: ch.homework_url || "" }
                ]
              };
            }).sort((a, b) => (a.position || 0) - (b.position || 0));
          } else {
            chaptersData = data.chapters || [];
          }

          setCourse({ id: courseSnap.id, ...data, chapters: chaptersData });
        }
      } catch (error) {
        console.error('Error fetching course:', error);
      }
    };
    fetchCourse();

    // Check enrollment
    let unsubEnrollment = () => {};
    let unsubProgress = () => {};
    let unsubVideos = () => {};

    if (user) {
      const qEnrollment = query(collection(db, 'enrollments'), where('uid', '==', user.uid), where('courseId', '==', id));
      unsubEnrollment = onSnapshot(qEnrollment, (snap) => {
        if (isSubscribed) {
          if (snap.empty) {
            setIsEnrolled(false);
          } else {
            const anyPaid = snap.docs.some(docSnap => docSnap.data().paid === true);
            setIsEnrolled(anyPaid);
          }
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'enrollments'));

      // Listen to lesson progress
      const lessonId = `${user.uid}-${id}-${chapter}-${type}`;
      const progressRef = doc(db, 'progress', lessonId);
      unsubProgress = onSnapshot(progressRef, (snapshot) => {
        if (isSubscribed) {
          if (snapshot.exists()) {
            setIsCompleted(snapshot.data().completed);
          } else {
            setIsCompleted(false);
          }
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'progress'));

      // Listen to homework video
      if (type === 'homework') {
        const qVideos = query(
          collection(db, 'homework_submissions'),
          where('uid', '==', user.uid),
          where('courseId', '==', id),
          where('chapter', '==', parseInt(chapter))
        );
        unsubVideos = onSnapshot(qVideos, (snap) => {
          if (isSubscribed) {
            if (!snap.empty) {
              setHomeworkVideo({ id: snap.docs[0].id, ...snap.docs[0].data() });
            } else {
              setHomeworkVideo(null);
            }
          }
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'homework_submissions'));
      }
    } else {
      setIsEnrolled(false);
      setIsCompleted(false);
    }

    const timer = setTimeout(() => {
      if (isSubscribed) setLoading(false);
    }, 1200);

    return () => {
      isSubscribed = false;
      unsubEnrollment();
      unsubProgress();
      unsubVideos();
      clearTimeout(timer);
    };
  }, [user, id, chapter, type]);

  // Comments real-time subscription
  useEffect(() => {
    if (!id || !chapter) return;

    const qComments = query(
      collection(db, 'comments'),
      where('courseId', '==', id),
      where('chapter', '==', parseInt(chapter))
    );

    const unsubComments = onSnapshot(qComments, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setComments(sorted);
    }, (error) => {
      console.error("Comments subscription error: ", error);
    });

    return () => unsubComments();
  }, [id, chapter]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !chapter || !commentInput.trim()) return;

    setSubmittingComment(true);
    try {
      const commentRef = doc(collection(db, 'comments'));
      const commentId = commentRef.id;

      await setDoc(commentRef, {
        id: commentId,
        courseId: id,
        chapter: parseInt(chapter),
        uid: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Student',
        userAvatar: user.photoURL || '',
        content: commentInput.trim(),
        createdAt: new Date().toISOString()
      });

      setCommentInput('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment.');
    }
  };

  const handleMarkComplete = async () => {
    if (!user || !id || !chapter || !type) return;
    if (!isEnrolled && !isFirstSession) return;
    
    setSubmitting(true);
    try {
      const lessonId = `${user.uid}-${id}-${chapter}-${type}`;
      const progressRef = doc(db, 'progress', lessonId);
      
      await setDoc(progressRef, {
        uid: user.uid,
        courseId: id,
        chapter: parseInt(chapter),
        type: type,
        completed: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert(t('course.markedComplete'));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'progress');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHomeworkLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeworkLinkInput.trim() || !user || !id || !chapter) return;

    setUploading(true);
    try {
      const url = homeworkLinkInput.trim();
      let label = "Project Link";
      try {
        const parsed = new URL(url);
        label = parsed.hostname.replace('www.', '') + ' Link';
      } catch {
        label = "Submission Link";
      }

      await addDoc(collection(db, 'homework_submissions'), {
        uid: user.uid,
        courseId: id,
        chapter: parseInt(chapter),
        url,
        fileName: label,
        createdAt: new Date().toISOString()
      });
      setHomeworkLinkInput('');
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Submission failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteHomework = async () => {
    if (!homeworkVideo || !window.confirm('Delete this submission?')) return;
    try {
      await deleteDoc(doc(db, 'homework_submissions', homeworkVideo.id));
      setHomeworkVideo(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'homework_submissions');
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

  const typeLabels: Record<string, string> = {
    session: t('course.session'),
    exercise: t('course.exercise'),
    homework: t('course.homework')
  };

  const typeIcons: Record<string, any> = {
    session: Play,
    exercise: Dumbbell,
    homework: FileText
  };

  const Icon = typeIcons[type || 'session'] || Play;

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link 
          to={`/courses/${id}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className={`w-5 h-5 group-hover:-translate-x-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
          {t('course.back')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <motion.div 
              ref={videoContainerRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-video bg-zinc-900 rounded-3xl overflow-hidden border border-purple-900/30 shadow-2xl shadow-purple-600/10 mb-8 select-none"
            >
              {/* Blur-bounded content wrapper */}
              <div className={`w-full h-full transition-all duration-500 ${!isWindowFocused ? 'blur-2xl scale-98 pointer-events-none select-none opacity-40' : ''}`}>
                
                {/* Security Watermark when active */}
                <AnimatePresence>
                  {isEnrolled || isFirstSession ? (
                    <motion.div
                      animate={{ top: watermarkPos.top, left: watermarkPos.left }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                      className="absolute z-30 pointer-events-none select-none opacity-20 text-[10px] font-mono text-white whitespace-nowrap bg-black/20 px-2 py-1 rounded-md border border-white/5"
                    >
                      {user?.email} • {user?.uid.slice(0, 8)} • PROTECTED CONTENT
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* YouTube Video Player or Locker info */}
                {(!isEnrolled && !isFirstSession) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm z-20 p-8 text-center">
                    <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mb-6 border border-purple-500/30">
                      <Lock className="w-10 h-10 text-purple-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{t('course.lockedTitle')}</h2>
                    <p className="text-gray-400 max-w-md mb-8">
                      {t('course.lockedDesc')}
                    </p>
                    <Link 
                      to={`/payment?courseId=${course.id}`}
                      className="px-8 py-3 bg-brand-radial text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2"
                    >
                      {t('course.unlock')}
                      <ArrowRight className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
                    </Link>
                  </div>
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-black">
                    <iframe
                      src={getLessonVideoUrl(course, chapter || '1', type || 'session')}
                      title={`Chapter ${chapter}: ${typeLabels[type || 'session']}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                )}
              </div>

              {/* CRISP & UNBLURRED Security Warning Overlay on Blur */}
              {!isWindowFocused && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                  <div className="text-center p-6 bg-zinc-950/90 border border-purple-500/20 rounded-3xl max-w-sm mx-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <ShieldAlert className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wider">Content Protected</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Cutscene academy content is protected with live digital watermark security. Click anywhere on this page to continue playing.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <Icon className="w-8 h-8 text-purple-500" />
                  Chapter {chapter}: {typeLabels[type || 'session']}
                </h1>
                <p className="text-gray-400">{course.title}</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleMarkComplete}
                  disabled={isCompleted || submitting || loading}
                  className={`px-6 py-2 border border-purple-900/30 rounded-xl transition-all text-sm font-bold flex items-center gap-2 ${
                    isCompleted 
                      ? 'bg-green-600/20 text-green-500 border-green-500/30' 
                      : 'bg-zinc-900 hover:bg-zinc-800'
                  } disabled:opacity-50`}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : null}
                  {isCompleted ? t('course.completed') : t('course.markComplete')}
                </button>

                {isCompleted && (
                  <Link
                    to={nextLink}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all text-sm font-bold flex items-center gap-2 shadow-lg shadow-purple-600/20"
                  >
                    {isLastLesson ? t('dashboard.return') || 'Return to Dashboard' : t('course.nextLesson') || 'Next Lesson'}
                    <ArrowRight className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
                  </Link>
                )}
              </div>
            </div>

            <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 mb-8">
              <h2 className="text-xl font-bold mb-4">{t('course.about')} {typeLabels[type || 'session']}</h2>
              <div className="text-gray-400 leading-relaxed mb-6">
                {type === 'homework' && homework ? (
                  <>
                    <span className="block font-bold text-white mb-2">{t('course.task')}:</span>
                    {homework.description}
                    <span className="block font-bold text-white mt-4 mb-2">{t('course.expectedOutcome')}:</span>
                    {homework.expectedOutcome}
                  </>
                ) : (
                  <p>
                    {t('course.lessonDesc')} {chapter}. 
                    Make sure to follow along and take notes. If you have any questions, feel free to reach out to our support team.
                  </p>
                )}
              </div>

              {type === 'homework' && (
                <div className="pt-6 border-t border-purple-900/20">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-purple-500" />
                    {t('course.submitWork')}
                  </h3>
                  
                  {homeworkVideo ? (
                    <div className="bg-black/40 border border-purple-900/20 p-6 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                          <Play className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{homeworkVideo.fileName}</div>
                          <div className="text-xs text-gray-500">Submitted on {new Date(homeworkVideo.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <button 
                        onClick={deleteHomework}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleHomeworkLinkSubmit} className="space-y-4">
                      <div>
                        <div className="flex gap-3">
                          <input 
                            type="url" 
                            required
                            placeholder="e.g. https://youtube.com/watch?v=... or https://drive.google.com/..."
                            value={homeworkLinkInput}
                            onChange={(e) => setHomeworkLinkInput(e.target.value)}
                            disabled={uploading}
                            className="flex-grow bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <button
                            type="submit"
                            disabled={uploading || !homeworkLinkInput.trim()}
                            className="px-6 py-3 bg-purple-650 hover:bg-purple-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {uploading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Submit'
                            )}
                          </button>
                        </div>
                        <span className="block text-[10px] text-gray-500 mt-1.5">{t('course.uploadLinkHint') || 'Paste direct link to your video or image asset.'}</span>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Chapter Comments Discussion Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 shadow-xl"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                {t('comments.discussion') || 'Chapter Discussion'} ({comments.length})
              </h2>

              {/* Comment submission form */}
              {user ? (
                <form onSubmit={handleAddComment} className="mb-8">
                  <div className="relative">
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder={t('comments.placeholder') || "Share your thoughts about this chapter..."}
                      disabled={submittingComment}
                      rows={3}
                      className="w-full bg-zinc-900 border border-purple-900/20 rounded-2xl p-4 pr-12 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!commentInput.trim() || submittingComment}
                      className="absolute bottom-4 right-4 p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-purple-600 flex items-center justify-center"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-purple-900/10 border border-purple-900/20 rounded-2xl text-center text-sm text-purple-300 mb-8">
                  Please log in to leave a comment.
                </div>
              )}

              {/* Comments list */}
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {t('comments.empty') || "No comments yet. Start the conversation!"}
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isAuthor = user && user.uid === comment.uid;
                    const nameInitial = comment.userName ? comment.userName.charAt(0).toUpperCase() : 'S';

                    return (
                      <div key={comment.id} className="flex gap-4 p-4 bg-zinc-900/30 border border-purple-900/10 rounded-2xl relative group">
                        {comment.userAvatar ? (
                          <img 
                            src={comment.userAvatar} 
                            alt={comment.userName} 
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-900/40 border border-purple-500/20 flex items-center justify-center text-purple-300 font-bold shrink-0">
                            {nameInitial}
                          </div>
                        )}
                        <div className="flex-grow">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-sm text-gray-200">{comment.userName}</span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                        </div>

                        {isAuthor && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Delete comment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>

          <div className="space-y-8">
            <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6">{t('course.resources')}</h3>
              <div className="space-y-4">
                <a href="#" className="flex items-center justify-between p-4 bg-zinc-900/50 border border-purple-900/20 rounded-2xl hover:bg-zinc-900 transition-colors group">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-medium">Chapter {chapter} Notes.pdf</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-gray-600 group-hover:text-purple-500 transition-colors" />
                </a>
                <a href="#" className="flex items-center justify-between p-4 bg-zinc-900/50 border border-purple-900/20 rounded-2xl hover:bg-zinc-900 transition-colors group">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-medium">Exercise Assets.zip</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-gray-600 group-hover:text-purple-500 transition-colors" />
                </a>
              </div>
            </div>

            <div className="bg-brand-radial p-8 rounded-3xl border border-purple-500/30 shadow-lg shadow-purple-600/20">
              <h3 className="text-xl font-bold mb-4">{t('course.needHelp')}</h3>
              <p className="text-purple-100/70 text-sm mb-6 leading-relaxed">
                {t('course.helpDesc')}
              </p>
              <Link 
                to="/support"
                className="w-full py-3 bg-white text-purple-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
              >
                {t('course.contactSupport')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
