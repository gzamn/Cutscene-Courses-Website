import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Clock, BarChart, ArrowRight, Search, CheckCircle2, User } from 'lucide-react';
import { COURSES } from '../types';
import { useLanguage } from '../context/LanguageContext';

export default function Courses() {
  const { t, language } = useLanguage();
  
  return (
    <div className="min-h-screen bg-black pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('courses.title')}</h1>
          <p className="text-gray-400 text-lg">{t('courses.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-12">
          {COURSES.map((course, i) => (
            <motion.div 
              key={course.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row group"
            >
              <Link to={`/courses/${course.id}`} className="lg:w-2/5 relative min-h-[300px] overflow-hidden">
                <img 
                  src={course.image} 
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:bg-gradient-to-r" />
                <div className="absolute top-6 left-6 flex flex-col gap-2">
                  <span className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                    {course.level}
                  </span>
                  <span className="px-4 py-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-bold rounded-full flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" /> {course.duration}
                  </span>
                </div>
              </Link>
              
              <div className="p-8 lg:p-12 flex-1 flex flex-col">
                <Link to={`/courses/${course.id}`} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 group/title">
                  <h3 className="text-3xl md:text-4xl font-bold text-white group-hover/title:text-purple-400 transition-colors">
                    {course.title}
                  </h3>
                  <div className="text-3xl font-black text-purple-500 whitespace-nowrap">
                    {course.price.toLocaleString()} {course.currency}
                  </div>
                </Link>

                <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                  {course.detailedDescription}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  {/* requirements */}
                  <div>
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-500" />
                      {t('course.requirements')}
                    </h4>
                    <ul className="space-y-2">
                      {course.requirements.map((pre, idx) => (
                        <li key={idx} className="text-gray-400 text-sm flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-900 mt-1.5 shrink-0" />
                          {pre}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructor */}
                  <div className="bg-purple-900/10 border border-purple-500/10 rounded-2xl p-6">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-500" />
                      {t('course.instructor')}
                    </h4>
                    <div className="flex items-center gap-4 mb-3">
                      <img 
                        src={course.instructor.avatar} 
                        alt={course.instructor.name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-purple-600"
                        referrerPolicy="no-referrer"
                      />
                      <div className="font-bold text-white">{course.instructor.name}</div>
                    </div>
                    <p className="text-gray-400 text-sm italic leading-relaxed">
                      "{course.instructor.bio}"
                    </p>
                  </div>
                </div>
                
                <div className="mt-auto pt-8 border-t border-purple-900/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-gray-400">
                      <BarChart className="w-5 h-5 text-purple-500" />
                      <span className="font-medium">{course.level} {t('course.level')}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Link 
                      to={`/courses/${course.id}`}
                      className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-purple-900/30"
                    >
                      {t('courses.details')}
                    </Link>
                    <Link 
                      to={`/payment?courseId=${course.id}`}
                      className="w-full sm:w-auto px-10 py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-purple-600/20"
                    >
                      {t('courses.getStarted')}
                      <ArrowRight className={`w-5 h-5 group-hover/btn:translate-x-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
