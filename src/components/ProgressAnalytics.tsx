import React, { useState } from 'react';
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
import { BarChart3, PieChart as PieIcon, Layers, BookOpen, CheckCircle, HelpCircle } from 'lucide-react';

interface ProgressAnalyticsProps {
  enrollments: any[];
  progress: any[];
  courses: any[];
  chaptersCountMap: { [courseId: string]: number };
}

export default function ProgressAnalytics({ 
  enrollments, 
  progress, 
  courses, 
  chaptersCountMap 
}: ProgressAnalyticsProps) {
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
      if (currentCourse.chapters && currentCourse.chapters.length > 0) {
        currentCourse.chapters.forEach((ch: any) => {
          let chSessionsCount = 0;
          if (Array.isArray(ch.sessions)) {
            chSessionsCount = ch.sessions.filter((s: any) => s.url).length;
          } else {
            chSessionsCount = [
              ch.session_url_1,
              ch.session_url_2,
              ch.session_url_3,
              ch.session_url_4
            ].filter(Boolean).length;
          }
          totalSessionsCount += chSessionsCount;
        });
      } else {
        totalSessionsCount = 12; // Fallback
      }
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
                  const fillGrad = index === 0 ? "url(#purpleGrad)" : index === 1 ? "url(#pinkGrad)" : "url(#amberGrad)";
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

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 pt-2 font-medium">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Sessions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Homeworks</span>
          </div>
        </div>
        <p className="italic">Data synchronized with Firestore cloud progress ledger</p>
      </div>
    </motion.section>
  );
}
