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
  updateDoc 
} from '../firebase';
import { useLanguage } from '../context/LanguageContext';

type AdminTab = 'courses' | 'chapters' | 'students' | 'student-works' | 'settings';

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
  const [websiteSettings, setWebsiteSettings] = useState<any>({
    webName: 'CUTSCENE Academy',
    contactEmail: 'contact@cutscene-academy.com',
    instagram: 'https://www.instagram.com/cutscene.dz/',
    youtube: 'https://youtube.com/cutscene',
    discord: 'https://discord.gg/cutscene'
  });

  // Selected state for chapters course-filter
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Loading states
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(false);
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
    duration: '8 weeks'
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
    homework_url: ''
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
        duration: '8 weeks'
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
      duration: course.duration || '8 weeks'
    });
    setShowCourseModal(true);
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete the course "${courseTitle}"? This will lock students and cannot be undone.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      showToast('success', `Course "${courseTitle}" deleted from database.`);
      fetchCourses();
    } catch (err: any) {
      console.error('Delete course failure:', err);
      showToast('error', err.message || 'Error occurred while dropping course.');
    }
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
        homework_url: ''
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
      homework_url: chapter.homework_url || ''
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
      homework_url: ''
    });
    setShowChapterModal(true);
  };

  const handleDeleteChapter = async (chapterId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete chapter "${title}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, `courses/${selectedCourseId}/chapters`, chapterId));
      showToast('success', `Chapter "${title}" removed.`);
      fetchChaptersForCourse(selectedCourseId);
    } catch (err: any) {
      console.error('Delete chapter error:', err);
      showToast('error', 'Failed to drop chapter.');
    }
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
    if (!window.confirm(`Are you sure you want to change role of ${targetUser.displayName || targetUser.email} to "${nextRole}"?`)) {
      return;
    }
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
  };

  const handleDeleteUserDoc = async (targetUser: any) => {
    if (!window.confirm(`CRITICAL WARNING: This will delete the user document for ${targetUser.displayName || targetUser.email} from Firestore. This will wipe their course progress database indexes. Proceed?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', targetUser.id));
      showToast('success', 'User profile discarded.');
      fetchUsers();
    } catch (err: any) {
      showToast('error', 'Error discarding user registry document.');
    }
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
    if (!window.confirm(`Confirm deleting student artwork for "${studentName}" from the museum showcase?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'student_works', workId));
      showToast('success', 'Showcase discarded.');
      fetchStudentWorks();
    } catch (err: any) {
      showToast('error', 'Unable to delete database showcase.');
    }
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
              { id: 'students', name: 'Students Ledger', icon: Users },
              { id: 'student-works', name: 'Showcase Gallery', icon: Film },
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
                    duration: '8 weeks'
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

    </div>
  );

  function setFormChapterAndTitle(val: string) {
    setChapterForm({ ...chapterForm, title: val });
  }
}
