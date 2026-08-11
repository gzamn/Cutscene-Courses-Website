import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, collection, query, where, getDocs, addDoc, onSnapshot, doc, getDoc } from '../firebase';
import { 
  ArrowLeft, Flame, Trophy, Check, Trash2, Lock, ShieldAlert, Play, 
  Loader2, Upload, Send, HelpCircle, Award, CheckCircle, XCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

export default function ExercisePlayer() {
  const { id: courseId, chapterId } = useParams<{ id: string; chapterId: string }>();
  const { user, userProfile } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [chapterDoc, setChapterDoc] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Submission States
  const [submission, setSubmission] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [customLink, setCustomLink] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // File Upload States
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Course & Chapter
  useEffect(() => {
    if (!courseId || !chapterId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        // Fetch Course
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) {
          toast.error('Course not found');
          navigate('/');
          return;
        }
        const courseData = { id: courseSnap.id, ...courseSnap.data() };
        setCourse(courseData);

        // Fetch Chapters under course
        const chCol = collection(db, `courses/${courseId}/chapters`);
        const chSnap = await getDocs(chCol);
        const chaptersList = chSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Find chapter matching the position
        const targetPos = parseInt(chapterId, 10);
        const foundCh = chaptersList.find(ch => (ch as any).position === targetPos) 
          || chaptersList.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))[targetPos - 1];

        setChapterDoc(foundCh || null);

        // Check Enrollment status
        if (user) {
          const enrollQuery = query(
            collection(db, 'enrollments'), 
            where('uid', '==', user.uid), 
            where('courseId', '==', courseId)
          );
          const enrollSnap = await getDocs(enrollQuery);
          if (!enrollSnap.empty) {
            const anyPaid = enrollSnap.docs.some(docSnap => docSnap.data().paid === true || docSnap.data().status === 'approved');
            setIsEnrolled(anyPaid);
          } else {
            setIsEnrolled(false);
          }
        }
      } catch (err: any) {
        console.error('Error loading exercise data:', err);
        toast.error('Failed to load session/chapter details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, chapterId, user]);

  // Subscription for Submission details
  useEffect(() => {
    if (!user || !courseId || !chapterId) return;

    const targetPos = parseInt(chapterId, 10);
    const subQuery = query(
      collection(db, 'exercise_submissions'),
      where('uid', '==', user.uid),
      where('courseId', '==', courseId),
      where('chapter', '==', targetPos)
    );

    const unsub = onSnapshot(subQuery, (snap) => {
      if (!snap.empty) {
        // Sort by uploadedAt descending to find latest submission
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sorted = list.sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setSubmission(sorted[0]);
      } else {
        setSubmission(null);
      }
    });

    return () => unsub();
  }, [user, courseId, chapterId]);

  // Parse exercise tasks
  const tasks = useMemo(() => {
    if (!chapterDoc) return [];
    
    // Check if custom tasks configured
    if (chapterDoc.exercise_tasks && Array.isArray(chapterDoc.exercise_tasks)) {
      return chapterDoc.exercise_tasks.map((t: string, idx: number) => ({
        id: `t${idx + 1}`,
        label: t
      }));
    }

    if (chapterDoc.exercise_tasks_raw) {
      const splitLines = chapterDoc.exercise_tasks_raw
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);
      
      if (splitLines.length > 0) {
        return splitLines.map((t: string, idx: number) => ({
          id: `t${idx + 1}`,
          label: t
        }));
      }
    }

    // Default checklist tasks if not configured
    return [
      { id: "t1", label: "Import the raw footage and sync audio sequence" },
      { id: "t2", label: "Build a rough cut following the beat sheet" },
      { id: "t3", label: "Color match all camera angles and source files" },
      { id: "t4", label: "Add at least one J-cut and one L-cut" },
      { id: "t5", label: "Export at 1080p, H.264, under 150MB" }
    ];
  }, [chapterDoc]);

  // File selection/dropzone logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadFile(null);
    setUploadProgress(0);
  };

  // Upload and Submit
  const handleFormSubmit = async () => {
    if (!user || !courseId || !chapterId) return;
    setSubmitting(true);

    try {
      let downloadUrl = customLink.trim();
      let submissionName = 'External Link Submission';

      if (uploadFile) {
        setUploading(true);
        setUploadProgress(15);

        // Fetch signature from API
        const signRes = await fetch('/api/bunny-upload-signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: uploadFile.name || 'exercise.zip' })
        });

        if (!signRes.ok) {
          const errData = await signRes.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to obtain signature for BunnyCDN upload (status ${signRes.status}).`);
        }

        const signData = await signRes.json();
        setUploadProgress(40);

        // PUT to signedUrl
        const uploadRes = await fetch(signData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': uploadFile.type || 'application/octet-stream' },
          body: uploadFile
        });

        if (!uploadRes.ok) {
          throw new Error('Upload to BunnyCDN storage failed');
        }

        const uploadResult = await uploadRes.json();
        downloadUrl = uploadResult.publicUrl || '';
        submissionName = uploadFile.name;
        setUploadProgress(90);
      }

      if (!downloadUrl) {
        throw new Error('Please select a file to upload or paste a link');
      }

      const targetPos = parseInt(chapterId, 10);
      await addDoc(collection(db, 'exercise_submissions'), {
        uid: user.uid,
        courseId,
        chapter: targetPos,
        name: submissionName,
        downloadUrl,
        status: 'pending_review',
        score: 0,
        taskResults: {},
        reviewerNote: '',
        uploadedAt: new Date().toISOString()
      });

      toast.success('Your exercise has been submitted successfully!');
      setUploadFile(null);
      setCustomLink('');
      setUploadProgress(0);
    } catch (err: any) {
      console.error('Submission error:', err);
      toast.error(err.message || 'Failed to submit your exercise');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  // Render score dial SVG
  const renderScoreDial = (score: number, max: number) => {
    const pct = score / max;
    const r = 54;
    const cx = 75;
    const cy = 75;
    const c = 2 * Math.PI * r;
    const color = pct >= 0.8 ? "#4ADE9C" : pct >= 0.5 ? "#FFB454" : "#FF5C5C";

    const ticks = [];
    for (let i = 0; i < max; i++) {
      const angle = (i / max) * 360 - 90;
      const rad = (angle * Math.PI) / 180;
      const x1 = cx + Math.cos(rad) * 66;
      const y1 = cy + Math.sin(rad) * 66;
      const x2 = cx + Math.cos(rad) * 70;
      const y2 = cy + Math.sin(rad) * 70;
      const tickColor = i < Math.round(pct * max) ? color : "#262B33";
      ticks.push(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tickColor} strokeWidth="2" />
      );
    }

    return (
      <svg width="150" height="150" viewBox="0 0 150 150" className="mx-auto select-none">
        {ticks}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1C2027" strokeWidth="8" />
        <circle 
          cx={cx} 
          cy={cy} 
          r={r} 
          fill="none" 
          stroke={color} 
          strokeWidth="8"
          strokeDasharray={c} 
          strokeDashoffset={c * (1 - pct)} 
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-1000 ease-out"
        />
        <text x={cx} y="82" textAnchor="middle" className="font-mono text-3xl font-black fill-white">{score}</text>
        <text x={cx} y="100" textAnchor="middle" className="font-mono text-[11px] font-bold fill-[#565C66]">/ {max}</text>
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07050f] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <p className="text-sm font-mono text-gray-400">LOADING EXERCISE WORKSPACE...</p>
        </div>
      </div>
    );
  }

  const isFirstSession = parseInt(chapterId || '1', 10) === 1;
  const isAccessible = isEnrolled || isFirstSession;

  if (!isAccessible) {
    return (
      <div className="min-h-screen bg-[#07050f] flex items-center justify-center text-white px-6">
        <div className="max-w-md bg-zinc-950 border border-purple-900/30 p-8 rounded-[2rem] text-center shadow-2xl">
          <Lock className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h3 className="text-lg font-extrabold mb-2 text-white">Locked Exercise</h3>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Enroll in this program to unlock premium lessons, custom templates, handouts, and submit direct exercises for instructor critiques.
          </p>
          <Link to={`/payment?courseId=${courseId}`} className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold font-mono uppercase transition-all shadow-lg shadow-purple-600/30">
            Unlock Program
          </Link>
        </div>
      </div>
    );
  }

  // Find exercise details
  const exerciseTitle = chapterDoc?.exercise_title || `Session ${chapterId}: Practice Work`;
  const exerciseBrief = chapterDoc?.exercise_brief || `Watch the brief below, then apply the concepts covered in this session's video lesson. Export your render and submit it for our instructors to review and evaluate against the check-list of core requirements.`;
  const exerciseVideoUrl = chapterDoc?.exercise_url || chapterDoc?.session_url_1 || '';

  // Calculate task completions count
  const completedTasksCount = submission?.taskResults 
    ? Object.values(submission.taskResults).filter(Boolean).length 
    : 0;

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows for the cosmic theme */}
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-[1180px] mx-auto space-y-8 relative z-10">
        
        {/* Back Link */}
        <Link 
          to={`/courses/${courseId}/video/${chapterId}/session`} 
          className="inline-flex items-center gap-2 text-xs font-mono font-bold text-purple-400 hover:text-purple-300 uppercase tracking-widest transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Session Video
        </Link>

        {/* Heading */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono text-purple-400 font-extrabold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-lg shadow-purple-500/40" />
            Session {chapterId} • Interactive Exercise
          </div>
          <h1 className="text-2xl sm:text-3.5xl font-extrabold text-white tracking-tight leading-none">
            {exerciseTitle}
          </h1>
          <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">
            {exerciseBrief}
          </p>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (Video Briefing + Checklist) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Instruction Video If Configured / Fallback */}
            {exerciseVideoUrl ? (
              <div className="bg-zinc-950/60 border-2 border-purple-900/30 rounded-3xl overflow-hidden shadow-2xl relative group">
                <div className="relative aspect-ratio-16/9 w-full bg-black">
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-black/60 border border-purple-500/30 px-3 py-1 rounded-full text-[9px] font-mono font-black text-purple-400 uppercase tracking-widest backdrop-blur-md">
                    <Play className="w-3 h-3 text-purple-500" />
                    Briefing Video
                  </div>
                  <iframe
                    src={exerciseVideoUrl}
                    title="Exercise Brief"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full aspect-video"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-zinc-950/60 border-2 border-purple-900/30 rounded-3xl overflow-hidden shadow-2xl p-8 text-center">
                <Play className="w-10 h-10 text-purple-500/40 mx-auto mb-3" />
                <div className="text-xs text-gray-400 font-mono">NO BRIEFING VIDEO ATTACHED</div>
              </div>
            )}

            {/* Checklist */}
            <div className="bg-zinc-950/40 border border-purple-900/20 backdrop-blur-md rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">Evaluation Checklist</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mt-0.5">Core target parameters</p>
                </div>
                <div className="font-mono text-xs text-gray-400">
                  {submission && submission.status === 'reviewed' ? (
                    <span>
                      Passed: <strong className="text-emerald-400">{completedTasksCount}</strong>/{tasks.length}
                    </span>
                  ) : (
                    <span>{tasks.length} requirements</span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-purple-900/15">
                {tasks.map((t, idx) => {
                  const hasChecked = submission?.taskResults?.[t.id] ?? submission?.taskResults?.[idx.toString()] ?? false;
                  const isReviewed = submission?.status === 'reviewed';

                  return (
                    <div key={t.id} className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0 group">
                      <span className="font-mono text-[10px] font-semibold text-purple-500 pt-0.5 min-w-[24px]">
                        T{String(idx + 1).padStart(2, '0')}
                      </span>
                      
                      <div className="flex-grow flex items-start justify-between gap-4">
                        <span className={`text-xs sm:text-[13px] leading-relaxed transition-colors ${
                          isReviewed && !hasChecked ? 'text-gray-500 line-through' : 'text-gray-300'
                        }`}>
                          {t.label}
                        </span>

                        {/* Status Checkbox */}
                        {isReviewed ? (
                          hasChecked ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-rose-950/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                              <X className="w-3 h-3 text-rose-500 font-bold" />
                            </div>
                          )
                        ) : (
                          <div className="w-4.5 h-4.5 rounded border border-purple-900/30 flex items-center justify-center bg-black/40 shrink-0">
                            {submission?.status === 'pending_review' && (
                              <div className="w-1.5 h-1.5 rounded bg-purple-500 animate-pulse" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column (Submissions / Feedback Widget) */}
          <div className="lg:col-span-5 space-y-6">

            {/* State 1: Not Submitted or Failed and Remake Needed */}
            {(!submission || (submission && submission.status === 'reviewed' && (submission.score || 0) < 6)) && (
              <div className="bg-zinc-950/60 border border-purple-900/20 backdrop-blur-md rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                {submission && submission.status === 'reviewed' && (submission.score || 0) < 6 ? (
                  <div className="bg-rose-950/30 border border-rose-500/40 p-5 rounded-2xl space-y-2 animate-fade-in text-left">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider font-mono">
                      <Flame className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
                      Remake Requested
                    </div>
                    <p className="text-xs text-rose-200/90 leading-relaxed font-sans">
                      Your score (<span className="font-mono font-bold">{submission.score}/10</span>) is below passing. Please remake the homework and upload it again so our instructors can re-evaluate your updated submission!
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 border-b border-purple-900/15 pb-4">
                    <span className="w-2 h-2 rounded-full bg-zinc-600" />
                    <span className="font-mono text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">
                      Not Submitted
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white tracking-wide">Submit Practice Assignment</h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Upload your raw render file directly, or share a cloud link (Google Drive, Dropbox, YouTube, Frame.io) below.
                  </p>
                </div>

                {/* Dropzone */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                    dragActive 
                      ? 'border-emerald-500 bg-emerald-950/10' 
                      : 'border-purple-900/30 hover:border-purple-500 bg-black/20 hover:bg-black/40'
                  }`}
                >
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  <Upload className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                  <p className="text-xs text-gray-300 font-semibold mb-1">Drag and drop file here, or click to browse</p>
                  <p className="font-mono text-[9px] text-gray-500">Video, Zip, or Premiere projects (up to 500MB)</p>
                </div>

                {/* File Chip */}
                {uploadFile && (
                  <div className="flex items-center justify-between bg-purple-950/20 border border-purple-500/20 p-3 rounded-xl text-xs font-mono">
                    <span className="text-purple-300 truncate max-w-[200px]">{uploadFile.name}</span>
                    <button 
                      onClick={handleRemoveFile} 
                      className="text-gray-400 hover:text-white font-black cursor-pointer px-1.5"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* URL Input */}
                {!uploadFile && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider font-mono">Or paste a shared link</div>
                    <input 
                      type="url"
                      value={customLink}
                      onChange={(e) => setCustomLink(e.target.value)}
                      placeholder="e.g. Google Drive or Frame.io review link"
                      className="w-full bg-black/40 border border-purple-900/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/60 placeholder-gray-600 font-mono"
                    />
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleFormSubmit}
                  disabled={submitting || (!uploadFile && !customLink.trim())}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-extrabold uppercase text-xs tracking-wider font-mono rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/10"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {uploading ? `Uploading ${uploadProgress}%` : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit homework
                    </>
                  )}
                </button>
              </div>
            )}

            {/* State 2: Pending Review */}
            {submission && submission.status === 'pending_review' && (
              <div className="bg-zinc-950/60 border border-purple-900/20 backdrop-blur-md rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center gap-2.5 border-b border-purple-900/15 pb-4">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="font-mono text-[10px] text-purple-400 font-extrabold uppercase tracking-widest">
                    Waiting for review
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white tracking-wide">Assignment Submitted</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Our master instructors are evaluating your export against the session checklist. You will receive an alert and a detailed performance scorecard here once graded.
                  </p>
                </div>

                <div className="bg-black/30 border border-purple-900/15 p-4 rounded-xl space-y-2 text-xs">
                  <div className="font-mono text-[9px] text-gray-500 uppercase tracking-widest font-extrabold">Attached File / URL</div>
                  <div className="text-white font-semibold truncate font-mono">{submission.name}</div>
                  <a 
                    href={submission.downloadUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-block text-purple-400 hover:text-purple-300 font-bold underline mt-1 break-all"
                  >
                    View Submission link ↗
                  </a>
                </div>
              </div>
            )}

            {/* State 3: Reviewed */}
            {submission && submission.status === 'reviewed' && (
              <div className="bg-zinc-950/60 border border-purple-900/20 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl">
                
                {/* Header state */}
                <div className="p-6 sm:p-8 pb-4 space-y-5">
                  <div className="flex items-center gap-2.5 border-b border-purple-900/15 pb-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-mono text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">
                      Reviewed & Graded
                    </span>
                  </div>

                  <div className="text-center py-4">
                    <div className="inline-block">
                      {renderScoreDial(submission.score || 0, 10)}
                    </div>
                  </div>
                </div>

                {/* Score Summary Row */}
                <div className="flex items-center justify-between border-t border-purple-900/15 p-4 sm:px-6 bg-black/20 text-xs">
                  <span className="text-gray-400">Checkbox targets matched</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {completedTasksCount} / {tasks.length}
                  </span>
                </div>

                {/* Instructor feedback note */}
                <div className="p-6 sm:p-8 pt-4 space-y-3">
                  <div className="text-xs font-mono text-gray-500 uppercase tracking-widest font-extrabold">Instructor Feedback</div>
                  <div className="bg-purple-950/10 border border-purple-900/15 p-4 rounded-2xl text-xs sm:text-[13px] text-gray-300 leading-relaxed italic relative">
                    <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-zinc-900 border border-purple-900/25 text-[8px] font-mono font-black text-purple-400 uppercase tracking-widest rounded-md">
                      Official Note
                    </span>
                    {submission.reviewerNote || "No text feedback was left, but your checkboxes have been evaluated. Excellent effort!"}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
