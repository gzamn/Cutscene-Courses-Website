import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Check, 
  Loader2, 
  Film, 
  Bookmark, 
  AlertCircle,
  Tag,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  db, 
  collection, 
  addDoc, 
  serverTimestamp, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { DirectBunnyUploader } from './DirectBunnyUploader';

interface CourseOption {
  id: string;
  title: string;
}

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courses?: CourseOption[];
  challengeId?: string;
  initialCourseId?: string;
}

const STYLE_PILLS = [
  { id: 'reel', label: '🎬 Reel / Short', category: 'Short-Form' },
  { id: 'color-grade', label: '🎨 Color Grade', category: 'Grading' },
  { id: 'vfx-motion', label: '✨ VFX & Motion', category: 'VFX' },
  { id: 'sound-design', label: '🎧 Sound Design', category: 'Audio' },
  { id: 'full-edit', label: '💻 Full Edit', category: 'Commercial' },
  { id: 'anime-amv', label: '⚡ Anime / AMV', category: 'Stylized' }
];

export function CreateReelModal({
  isOpen,
  onClose,
  onSuccess,
  courses = [],
  challengeId,
  initialCourseId = ''
}: CreateReelModalProps) {
  const { user, userProfile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPill, setSelectedPill] = useState('reel');
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || (courses[0]?.id || ''));
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedPill('reel');
    setMediaUrl('');
    setThumbnailUrl('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('Please sign in to publish your reel or showcase.');
      return;
    }

    if (!title.trim()) {
      setError('Please provide a title for your reel.');
      return;
    }

    if (!mediaUrl.trim()) {
      setError('Please drag & drop or upload a video reel before publishing.');
      return;
    }

    setSubmitting(true);

    try {
      const selectedCourse = courses.find(c => c.id === selectedCourseId);
      const courseTitle = selectedCourse ? selectedCourse.title : 'Cutscene Creator Guild';
      const studentName = userProfile?.fullName || userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Verified Editor';
      const studentAvatar = userProfile?.photoURL || userProfile?.avatar || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;

      const selectedTag = STYLE_PILLS.find(p => p.id === selectedPill)?.label || 'Reel';

      if (challengeId) {
        // Submit to Challenge Entries
        const newChallengeEntry = {
          challengeId,
          userId: user.uid,
          userName: studentName,
          userAvatar: studentAvatar,
          title: title.trim(),
          description: description.trim() || `Submitted under #${selectedTag}`,
          videoUrl: mediaUrl.trim(),
          thumbnail: thumbnailUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=600&auto=format&fit=crop',
          votes: [user.uid],
          votesCount: 1,
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'community_challenge_submissions'), newChallengeEntry);
      } else {
        // Submit to Student Works / Reels Showcase
        const newWork = {
          student_id: user.uid,
          student_name: studentName,
          student_avatar: studentAvatar,
          course_id: selectedCourseId || 'general',
          course_name: courseTitle,
          chapter_position: 1,
          title: title.trim(),
          description: description.trim() || `Created by ${studentName} • ${selectedTag}`,
          image_url: thumbnailUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=800',
          video_url: mediaUrl.trim(),
          tag: selectedTag,
          submitted_at: serverTimestamp(),
          is_featured: false,
          approved: false, // Goes to Admin approvals queue
          status: 'pending'
        };

        await addDoc(collection(db, 'student_works'), newWork);
      }

      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onSuccess();
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Reel submission error:', err);
      setError(err.message || 'Failed to publish reel. Please check your connection.');
      handleFirestoreError(err, OperationType.CREATE, 'student_works');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
            onClick={handleClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative bg-zinc-950 border border-purple-900/40 rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl overflow-hidden z-10 my-8 space-y-6"
          >
            {/* Top Glow Accent */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-purple-600/15 via-pink-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-purple-900/20 pb-4 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {challengeId ? 'Submit Challenge Entry' : 'Post Reel / Showcase'}
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Direct drag & drop video upload to Bunny CDN
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Banner */}
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-3 bg-purple-950/20 border border-emerald-500/30 rounded-2xl p-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <Check className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-white">Reel Uploaded Successfully!</h4>
                <p className="text-xs text-gray-300 max-w-sm mx-auto">
                  Your project has been delivered to Bunny CDN storage and submitted for publication.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. DIRECT DRAG & DROP BUNNY UPLOADER */}
                <DirectBunnyUploader
                  label="Video File (Drag & Drop or Click to Browse)"
                  hint="Directly uploads your .mp4, .mov, or .webm reel to Bunny CDN"
                  mediaUrl={mediaUrl}
                  thumbnailUrl={thumbnailUrl}
                  onMediaChange={(url, thumb) => {
                    setMediaUrl(url);
                    if (thumb) setThumbnailUrl(thumb);
                  }}
                  accept="video"
                  maxSizeMB={150}
                />

                {/* 2. REEL TITLE */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-purple-300">
                    Reel Title / Caption *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Cyberpunk Anime AMV // Sound Design & Speed Ramp"
                    className="w-full bg-black border border-purple-900/40 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 font-sans transition-all"
                  />
                </div>

                {/* 3. STYLE PILLS (1-CLICK SELECTION) */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-purple-300">
                    Style / Category
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLE_PILLS.map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setSelectedPill(pill.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedPill === pill.id
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-105'
                            : 'bg-zinc-900/90 text-gray-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. ASSOCIATED COURSE / PROGRAM (IF AVAILABLE) */}
                {courses.length > 0 && !challengeId && (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-purple-300">
                      Associated Program (Optional)
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full bg-black border border-purple-900/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="">Independent Community Reel</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* 5. NOTES / DESCRIPTION (OPTIONAL) */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-purple-300">
                    Quick Notes / Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Key plugins used, LUTs, render tips, or behind-the-scenes thoughts..."
                    className="w-full bg-black border border-purple-900/40 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all resize-none"
                  />
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || !mediaUrl}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-600/25 flex items-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Publish Reel</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
