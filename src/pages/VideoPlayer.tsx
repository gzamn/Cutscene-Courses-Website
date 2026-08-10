import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Play, FileText, Dumbbell, CheckCircle2, Loader2, Upload, Send, Bot, User, Star, Trash2, Lock, ShieldAlert, MessageSquare, Bell, Clock, Edit2, Save, X, HelpCircle, Trophy, Check, ChevronRight, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, storage, handleFirestoreError, OperationType, collection, query, where, onSnapshot, addDoc, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc, ref, uploadBytes, getDownloadURL } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { SparkleButton, RainbowButton } from '../components/AnimatedButtons';

const getLessonVideoUrl = (course: any, chapterStr: string, typeStr: string) => {
  if (!course) return '';
  
  const titleLower = (course.title || '').toLowerCase();
  const isVideoEditing = course.id === '1' ||
    titleLower.includes('video editing') ||
    titleLower.includes('video-editing') ||
    titleLower.includes('مونتاج') ||
    titleLower.includes('cinematic');

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
  const { user, userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<any>(null);
  const [currentQuiz, setCurrentQuiz] = useState<any>({ id: `quiz_session_${chapter || '1'}`, title: `Session ${chapter || '1'} Quiz` });
  const [quizPassed, setQuizPassed] = useState<boolean>(false);
  const [quizAttemptsCount, setQuizAttemptsCount] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [prevQuizPassed, setPrevQuizPassed] = useState<boolean>(true);
  const [checkingQuiz, setCheckingQuiz] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  
  // Personal notes states
  const [personalNotesList, setPersonalNotesList] = useState<Array<{ id: string; timestamp: number; content: string }>>([]);
  const [noteInputText, setNoteInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'about' | 'resources'>('about');
  
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
  const ytPlayerRef = useRef<any>(null);

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

  const sessionName = useMemo(() => {
    if (!course?.chapters) return '';
    let foundName = '';
    let globalSessionIndex = 0;
    course.chapters.forEach((ch: any) => {
      let sessionsList: Array<{ url: string; name: string }> = [];
      if (Array.isArray(ch.sessions)) {
        sessionsList = ch.sessions.filter((s: any) => s.url);
      } else {
        const legacy = [
          { url: ch.session_url_1 || ch.session_url || "", name: ch.session_name_1 || ch.session_name || "" },
          { url: ch.session_url_2 || "", name: ch.session_name_2 || "" },
          { url: ch.session_url_3 || "", name: ch.session_name_3 || "" },
          { url: ch.session_url_4 || "", name: ch.session_name_4 || "" }
        ].filter(s => s.url);
        sessionsList = legacy;
      }
      sessionsList.forEach((s) => {
        globalSessionIndex++;
        if (String(globalSessionIndex) === String(chapter)) {
          foundName = s.name;
        }
      });
    });
    return foundName;
  }, [course, chapter]);

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

  const courseTitleLower = (course?.title || '').toLowerCase();
  const isVideoEditingCourse = course && (
    course.id === '1' ||
    courseTitleLower.includes('video editing') ||
    courseTitleLower.includes('video-editing') ||
    courseTitleLower.includes('مونتاج') ||
    courseTitleLower.includes('cinematic')
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

  const allSessionsList = useMemo(() => {
    if (orderedLessons.length > 0) return orderedLessons;

    const list: Array<{ chapter: string; type: string; title: string }> = [];
    const total = course?.chapters?.length || course?.lessons?.length || (id === '1' ? 12 : id === '2' ? 18 : 12);
    for (let i = 1; i <= total; i++) {
      const chObj = course?.chapters?.[i - 1];
      const name = chObj?.session_name_1 || chObj?.session_name || chObj?.title || '';
      list.push({
        chapter: String(i),
        type: 'session',
        title: name ? `Session ${i}: ${name}` : `Session ${i}`
      });
    }
    return list;
  }, [orderedLessons, course, id]);

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

  // Load YouTube script once
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize and poll YouTube Iframe API Player
  useEffect(() => {
    let apiPollInterval: any;
    let trackInterval: any;

    const initYTPlayer = () => {
      if (iframeRef.current && (window as any).YT && (window as any).YT.Player) {
        try {
          ytPlayerRef.current = new (window as any).YT.Player(iframeRef.current, {
            events: {
              onReady: (event: any) => {
                const duration = event.target.getDuration();
                if (typeof duration === 'number' && duration > 0) {
                  setVideoDuration(duration);
                }
              }
            }
          });
          clearInterval(apiPollInterval);
        } catch (e) {
          // ignore
        }
      }
    };

    apiPollInterval = setInterval(initYTPlayer, 1000);

    trackInterval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const currentTime = ytPlayerRef.current.getCurrentTime();
          if (typeof currentTime === 'number' && !isNaN(currentTime)) {
            setVideoCurrentTime(currentTime);
          }
          const duration = ytPlayerRef.current.getDuration();
          if (typeof duration === 'number' && !isNaN(duration) && duration > 0) {
            setVideoDuration(duration);
          }
        } catch (e) {
          // silent ignore
        }
      }
    }, 500);

    return () => {
      clearInterval(apiPollInterval);
      clearInterval(trackInterval);
    };
  }, [chapter, type]);

  // Listen to postMessage infoDelivery events emitted by the YouTube player iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let msgData = event.data;
        if (typeof msgData === 'string') {
          try {
            msgData = JSON.parse(msgData);
          } catch (e) {
            return; // Ignore non-JSON string messages
          }
        }
        
        if (!msgData) return;

        // Handle YouTube specific event format
        if (msgData.event === 'infoDelivery' && msgData.info) {
          if (typeof msgData.info.currentTime === 'number') {
            setVideoCurrentTime(msgData.info.currentTime);
          }
          if (typeof msgData.info.duration === 'number') {
            setVideoDuration(msgData.info.duration);
          }
        } else if (msgData.info) {
          if (typeof msgData.info.currentTime === 'number') {
            setVideoCurrentTime(msgData.info.currentTime);
          }
          if (typeof msgData.info.duration === 'number') {
            setVideoDuration(msgData.info.duration);
          }
        }

        // Handle standard key-value message signatures
        if (typeof msgData.currentTime === 'number') {
          setVideoCurrentTime(msgData.currentTime);
        }
        if (typeof msgData.duration === 'number') {
          setVideoDuration(msgData.duration);
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
    if (!id || !chapter) {
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
        let foundQuiz = null;
        try {
          const qSnap = await getDocs(qCol);
          if (!qSnap.empty) {
            const allDocs = qSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
            const matched = allDocs.filter(q => 
              Number(q.sessionId) === sId || 
              String(q.sessionId) === String(sId) || 
              q.id === `quiz_session_${sId}` || 
              q.id === `session_${sId}`
            );
            if (matched.length > 0) {
              const published = matched.find(q => q.status === 'published');
              foundQuiz = published || matched[0];
            }
          }
        } catch (e) {
          console.warn("Could not fetch quiz in VideoPlayer:", e);
        }

        if (!foundQuiz) {
          // Default fallback for any session so quiz button always displays
          foundQuiz = { id: `quiz_session_${sId}`, title: `Session ${sId} Quiz` };
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
          
          if (active) setQuizAttemptsCount(attList.length);
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
        } else if (foundQuiz && !user) {
          const guestKey = `guest_quiz_attempts_session_${sId}`;
          try {
            const saved = localStorage.getItem(guestKey);
            if (saved) {
              const attList = JSON.parse(saved);
              if (active) setQuizAttemptsCount(attList.length);
              const passed = attList.some((a: any) => a.passed);
              if (active) setQuizPassed(passed);
            } else {
              if (active) {
                setQuizPassed(false);
                setQuizAttemptsCount(0);
              }
            }
          } catch (e) {
            if (active) {
              setQuizPassed(false);
              setQuizAttemptsCount(0);
            }
          }
        } else {
          if (active) {
            setQuizPassed(false);
            setQuizAttemptsCount(0);
          }
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
        if (active) {
          setCurrentQuiz({ id: `quiz_session_${sId}`, title: `Session ${sId} Quiz` });
        }
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

  // Load personal notes in real-time
  useEffect(() => {
    if (!user || !id || !chapter) return;
    
    const noteId = `${user.uid}-${id}-${chapter}-${type || 'session'}`;
    const noteRef = doc(db, 'user_notes', noteId);
    
    const unsub = onSnapshot(noteRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.notes)) {
          setPersonalNotesList(data.notes);
        } else if (data.content) {
          setPersonalNotesList([{ id: 'legacy', timestamp: 0, content: data.content }]);
        } else {
          setPersonalNotesList([]);
        }
      } else {
        setPersonalNotesList([]);
      }
    }, (err) => {
      console.error('Failed to listen to personal notes:', err);
    });
    
    return unsub;
  }, [user, id, chapter, type]);

  const handleAddNote = async (text: string) => {
    if (!user || !id || !chapter || !text.trim()) return;
    
    const newNote = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Math.floor(videoCurrentTime || 0),
      content: text.trim()
    };
    
    const updatedList = [...personalNotesList, newNote].sort((a, b) => a.timestamp - b.timestamp);
    setPersonalNotesList(updatedList);
    
    try {
      const noteId = `${user.uid}-${id}-${chapter}-${type || 'session'}`;
      await setDoc(doc(db, 'user_notes', noteId), {
        uid: user.uid,
        courseId: id,
        chapter: parseInt(chapter),
        type: type || 'session',
        notes: updatedList,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Note saved at ' + formatTime(newNote.timestamp));
    } catch (err) {
      console.error('Failed to save note:', err);
      toast.error('Failed to save note.');
    }
  };

  const handleDeleteNote = async (noteIdToDelete: string) => {
    if (!user || !id || !chapter) return;
    
    const updatedList = personalNotesList.filter(n => n.id !== noteIdToDelete);
    setPersonalNotesList(updatedList);
    
    try {
      const noteId = `${user.uid}-${id}-${chapter}-${type || 'session'}`;
      await setDoc(doc(db, 'user_notes', noteId), {
        notes: updatedList,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Note removed.');
    } catch (err) {
      console.error('Failed to delete note:', err);
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
        <p>{t('course.notFound') || 'Course not found'}</p>
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
    <div className="min-h-screen text-[#f5f5f7] pt-24 pb-20 relative bg-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back to Course Button */}
        <div className="mb-6 text-left">
          <Link 
            to={`/courses/${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-950/80 border border-purple-800/60 hover:bg-purple-900 hover:border-purple-600 text-purple-200 hover:text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide uppercase transition-all shadow-md group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-purple-400" />
            {t('course.back') || 'Back to Course'}
          </Link>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Video & Content */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative aspect-video bg-[#0c0c0f] border-2 border-purple-900/40 rounded-2xl overflow-hidden shadow-2xl">
              {/* Floating watermark */}
              {(isEnrolled || isFirstSession) && (
                <div 
                  className="absolute z-35 pointer-events-none select-none opacity-30 text-[10px] font-mono text-white bg-black px-2.5 py-1 rounded-md border border-white/10 whitespace-nowrap"
                  style={{ top: watermarkPos.top, left: watermarkPos.left, transition: 'all 2s ease-in-out' }}
                >
                  {user?.email} • SECURED STREAM
                </div>
              )}

              {(!isEnrolled && !isFirstSession) ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b] p-6 text-center z-20">
                  <Lock className="w-12 h-12 text-purple-500 mb-4" />
                  <h3 className="text-lg font-extrabold mb-2 text-white">{t('course.lockedTitle') || 'Locked Lesson'}</h3>
                  <p className="text-sm text-zinc-300 max-w-md mb-6 leading-relaxed">{t('course.lockedDesc')}</p>
                  <Link to={`/payment?courseId=${course.id}`} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold font-mono uppercase transition-all shadow-lg shadow-purple-600/30">
                    {t('course.unlock')}
                  </Link>
                </div>
              ) : (
                <div className="absolute inset-0 w-full h-full bg-black">
                  <iframe
                    ref={iframeRef}
                    src={(() => {
                      const rawUrl = getLessonVideoUrl(course, chapter || '1', type || 'session');
                      if (!rawUrl) return '';
                      let cleanUrl = rawUrl.replace(/autoplay=true/gi, 'autoplay=false').replace(/autoplay=1/gi, 'autoplay=0');
                      if (!cleanUrl.includes('autoplay=')) cleanUrl += `${cleanUrl.includes('?') ? '&' : '?'}autoplay=0`;
                      if (!cleanUrl.includes('enablejsapi=')) cleanUrl += `&enablejsapi=1`;
                      if (initialSeekTime && initialSeekTime > 0) cleanUrl += `&start=${Math.floor(initialSeekTime)}`;
                      return cleanUrl;
                    })()}
                    title={`Chapter ${chapter}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>

            {/* Action panel under video */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-[#0c0c0f] border border-purple-900/30 p-5 rounded-2xl text-left shadow-xl">
              <div className="flex-grow space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                    {course.title} — Session {chapter}{sessionName ? `: ${sessionName}` : ''}
                  </h2>
                </div>
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded border border-purple-800/40 uppercase">
                    Session {chapter}
                  </span>
                  {parseInt(chapter || '1', 10) === 1 && !isEnrolled && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-500/30 uppercase">
                      Free Trial Session
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 shrink-0 items-stretch sm:items-end w-full md:w-auto">
                {/* Row 1: Quiz & Complete Buttons */}
                <div className="flex flex-wrap items-center gap-3 w-full justify-start md:justify-end">
                  {(() => {
                    const isQuizFailed = quizAttemptsCount > 0 && !quizPassed;
                    return (
                      <Link 
                        to={`/courses/${id}/quiz/${chapter}`}
                        className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                          quizPassed 
                            ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-black hover:bg-emerald-900/60' 
                            : isQuizFailed
                              ? 'bg-rose-950 border border-rose-500/40 text-rose-400 font-bold hover:bg-rose-900/40 animate-pulse'
                              : 'bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400/40 text-white shadow-purple-900/40 hover:scale-[1.02]'
                        }`}
                      >
                        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{quizPassed ? 'Quiz Completed' : isQuizFailed ? 'Retake Quiz' : 'Take Quiz'}</span>
                      </Link>
                    );
                  })()}

                  {(() => {
                    const hasSub = exerciseUploads.length > 0;
                    const latestSub = hasSub ? exerciseUploads[0] : null;
                    const isReviewed = latestSub && latestSub.status === 'reviewed';
                    const isPassed = isReviewed && (latestSub.score >= 6);
                    const isFailed = isReviewed && (latestSub.score < 6);
                    const isPending = latestSub && latestSub.status === 'pending_review';

                    return (
                      <Link 
                        to={`/courses/${id}/exercise/${chapter}`}
                        className={`px-4.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                          isPassed
                            ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-black'
                            : isFailed
                              ? 'bg-rose-950 border border-rose-500/40 text-rose-400 font-bold hover:bg-rose-900/40'
                              : isPending
                                ? 'bg-amber-950 border border-amber-500/40 text-amber-400 animate-pulse'
                                : 'bg-zinc-900 border border-purple-900/40 text-purple-300 hover:bg-zinc-800'
                        }`}
                      >
                        <Flame className={`w-4 h-4 ${isPending ? 'text-orange-500 animate-bounce' : 'text-orange-500'}`} />
                        {isPassed 
                          ? 'Exercise Completed' 
                          : isFailed 
                            ? 'Remake Exercise' 
                            : isPending 
                              ? 'Exercise Submitted' 
                              : 'Exercise'}
                      </Link>
                    );
                  })()}

                  {isCompleted ? (
                    <span className="px-4.5 py-2.5 bg-emerald-950 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 select-none shadow-md">
                      <Check className="w-4 h-4" />
                      Completed
                    </span>
                  ) : (
                    <button 
                      onClick={handleMarkComplete}
                      disabled={submitting}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Mark Complete
                    </button>
                  )}
                </div>

                {/* Row 2: Prev & Next session buttons */}
                <div className="flex items-center gap-3 w-full justify-start md:justify-end">
                  {prevLessonUrl ? (
                    <Link 
                      to={prevLessonUrl}
                      className="px-4.5 py-2 bg-purple-950/80 border border-purple-800/40 hover:border-purple-500 hover:bg-purple-900 text-purple-200 hover:text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
                      Prev
                    </Link>
                  ) : (
                    <span className="px-4.5 py-2 bg-zinc-950 border border-zinc-900 text-zinc-600 rounded-xl text-xs font-mono font-bold select-none opacity-40">
                      Prev
                    </span>
                  )}
                  {nextLessonUrl ? (
                    <Link 
                      to={nextLessonUrl}
                      className="px-4.5 py-2 bg-purple-950/80 border border-purple-800/40 hover:border-purple-500 hover:bg-purple-900 text-purple-200 hover:text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                    </Link>
                  ) : (
                    <span className="px-4.5 py-2 bg-zinc-950 border border-zinc-900 text-zinc-600 rounded-xl text-xs font-mono font-bold select-none opacity-40">
                      Next
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs for About & Resources */}
            <div className="bg-[#0c0c0f] border border-purple-900/30 rounded-2xl p-6 text-left shadow-xl">
              <div className="flex gap-6 border-b border-purple-900/20 mb-5">
                <button 
                  onClick={() => setActiveTab('about')} 
                  className={`text-xs sm:text-sm font-mono font-bold uppercase tracking-widest pb-3 cursor-pointer transition-colors ${activeTab === 'about' ? 'text-white border-b-2 border-purple-500' : 'text-zinc-500 hover:text-white'}`}
                >
                  About
                </button>
                <button 
                  onClick={() => setActiveTab('resources')} 
                  className={`text-xs sm:text-sm font-mono font-bold uppercase tracking-widest pb-3 flex items-center gap-1.5 cursor-pointer transition-colors ${activeTab === 'resources' ? 'text-white border-b-2 border-purple-500' : 'text-zinc-500 hover:text-white'}`}
                >
                  Resources 
                  <span className="text-[10px] bg-purple-900 border border-purple-700/30 rounded-full px-2 py-0.5 font-sans font-bold text-white">2</span>
                </button>
              </div>

              {activeTab === 'about' ? (
                <div className="text-zinc-300 text-sm sm:text-base leading-relaxed space-y-4">
                  {type === 'homework' && homework ? (
                    <>
                      <div className="p-4 bg-purple-950 border border-purple-500/20 rounded-xl space-y-1.5">
                        <span className="block font-bold text-purple-300 font-mono text-xs uppercase tracking-wider">Assignment:</span>
                        <p className="text-white text-sm">{homework.description}</p>
                      </div>
                      <div className="p-4 bg-purple-950 border border-purple-500/20 rounded-xl space-y-1.5">
                        <span className="block font-bold text-purple-300 font-mono text-xs uppercase tracking-wider">Guidelines:</span>
                        <p className="text-white text-sm">{homework.expectedOutcome || "Submit a video upload or a link to your timeline edit."}</p>
                      </div>
                      <form onSubmit={handleHomeworkLinkSubmit} className="space-y-3 pt-2">
                        <label className="block text-xs font-mono text-zinc-400 uppercase tracking-widest font-bold">Submit homework link</label>
                        <div className="flex gap-3">
                          <input 
                            type="url" 
                            placeholder="https://drive.google.com/..." 
                            value={homeworkLinkInput} 
                            onChange={(e) => setHomeworkLinkInput(e.target.value)} 
                            disabled={uploading} 
                            required 
                            className="flex-1 bg-zinc-950 border border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500" 
                          />
                          <button 
                            type="submit" 
                            disabled={uploading || !homeworkLinkInput.trim()} 
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-bold rounded-xl disabled:opacity-40 shadow-md"
                          >
                            Submit
                          </button>
                        </div>
                      </form>
                      {homeworkVideo && (
                        <div className="flex items-center justify-between p-3 bg-zinc-900 border border-purple-900/30 rounded-xl mt-3 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <a href={homeworkVideo.downloadUrl} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline truncate max-w-[300px] font-bold">{homeworkVideo.downloadUrl}</a>
                          </div>
                          <button onClick={deleteHomework} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </>
                  ) : type === 'exercise' ? (
                    <>
                      <div className="p-4 bg-purple-950 border border-purple-500/20 rounded-xl">
                        <p className="text-sm text-white">Replicate the cut using assets below, export, and upload your export here:</p>
                      </div>
                      <div className="pt-2">
                        <div 
                          onClick={() => !bunnyUploading && bunnyFileInputRef.current?.click()} 
                          className="border-2 border-dashed border-purple-500/30 hover:border-purple-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-zinc-900/60"
                        >
                          <input type="file" ref={bunnyFileInputRef} onChange={handleBunnyFileUpload} className="hidden" accept=".mp4,.mov,.zip,.rar" />
                          <Upload className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                          <p className="text-sm font-mono text-zinc-100 font-bold">{bunnyUploading ? `Uploading progress: ${bunnyUploadProgress}%` : 'Upload export (.mp4, .mov, .zip)'}</p>
                        </div>
                        {exerciseUploads.length > 0 && (
                          <div className="space-y-2 mt-4">
                            <span className="block text-xs font-mono text-zinc-400 uppercase tracking-widest font-bold">Submissions:</span>
                            {exerciseUploads.map((sub) => (
                              <div key={sub.id} className="flex items-center justify-between p-3 bg-zinc-900 border border-purple-900/20 rounded-xl text-sm font-semibold">
                                <span className="text-zinc-100 truncate pr-3">{sub.name}</span>
                                <span className="text-xs text-zinc-400 font-mono">{sub.uploadedAt ? new Date(sub.uploadedAt).toLocaleDateString() : ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-zinc-200">{t('course.lessonDesc')} {chapter}. Make sure to watch carefully, take notes on timings, and check the resources.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {[`Chapter_${chapter}_Notes.pdf`, 'Exercise_Assets.zip'].map((fn, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-zinc-900 border border-purple-900/30 rounded-2xl text-left shadow-md">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <div>
                          <div className="font-extrabold text-sm text-white">{fn}</div>
                          <div className="text-xs text-zinc-400 font-mono font-semibold">{idx === 0 ? '1.2 MB' : '48 MB'}</div>
                        </div>
                      </div>
                      <button onClick={() => triggerMockDownload(fn)} className="text-white font-mono text-xs font-bold border-2 border-purple-500 hover:bg-purple-600 rounded-xl px-4 py-2 bg-zinc-950 transition-colors cursor-pointer shadow-sm">Download</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Youtube Comments */}
            <div className="bg-[#0c0c0f] border border-purple-900/30 rounded-2xl p-6 text-left shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300 font-mono mb-5">{t('comments.discussion')} ({comments.length})</h3>
              {user ? (
                <form onSubmit={handleAddComment} className="flex gap-4 mb-6 items-start">
                  <div className="w-9 h-9 rounded-full bg-purple-900 border border-purple-500/20 flex items-center justify-center text-purple-200 font-bold shrink-0 text-sm">
                    {user.displayName?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div className="flex-grow">
                    <textarea 
                      placeholder={t('comments.placeholder') || "Add a public comment..."} 
                      value={commentInput} 
                      onChange={(e) => setCommentInput(e.target.value)} 
                      disabled={submittingComment} 
                      rows={2} 
                      className="w-full bg-zinc-950 border border-purple-900/30 text-sm text-zinc-100 placeholder-zinc-500 rounded-xl p-3 focus:border-purple-500 focus:outline-none resize-none focus:ring-1 focus:ring-purple-500" 
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button type="button" onClick={() => setCommentInput('')} className="text-xs font-mono font-bold text-zinc-400 hover:text-white px-3 py-1.5">Cancel</button>
                      <button type="submit" disabled={!commentInput.trim() || submittingComment} className="text-xs font-mono font-bold uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-4 py-2 rounded-xl shadow-md transition-colors">Comment</button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-purple-950 border border-purple-900/30 rounded-xl text-center text-xs font-bold text-purple-300 mb-5">Please log in to leave a comment.</div>
              )}
              {comments.length === 0 ? (
                <div className="text-xs text-zinc-500 font-mono py-3">{t('comments.empty')}</div>
              ) : (
                <div className="space-y-5 max-h-[350px] overflow-y-auto pr-1">
                  {comments.map((comment) => {
                    const isAuthor = user && user.uid === comment.uid;
                    const canDelete = isAuthor || isAdmin;
                    const nameInitial = comment.userName ? comment.userName.charAt(0).toUpperCase() : 'S';
                    return (
                      <div key={comment.id} className="flex gap-3 text-sm relative group">
                        {comment.userAvatar ? (
                          <img src={comment.userAvatar} alt="" className="w-9 h-9 rounded-full object-cover border border-purple-500/10" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-purple-900 border border-purple-500/20 flex items-center justify-center text-purple-200 font-bold text-xs shrink-0">{nameInitial}</div>
                        )}
                        <div className="flex-grow text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-extrabold text-zinc-200 text-sm">{comment.userName}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">{comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}</span>
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2 mt-2">
                              <textarea value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} className="w-full px-3 py-2 bg-zinc-950 text-sm text-white border border-purple-500/40 rounded-xl focus:outline-none h-16 resize-none focus:ring-1 focus:ring-purple-500" />
                              <div className="flex justify-end gap-1.5">
                                <button type="button" onClick={() => setEditingCommentId(null)} className="px-3 py-1.5 text-xs text-zinc-300 bg-zinc-900 rounded-lg">Cancel</button>
                                <button type="button" onClick={() => handleUpdateComment(comment.id)} className="px-3 py-1.5 text-xs text-white bg-purple-600 rounded-lg">Save</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-zinc-300 leading-relaxed text-sm pr-10 whitespace-pre-wrap">{comment.content}</p>
                          )}
                        </div>
                        {canDelete && editingCommentId !== comment.id && (
                          <div className="absolute right-0 top-0 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isAuthor && (
                              <button onClick={() => handleStartEditComment(comment)} className="text-zinc-500 hover:text-purple-400 p-1"><Edit2 className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => handleDeleteComment(comment.id)} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sessions Curriculum Navigation */}
          <div className="lg:col-span-4 h-full">
            <div className="sessions-panel bg-[#0c0c0f] border border-purple-900/30 rounded-2xl flex flex-col max-h-[620px] sticky top-24 text-left shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-purple-900/20 bg-zinc-950/80">
                <div className="flex items-center gap-2.5">
                  <Play className="w-4 h-4 text-purple-400 fill-purple-400/20" />
                  <span className="font-extrabold text-xs uppercase tracking-widest text-white font-mono">
                    {language === 'ar' ? 'حصص الدورة' : language === 'fr' ? 'Sessions du Cours' : 'Course Sessions'}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-900/40 border border-purple-500/30 rounded-md px-2 py-0.5">
                  {chapter} / {allSessionsList.length}
                </span>
              </div>

              {/* Sessions list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {allSessionsList.map((item) => {
                  const sNum = parseInt(item.chapter, 10);
                  const isActive = String(item.chapter) === String(chapter) && (type || 'session') === item.type;
                  const isUnlocked = isEnrolled || sNum === 1;

                  return (
                    <div
                      key={`${item.chapter}-${item.type}`}
                      onClick={() => {
                        if (isUnlocked) {
                          navigate(`/courses/${id}/video/${item.chapter}/${item.type}`);
                        } else {
                          toast.info(
                            language === 'ar'
                              ? `الحصة ${sNum} غير متاحة في التجربة المجانية. اشترك في الدورة لفتح كافة الحصص!`
                              : language === 'fr'
                              ? `La session ${sNum} requiert une inscription. Rejoignez le cours pour débloquer toutes les sessions !`
                              : `Session ${sNum} is locked for free trial. Enroll in the course to unlock all sessions!`
                          );
                        }
                      }}
                      className={`group p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-950/90 to-purple-900/50 border-purple-500 shadow-lg shadow-purple-900/30'
                          : isUnlocked
                            ? 'bg-zinc-950/60 hover:bg-zinc-900/80 border-purple-900/20 hover:border-purple-500/40 text-zinc-300 hover:text-white'
                            : 'bg-zinc-950/40 border-zinc-900/80 text-zinc-600 hover:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-md'
                            : isUnlocked
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-800/40'
                              : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                        }`}>
                          {sNum}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs font-bold truncate leading-tight ${
                            isActive ? 'text-white font-extrabold' : isUnlocked ? 'text-zinc-200 group-hover:text-purple-200' : 'text-zinc-500'
                          }`}>
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            {sNum === 1 && !isEnrolled && (
                              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.2 rounded uppercase">
                                {language === 'ar' ? 'تجربة مجانية' : language === 'fr' ? 'Essai Gratuit' : 'Free Trial'}
                              </span>
                            )}
                            {!isUnlocked && (
                              <span className="text-[9px] font-mono font-bold text-zinc-500 bg-zinc-900/90 border border-zinc-800 px-1.5 py-0.2 rounded uppercase flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-purple-500/60" />
                                {language === 'ar' ? 'مغلق' : language === 'fr' ? 'Verrouillé' : 'Locked'}
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[9px] font-mono font-bold text-purple-300 bg-purple-900/80 px-1.5 py-0.2 rounded uppercase">
                                {language === 'ar' ? 'يعرض الآن' : language === 'fr' ? 'En Cours' : 'Now Playing'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isActive ? (
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                        ) : !isUnlocked ? (
                          <Lock className="w-4 h-4 text-purple-500/50" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-zinc-500 group-hover:text-purple-300 transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isEnrolled && (
                <div className="p-3.5 bg-gradient-to-r from-purple-950 to-zinc-950 border-t border-purple-900/30 text-center">
                  <p className="text-[11px] text-zinc-400 mb-2 font-mono">
                    {language === 'ar' ? 'افتتاح جميع الحصص باشتراك واحد' : language === 'fr' ? 'Débloquez toutes les sessions' : 'Unlock all sessions with full enrollment'}
                  </p>
                  <Link
                    to={`/courses/${id}`}
                    className="block w-full py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-mono text-xs font-bold rounded-lg uppercase tracking-wider transition-all shadow-md"
                  >
                    {language === 'ar' ? 'اشترك الآن في الدورة' : language === 'fr' ? 'S\'inscrire au Cours' : 'Enroll in Course'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success alert */}
      <AnimatePresence>
        {showSuccessAlert && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 right-4 sm:right-8 z-50 max-w-sm w-full bg-[#0c0c0f] border border-purple-500/50 rounded-2xl p-5 shadow-2xl flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-grow text-left">
              <div className="font-extrabold text-sm text-white">Lesson Completed!</div>
              <div className="text-xs text-zinc-300 mt-1">Your progress has been successfully updated. Keep up the amazing work!</div>
            </div>
            <button onClick={() => setShowSuccessAlert(false)} className="text-zinc-500 hover:text-white text-xs p-1">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
