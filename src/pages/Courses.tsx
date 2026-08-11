import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, ArrowRight, Search, CheckCircle2, User, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useRegion } from '../context/RegionContext';
import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType, ensureDefaultCoursesSeeded, collection, getDocs, query, where, onSnapshot } from '../firebase';
import { SparkleButton, RainbowButton } from '../components/AnimatedButtons';
import { useAuth } from '../context/AuthContext';
import { SoftwareSelectionModal, DEFAULT_SOFTWARE_OPTIONS } from '../components/SoftwareSelectionModal';
import { CourseSoftwareOption } from '../types';

export default function Courses() {
  const { t, language } = useLanguage();
  const { getCoursePrice } = useRegion();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Software Selection Modal State
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<any>(null);
  const [targetDestination, setTargetDestination] = useState<'details' | 'payment'>('details');
  const [isSoftwareModalOpen, setIsSoftwareModalOpen] = useState(false);

  const handleOpenSoftwareModal = (course: any, target: 'details' | 'payment') => {
    // If course has software options or is video editing course (id === '1')
    setSelectedCourseForModal(course);
    setTargetDestination(target);
    setIsSoftwareModalOpen(true);
  };

  const handleConfirmSoftware = (softwareId: string, option: CourseSoftwareOption) => {
    if (!selectedCourseForModal) return;
    const courseId = selectedCourseForModal.id;
    localStorage.setItem(`selected_software_${courseId}`, softwareId);
    setIsSoftwareModalOpen(false);

    if (targetDestination === 'payment') {
      navigate(`/payment?courseId=${courseId}&software=${softwareId}`);
    } else {
      navigate(`/courses/${courseId}?software=${softwareId}`);
    }
  };

  useEffect(() => {
    if (!user) {
      setEnrollments([]);
      return;
    }
    try {
      const q = query(collection(db, 'enrollments'), where('uid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEnrollments(list);
      }, (error) => {
        console.error('Error listening to enrollments:', error);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('Error starting enrollments listener:', error);
    }
  }, [user]);

  useEffect(() => {
    const fetchFirestoreCourses = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'courses'));
        let list = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        if (list.length === 0) {
          console.log('Courses list is empty, attempting to seed default courses...');
          await ensureDefaultCoursesSeeded();
          const querySnapshotSec = await getDocs(collection(db, 'courses'));
          list = querySnapshotSec.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        }
        
        setCourses(list);
      } catch (error) {
        console.error('Error fetching courses from Firestore:', error);
        handleFirestoreError(error, OperationType.LIST, 'courses');
      } finally {
        setLoading(false);
      }
    };

    fetchFirestoreCourses();
  }, []);
  
  return (
    <div className="min-h-screen bg-transparent pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('courses.title')}</h1>
          <p className="text-gray-400 text-lg">{t('courses.subtitle')}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 bg-zinc-950/30 rounded-[2.5rem] border border-dashed border-purple-900/20 max-w-4xl mx-auto">
            <p className="text-gray-400 text-lg mb-2">No courses available yet</p>
            <p className="text-gray-500 text-sm">Please add courses from the Firebase Console dashboard.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course, i) => (
              <motion.div 
                key={course.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ 
                  opacity: { delay: i * 0.1, duration: 0.4 },
                  y: { delay: i * 0.1, duration: 0.4 },
                  scale: { duration: 0.2, ease: "easeOut" }
                }}
                className="bg-zinc-950 border border-purple-900/20 rounded-[2rem] overflow-hidden flex flex-col group h-full shadow-xl hover:shadow-[0_0_30px_rgba(147,51,234,0.15)] transition-all duration-300"
              >
                <div 
                  onClick={() => !course.isComingSoon && handleOpenSoftwareModal(course, 'details')} 
                  className="relative aspect-video overflow-hidden shrink-0 cursor-pointer group/img"
                >
                  <img 
                    src={course.image || 'https://picsum.photos/seed/course/800/600'} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  {course.isComingSoon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                      <div className="w-12 h-12 bg-black/60 border border-purple-500/30 rounded-full flex items-center justify-center shadow-2xl">
                        <Lock className="w-6 h-6 text-purple-500" />
                      </div>
                    </div>
                  )}
                  {!course.isComingSoon && (
                    <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                      <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider backdrop-blur-md ${
                        (course.level || '').toLowerCase() === 'beginner'
                          ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                          : (course.level || '').toLowerCase() === 'advanced'
                          ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      }`}>
                        {course.level || 'Beginner'}
                      </span>
                      {course.duration && (
                        <span className="px-2.5 py-0.5 text-[9px] font-semibold rounded-md bg-zinc-950/80 border border-purple-500/20 text-purple-300 backdrop-blur-sm uppercase tracking-wider">
                          {course.duration}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="flex-1 flex flex-col mb-6">
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div 
                        onClick={() => !course.isComingSoon && handleOpenSoftwareModal(course, 'details')} 
                        className="group/title flex-1 cursor-pointer"
                      >
                        <h3 className="text-xl font-bold text-white group-hover/title:text-purple-400 transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                      </div>

                      <div className="text-lg font-black text-purple-500 whitespace-nowrap">
                        {course.isComingSoon ? (
                          <span className="text-xs text-purple-400 uppercase tracking-widest">{t('course.comingSoon') || 'Coming Soon'}</span>
                        ) : (
                          getCoursePrice(course).formatted
                        )}
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mb-6 leading-relaxed line-clamp-2 flex-grow">
                      {course.description || course.detailedDescription}
                    </p>

                     {/* Instructor Row */}
                    <div className="flex items-center pt-4 border-t border-purple-900/10">
                      <div className="flex items-center gap-3">
                        <img 
                          src={course.instructor?.avatar || 'https://picsum.photos/seed/instructor/200/200'} 
                          alt={course.instructor?.name || 'Amine Rouabhia'} 
                          className="w-8 h-8 rounded-full object-cover border border-purple-600"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider leading-none mb-1">Tutor</span>
                          <div className="text-xs font-bold text-gray-300 leading-none">{course.instructor?.name || 'Amine Rouabhia'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Buttons Section */}
                  <div className="pt-4 border-t border-purple-900/10 flex flex-col gap-3">
                    {course.isComingSoon ? (
                      <div className="w-full py-3 bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider rounded-xl border border-purple-500/20 shadow-sm flex items-center justify-center gap-2 select-none">
                        <span>🔮</span>
                        <span>{t('course.comingSoon') || 'Coming Soon'}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleOpenSoftwareModal(course, 'details')}
                          className="px-4 py-3 font-bold flex items-center justify-center gap-1.5 rounded-xl text-xs bg-zinc-900 border border-purple-500/20 text-purple-300 hover:bg-purple-950/40 hover:text-white transition-all cursor-pointer"
                        >
                          <span>{t('courses.details')}</span>
                        </button>
                        {(() => {
                          const enrollment = enrollments.find(e => e.courseId === course.id);
                          const isApproved = enrollment && (enrollment.paid === true || enrollment.status === 'approved');
                          if (isApproved) {
                            return (
                              <button 
                                onClick={() => handleOpenSoftwareModal(course, 'details')}
                                className="px-4 py-3 font-bold flex items-center justify-center gap-1.5 rounded-xl text-xs bg-purple-600 hover:bg-purple-700 text-white transition-all cursor-pointer shadow-lg shadow-purple-600/30"
                              >
                                <span>{t('courses.continueLearning')}</span>
                                <ArrowRight className={`w-3.5 h-3.5 inline-block shrink-0 ${language === 'ar' ? 'rotate-180' : ''}`} />
                              </button>
                            );
                          }
                          return (
                            <button 
                              onClick={() => handleOpenSoftwareModal(course, 'payment')}
                              className="px-4 py-3 font-bold flex items-center justify-center gap-1.5 rounded-xl text-xs bg-brand-radial text-white hover:opacity-95 transition-all cursor-pointer shadow-lg shadow-purple-600/30"
                            >
                              <span>{t('courses.getStarted')}</span>
                              <ArrowRight className={`w-3.5 h-3.5 inline-block shrink-0 ${language === 'ar' ? 'rotate-180' : ''}`} />
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Floating Software Selection Modal */}
        <SoftwareSelectionModal
          isOpen={isSoftwareModalOpen}
          onClose={() => setIsSoftwareModalOpen(false)}
          onConfirm={handleConfirmSoftware}
          courseTitle={selectedCourseForModal?.title}
          options={selectedCourseForModal?.softwareOptions}
          initialSelectedId={selectedCourseForModal ? localStorage.getItem(`selected_software_${selectedCourseForModal.id}`) || 'premiere' : 'premiere'}
        />
      </div>
    </div>
  );
}

