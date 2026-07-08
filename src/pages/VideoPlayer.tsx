import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Play, FileText, Dumbbell, CheckCircle2, Loader2, Upload, Send, Bot, User, Star, Trash2, Lock, ShieldAlert, MessageSquare, Bell, Clock, Edit2, Save, X, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, storage, handleFirestoreError, OperationType, collection, query, where, onSnapshot, addDoc, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc, ref, uploadBytes, getDownloadURL } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { SparkleButton, RainbowButton } from '../components/AnimatedButtons';

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
      let foundSession: any = null;
      let currentGlobalIdx = 0;
      
      for (const ch of course.chapters) {
        let sessionsList: Array<{ url: string; name: string }> = [];
        if (Array.isArray(ch.sessions)) {
          sessionsList = ch.sessions.filter((s: any) => s.url);
        } else {
          sessionsList = [
            { url: ch.session_url_1 || (course.chapters.indexOf(ch) === 0 && !ch.session_url_1 ? ch.session_url : ""), name: ch.session_name_1 || ch.session_name || '' },
            { url: ch.session_url_2 || '', name: ch.session_name_2 || '' },
            { url: ch.session_url_3 || '', name: ch.session_name_3 || '' },
            { url: ch.session_url_4 || '', name: ch.session_name_4 || '' }
          ].filter(s => s.url);
        }
        
        const match = sessionsList.find(() => {
          currentGlobalIdx++;
          return currentGlobalIdx === sNum;
        });
        if (match) {
          foundSession = match;
          break;
        }
      }
      if (foundSession) {
        return foundSession.url || '';
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
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<any>(null);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [quizPassed, setQuizPassed] = useState<boolean>(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [prevQuizPassed, setPrevQuizPassed] = useState<boolean>(true);
  const [checkingQuiz, setCheckingQuiz] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  
  // Personal notes states
  const [personalNotes, setPersonalNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [lastSavedNotesTime, setLastSavedNotesTime] = useState<string | null>(null);
  
  // Homework State
  const [homeworkVideo, setHomeworkVideo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [homeworkLinkInput, setHomeworkLinkInput] = useState('');
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: '10%', left: '10%' });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  // Resource states & references
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Watch progress states & refs
  const [initialSeekTime, setInitialSeekTime] = useState<number | null>(null);
  const lastSavedTimeRef = useRef<number>(0);

  // BunnyCDN upload states
  const [bunnyUploading, setBunnyUploading] = useState(false);
  const [bunnyUploadProgress, setBunnyUploadProgress] = useState(0);
  const [exerciseUploads, setExerciseUploads] = useState<any[]>([]);
  const bunnyFileInputRef = useRef<HTMLInputElement>(null);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [attachTimestamp, setAttachTimestamp] = useState<boolean>(true);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState<string>('');
  const [editingCommentTimestamp, setEditingCommentTimestamp] = useState<number | null>(null);
  const progressTimelineRef = useRef<HTMLDivElement>(null);

  const seekTo = (seconds: number) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true]
        }),
        '*'
      );
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTimelineRef.current || !videoDuration) return;
    const rect = progressTimelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const seekSeconds = percentage * videoDuration;
    seekTo(seekSeconds);
    setVideoCurrentTime(seekSeconds);
  };

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
    let globalSessionIndex = 0;
    
    course.chapters.forEach((ch: any, cIdx: number) => {
      // Find sessions dynamically
      let sessionsList: Array<{ url: string; name: string }> = [];
      if (Array.isArray(ch.sessions)) {
        sessionsList = ch.sessions.filter((s: any) => s.url);
      } else {
        const legacy = [
          { url: ch.session_url_1 || (cIdx === 0 && !ch.session_url_1 ? ch.session_url : ""), name: ch.session_name_1 || ch.session_name || '' },
          { url: ch.session_url_2 || '', name: ch.session_name_2 || '' },
          { url: ch.session_url_3 || '', name: ch.session_name_3 || '' },
          { url: ch.session_url_4 || '', name: ch.session_name_4 || '' }
        ].filter(s => s.url);
        sessionsList = legacy;
      }

      sessionsList.forEach((s) => {
        globalSessionIndex++;
        list.push({
          chapter: String(globalSessionIndex),
          type: 'session',
          title: s.name ? `Session ${globalSessionIndex}: ${s.name}` : `Session ${globalSessionIndex}`
        });
      });
      
    });
    return list;
  }, [isVideoEditingCourse, course]);

  const homework = course?.homeworks?.find((h: any) => h.chapter === parseInt(chapter || '0'));
  const isFirstSession = isVideoEditingCourse 
    ? (chapter === '1' && type === 'session')
    : (parseInt(chapter || '0') === 1 && type === 'session');
  const totalChapters = course ? (course.chapters?.length || course.lessons?.length || 12) : 12;
  const types = ['session', 'homework'];

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

  const prevType = currentType === 'homework' ? 'session' : null;
  const nextType = currentType === 'session' ? 'homework' : null;

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
        if (language === 'ar') return `الحصة ${prevL.chapter}`;
        if (language === 'fr') return `Session ${prevL.chapter}`;
        return `Session ${prevL.chapter}`;
      }
      return '';
    }

    if (currentType === 'homework') {
      if (language === 'ar') return 'الرجوع إلى الحصة';
      if (language === 'fr') return 'Retour à la Session';
      return 'Go back to Session';
    }
    return '';
  };

  const getNextLessonText = () => {
    if (isVideoEditingCourse) {
      if (currentLessonIdx !== -1 && currentLessonIdx < orderedLessons.length - 1) {
        const nextL = orderedLessons[currentLessonIdx + 1];
        if (language === 'ar') return `الحصة ${nextL.chapter}`;
        if (language === 'fr') return `Session ${nextL.chapter}`;
        return `Session ${nextL.chapter}`;
      }
      return '';
    }

    if (currentType === 'session') {
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

  // Window focus and tab switch detection for pausing playback (disabled to prevent annoying reloads)
  useEffect(() => {
    setIsWindowFocused(true);
  }, []);



  // Hook up event listeners for fullscreen mode transitions (all engines supported)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const [videoDuration, setVideoDuration] = useState<number>(600);

  // Listen to postMessage infoDelivery events emitted by the YouTube player iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let msgData = event.data;
        if (typeof msgData === 'string') {
          msgData = JSON.parse(msgData);
        }
        
        if (msgData.event === 'infoDelivery' && msgData.info) {
          if (typeof msgData.info.currentTime === 'number') {
            setVideoCurrentTime(msgData.info.currentTime);
          }
          if (typeof msgData.info.duration === 'number') {
            setVideoDuration(msgData.info.duration);
          }
        }
      } catch (err) {
        // Safe to ignore non-JSON or unrelated messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Save/Update "Continue Watching" progress in local storage & Firestore
  useEffect(() => {
    if (!course || !id || !chapter || !type || videoCurrentTime <= 5) return;

    // Determine lesson title
    let lessonTitle = '';
    if (isVideoEditingCourse) {
      if (type === 'exercise') {
        lessonTitle = language === 'ar' ? `تمرين تطبيق الفصل ${chapter}` : language === 'fr' ? `Exercice Pratique Ch. ${chapter}` : `Chapter ${chapter} Practice Exercise`;
      } else {
        lessonTitle = orderedLessons.find((l: any) => String(l.chapter) === String(chapter) && l.type === 'session')?.title || `Session ${chapter}`;
      }
    } else {
      lessonTitle = `Chapter ${chapter}: ${type === 'exercise' ? 'Practice Exercise' : type === 'homework' ? 'Homework Video' : 'Session Video'}`;
    }

    const item = {
      courseId: id,
      courseTitle: course.title || '',
      chapter: chapter,
      type: type,
      currentTime: videoCurrentTime,
      duration: videoDuration || 600,
      thumbnail: course.image || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=400',
      lessonTitle: lessonTitle,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('continue_watching', JSON.stringify(item));

    // Save to Firestore periodically (every 5 seconds)
    if (user && Math.abs(videoCurrentTime - lastSavedTimeRef.current) >= 5) {
      lastSavedTimeRef.current = videoCurrentTime;
      const lessonId = `${user.uid}-${id}-${chapter}-${type}`;
      const progressRef = doc(db, 'progress', lessonId);
      
      setDoc(progressRef, {
        uid: user.uid,
        courseId: id,
        chapter: parseInt(chapter),
        type: type,
        currentTime: videoCurrentTime,
        duration: videoDuration || 600,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.error('Failed to save watch progress to Firestore:', err);
      });
    }
  }, [videoCurrentTime, videoDuration, course, id, chapter, type, isVideoEditingCourse, orderedLessons, language, user]);

  // Performs real-world dynamic file creation and download inside the Sandbox sandbox
  const triggerMockDownload = (filename: string) => {
    const content = `CUTSCENE ACADEMY RESOURCE DOWNLOAD\n=================================\n\nAsset: ${filename}\nCourse Reference ID: ${id}\nChapter Coordination: ${chapter}\nLesson Mode: ${type}\n\nThis file is prepared and ready. Thank you for studying with us!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
      setInitialSeekTime(0);
      return;
    }

    setInitialSeekTime(null);
    lastSavedTimeRef.current = 0;

    let isSubscribed = true;

    // Fetch initial seek time from Firestore progress doc
    const fetchInitialSeekTime = async () => {
      if (!user) {
        if (isSubscribed) setInitialSeekTime(0);
        return;
      }
      try {
        const lessonId = `${user.uid}-${id}-${chapter}-${type}`;
        const progressRef = doc(db, 'progress', lessonId);
        const progressSnap = await getDoc(progressRef);
        if (isSubscribed) {
          if (progressSnap.exists()) {
            const data = progressSnap.data();
            const savedTime = data.currentTime || 0;
            const durationVal = data.duration || 600;
            if (savedTime > 2 && savedTime < durationVal - 10) {
              setInitialSeekTime(savedTime);
              lastSavedTimeRef.current = savedTime;
            } else {
              setInitialSeekTime(0);
            }
          } else {
            setInitialSeekTime(0);
          }
        }
      } catch (error) {
        console.error('Error fetching initial seek time:', error);
        if (isSubscribed) setInitialSeekTime(0);
      }
    };
    fetchInitialSeekTime();

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

  // Quiz and lockout logic
  useEffect(() => {
    if (!id || !chapter || !user) {
      setCheckingQuiz(false);
      return;
    }

    let active = true;
    const sId = parseInt(chapter || "1", 10);

    const loadQuizStatuses = async () => {
      try {
        setCheckingQuiz(true);
        
        // --- 1. Check current chapter quiz status ---
        const qCol = collection(db, "quizzes");
        const qQuery = query(qCol, where("sessionId", "==", sId), where("status", "==", "published"));
        const qSnap = await getDocs(qQuery);
        
        let foundQuiz = null;
        if (!qSnap.empty) {
          foundQuiz = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
        } else if (sId === 1) {
          // Default fallback for Session 1
          foundQuiz = { id: "quiz_session_1", title: "Session 1 Quiz" };
        }

        if (active) setCurrentQuiz(foundQuiz);

        if (foundQuiz && user) {
          const attemptsCol = collection(db, "quiz_attempts");
          const attQuery = query(
            attemptsCol, 
            where("studentId", "==", user.uid), 
            where("quizId", "==", foundQuiz.id)
          );
          const attSnap = await getDocs(attQuery);
          const attList = attSnap.docs.map(d => d.data() as any);
          
          const passed = attList.some(a => a.passed);
          if (active) setQuizPassed(passed);

          if (attList.length >= 3 && !passed) {
            // Sort attempts to find the latest
            const sorted = [...attSnap.docs.map(d => d.data() as any)].sort((a, b) => {
              return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
            });
            const latest = sorted[0];
            if (latest && latest.lockoutUntil) {
              const cooldown = new Date(latest.lockoutUntil).getTime() - Date.now();
              if (cooldown > 0 && active) {
                setLockoutRemaining(Math.ceil(cooldown / 1000));
              }
            }
          }
        } else {
          if (active) setQuizPassed(false);
        }

        // --- 2. Check previous chapter quiz (GATING) ---
        if (sId > 1) {
          const prevSId = sId - 1;
          const prevQQuery = query(qCol, where("sessionId", "==", prevSId), where("status", "==", "published"));
          const prevQSnap = await getDocs(prevQQuery);
          
          let prevQuiz = null;
          if (!prevQSnap.empty) {
            prevQuiz = { id: prevQSnap.docs[0].id, ...prevQSnap.docs[0].data() };
          } else if (prevSId === 1) {
            prevQuiz = { id: "quiz_session_1", title: "Session 1 Quiz" };
          }

          if (prevQuiz && user) {
            const attemptsCol = collection(db, "quiz_attempts");
            const prevAttQuery = query(
              attemptsCol, 
              where("studentId", "==", user.uid), 
              where("quizId", "==", prevQuiz.id)
            );
            const prevAttSnap = await getDocs(prevAttQuery);
            const prevPassed = prevAttSnap.docs.map(d => d.data() as any).some(a => a.passed);
            if (active) setPrevQuizPassed(prevPassed);
          } else {
            if (active) setPrevQuizPassed(true);
          }
        } else {
          if (active) setPrevQuizPassed(true);
        }

      } catch (err) {
        console.error("Error evaluating session quiz metrics:", err);
      } finally {
        if (active) setCheckingQuiz(false);
      }
    };

    loadQuizStatuses();
    return () => {
      active = false;
    };
  }, [id, chapter, user]);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

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

  // Load personal notes
  useEffect(() => {
    if (!user || !id || !chapter) return;
    
    const fetchNotes = async () => {
      try {
        const noteId = `${user.uid}-${id}-${chapter}`;
        const noteDoc = await getDoc(doc(db, 'user_notes', noteId));
        if (noteDoc.exists()) {
          const data = noteDoc.data();
          setPersonalNotes(data.content || '');
          if (data.updatedAt) {
            setLastSavedNotesTime(new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        } else {
          setPersonalNotes('');
          setLastSavedNotesTime(null);
        }
      } catch (err) {
        console.error('Failed to fetch personal notes:', err);
      }
    };
    
    fetchNotes();
  }, [user, id, chapter]);

  const handleSaveNotes = async () => {
    if (!user || !id || !chapter) return;
    
    setIsSavingNotes(true);
    try {
      const noteId = `${user.uid}-${id}-${chapter}`;
      const updatedAt = new Date().toISOString();
      await setDoc(doc(db, 'user_notes', noteId), {
        uid: user.uid,
        courseId: id,
        chapter: parseInt(chapter),
        content: personalNotes,
        updatedAt
      }, { merge: true });
      
      setLastSavedNotesTime(new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      toast.success('Lecture notes saved successfully!');
    } catch (err: any) {
      console.error('Failed to save personal notes:', err);
      toast.error('Failed to save lecture notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

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

      toast.success(`"${file.name}" uploaded successfully! Registered in your submissions.`);
    } catch (err: any) {
      console.error('Bunny upload failed:', err);
      toast.error(`Upload failed: ${err.message || err}`);
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
        createdAt: new Date().toISOString(),
        timestamp: null
      });

      setCommentInput('');
      toast.success('Comment posted successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      toast.info('Comment removed.');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment.');
    }
  };

  const handleStartEditComment = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
    setEditingCommentTimestamp(comment.timestamp !== undefined ? comment.timestamp : null);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) {
      toast.error('Comment content cannot be empty.');
      return;
    }
    try {
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, {
        content: editingCommentContent.trim(),
        timestamp: editingCommentTimestamp,
        updatedAt: new Date().toISOString()
      });
      setEditingCommentId(null);
      setEditingCommentContent('');
      setEditingCommentTimestamp(null);
      toast.success('Comment updated successfully!');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment.');
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
      toast.success('Lesson marked as complete! Progress saved.');
      setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'progress');
      toast.error('Failed to update progress.');
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
      toast.success('Homework link submitted successfully!');
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error('Submission failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteHomework = async () => {
    if (!homeworkVideo || !window.confirm('Delete this submission?')) return;
    try {
      await deleteDoc(doc(db, 'homework_submissions', homeworkVideo.id));
      setHomeworkVideo(null);
      toast.info('Homework submission deleted.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'homework_submissions');
      toast.error('Failed to delete homework submission.');
    }
  };

  if (loading || initialSeekTime === null) {
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
                ) : (!prevQuizPassed && !isFirstSession) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-md z-20 p-8 text-center border border-purple-900/30">
                    <div className="w-16 h-16 bg-purple-600/15 rounded-full flex items-center justify-center mb-4 border border-purple-500/20">
                      <Lock className="w-8 h-8 text-purple-400 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-mono font-bold uppercase tracking-wider text-white mb-2">Lesson Gated</h2>
                    <p className="text-xs text-gray-400 max-w-sm mb-6 leading-relaxed">
                      To unlock Session {chapter}, you must pass the <b>Session {parseInt(chapter || "2") - 1} Quiz</b> with a score of <b>70%</b> or higher.
                    </p>
                    <Link 
                      to={`/courses/${id}/quiz/${parseInt(chapter || "2") - 1}`}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-mono text-[11px] font-bold tracking-wider uppercase transition-colors"
                    >
                      Take Session {parseInt(chapter || "2") - 1} Quiz
                    </Link>
                  </div>
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-black">
                    {isWindowFocused ? (
                      <iframe
                        ref={iframeRef}
                        src={(() => {
                          const rawUrl = getLessonVideoUrl(course, chapter || '1', type || 'session');
                          if (!rawUrl) return '';
                          let cleanUrl = rawUrl;
                          cleanUrl = cleanUrl.replace(/autoplay=true/gi, 'autoplay=false').replace(/autoplay=1/gi, 'autoplay=0');
                          if (!cleanUrl.includes('autoplay=')) {
                            cleanUrl += `${cleanUrl.includes('?') ? '&' : '?'}autoplay=0`;
                          }
                          if (!cleanUrl.includes('enablejsapi=')) {
                            cleanUrl += `${cleanUrl.includes('?') ? '&' : '?'}enablejsapi=1`;
                          }
                          if (initialSeekTime && initialSeekTime > 0) {
                            cleanUrl += `&start=${Math.floor(initialSeekTime)}`;
                          }
                          return cleanUrl;
                        })()}
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

                {currentQuiz && (
                  <div className="w-full sm:w-auto shrink-0">
                    {quizPassed ? (
                      <div className="flex items-center gap-2 px-6 py-3 bg-green-500/15 border border-green-500/20 text-green-400 rounded-2xl text-xs font-bold font-mono">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        <span>QUIZ PASSED ✓</span>
                      </div>
                    ) : lockoutRemaining > 0 ? (
                      <div className="flex items-center gap-2 px-6 py-3 bg-red-500/15 border border-red-500/20 text-[#ffc24b] rounded-2xl text-xs font-bold font-mono">
                        <Clock className="w-4 h-4 text-[#ffc24b] animate-pulse shrink-0" />
                        <span>LOCKED: {Math.floor(lockoutRemaining / 60)}m {lockoutRemaining % 60}s</span>
                      </div>
                    ) : (
                      <Link
                        to={`/courses/${id}/quiz/${chapter}`}
                        className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl transition-all text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <HelpCircle className="w-4.5 h-4.5 text-purple-200" />
                        <span>Start Session {chapter} Quiz</span>
                      </Link>
                    )}
                  </div>
                )}

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

            {/* Interactive Lecture Notebook */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 mb-8 shadow-xl relative overflow-hidden"
            >
              {/* Soft Ambient Glow background */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-purple-600/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2.5 text-white">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <span>Personal Lecture Notes</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Draft your custom lesson insights, markers, and code references privately.</p>
                </div>
                {lastSavedNotesTime && (
                  <span className="text-[10px] text-purple-300 bg-purple-950/45 px-3 py-1 rounded-full border border-purple-800/20 font-mono self-start sm:self-center">
                    Saved at {lastSavedNotesTime}
                  </span>
                )}
              </div>

              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder="Take notes while watching the lesson... E.g., Key shortcut combinations, composition tips, or specific timestamps."
                rows={5}
                className="w-full bg-zinc-900/40 border border-purple-900/10 focus:border-purple-500/30 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500/20 placeholder-gray-500 transition-all resize-y"
              />

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-950/20"
                >
                  {isSavingNotes ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Notes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Lecture Notes</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>

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
                        <div className="flex-grow text-left">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-200">{comment.userName}</span>

                            </div>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                            </span>
                          </div>

                          {editingCommentId === comment.id ? (
                            <div className="space-y-3 mt-2">
                              <textarea
                                value={editingCommentContent}
                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-950/80 border border-purple-900/40 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all custom-scrollbar resize-none h-24"
                                placeholder="Edit your comment..."
                              />
                              
                              <div className="flex items-center justify-end gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingCommentId(null)}
                                  className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateComment(comment.id)}
                                  className="px-3 py-1 bg-purple-650 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                          )}
                        </div>

                        {isAuthor && editingCommentId !== comment.id && (
                          <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEditComment(comment)}
                              className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-zinc-900/60 rounded-lg transition-all cursor-pointer"
                              title="Edit comment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-zinc-900/60 rounded-lg transition-all cursor-pointer"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>

          <div className="space-y-8 relative">
            <style>{`
              @keyframes dash-animation {
                to {
                  stroke-dashoffset: -40;
                }
              }
              .animate-contour-dash {
                stroke-dasharray: 10 6;
                animation: dash-animation 1.5s linear infinite;
              }
            `}</style>



            <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6">{t('course.resources')}</h3>
              <div className="space-y-4">
                <button
                  onClick={() => triggerMockDownload(`Chapter_${chapter}_Notes.pdf`)}
                  className="w-full flex items-center justify-between p-4 bg-zinc-900/40 hover:bg-zinc-900/80 border border-purple-900/10 hover:border-purple-500/30 rounded-2xl transition-all duration-300 group text-left"
                >
                  <span className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Chapter {chapter} Notes.pdf</span>
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                </button>
                <button
                  onClick={() => triggerMockDownload('Exercise_Assets.zip')}
                  className="w-full flex items-center justify-between p-4 bg-zinc-900/40 hover:bg-zinc-900/80 border border-purple-900/10 hover:border-purple-500/30 rounded-2xl transition-all duration-300 group text-left"
                >
                  <span className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Exercise Assets.zip</span>
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                </button>
              </div>
            </div>

            <div className="bg-brand-radial p-8 rounded-3xl border border-purple-500/30 shadow-lg shadow-purple-600/20">
              <h3 className="text-xl font-bold mb-4">{t('course.needHelp')}</h3>
              <p className="text-purple-100/70 text-sm mb-6 leading-relaxed">
                {t('course.helpDesc')}
              </p>
              <RainbowButton 
                to="/support"
                className="w-full text-white rounded-xl text-sm justify-center"
              >
                <span className="font-bold py-1 flex justify-center items-center">
                  {t('course.contactSupport')}
                </span>
              </RainbowButton>
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
