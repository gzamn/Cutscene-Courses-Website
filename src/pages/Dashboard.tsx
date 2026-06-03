import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db, storage, handleFirestoreError, OperationType, collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs, ref, uploadBytes, getDownloadURL } from '../firebase';
import { BookOpen, Trophy, Clock, Star, Upload, Trash2, CheckCircle2, PlayCircle, Download, ExternalLink, Lock, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [userVideos, setUserVideos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [firestoreCourses, setFirestoreCourses] = useState<any[]>([]);
  const [chaptersCountMap, setChaptersCountMap] = useState<{ [courseId: string]: number }>({});
  const [downloadables, setDownloadables] = useState<any[]>([]);
  const [hasDownloadAccess, setHasDownloadAccess] = useState(false);
  const [userDownloads, setUserDownloads] = useState<any[]>([]);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState('All');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [bunnyUploading, setBunnyUploading] = useState(false);
  const [bunnyUploadProgress, setBunnyUploadProgress] = useState(0);
  const [bunnySuccessText, setBunnySuccessText] = useState<string | null>(null);
  const bunnyFileInputRef = React.useRef<HTMLInputElement>(null);

  // Direct video upload states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoSuccessText, setVideoSuccessText] = useState<string | null>(null);
  const videoFileInputRef = React.useRef<HTMLInputElement>(null);

  // Listen to courses collection
  useEffect(() => {
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      setFirestoreCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error listening to courses:", error));
    return () => unsubCourses();
  }, []);

  // Fetch chapter counts of enrolled courses
  useEffect(() => {
    if (enrollments.length === 0) return;
    enrollments.forEach(async (enrollment) => {
      try {
        const snap = await getDocs(collection(db, `courses/${enrollment.courseId}/chapters`));
        let count = snap.size;
        if (count === 0) {
          const dbCourse = firestoreCourses.find(c => c.id === enrollment.courseId);
          if (dbCourse && Array.isArray(dbCourse.chapters)) {
            count = dbCourse.chapters.length;
          }
        }
        if (count === 0) {
          count = enrollment.courseId === '1' ? 12 : enrollment.courseId === '2' ? 18 : enrollment.courseId === '3' ? 24 : 10;
        }
        setChaptersCountMap(prev => ({
          ...prev,
          [enrollment.courseId]: count
        }));
      } catch (err) {
        console.error("Error fetching chapters count for course", enrollment.courseId, err);
      }
    });
  }, [enrollments, firestoreCourses]);

  useEffect(() => {
    if (!user) return;

    // Listen to enrollments
    const qEnrollments = query(collection(db, 'enrollments'), where('uid', '==', user.uid));
    const unsubEnrollments = onSnapshot(qEnrollments, (snapshot) => {
      const enrollmentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEnrollments(enrollmentData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));

    // Listen to progress
    const qProgress = query(collection(db, 'progress'), where('uid', '==', user.uid));
    const unsubProgress = onSnapshot(qProgress, (snapshot) => {
      setProgress(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'progress'));

    // Listen to certificates
    const qCertificates = query(collection(db, 'certificates'), where('uid', '==', user.uid));
    const unsubCertificates = onSnapshot(qCertificates, (snapshot) => {
      setCertificates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'certificates'));

    // Listen to user videos
    const qVideos = query(collection(db, 'videos'), where('uid', '==', user.uid));
    const unsubVideos = onSnapshot(qVideos, (snapshot) => {
      setUserVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'videos'));

    return () => {
      unsubEnrollments();
      unsubProgress();
      unsubCertificates();
      unsubVideos();
    };
  }, [user]);

  // Auto-generate certificates logic
  useEffect(() => {
    if (!user || enrollments.length === 0 || progress.length === 0) return;

    const checkAndGenerateCertificates = async () => {
      for (const enrollment of enrollments) {
        const courseId = enrollment.courseId;
        const prog = getCourseProgress(courseId);
        
        if (prog === 100) {
          // Check if certificate already exists
          const certExists = certificates.some(c => c.courseId === courseId);
          if (!certExists) {
            try {
              const course = firestoreCourses.find(c => c.id === courseId);
              await addDoc(collection(db, 'certificates'), {
                uid: user.uid,
                courseId: courseId,
                courseTitle: course?.title || 'Unknown Course',
                userName: userProfile?.displayName || 'Student',
                issuedAt: new Date().toISOString(),
                certificateUrl: course?.certificateUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${courseId}-${user.uid}&backgroundColor=9333ea&fontFamily=Arial&fontWeight=700` // Mock certificate URL
              });
              console.log(`Certificate generated for course ${courseId}`);
            } catch (error) {
              console.error('Failed to generate certificate:', error);
            }
          }
        }
      }
    };

    checkAndGenerateCertificates();
  }, [user, enrollments, progress, certificates]);

  // Check downloadables access
  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) {
        setHasDownloadAccess(false);
        return;
      }

      // 1. Admin always has full access
      if (userProfile?.role === 'admin') {
        setHasDownloadAccess(true);
        return;
      }

      // 2. Active plan/subscription check or explicitly subscribed
      const hasPremiumPlan = userProfile?.activePlan && userProfile.activePlan !== 'Free Plan';
      if (hasPremiumPlan || userProfile?.hasPlan || userProfile?.subscribed) {
        setHasDownloadAccess(true);
        return;
      }

      // 3. User bought a course check (enrollments collection)
      try {
        const qEnrollments = query(collection(db, 'enrollments'), where('uid', '==', user.uid));
        const enrollSnap = await getDocs(qEnrollments);
        if (!enrollSnap.empty) {
          setHasDownloadAccess(true);
        } else {
          setHasDownloadAccess(false);
        }
      } catch (err) {
        console.error('Error verifying enrollments:', err);
        setHasDownloadAccess(false);
      }
    };

    checkUserAccess();
  }, [user, userProfile]);

  // Load downloadables list
  useEffect(() => {
    const unsubDownloadables = onSnapshot(collection(db, 'downloadables'), (snapshot) => {
      setDownloadables(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error listening to downloadables:", error));
    return () => unsubDownloadables();
  }, []);

  // Listen to user downloaded/saved files
  useEffect(() => {
    if (!user) return;
    const qDownloads = query(collection(db, 'user_downloads'), where('uid', '==', user.uid));
    const unsubDownloads = onSnapshot(qDownloads, (snapshot) => {
      setUserDownloads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error listening to user downloads:", error));
    
    return () => unsubDownloads();
  }, [user]);

  const handleDownload = async (item: any) => {
    if (!hasDownloadAccess) {
      alert('This downloadable asset is locked! Kindly upgrade your plan to unlock downloads.');
      return;
    }

    // Add record of this download in user library if downloaded here & not present
    try {
      if (user) {
        const qExist = query(
          collection(db, 'user_downloads'),
          where('uid', '==', user.uid),
          where('downloadableId', '==', item.downloadableId || item.id)
        );
        const existSnap = await getDocs(qExist);
        if (existSnap.empty) {
          await addDoc(collection(db, 'user_downloads'), {
            uid: user.uid,
            downloadableId: item.downloadableId || item.id,
            name: item.name,
            category: item.category,
            imageUrl: item.imageUrl || '',
            downloadUrl: item.downloadUrl,
            description: item.description || '',
            savedAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error('Failed to register saved asset:', err);
    }

    const link = document.createElement('a');
    link.href = item.downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const handleBunnyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setBunnyUploading(true);
    setBunnyUploadProgress(10);
    setBunnySuccessText(null);
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
        throw new Error(errText || 'Failed to transfer file to Bunny proxy.');
      }

      const uploadResult = await uploadRes.json();
      setBunnyUploadProgress(80);

      let category = 'Documents';
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (['mp4', 'mov', 'avi', 'mkv'].includes(extension || '')) {
        category = 'Videos';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
        category = 'Images';
      } else if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
        category = 'Music';
      } else if (['exe', 'dmg', 'pkg', 'zip', 'rar'].includes(extension || '')) {
        category = 'Softwares';
      }

      if (user) {
        await addDoc(collection(db, 'user_downloads'), {
          uid: user.uid,
          downloadableId: `bunny-${Date.now()}`,
          name: file.name,
          category: category,
          imageUrl: category === 'Images' ? uploadResult.publicUrl : '',
          downloadUrl: uploadResult.publicUrl,
          description: `Secure file uploaded via BunnyCDN on ${new Date().toLocaleDateString()}`,
          savedAt: new Date().toISOString()
        });
      }

      setBunnyUploadProgress(100);
      setBunnySuccessText(`"${file.name}" uploaded successfully! Added to your library.`);
      setTimeout(() => {
        setBunnyUploadProgress(0);
        setBunnyUploading(false);
      }, 1000);
      setTimeout(() => {
        setBunnySuccessText(null);
      }, 4000);

    } catch (err: any) {
      console.error('Bunny upload failed:', err);
      alert(`Upload failed: ${err.message || err}`);
      setBunnyUploading(false);
      setBunnyUploadProgress(0);
      setBunnySuccessText(null);
    }
  };

  const handleVideoDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoFile || !uploadTitle.trim()) return;

    setVideoUploading(true);
    setVideoUploadProgress(10);
    setVideoSuccessText(null);
    try {
      setVideoUploadProgress(20);
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: videoFile.name })
      });

      if (!signRes.ok) {
        throw new Error('Failed to obtain upload authorization details from server.');
      }
      const signData = await signRes.json();
      setVideoUploadProgress(45);

      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': videoFile.type || 'application/octet-stream'
        },
        body: videoFile
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(errText || 'Failed to transfer video to Bunny.');
      }

      const uploadResult = await uploadRes.json();
      setVideoUploadProgress(80);

      await addDoc(collection(db, 'videos'), {
        uid: user.uid,
        title: uploadTitle.trim(),
        url: uploadResult.publicUrl,
        createdAt: new Date().toISOString()
      });

      setVideoUploadProgress(100);
      setVideoSuccessText(`"${uploadTitle}" uploaded successfully!`);
      
      // Clear inputs
      setVideoFile(null);
      setUploadTitle('');
      
      setTimeout(() => {
        setVideoUploadProgress(0);
        setVideoUploading(false);
      }, 1000);
      setTimeout(() => {
        setVideoSuccessText(null);
      }, 4000);

    } catch (err: any) {
      console.error('Video direct upload failed:', err);
      alert(`Video upload failed: ${err.message || err}`);
      setVideoUploading(false);
      setVideoUploadProgress(0);
      setVideoSuccessText(null);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    try {
      await deleteDoc(doc(db, 'videos', videoId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `videos/${videoId}`);
    }
  };

  const getCourseProgress = (courseId: string) => {
    const courseProgress = progress.filter(p => p.courseId === courseId && p.completed);
    
    const chaptersCount = chaptersCountMap[courseId] || (courseId === '1' ? 12 : courseId === '2' ? 18 : courseId === '3' ? 24 : 10);
    const totalLessons = chaptersCount * 3;
    
    if (totalLessons === 0) return 0;
    return Math.min(100, Math.round((courseProgress.length / totalLessons) * 100));
  };

  const getContinueUrl = (courseId: string) => {
    const courseProgress = progress.filter(p => p.courseId === courseId && p.completed);
    const completedSet = new Set(courseProgress.map(p => `${p.chapter}-${p.type}`));
    
    const chaptersCount = chaptersCountMap[courseId] || (courseId === '1' ? 12 : courseId === '2' ? 18 : courseId === '3' ? 24 : 10);
    
    for (let c = 1; c <= chaptersCount; c++) {
      for (const type of ['session', 'exercise', 'homework']) {
        if (!completedSet.has(`${c}-${type}`)) {
          return `/courses/${courseId}/video/${c}/${type}`;
        }
      }
    }
    
    // Default to chapter 1 session if everything completed
    return `/courses/${courseId}/video/1/session`;
  };

  const validEnrollments = enrollments.filter(e => e.format !== 'plan' && (e.receiptUrl || e.paid || e.status === 'approved' || e.status === 'pending_verification'));

  const latestActivity = [...progress]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t('dashboard.welcome')}, {userProfile?.displayName || 'Student'}!</h1>
            <p className="text-gray-400">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-zinc-900/50 border border-purple-900/30 p-4 rounded-2xl flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{validEnrollments.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{t('dashboard.enrolled')}</div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-purple-900/30 p-4 rounded-2xl flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{certificates.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{t('dashboard.certificates')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content: Courses & Videos */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enrolled Courses */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <PlayCircle className="w-6 h-6 text-purple-500" />
                {t('dashboard.yourCourses')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {validEnrollments.length > 0 ? validEnrollments.map((enrollment) => {
                  const course = firestoreCourses.find(c => c.id === enrollment.courseId);
                  if (!course) return null;
                  const prog = getCourseProgress(course.id);
                  const courseLessons = progress.filter(p => p.courseId === course.id && p.completed);
                  
                  const totalChapters = course.chapters?.length || course.lessons?.length || 12;
                  
                  const isLocked = !enrollment.paid || enrollment.status === 'pending_verification';
                  
                  return (
                    <motion.div 
                      key={enrollment.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={isLocked ? {} : { y: -5 }}
                      className={`border rounded-3xl overflow-hidden group flex flex-col transition-all duration-300 ${isLocked ? 'bg-zinc-950/60 border-purple-900/10 grayscale-[35%]' : 'bg-zinc-950 border-purple-900/20'}`}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img src={course.image} alt={course.title} className="w-full h-full object-cover transition-transform duration-500" referrerPolicy="no-referrer" />
                        
                        {isLocked ? (
                          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center select-none">
                            <div className="w-10 h-10 rounded-full bg-purple-950/60 border border-purple-500/35 flex items-center justify-center mb-3">
                              <Lock className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="px-3 py-1 bg-purple-900/30 border border-purple-500/20 rounded-full text-[10px] font-black uppercase tracking-wider text-purple-300 animate-pulse">
                              payment confirmation in process
                            </div>
                            <p className="text-[9px] text-gray-500 mt-2 font-mono">Usually takes 4-6 hours</p>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={getContinueUrl(course.id)} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
                              <PlayCircle className="w-5 h-5" />
                              {t('dashboard.continue')}
                            </Link>
                          </div>
                        )}

                        <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {course.level}
                        </div>
                        {prog === 100 && !isLocked && (
                          <div className="absolute top-4 left-4 px-3 py-1 bg-yellow-500 text-black rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Completed
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex-grow flex flex-col">
                        <h3 className={`font-bold text-lg mb-4 transition-colors ${isLocked ? 'text-gray-400' : 'group-hover:text-purple-400'}`}>{course.title}</h3>
                        
                        <div className="space-y-4 mt-auto">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400 font-medium">{t('dashboard.progress')}</span>
                              <span className="text-purple-400 font-bold">{isLocked ? 0 : prog}%</span>
                            </div>
                            <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-purple-900/10 p-0.5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: isLocked ? '0%' : `${prog}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-brand-radial h-full rounded-full shadow-[0_0_10px_rgba(147,51,234,0.5)]" 
                              />
                            </div>
                          </div>

                          {/* Lesson Indicators */}
                          <div className="pt-4 border-t border-purple-900/10">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-bold">{t('dashboard.completedLessons')}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from({ length: totalChapters }).map((_, i) => {
                                const chapter = i + 1;
                                const isChapterDone = courseLessons.some(p => p.chapter === chapter);
                                return (
                                  <motion.div
                                    key={chapter}
                                    initial={false}
                                    animate={{ 
                                      backgroundColor: isChapterDone ? '#9333ea' : '#18181b',
                                      scale: isChapterDone ? 1.1 : 1
                                    }}
                                    className={`w-2 h-2 rounded-full border ${isChapterDone ? 'border-purple-400' : 'border-purple-900/20'}`}
                                    title={`Chapter ${chapter}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="col-span-2 bg-zinc-950 border border-dashed border-purple-900/30 p-12 rounded-3xl text-center">
                    <p className="text-gray-500 mb-4">{t('dashboard.noEnrollments')}</p>
                    <Link to="/courses" className="text-purple-400 font-bold hover:underline">{t('dashboard.browse')}</Link>
                  </div>
                )}
              </div>
            </section>

            {/* My Library & Presets */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <FolderOpen className="w-6 h-6 text-purple-500" />
                  My Library
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <input 
                    type="file" 
                    ref={bunnyFileInputRef} 
                    className="hidden" 
                    onChange={handleBunnyFileUpload} 
                  />
                  
                  <button
                    type="button"
                    disabled={bunnyUploading}
                    onClick={() => {
                      setBunnySuccessText(null);
                      bunnyFileInputRef.current?.click();
                    }}
                    className="overflow-hidden px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-900/20"
                  >
                    {bunnyUploading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Uploading {bunnyUploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLibraryExpanded(true)}
                    className="text-purple-400 font-bold hover:underline text-sm flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
                  >
                    See all
                    <ExternalLink className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>

              {userDownloads.length > 0 || bunnyUploading || bunnySuccessText ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Realtime Uploading Placeholder */}
                  {bunnyUploading && (
                    <div className="bg-purple-900/10 border border-purple-500/25 p-5 rounded-2xl flex flex-col justify-between animate-pulse">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-450 bg-purple-500/20 px-2 py-0.5 rounded-md">
                            Uploading
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-purple-300">File is transferring to cloud workspace...</h3>
                        <div className="w-full bg-zinc-90 w-full bg-zinc-900 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div 
                            className="bg-purple-500 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${bunnyUploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 mt-2 block font-mono">{bunnyUploadProgress}% completed</span>
                      </div>
                    </div>
                  )}

                  {/* Realtime Upload Success Badge */}
                  {bunnySuccessText && (
                    <div className="bg-green-950/40 border border-green-500/20 p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/20 px-2 py-0.5 rounded-md">
                            Success
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-green-450">Save Complete!</h3>
                        <p className="text-xs text-gray-300 mt-1">{bunnySuccessText}</p>
                      </div>
                    </div>
                  )}

                  {userDownloads.slice(0, 4).map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-black border border-purple-900/10 p-5 rounded-2xl flex flex-col justify-between hover:border-purple-500/25 transition-all group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-gray-100 group-hover:text-purple-400 transition-colors line-clamp-1">{item.name}</h3>
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-purple-900/10 flex items-center justify-between">
                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                          Saved File
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await deleteDoc(doc(db, 'user_downloads', item.id));
                              } catch (err) {
                                console.error('Failed to remove saved asset:', err);
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            title="Remove from Library"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownload(item)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-black/40 border border-dashed border-purple-900/25 p-12 rounded-2xl text-center">
                  <FolderOpen className="w-10 h-10 text-gray-650 mx-auto mb-3" />
                  <p className="text-gray-450 font-bold mb-2 text-sm text-gray-200">Your library is currently empty</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4 leading-relaxed">Choose and download premium assets to populate your library feed.</p>
                  <Link to="/downloadables" className="text-purple-400 font-extrabold hover:underline text-xs tracking-wider uppercase">
                    Browse Premium Hub
                  </Link>
                </div>
              )}
            </section>

            {/* Video Upload Section */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Upload className="w-6 h-6 text-purple-500" />
                {t('dashboard.uploadTitle')}
              </h2>
              <div className="space-y-6">
                <form onSubmit={handleVideoDirectUpload} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      required
                      placeholder={t('dashboard.uploadPlaceholder') || "Video Title"}
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="bg-black border border-purple-900/30 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-white"
                    />

                    <div className="relative">
                      <input 
                        type="file" 
                        accept="video/*"
                        ref={videoFileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setVideoFile(file);
                            // Auto-set title if it's empty
                            if (!uploadTitle.trim()) {
                              setUploadTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
                            }
                          }
                        }}
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setVideoSuccessText(null);
                          videoFileInputRef.current?.click();
                        }}
                        className="w-full bg-black border border-purple-900/30 rounded-2xl px-6 py-4 text-left text-sm text-gray-400 hover:border-purple-500/50 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate max-w-[85%]">
                          {videoFile ? videoFile.name : "Select Project Video File"}
                        </span>
                        <PlayCircle className="w-5 h-5 text-purple-500 shrink-0" />
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={videoUploading || !uploadTitle.trim() || !videoFile}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 px-6 py-4 transition-colors cursor-pointer"
                  >
                    {videoUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Uploading {videoUploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Upload Project Video</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videoUploading && (
                    <div className="bg-purple-900/10 border border-purple-500/25 p-4 rounded-2xl flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-4 overflow-hidden w-full">
                        <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="font-bold text-sm text-purple-300 truncate">Uploading video: {uploadTitle || "New Video"}</div>
                          <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div 
                              className="bg-purple-500 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${videoUploadProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 block font-mono">{videoUploadProgress}% completed</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {videoSuccessText && (
                    <div className="bg-green-950/45 border border-green-500/25 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-12 h-12 bg-green-600/25 rounded-lg flex items-center justify-center shrink-0 text-green-400 text-lg font-bold">
                          ✓
                        </div>
                        <div className="truncate text-left">
                          <div className="font-bold text-sm text-green-400">Success</div>
                          <div className="text-xs text-gray-300 truncate max-w-[200px]" title={videoSuccessText}>{videoSuccessText}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {userVideos.map((video) => (
                    <div key={video.id} className="bg-black border border-purple-900/20 p-4 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                          <PlayCircle className="w-6 h-6 text-purple-500" />
                        </div>
                        <div className="truncate text-left">
                          <div className="font-bold truncate text-gray-100">{video.title}</div>
                          <div className="text-xs text-gray-500">{new Date(video.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a 
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-purple-400 hover:text-purple-300 transition-colors"
                          title="View Uploaded Video"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={() => deleteVideo(video.id)}
                          className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar: Certificates & Reviews */}
          <div className="space-y-8">
            {/* Your Plan */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <Star className="w-6 h-6 text-purple-500" />
                  Your Plan
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  userProfile?.activePlan === 'Free Plan' ? 'bg-zinc-900 border border-purple-950/40 text-purple-400' : 'bg-purple-650 border border-purple-400 text-white'
                }`}>
                  {userProfile?.activePlan === 'Free Plan' ? 'Free-Tier' : 'Active'}
                </span>
              </h2>
              
              <div className="bg-black/40 border border-purple-900/10 p-5 rounded-2xl space-y-4">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Plan Name</div>
                  <div className="text-base font-black text-white mt-1 break-words">{userProfile?.activePlan || 'Free Plan'}</div>
                </div>
                
                <div className="pt-4 border-t border-purple-900/10 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Pricing / Rate</div>
                    <div className="text-xs font-bold text-purple-400 mt-1">{userProfile?.activePlanPrice ? `${userProfile.activePlanPrice}/month` : '0 DA/month'}</div>
                  </div>
                  {userProfile?.activePlan === 'Free Plan' && (
                    <Link
                      to="/plans"
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-purple-600/20 shrink-0"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {/* Certificates */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-500" />
                {t('dashboard.certTitle')}
              </h2>
              <div className="space-y-4">
                {certificates.length > 0 ? certificates.map((cert) => (
                  <div key={cert.id} className="bg-black border border-purple-900/20 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{cert.courseTitle}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{t('dashboard.certEarned')}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={cert.certificateUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-purple-900/30 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t('dashboard.viewCert')}
                      </a>
                      <a 
                        href={cert.certificateUrl} 
                        download={`Certificate-${cert.courseTitle}.svg`}
                        className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all"
                        title="Download Certificate"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-sm text-center py-4">{t('dashboard.noCert')}</p>
                )}
              </div>
            </section>



            {/* Latest Activity */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6 text-purple-500" />
                {t('dashboard.latestActivity')}
              </h2>
              <div className="space-y-4">
                {latestActivity.length > 0 ? latestActivity.map((activity, i) => {
                  const course = firestoreCourses.find(c => c.id === activity.courseId);
                  return (
                    <motion.div 
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-black/40 border border-purple-900/10 rounded-xl"
                    >
                      <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-300">
                          Chapter {activity.chapter}: {activity.type}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                          {course?.title}
                        </div>
                        <div className="text-[10px] text-purple-400/60 mt-1">
                          {new Date(activity.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <p className="text-gray-500 text-xs text-center py-4 italic">{t('dashboard.noActivity')}</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* FULL-SCREEN EXPANDED MY LIBRARY MODAL */}
      <AnimatePresence>
        {isLibraryExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col overflow-hidden"
          >
            {/* Soft Ambient Background Glows */}
            <div className="absolute top-[10%] left-[20%] w-[50%] h-[40%] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] bg-purple-650/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header Content */}
            <div className="relative z-10 border-b border-purple-900/10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto w-full shrink-0">
              <div>
                <div className="flex items-center gap-2 text-purple-400 font-extrabold text-[10px] uppercase tracking-widest mb-1">
                  <FolderOpen className="w-3.5 h-3.5 animate-pulse" />
                  Your Customized Repository
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  MY SAVED LIBRARY
                </h1>
                <p className="text-xs text-gray-450 mt-1">
                  Access and instantly re-download any of the {userDownloads.length} assets you previously saved from the hub
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Link
                  to="/downloadables"
                  onClick={() => setIsLibraryExpanded(false)}
                  className="px-5 py-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-405 font-bold rounded-2xl border border-purple-500/15 text-xs uppercase tracking-wider transition-all"
                >
                  Explore Catalog
                </Link>
                <button
                  type="button"
                  onClick={() => setIsLibraryExpanded(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border border-white/5 transition-all text-xs font-bold font-mono cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Search and Categories bar inside fullscreen library */}
            <div className="relative z-10 p-4 md:px-8 border-b border-purple-900/5 max-w-7xl mx-auto w-full shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <input
                  type="text"
                  placeholder="Filter through your saved files..."
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  className="w-full bg-zinc-950/85 border border-purple-900/20 rounded-2xl pl-4 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-all"
                />
              </div>

              {/* Tag Carousel */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none justify-start pb-1">
                {['All', 'Softwares', 'Videos', 'Images', 'Music', 'Sound Effects'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setLibraryFilter(cat)}
                    className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider shrink-0 transition-all border ${
                      libraryFilter === cat
                        ? 'bg-purple-600 text-white border-purple-505 shadow-md'
                        : 'bg-zinc-950/40 text-gray-400 hover:text-white border-white/5 hover:bg-zinc-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Container */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full">
              {(() => {
                const filteredLibraryItems = userDownloads.filter(item => {
                  const matchesSearch = item.name.toLowerCase().includes(libraryQuery.toLowerCase()) || 
                                        (item.description && item.description.toLowerCase().includes(libraryQuery.toLowerCase()));
                  const matchesCategory = libraryFilter === 'All' || item.category === libraryFilter;
                  return matchesSearch && matchesCategory;
                });

                if (filteredLibraryItems.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto h-full">
                      <div className="w-16 h-16 rounded-3xl bg-zinc-900/50 border border-white/5 flex items-center justify-center text-gray-505 mb-6">
                        <FolderOpen className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-lg text-gray-200">No matching library assets found</h3>
                      <p className="text-xs text-gray-450 mt-2 leading-relaxed">
                        {userDownloads.length === 0 
                          ? "You haven't saved or downloaded any premium source files or software presets yet."
                          : "Try checking spelling or choosing another Category selection filter above."}
                      </p>
                      <Link
                        to="/downloadables"
                        onClick={() => setIsLibraryExpanded(false)}
                        className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all inline-block"
                      >
                        Browse Premium Downloads
                      </Link>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLibraryItems.map((item) => (
                      <div 
                        key={item.id}
                        className="bg-zinc-950 border border-purple-900/10 rounded-3xl overflow-hidden group hover:border-purple-500/20 transition-all flex flex-col h-full relative"
                      >
                        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/80 border border-white/5 text-[10px] text-gray-300 font-extrabold uppercase shadow-md animate-fade-in">
                          {item.category}
                        </div>

                        {/* Cover Thumbnail */}
                        <div className="h-36 overflow-hidden relative bg-zinc-900 shrink-0">
                          <img 
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80'} 
                            alt={item.name || 'Creative File'} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/10 to-transparent pointer-events-none" />
                        </div>

                        <div className="p-5 text-left flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-gray-100 group-hover:text-purple-400 transition-colors line-clamp-1">
                              {item.name}
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed mt-1.5 line-clamp-2">
                              {item.description || 'Premium asset download saved inside your active CUTSCENE workspace.'}
                            </p>
                          </div>

                          <div className="pt-4 mt-4 border-t border-purple-900/10 flex items-center justify-between gap-3">
                            <button
                              onClick={async () => {
                                try {
                                  await deleteDoc(doc(db, 'user_downloads', item.id));
                                } catch (err) {
                                  console.error('Failed to remove saved asset:', err);
                                }
                              }}
                              className="text-[10px] text-gray-400 hover:text-red-400 transition-colors py-1 px-2 hover:bg-red-500/10 rounded-lg flex items-center gap-1.5 shrink-0"
                              title="Remove file from my library representation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>

                            <button
                              onClick={() => handleDownload(item)}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download File
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
