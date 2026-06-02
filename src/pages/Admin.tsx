import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, PlusCircle, Sparkles, Check, AlertCircle, ArrowLeft, 
  Layers, ChevronRight, Users, Film, Settings, Trash2, Edit2, 
  CheckCircle, ShieldAlert, Shield, Globe, Award, RefreshCw, X, Save, 
  Video, HelpCircle, Activity, UserCheck, Play, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc,
  getDoc,
  ensureDefaultHeroVideosSeeded
} from '../firebase';
import { useLanguage } from '../context/LanguageContext';

type AdminTab = 'courses' | 'chapters' | 'downloadables' | 'plans' | 'students' | 'student-works' | 'hero-video' | 'settings';

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export default function AdminPanel() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Active sub-section
  const [activeTab, setActiveTab] = useState<AdminTab>('courses');
  
  // Custom Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Database lists
  const [courses, setCourses] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [studentWorks, setStudentWorks] = useState<any[]>([]);
  const [downloadables, setDownloadables] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [heroVideos, setHeroVideos] = useState<any[]>([]);
  const [websiteSettings, setWebsiteSettings] = useState<any>({
    webName: 'CUTSCENE Academy',
    contactEmail: 'contact@cutscene-academy.com',
    instagram: 'https://www.instagram.com/cutscene.dz/',
    youtube: 'https://youtube.com/cutscene',
    discord: 'https://discord.gg/cutscene'
  });

  // Selected state for chapters course-filter
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirm',
    isDanger: true,
  });

  const askConfirmation = (
    title: string, 
    message: string, 
    onConfirm: () => void | Promise<void>, 
    confirmText = 'Confirm', 
    isDanger = true
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      isDanger
    });
  };

  // Loading states
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [loadingDownloadables, setLoadingDownloadables] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingHeroVideos, setLoadingHeroVideos] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Modal forms states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    thumbnail_url: '',
    is_free: false,
    instructor: '',
    price: '15000',
    level: 'Beginner',
    duration: '8 weeks',
    certificateUrl: ''
  });

  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterForm, setChapterForm] = useState({
    courseId: '',
    title: '',
    position: '1',
    is_preview: false,
    session_url: '',
    exercise_url: '',
    homework_url: '',
    session_url_1: '',
    session_url_2: '',
    session_url_3: '',
    session_url_4: '',
    session_name_1: '',
    session_name_2: '',
    session_name_3: '',
    session_name_4: '',
    session_name: ''
  });

  const [showDownloadableModal, setShowDownloadableModal] = useState(false);
  const [editingDownloadableId, setEditingDownloadableId] = useState<string | null>(null);
  const [downloadableForm, setDownloadableForm] = useState({
    name: '',
    category: 'Softwares',
    imageUrl: '',
    downloadUrl: '',
    description: ''
  });

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    description: '',
    featuresText: '',
    isPopular: false,
    order: '1'
  });

  const [showHeroVideoModal, setShowHeroVideoModal] = useState(false);
  const [editingHeroVideoId, setEditingHeroVideoId] = useState<string | null>(null);
  const [heroVideoForm, setHeroVideoForm] = useState({
    title: '',
    videoUrl: '',
    isActive: false
  });

  // Toast Helper
  const showToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Enforce security role check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (!userProfile || userProfile.role !== 'admin') {
        showToast('error', 'Unauthorized Admin Access. Redirecting...');
        navigate('/');
      }
    }
  }, [user, userProfile, authLoading, navigate]);

  // Initial loads when tab or role alters
  useEffect(() => {
    if (user && userProfile?.role === 'admin') {
      fetchCourses();
      fetchUsers();
      fetchStudentWorks();
      fetchDownloadables();
      fetchPlans();
      fetchHeroVideos();
      fetchSettings();
    }
  }, [user, userProfile]);

  // Sync chapters whenever the selected course alterations occur
  useEffect(() => {
    if (selectedCourseId) {
      fetchChaptersForCourse(selectedCourseId);
    } else {
      setChapters([]);
    }
  }, [selectedCourseId]);

  // ----------------------------------------------------
  // DATA FETCHING CONTROLLERS
  // ----------------------------------------------------

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const snap = await getDocs(collection(db, 'courses'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(list);
      // Auto-select first course for chapters if none selected
      if (list.length > 0 && !selectedCourseId) {
        setSelectedCourseId(list[0].id);
      }
    } catch (err: any) {
      console.error('Fetch courses error:', err);
      showToast('error', 'Failed loading courses from Firestore.');
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchChaptersForCourse = async (courseId: string) => {
    setLoadingChapters(true);
    try {
      // 1. First fetch separate subcollection documents
      const snap = await getDocs(collection(db, `courses/${courseId}/chapters`));
      
      const findVideo = (lessons: any[], type: string) => {
        if (!Array.isArray(lessons)) return '';
        const lesson = lessons.find((l: any) => l.type === type || l.id === type);
        return lesson ? (lesson.video_url || lesson.videoUrl || '') : '';
      };

      let list = snap.docs
        .map(doc => {
          const ch = doc.data() as any;
          const session_url = ch.session_url || ch.sessionUrl || findVideo(ch.lessons, 'session');
          const exercise_url = ch.exercise_url || ch.exerciseUrl || findVideo(ch.lessons, 'exercise');
          const homework_url = ch.homework_url || ch.homeworkUrl || findVideo(ch.lessons, 'homework');
          return {
            id: doc.id,
            ...ch,
            title: ch.title || '',
            position: ch.position !== undefined ? Number(ch.position) : 0,
            is_preview: !!ch.is_preview || !!ch.isPreview,
            session_url,
            exercise_url,
            homework_url
          };
        })
        .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0));

      // 2. Fallback to course document's inner array chapters if subcollection has no chapters
      if (list.length === 0) {
        let matchCourse = courses.find((c: any) => c.id === courseId);
        if (!matchCourse) {
          const coursesSnap = await getDocs(collection(db, 'courses'));
          const foundDoc = coursesSnap.docs.find(d => d.id === courseId);
          if (foundDoc) {
            matchCourse = { id: foundDoc.id, ...foundDoc.data() };
          }
        }

        if (matchCourse && Array.isArray(matchCourse.chapters)) {
          list = matchCourse.chapters.map((ch: any, idx: number) => {
            const session_url = ch.session_url || ch.sessionUrl || findVideo(ch.lessons, 'session');
            const exercise_url = ch.exercise_url || ch.exerciseUrl || findVideo(ch.lessons, 'exercise');
            const homework_url = ch.homework_url || ch.homeworkUrl || findVideo(ch.lessons, 'homework');
            return {
              id: ch.id || `seeded_${idx}`,
              title: ch.title || `Chapter ${idx + 1}`,
              position: ch.position !== undefined ? Number(ch.position) : idx + 1,
              is_preview: !!ch.is_preview || !!ch.isPreview,
              session_url,
              exercise_url,
              homework_url,
              is_seeded: true
            };
          });
        }
      }

      setChapters(list);
    } catch (err: any) {
      console.error('Fetch chapters error:', err);
      showToast('error', 'Failed loading chapters for this program.');
    } finally {
      setLoadingChapters(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsersList(list);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      showToast('error', 'Failed Loading user ledger.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStudentWorks = async () => {
    setLoadingWorks(true);
    try {
      const snap = await getDocs(collection(db, 'student_works'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudentWorks(list);
    } catch (err: any) {
      console.error('Fetch student works error:', err);
    } finally {
      setLoadingWorks(false);
    }
  };

  const fetchDownloadables = async () => {
    setLoadingDownloadables(true);
    try {
      const snap = await getDocs(collection(db, 'downloadables'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDownloadables(list);
    } catch (err: any) {
      console.error('Fetch downloadables error:', err);
      showToast('error', 'Failed loading downloadables from database.');
    } finally {
      setLoadingDownloadables(false);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const snap = await getDocs(collection(db, 'plans'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort plans by 'order' or fallback to numeric position
      list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      setPlans(list);
    } catch (err: any) {
      console.error('Fetch plans error:', err);
      showToast('error', 'Failed loading subscription plans from database.');
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchHeroVideos = async () => {
    setLoadingHeroVideos(true);
    try {
      const snap = await getDocs(collection(db, 'hero_videos'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by active first, then created date desc
      list.sort((a: any, b: any) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setHeroVideos(list);
    } catch (err: any) {
      console.error('Fetch hero videos error:', err);
      showToast('error', 'Failed loading hero videos from database.');
    } finally {
      setLoadingHeroVideos(false);
    }
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const snap = await getDocs(collection(db, 'config'));
      const settingsDoc = snap.docs.find(d => d.id === 'settings');
      if (settingsDoc) {
        setWebsiteSettings(settingsDoc.data());
      } else {
        // Document settings initial setup draft
        await setDoc(doc(db, 'config', 'settings'), websiteSettings);
      }
    } catch (err: any) {
      console.error('Fetch settings error:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  // ----------------------------------------------------
  // MUTATION CONTROLLERS
  // ----------------------------------------------------

  // COURSES
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: courseForm.title,
        description: courseForm.description,
        category: courseForm.category,
        image: courseForm.thumbnail_url, // map to image representation safely
        isFree: !!courseForm.is_free,
        price: courseForm.price,
        instructorName: courseForm.instructor,
        level: courseForm.level,
        duration: courseForm.duration,
        certificateUrl: courseForm.certificateUrl || '',
        updatedAt: serverTimestamp()
      };

      if (editingCourseId) {
        await setDoc(doc(db, 'courses', editingCourseId), {
          ...payload,
          id: editingCourseId
        }, { merge: true });
        showToast('success', `Course "${courseForm.title}" updated successfully.`);
      } else {
        const docRef = await addDoc(collection(db, 'courses'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        // Save ID inside the document for safe client mappings
        await updateDoc(docRef, { id: docRef.id });
        showToast('success', `Course "${courseForm.title}" published successfully.`);
      }

      setShowCourseModal(false);
      setEditingCourseId(null);
      setCourseForm({
        title: '',
        description: '',
        category: '',
        thumbnail_url: '',
        is_free: false,
        instructor: '',
        price: '15000',
        level: 'Beginner',
        duration: '8 weeks',
        certificateUrl: ''
      });
      fetchCourses();
    } catch (err: any) {
      console.error('Course processing failure:', err);
      showToast('error', err.message || 'Course save failure.');
    }
  };

  const startEditCourse = (course: any) => {
    setEditingCourseId(course.id);
    setCourseForm({
      title: course.title || '',
      description: course.description || '',
      category: course.category || '',
      thumbnail_url: course.image || '',
      is_free: !!course.isFree,
      price: course.price || '15000',
      instructor: course.instructorName || '',
      level: course.level || 'Beginner',
      duration: course.duration || '8 weeks',
      certificateUrl: course.certificateUrl || ''
    });
    setShowCourseModal(true);
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    askConfirmation(
      'Delete Course',
      `Are you absolutely sure you want to permanently delete the course "${courseTitle}"? This will lock students and cannot be undone.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'courses', courseId));
          showToast('success', `Course "${courseTitle}" deleted from database.`);
          fetchCourses();
        } catch (err: any) {
          console.error('Delete course failure:', err);
          showToast('error', err.message || 'Error occurred while dropping course.');
        }
      },
      'Delete Permanently',
      true
    );
  };


  // CHAPTERS
  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterForm.courseId) {
      showToast('error', 'Pleas associate this chapter to an active course program.');
      return;
    }
    try {
      const payload = {
        courseId: chapterForm.courseId,
        title: chapterForm.title,
        position: Number(chapterForm.position),
        is_preview: !!chapterForm.is_preview,
        session_url: chapterForm.session_url,
        exercise_url: chapterForm.exercise_url,
        homework_url: chapterForm.homework_url,
        session_url_1: chapterForm.session_url_1,
        session_url_2: chapterForm.session_url_2,
        session_url_3: chapterForm.session_url_3,
        session_url_4: chapterForm.session_url_4,
        session_name_1: chapterForm.session_name_1,
        session_name_2: chapterForm.session_name_2,
        session_name_3: chapterForm.session_name_3,
        session_name_4: chapterForm.session_name_4,
        session_name: chapterForm.session_name,
        updatedAt: serverTimestamp()
      };

      if (editingChapterId) {
        await setDoc(doc(db, `courses/${chapterForm.courseId}/chapters`, editingChapterId), payload, { merge: true });
        showToast('success', `Chapter "${chapterForm.title}" updated successfully.`);
      } else {
        await addDoc(collection(db, `courses/${chapterForm.courseId}/chapters`), {
          ...payload,
          createdAt: serverTimestamp()
        });
        showToast('success', `Chapter "${chapterForm.title}" inserted into sequence.`);
      }

      setShowChapterModal(false);
      setEditingChapterId(null);
      setChapterForm({
        courseId: selectedCourseId,
        title: '',
        position: (chapters.length + 1).toString(),
        is_preview: false,
        session_url: '',
        exercise_url: '',
        homework_url: '',
        session_url_1: '',
        session_url_2: '',
        session_url_3: '',
        session_url_4: '',
        session_name_1: '',
        session_name_2: '',
        session_name_3: '',
        session_name_4: '',
        session_name: ''
      });
      fetchChaptersForCourse(chapterForm.courseId);
    } catch (err: any) {
      console.error('Chapter process failure:', err);
      showToast('error', err.message || 'Chapter operation error.');
    }
  };

  const startEditChapter = (chapter: any) => {
    setEditingChapterId(chapter.id);
    setChapterForm({
      courseId: chapter.courseId || selectedCourseId,
      title: chapter.title || '',
      position: (chapter.position || '1').toString(),
      is_preview: !!chapter.is_preview,
      session_url: chapter.session_url || '',
      exercise_url: chapter.exercise_url || '',
      homework_url: chapter.homework_url || '',
      session_url_1: chapter.session_url_1 || '',
      session_url_2: chapter.session_url_2 || '',
      session_url_3: chapter.session_url_3 || '',
      session_url_4: chapter.session_url_4 || '',
      session_name_1: chapter.session_name_1 || '',
      session_name_2: chapter.session_name_2 || '',
      session_name_3: chapter.session_name_3 || '',
      session_name_4: chapter.session_name_4 || '',
      session_name: chapter.session_name || ''
    });
    setShowChapterModal(true);
  };

  const startAddChapter = () => {
    setEditingChapterId(null);
    setChapterForm({
      courseId: selectedCourseId,
      title: '',
      position: (chapters.length + 1).toString(),
      is_preview: false,
      session_url: '',
      exercise_url: '',
      homework_url: '',
      session_url_1: '',
      session_url_2: '',
      session_url_3: '',
      session_url_4: '',
      session_name_1: '',
      session_name_2: '',
      session_name_3: '',
      session_name_4: '',
      session_name: ''
    });
    setShowChapterModal(true);
  };

  const handleDeleteChapter = async (chapterId: string, title: string) => {
    askConfirmation(
      'Delete Chapter',
      `Are you absolutely sure you want to permanently delete chapter "${title}"?`,
      async () => {
        try {
          // 1. Delete from subcollection
          await deleteDoc(doc(db, `courses/${selectedCourseId}/chapters`, chapterId));

          // 2. Clear from custom inner chapters array inside parent course doc if any exists
          const courseRef = doc(db, 'courses', selectedCourseId);
          const courseSnap = await getDoc(courseRef);
          if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            if (Array.isArray(courseData.chapters)) {
              const updatedChapters = courseData.chapters.filter((ch: any, idx: number) => {
                if (ch.id === chapterId) return false;
                if (`seeded_${idx}` === chapterId) return false;
                if (`seeded_${idx + 1}` === chapterId) return false;
                if (ch.title === title) return false;
                return true;
              });
              await updateDoc(courseRef, { chapters: updatedChapters });
            }
          }

          showToast('success', `Chapter "${title}" removed successfully.`);
          await fetchCourses(); // Crucial: reload courses state to sync updated inner arrays
          fetchChaptersForCourse(selectedCourseId);
        } catch (err: any) {
          console.error('Delete chapter error:', err);
          showToast('error', err.message || 'Failed to remove chapter from database.');
        }
      },
      'Delete Chapter',
      true
    );
  };

  const handleUpdateChapterPosition = async (chapter: any, newPos: number) => {
    try {
      await setDoc(doc(db, `courses/${selectedCourseId}/chapters`, chapter.id), {
        position: newPos
      }, { merge: true });
      showToast('success', `Position altered dynamically.`);
      fetchChaptersForCourse(selectedCourseId);
    } catch (err: any) {
      showToast('error', 'Failed updating sorting indices.');
    }
  };


  // STUDENTS
  const handleToggleUserRole = async (targetUser: any) => {
    const nextRole = targetUser.role === 'admin' ? 'student' : 'admin';
    askConfirmation(
      'Change User Role',
      `Are you sure you want to change role of ${targetUser.displayName || targetUser.email} to "${nextRole}"?`,
      async () => {
        try {
          await setDoc(doc(db, 'users', targetUser.id), {
            role: nextRole
          }, { merge: true });
          showToast('success', `Role for ${targetUser.displayName || targetUser.email} is now ${nextRole}.`);
          fetchUsers();
        } catch (err: any) {
          console.error('Toggle role failed:', err);
          showToast('error', 'Permissions error updating database role.');
        }
      },
      'Change Role',
      false
    );
  };

  const handleDeleteUserDoc = async (targetUser: any) => {
    askConfirmation(
      'Delete User Registry',
      `CRITICAL WARNING: This will delete the user document for ${targetUser.displayName || targetUser.email} from Firestore. This will wipe their course progress database indexes. Proceed?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'users', targetUser.id));
          showToast('success', 'User profile discarded.');
          fetchUsers();
        } catch (err: any) {
          showToast('error', 'Error discarding user registry document.');
        }
      },
      'Delete User',
      true
    );
  };


  // STUDENT SHOWCASE WORKS
  const handleToggleWorkFeature = async (work: any) => {
    const nextFeatured = !work.is_featured;
    try {
      await setDoc(doc(db, 'student_works', work.id), {
        is_featured: nextFeatured
      }, { merge: true });
      showToast('success', nextFeatured ? 'Work is now starred & featured at gallery top!' : 'Feature badge removed.');
      fetchStudentWorks();
    } catch (err: any) {
      showToast('error', 'Vulnerability saving featured work flag.');
    }
  };

  const handleDeleteWork = async (workId: string, studentName: string) => {
    askConfirmation(
      'Delete Showcase Work',
      `Confirm deleting student artwork for "${studentName}" from the museum showcase?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'student_works', workId));
          showToast('success', 'Showcase discarded.');
          fetchStudentWorks();
        } catch (err: any) {
          showToast('error', 'Unable to delete database showcase.');
        }
      },
      'Delete Artwork',
      true
    );
  };

  const handleApproveWork = async (work: any) => {
    try {
      await setDoc(doc(db, 'student_works', work.id), {
        approved: true,
        status: 'approved'
      }, { merge: true });
      showToast('success', 'Student artwork approved successfully and is now live!');
      fetchStudentWorks();
    } catch (err: any) {
      showToast('error', 'Error approving student artwork: ' + err.message);
    }
  };


  // DOWNLOADABLES
  const handleDownloadableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: downloadableForm.name,
        category: downloadableForm.category,
        imageUrl: downloadableForm.imageUrl,
        downloadUrl: downloadableForm.downloadUrl,
        description: downloadableForm.description,
        updatedAt: new Date().toISOString()
      };

      if (editingDownloadableId) {
        await setDoc(doc(db, 'downloadables', editingDownloadableId), {
          ...payload,
          id: editingDownloadableId
        }, { merge: true });
        showToast('success', `Download "${downloadableForm.name}" updated successfully.`);
      } else {
        const docRef = await addDoc(collection(db, 'downloadables'), payload);
        await setDoc(docRef, { id: docRef.id }, { merge: true });
        showToast('success', `Download "${downloadableForm.name}" created successfully.`);
      }

      setShowDownloadableModal(false);
      setEditingDownloadableId(null);
      setDownloadableForm({
        name: '',
        category: 'Softwares',
        imageUrl: '',
        downloadUrl: '',
        description: ''
      });
      fetchDownloadables();
    } catch (err: any) {
      console.error('Downloadable save error:', err);
      showToast('error', err.message || 'Error saving downloadable asset.');
    }
  };

  const startEditDownloadable = (item: any) => {
    setEditingDownloadableId(item.id);
    setDownloadableForm({
      name: item.name || '',
      category: item.category || 'Softwares',
      imageUrl: item.imageUrl || '',
      downloadUrl: item.downloadUrl || '',
      description: item.description || ''
    });
    setShowDownloadableModal(true);
  };

  const handleDeleteDownloadable = async (id: string, name: string) => {
    askConfirmation(
      'Delete Downloadable Asset',
      `Are you sure you want to permanently delete the asset "${name}"? Users with full access will no longer be able to download it.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'downloadables', id));
          showToast('success', 'Downloadable asset deleted successfully.');
          fetchDownloadables();
        } catch (err: any) {
          console.error('Delete downloadable failed:', err);
          showToast('error', 'Failed to delete asset.');
        }
      },
      'Delete Asset',
      true
    );
  };


  // PLANS
  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const features = planForm.featuresText
        ? planForm.featuresText.split('\n').map(f => f.trim()).filter(Boolean)
        : [];

      const payload = {
        name: planForm.name,
        price: planForm.price,
        description: planForm.description,
        features,
        isPopular: !!planForm.isPopular,
        order: Number(planForm.order || 1),
        updatedAt: new Date().toISOString()
      };

      if (editingPlanId) {
        await setDoc(doc(db, 'plans', editingPlanId), {
          ...payload,
          id: editingPlanId
        }, { merge: true });
        showToast('success', `Plan "${planForm.name}" updated successfully.`);
      } else {
        const docRef = await addDoc(collection(db, 'plans'), payload);
        await setDoc(docRef, { id: docRef.id }, { merge: true });
        showToast('success', `Plan "${planForm.name}" created successfully.`);
      }

      setShowPlanModal(false);
      setEditingPlanId(null);
      setPlanForm({
        name: '',
        price: '',
        description: '',
        featuresText: '',
        isPopular: false,
        order: '1'
      });
      fetchPlans();
    } catch (err: any) {
      console.error('Plan save error:', err);
      showToast('error', err.message || 'Error saving membership plan.');
    }
  };

  const startEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name || '',
      price: plan.price || '',
      description: plan.description || '',
      featuresText: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      isPopular: !!plan.isPopular,
      order: String(plan.order || 1)
    });
    setShowPlanModal(true);
  };

  const handleDeletePlan = async (id: string, name: string) => {
    askConfirmation(
      'Delete Membership Plan',
      `Are you sure you want to delete the plan "${name}"? This will remove it from the choice gallery page for the users.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'plans', id));
          showToast('success', 'Plan deleted successfully.');
          fetchPlans();
        } catch (err) {
          showToast('error', 'Failed to discard subscription plan.');
        }
      },
      'Delete Plan',
      true
    );
  };


  // HERO VIDEOS MUTATIONS
  const handleHeroVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroVideoForm.title || !heroVideoForm.videoUrl) {
      showToast('error', 'Fields title and videoUrl are required.');
      return;
    }

    try {
      setLoadingHeroVideos(true);
      const isEditing = !!editingHeroVideoId;
      const payload: any = {
        title: heroVideoForm.title,
        videoUrl: heroVideoForm.videoUrl,
        isActive: heroVideoForm.isActive,
        createdAt: isEditing ? (heroVideos.find((v: any) => v.id === editingHeroVideoId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      // If making this one active, we should deactivate all other videos first!
      if (payload.isActive) {
        for (const item of heroVideos) {
          if (item.id !== editingHeroVideoId && item.isActive) {
            await updateDoc(doc(db, 'hero_videos', item.id), { isActive: false });
          }
        }
      }

      if (isEditing) {
        await setDoc(doc(db, 'hero_videos', editingHeroVideoId!), payload, { merge: true });
        showToast('success', 'Hero video details updated successfully!');
      } else {
        const customId = `video_${Date.now()}`;
        await setDoc(doc(db, 'hero_videos', customId), payload);
        showToast('success', 'New Hero video added successfully!');
      }

      setShowHeroVideoModal(false);
      setEditingHeroVideoId(null);
      setHeroVideoForm({ title: '', videoUrl: '', isActive: false });
      await fetchHeroVideos();
    } catch (err: any) {
      console.error('Error saving hero video:', err);
      showToast('error', 'Error occurred while saving hero video.');
    } finally {
      setLoadingHeroVideos(false);
    }
  };

  const startEditHeroVideo = (video: any) => {
    setEditingHeroVideoId(video.id);
    setHeroVideoForm({
      title: video.title || '',
      videoUrl: video.videoUrl || '',
      isActive: !!video.isActive
    });
    setShowHeroVideoModal(true);
  };

  const handleToggleHeroVideoActive = async (videoId: string, currentStatus: boolean) => {
    try {
      setLoadingHeroVideos(true);
      // If toggling to active, deactivate others
      if (!currentStatus) {
        for (const item of heroVideos) {
          if (item.id !== videoId && item.isActive) {
            await updateDoc(doc(db, 'hero_videos', item.id), { isActive: false });
          }
        }
      }
      await updateDoc(doc(db, 'hero_videos', videoId), { isActive: !currentStatus });
      showToast('success', `Video status toggled successfully.`);
      await fetchHeroVideos();
    } catch (err: any) {
      console.error('Toggle video active error:', err);
      showToast('error', 'Failed updating active video status.');
    } finally {
      setLoadingHeroVideos(false);
    }
  };

  const handleDeleteHeroVideo = async (videoId: string) => {
    const video = heroVideos.find((v: any) => v.id === videoId);
    if (!video) return;

    askConfirmation(
      'Delete Hero Video Reference',
      `Are you sure you would like to permanently delete the video reference "${video.title}" from your database collection?`,
      async () => {
        try {
          setLoadingHeroVideos(true);
          await deleteDoc(doc(db, 'hero_videos', videoId));
          showToast('success', 'Hero video reference deleted successfully.');
          await fetchHeroVideos();
        } catch (err: any) {
          console.error('Delete hero video error:', err);
          showToast('error', 'Failed deleting hero video reference.');
        } finally {
          setLoadingHeroVideos(false);
        }
      },
      'Delete Document',
      true
    );
  };


  // WEBSITE SETTINGS
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'config', 'settings'), websiteSettings);
      showToast('success', 'Global configuration settings synchronized successfully.');
    } catch (err: any) {
      showToast('error', 'Error synchronizing website configuration.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <span className="text-sm text-gray-400">Verifying Admin Privileges...</span>
        </div>
      </div>
    );
  }

  // Double lock validation
  if (!user || !userProfile || userProfile.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col md:flex-row relative pt-20">
      
      {/* GLOBAL HUD TOAST NOTIFIER */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 backdrop-blur-md border border-white/5 pointer-events-auto ${
                t.type === 'success' ? 'bg-green-950/90 text-green-300' : 'bg-red-950/90 text-red-300'
              }`}
            >
              {t.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed font-semibold">{t.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* DASHBOARD SIDEBAR PANEL */}
      <aside className="w-full md:w-80 bg-black border-r border-purple-950/30 flex flex-col justify-between p-6 shrink-0 z-10">
        <div className="space-y-8">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-900/30 font-bold border border-purple-500/30 rounded-2xl flex items-center justify-center text-purple-400 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Master Console</span>
              <h2 className="text-lg font-black tracking-tight text-white leading-none mt-0.5">ADMIN HUD</h2>
            </div>
          </div>

          <div className="space-y-1.5">
            {[
              { id: 'courses', name: 'Course Modules', icon: BookOpen },
              { id: 'chapters', name: 'Chapters & Tasks', icon: Layers },
              { id: 'downloadables', name: 'Premium Assets', icon: Film },
              { id: 'plans', name: 'Membership Plans', icon: Award },
              { id: 'students', name: 'Students Ledger', icon: Users },
              { id: 'student-works', name: 'Showcase Gallery', icon: Film },
              { id: 'hero-video', name: 'Homepage Hero Video', icon: Video },
              { id: 'settings', name: 'Console Settings', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-purple-950/40 text-purple-300 border border-purple-500/20 shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === tab.id ? 'translate-x-0.5' : 'text-gray-600'}`} />
                </button>
              );
            })}
          </div>

        </div>

        {/* User Identity bottom footer */}
        <div className="pt-6 border-t border-purple-950/20 mt-8 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-650 rounded-full flex items-center justify-center text-white text-xs font-bold border border-purple-500/30 uppercase">
              {userProfile?.fullName?.slice(0, 2) || user?.email?.slice(0, 2) || 'AD'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{userProfile?.fullName || 'Full Admin'}</div>
              <div className="text-[10px] text-gray-500 truncate">{user?.email}</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all inline-flex items-center justify-center gap-2 border border-white/5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home Website
          </button>
        </div>

      </aside>

      {/* DASHBOARD WORKSPACE AREA */}
      <main className="flex-grow p-8 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full z-0">
        
        {/* TAB 1: COURSES MANAGEMENT */}
        {activeTab === 'courses' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Courses Catalog</h1>
                <p className="text-gray-400 text-xs mt-1">Publish premium educational paths, assign level constraints and instructors</p>
              </div>
              <button
                onClick={() => {
                  setEditingCourseId(null);
                  setCourseForm({
                    title: '',
                    description: '',
                    category: 'Core',
                    thumbnail_url: '',
                    is_free: false,
                    instructor: userProfile?.fullName || 'Senior Instructor',
                    price: '15000',
                    level: 'Beginner',
                    duration: '8 weeks',
                    certificateUrl: ''
                  });
                  setShowCourseModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/15 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Add New Program
              </button>
            </div>

            {loadingCourses ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-purple-950/20 rounded-3xl">
                <p className="text-gray-400 text-sm mb-1">No classes are live on your Firestore catalog.</p>
                <span className="text-[11px] text-gray-500">Initiate your inventory by clicking 'Add New Program'.</span>
              </div>
            ) : (
              <div className="bg-black/40 border border-purple-950/20 rounded-[2rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-950 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-purple-950/30">
                      <tr>
                        <th className="py-4 px-6">Image</th>
                        <th className="py-4 px-6">Program Title</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6">Instructor</th>
                        <th className="py-4 px-6">Access Type</th>
                        <th className="py-4 px-6 text-right">Settings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {courses.map((course) => (
                        <tr key={course.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <img
                              src={course.image || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=150'}
                              alt=""
                              className="w-16 h-10 object-cover rounded-xl border border-purple-950 shadow"
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-white text-sm">{course.title}</div>
                            <div className="text-[10px] text-gray-500 font-mono">DB ID: {course.id}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 bg-purple-950/40 border border-purple-500/15 text-purple-300 text-[10px] uppercase font-bold tracking-wider rounded-lg">
                              {course.category || 'Core'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-300 font-semibold">{course.instructorName || 'Academy Staff'}</td>
                          <td className="py-4 px-6">
                            {course.isFree ? (
                              <span className="text-green-400 text-xs font-bold bg-green-950/25 border border-green-500/20 px-2.5 py-1 rounded-lg">Free Sandbox</span>
                            ) : (
                              <span className="text-amber-400 text-xs font-bold bg-amber-950/25 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                Premium ({course.price} DZD)
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right space-x-1.5">
                            <button
                              onClick={() => startEditCourse(course)}
                              className="p-2 bg-zinc-900 border border-white/5 hover:border-purple-500 hover:bg-purple-950/25 text-purple-400 rounded-lg transition-all cursor-pointer"
                              title="Edit all fields"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id, course.title)}
                              className="p-2 bg-zinc-900 border border-white/5 hover:border-red-500 hover:bg-red-950/25 text-red-400 rounded-lg transition-all cursor-pointer"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHAPTERS & TASKS MANAGEMENT */}
        {activeTab === 'chapters' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Structured Chapters & Tasks</h1>
                <p className="text-gray-400 text-xs mt-1">Order lessons sequentially, attach project handouts, homework and video payloads</p>
              </div>
              <button
                onClick={startAddChapter}
                disabled={!selectedCourseId}
                className="inline-flex items-center gap-2 px-5 py-3 bg-brand-radial disabled:opacity-50 hover:opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/15 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Add New Chapter
              </button>
            </div>

            {/* SELECT DICTIONARY FILTER */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/60 border border-purple-950/30 p-6 rounded-3xl">
              <label className="text-xs font-black uppercase tracking-widest text-purple-400 whitespace-nowrap shrink-0">Select Curriculum Course:</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">-- Choose Course --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {loadingChapters ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : !selectedCourseId ? (
              <div className="text-center py-12 text-gray-500 text-xs font-bold">Please pick or publish a course first to adjust course chapters.</div>
            ) : chapters.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-purple-950/20 rounded-3xl">
                <p className="text-gray-400 text-sm mb-1">No curriculum chapters stored for this course.</p>
                <span className="text-[11px] text-gray-500">Insert the first unit block by clicking "Add New Chapter" at the top corner.</span>
              </div>
            ) : (
              <div className="bg-black/40 border border-purple-950/20 rounded-[2rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto relative">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#09090b] text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-purple-950/30">
                      <tr>
                        <th className="py-4 px-6 bg-[#09090b]">Index/Pos</th>
                        <th className="py-4 px-6 bg-[#09090b]">Chapter Topic</th>
                        <th className="py-4 px-6 bg-[#09090b]">Type Status</th>
                        <th className="py-4 px-6 bg-[#09090b]">Handouts & Exercises</th>
                        <th className="py-4 px-6 text-right sticky right-0 bg-[#09090b] border-l border-purple-950/20 z-20 shadow-[-10px_0_15px_rgba(0,0,0,0.5)]">Sequence Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {chapters.map((chap) => (
                        <tr key={chap.id} className="hover:bg-white/5 transition-colors group">
                          <td className="py-4 px-6 font-mono text-xs font-black text-purple-400 flex items-center gap-2">
                            <span>{chap.position || 'N/A'}</span>
                            <div className="flex flex-col gap-1">
                              <button 
                                onClick={() => handleUpdateChapterPosition(chap, Number(chap.position || 0) + 1)}
                                className="text-[9px] hover:text-white transition-colors"
                              >
                                ▲
                              </button>
                              <button 
                                onClick={() => handleUpdateChapterPosition(chap, Math.max(1, Number(chap.position || 0) - 1))}
                                className="text-[9px] hover:text-white transition-colors"
                              >
                                ▼
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-white text-sm">{chap.title}</div>
                              {chap.is_seeded && (
                                <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[8px] font-mono font-bold uppercase tracking-wider rounded border border-purple-500/20">
                                  Default Preset
                                </span>
                              )}
                            </div>
                            {chap.session_url && (
                              <div className="text-[10px] text-gray-400 font-mono truncate max-w-xs flex items-center gap-1.5 mt-0.5">
                                <Video className="w-3 h-3 text-purple-500 shrink-0" />
                                Link: {chap.session_url}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {chap.is_preview ? (
                              <span className="px-2.5 py-1 bg-green-950/35 border border-green-500/20 text-green-400 text-[10px] uppercase font-black rounded-lg">
                                Public Preview
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-purple-900/15 border border-purple-500/10 text-purple-300 text-[10px] uppercase font-bold rounded-lg">
                                Locked (Premium)
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-450 space-y-1">
                            {chap.exercise_url && (
                              <div className="text-[10px] text-purple-400 font-semibold">⚡ Practice: {chap.exercise_url}</div>
                            )}
                            {chap.homework_url && (
                              <div className="text-[10px] text-amber-500 font-semibold">📁 Homework: {chap.homework_url}</div>
                            )}
                            {!chap.exercise_url && !chap.homework_url && <span className="text-gray-650">—</span>}
                          </td>
                           <td className="py-4 px-6 text-right space-x-1.5 sticky right-0 bg-[#09090b] group-hover:bg-[#18181b] transition-colors border-l border-purple-950/20 z-10 shadow-[-10px_0_15px_rgba(0,0,0,0.5)]">
                            <button
                              onClick={() => startEditChapter(chap)}
                              className="p-2 bg-zinc-900 border border-white/5 hover:border-purple-500 hover:bg-purple-950/25 text-purple-400 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteChapter(chap.id, chap.title)}
                              className="p-2 bg-zinc-900 border border-white/5 hover:border-red-500 hover:bg-red-950/25 text-red-400 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDENTS LEDGER (USERS MANAGEMENT) */}
        {activeTab === 'students' && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">User Accounts & Roles</h1>
              <p className="text-gray-400 text-xs mt-1">Promote students to workspace administrators, manage profile schemas stored on Firestore</p>
            </div>

            {loadingUsers ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-20 text-gray-500">No registered users in Firestore. Use email or auth to generate.</div>
            ) : (
              <div className="bg-black/40 border border-purple-950/20 rounded-[2rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-950 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-purple-950/30">
                      <tr>
                        <th className="py-4 px-6">Interactive Role Role</th>
                        <th className="py-4 px-6">Name & Student Profile</th>
                        <th className="py-4 px-6">Primary Contact</th>
                        <th className="py-4 px-6">Unique Username</th>
                        <th className="py-4 px-6 text-right">Registry Operation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {usersList.map((usr) => (
                        <tr key={usr.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <button
                              onClick={() => handleToggleUserRole(usr)}
                              className={`px-3 py-1.5 text-[10px] uppercase font-black rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                usr.role === 'admin'
                                  ? 'bg-purple-950/50 border-purple-500/30 text-purple-300'
                                  : 'bg-zinc-900 border-white/5 text-gray-400 hover:text-white'
                              }`}
                              title="Click to toggle admin credentials"
                            >
                              <Shield className="w-3.5 h-3.5 shrink-0" />
                              {usr.role || 'student'}
                            </button>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <img
                                src={usr.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100'}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover border border-purple-950"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="font-bold text-white text-sm">{usr.fullName || usr.displayName || 'No name provided'}</div>
                                <div className="text-[9px] text-gray-600 font-mono">UID: {usr.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-300 font-semibold">{usr.email}</td>
                          <td className="py-4 px-6 text-xs text-gray-450 font-mono">{usr.username || '@not_configured'}</td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleDeleteUserDoc(usr)}
                              className="p-2 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                              title="Delete user document from Firestore (WARNING: Doesn't drop from Authentication console)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STUDENT SHOWCASE WORKS */}
        {activeTab === 'student-works' && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Showcase Submissions Gallery</h1>
              <p className="text-gray-400 text-xs mt-1">Feature exceptional tasks on the homepage, remove entries representing improper concepts</p>
            </div>

            {loadingWorks ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : studentWorks.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-purple-950/20 rounded-3xl">
                <p className="text-gray-400 text-sm">No artworks published on Firestore yet.</p>
              </div>
            ) : (
              <div className="bg-black/40 border border-purple-950/20 rounded-[2rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-950 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-purple-950/30">
                      <tr>
                        <th className="py-4 px-6">Approval Status</th>
                        <th className="py-4 px-6">Featured</th>
                        <th className="py-4 px-6">Illustration</th>
                        <th className="py-4 px-6">Task Title</th>
                        <th className="py-4 px-6">Submitted Student</th>
                        <th className="py-4 px-6 text-right">Delete Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {studentWorks.map((work) => {
                        const s_img = work.image_url || work.thumbnail || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=150';
                        const s_student = work.student_name || work.studentName || 'Student';
                        const s_title = work.title || 'Masterpiece';
                        const isApproved = work.approved === true || work.status === 'approved';
                        return (
                          <tr key={work.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6">
                              {isApproved ? (
                                <span className="px-3 py-1.5 bg-green-950/20 border border-green-500/30 text-green-400 text-[10px] uppercase font-black rounded-xl inline-flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Approved
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleApproveWork(work)}
                                  className="px-3 py-1.5 bg-purple-900/30 border border-purple-550/30 text-purple-300 hover:bg-purple-900/50 text-[10px] uppercase font-black rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Click to approve student work showcase"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  Approve Request
                                </button>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <button
                                onClick={() => handleToggleWorkFeature(work)}
                                className={`p-2 rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 text-[10px] uppercase font-black ${
                                  work.is_featured
                                    ? 'bg-amber-955/35 border-amber-500/40 text-amber-400'
                                    : 'bg-zinc-900 border-white/5 text-gray-500 hover:text-gray-300'
                                }`}
                                title="Click to feature on homepage"
                              >
                                <Award className="w-4 h-4" />
                                {work.is_featured ? 'Featured' : 'Regular'}
                              </button>
                            </td>
                            <td className="py-4 px-6">
                              <img
                                src={s_img}
                                alt=""
                                className="w-16 h-10 object-cover rounded-xl border border-purple-950"
                                referrerPolicy="no-referrer"
                              />
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-white text-sm">{s_title}</div>
                              <div className="text-[10px] text-purple-400 font-semibold">{work.course_name || work.courseTitle || 'Creative Course'}</div>
                            </td>
                            <td className="py-4 px-6 text-xs text-gray-300 font-bold">{s_student}</td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => handleDeleteWork(work.id, s_student)}
                                className="p-2 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4.1: PREMIUM ASSETS MANAGER */}
        {activeTab === 'downloadables' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Premium Assets Library</h1>
                <p className="text-gray-400 text-xs mt-1">Manage downloadable utilities, creative templates, softwares, and audio overlays</p>
              </div>
              <button
                onClick={() => {
                  setEditingDownloadableId(null);
                  setDownloadableForm({
                    name: '',
                    category: 'Softwares',
                    imageUrl: '',
                    downloadUrl: '',
                    description: ''
                  });
                  setShowDownloadableModal(true);
                }}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all self-start flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer text-white"
              >
                <PlusCircle className="w-4 h-4" />
                Add Premium Asset
              </button>
            </div>

            {loadingDownloadables ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              </div>
            ) : downloadables.length === 0 ? (
              <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
                <PlusCircle className="w-12 h-12 text-gray-500 mx-auto mb-3 animate-pulse" />
                <p className="text-gray-400 font-bold">No assets found in the premium database</p>
                <p className="text-xs text-gray-650 mt-1">Click the top button to seed or list your first tool!</p>
              </div>
            ) : (
              <div className="bg-zinc-950/40 border border-purple-950/20 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-purple-950/30 text-gray-400 text-[10px] uppercase font-bold tracking-widest bg-zinc-950/60">
                        <th className="py-4 px-6">Image</th>
                        <th className="py-4 px-6">Asset Name</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6">Source URL</th>
                        <th className="py-4 px-6 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/15">
                      {downloadables.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <img
                              src={item.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'}
                              alt=""
                              className="w-14 h-10 object-cover rounded-xl border border-purple-950"
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-white text-sm line-clamp-1">{item.name}</div>
                            <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.description || 'No description provided.'}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/5 text-[10px] font-bold text-gray-300 uppercase">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs text-purple-400 truncate max-w-[200px]" title={item.downloadUrl}>
                              {item.downloadUrl}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2 shrink-0">
                            <button
                              onClick={() => startEditDownloadable(item)}
                              className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex"
                              title="Edit Asset"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDownloadable(item.id, item.name)}
                              className="p-2 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded-lg transition-all cursor-pointer inline-flex"
                              title="Delete Asset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4.2: PLANS MANAGER */}
        {activeTab === 'plans' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Academy Membership Plans</h1>
                <p className="text-gray-400 text-xs mt-1">Configure pricing bundles, billing rates, features lists, and visual tags</p>
              </div>
              <button
                onClick={() => {
                  setEditingPlanId(null);
                  setPlanForm({
                    name: '',
                    price: '',
                    description: '',
                    featuresText: '',
                    isPopular: false,
                    order: String(plans.length + 1)
                  });
                  setShowPlanModal(true);
                }}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all self-start flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer text-white"
              >
                <PlusCircle className="w-4 h-4" />
                Create Plan Bundle
              </button>
            </div>

            {loadingPlans ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-20 bg-zinc-950/20 rounded-[2rem] border border-dashed border-purple-900/10 max-w-xl mx-auto">
                <PlusCircle className="w-12 h-12 text-gray-500 mx-auto mb-3 animate-pulse" />
                <p className="text-gray-400 font-bold">No bundles defined in plans database</p>
                <p className="text-xs text-gray-650 mt-1">Get started by compiling pricing bundles for academic members!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((p) => (
                  <div key={p.id} className="bg-zinc-950/60 p-6 rounded-[2rem] border border-purple-950/20 hover:border-purple-500/10 relative flex flex-col justify-between">
                    {p.isPopular && (
                      <span className="absolute top-4 right-4 bg-purple-600 text-white font-bold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest shadow shadow-purple-500/50">
                        Most Popular
                      </span>
                    )}
                    <div>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-2xl font-black text-white">{p.price}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Order: {p.order || '1'}</span>
                      </div>
                      <h4 className="text-lg font-bold text-white mb-1.5">{p.name}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">{p.description}</p>
                      
                      <ul className="space-y-1 text-xs text-gray-500 mb-6">
                        {Array.isArray(p.features) && p.features.slice(0, 3).map((f: string, fi: number) => (
                          <li key={fi} className="truncate flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-purple-400" />
                            {f}
                          </li>
                        ))}
                        {Array.isArray(p.features) && p.features.length > 3 && (
                          <li className="italic text-[10px] mt-1 text-purple-450">+{p.features.length - 3} more advantages</li>
                        )}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-purple-950/20 flex justify-end gap-2">
                      <button
                        onClick={() => startEditPlan(p)}
                        className="px-4 py-2 bg-zinc-900 border border-white/5 hover:border-purple-500/20 rounded-xl text-xs font-bold transition-all text-gray-350 cursor-pointer hover:bg-zinc-800"
                      >
                        Edit Plan
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p.id, p.name)}
                        className="px-3 py-2 bg-red-950/10 hover:bg-red-950/30 text-red-500 hover:text-red-400 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4.5: HOMEPAGE HERO BACKGROUND VIDEOS */}
        {activeTab === 'hero-video' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Homepage Background Videos</h1>
                <p className="text-gray-400 text-xs mt-1">Manage, toggle, and audit the immersive looped videos running on the academy's homepage hero board</p>
              </div>
              <button
                onClick={() => {
                  setEditingHeroVideoId(null);
                  setHeroVideoForm({ title: '', videoUrl: '', isActive: false });
                  setShowHeroVideoModal(true);
                }}
                className="self-start px-5 py-3 bg-brand-radial hover:opacity-90 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/10"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Video Path</span>
              </button>
            </div>

            {loadingHeroVideos && heroVideos.length === 0 ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : heroVideos.length === 0 ? (
              <div className="text-center py-20 bg-zinc-950/40 rounded-[2rem] border border-dashed border-purple-900/20 max-w-xl mx-auto px-6">
                <Video className="w-12 h-12 text-purple-500/40 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No background videos listed</h3>
                <p className="text-gray-400 text-xs max-w-sm mx-auto mb-6">
                  Create an independent Firestore document reference to direct the hero background layout dynamically to your own files or video assets.
                </p>
                <button
                  onClick={async () => {
                    await ensureDefaultHeroVideosSeeded();
                    await fetchHeroVideos();
                  }}
                  className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Seed Starter References
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Video Live Preview */}
                <div className="lg:col-span-1 bg-zinc-950/60 border border-purple-950/20 p-6 rounded-[2rem] flex flex-col justify-between space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-1">Live Monitor</h3>
                    <h2 className="text-xl font-black text-white">Active Background Video</h2>
                    <p className="text-gray-400 text-[11px] leading-relaxed mt-1">
                      This is the active video stream running live on the main hero background. Direct files loop and iframe streams embed perfectly.
                    </p>
                  </div>

                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-purple-500/10 group shadow-md shadow-black/80">
                    {(() => {
                      const active = heroVideos.find((v: any) => v.isActive) || heroVideos[0];
                      if (!active) return (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">No active video</div>
                      );

                      const isDirect = active.videoUrl?.toLowerCase().includes('.mp4') || 
                                       active.videoUrl?.toLowerCase().includes('.webm') || 
                                       active.videoUrl?.toLowerCase().includes('.ogg') || 
                                       active.videoUrl?.toLowerCase().includes('vjs.zencdn.net') || 
                                       active.videoUrl?.toLowerCase().includes('mixkit.co') || 
                                       (!active.videoUrl?.toLowerCase().includes('youtube.com') && 
                                        !active.videoUrl?.toLowerCase().includes('youtu.be') && 
                                        !active.videoUrl?.toLowerCase().includes('drive.google.com') && 
                                        !active.videoUrl?.toLowerCase().includes('vimeo.com'));

                      return (
                        <>
                          {isDirect ? (
                            <video
                              key={active.videoUrl}
                              className="w-full h-full object-cover"
                              autoPlay
                              loop
                              muted
                              playsInline
                            >
                              <source src={active.videoUrl} type="video/mp4" />
                            </video>
                          ) : (
                            <iframe
                              key={active.videoUrl}
                              title="Live Admin Preview"
                              className="w-full h-full pointer-events-none scale-[1.05]"
                              src={`${getEmbedVideoUrl(active.videoUrl)}?autoplay=1&mute=1&controls=0&loop=1`}
                              allow="autoplay; encrypted-media"
                            />
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/75 px-3 py-1 rounded-full text-[10px] font-bold border border-white/5 truncate max-w-[90%]">
                            {active.title}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="bg-purple-950/10 border border-purple-500/10 p-4 rounded-2xl text-[11px] text-purple-300 leading-normal flex gap-2">
                    <Activity className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>
                      Admins can add any number of video references. Simply click the star button to make any video the main live background.
                    </span>
                  </div>
                </div>

                {/* Video References List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-zinc-950/30 rounded-2xl border border-purple-950/15 overflow-hidden">
                    <div className="grid grid-cols-12 px-6 py-4 border-b border-purple-950/15 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      <div className="col-span-6 sm:col-span-5">Video Profile</div>
                      <div className="col-span-3 sm:col-span-3">Direct URL / Source</div>
                      <div className="col-span-3 sm:col-span-2 text-center">Status</div>
                      <div className="col-span-12 sm:col-span-2 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-purple-950/10">
                      {heroVideos.map((video: any) => (
                        <div key={video.id} className="grid grid-cols-12 items-center px-6 py-5 hover:bg-white/[0.01] transition-all gap-y-3 sm:gap-y-0">
                          <div className="col-span-12 sm:col-span-5 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-950/20 border border-purple-500/15 flex items-center justify-center text-purple-400 shrink-0">
                              <Video className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white truncate max-w-[220px]">{video.title}</h4>
                              <p className="text-gray-400 text-[10px] mt-0.5">
                                Added: {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="col-span-12 sm:col-span-3 text-xs text-gray-300 font-mono truncate max-w-[240px] pr-2">
                            <span className="text-[11px] truncate bg-zinc-900 px-2 py-1 rounded-md border border-white/5 inline-block">
                              {video.videoUrl}
                            </span>
                          </div>

                          <div className="col-span-6 sm:col-span-2 flex justify-center">
                            <button
                              onClick={() => handleToggleHeroVideoActive(video.id, video.isActive)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 cursor-pointer border transition-all ${
                                video.isActive
                                  ? 'bg-purple-950/40 text-purple-400 border-purple-500/30'
                                  : 'bg-zinc-900 text-gray-500 border-transparent hover:border-purple-500/20 hover:text-gray-300'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${video.isActive ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'}`} />
                              <span>{video.isActive ? 'Active' : 'Deploy'}</span>
                            </button>
                          </div>

                          <div className="col-span-6 sm:col-span-2 flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditHeroVideo(video)}
                              className="p-2 bg-zinc-900 border border-white/5 hover:border-purple-500/20 rounded-xl text-xs font-bold transition-all text-gray-300 cursor-pointer hover:bg-zinc-800"
                              title="Edit reference"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHeroVideo(video.id)}
                              className="p-2 bg-red-950/10 hover:bg-red-950/20 text-red-500 hover:text-red-400 rounded-xl text-xs transition-colors cursor-pointer"
                              title="Delete reference"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WEBSITE CONFIGURATION SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-fade-in max-w-2xl">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Console Configuration</h1>
              <p className="text-gray-400 text-xs mt-1">Synchronize site information, support mail addresses, and social links instantly</p>
            </div>

            {loadingSettings ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSettingsSubmit} className="space-y-6 bg-black/60 border border-purple-950/30 p-8 sm:p-10 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Academy/Website Title</label>
                    <input
                      type="text"
                      required
                      value={websiteSettings.webName || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, webName: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Central Contact Email</label>
                    <input
                      type="email"
                      required
                      value={websiteSettings.contactEmail || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, contactEmail: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Instagram Anchor</label>
                    <input
                      type="url"
                      value={websiteSettings.instagram || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, instagram: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">YouTube Anchor</label>
                    <input
                      type="url"
                      value={websiteSettings.youtube || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, youtube: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Discord Room Anchor</label>
                    <input
                      type="url"
                      value={websiteSettings.discord || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, discord: e.target.value })}
                      className="w-full bg-zinc-950 border border-purple-950/45 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-950/15">
                  <button
                    type="submit"
                    className="px-6 py-3.5 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/10"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </main>

      {/* MODAL 1: ADD / EDIT COURSE */}
      <AnimatePresence>
        {showCourseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowCourseModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingCourseId ? 'Edit Course' : 'Create Course'}</h2>
                  <p className="text-gray-400 text-xs">Fill out the academic metadata constraints</p>
                </div>
                <button onClick={() => setShowCourseModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCourseSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Program Title</label>
                  <input
                    type="text"
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Description Summary</label>
                  <textarea
                    required
                    rows={3}
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Instructor Name</label>
                    <input
                      type="text"
                      required
                      value={courseForm.instructor}
                      onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Category</label>
                    <input
                      type="text"
                      required
                      value={courseForm.category}
                      onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="e.g. Editing, Sound Design"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Level</label>
                    <select
                      value={courseForm.level}
                      onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-gray-300 focus:outline-none"
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Course Duration</label>
                    <input
                      type="text"
                      required
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Direct Image Thumbnail URL</label>
                  <input
                    type="url"
                    required
                    value={courseForm.thumbnail_url}
                    onChange={(e) => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Custom Course Certificate URL (Optional / Image or PDF link)</label>
                  <input
                    type="url"
                    value={courseForm.certificateUrl || ''}
                    onChange={(e) => setCourseForm({ ...courseForm, certificateUrl: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="e.g. https://example.com/certificate-template.png"
                  />
                </div>

                <div className="p-4 bg-zinc-900 rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300">Is this course free for sandbox trial?</span>
                    <input
                      type="checkbox"
                      checked={courseForm.is_free}
                      onChange={(e) => setCourseForm({ ...courseForm, is_free: e.target.checked })}
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                  </div>

                  {!courseForm.is_free && (
                    <div className="pt-2 border-t border-purple-950/25">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Tuition Price (DZD)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={courseForm.price}
                          onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                          className="w-full bg-black border border-purple-900/30 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white focus:outline-none"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-purple-500 font-black">đ</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-2 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow-lg"
                >
                  Save Program Coordinates
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD / EDIT CHAPTER */}
      <AnimatePresence>
        {showChapterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowChapterModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingChapterId ? 'Edit Chapter Map' : 'Create Unit Chapter'}</h2>
                  <p className="text-gray-400 text-xs">Associate assets, sequential position markers, free triggers</p>
                </div>
                <button onClick={() => setShowChapterModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleChapterSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Choose Parent Course</label>
                  <select
                    value={chapterForm.courseId}
                    onChange={(e) => setChapterForm({ ...chapterForm, courseId: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-gray-300 focus:outline-none"
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Chapter Title</label>
                  <input
                    type="text"
                    required
                    value={chapterForm.title}
                    onChange={(e) => setFormChapterAndTitle(e.target.value)}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Order Sequence Position</label>
                    <input
                      type="number"
                      required
                      value={chapterForm.position}
                      onChange={(e) => setChapterForm({ ...chapterForm, position: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-1.5">
                    <label className="flex items-center gap-2.5 bg-zinc-900 border border-white/5 p-3.5 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chapterForm.is_preview}
                        onChange={(e) => setChapterForm({ ...chapterForm, is_preview: e.target.checked })}
                        className="w-4 h-4 accent-purple-650"
                      />
                      <span className="text-[11px] font-bold text-gray-300">Public Preview Access</span>
                    </label>
                  </div>
                </div>

                {(() => {
                  const currentCourse = courses.find((c: any) => c.id === chapterForm.courseId);
                  const isVideoEditingCourse = chapterForm.courseId === '1' || (currentCourse && (
                    currentCourse.title?.toLowerCase().includes('video editing') ||
                    currentCourse.title?.toLowerCase().includes('video-editing') ||
                    currentCourse.title?.toLowerCase().includes('مونتاج') ||
                    currentCourse.title?.toLowerCase().includes('cinematic')
                  ));

                  if (isVideoEditingCourse) {
                    const posVal = parseInt(chapterForm.position || '1') || 1;
                    const startS = (posVal - 1) * 4 + 1;
                    return (
                      <div className="space-y-4">
                        <div className="bg-zinc-950/40 p-4 rounded-2xl border border-purple-950/30 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Session {startS} Video URL (YouTube / Direct)</label>
                              <input
                                type="url"
                                value={chapterForm.session_url_1}
                                onChange={(e) => setChapterForm({ ...chapterForm, session_url_1: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                                placeholder="e.g. https://www.youtube.com/embed/... or direct link"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Session {startS} Name / Topic</label>
                              <input
                                type="text"
                                value={chapterForm.session_name_1}
                                onChange={(e) => setChapterForm({ ...chapterForm, session_name_1: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                                placeholder={`e.g. Session ${startS}: {name}`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-zinc-950/40 p-4 rounded-2xl border border-purple-950/30 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Session {startS + 1} Video URL (YouTube / Direct)</label>
                              <input
                                type="url"
                                value={chapterForm.session_url_2}
                                onChange={(e) => setChapterForm({ ...chapterForm, session_url_2: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                                placeholder="e.g. https://www.youtube.com/embed/... or direct link"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Session {startS + 1} Name / Topic</label>
                              <input
                                type="text"
                                value={chapterForm.session_name_2}
                                onChange={(e) => setChapterForm({ ...chapterForm, session_name_2: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                                placeholder={`e.g. Session ${startS + 1}: {name}`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-zinc-950/40 p-4 rounded-2xl border border-purple-950/30 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Session {startS + 2} Video URL (YouTube / Direct)</label>
                              <input
                                type="url"
                                value={chapterForm.session_url_3}
                                onChange={(e) => setChapterForm({ ...chapterForm, session_url_3: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                                placeholder="e.g. https://www.youtube.com/embed/... or direct link"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Session {startS + 2} Name / Topic</label>
                              <input
                                type="text"
                                value={chapterForm.session_name_3}
                                onChange={(e) => setChapterForm({ ...chapterForm, session_name_3: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                                placeholder={`e.g. Session ${startS + 2}: {name}`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-zinc-950/40 p-4 rounded-2xl border border-purple-950/30 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Session {startS + 3} Video URL (YouTube / Direct)</label>
                              <input
                                type="url"
                                value={chapterForm.session_url_4}
                                onChange={(e) => setChapterForm({ ...chapterForm, session_url_4: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                                placeholder="e.g. https://www.youtube.com/embed/... or direct link"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Session {startS + 3} Name / Topic</label>
                              <input
                                type="text"
                                value={chapterForm.session_name_4}
                                onChange={(e) => setChapterForm({ ...chapterForm, session_name_4: e.target.value })}
                                className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                                placeholder={`e.g. Session ${startS + 3}: {name}`}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Chapter {posVal} Practice Exercise Video URL</label>
                          <input
                            type="url"
                            value={chapterForm.exercise_url}
                            onChange={(e) => setChapterForm({ ...chapterForm, exercise_url: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                            placeholder="Practice exercise assignment video or source URLs"
                          />
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Session Video Handout URL (YouTube / Direct)</label>
                          <input
                            type="url"
                            value={chapterForm.session_url}
                            onChange={(e) => setChapterForm({ ...chapterForm, session_url: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                            placeholder="https://youtube.com/watch?v=..."
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Session Video Topic / Name</label>
                          <input
                            type="text"
                            value={chapterForm.session_name}
                            onChange={(e) => setChapterForm({ ...chapterForm, session_name: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                            placeholder="e.g. Introduction to Figma"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Assets & Practice File URL</label>
                          <input
                            type="url"
                            value={chapterForm.exercise_url}
                            onChange={(e) => setChapterForm({ ...chapterForm, exercise_url: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Homework Assignment Submission Drive Link</label>
                          <input
                            type="url"
                            value={chapterForm.homework_url}
                            onChange={(e) => setChapterForm({ ...chapterForm, homework_url: e.target.value })}
                            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  }
                })()}

                <button
                  type="submit"
                  className="w-full py-4 mt-2 bg-brand-radial hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
                >
                  Save Curriculum Mapping
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2.1: ADD / EDIT PREMIUM DOWNLOADABLE */}
      <AnimatePresence>
        {showDownloadableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowDownloadableModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingDownloadableId ? 'Edit Asset Document' : 'Publish Asset Document'}</h2>
                  <p className="text-gray-400 text-xs">Fill out file locations and download specs</p>
                </div>
                <button onClick={() => setShowDownloadableModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleDownloadableSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Asset File Name / Title</label>
                  <input
                    type="text"
                    required
                    value={downloadableForm.name}
                    onChange={(e) => setDownloadableForm({ ...downloadableForm, name: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    placeholder="e.g. Cinematic Sound Effects Library"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Category Subsection</label>
                    <select
                      value={downloadableForm.category}
                      onChange={(e) => setDownloadableForm({ ...downloadableForm, category: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-gray-350 focus:outline-none"
                    >
                      <option value="Softwares">Softwares</option>
                      <option value="Videos">Videos</option>
                      <option value="Images">Images</option>
                      <option value="Music">Music</option>
                      <option value="Sound Effects">Sound Effects</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Cover Image URL</label>
                    <input
                      type="url"
                      value={downloadableForm.imageUrl}
                      onChange={(e) => setDownloadableForm({ ...downloadableForm, imageUrl: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold">Direct Download Asset URL</label>
                  <input
                    type="url"
                    required
                    value={downloadableForm.downloadUrl}
                    onChange={(e) => setDownloadableForm({ ...downloadableForm, downloadUrl: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold">Brief Description</label>
                  <textarea
                    rows={3}
                    value={downloadableForm.description}
                    onChange={(e) => setDownloadableForm({ ...downloadableForm, description: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    placeholder="Provide context about what this pack contains..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow"
                >
                  Save Asset Document
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2.2: ADD / EDIT PLAN BUNDLE */}
      <AnimatePresence>
        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowPlanModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingPlanId ? 'Edit Membership Plan' : 'Create Membership Plan'}</h2>
                  <p className="text-gray-400 text-xs">Fill out features, billing rates, and ordering indexes</p>
                </div>
                <button onClick={() => setShowPlanModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePlanSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Plan Name / Title</label>
                    <input
                      type="text"
                      required
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      placeholder="e.g. Pro Creator Membership"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold">Price (e.g. DA)</label>
                    <input
                      type="text"
                      required
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      placeholder="e.g. 9,900 DA"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold font-bold">Brief Tagline Description</label>
                  <input
                    type="text"
                    required
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    placeholder="Short summary displayed under the name..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold">Ordering Sequence Position</label>
                    <input
                      type="number"
                      required
                      value={planForm.order}
                      onChange={(e) => setPlanForm({ ...planForm, order: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      placeholder="1"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      id="planIsPopular"
                      type="checkbox"
                      checked={planForm.isPopular}
                      onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                      className="w-5 h-5 rounded bg-black border border-purple-900/30 accent-purple-600 focus:outline-none"
                    />
                    <label htmlFor="planIsPopular" className="text-xs font-semibold text-gray-350 cursor-pointer font-mono select-none">Mark as &quot;Most Popular&quot;</label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono font-bold">Included Advantages (Line by Line)</label>
                  <textarea
                    rows={4}
                    value={planForm.featuresText}
                    onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    placeholder="Access to Basic Softwares&#10;100+ Premium Stock Sound Effects&#10;Standard 1080p Overlay Stock"
                  />
                  <span className="text-[10px] text-gray-500 italic mt-1 block font-mono">Write each unique bundle reward on a brand new line.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow"
                >
                  Save Membership Plan
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2.4: ADD / EDIT HOMEPAGE HERO VIDEO */}
      <AnimatePresence>
        {showHeroVideoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={() => setShowHeroVideoModal(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden z-10 text-left"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingHeroVideoId ? 'Edit Hero Video Path' : 'Add Hero Video Path'}</h2>
                  <p className="text-gray-400 text-xs">Direct the homepage intro board immediately to any video stream</p>
                </div>
                <button onClick={() => setShowHeroVideoModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleHeroVideoSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Video Display Title</label>
                  <input
                    type="text"
                    required
                    value={heroVideoForm.title}
                    onChange={(e) => setHeroVideoForm({ ...heroVideoForm, title: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    placeholder="e.g. Masterclass Intro Teaser"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">Video stream URL / path</label>
                  <input
                    type="text"
                    required
                    value={heroVideoForm.videoUrl}
                    onChange={(e) => setHeroVideoForm({ ...heroVideoForm, videoUrl: e.target.value })}
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none"
                    placeholder="e.g. https://domain.com/my-intro-file.mp4"
                  />
                  <span className="text-[10px] text-gray-450 block mt-1 leading-normal">
                    Accepts direct .mp4 / .webm video file URL, or standard YouTube, Vimeo, Google Drive preview links.
                  </span>
                </div>

                <div className="pt-2">
                  <label className="relative flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={heroVideoForm.isActive}
                      onChange={(e) => setHeroVideoForm({ ...heroVideoForm, isActive: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-450 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white relative" />
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Actively deploy as live homepage video</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loadingHeroVideos}
                  className="w-full py-4 mt-4 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow flex items-center justify-center gap-2"
                >
                  {loadingHeroVideos && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Video Document</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer" 
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} 
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-zinc-950 border border-purple-900/20 rounded-[2rem] p-8 w-full max-w-md shadow-2xl overflow-hidden z-10 text-left"
            >
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                {confirmDialog.title}
              </h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                {confirmDialog.message}
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/5 text-gray-300 hover:text-white hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    await confirmDialog.onConfirm();
                  }}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    confirmDialog.isDanger 
                      ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]' 
                      : 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.2)]'
                  }`}
                >
                  {confirmDialog.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );

  function setFormChapterAndTitle(val: string) {
    setChapterForm({ ...chapterForm, title: val });
  }

  function getEmbedVideoUrl(url: string) {
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
  }
}
