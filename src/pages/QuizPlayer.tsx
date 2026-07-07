import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth, getDocs, collection, query, where, addDoc } from '../firebase';
import { Play, HelpCircle, Check, X, ShieldAlert, ArrowLeft, RotateCcw, Award, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/* ================= 10-QUESTION GROUND TRUTH DEFAULT QUIZ FOR SESSION 1 ================= */
export const DEFAULT_SESSION_1_QUIZ = {
  id: "quiz_session_1",
  title: "Session 1 — Introduction to Cutting & Invisible Edits",
  description: "Test your analytical skills on edit points, transition timings, keyboard shortcuts, and visual aesthetics from Session 1.",
  sessionId: 1,
  status: "published",
  questions: [
    {
      id: "q1_mcq",
      type: "mcq",
      prompt: "You need a hard cut to feel invisible on a fast pan. Which edit point do you choose?",
      points: 1,
      options: [
        { id: "o1", text: "On the static frame, mid-pan", correct: false },
        { id: "o2", text: "At the peak velocity of the pan (motion blur hides the cut)", correct: true },
        { id: "o3", text: "One frame after the pan ends", correct: false },
        { id: "o4", text: "On a hard audio beat only", correct: false }
      ]
    },
    {
      id: "q2_direct",
      type: "direct",
      prompt: "What keyboard shortcut ripple-deletes a clip and closes the gap in Premiere Pro (Windows)?",
      points: 1,
      acceptedAnswers: ["Shift+Delete", "Shift+Del", "Shift + Delete", "Shift + Del", "shift+delete"]
    },
    {
      id: "q3_truefalse",
      type: "truefalse",
      prompt: "True or False Statement",
      trueFalseStatement: "The 180-degree rule says two characters in a conversation should always be filmed from the same side of an imaginary line between them.",
      trueFalseAnswer: true,
      points: 1
    },
    {
      id: "q4_fillgap",
      type: "fillgap",
      prompt: "Complete the sentence using the correct technical term.",
      gapTemplate: "Bach l cut ma yban-ch, khass techni gebl ma tqata3 l clip tdir ___.",
      gapAnswer: "J-cut",
      points: 1
    },
    {
      id: "q5_media_mcq",
      type: "media_mcq",
      prompt: "What transition technique is used at the 4-second mark of the clip above?",
      mediaType: "video",
      mediaUrl: "https://iframe.mediadelivery.net/embed/674907/2c8123ea-b758-4743-8e78-50f577c890a1?autoplay=false&loop=true&muted=true&preload=true&responsive=true",
      points: 1,
      options: [
        { id: "o5", text: "Whip pan transition", correct: false },
        { id: "o6", text: "Match cut on action", correct: true },
        { id: "o7", text: "Cross dissolve", correct: false },
        { id: "o8", text: "Speed ramp", correct: false }
      ]
    },
    {
      id: "q6_spot_diff",
      type: "spot_diff",
      prompt: "Same sequence, two exports. Click on the edited version. At what second (enter a number like 12) does Clip B differ from Clip A?",
      diffMediaType: "video",
      diffMediaUrl: "https://iframe.mediadelivery.net/embed/674907/2c8123ea-b758-4743-8e78-50f577c890a1",
      diffCorrectSecond: 12,
      points: 1
    },
    {
      id: "q7_slider_compare",
      type: "slider_compare",
      prompt: "Drag to compare Side A and Side B. Which side uses the creative teal-and-orange color grading?",
      sliderMediaA: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800",
      sliderMediaB: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800",
      sliderCorrectSide: "B",
      points: 1
    },
    {
      id: "q8_sequence",
      type: "sequence",
      prompt: "Drag these items into the correct color-grading workflow order (from first step to last).",
      sequenceItems: [
        "Primary correction (exposure, white balance)",
        "Secondary correction (skin tones, skies)",
        "Shot matching across the scene",
        "Creative look / LUT pass"
      ],
      points: 1
    },
    {
      id: "q9_match",
      type: "match",
      prompt: "Match each sound effect (left) to the editing action it belongs to (right).",
      matchPairs: [
        { left: "Whoosh", right: "Fast pan / whip transition" },
        { id: "p1", left: "Impact hit", right: "Punch on hard cut" },
        { id: "p2", left: "UI click", right: "Text pops on screen" }
      ],
      points: 1
    },
    {
      id: "q10_timed_mcq",
      type: "timed_mcq",
      prompt: "What does the keyboard shortcut 'C' do on the Premiere Pro timeline?",
      timeLimitSec: 10,
      points: 1,
      options: [
        { id: "o9", text: "Razor / Cut tool", correct: true },
        { id: "o10", text: "Copy clip", correct: false },
        { id: "o11", text: "Crop effect", correct: false },
        { id: "o12", text: "Center anchor point", correct: false }
      ]
    }
  ]
};

export default function QuizPlayer() {
  const { id: courseId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  // Lockout / Attempt status states
  const [attempts, setAttempts] = useState<any[]>([]);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number>(0); // seconds remaining
  const [isPassed, setIsPassed] = useState(false);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [lastAttemptResult, setLastAttemptResult] = useState<any>(null);

  // Student Responses
  const [responses, setResponses] = useState<{ [qid: string]: any }>({});
  
  // Specific question type support states
  const [sliderVal, setSliderVal] = useState(50);
  const [draggedMatchItem, setDraggedMatchItem] = useState<string | null>(null);
  const [matchesMap, setMatchesMap] = useState<{ [left: string]: string }>({});
  const [seqItems, setSeqItems] = useState<string[]>([]);
  
  // Timed MCQ countdown timer
  const [timedCount, setTimedCount] = useState<number | null>(null);
  const timedIntervalRef = useRef<any>(null);

  // Audio simulation bars
  const [waveBars] = useState(() => 
    Array.from({ length: 45 }, () => 10 + Math.floor(Math.random() * 40))
  );

  useEffect(() => {
    fetchQuizAndAttempts();
  }, [courseId, sessionId]);

  // Handle Timed MCQ countdown
  useEffect(() => {
    if (!quiz) return;
    const currentQuestion = quiz.questions[activeQuestionIdx];
    
    // Clear previous timer
    if (timedIntervalRef.current) {
      clearInterval(timedIntervalRef.current);
      timedIntervalRef.current = null;
    }

    if (currentQuestion && currentQuestion.type === "timed_mcq" && !quizSubmitted) {
      const limit = currentQuestion.timeLimitSec || 10;
      setTimedCount(limit);
      
      timedIntervalRef.current = setInterval(() => {
        setTimedCount((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(timedIntervalRef.current);
            timedIntervalRef.current = null;
            // Lock auto selection
            handleAnswerSelect(currentQuestion.id, "EXPIRED");
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    } else {
      setTimedCount(null);
    }

    // Set up drag-to-reorder initial items if type is sequence
    if (currentQuestion && currentQuestion.type === "sequence") {
      // Shuffle sequence items initially so student has to reorder
      if (!responses[currentQuestion.id]) {
        const shuffled = [...currentQuestion.sequenceItems].sort(() => Math.random() - 0.5);
        setSeqItems(shuffled);
        handleAnswerSelect(currentQuestion.id, shuffled);
      } else {
        setSeqItems(responses[currentQuestion.id]);
      }
    }

    // Set up matches initial empty slots
    if (currentQuestion && currentQuestion.type === "match") {
      setMatchesMap(responses[currentQuestion.id] || {});
    }

    return () => {
      if (timedIntervalRef.current) clearInterval(timedIntervalRef.current);
    };
  }, [activeQuestionIdx, quiz, quizSubmitted]);

  const fetchQuizAndAttempts = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      const sId = parseInt(sessionId || "1", 10);

      // 1. Fetch published quizzes for this session index
      const qCol = collection(db, "quizzes");
      const qQuery = query(qCol, where("sessionId", "==", sId), where("status", "==", "published"));
      const qSnap = await getDocs(qQuery);
      
      let loadedQuiz = null;
      if (!qSnap.empty) {
        loadedQuiz = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() as any };
      } else if (sId === 1) {
        // Fallback/Seeding for Session 1 Quiz
        loadedQuiz = DEFAULT_SESSION_1_QUIZ;
      }

      setQuiz(loadedQuiz);

      if (user && loadedQuiz) {
        // 2. Fetch past quiz attempts
        const attemptsCol = collection(db, "quiz_attempts");
        const attQuery = query(
          attemptsCol, 
          where("studentId", "==", user.uid), 
          where("quizId", "==", loadedQuiz.id)
        );
        const attSnap = await getDocs(attQuery);
        const attList = attSnap.docs.map(d => ({ id: d.id, ...d.data() as any }))
          .sort((a, b) => b.attemptNumber - a.attemptNumber); // latest first
        
        setAttempts(attList);

        // Check lockouts and passed status
        const passedAttempt = attList.find(a => a.passed);
        if (passedAttempt) {
          setIsPassed(true);
        }

        if (attList.length >= 3 && !passedAttempt) {
          // Check 1 hour cooldown from the latest attempt
          const latestAttempt = attList[0];
          if (latestAttempt.lockoutUntil) {
            const lockoutDate = new Date(latestAttempt.lockoutUntil).getTime();
            const now = Date.now();
            if (lockoutDate > now) {
              setLockoutTimeLeft(Math.ceil((lockoutDate - now) / 1000));
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading quiz/attempts data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cooldown countdown timer effect
  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  const handleAnswerSelect = (qid: string, val: any) => {
    if (quizSubmitted) return;
    setResponses(prev => ({ ...prev, [qid]: val }));
  };

  const handleSequenceDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleSequenceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSequenceDrop = (e: React.DragEvent, targetIdx: number) => {
    const sourceIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(sourceIdx)) return;
    
    const nextList = [...seqItems];
    const [dragged] = nextList.splice(sourceIdx, 1);
    nextList.splice(targetIdx, 0, dragged);
    
    setSeqItems(nextList);
    handleAnswerSelect(quiz.questions[activeQuestionIdx].id, nextList);
  };

  const handleMatchDragStart = (e: React.DragEvent, item: string) => {
    setDraggedMatchItem(item);
  };

  const handleMatchDrop = (targetRight: string) => {
    if (!draggedMatchItem) return;
    const nextMap = { ...matchesMap, [draggedMatchItem]: targetRight };
    setMatchesMap(nextMap);
    handleAnswerSelect(quiz.questions[activeQuestionIdx].id, nextMap);
    setDraggedMatchItem(null);
  };

  const handleMatchClear = (leftItem: string) => {
    const nextMap = { ...matchesMap };
    delete nextMap[leftItem];
    setMatchesMap(nextMap);
    handleAnswerSelect(quiz.questions[activeQuestionIdx].id, nextMap);
  };

  // Submit attempt evaluation
  const handleQuizSubmit = async () => {
    if (!quiz || !auth.currentUser) return;
    
    setSubmittingAttempt(true);
    let correctCount = 0;
    const totalQuestions = quiz.questions.length;
    const detailedResults: { [qid: string]: boolean } = {};

    quiz.questions.forEach((q: any) => {
      const studentAns = responses[q.id];
      let correct = false;

      if (!studentAns) {
        correct = false;
      } else if (q.type === "mcq" || q.type === "media_mcq" || q.type === "timed_mcq") {
        const correctOpt = q.options.find((o: any) => o.correct);
        correct = correctOpt && studentAns === correctOpt.id;
      } else if (q.type === "direct") {
        correct = q.acceptedAnswers.some(
          (ans: string) => ans.trim().toLowerCase() === String(studentAns).trim().toLowerCase()
        );
      } else if (q.type === "truefalse") {
        correct = (studentAns === true || studentAns === "true") === q.trueFalseAnswer;
      } else if (q.type === "fillgap") {
        correct = String(studentAns).trim().toLowerCase() === q.gapAnswer.trim().toLowerCase();
      } else if (q.type === "spot_diff") {
        const diffNum = parseInt(studentAns, 10);
        correct = !isNaN(diffNum) && Math.abs(diffNum - q.diffCorrectSecond) <= 1; // 1-second leeway
      } else if (q.type === "slider_compare") {
        correct = studentAns === q.sliderCorrectSide;
      } else if (q.type === "sequence") {
        // Must match order of original list in database (which represents the answer key)
        correct = Array.isArray(studentAns) && 
                  studentAns.every((val, i) => val === q.sequenceItems[i]);
      } else if (q.type === "match") {
        // Check if all lefts match their corresponding rights
        const pairs = q.matchPairs || [];
        correct = pairs.every((p: any) => studentAns[p.left] === p.right);
      }

      if (correct) correctCount++;
      detailedResults[q.id] = correct;
    });

    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= 70;
    const attemptNum = attempts.length + 1;
    
    // Determine 1-hour lockout lockout date if they failed all 3 attempts
    let lockoutUntil = null;
    if (!passed && attemptNum >= 3) {
      lockoutUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }

    const attemptData = {
      studentId: auth.currentUser.uid,
      studentEmail: auth.currentUser.email,
      quizId: quiz.id,
      sessionId: parseInt(sessionId || "1", 10),
      attemptNumber: attemptNum,
      answers: responses,
      score: scorePercentage,
      passed,
      submittedAt: new Date().toISOString(),
      lockoutUntil
    };

    try {
      await addDoc(collection(db, "quiz_attempts"), attemptData);
      
      setLastAttemptResult({
        score: scorePercentage,
        passed,
        correctCount,
        totalQuestions,
        detailedResults
      });
      setQuizSubmitted(true);
      fetchQuizAndAttempts(); // Reload attempts
    } catch (err) {
      console.error("Error saving quiz attempt:", err);
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const handleRetake = () => {
    setResponses({});
    setQuizSubmitted(false);
    setLastAttemptResult(null);
    setActiveQuestionIdx(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-[#49d3e8] animate-spin mb-4" />
        <p className="font-mono text-sm tracking-widest uppercase text-zinc-500">Loading NLE Scrubber...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-[#17171b] border border-zinc-800 p-8 rounded-3xl text-center">
          <HelpCircle className="w-16 h-16 text-zinc-500 mx-auto mb-6" />
          <h2 className="text-xl font-mono font-bold mb-2">No Quiz Found</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-8">
            There is no published quiz assigned to Session {sessionId} yet. Check back later or ask an instructor.
          </p>
          <Link
            to={`/courses/${courseId}/video/${sessionId}/session`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#49d3e8] text-zinc-950 rounded-xl font-mono text-xs font-bold hover:bg-[#3bc4d8] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Lesson
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[activeQuestionIdx];
  const totalQuestions = quiz.questions.length;

  // Render question card inside scrubber
  return (
    <div className="min-h-screen bg-[#0d0d0f] text-[#eeeef0] pt-28 pb-16 selection:bg-[#49d3e8] selection:text-zinc-950 font-body">
      {/* ================= NLE SCRUBBER HEADER ================= */}
      <div className="sticky top-16 z-40 bg-[#0d0d0f]/95 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff4433] to-[#a8231a] flex items-center justify-center font-mono font-extrabold text-[#fff] text-xs">
                CS
              </div>
              <div>
                <div className="font-mono text-xs font-bold text-[#49d3e8] tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ff4433] animate-pulse" />
                  Quiz Timeline Scrubber
                </div>
                <h1 className="text-sm font-mono font-bold text-zinc-400 mt-0.5 truncate max-w-[280px] sm:max-w-sm">
                  {quiz.title}
                </h1>
              </div>
            </div>

            <Link
              to={`/courses/${courseId}/video/${sessionId}/session`}
              className="px-4 py-2 border border-zinc-800 rounded-lg text-xs font-mono font-bold hover:border-[#49d3e8] hover:text-[#49d3e8] transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Player
            </Link>
          </div>

          {/* ================= SCORING READOUT & CHAPTERS ================= */}
          {!quizSubmitted && !lockoutTimeLeft && (
            <div className="space-y-3 mt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <div className="flex gap-4">
                  <span>CLIP: <b className="text-white">Q{activeQuestionIdx + 1} / {totalQuestions}</b></span>
                  <span>ANSWERS: <b className="text-[#ffc24b]">{Object.keys(responses).length}</b></span>
                </div>
                <div>TIMECODE: <b className="text-[#49d3e8]">00:00:{String(activeQuestionIdx + 1).padStart(2, '0')}:00</b></div>
              </div>

              {/* Timeline ruler Scrubber */}
              <div className="relative pt-2 pb-1">
                <div className="relative h-9 border-t border-zinc-800 flex items-end select-none">
                  {/* Ticks */}
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 border-l border-zinc-800 ${
                        i % 4 === 0 ? "h-3.5 border-zinc-700" : "h-2"
                      }`}
                    />
                  ))}

                  {/* Chapters markers overlay */}
                  <div className="absolute inset-x-0 -top-2 h-6 flex justify-between px-1">
                    {quiz.questions.map((q: any, i: number) => {
                      const isAnswered = responses[q.id] !== undefined;
                      const isCurrent = i === activeQuestionIdx;
                      return (
                        <button
                          key={q.id}
                          onClick={() => setActiveQuestionIdx(i)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono transition-all duration-150 cursor-pointer ${
                            isCurrent
                              ? "bg-[#49d3e8] text-zinc-950 font-bold shadow-lg shadow-[#49d3e8]/20 scale-110 border border-[#49d3e8]"
                              : isAnswered
                              ? "bg-[#4ade80] text-zinc-950 font-bold"
                              : "bg-[#17171b] text-zinc-500 hover:text-[#49d3e8] hover:border-zinc-700 border border-zinc-800"
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Playhead line Scrubber marker */}
                  <div
                    className="absolute top-[-8px] bottom-0 w-0.5 bg-[#49d3e8] pointer-events-none transition-all duration-300"
                    style={{
                      left: `${((activeQuestionIdx + 0.5) / totalQuestions) * 100}%`,
                    }}
                  >
                    <div className="absolute top-0 left-[-4px] w-0.5 h-0.5 border-l-4 border-r-4 border-t-6 border-transparent border-t-[#49d3e8]" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
        {/* ================= 1. CURRENTLY LOCKED OUT STATE ================= */}
        {lockoutTimeLeft > 0 ? (
          <div className="bg-[#17171b] border border-[#ff5c5c]/20 p-8 rounded-3xl text-center space-y-6">
            <div className="w-16 h-16 bg-[#ff5c5c]/10 rounded-full flex items-center justify-center mx-auto border border-[#ff5c5c]/25 animate-pulse">
              <ShieldAlert className="w-8 h-8 text-[#ff5c5c]" />
            </div>
            <h2 className="text-xl font-mono font-bold text-white uppercase tracking-wider">Locked Out — Max Attempts Exceeded</h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
              You failed 3 consecutive quiz attempts. In order to help you study the material further, your access is locked out for 1 hour.
            </p>
            <div className="inline-flex items-center gap-3 bg-[#ff5c5c]/5 border border-[#ff5c5c]/20 px-6 py-3 rounded-2xl">
              <Clock className="w-5 h-5 text-[#ffc24b]" />
              <span className="font-mono text-sm text-[#ffc24b]">
                Retry available in: <b>{Math.floor(lockoutTimeLeft / 60)}m {lockoutTimeLeft % 60}s</b>
              </span>
            </div>
            <div className="pt-4 border-t border-zinc-800 max-w-xs mx-auto">
              <Link
                to={`/courses/${courseId}/video/${sessionId}/session`}
                className="w-full inline-flex justify-center items-center gap-2 px-6 py-3 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 hover:text-white hover:border-[#49d3e8] transition-colors"
              >
                Go Study Session {sessionId} Again
              </Link>
            </div>
          </div>
        ) : quizSubmitted && lastAttemptResult ? (
          /* ================= 2. RESULTS VIEW (correct / incorrect, no leaking answers) ================= */
          <div className="space-y-6">
            <div className={`p-8 rounded-3xl border text-center ${
              lastAttemptResult.passed 
                ? "bg-[#4ade80]/5 border-[#4ade80]/20" 
                : "bg-[#ff5c5c]/5 border-[#ff5c5c]/20"
            }`}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border shrink-0">
                {lastAttemptResult.passed ? (
                  <Award className="w-8 h-8 text-[#4ade80]" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-[#ff5c5c]" />
                )}
              </div>
              <h2 className="text-2xl font-mono font-extrabold tracking-wide uppercase">
                {lastAttemptResult.passed ? "PASSED CHECK ✓" : "ATTEMPT COMPLETED"}
              </h2>
              <p className="text-sm text-zinc-400 mt-2">
                Your score: <b className={lastAttemptResult.passed ? "text-[#4ade80]" : "text-[#ff5c5c]"}>{lastAttemptResult.score}%</b> (Passing is 70%)
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Cleared {lastAttemptResult.correctCount} of {lastAttemptResult.totalQuestions} modules.
              </p>

              {lastAttemptResult.passed && (
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  <Link
                    to={`/courses/${courseId}/video/${parseInt(sessionId || "1", 10) + 1}/session`}
                    className="px-6 py-3 bg-[#4ade80] text-zinc-950 font-mono text-xs font-bold rounded-xl hover:bg-[#3cd072] transition-colors"
                  >
                    Unlock Next Session Video
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-500">Timeline Analysis Panel</h3>
              {quiz.questions.map((q: any, i: number) => {
                const isCorrect = lastAttemptResult.detailedResults[q.id];
                return (
                  <div key={q.id} className="bg-[#17171b] border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#49d3e8] bg-[#49d3e8]/10 px-2 py-0.5 rounded">Q{i + 1}</span>
                        <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">{q.type}</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-mono ${isCorrect ? "text-[#4ade80]" : "text-[#ff5c5c]"}`}>
                        {isCorrect ? (
                          <>
                            <Check className="w-4 h-4" /> Correct
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4" /> Incorrect
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-semibold mb-3">{q.prompt}</p>
                    {!isCorrect && (
                      <p className="text-xs text-zinc-500 italic mt-2">Correct answer has been hidden to challenge your study skills. Try again on your next timeline review!</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
              <Link
                to={`/courses/${courseId}/video/${sessionId}/session`}
                className="px-5 py-3 border border-zinc-800 rounded-xl font-mono text-xs hover:border-[#49d3e8] transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Exit to Session Video
              </Link>
              {!lastAttemptResult.passed && attempts.length < 3 && (
                <button
                  onClick={handleRetake}
                  className="px-5 py-3 bg-[#49d3e8] text-zinc-950 rounded-xl font-mono text-xs font-bold hover:bg-[#3bc4d8] transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Start Attempt #{attempts.length + 1} / 3
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ================= 3. ACTIVE INTERACTIVE PLAYING STATE ================= */
          <div className="space-y-6">
            <div className="bg-[#17171b] border border-zinc-800 rounded-3xl overflow-hidden">
              <div className="bg-zinc-900/60 px-6 py-4 border-b border-zinc-800 flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded">
                    MODULE Q{activeQuestionIdx + 1}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500 tracking-wider uppercase bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                    {currentQuestion.type}
                  </span>
                </div>
                
                {/* Timed MCQ countdown badge */}
                {timedCount !== null && (
                  <div className="flex items-center gap-1.5 font-mono text-xs text-[#ffc24b]">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>TIMED SPRINT: <b>00:{String(timedCount).padStart(2, '0')}</b></span>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <p className="text-lg font-bold leading-relaxed">{currentQuestion.prompt}</p>

                {/* ================= TYPE 1: MCQ & TIMED MCQ ================= */}
                {(currentQuestion.type === "mcq" || currentQuestion.type === "timed_mcq") && (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options?.map((o: any, idx: number) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = responses[currentQuestion.id] === o.id;
                      return (
                        <button
                          key={o.id}
                          disabled={responses[currentQuestion.id] === "EXPIRED"}
                          onClick={() => handleAnswerSelect(currentQuestion.id, o.id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                            isSelected 
                              ? "bg-[#49d3e8]/5 border-[#49d3e8] shadow-lg shadow-[#49d3e8]/5" 
                              : "bg-[#1e1f24] border-zinc-800 hover:border-zinc-700"
                          } disabled:opacity-50`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold border shrink-0 ${
                            isSelected 
                              ? "bg-[#49d3e8] text-zinc-950 border-[#49d3e8]" 
                              : "bg-zinc-950 text-zinc-400 border-zinc-800"
                          }`}>
                            {letter}
                          </div>
                          <span className="text-sm font-semibold">{o.text}</span>
                        </button>
                      );
                    })}
                    {responses[currentQuestion.id] === "EXPIRED" && (
                      <p className="text-xs text-[#ff5c5c] font-mono italic">Time limit expired for this sprint! Locked in with no choice.</p>
                    )}
                  </div>
                )}

                {/* ================= TYPE 2: DIRECT ANSWER ================= */}
                {currentQuestion.type === "direct" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="w-full bg-[#1e1f24] border border-zinc-800 rounded-xl p-4 font-mono text-sm tracking-wide text-white outline-none focus:border-[#49d3e8] placeholder-zinc-600"
                      placeholder="Type keyboard shortcuts or terms precisely..."
                      value={responses[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    />
                    <p className="text-[10px] text-zinc-500 font-mono">Case-insensitive. For complex keys, use standard notation (e.g. Shift+Delete).</p>
                  </div>
                )}

                {/* ================= TYPE 3: TRUE / FALSE ================= */}
                {currentQuestion.type === "truefalse" && (
                  <div className="space-y-4">
                    <div className="p-5 bg-zinc-950/80 border border-zinc-800 rounded-2xl font-mono text-sm leading-relaxed text-zinc-300">
                      {currentQuestion.trueFalseStatement}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleAnswerSelect(currentQuestion.id, true)}
                        className={`py-4 rounded-xl border text-sm font-mono font-bold tracking-wider transition-all cursor-pointer ${
                          responses[currentQuestion.id] === true
                            ? "bg-[#4ade80]/10 border-[#4ade80] text-[#4ade80] shadow"
                            : "bg-[#1e1f24] border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        TRUE CUT
                      </button>
                      <button
                        onClick={() => handleAnswerSelect(currentQuestion.id, false)}
                        className={`py-4 rounded-xl border text-sm font-mono font-bold tracking-wider transition-all cursor-pointer ${
                          responses[currentQuestion.id] === false
                            ? "bg-[#ff5c5c]/10 border-[#ff5c5c] text-[#ff5c5c] shadow"
                            : "bg-[#1e1f24] border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        FALSE CUT
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= TYPE 4: FILL THE GAP ================= */}
                {currentQuestion.type === "fillgap" && (
                  <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
                    <div className="text-base sm:text-lg leading-loose font-body text-zinc-200">
                      {/* Splitting gaps */}
                      {currentQuestion.gapTemplate.split("___")[0]}
                      <input
                        type="text"
                        className="inline-block bg-[#1e1f24] border-b-2 border-[#49d3e8] rounded-t px-3 py-1 font-mono text-[#49d3e8] outline-none focus:bg-zinc-900 w-36 text-center text-sm"
                        placeholder="_____"
                        value={responses[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                      />
                      {currentQuestion.gapTemplate.split("___")[1]}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono">Fill in the blank with the exact technical term.</p>
                  </div>
                )}

                {/* ================= TYPE 5: MEDIA MCQ ================= */}
                {currentQuestion.type === "media_mcq" && (
                  <div className="space-y-6">
                    {/* Visual stream preview */}
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-black">
                      <iframe
                        src={currentQuestion.mediaUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {currentQuestion.options?.map((o: any, idx: number) => {
                        const letter = String.fromCharCode(65 + idx);
                        const isSelected = responses[currentQuestion.id] === o.id;
                        return (
                          <button
                            key={o.id}
                            onClick={() => handleAnswerSelect(currentQuestion.id, o.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                              isSelected 
                                ? "bg-[#49d3e8]/5 border-[#49d3e8]" 
                                : "bg-[#1e1f24] border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold border shrink-0 ${
                              isSelected 
                                ? "bg-[#49d3e8] text-zinc-950 border-[#49d3e8]" 
                                : "bg-zinc-950 text-zinc-400 border-zinc-800"
                            }`}>
                              {letter}
                            </div>
                            <span className="text-sm font-semibold">{o.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ================= TYPE 6: SPOT THE DIFFERENCE ================= */}
                {currentQuestion.type === "spot_diff" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Clip A — Reference</div>
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center font-mono text-xs text-zinc-500">
                          CLIP A REFERENCE
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Clip B — Edited differences</div>
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                          <iframe
                            src={currentQuestion.diffMediaUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Spotted Difference Timecode Second</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-[#1e1f24] border border-zinc-800 rounded-xl p-4 font-mono text-sm text-white outline-none focus:border-[#49d3e8]"
                        placeholder="Enter the timestamp second (e.g. 12)..."
                        value={responses[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                      />
                      <p className="text-[10px] text-zinc-500 font-mono">Watch carefully and input the approximate elapsed second mark.</p>
                    </div>
                  </div>
                )}

                {/* ================= TYPE 7: SLIDER COMPARE ================= */}
                {currentQuestion.type === "slider_compare" && (
                  <div className="space-y-6">
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                      <img
                        src={currentQuestion.sliderMediaA}
                        className="absolute inset-0 w-full h-full object-cover"
                        alt="Slider A"
                        referrerPolicy="no-referrer"
                      />
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 0 0 ${sliderVal}%)` }}
                      >
                        <img
                          src={currentQuestion.sliderMediaB}
                          className="absolute inset-0 w-full h-full object-cover"
                          alt="Slider B"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute top-4 right-4 bg-zinc-950/70 border border-zinc-800 font-mono text-[9px] text-[#49d3e8] px-2 py-0.5 rounded">SIDE B</span>
                      </div>
                      
                      <span className="absolute top-4 left-4 bg-zinc-950/70 border border-zinc-800 font-mono text-[9px] text-zinc-400 px-2 py-0.5 rounded">SIDE A</span>

                      {/* Moving slider vertical bar */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none"
                        style={{ left: `${sliderVal}%` }}
                      />
                    </div>

                    <div className="space-y-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sliderVal}
                        onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
                        className="w-full accent-[#49d3e8] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleAnswerSelect(currentQuestion.id, "A")}
                          className={`py-3 rounded-xl border text-sm font-mono font-bold transition-all cursor-pointer ${
                            responses[currentQuestion.id] === "A"
                              ? "bg-[#49d3e8]/10 border-[#49d3e8] text-[#49d3e8]"
                              : "bg-[#1e1f24] border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          SIDE A IS TEAL/ORANGE
                        </button>
                        <button
                          onClick={() => handleAnswerSelect(currentQuestion.id, "B")}
                          className={`py-3 rounded-xl border text-sm font-mono font-bold transition-all cursor-pointer ${
                            responses[currentQuestion.id] === "B"
                              ? "bg-[#49d3e8]/10 border-[#49d3e8] text-[#49d3e8]"
                              : "bg-[#1e1f24] border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          SIDE B IS TEAL/ORANGE
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= TYPE 8: DRAG TO REORDER ================= */}
                {currentQuestion.type === "sequence" && (
                  <div className="space-y-3" onDragOver={handleSequenceDragOver}>
                    {seqItems.map((item, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleSequenceDragStart(e, idx)}
                        onDrop={(e) => handleSequenceDrop(e, idx)}
                        className="flex items-center gap-4 bg-[#1e1f24] border border-zinc-800 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-zinc-700 transition-colors"
                      >
                        <span className="font-mono text-xs text-[#49d3e8] bg-[#49d3e8]/10 px-2.5 py-1 rounded shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 font-body text-sm font-semibold">{item}</div>
                        <div className="font-mono text-zinc-600 text-xs tracking-widest shrink-0">⠿⠿</div>
                      </div>
                    ))}
                    <p className="text-[10px] text-zinc-500 font-mono mt-2">Drag and drop the items to reorder them in logical sequence.</p>
                  </div>
                )}

                {/* ================= TYPE 9: MATCH PAIRS ================= */}
                {currentQuestion.type === "match" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left draggable items */}
                      <div className="space-y-3">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Draggable Sound FX</div>
                        {currentQuestion.matchPairs?.map((pair: any, idx: number) => {
                          const isMatched = matchesMap[pair.left] !== undefined;
                          return (
                            <div
                              key={idx}
                              draggable={!isMatched}
                              onDragStart={(e) => handleMatchDragStart(e, pair.left)}
                              className={`p-4 border rounded-xl font-body text-sm font-bold flex items-center justify-between transition-colors ${
                                isMatched 
                                  ? "bg-zinc-950 border-zinc-800 text-zinc-600 opacity-40 select-none" 
                                  : "bg-[#1e1f24] border-zinc-800 hover:border-zinc-700 cursor-grab active:cursor-grabbing text-zinc-200"
                              }`}
                            >
                              <span>🔊 {pair.left}</span>
                              {!isMatched && <span className="font-mono text-xs text-[#49d3e8]">DRAG</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Right drop slots */}
                      <div className="space-y-3">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Target Editing Actions</div>
                        {currentQuestion.matchPairs?.map((pair: any, idx: number) => {
                          const matchedLeft = Object.keys(matchesMap).find(k => matchesMap[k] === pair.right);
                          return (
                            <div
                              key={idx}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleMatchDrop(pair.right)}
                              className={`p-4 border rounded-xl flex items-center justify-between text-sm transition-all ${
                                matchedLeft 
                                  ? "bg-[#49d3e8]/5 border-[#49d3e8]" 
                                  : "bg-zinc-950 border-dashed border-zinc-800 text-zinc-400"
                              }`}
                            >
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">ACTION {idx + 1}</span>
                                <span className="font-semibold text-zinc-300">{pair.right}</span>
                              </div>
                              {matchedLeft ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-[#49d3e8] bg-[#49d3e8]/10 px-2 py-0.5 rounded">🔊 {matchedLeft}</span>
                                  <button
                                    onClick={() => handleMatchClear(matchedLeft)}
                                    className="text-zinc-500 hover:text-[#ff5c5c] cursor-pointer text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <span className="font-mono text-[10px] text-zinc-600 italic border border-zinc-800 border-dashed p-1 rounded">DROP SLOT</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ================= PREV / NEXT / SUBMIT NAVIGATION BAR ================= */}
            <div className="flex items-center justify-between gap-4 mt-6">
              <button
                disabled={activeQuestionIdx === 0}
                onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                className="px-5 py-3 border border-zinc-800 rounded-xl font-mono text-xs font-bold hover:border-[#49d3e8] hover:text-[#49d3e8] disabled:opacity-30 disabled:hover:border-zinc-800 disabled:hover:text-zinc-500 transition-colors cursor-pointer"
              >
                ← Prev Module
              </button>

              {activeQuestionIdx < totalQuestions - 1 ? (
                <button
                  onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                  className="px-5 py-3 bg-[#1e1f24] hover:bg-[#282a30] border border-zinc-800 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Next Module →
                </button>
              ) : (
                <button
                  disabled={submittingAttempt || Object.keys(responses).length < totalQuestions}
                  onClick={handleQuizSubmit}
                  className="px-6 py-3 bg-gradient-to-r from-[#49d3e8] to-[#4ade80] text-zinc-950 font-mono text-xs font-extrabold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#49d3e8]/10"
                >
                  {submittingAttempt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Evaluate Timeline Quiz
                </button>
              )}
            </div>

            {Object.keys(responses).length < totalQuestions && (
              <p className="text-center text-[10px] font-mono text-zinc-500 mt-4">
                Fill in all {totalQuestions} clip answers to unlock the evaluation compiler.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
