import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Layers, BookOpen, CheckCircle, HelpCircle, Flame, Clock, TrendingUp, Award, Activity, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ProgressAnalyticsProps {
  enrollments: any[];
  progress: any[];
  courses: any[];
  chaptersCountMap: { [courseId: string]: number };
  quizzes?: any[];
  quizAttempts?: any[];
  streak?: number;
}

export default function ProgressAnalytics({ 
  enrollments, 
  progress, 
  courses, 
  chaptersCountMap,
  quizzes = [],
  quizAttempts = [],
  streak = 0
}: ProgressAnalyticsProps) {
  const { t } = useLanguage();

  // Helper to convert ISO string to 'YYYY-MM-DD' in local timezone
  const getLocalDateString = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return null;
    }
  };
  // Filter for valid approved/paid enrollments
  const activeEnrollments = enrollments.filter(e => e.paid || e.status === 'approved');
  
  const enrolledCourses = activeEnrollments
    .map(e => courses.find(c => c.id === e.courseId))
    .filter(Boolean);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    enrolledCourses[0]?.id || ''
  );

  const [chartType, setChartType] = useState<'modules' | 'sessions'>('modules');

  if (enrolledCourses.length === 0) {
    return null;
  }

  // Update selected course if the current one is no longer valid
  const currentCourse = enrolledCourses.find(c => c.id === selectedCourseId) || enrolledCourses[0];
  const courseId = currentCourse?.id;

  // Determine course-specific layouts
  const isVideoEditing = currentCourse && (
    currentCourse.id === '1' ||
    currentCourse.title?.toLowerCase().includes('video editing') ||
    currentCourse.title?.toLowerCase().includes('video-editing') ||
    currentCourse.title?.toLowerCase().includes('مونتاج') ||
    currentCourse.title?.toLowerCase().includes('cinematic')
  );

  let totalSessionsCount = 0;
  let totalHomeworksCount = 0;

  if (currentCourse) {
    if (isVideoEditing) {
      totalSessionsCount = 9; // EXACTLY 9 sessions as requested by user
      totalHomeworksCount = 0; // No homeworks for video editing courses
    } else {
      const numChapters = currentCourse.chapters && currentCourse.chapters.length > 0
        ? currentCourse.chapters.length
        : (currentCourse.id === '1' ? 12 : currentCourse.id === '2' ? 18 : currentCourse.id === '4' ? 12 : 24);
      totalSessionsCount = numChapters;
      totalHomeworksCount = numChapters;
    }
  }

  // Fetch the actual completed counts
  const completedSessionsCount = progress.filter(p => 
    p.courseId === courseId && 
    (p.type === 'session' || p.type?.startsWith('session_')) && 
    p.completed
  ).length;

  const completedHomeworksCount = progress.filter(p => 
    p.courseId === courseId && 
    p.type === 'homework' && 
    p.completed
  ).length;

  const sessionsCompleted = Math.min(totalSessionsCount, completedSessionsCount);
  const homeworksCompleted = Math.min(totalHomeworksCount, completedHomeworksCount);

  const sessionPercent = totalSessionsCount > 0 ? Math.round((sessionsCompleted / totalSessionsCount) * 100) : 0;
  const homeworkPercent = totalHomeworksCount > 0 ? Math.round((homeworksCompleted / totalHomeworksCount) * 100) : 0;

  // Course specific quizzes
  const courseQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      if (courseId === '1') {
        return q.status === 'published' && q.sessionId >= 1 && q.sessionId <= 9;
      }
      return q.courseId === courseId && q.status === 'published';
    });
  }, [quizzes, courseId]);

  // Quiz attempts for the current course's quizzes
  const courseQuizAttempts = useMemo(() => {
    return quizAttempts.filter(attempt => 
      courseQuizzes.some(q => q.id === attempt.quizId)
    );
  }, [quizAttempts, courseQuizzes]);

  const passedQuizzesCount = useMemo(() => {
    return courseQuizzes.filter(q => 
      quizAttempts.some(attempt => attempt.quizId === q.id && attempt.passed)
    ).length;
  }, [courseQuizzes, quizAttempts]);

  const quizClearedPercent = courseQuizzes.length > 0
    ? Math.round((passedQuizzesCount / courseQuizzes.length) * 100)
    : 0;

  const averageQuizScore = useMemo(() => {
    return courseQuizAttempts.length > 0
      ? Math.round(courseQuizAttempts.reduce((sum, att) => sum + (att.score || 0), 0) / courseQuizAttempts.length)
      : 0;
  }, [courseQuizAttempts]);

  // Compute past 7 days of learning history (video completions or quiz attempts)
  const last7DaysActivity = useMemo(() => {
    const activity = [];
    const studyDates = new Set<string>();
    progress.forEach((p: any) => {
      if (p.completed && p.updatedAt) {
        const dStr = getLocalDateString(p.updatedAt);
        if (dStr) studyDates.add(dStr);
      }
    });
    quizAttempts.forEach((q: any) => {
      if (q.submittedAt) {
        const dStr = getLocalDateString(q.submittedAt);
        if (dStr) studyDates.add(dStr);
      }
    });

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayLabelsFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = getLocalDateString(d.toISOString());
      const dayOfWeek = d.getDay();
      const isToday = i === 0;

      let label = dayLabels[dayOfWeek];
      activity.push({
        dateStr: dStr,
        dayLabel: label,
        dayNumber: d.getDate(),
        completed: dStr ? studyDates.has(dStr) : false,
        isToday,
      });
    }
    return activity;
  }, [progress, quizAttempts]);

  // Data for Module Type chart
  const moduleData = [];
  if (totalSessionsCount > 0) {
    moduleData.push({
      name: 'Theory sessions',
      completed: sessionsCompleted,
      total: totalSessionsCount,
      percentage: sessionPercent,
      color: '#8b5cf6', // Purple
    });
  }
  if (totalHomeworksCount > 0) {
    moduleData.push({
      name: 'Homework Submissions',
      completed: homeworksCompleted,
      total: totalHomeworksCount,
      percentage: homeworkPercent,
      color: '#f59e0b', // Amber
    });
  }
  if (courseQuizzes.length > 0) {
    moduleData.push({
      name: 'Quizzes Cleared',
      completed: passedQuizzesCount,
      total: courseQuizzes.length,
      percentage: quizClearedPercent,
      color: '#ec4899', // Pink
    });
  }

  // Data for Session progress
  const chapterData = Array.from({ length: totalSessionsCount }).map((_, idx) => {
    const sessionNum = idx + 1;
    const sessionCompleted = progress.some(p => p.courseId === courseId && p.chapter === sessionNum && p.type === 'session' && p.completed);
    const homeworkCompleted = totalHomeworksCount > 0
      ? progress.some(p => p.courseId === courseId && p.chapter === sessionNum && p.type === 'homework' && p.completed)
      : true;

    let pct = 0;
    let completedItems = 0;
    if (totalHomeworksCount > 0) {
      completedItems = (sessionCompleted ? 1 : 0) + (homeworkCompleted ? 1 : 0);
      pct = Math.round((completedItems / 2) * 100);
    } else {
      completedItems = sessionCompleted ? 1 : 0;
      pct = sessionCompleted ? 100 : 0;
    }

    return {
      chapter: `Sess ${sessionNum}`,
      name: `Session ${sessionNum}`,
      completedItems,
      percentage: pct,
    };
  });

  // Overall statistics
  const totalItems = totalSessionsCount + totalHomeworksCount;
  const totalCompleted = sessionsCompleted + homeworksCompleted;
  const overallPercent = totalItems > 0 ? Math.min(100, Math.round((totalCompleted / totalItems) * 100)) : 0;

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950/95 border border-purple-900/40 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
          <p className="font-bold text-sm text-white mb-1.5">{label || data.name}</p>
          <div className="space-y-1 text-xs">
            {data.total !== undefined && (
              <p className="text-gray-400">
                Completed: <span className="text-white font-bold">{data.completed}</span> / {data.total}
              </p>
            )}
            {data.completedItems !== undefined && (
              <p className="text-gray-400">
                Completed Modules: <span className="text-white font-bold">{data.completedItems}</span> / {totalHomeworksCount > 0 ? 2 : 1}
              </p>
            )}
            <p className="text-purple-400 font-extrabold text-sm mt-1">
              Progress: {data.percentage}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 space-y-6 shadow-xl"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-900/10 pb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-purple-500" />
          <div>
            <h2 className="text-xl font-bold text-white">Course Progress Analytics</h2>
            <p className="text-xs text-gray-400 mt-0.5">Visualize your completion metrics per course modules</p>
          </div>
        </div>

        {/* Course Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider hidden sm:inline">Course:</span>
          <select 
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold cursor-pointer max-w-[200px] truncate"
          >
            {enrolledCourses.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-purple-950/10 border border-purple-900/20 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Completed / Total</div>
            <div className="text-lg font-black text-white mt-0.5">
              {totalCompleted} <span className="text-xs font-normal text-gray-500">/ {totalItems} items</span>
            </div>
          </div>
        </div>

        <div className="bg-purple-950/10 border border-purple-900/20 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Overall Completion</div>
            <div className="text-lg font-black text-green-400 mt-0.5">
              {overallPercent}%
            </div>
          </div>
        </div>

        <div className="bg-purple-950/10 border border-purple-900/20 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Sessions</div>
            <div className="text-lg font-black text-amber-400 mt-0.5">
              {totalSessionsCount} <span className="text-xs font-normal text-gray-500">Sessions</span>
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex bg-black/40 border border-purple-900/20 p-1 rounded-xl max-w-xs self-start">
        <button
          onClick={() => setChartType('modules')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            chartType === 'modules' 
              ? 'bg-purple-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          By Module Type
        </button>
        <button
          onClick={() => setChartType('sessions')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            chartType === 'sessions' 
              ? 'bg-purple-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          By Session
        </button>
      </div>

      {/* Chart Section */}
      <div className="h-72 w-full bg-black/20 border border-purple-900/10 rounded-3xl p-4 md:p-6">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'modules' ? (
            <BarChart 
              data={moduleData} 
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1b4b/20" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280" 
                fontSize={10} 
                fontWeight="bold"
                tickLine={false} 
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={10} 
                fontWeight="bold"
                domain={[0, 100]} 
                tickFormatter={(val) => `${val}%`}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124, 58, 237, 0.05)' }} />
              <Bar dataKey="percentage" radius={[12, 12, 0, 0]}>
                {moduleData.map((entry, index) => {
                  let fillGrad = "url(#purpleGrad)";
                  if (entry.name.toLowerCase().includes('homework')) {
                    fillGrad = "url(#amberGrad)";
                  } else if (entry.name.toLowerCase().includes('quiz')) {
                    fillGrad = "url(#pinkGrad)";
                  }
                  return <Cell key={`cell-${index}`} fill={fillGrad} stroke={entry.color} strokeWidth={1} />;
                })}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart 
              data={chapterData} 
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1b4b/20" vertical={false} />
              <XAxis 
                dataKey="chapter" 
                stroke="#6b7280" 
                fontSize={10} 
                fontWeight="bold"
                tickLine={false}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={10} 
                fontWeight="bold"
                domain={[0, 100]} 
                tickFormatter={(val) => `${val}%`}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="percentage" 
                stroke="#c084fc" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#areaGrad)" 
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 pt-2 font-medium border-b border-purple-900/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Sessions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Homeworks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
            <span>Quizzes</span>
          </div>
        </div>
        <p className="italic">Data synchronized with Firestore cloud progress ledger</p>
      </div>

      {/* STREAK & QUIZ ANALYTICS BLOCKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Daily Study Streak Tracker */}
        <div className="bg-zinc-950/60 border border-purple-900/15 rounded-3xl p-6 space-y-5 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-orange-500/10 rounded-xl">
                <Flame className={`w-5 h-5 ${streak > 0 ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Daily Study Streak</h3>
                <p className="text-[10px] text-gray-400">Keep up your daily learning momentum</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-orange-950/40 border border-orange-500/20 rounded-full text-xs font-bold text-orange-400 flex items-center gap-1">
              <span>{streak} Day Streak</span>
            </div>
          </div>

          {/* Last 7 Days Circles */}
          <div className="space-y-3">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Weekly Activity (Past 7 Days)</div>
            <div className="flex justify-between items-center bg-black/45 border border-purple-900/10 rounded-2xl p-4 gap-2 overflow-x-auto">
              {last7DaysActivity.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-gray-500 font-bold">{day.dayLabel}</span>
                  <div 
                    className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      day.completed 
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 border-transparent shadow-lg shadow-orange-500/15 text-white' 
                        : day.isToday
                          ? 'bg-zinc-950 border-purple-500/50 text-purple-400'
                          : 'bg-zinc-950 border-purple-900/20 text-gray-600'
                    }`}
                  >
                    {day.completed ? (
                      <CheckCircle className="w-4 h-4 text-white font-bold animate-bounce" />
                    ) : (
                      <span className="text-xs font-bold">{day.dayNumber}</span>
                    )}
                  </div>
                  {day.isToday && <span className="text-[9px] text-purple-400 font-extrabold uppercase tracking-widest">Today</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-400 leading-relaxed italic bg-purple-950/10 border border-purple-900/10 p-3.5 rounded-2xl">
            {streak > 0 
              ? `🔥 Outstanding! You have studied for ${streak} consecutive day${streak === 1 ? '' : 's'}. Complete a new video session or submit a quiz attempt tomorrow to keep this streak burning!`
              : `👋 Start a brand-new study streak today! Simply mark any video lesson as complete or complete a quiz to begin tracking your consecutive days of learning.`
            }
          </div>
        </div>

        {/* Course Quiz Analytics */}
        <div className="bg-zinc-950/60 border border-purple-900/15 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-inner">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-pink-500/10 rounded-xl">
                <Award className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Interactive Quiz Analytics</h3>
                <p className="text-[10px] text-gray-400">Evaluation metrics of your quiz performance</p>
              </div>
            </div>
          </div>

          {courseQuizzes.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center text-gray-500 border border-dashed border-purple-900/15 rounded-2xl bg-black/10">
              <HelpCircle className="w-8 h-8 text-purple-900/40 mb-2" />
              <div className="text-xs font-bold text-gray-400">No quizzes available for this course</div>
              <div className="text-[10px] text-gray-500 mt-1">This course currently has no active published quizzes.</div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col justify-between gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/30 border border-purple-900/10 p-3 rounded-2xl text-center">
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Cleared / Total</div>
                  <div className="text-base font-black text-white mt-1">
                    {passedQuizzesCount} <span className="text-[10px] font-normal text-gray-500">/ {courseQuizzes.length}</span>
                  </div>
                </div>
                <div className="bg-black/30 border border-purple-900/10 p-3 rounded-2xl text-center">
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Success Rate</div>
                  <div className="text-base font-black text-pink-400 mt-1">
                    {quizClearedPercent}%
                  </div>
                </div>
                <div className="bg-black/30 border border-purple-900/10 p-3 rounded-2xl text-center">
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Avg Score</div>
                  <div className="text-base font-black text-amber-400 mt-1">
                    {averageQuizScore}%
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Quiz Performance Records</div>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {courseQuizzes.map((quiz) => {
                    const attemptsForQuiz = courseQuizAttempts.filter(att => att.quizId === quiz.id);
                    const hasPassed = attemptsForQuiz.some(att => att.passed);
                    const highestScore = attemptsForQuiz.length > 0 
                      ? Math.max(...attemptsForQuiz.map(att => att.score || 0)) 
                      : 0;

                    return (
                      <div key={quiz.id} className="bg-black/45 border border-purple-900/10 p-2.5 rounded-xl flex items-center justify-between text-xs gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white truncate text-xs">{quiz.title}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">Session {quiz.sessionId || 1} • {attemptsForQuiz.length} {attemptsForQuiz.length === 1 ? 'attempt' : 'attempts'}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-extrabold text-white text-xs">{attemptsForQuiz.length > 0 ? `${highestScore}%` : '—'}</div>
                            <div className="text-[8px] text-gray-500 font-bold uppercase">High Score</div>
                          </div>
                          <div>
                            {hasPassed ? (
                              <span className="px-2 py-0.5 bg-green-950/50 border border-green-500/20 text-green-400 text-[9px] font-black uppercase rounded-md tracking-wider">Passed</span>
                            ) : attemptsForQuiz.length > 0 ? (
                              <span className="px-2 py-0.5 bg-red-950/50 border border-red-500/20 text-red-400 text-[9px] font-black uppercase rounded-md tracking-wider">Try Again</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 text-[9px] font-black uppercase rounded-md tracking-wider">Unopened</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
