import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COURSES } from '../types';
import { BookOpen, Trophy, Clock, Star, Upload, Trash2, CheckCircle2, PlayCircle, Download, ExternalLink } from 'lucide-react';
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

  useEffect(() => {
    if (!user) return;

    // Listen to enrollments
    const qEnrollments = query(collection(db, 'enrollments'), where('uid', '==', user.uid));
    const unsubEnrollments = onSnapshot(qEnrollments, (snapshot) => {
      setEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
              const course = COURSES.find(c => c.id === courseId);
              await addDoc(collection(db, 'certificates'), {
                uid: user.uid,
                courseId: courseId,
                courseTitle: course?.title || 'Unknown Course',
                userName: userProfile?.displayName || 'Student',
                issuedAt: new Date().toISOString(),
                certificateUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${courseId}-${user.uid}&backgroundColor=9333ea&fontFamily=Arial&fontWeight=700` // Mock certificate URL
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !uploadTitle) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `videos/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'videos'), {
        uid: user.uid,
        title: uploadTitle,
        url,
        createdAt: new Date().toISOString()
      });

      setUploadTitle('');
      alert('Video uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
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
    const chapters = courseId === '1' ? 12 : courseId === '2' ? 18 : 24;
    const totalLessons = chapters * 3; 
    return Math.round((courseProgress.length / totalLessons) * 100);
  };

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
                <div className="text-2xl font-bold">{enrollments.length}</div>
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
                {enrollments.length > 0 ? enrollments.map((enrollment) => {
                  const course = COURSES.find(c => c.id === enrollment.courseId);
                  if (!course) return null;
                  const prog = getCourseProgress(course.id);
                  const courseLessons = progress.filter(p => p.courseId === course.id && p.completed);
                  
                  return (
                    <motion.div 
                      key={enrollment.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -5 }}
                      className="bg-zinc-950 border border-purple-900/20 rounded-3xl overflow-hidden group flex flex-col"
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/courses/${course.id}`} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
                            <PlayCircle className="w-5 h-5" />
                            {t('dashboard.continue')}
                          </Link>
                        </div>
                        <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {course.level}
                        </div>
                        {prog === 100 && (
                          <div className="absolute top-4 left-4 px-3 py-1 bg-yellow-500 text-black rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Completed
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex-grow flex flex-col">
                        <h3 className="font-bold text-lg mb-4 group-hover:text-purple-400 transition-colors">{course.title}</h3>
                        
                        <div className="space-y-4 mt-auto">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400 font-medium">{t('dashboard.progress')}</span>
                              <span className="text-purple-400 font-bold">{prog}%</span>
                            </div>
                            <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-purple-900/10 p-0.5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${prog}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-brand-radial h-full rounded-full shadow-[0_0_10px_rgba(147,51,234,0.5)]" 
                              />
                            </div>
                          </div>

                          {/* Lesson Indicators */}
                          <div className="pt-4 border-t border-purple-900/10">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-bold">{t('dashboard.completedLessons')}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from({ length: course.id === '1' ? 12 : course.id === '2' ? 18 : 24 }).map((_, i) => {
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

            {/* Video Upload Section */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Upload className="w-6 h-6 text-purple-500" />
                {t('dashboard.uploadTitle')}
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder={t('dashboard.uploadPlaceholder')}
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="bg-black border border-purple-900/30 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="video/*"
                      onChange={handleVideoUpload}
                      disabled={uploading || !uploadTitle}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className={`w-full h-full bg-purple-600/10 border-2 border-dashed border-purple-600/30 rounded-2xl flex items-center justify-center gap-3 px-6 py-4 transition-colors ${uploading ? 'opacity-50' : 'hover:bg-purple-600/20'}`}>
                      {uploading ? <Clock className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      <span className="font-bold">{uploading ? t('dashboard.uploading') : t('dashboard.uploadBtn')}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userVideos.map((video) => (
                    <div key={video.id} className="bg-black border border-purple-900/20 p-4 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                          <PlayCircle className="w-6 h-6 text-purple-500" />
                        </div>
                        <div className="truncate">
                          <div className="font-bold truncate">{video.title}</div>
                          <div className="text-xs text-gray-500">{new Date(video.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteVideo(video.id)}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar: Certificates & Reviews */}
          <div className="space-y-8">
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

            {/* Quick Stats */}
            <section className="bg-brand-radial p-8 rounded-[2.5rem] text-white">
              <h2 className="text-xl font-bold mb-4">{t('dashboard.streak')}</h2>
              <div className="flex items-center gap-4 mb-6">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="text-5xl font-black"
                >
                  7
                </motion.div>
                <div className="text-sm font-medium opacity-80 uppercase tracking-wider">{t('dashboard.days')}</div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>{t('dashboard.weeklyGoal')}</span>
                  <span>80%</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '80%' }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    className="bg-white h-full" 
                  />
                </div>
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
                  const course = COURSES.find(c => c.id === activity.courseId);
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
    </div>
  );
}
