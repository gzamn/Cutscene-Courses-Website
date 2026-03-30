import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clock, BarChart, CheckCircle2, ArrowRight, Play, Star, Users, ShieldCheck, Calendar } from 'lucide-react';
import { COURSES } from '../types';

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const course = COURSES.find(c => c.id === id);

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

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                  {course.level}
                </span>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-bold">4.9 (120+ reviews)</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                {course.title}
              </h1>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                {course.detailedDescription}
              </p>
              
              <div className="flex flex-wrap gap-6 mb-10">
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <BarChart className="w-5 h-5 text-purple-500" />
                  <span>{course.level} Level</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-5 h-5 text-purple-500" />
                  <span>330+ Students</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to={`/payment?courseId=${course.id}`}
                  className="px-10 py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                >
                  Enroll Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button className="px-10 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-bold text-lg transition-all border border-purple-900/30 flex items-center justify-center gap-2">
                  <Play className="w-5 h-5 text-purple-500 fill-current" />
                  Watch Trailer
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative aspect-video rounded-3xl overflow-hidden border border-purple-900/30 shadow-2xl shadow-purple-600/10 group"
            >
              <img 
                src={course.image} 
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center shadow-xl shadow-purple-600/40 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Course Content */}
      <section className="py-20 border-t border-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-16">
              {/* Learning Outcomes */}
              <div>
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-purple-500" />
                  </div>
                  What you'll learn
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.learningOutcomes.map((outcome, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-purple-900/20 rounded-2xl">
                      <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                      <span className="text-gray-300">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* requirements */}
              <div>
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-purple-500" />
                  </div>
                  requirements
                </h2>
                <div className="space-y-4">
                  {course.requirements.map((pre, i) => (
                    <div key={i} className="flex items-center gap-4 text-gray-400">
                      <div className="w-2 h-2 rounded-full bg-purple-600" />
                      <span>{pre}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Instructor Card */}
              <div className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 sticky top-32">
                <h3 className="text-xl font-bold mb-6">Your Instructor</h3>
                <div className="flex items-center gap-4 mb-6">
                  <img 
                    src={course.instructor.avatar} 
                    alt={course.instructor.name} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-600"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="font-bold text-lg">{course.instructor.name}</div>
                    <div className="text-purple-400 text-sm">Professional Editor</div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm italic leading-relaxed mb-8">
                  "{course.instructor.bio}"
                </p>
                
                <div className="space-y-4 pt-8 border-t border-purple-900/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Last Updated
                    </span>
                    <span className="text-gray-300">March 2024</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Students
                    </span>
                    <span className="text-gray-300">330+</span>
                  </div>
                </div>

                <div className="mt-10">
                  <div className="text-3xl font-black text-white mb-6">
                    {course.price.toLocaleString()} {course.currency}
                  </div>
                  <Link 
                    to={`/payment?courseId=${course.id}`}
                    className="w-full py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                  >
                    Enroll Now
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
