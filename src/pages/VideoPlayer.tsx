import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Play, FileText, Dumbbell, CheckCircle2, Loader2 } from 'lucide-react';
import { COURSES } from '../types';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';

export default function VideoPlayer() {
  const { id, chapter, type } = useParams<{ id: string; chapter: string; type: string }>();
  const { user } = useAuth();
  const course = COURSES.find(c => c.id === id);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !id || !chapter || !type) {
      setLoading(false);
      return;
    }

    const lessonId = `${id}-${chapter}-${type}`;
    const qProgress = query(
      collection(db, 'progress'), 
      where('uid', '==', user.uid), 
      where('courseId', '==', id),
      where('chapter', '==', parseInt(chapter)),
      where('type', '==', type)
    );

    const unsub = onSnapshot(qProgress, (snap) => {
      if (!snap.empty) {
        setIsCompleted(snap.docs[0].data().completed);
      } else {
        setIsCompleted(false);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'progress'));

    return () => unsub();
  }, [user, id, chapter, type]);

  const handleMarkComplete = async () => {
    if (!user || !id || !chapter || !type) return;
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

      alert('Lesson marked as complete!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'progress');
    } finally {
      setSubmitting(false);
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

  const typeLabels: Record<string, string> = {
    session: 'Session',
    exercise: 'Exercise',
    homework: 'Homework'
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
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Course
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-video bg-zinc-900 rounded-3xl overflow-hidden border border-purple-900/30 shadow-2xl shadow-purple-600/10 mb-8"
            >
              {/* Mock Video Player */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/50">
                <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-600/40 mb-6">
                  <Play className="w-10 h-10 text-white fill-current translate-x-1" />
                </div>
                <p className="text-xl font-bold text-gray-300">Video content for Chapter {chapter}: {typeLabels[type || 'session']}</p>
              </div>
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
                  {isCompleted ? 'Completed' : 'Mark as Complete'}
                </button>
              </div>
            </div>

            <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8">
              <h2 className="text-xl font-bold mb-4">About this {typeLabels[type || 'session']}</h2>
              <p className="text-gray-400 leading-relaxed">
                In this {typeLabels[type || 'session'].toLowerCase()}, we will dive deep into the core concepts of Chapter {chapter}. 
                Make sure to follow along and take notes. If you have any questions, feel free to reach out to our support team.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6">Resources</h3>
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
              <h3 className="text-xl font-bold mb-4">Need Help?</h3>
              <p className="text-purple-100/70 text-sm mb-6 leading-relaxed">
                Stuck on an exercise or have a question about the homework? Our mentors are here to help.
              </p>
              <Link 
                to="/support"
                className="w-full py-3 bg-white text-purple-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
