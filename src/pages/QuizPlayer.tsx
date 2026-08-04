import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth, getDocs, collection, query, where, addDoc, ensureDefaultQuizzesSeeded } from '../firebase';
import { Play, HelpCircle, Check, X, ShieldAlert, ArrowLeft, ArrowRight, RotateCcw, Award, Clock, Loader2, Lock, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

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

/* ================= ARABIC RTL FLOW DETECTOR, SHUFFLE UTILITY & QUIZ QUESTION NORMALIZATION ================= */
export const hasArabic = (text: any): boolean => {
  if (!text) return false;
  return /[\u0600-\u06FF]/.test(String(text));
};

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function normalizeQuiz(rawQuiz: any) {
  if (!rawQuiz) return null;
  
  const normalizedQuestions = rawQuiz.questions?.map((q: any, i: number) => {
    // Determine target normalized type
    let targetType = String(q.type || "").toLowerCase().replace(/_/g, "").replace(/\//g, "").replace(/-/g, "").replace(/\s/g, "");
    
    // Map standard admin quiz types to internal players
    if (targetType === "mcq") targetType = "mcq";
    else if (targetType === "timedmcq" || targetType === "timedrapidfiremcq") targetType = "timed_mcq";
    else if (targetType === "mediaquiz" || targetType === "media_mcq") targetType = "media_mcq";
    else if (targetType === "direct" || targetType === "directanswer") targetType = "direct";
    else if (targetType === "truefalse" || targetType === "true/false") targetType = "truefalse";
    else if (targetType === "fillgap" || targetType === "fillthegap") targetType = "fillgap";
    else if (targetType === "spotdiff") targetType = "spot_diff";
    else if (targetType === "slider" || targetType === "slidercompare") targetType = "slider_compare";
    else if (targetType === "sequence" || targetType === "dragtoreorder") targetType = "sequence";
    else if (targetType === "match" || targetType === "matchpairs") targetType = "match";

    const prompt = q.prompt || q.text || "";
    const id = q.id || `custom_q_${i}`;
    const points = q.points || 1;

    let options = q.options || [];
    // If options are string arrays (from custom quiz) and it's an MCQ, map to expected object array
    if (["mcq", "timed_mcq", "media_mcq"].includes(targetType)) {
      if (Array.isArray(options) && (options.length === 0 || typeof options[0] === "string")) {
        options = options.map((optText: string, idx: number) => {
          const isCorrect = String(optText).trim() === String(q.correctAnswer).trim();
          return {
            id: `opt_${idx}`,
            text: optText,
            correct: isCorrect
          };
        });
      }
      // Shuffle multiple choice options
      options = shuffleArray(options);
    }

    let acceptedAnswers = q.acceptedAnswers || [];
    if (targetType === "direct" && q.correctAnswer) {
      const correctAnsStr = String(q.correctAnswer).trim();
      acceptedAnswers = [correctAnsStr, correctAnsStr.toLowerCase()];
    }

    let trueFalseStatement = q.trueFalseStatement || q.prompt || q.text || "";
    let trueFalseAnswer = q.trueFalseAnswer;
    if (targetType === "truefalse" && q.correctAnswer !== undefined) {
      trueFalseAnswer = q.correctAnswer === "True" || q.correctAnswer === true;
    }

    let gapTemplate = q.gapTemplate || (q.options && q.options[0]) || "";
    let gapAnswer = q.gapAnswer || q.correctAnswer || "";

    let diffMediaUrl = q.mediaUrl || q.diffMediaUrl || "";
    let diffSecondMediaUrl = q.secondMediaUrl || q.diffSecondMediaUrl || "";
    let spotDiffVideosCount = Number(q.spotDiffVideosCount) || (q.secondMediaUrl ? 2 : 1);
    let diffCorrectSecond = Number(q.correctAnswer) || q.diffCorrectSecond || 0;

    let sliderMediaA = q.mediaUrl || q.sliderMediaA || "";
    let sliderMediaB = q.secondMediaUrl || q.sliderMediaB || "";
    let sliderCorrectSide = q.correctAnswer || q.sliderCorrectSide || "A";

    let sequenceItems = q.sequenceItems || [];
    if (targetType === "sequence") {
      if (Array.isArray(q.correctAnswer)) {
        sequenceItems = q.correctAnswer;
      } else if (Array.isArray(q.options)) {
        sequenceItems = q.options;
      }
    }

    let matchPairs = q.matchPairs || [];
    if (targetType === "match") {
      if (Array.isArray(q.options) && Array.isArray(q.correctAnswer)) {
        matchPairs = q.options.map((leftItem: string, idx: number) => ({
          id: `pair_${idx}`,
          left: leftItem,
          right: q.correctAnswer[idx] || ""
        }));
      }
    }

    let timeLimitSec = q.timeLimitSec || q.timerLimit || 15;

    return {
      ...q,
      id,
      type: targetType,
      prompt,
      points,
      options,
      acceptedAnswers,
      trueFalseStatement,
      trueFalseAnswer,
      gapTemplate,
      gapAnswer,
      diffMediaUrl,
      diffSecondMediaUrl,
      spotDiffVideosCount,
      diffCorrectSecond,
      sliderMediaA,
      sliderMediaB,
      sliderCorrectSide,
      sequenceItems,
      matchPairs,
      timeLimitSec
    };
  });

  return {
    ...rawQuiz,
    questions: shuffleArray(normalizedQuestions || [])
  };
}

function playSuccessSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (freq: number, start: number, duration: number, type: OscillatorType = "sine") => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    playTone(523.25, now, 0.4);       // C5
    playTone(659.25, now + 0.1, 0.4); // E5
    playTone(783.99, now + 0.2, 0.4); // G5
    playTone(1046.50, now + 0.3, 0.6, "triangle"); // C6 (sweet triangle finish)
  } catch (error) {
    console.warn("Failed to play success audio:", error);
  }
}

export default function QuizPlayer() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { id: courseId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Lockout / Attempt status states
  const [attempts, setAttempts] = useState<any[]>([]);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number>(0); // seconds remaining
  const [isPassed, setIsPassed] = useState(false);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [lastAttemptResult, setLastAttemptResult] = useState<any>(null);

  // Timer state for quiz duration
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Student Responses
  const [responses, setResponses] = useState<{ [qid: string]: any }>({});
  const [tempResponses, setTempResponses] = useState<{ [qid: string]: any }>({});
  
  // Timed MCQ prep countdown states
  const [revealedTimedQuestions, setRevealedTimedQuestions] = useState<{ [qid: string]: boolean }>({});
  const [prepCountdownVal, setPrepCountdownVal] = useState<{ [qid: string]: number }>({});
  
  // Specific question type support states
  const [sliderVal, setSliderVal] = useState(50);
  const [draggedMatchItem, setDraggedMatchItem] = useState<{ qid: string; left: string } | null>(null);
  const [matchesMaps, setMatchesMaps] = useState<{ [qid: string]: { [left: string]: string } }>({});
  const [shuffledSequences, setShuffledSequences] = useState<{ [qid: string]: string[] }>({});
  
  // Timed MCQ countdown timer
  const [timedCount, setTimedCount] = useState<number | null>(null);

  // Timed MCQ prep countdown ref
  const prepTimerRef = useRef<any>(null);

  const resultsBadgeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (quizSubmitted && lastAttemptResult && resultsBadgeRef.current) {
      const timer = setTimeout(() => {
        resultsBadgeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [quizSubmitted, lastAttemptResult]);

  // Timer effect to increment seconds spent taking the quiz
  useEffect(() => {
    if (loading || quizSubmitted || lockoutTimeLeft > 0) return;
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, quizSubmitted, lockoutTimeLeft]);

  useEffect(() => {
    fetchQuizAndAttempts();
  }, [courseId, sessionId]);

  // Handle Timed MCQ countdown for the whole quiz/all-questions layout
  useEffect(() => {
    if (!quiz || quizSubmitted) return;
    
    // Find the timed MCQ question
    const timedQuestion = quiz.questions.find((q: any) => q.type === "timed_mcq");
    if (!timedQuestion) return;
    
    // If already answered or time expired, stop the timer
    if (responses[timedQuestion.id] !== undefined) {
      setTimedCount(null);
      return;
    }

    // Delay start until previous question is answered
    const timedIdx = quiz.questions.findIndex((q: any) => q.id === timedQuestion.id);
    if (timedIdx > 0) {
      const prevQuestion = quiz.questions[timedIdx - 1];
      const isPrevFinished = responses[prevQuestion.id] !== undefined;
      if (!isPrevFinished) {
        // Hold at default limit
        const limit = timedQuestion.timeLimitSec || 10;
        setTimedCount(limit);
        return;
      }
    }

    // Delay start until preparation countdown is done and question is revealed
    if (!revealedTimedQuestions[timedQuestion.id]) {
      const limit = timedQuestion.timeLimitSec || 10;
      setTimedCount(limit);
      return;
    }
    
    const limit = timedQuestion.timeLimitSec || 10;
    setTimedCount(limit);
    
    const interval = setInterval(() => {
      setTimedCount((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(interval);
          // Lock auto selection with EXPIRED
          handleAnswerSelect(timedQuestion.id, "EXPIRED");
          setResponses(r => ({ ...r, [timedQuestion.id]: "EXPIRED" }));
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [quiz, quizSubmitted, responses, revealedTimedQuestions]);

  // 5-second preparation countdown effect for timed_mcq
  useEffect(() => {
    if (!quiz || quizSubmitted) return;

    const timedQuestion = quiz.questions.find((q: any) => q.type === "timed_mcq");
    if (!timedQuestion) return;

    // Check if unlocked (first question, or previous question answered)
    const timedIdx = quiz.questions.findIndex((q: any) => q.id === timedQuestion.id);
    let isUnlocked = true;
    if (timedIdx > 0) {
      const prevQuestion = quiz.questions[timedIdx - 1];
      isUnlocked = responses[prevQuestion.id] !== undefined;
    }

    if (isUnlocked && !revealedTimedQuestions[timedQuestion.id]) {
      if (!prepTimerRef.current) {
        setPrepCountdownVal(prev => ({ ...prev, [timedQuestion.id]: 5 }));
        
        let count = 5;
        prepTimerRef.current = setInterval(() => {
          count--;
          if (count <= 0) {
            if (prepTimerRef.current) {
              clearInterval(prepTimerRef.current);
              prepTimerRef.current = null;
            }
            setRevealedTimedQuestions(prev => ({ ...prev, [timedQuestion.id]: true }));
            setPrepCountdownVal(prev => ({ ...prev, [timedQuestion.id]: 0 }));
          } else {
            setPrepCountdownVal(prev => ({ ...prev, [timedQuestion.id]: count }));
          }
        }, 1000);
      }
    } else {
      if (prepTimerRef.current) {
        clearInterval(prepTimerRef.current);
        prepTimerRef.current = null;
      }
    }

    return () => {
      if (prepTimerRef.current) {
        clearInterval(prepTimerRef.current);
        prepTimerRef.current = null;
      }
    };
  }, [quiz, quizSubmitted, responses, revealedTimedQuestions]);

  // Initialize shuffled sequences and matches maps
  useEffect(() => {
    if (!quiz) return;
    
    const seqs: { [qid: string]: string[] } = {};
    const maps: { [qid: string]: { [left: string]: string } } = {};
    
    quiz.questions.forEach((q: any) => {
      if (q.type === "sequence") {
        if (!responses[q.id]) {
          const shuffled = shuffleArray(q.sequenceItems) as string[];
          seqs[q.id] = shuffled;
          setTempResponses(prev => ({ ...prev, [q.id]: shuffled }));
        } else {
          seqs[q.id] = responses[q.id];
          setTempResponses(prev => ({ ...prev, [q.id]: responses[q.id] }));
        }
      }
      if (q.type === "match") {
        maps[q.id] = responses[q.id] || {};
        if (responses[q.id]) {
          setTempResponses(prev => ({ ...prev, [q.id]: responses[q.id] }));
        }
      }
    });
    
    setShuffledSequences(seqs);
    setMatchesMaps(maps);
  }, [quiz]);

  const fetchQuizAndAttempts = async () => {
    try {
      setLoading(true);
      try {
        await ensureDefaultQuizzesSeeded();
      } catch (e) {
        console.warn("Skipped seeding default quizzes (read-only or guest):", e);
      }

      const user = auth.currentUser;
      const sId = parseInt(sessionId || "1", 10);

      // 1. Fetch published/admin quizzes for this session index safely
      let loadedQuiz = null;
      try {
        const qCol = collection(db, "quizzes");
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
            loadedQuiz = published || matched[0];
          }
        }
      } catch (e) {
        console.warn("Could not fetch quiz from Firestore (using fallback for session):", e);
      }

      if (!loadedQuiz) {
        // Fallback for any session if no custom quiz created yet or guest without query access
        loadedQuiz = {
          ...DEFAULT_SESSION_1_QUIZ,
          id: `quiz_session_${sId}`,
          title: `Session ${sId} — Knowledge Check`,
          sessionId: sId
        };
      }

      const normalized = normalizeQuiz(loadedQuiz);
      setQuiz(normalized);

      if (user && normalized) {
        // 2. Fetch past quiz attempts from Firestore
        try {
          const attemptsCol = collection(db, "quiz_attempts");
          const attQuery = query(
            attemptsCol, 
            where("studentId", "==", user.uid), 
            where("quizId", "==", normalized.id)
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
        } catch (e) {
          console.warn("Failed fetching user quiz attempts:", e);
        }
      } else if (!user && normalized) {
        // Fetch past guest attempts from localStorage for free trial
        const guestKey = `guest_quiz_attempts_session_${sId}`;
        try {
          const saved = localStorage.getItem(guestKey);
          if (saved) {
            const attList = JSON.parse(saved);
            setAttempts(attList);
            const passedAttempt = attList.find((a: any) => a.passed);
            if (passedAttempt) {
              setIsPassed(true);
            }
            if (attList.length >= 3 && !passedAttempt) {
              const latestAttempt = attList[0];
              if (latestAttempt?.lockoutUntil) {
                const lockoutDate = new Date(latestAttempt.lockoutUntil).getTime();
                const now = Date.now();
                if (lockoutDate > now) {
                  setLockoutTimeLeft(Math.ceil((lockoutDate - now) / 1000));
                }
              }
            }
          } else {
            setAttempts([]);
            setIsPassed(false);
          }
        } catch (e) {
          console.warn("Failed reading guest quiz attempts from local storage:", e);
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
    setTempResponses(prev => ({ ...prev, [qid]: val }));
  };

  const handleConfirmAnswer = (qid: string) => {
    if (quizSubmitted || !quiz) return;
    const val = tempResponses[qid];
    if (val === undefined) return;

    setResponses(prev => ({ ...prev, [qid]: val }));

    // Find the next question and scroll to it
    const currentIdx = quiz.questions.findIndex((q: any) => q.id === qid);
    if (currentIdx !== -1 && currentIdx < quiz.questions.length - 1) {
      const nextQ = quiz.questions[currentIdx + 1];

      // Start the 5-second preparation countdown for the timed question instantly!
      if (nextQ.type === "timed_mcq") {
        if (!revealedTimedQuestions[nextQ.id] && !prepTimerRef.current) {
          setPrepCountdownVal(prev => ({ ...prev, [nextQ.id]: 5 }));
          let count = 5;
          prepTimerRef.current = setInterval(() => {
            count--;
            if (count <= 0) {
              if (prepTimerRef.current) {
                clearInterval(prepTimerRef.current);
                prepTimerRef.current = null;
              }
              setRevealedTimedQuestions(prev => ({ ...prev, [nextQ.id]: true }));
              setPrepCountdownVal(prev => ({ ...prev, [nextQ.id]: 0 }));
            } else {
              setPrepCountdownVal(prev => ({ ...prev, [nextQ.id]: count }));
            }
          }, 1000);
        }
      }

      setTimeout(() => {
        const nextCard = document.getElementById(`q-card-${nextQ.id}`);
        if (nextCard) {
          nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  };

  const handleSequenceDragStart = (e: React.DragEvent, qid: string, index: number) => {
    e.dataTransfer.setData("text/plain", `${qid}:${index}`);
  };

  const handleSequenceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSequenceDrop = (e: React.DragEvent, qid: string, targetIdx: number) => {
    const data = e.dataTransfer.getData("text/plain");
    const parts = data.split(":");
    if (parts.length !== 2) return;
    const sourceQid = parts[0];
    const sourceIdx = parseInt(parts[1], 10);
    if (sourceQid !== qid || isNaN(sourceIdx)) return;
    
    const currentItems = shuffledSequences[qid] || [];
    const nextList = [...currentItems];
    const [dragged] = nextList.splice(sourceIdx, 1);
    nextList.splice(targetIdx, 0, dragged);
    
    setShuffledSequences(prev => ({ ...prev, [qid]: nextList }));
    handleAnswerSelect(qid, nextList);
  };

  const handleMatchDragStart = (e: React.DragEvent, qid: string, item: string) => {
    setDraggedMatchItem({ qid, left: item });
  };

  const handleMatchDrop = (qid: string, targetRight: string) => {
    if (!draggedMatchItem || draggedMatchItem.qid !== qid) return;
    const currentMap = matchesMaps[qid] || {};
    const nextMap = { ...currentMap, [draggedMatchItem.left]: targetRight };
    setMatchesMaps(prev => ({ ...prev, [qid]: nextMap }));
    handleAnswerSelect(qid, nextMap);
    setDraggedMatchItem(null);
  };

  const handleMatchClear = (qid: string, leftItem: string) => {
    const currentMap = matchesMaps[qid] || {};
    const nextMap = { ...currentMap };
    delete nextMap[leftItem];
    setMatchesMaps(prev => ({ ...prev, [qid]: nextMap }));
    handleAnswerSelect(qid, nextMap);
  };

  // Submit attempt evaluation
  const handleQuizSubmit = async () => {
    if (!quiz) return;
    
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
        correct = Array.isArray(studentAns) && 
                  studentAns.every((val, i) => val === q.sequenceItems[i]);
      } else if (q.type === "match") {
        const pairs = q.matchPairs || [];
        correct = pairs.every((p: any) => studentAns[p.left] === p.right);
      }

      if (correct) correctCount++;
      detailedResults[q.id] = correct;
    });

    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= 70;
    const attemptNum = attempts.length + 1;
    
    let lockoutUntil = null;
    if (!passed && attemptNum >= 3) {
      lockoutUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }

    const user = auth.currentUser;
    const attemptData = {
      studentId: user ? user.uid : "guest",
      studentEmail: user ? user.email : "guest@cutscene-academy.com",
      quizId: quiz.id,
      sessionId: parseInt(sessionId || "1", 10),
      attemptNumber: attemptNum,
      answers: responses,
      score: scorePercentage,
      passed,
      submittedAt: new Date().toISOString(),
      lockoutUntil,
      timeTaken: elapsedTime
    };

    try {
      if (user) {
        await addDoc(collection(db, "quiz_attempts"), attemptData);
      } else {
        const sId = parseInt(sessionId || "1", 10);
        const guestKey = `guest_quiz_attempts_session_${sId}`;
        try {
          const saved = localStorage.getItem(guestKey);
          const existing = saved ? JSON.parse(saved) : [];
          existing.unshift(attemptData);
          localStorage.setItem(guestKey, JSON.stringify(existing));
          setAttempts(existing);
        } catch (e) {
          console.warn("Failed saving guest attempt to local storage:", e);
        }
      }
      
      setLastAttemptResult({
        score: scorePercentage,
        passed,
        correctCount,
        totalQuestions,
        detailedResults,
        timeTaken: elapsedTime
      });
      setQuizSubmitted(true);
      fetchQuizAndAttempts(); // Reload attempts

      if (passed) {
        // Play success sound
        playSuccessSound();
        // Trigger rich multi-angle confetti explosion
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        // Extra side bursts
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 }
          });
        }, 200);
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 }
          });
        }, 400);
      }
    } catch (err) {
      console.error("Error saving quiz attempt:", err);
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const handleRetake = () => {
    if (prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    setResponses({});
    setTempResponses({});
    setRevealedTimedQuestions({});
    setPrepCountdownVal({});
    setQuizSubmitted(false);
    setLastAttemptResult(null);
    setSliderVal(50);
    setMatchesMaps({});
    setShuffledSequences({});
    setElapsedTime(0);
    fetchQuizAndAttempts();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
        <p className="font-mono text-sm tracking-widest uppercase text-zinc-500">Loading NLE Scrubber...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-zinc-950/60 border border-purple-900/20 p-8 rounded-3xl text-center backdrop-blur-md">
          <HelpCircle className="w-16 h-16 text-zinc-500 mx-auto mb-6" />
          <h2 className="text-xl font-mono font-bold mb-2">No Quiz Found</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-8">
            There is no published quiz assigned to Session {sessionId} yet. Check back later or ask an instructor.
          </p>
          <Link
            to={`/courses/${courseId}/video/${sessionId}/session`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-mono text-xs font-bold hover:bg-purple-550 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Lesson
          </Link>
        </div>
      </div>
    );
  }

  const sId = parseInt(sessionId || "1", 10);
  const isFreeTrialSession = sId === 1 || quiz?.isFreeTrial || quiz?.isFree;

  if (!user && !isFreeTrialSession) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-zinc-950/80 border border-purple-900/30 p-8 rounded-3xl text-center backdrop-blur-md space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto border border-purple-500/30">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full bg-purple-950 text-purple-300 text-[10px] font-bold uppercase tracking-widest border border-purple-500/20">
              {language === 'ar' ? 'اختبار مدفوع' : language === 'fr' ? 'Quiz Réservez aux Inscrits' : 'Enrolled Students Only'}
            </span>
            <h2 className="text-xl font-mono font-bold text-white mt-3">
              {language === 'ar' ? `اختبار الحصة ${sId} يتطلب حساباً` : language === 'fr' ? `Le quiz de la session ${sId} requiert un compte` : `Session ${sId} Quiz Requires an Account`}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed mt-2">
              {language === 'ar' 
                ? `اختبارات الحصص المجانية متاحة للحصة الأولى فقط. للوصول إلى كافة اختبارات وتمارين المنهاج، يرجى تسجيل الدخول أو إنشاء حساب جديد.`
                : language === 'fr'
                ? `Les quiz d'essai gratuit sont disponibles pour la session 1. Pour accéder à tous les quiz et exercices du programme, veuillez vous connecter ou créer un compte.`
                : `Free trial quizzes are available for Session 1. To unlock quizzes for Session ${sId} and beyond, please log in or create an account.`}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              to="/login"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider block transition-all shadow-lg shadow-purple-600/30"
            >
              {language === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : language === 'fr' ? 'Se Connecter / S\'inscrire' : 'Log In / Create Account'}
            </Link>
            
            <Link
              to={`/courses/${courseId}/quiz/1`}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-purple-900/30 text-purple-300 hover:text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider block transition-all"
            >
              {language === 'ar' ? 'جرب اختبار التجربة المجانية (الحصة 1)' : language === 'fr' ? 'Essayer le quiz gratuit (Session 1)' : 'Try Free Trial Quiz (Session 1)'}
            </Link>

            <Link
              to={`/courses/${courseId}`}
              className="text-xs text-zinc-500 hover:text-zinc-300 block transition-colors pt-1"
            >
              ← {language === 'ar' ? 'العودة للدورة' : language === 'fr' ? 'Retour au cours' : 'Back to Course'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(responses).length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-transparent text-[#eeeef0] selection:bg-purple-500/30 selection:text-purple-200 font-sans pb-24">
      
      {/* ================= STICKY COMPACT FLOATING HEADER ================= */}
      {!lockoutTimeLeft && (
        <div className="sticky top-16 z-40 bg-zinc-950/65 backdrop-blur-md border-b border-purple-900/20 px-4 py-2.5 transition-all">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            
            {/* Back Button / Compact Progress Label */}
            <div className="flex items-center gap-4">
              <Link
                to={`/courses/${courseId}/video/${sessionId}/session`}
                className="px-3 py-1.5 border border-purple-900/20 rounded-lg text-[11px] font-mono hover:border-purple-500 hover:text-purple-300 transition-all flex items-center gap-1 shrink-0 bg-[#131316]/50"
              >
                <ArrowLeft className="w-3 h-3" /> Exit
              </Link>
              
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline font-mono text-xs text-zinc-400">
                  PROGRESS: <b className="text-purple-400">{answeredCount}</b>/{totalQuestions} QUESTIONS
                </span>
                {!quizSubmitted && (
                  <span className="font-mono text-xs text-zinc-400 flex items-center gap-1 bg-zinc-900/60 border border-purple-500/15 px-2 py-0.5 rounded">
                    <Clock className="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0" />
                    {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>

            {/* Premium Compact Floating Progress Scrubber Bar */}
            <div className="flex-1 max-w-md bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-purple-900/20 relative">
              <div 
                className="h-full bg-gradient-to-r from-purple-700 via-purple-500 to-purple-400 transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(158,58,235,0.4)]"
                style={{ width: `${progressPct}%` }}
              />
              {/* Discrete Tick marks */}
              <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                {Array.from({ length: totalQuestions - 1 }).map((_, i) => (
                  <div key={i} className="w-0.5 h-full bg-[#0d0d0f]/50" />
                ))}
              </div>
            </div>

            {/* Submit / Retry Actions */}
            <div>
              {!quizSubmitted ? (
                <button
                  disabled={submittingAttempt || answeredCount < totalQuestions}
                  onClick={handleQuizSubmit}
                  className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-purple-400 text-white font-mono text-[11px] font-extrabold rounded-lg hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/20"
                >
                  {submittingAttempt ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Evaluate
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#4ade80] bg-[#4ade80]/10 px-2 py-1 rounded">EVALUATED</span>
                  {lastAttemptResult && !lastAttemptResult.passed && attempts.length < 3 && (
                    <button
                      onClick={handleRetake}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-[10px] font-mono text-white transition-all flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Retry
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ================= MAIN SCROLLABLE CONTAINER ================= */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
        
        {/* ================= BIG NON-FLOATING TITLE AND DESCRIPTION ================= */}
        <div className="mb-8 border-b border-purple-900/20 pb-8 relative">
          <span className="text-xs font-mono font-bold tracking-widest text-purple-400 uppercase bg-purple-500/10 px-3 py-1.5 rounded-md mb-4 inline-block border border-purple-500/10">
            SESSION {sessionId} COMPILATION TEST
          </span>
          <h1 className="text-3xl sm:text-5xl font-mono font-black text-white tracking-tight leading-tight uppercase">
            {quiz.title}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 mt-4 max-w-3xl leading-relaxed">
            {quiz.description}
          </p>
        </div>

        {/* ================= GUEST FREE TRIAL BANNER ================= */}
        {!user && isFreeTrialSession && (
          <div className="mb-8 bg-gradient-to-r from-purple-950/80 via-purple-900/40 to-zinc-950 border border-purple-500/30 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>{language === 'ar' ? 'وضع التجربة المجانية (بدون حساب)' : language === 'fr' ? 'Mode Essai Gratuit (Sans Compte)' : 'Free Trial Mode (No Account Required)'}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[9px] font-sans">
                    {language === 'ar' ? 'نشط' : language === 'fr' ? 'Actif' : 'Active'}
                  </span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  {language === 'ar'
                    ? 'يمكنك إجراء هذا الاختبار مجاناً! أنشئ حساباً مجانياً لحفظ نتائجك، الحصول على الشهادات، ومتابعة تقدمك.'
                    : language === 'fr'
                    ? 'Vous passez ce quiz gratuitement ! Créez un compte gratuit pour sauvegarder vos scores, obtenir des certificats et suivre votre progression.'
                    : 'You are taking this Session 1 quiz for free! Sign up or log in to save your score, track your course progress, and earn certificates.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <Link
                to="/login"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-md cursor-pointer whitespace-nowrap"
              >
                {language === 'ar' ? 'إنشاء حساب / دخول' : language === 'fr' ? 'S\'inscrire / Connexion' : 'Sign Up / Log In'}
              </Link>
            </div>
          </div>
        )}

        {/* ================= 1. CURRENTLY LOCKED OUT STATE ================= */}
        {lockoutTimeLeft > 0 ? (
          <div className="bg-[#17171b]/60 backdrop-blur-md border border-purple-900/20 p-8 rounded-3xl text-center space-y-6 max-w-2xl mx-auto my-12 shadow-2xl">
            <div className="w-16 h-16 bg-[#ff5c5c]/10 rounded-full flex items-center justify-center mx-auto border border-[#ff5c5c]/25 animate-pulse">
              <ShieldAlert className="w-8 h-8 text-[#ff5c5c]" />
            </div>
            <h2 className="text-xl font-mono font-bold text-white uppercase tracking-wider">Locked Out — Cooldown Lock Active</h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
              You have completed 3 consecutive attempts. To protect your workflow, access is temporarily locked for 1 hour so you can study.
            </p>
            <div className="inline-flex items-center gap-3 bg-[#ff5c5c]/5 border border-[#ff5c5c]/20 px-6 py-3 rounded-2xl">
              <Clock className="w-5 h-5 text-[#ffc24b]" />
              <span className="font-mono text-sm text-[#ffc24b]">
                Unlocking in: <b>{Math.floor(lockoutTimeLeft / 60)}m {lockoutTimeLeft % 60}s</b>
              </span>
            </div>
            <div className="pt-4 border-t border-purple-900/10 max-w-xs mx-auto">
              <Link
                to={`/courses/${courseId}/video/${sessionId}/session`}
                className="w-full inline-flex justify-center items-center gap-2 px-6 py-3 border border-purple-900/20 rounded-xl text-xs font-mono text-zinc-300 hover:text-white hover:border-purple-500 transition-colors bg-zinc-950/40"
              >
                Re-examine Session {sessionId} Material
              </Link>
            </div>
          </div>
        ) : quizSubmitted && lastAttemptResult ? (
          /* ================= 2. RESULTS PANEL ================= */
          <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
            
            {lastAttemptResult.passed ? (
              <div className="space-y-4">
                <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-500">Timeline Review Diagnostic Panel</h3>
                {quiz.questions.map((q: any, i: number) => {
                  const isCorrect = lastAttemptResult.detailedResults[q.id];
                  return (
                    <div key={q.id} className="bg-zinc-950/40 backdrop-blur-md border border-purple-900/10 rounded-2xl p-6 transition-all">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-900/10">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/10">QUESTION Q{i + 1}</span>
                          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{q.type}</span>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-mono ${isCorrect ? "text-[#4ade80]" : "text-[#ff5c5c]"}`}>
                          {isCorrect ? (
                            <>
                              <Check className="w-4 h-4" /> Passed
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" /> Refined Correctly
                            </>
                          )}
                        </div>
                      </div>
                      <p dir={hasArabic(q.prompt) ? "rtl" : "ltr"} className={`text-sm font-semibold text-zinc-200 ${hasArabic(q.prompt) ? "text-right" : "text-left"}`}>{q.prompt}</p>
                      {!isCorrect && (
                        <p className="text-xs text-zinc-500 italic mt-2">Correct answer has been scrambled to challenge your study skills. Re-examine the lectures and execute again!</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-zinc-950/40 backdrop-blur-md border border-purple-900/10 rounded-3xl p-6 md:p-8 space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                    {language === 'ar' ? 'ملخص الأداء والتقييم' : language === 'fr' ? 'Résumé des Performances' : 'Performance Evaluation Summary'}
                  </h3>
                  <p className="text-sm text-zinc-400 max-w-lg mx-auto">
                    {language === 'ar' 
                      ? 'لم يتم اجتياز الاختبار هذه المرة. لتشجيع مهاراتك الدراسية ومساعدتك على التعلم، تم إخفاء تفاصيل الأسئلة الصحيحة والخاطئة المحددة.'
                      : language === 'fr'
                      ? "Le quiz n'a pas été validé cette fois. Pour encourager l'apprentissage, les détails des réponses correctes et incorrectes spécifiques sont masqués."
                      : "The quiz was not passed this time. To encourage learning, details of which specific questions you got right or wrong are hidden."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-2xl p-4 text-center">
                    <span className="text-[10px] uppercase font-mono text-[#4ade80]/70 block mb-1">
                      {language === 'ar' ? 'الإجابات الصحيحة' : language === 'fr' ? 'Correctes' : 'Correct'}
                    </span>
                    <span className="text-2xl font-mono font-black text-[#4ade80]">
                      {lastAttemptResult.correctCount}
                    </span>
                  </div>
                  <div className="bg-[#ff5c5c]/5 border border-[#ff5c5c]/20 rounded-2xl p-4 text-center">
                    <span className="text-[10px] uppercase font-mono text-[#ff5c5c]/70 block mb-1">
                      {language === 'ar' ? 'الإجابات الخاطئة' : language === 'fr' ? 'Incorrectes' : 'Incorrect'}
                    </span>
                    <span className="text-2xl font-mono font-black text-[#ff5c5c]">
                      {lastAttemptResult.totalQuestions - lastAttemptResult.correctCount}
                    </span>
                  </div>
                </div>

                <div className="bg-purple-950/10 border border-purple-900/15 rounded-2xl p-5 text-center">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === 'ar'
                      ? `لقد أجبت بشكل صحيح على ${lastAttemptResult.correctCount} من أصل ${lastAttemptResult.totalQuestions} أسئلة، ووقعت في الخطأ في ${lastAttemptResult.totalQuestions - lastAttemptResult.correctCount} أسئلة. يرجى مراجعة مادة الجلسة والمحاولة مرة أخرى لتحسين النتيجة.`
                      : language === 'fr'
                      ? `Vous avez répondu correctement à ${lastAttemptResult.correctCount} questions sur ${lastAttemptResult.totalQuestions}, et fait ${lastAttemptResult.totalQuestions - lastAttemptResult.correctCount} erreurs. Veuillez revoir le matériel de la session et réessayer.`
                      : `You answered ${lastAttemptResult.correctCount} correct and ${lastAttemptResult.totalQuestions - lastAttemptResult.correctCount} incorrect out of ${lastAttemptResult.totalQuestions} questions. Please review the session material and try again to improve your score.`}
                  </p>
                </div>
              </div>
            )}

            <div ref={resultsBadgeRef} className={`p-8 rounded-3xl border text-center relative overflow-hidden ${
              lastAttemptResult.passed 
                ? "bg-[#4ade80]/5 border-[#4ade80]/20 shadow-[0_0_40px_rgba(74,222,128,0.05)]" 
                : "bg-[#ff5c5c]/5 border-[#ff5c5c]/20 shadow-[0_0_40px_rgba(255,92,92,0.05)]"
            }`}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border shrink-0">
                {lastAttemptResult.passed ? (
                  <Award className="w-8 h-8 text-[#4ade80]" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-[#ff5c5c]" />
                )}
              </div>
              <h2 className="text-2xl font-mono font-extrabold tracking-wide uppercase">
                {lastAttemptResult.passed ? "QUESTION COMPILATION PASSED ✓" : "ATTEMPT COMPLETE — UNDER PAR"}
              </h2>
              <p className="text-sm text-zinc-400 mt-2">
                Your score: <b className={lastAttemptResult.passed ? "text-[#4ade80]" : "text-[#ff5c5c]"}>{lastAttemptResult.score}%</b> (Passing is 70%)
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-mono uppercase">
                {lastAttemptResult.passed ? (
                  `CLEARED ${lastAttemptResult.correctCount} OF ${lastAttemptResult.totalQuestions} QUESTIONS.`
                ) : language === 'ar' ? (
                  `النتيجة: ${lastAttemptResult.correctCount} صحيحة و ${lastAttemptResult.totalQuestions - lastAttemptResult.correctCount} خاطئة من أصل ${lastAttemptResult.totalQuestions} أسئلة.`
                ) : language === 'fr' ? (
                  `${lastAttemptResult.correctCount} correctes & ${lastAttemptResult.totalQuestions - lastAttemptResult.correctCount} incorrectes sur ${lastAttemptResult.totalQuestions} questions.`
                ) : (
                  `${lastAttemptResult.correctCount} RIGHT & ${lastAttemptResult.totalQuestions - lastAttemptResult.correctCount} WRONG OUT OF ${lastAttemptResult.totalQuestions} QUESTIONS.`
                )}
              </p>
              <p className="text-xs text-purple-400 mt-1.5 font-mono uppercase">
                TIME TAKEN: <b>{Math.floor((lastAttemptResult.timeTaken || elapsedTime) / 60)}m {(lastAttemptResult.timeTaken || elapsedTime) % 60}s</b>
              </p>

              {lastAttemptResult.passed && (
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  <Link
                    to={`/courses/${courseId}/video/${parseInt(sessionId || "1", 10) + 1}/session`}
                    className="px-6 py-3 bg-[#4ade80] text-zinc-950 font-mono text-xs font-bold rounded-xl hover:bg-[#3cd072] transition-colors"
                  >
                    Load Session {parseInt(sessionId || "1", 10) + 1} Masterclass
                  </Link>
                </div>
              )}

              {!user && (
                <div className="mt-6 p-6 bg-gradient-to-r from-purple-950 via-purple-900/60 to-zinc-950 border-2 border-purple-500/50 rounded-2xl text-left space-y-4 shadow-2xl">
                  <div className="flex items-center gap-2.5 text-sm font-mono font-bold text-purple-200">
                    <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>{language === 'ar' ? 'سجّل حساباً لمواصلة التعلم وحفظ نتائجك!' : language === 'fr' ? 'Inscrivez-vous pour continuer à apprendre !' : 'Sign Up to Keep Learning & Save Results!'}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {language === 'ar'
                      ? `لقد أكملت اختبار الحصة التجريبية بنتيجة ${lastAttemptResult.score}%! أنشئ حسابك الآن لفتح باقي حصص الدورة، وحفظ شارات الإنجاز والشهادات في ملفك الشخصي.`
                      : language === 'fr'
                      ? `Vous avez terminé ce quiz d'essai avec un score de ${lastAttemptResult.score}% ! Créez votre compte pour débloquer toutes les sessions et obtenir votre certificat.`
                      : `You completed this trial quiz with a ${lastAttemptResult.score}% score! Create an account now to unlock all remaining sessions, track your progress, and earn certificates.`}
                  </p>
                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <Link
                      to="/login?signup=true"
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold rounded-xl uppercase tracking-wider shadow-xl shadow-purple-600/40 hover:scale-[1.02] transition-all flex items-center gap-2"
                    >
                      <Trophy className="w-4 h-4 text-amber-300" />
                      <span>{language === 'ar' ? 'إنشاء حساب لمواصلة التعلم' : language === 'fr' ? 'S\'inscrire pour Continuer' : 'Sign Up to Keep Learning'}</span>
                    </Link>
                    <Link
                      to="/login"
                      className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-purple-800/40 font-mono text-xs font-bold rounded-xl transition-all"
                    >
                      {language === 'ar' ? 'تسجيل الدخول' : language === 'fr' ? 'Se Connecter' : 'Log In'}
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-purple-900/10">
              <Link
                to={`/courses/${courseId}/video/${sessionId}/session`}
                className="px-5 py-3 border border-purple-900/20 rounded-xl font-mono text-xs hover:border-purple-500 hover:text-purple-300 transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Exit to Session Video
              </Link>
              {!lastAttemptResult.passed && attempts.length < 3 && (
                <button
                  onClick={handleRetake}
                  className="px-5 py-3 bg-purple-600 text-white rounded-xl font-mono text-xs font-bold hover:bg-purple-550 transition-colors flex items-center gap-1.5 shadow-md shadow-purple-500/20"
                >
                  <RotateCcw className="w-4 h-4" /> Start Attempt #{attempts.length + 1} / 3
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ================= 3. ACTIVE ALL QUESTIONS SCROLLING LIST ================= */
          <div className="space-y-8 max-w-3xl mx-auto">
            {quiz.questions.map((q: any, i: number) => {
              const isAnswered = responses[q.id] !== undefined;
              return (
                <div 
                  key={q.id} 
                  id={`q-card-${q.id}`}
                  className={`bg-zinc-950/40 backdrop-blur-md border rounded-2xl overflow-hidden transition-all duration-300 ${
                    isAnswered 
                      ? "border-purple-950 shadow-[0_4px_24px_rgba(158,58,235,0.05)]" 
                      : "border-purple-900/10 hover:border-purple-900/30"
                  }`}
                >
                  
                  {/* Card Header */}
                  <div className="bg-purple-950/10 px-6 py-3 border-b border-purple-900/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                        Q{String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase bg-zinc-950 px-2 py-0.5 rounded border border-purple-900/10">
                        {q.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {isAnswered ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#4ade80]">
                          <Check className="w-3 h-3" /> ANSWERED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500 italic">PENDING ANSWER</span>
                      )}
                      
                      {/* Q10 Timed Countdown */}
                      {q.type === "timed_mcq" && timedCount !== null && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#ffc24b] bg-[#ffc24b]/10 px-2 py-0.5 rounded border border-[#ffc24b]/20">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>00:{String(timedCount).padStart(2, '0')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 sm:p-8 space-y-6">
                    {(() => {
                      let isTimerStarted = true;
                      const timedIdx = quiz.questions.findIndex((tQ: any) => tQ.id === q.id);
                      if (q.type === "timed_mcq" && timedIdx > 0) {
                        const prevQuestion = quiz.questions[timedIdx - 1];
                        isTimerStarted = responses[prevQuestion.id] !== undefined;
                      }

                      if (q.type === "timed_mcq" && !isTimerStarted) {
                        return (
                          <div className="flex flex-col items-center justify-center py-6 text-center bg-zinc-950/40 border border-dashed border-purple-900/20 rounded-2xl p-6">
                            <Lock className="w-8 h-8 text-purple-400 mb-3 animate-pulse" />
                            <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-1">Timed Sprint Locked</h4>
                            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                              Finish answering Question {timedIdx} to trigger the countdown timer and unlock this high-speed challenge!
                            </p>
                          </div>
                        );
                      }

                      if (q.type === "timed_mcq" && isTimerStarted && !revealedTimedQuestions[q.id]) {
                        const countVal = prepCountdownVal[q.id] !== undefined ? prepCountdownVal[q.id] : 5;
                        const radius = 36;
                        const strokeWidth = 5;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDashoffset = circumference * (1 - countVal / 5);

                        return (
                          <div className="flex flex-col items-center justify-center py-10 text-center bg-[#0d0d12]/30 border border-purple-900/10 rounded-2xl p-6">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                              <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 80 80">
                                <circle
                                  cx="40"
                                  cy="40"
                                  r={radius}
                                  className="stroke-purple-950/50 fill-transparent"
                                  strokeWidth={strokeWidth}
                                />
                                <circle
                                  cx="40"
                                  cy="40"
                                  r={radius}
                                  className="stroke-purple-500 fill-transparent transition-all duration-1000 ease-linear"
                                  strokeWidth={strokeWidth}
                                  strokeDasharray={circumference}
                                  strokeDashoffset={strokeDashoffset}
                                />
                              </svg>
                              <div className="text-3xl font-mono font-black text-white z-10 animate-pulse">
                                {countVal}
                              </div>
                            </div>
                            <p className="text-sm font-mono tracking-widest text-purple-400 uppercase font-black mt-4 animate-pulse">
                              Get Ready to Answer
                            </p>
                            <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                              The timed sprint question will reveal in {countVal} seconds!
                            </p>
                          </div>
                        );
                      }

                      return (
                        <>
                          <p dir={hasArabic(q.prompt) ? "rtl" : "ltr"} className={`text-base sm:text-lg font-bold leading-relaxed text-zinc-100 ${hasArabic(q.prompt) ? "text-right" : "text-left"}`}>{q.prompt}</p>

                          {/* ================= TYPE 1: MCQ & TIMED MCQ ================= */}
                          {(q.type === "mcq" || q.type === "timed_mcq") && (
                            <div className="grid grid-cols-1 gap-3">
                              {q.options?.map((o: any, idx: number) => {
                                const letter = String.fromCharCode(65 + idx);
                                const isSelected = tempResponses[q.id] === o.id;
                                return (
                                  <button
                                    key={o.id}
                                    disabled={isAnswered || responses[q.id] === "EXPIRED"}
                                    onClick={() => handleAnswerSelect(q.id, o.id)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                                      isSelected 
                                        ? "bg-purple-500/5 border-purple-500 shadow-lg shadow-purple-500/5 text-white" 
                                        : "bg-zinc-950/60 border-purple-900/10 hover:border-purple-900/30 text-zinc-300 hover:text-white"
                                    } disabled:opacity-50`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold border shrink-0 ${
                                      isSelected 
                                        ? "bg-purple-600 text-white border-purple-500" 
                                        : "bg-zinc-950 text-zinc-400 border-purple-900/20"
                                    }`}>
                                      {letter}
                                    </div>
                                    <span dir={hasArabic(o.text) ? "rtl" : "ltr"} className={`text-sm font-semibold flex-1 ${hasArabic(o.text) ? "text-right" : "text-left"}`}>{o.text}</span>
                                  </button>
                                );
                              })}
                              {responses[q.id] === "EXPIRED" && (
                                <p className="text-xs text-[#ff5c5c] font-mono italic">Time limit expired for this sprint! Locked in with no choice.</p>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* ================= TYPE 2: DIRECT ANSWER ================= */}
                    {q.type === "direct" && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          dir="auto"
                          disabled={isAnswered}
                          className="w-full bg-zinc-950/60 border border-purple-900/20 rounded-xl p-4 font-sans text-sm tracking-wide text-white outline-none focus:border-purple-500 placeholder-zinc-600 disabled:opacity-50"
                          placeholder="Type keyboard shortcuts or terms precisely..."
                          value={tempResponses[q.id] || ""}
                          onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                        />
                        <p className="text-[10px] text-zinc-500 font-mono">Case-insensitive. For complex keys, use standard notation (e.g. Shift+Delete).</p>
                      </div>
                    )}

                    {/* ================= TYPE 3: TRUE / FALSE ================= */}
                    {q.type === "truefalse" && (
                      <div className="space-y-4">
                        <div dir={hasArabic(q.trueFalseStatement) ? "rtl" : "ltr"} className={`p-4 bg-zinc-950/80 border border-purple-900/20 rounded-2xl font-sans text-xs sm:text-sm leading-relaxed text-zinc-400 ${hasArabic(q.trueFalseStatement) ? "text-right" : "text-left"}`}>
                          {q.trueFalseStatement}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            disabled={isAnswered}
                            onClick={() => handleAnswerSelect(q.id, true)}
                            className={`py-3.5 rounded-xl border text-xs sm:text-sm font-mono font-bold tracking-wider transition-all cursor-pointer ${
                              tempResponses[q.id] === true
                                ? "bg-[#4ade80]/10 border-[#4ade80] text-[#4ade80]"
                                : "bg-zinc-950/60 border-purple-900/20 hover:border-purple-900/30 text-zinc-400"
                            } disabled:opacity-50`}
                          >
                            TRUE CUT
                          </button>
                          <button
                            disabled={isAnswered}
                            onClick={() => handleAnswerSelect(q.id, false)}
                            className={`py-3.5 rounded-xl border text-xs sm:text-sm font-mono font-bold tracking-wider transition-all cursor-pointer ${
                              tempResponses[q.id] === false
                                ? "bg-[#ff5c5c]/10 border-[#ff5c5c] text-[#ff5c5c]"
                                : "bg-zinc-950/60 border-purple-900/20 hover:border-purple-900/30 text-zinc-400"
                            } disabled:opacity-50`}
                          >
                            FALSE CUT
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ================= TYPE 4: FILL THE GAP ================= */}
                    {q.type === "fillgap" && (
                      <div className="p-6 bg-zinc-950/40 border border-purple-900/20 rounded-2xl space-y-4">
                        <div dir={hasArabic(q.gapTemplate) ? "rtl" : "ltr"} className={`text-sm sm:text-base leading-loose font-sans text-zinc-200 ${hasArabic(q.gapTemplate) ? "text-right" : "text-left"}`}>
                          {q.gapTemplate.split("___")[0]}
                          <input
                            type="text"
                            dir="auto"
                            disabled={isAnswered}
                            className="inline-block bg-zinc-950/60 border-b-2 border-purple-500 rounded-t px-3 py-1 font-mono text-purple-300 outline-none focus:bg-zinc-900 w-36 text-center text-sm disabled:opacity-50 mx-2"
                            placeholder="_____"
                            value={tempResponses[q.id] || ""}
                            onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                          />
                          {q.gapTemplate.split("___")[1]}
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono">Fill in the blank with the exact technical term.</p>
                      </div>
                    )}

                    {/* ================= TYPE 5: MEDIA MCQ ================= */}
                    {q.type === "media_mcq" && (
                      <div className="space-y-6">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-purple-900/20 bg-black">
                          <iframe
                            src={q.mediaUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {q.options?.map((o: any, idx: number) => {
                            const letter = String.fromCharCode(65 + idx);
                            const isSelected = tempResponses[q.id] === o.id;
                            return (
                              <button
                                key={o.id}
                                disabled={isAnswered}
                                onClick={() => handleAnswerSelect(q.id, o.id)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                                  isSelected 
                                    ? "bg-purple-500/5 border-purple-500 text-white" 
                                    : "bg-zinc-950/60 border-purple-900/10 hover:border-purple-900/30 text-zinc-300"
                                } disabled:opacity-50`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold border shrink-0 ${
                                  isSelected 
                                    ? "bg-purple-600 text-white border-purple-500" 
                                    : "bg-zinc-950 text-zinc-400 border-purple-900/20"
                                }`}>
                                  {letter}
                                </div>
                                <span dir={hasArabic(o.text) ? "rtl" : "ltr"} className={`text-sm font-semibold flex-1 ${hasArabic(o.text) ? "text-right" : "text-left"}`}>{o.text}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ================= TYPE 6: SPOT THE DIFFERENCE ================= */}
                    {q.type === "spot_diff" && (
                      <div className="space-y-6">
                        {q.spotDiffVideosCount === 2 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                {language === 'ar' ? 'الفيديو أ — المرجع' : language === 'fr' ? 'Clip A — Référence' : 'Clip A — Reference'}
                              </div>
                              <div className="relative aspect-video rounded-xl overflow-hidden border border-purple-900/10 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center font-mono text-xs text-zinc-500">
                                {q.diffMediaUrl ? (
                                  <iframe
                                    src={q.diffMediaUrl}
                                    className="absolute inset-0 w-full h-full border-0"
                                    allowFullScreen
                                  />
                                ) : (
                                  <span>{language === 'ar' ? 'فيديو المرجع غير متوفر' : language === 'fr' ? 'Aucun clip de référence fourni' : 'No reference video provided'}</span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                {language === 'ar' ? 'الفيديو ب — الفروقات المعدلة' : language === 'fr' ? 'Clip B — Différences modifiées' : 'Clip B — Edited differences'}
                              </div>
                              <div className="relative aspect-video rounded-xl overflow-hidden border border-purple-900/10 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                                {q.diffSecondMediaUrl || q.diffMediaUrl ? (
                                  <iframe
                                    src={q.diffSecondMediaUrl || q.diffMediaUrl}
                                    className="absolute inset-0 w-full h-full border-0"
                                    allowFullScreen
                                  />
                                ) : (
                                  <span className="text-zinc-500 font-mono text-xs">{language === 'ar' ? 'فيديو الفروقات غير متوفر' : language === 'fr' ? 'Aucun clip de différence fourni' : 'No difference video provided'}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                              {language === 'ar' ? 'فيديو تحديد الفروقات' : language === 'fr' ? 'Clip vidéo de détection de différence' : 'Spot the Difference Video Clip'}
                            </div>
                            <div className="relative max-w-2xl mx-auto aspect-video rounded-xl overflow-hidden border border-purple-900/10 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                              {q.diffMediaUrl ? (
                                <iframe
                                  src={q.diffMediaUrl}
                                  className="absolute inset-0 w-full h-full border-0"
                                  allowFullScreen
                                />
                              ) : (
                                <span className="text-zinc-500 font-mono text-xs">{language === 'ar' ? 'الفيديو غير متوفر' : language === 'fr' ? 'Aucune vidéo fournie' : 'No video provided'}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2 max-w-md mx-auto pt-2">
                          <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                            {language === 'ar' ? 'تحديد ثانية فارق التوقيت الزمني' : language === 'fr' ? 'Repère de seconde de la différence' : 'Spotted Difference Timecode Second'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            disabled={isAnswered}
                            className="w-full bg-zinc-950/60 border border-purple-900/20 rounded-xl p-4 font-mono text-sm text-white outline-none focus:border-purple-500 disabled:opacity-50"
                            placeholder={language === 'ar' ? 'أدخل ثانية الطابع الزمني (مثال: 12)...' : language === 'fr' ? 'Saisissez la seconde du repère (ex: 12)...' : 'Enter the timestamp second (e.g. 12)...'}
                            value={tempResponses[q.id] || ""}
                            onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                          />
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {language === 'ar' ? 'شاهد بعناية وأدخل علامة الثانية المنقضية التقريبية للفرق.' : language === 'fr' ? 'Regardez attentivement et saisissez la seconde approximative de l\'écart.' : 'Watch carefully and input the approximate elapsed second mark.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ================= TYPE 7: SLIDER COMPARE ================= */}
                    {q.type === "slider_compare" && (
                      <div className="space-y-6">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-purple-900/20 bg-zinc-950">
                          <img
                            src={q.sliderMediaA}
                            className="absolute inset-0 w-full h-full object-cover"
                            alt="Slider A"
                            referrerPolicy="no-referrer"
                          />
                          <div
                            className="absolute inset-0 overflow-hidden"
                            style={{ clipPath: `inset(0 0 0 ${sliderVal}%)` }}
                          >
                            <img
                              src={q.sliderMediaB}
                              className="absolute inset-0 w-full h-full object-cover"
                              alt="Slider B"
                              referrerPolicy="no-referrer"
                            />
                            <span className="absolute top-4 right-4 bg-zinc-950/70 border border-purple-900/20 font-mono text-[9px] text-purple-400 px-2 py-0.5 rounded">SIDE B</span>
                          </div>
                          
                          <span className="absolute top-4 left-4 bg-zinc-950/70 border border-purple-900/20 font-mono text-[9px] text-zinc-400 px-2 py-0.5 rounded">SIDE A</span>

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
                            disabled={isAnswered}
                            onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
                            className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-50"
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              disabled={isAnswered}
                              onClick={() => handleAnswerSelect(q.id, "A")}
                              className={`py-3 rounded-xl border text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer ${
                                tempResponses[q.id] === "A"
                                  ? "bg-purple-500/10 border-purple-500 text-purple-300"
                                  : "bg-zinc-950/60 border-purple-900/10 hover:border-purple-900/30 text-zinc-400"
                              } disabled:opacity-50`}
                            >
                              SIDE A IS TEAL/ORANGE
                            </button>
                            <button
                              disabled={isAnswered}
                              onClick={() => handleAnswerSelect(q.id, "B")}
                              className={`py-3 rounded-xl border text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer ${
                                tempResponses[q.id] === "B"
                                  ? "bg-purple-500/10 border-purple-500 text-purple-300"
                                  : "bg-zinc-950/60 border-purple-900/10 hover:border-purple-900/30 text-zinc-400"
                              } disabled:opacity-50`}
                            >
                              SIDE B IS TEAL/ORANGE
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ================= TYPE 8: DRAG TO REORDER ================= */}
                    {q.type === "sequence" && (
                      <div className="space-y-3" onDragOver={isAnswered ? undefined : handleSequenceDragOver}>
                        {(shuffledSequences[q.id] || []).map((item, idx) => (
                          <div
                            key={idx}
                            draggable={!isAnswered}
                            onDragStart={(e) => handleSequenceDragStart(e, q.id, idx)}
                            onDrop={(e) => handleSequenceDrop(e, q.id, idx)}
                            className={`flex items-center gap-4 bg-zinc-950/60 border border-purple-900/10 rounded-xl p-4 transition-colors ${
                              isAnswered ? "opacity-60 cursor-not-allowed" : "cursor-grab active:cursor-grabbing hover:border-purple-500/30"
                            }`}
                          >
                            <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded shrink-0 border border-purple-500/10">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <div dir={hasArabic(item) ? "rtl" : "ltr"} className={`flex-1 font-sans text-sm font-semibold text-zinc-200 ${hasArabic(item) ? "text-right" : "text-left"}`}>{item}</div>
                            <div className="font-mono text-zinc-600 text-xs tracking-widest shrink-0 select-none">⠿⠿</div>
                          </div>
                        ))}
                        <p className="text-[10px] text-zinc-500 font-mono mt-2">Drag and drop the items to reorder them in logical sequence.</p>
                      </div>
                    )}

                    {/* ================= TYPE 9: MATCH PAIRS ================= */}
                    {q.type === "match" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Left items */}
                          <div className="space-y-3">
                            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Draggable Sound FX</div>
                            {q.matchPairs?.map((pair: any, idx: number) => {
                              const qidMap = matchesMaps[q.id] || {};
                              const isMatched = qidMap[pair.left] !== undefined;
                              return (
                                <div
                                  key={idx}
                                  draggable={!isMatched && !isAnswered}
                                  onDragStart={(e) => handleMatchDragStart(e, q.id, pair.left)}
                                  className={`p-4 border rounded-xl font-sans text-sm font-bold flex items-center justify-between transition-colors ${
                                    isMatched 
                                      ? "bg-zinc-950/20 border-purple-950/10 text-zinc-600 opacity-40 select-none" 
                                      : isAnswered
                                        ? "bg-zinc-950/60 border-purple-900/10 opacity-60 cursor-not-allowed text-zinc-400"
                                        : "bg-zinc-950/60 border-purple-900/10 hover:border-purple-500/30 cursor-grab active:cursor-grabbing text-zinc-200"
                                  }`}
                                >
                                  <span dir={hasArabic(pair.left) ? "rtl" : "ltr"} className={`flex-1 ${hasArabic(pair.left) ? "text-right" : "text-left"}`}>🔊 {pair.left}</span>
                                  {!isMatched && !isAnswered && <span className="font-mono text-xs text-purple-400">DRAG</span>}
                                </div>
                              );
                            })}
                          </div>

                          {/* Right drop targets */}
                          <div className="space-y-3">
                            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Target Editing Actions</div>
                            {q.matchPairs?.map((pair: any, idx: number) => {
                              const qidMap = matchesMaps[q.id] || {};
                              const matchedLeft = Object.keys(qidMap).find(k => qidMap[k] === pair.right);
                              return (
                                <div
                                  key={idx}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={isAnswered ? undefined : () => handleMatchDrop(q.id, pair.right)}
                                  className={`p-4 border rounded-xl flex items-center justify-between text-sm transition-all ${
                                    matchedLeft 
                                      ? "bg-purple-500/5 border-purple-500" 
                                      : "bg-zinc-950/40 border-dashed border-purple-900/20 text-zinc-400"
                                  }`}
                                >
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">ACTION {idx + 1}</span>
                                    <span dir={hasArabic(pair.right) ? "rtl" : "ltr"} className={`font-semibold text-zinc-300 flex-1 ${hasArabic(pair.right) ? "text-right" : "text-left"}`}>{pair.right}</span>
                                  </div>
                                  {matchedLeft ? (
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/10">🔊 {matchedLeft}</span>
                                      {!isAnswered && (
                                        <button
                                          onClick={() => handleMatchClear(q.id, matchedLeft)}
                                          className="text-zinc-500 hover:text-[#ff5c5c] cursor-pointer text-xs"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="font-mono text-[10px] text-zinc-600 italic border border-purple-900/20 border-dashed p-1 rounded select-none">DROP SLOT</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      </div>
                    )}

                    {/* ================= DONE / CONFIRMATION BUTTON ================= */}
                    {(() => {
                      // Check if the timed challenge is locked (unanswered previous question)
                      let isTimerStarted = true;
                      const timedIdx = quiz.questions.findIndex((tQ: any) => tQ.id === q.id);
                      if (q.type === "timed_mcq" && timedIdx > 0) {
                        const prevQuestion = quiz.questions[timedIdx - 1];
                        isTimerStarted = responses[prevQuestion.id] !== undefined;
                      }

                      // If locked or in prep countdown mode, don't show the Done button yet
                      if (q.type === "timed_mcq" && (!isTimerStarted || !revealedTimedQuestions[q.id])) {
                        return null;
                      }

                      const hasInput = tempResponses[q.id] !== undefined && (
                        typeof tempResponses[q.id] === 'string' 
                          ? tempResponses[q.id].trim().length > 0 
                          : typeof tempResponses[q.id] === 'object' 
                            ? Object.keys(tempResponses[q.id]).length > 0 
                            : true
                      );

                      return (
                        <div className="pt-4 border-t border-purple-900/10 flex justify-end items-center">
                          {isAnswered ? (
                            <div className="flex items-center gap-2 text-[#4ade80] font-mono text-xs bg-[#4ade80]/10 px-3 py-1.5 rounded-lg border border-[#4ade80]/20">
                              <Check className="w-4 h-4" /> Locked & Confirmed
                            </div>
                          ) : (
                            <button
                              disabled={!hasInput}
                              onClick={() => handleConfirmAnswer(q.id)}
                              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-purple-500/10"
                            >
                              Done <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })()}

                  </div>

                </div>
              );
            })}

            {/* ================= BOTTOM SUBMIT CONTROLS ================= */}
            <div className="mt-12 bg-zinc-950/40 backdrop-blur-md border border-purple-900/20 rounded-3xl p-8 text-center space-y-6 shadow-xl">
              <h2 className="text-xl font-mono font-bold text-white uppercase tracking-wider">Execute Project Evaluation</h2>
              <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
                Once you have answered all {totalQuestions} analytical questions on the timeline above, compile and evaluate your answers to record your score.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to={`/courses/${courseId}/video/${sessionId}/session`}
                  className="px-6 py-3 border border-purple-900/20 hover:border-purple-500 text-zinc-300 font-mono text-xs font-bold rounded-xl transition-all"
                >
                  ← Resume Lecture
                </Link>
                
                <button
                  disabled={submittingAttempt || answeredCount < totalQuestions}
                  onClick={handleQuizSubmit}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-400 text-white font-mono text-xs font-black rounded-xl hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/20"
                >
                  {submittingAttempt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Evaluate All Answers
                </button>
              </div>

              {answeredCount < totalQuestions && (
                <p className="text-[11px] font-mono text-[#ffc24b] animate-pulse">
                  * You have completed {answeredCount} out of {totalQuestions} questions. Fill in all remaining answers to unlock evaluation!
                </p>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
