import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Play, FileText, Dumbbell, CheckCircle2, Loader2, Upload, Send, Bot, User, Star, Trash2, Lock, ShieldAlert, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, storage, handleFirestoreError, OperationType, collection, query, where, onSnapshot, addDoc, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc, ref, uploadBytes, getDownloadURL } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

const getLessonVideoUrl = (course: any, chapterStr: string, typeStr: string) => {
  if (!course) return '';
  
  const isVideoEditing = course.id === '1' ||
    course.title?.toLowerCase().includes('video editing') ||
    course.title?.toLowerCase().includes('video-editing') ||
    course.title?.toLowerCase().includes('مونتاج') ||
    course.title?.toLowerCase().includes('cinematic');

  if (isVideoEditing && course.chapters && Array.isArray(course.chapters)) {
    if (typeStr === 'exercise') {
      const chapNum = parseInt(chapterStr);
      const ch = course.chapters.find((c: any) => parseInt(c.position || '0') === chapNum || c.position === chapNum);
      return ch?.exercise_url || '';
    } else {
      // Session
      const sNum = parseInt(chapterStr);
      const chapIdx = Math.floor((sNum - 1) / 4);
      const sIdx = ((sNum - 1) % 4) + 1;
      const ch = course.chapters[chapIdx];
      if (ch) {
        return ch[`session_url_${sIdx}`] || (sIdx === 1 ? ch.session_url : '') || '';
      }
    }
  }

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
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  
  // Homework State
  const [homeworkVideo, setHomeworkVideo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [homeworkLinkInput, setHomeworkLinkInput] = useState('');
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: '10%', left: '10%' });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  // BunnyCDN upload states
  const [bunnyUploading, setBunnyUploading] = useState(false);
  const [bunnyUploadProgress, setBunnyUploadProgress] = useState(0);
  const [exerciseUploads, setExerciseUploads] = useState<any[]>([]);
  const bunnyFileInputRef = useRef<HTMLInputElement>(null);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const isVideoEditingCourse = course && (
    course.id === '1' ||
    course.title?.toLowerCase().includes('video editing') ||
    course.title?.toLowerCase().includes('video-editing') ||
    course.title?.toLowerCase().includes('مونتاج') ||
    course.title?.toLowerCase().includes('cinematic')
  );

  const orderedLessons = useMemo(() => {
    if (!isVideoEditingCourse || !course || !course.chapters) return [];
    
    const list: Array<{ chapter: string; type: string; title: string }> = [];
    course.chapters.forEach((ch: any, cIdx: number) => {
      // Add each session that exists
      if (ch.session_url_1 || (cIdx === 0 && ch.session_url)) {
        const sName = ch.session_name_1 || '';
        list.push({ 
          chapter: String(cIdx * 4 + 1), 
          type: 'session', 
          title: sName ? `Session ${cIdx * 4 + 1}: ${sName}` : `Session ${cIdx * 4 + 1}` 
        });
      }
      if (ch.session_url_2) {
        const sName = ch.session_name_2 || '';
        list.push({ 
          chapter: String(cIdx * 4 + 2), 
          type: 'session', 
          title: sName ? `Session ${cIdx * 4 + 2}: ${sName}` : `Session ${cIdx * 4 + 2}` 
        });
      }
      if (ch.session_url_3) {
        const sName = ch.session_name_3 || '';
        list.push({ 
          chapter: String(cIdx * 4 + 3), 
          type: 'session', 
          title: sName ? `Session ${cIdx * 4 + 3}: ${sName}` : `Session ${cIdx * 4 + 3}` 
        });
      }
      if (ch.session_url_4) {
        const sName = ch.session_name_4 || '';
        list.push({ 
          chapter: String(cIdx * 4 + 4), 
          type: 'session', 
          title: sName ? `Session ${cIdx * 4 + 4}: ${sName}` : `Session ${cIdx * 4 + 4}` 
        });
      }
      
      // Add exercise if it exists
      if (ch.exercise_url) {
        list.push({ chapter: String(ch.position || cIdx + 1), type: 'exercise', title: `Chapter ${ch.position || cIdx + 1} Exercise` });
      }
    });
    return list;
  }, [isVideoEditingCourse, course]);

  const homework = course?.homeworks?.find((h: any) => h.chapter === parseInt(chapter || '0'));
  const isFirstSession = isVideoEditingCourse 
    ? (chapter === '1' && type === 'session')
    : (parseInt(chapter || '0') === 1 && type === 'session');
  const totalChapters = course ? (course.chapters?.length || course.lessons?.length || 12) : 12;
  const types = ['session', 'exercise', 'homework'];

  const currentChapter = parseInt(chapter || '1');
  const currentType = type || 'session';

  // Compute indices for ordered queue if video editing
  const currentLessonIdx = useMemo(() => {
    if (!isVideoEditingCourse) return -1;
    return orderedLessons.findIndex(l => l.chapter === chapter && l.type === type);
  }, [isVideoEditingCourse, orderedLessons, chapter, type]);

  const getNextLessonLink = () => {
    if (isVideoEditingCourse) {
      if (currentLessonIdx !== -1 && currentLessonIdx < orderedLessons.length - 1) {
        const nextL = orderedLessons[currentLessonIdx + 1];
        return `/courses/${id}/video/${nextL.chapter}/${nextL.type}`;
      }
      return '/dashboard';
    }

    const currentChapterNum = parseInt(chapter || '1');
    const currentTypeIndex = types.indexOf(type || 'session');
    
    if (currentTypeIndex < types.length - 1) {
      return `/courses/${id}/video/${currentChapterNum}/${types[currentTypeIndex + 1]}`;
    } else if (currentChapterNum < totalChapters) {
      return `/courses/${id}/video/${currentChapterNum + 1}/session`;
    } else {
      return '/dashboard';
    }
  };
  
  const nextLink = getNextLessonLink();
  const isLastLesson = nextLink === '/dashboard';

  const prevType = currentType === 'homework' ? 'exercise' : currentType === 'exercise' ? 'session' : null;
  const nextType = currentType === 'session' ? 'exercise' : currentType === 'exercise' ? 'homework' : null;

  const prevLessonUrl = isVideoEditingCourse
    ? (currentLessonIdx > 0 ? `/courses/${id}/video/${orderedLessons[currentLessonIdx - 1].chapter}/${orderedLessons[currentLessonIdx - 1].type}` : null)
    : (prevType ? `/courses/${id}/video/${currentChapter}/${prevType}` : null);

  const nextLessonUrl = isVideoEditingCourse
    ? (currentLessonIdx !== -1 && currentLessonIdx < orderedLessons.length - 1 ? `/courses/${id}/video/${orderedLessons[currentLessonIdx + 1].chapter}/${orderedLessons[currentLessonIdx + 1].type}` : null)
    : (nextType ? `/courses/${id}/video/${currentChapter}/${nextType}` : null);
  
  const prevChapterUrl = isVideoEditingCourse ? null : (currentChapter > 1 ? `/courses/${id}/video/${currentChapter - 1}/session` : null);
  const nextChapterUrl = isVideoEditingCourse ? null : (currentChapter < totalChapters ? `/courses/${id}/video/${currentChapter + 1}/session` : null);

  const getPrevLessonText = () => {
    if (isVideoEditingCourse) {
      if (currentLessonIdx > 0) {
        const prevL = orderedLessons[currentLessonIdx - 1];
        if (prevL.type === 'exercise') {
          if (language === 'ar') return `تمرين الفصل ${prevL.chapter}`;
          if (language === 'fr') return `Exercice Ch. ${prevL.chapter}`;
          return `Chapter ${prevL.chapter} Exercise`;
        } else {
          if (language === 'ar') return `الحصة ${prevL.chapter}`;
          if (language === 'fr') return `Session ${prevL.chapter}`;
          return `Session ${prevL.chapter}`;
        }
      }
      return '';
    }

    if (currentType === 'exercise') {
      if (language === 'ar') return 'الرجوع إلى الحصة';
      if (language === 'fr') return 'Retour à la Session';
      return 'Go back to Session';
    }
    if (currentType === 'homework') {
      if (language === 'ar') return 'الرجوع إلى التمرين';
      if (language === 'fr') return 'Retour à l’Exercice';
      return 'Go back to Exercise';
    }
    return '';
  };

  const getNextLessonText = () => {
    if (isVideoEditingCourse) {
      if (currentLessonIdx !== -1 && currentLessonIdx < orderedLessons.length - 1) {
        const nextL = orderedLessons[currentLessonIdx + 1];
        if (nextL.type === 'exercise') {
          if (language === 'ar') return `تمرين الفصل ${nextL.chapter}`;
          if (language === 'fr') return `Exercice Ch. ${nextL.chapter}`;
          return `Chapter ${nextL.chapter} Exercise`;
        } else {
          if (language === 'ar') return `الحصة ${nextL.chapter}`;
          if (language === 'fr') return `Session ${nextL.chapter}`;
          return `Session ${nextL.chapter}`;
        }
      }
      return '';
    }

    if (currentType === 'session') {
      if (language === 'ar') return 'الذهاب للتمرين';
      if (language === 'fr') return 'Aller à l’Exercice';
      return 'Go to Exercise';
    }
    if (currentType === 'exercise') {
      if (language === 'ar') return 'الذهاب للتطبيق المنزلي';
      if (language === 'fr') return 'Aller au Devoir';
      return 'Go to Homework';
    }
    return '';
  };

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

  // Window focus and tab switch detection for pausing playback
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
    };
    
    const handleBlur = () => {
      // Delay slightly because document.activeElement might take a split second to update
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'IFRAME') {
          // If focus shifted to the video player iframe itself, do not pause content
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

  // Exercise submissions subscription
  useEffect(() => {
    if (!user || !id || !chapter) return;

    const qSubmissions = query(
      collection(db, 'exercise_submissions'),
      where('uid', '==', user.uid),
      where('courseId', '==', id),
      where('chapter', '==', parseInt(chapter))
    );

    const unsubSubmissions = onSnapshot(qSubmissions, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = list.sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setExerciseUploads(sorted);
    }, (error) => {
      console.error("Exercise submissions subscription error:", error);
    });

    return () => unsubSubmissions();
  }, [user, id, chapter]);

  const handleBunnyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setBunnyUploading(true);
    setBunnyUploadProgress(10);
    try {
      setBunnyUploadProgress(20);
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: file.name })
      });

      if (!signRes.ok) {
        throw new Error('Failed to obtain upload authorization details from server.');
      }
      const signData = await signRes.json();
      setBunnyUploadProgress(45);

      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(errText || 'Failed to transfer file to Bunny.');
      }

      const uploadResult = await uploadRes.json();
      setBunnyUploadProgress(80);

      if (user && id && chapter) {
        await addDoc(collection(db, 'exercise_submissions'), {
          uid: user.uid,
          courseId: id,
          chapter: parseInt(chapter),
          name: file.name,
          downloadUrl: uploadResult.publicUrl,
          uploadedAt: new Date().toISOString()
        });
      }

      setBunnyUploadProgress(100);
      setTimeout(() => {
        setBunnyUploadProgress(0);
        setBunnyUploading(false);
      }, 1000);

      alert(`"${file.name}" uploaded successfully! It is registered in your exercise submissions.`);
    } catch (err: any) {
      console.error('Bunny upload failed:', err);
      alert(`Upload failed: ${err.message || err}`);
      setBunnyUploading(false);
      setBunnyUploadProgress(0);
    }
  };

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

      setShowSuccessAlert(true);
      setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4500);
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
              <div className="w-full h-full transition-all duration-500">
                
                {/* Tiled Watermark Background */}
                {(isEnrolled || isFirstSession) && (
                  <div className="absolute inset-0 z-10 pointer-events-none select-none grid grid-cols-3 grid-rows-3 gap-2 p-4 overflow-hidden">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-center -rotate-12 opacity-[0.03] text-[9px] sm:text-xs font-mono text-white whitespace-nowrap">
                        {user?.email || 'Student'} • {user?.uid?.slice(0, 8)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Security Floating Watermark Badge when active */}
                <AnimatePresence>
                  {(isEnrolled || isFirstSession) ? (
                    <motion.div
                      animate={{ top: watermarkPos.top, left: watermarkPos.left }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                      className="absolute z-35 pointer-events-none select-none opacity-25 text-[10px] font-mono text-white whitespace-nowrap bg-black/30 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1.5 shadow"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <span>{user?.email}</span>
                      <span className="text-gray-500 font-bold">•</span>
                      <span>SECURED STREAM</span>
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
                    {isWindowFocused ? (
                      <iframe
                        src={getLessonVideoUrl(course, chapter || '1', type || 'session')}
                        title={`Chapter ${chapter}: ${typeLabels[type || 'session']}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    ) : (
                      <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none">
                        <ShieldAlert className="w-10 h-10 text-purple-500 animate-pulse mb-3" />
                        <p className="text-xs font-black text-white uppercase tracking-widest">Playback Paused</p>
                        <p className="text-[10px] text-gray-500 mt-1 max-w-xs leading-normal">
                          Focus on the web browser window or click below to resume video content.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Autopause Protection Overlay Modal */}
              <AnimatePresence>
                {!isWindowFocused && (isEnrolled || isFirstSession) && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center p-8 bg-zinc-950 border border-purple-500/20 rounded-[2rem] max-w-sm mx-auto shadow-2xl relative"
                    >
                      <ShieldAlert className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-bounce shrink-0" />
                      <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wider">Playback Paused</h3>
                      <p className="text-xs text-gray-400 leading-relaxed mb-6">
                        Course content protection active. Video playback is auto-paused when you toggle tabs or switch applications.
                      </p>
                      <button
                        onClick={() => setIsWindowFocused(true)}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-purple-600/10 cursor-pointer"
                      >
                        Resume Lesson
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </motion.div>

            <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-6 md:p-8 mb-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-purple-900/20 mb-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black mb-1 flex items-center gap-3">
                    <Icon className="w-8 h-8 text-purple-500 shrink-0" />
                    {isVideoEditingCourse ? (
                      type === 'exercise' ? (
                        language === 'ar' ? `تمرين تطبيق الفصل ${chapter}` : language === 'fr' ? `Exercice Pratique Ch. ${chapter}` : `Chapter ${chapter} Practice Exercise`
                      ) : (
                        orderedLessons.find(l => l.chapter === chapter && l.type === 'session')?.title || `Session ${chapter}`
                      )
                    ) : (
                      `Chapter ${chapter}: ${typeLabels[type || 'session']}`
                    )}
                  </h1>
                  <p className="text-gray-400 text-sm">{course.title}</p>
                </div>
                
                {/* Chapter jump controls */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {prevChapterUrl && (
                    <Link
                      to={prevChapterUrl}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-purple-950/40 text-[11px] font-bold uppercase rounded-xl transition-all flex items-center gap-1.5 text-gray-300"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      {language === 'ar' ? `العودة للفصل ${currentChapter - 1}` : language === 'fr' ? `Retour au Ch. ${currentChapter - 1}` : `Back to Ch. ${currentChapter - 1}`}
                    </Link>
                  )}
                  {nextChapterUrl && (
                    <Link
                      to={nextChapterUrl}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-purple-950/40 text-[11px] font-bold uppercase rounded-xl transition-all flex items-center gap-1.5 text-gray-300 ml-auto md:ml-0"
                    >
                      {language === 'ar' ? `الذهاب للفصل ${currentChapter + 1}` : language === 'fr' ? `Aller au Ch. ${currentChapter + 1}` : `Next Ch. ${currentChapter + 1}`}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Lesson switcher arrows inside the chapter */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  {prevLessonUrl ? (
                    <Link
                      to={prevLessonUrl}
                      className="flex items-center gap-3 p-4 bg-zinc-900 hover:bg-purple-950/20 hover:border-purple-500/30 border border-purple-900/10 rounded-2xl transition-all group text-left h-full"
                    >
                      <ArrowLeft className="w-5 h-5 text-purple-400 group-hover:-translate-x-1 transition-transform shrink-0" />
                      <div>
                        <div className="text-[9px] uppercase font-black tracking-widest text-purple-400">
                          {language === 'ar' ? 'الدرس السابق' : language === 'fr' ? 'Leçon Précédente' : 'Previous Lesson'}
                        </div>
                        <div className="text-xs md:text-sm font-bold text-white mt-0.5">{getPrevLessonText()}</div>
                      </div>
                    </Link>
                  ) : <div className="h-full min-h-[70px] bg-zinc-900/10 border border-dashed border-zinc-900/35 rounded-2xl flex items-center justify-center text-[10px] text-gray-600 font-bold uppercase tracking-wider">{language === 'ar' ? 'بداية الفصل' : language === 'fr' ? 'Début' : 'Start of Chapter'}</div>}
                </div>

                <div>
                  {nextLessonUrl ? (
                    <Link
                      to={nextLessonUrl}
                      className="flex items-center justify-between p-4 bg-zinc-900 hover:bg-purple-950/20 hover:border-purple-500/30 border border-purple-900/10 rounded-2xl transition-all group text-right h-full"
                    >
                      <div className="ml-auto pr-3">
                        <div className="text-[9px] uppercase font-black tracking-widest text-purple-400">
                          {language === 'ar' ? 'الدرس التالي' : language === 'fr' ? 'Leçon Suivante' : 'Next Lesson'}
                        </div>
                        <div className="text-xs md:text-sm font-bold text-white mt-0.5">{getNextLessonText()}</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                  ) : <div className="h-full min-h-[70px] bg-zinc-900/10 border border-dashed border-zinc-900/35 rounded-2xl flex items-center justify-center text-[10px] text-gray-600 font-bold uppercase tracking-wider">{language === 'ar' ? 'نهاية الفصل' : language === 'fr' ? 'Fin' : 'End of Chapter'}</div>}
                </div>
              </div>

              {/* Mark as Complete and primary Progress controller under them */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-purple-900/10">
                <button 
                  onClick={handleMarkComplete}
                  disabled={isCompleted || submitting || loading}
                  className={`w-full sm:w-auto px-8 py-3 bg-zinc-900 hover:bg-zinc-800 border border-purple-900/30 rounded-2xl transition-all text-sm font-bold flex items-center justify-center gap-2.5 ${
                    isCompleted 
                      ? 'bg-green-600/15 text-green-400 border-green-500/20 shadow-lg shadow-green-500/5' 
                      : 'text-white'
                  } disabled:opacity-50`}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  ) : null}
                  {isCompleted ? t('course.completed') : t('course.markComplete')}
                </button>

                {isCompleted && (
                  <Link
                    to={nextLink}
                    className="w-full sm:w-auto px-8 py-3 bg-brand-radial hover:opacity-95 text-white rounded-2xl transition-all text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-purple-600/20"
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

               {type === 'exercise' && (
                <div className="pt-6 border-t border-purple-900/20">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
                    <Upload className="w-5 h-5 text-purple-400" />
                    Upload Exercise Submission
                  </h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Submit your completed design project draft or video reference file to your cloud workspace portfolio.
                  </p>

                  <input 
                    type="file" 
                    ref={bunnyFileInputRef} 
                    className="hidden" 
                    onChange={handleBunnyFileUpload} 
                  />

                  {exerciseUploads && exerciseUploads.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {exerciseUploads.map((item: any) => (
                        <div key={item.id} className="bg-black/40 border border-purple-900/25 p-4 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-white truncate max-w-[140px]" title={item.name}>{item.name}</div>
                              <div className="text-[10px] text-gray-500">Uploaded on {new Date(item.uploadedAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <a 
                            href={item.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-purple-900/10 hover:bg-purple-900/20 border border-purple-900/40 text-purple-300 font-bold text-xs px-3 py-2 rounded-lg transition-colors"
                          >
                            View Submission
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={bunnyUploading}
                    onClick={() => bunnyFileInputRef.current?.click()}
                    className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-950/20"
                  >
                    {bunnyUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Uploading {bunnyUploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>upload homework</span>
                      </>
                    )}
                  </button>
                </div>
              )}

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

      {/* Animated Custom Success Toast */}
      <AnimatePresence>
        {showSuccessAlert && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed top-24 right-4 sm:right-8 z-50 max-w-sm w-full bg-zinc-950/95 backdrop-blur-md border-2 border-purple-500/30 rounded-2xl p-5 shadow-[0_20px_50px_rgba(147,51,234,0.3)] flex items-start gap-4 animate-in fade-in zoom-in-95"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-grow text-left">
              <div className="font-extrabold text-sm text-white">Lesson Completed!</div>
              <div className="text-xs text-gray-400 mt-1">Your chapter progress has been successfully updated. Continue on to build your legendary skill portfolio!</div>
            </div>
            <button
              onClick={() => setShowSuccessAlert(false)}
              className="text-gray-500 hover:text-white transition-colors text-[10px] font-bold p-1 shrink-0"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
