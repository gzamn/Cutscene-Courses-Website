import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Star, Users, BookOpen, ShieldCheck, Clock } from 'lucide-react';
import { COURSES } from '../types';

export default function Home() {
  return (
    <div className="bg-black text-white">
      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wider text-purple-400 uppercase bg-purple-900/30 rounded-full border border-purple-500/30">
              Innovate, Create, Elevate
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-tight">
              حاب تتعلم <span className="text-purple-500">مونتاج</span>؟ <br />
              حلك عند <span className="text-purple-500">Cutscene</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Join our growing community of over 330 students and transform your career with our premium, 
              hands-on curriculum designed for the modern world.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/courses" 
                className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2 group"
              >
                Explore Courses
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-bold text-lg border border-purple-900/30 transition-all">
                Our Students Work
              </button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 py-12 border-y border-purple-900/20"
          >
            {[
              { label: 'Students', value: '330+', icon: Users },
              { label: 'Courses', value: '3+', icon: BookOpen },
              { label: 'Free Workshops', value: '40+', icon: Star },
              { label: 'Certified', value: '100%', icon: ShieldCheck },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center mb-3">
                  <stat.icon className="w-6 h-6 text-purple-500" />
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-gray-500 text-sm uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Courses Preview */}
      <section className="py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Courses</h2>
              <p className="text-gray-400">You portal to make a change.</p>
            </div>
            <Link to="/courses" className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1">
              See all courses <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {COURSES.map((course) => (
              <motion.div 
                key={course.id}
                whileHover={{ y: -10 }}
                className="bg-black border border-purple-900/20 rounded-2xl overflow-hidden group"
              >
                <Link to={`/courses/${course.id}`} className="relative h-48 overflow-hidden block">
                  <img 
                    src={course.image} 
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                      {course.level}
                    </span>
                    <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-bold rounded-full flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-purple-400" /> {course.duration}
                    </span>
                  </div>
                </Link>
                <div className="p-6">
                  <Link to={`/courses/${course.id}`}>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">{course.title}</h3>
                  </Link>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">{course.price.toLocaleString()} {course.currency}</span>
                    <div className="flex gap-2">
                      <Link 
                        to={`/courses/${course.id}`}
                        className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-purple-900/30 rounded-lg transition-all text-xs font-bold"
                      >
                        Details
                      </Link>
                      <Link 
                        to={`/payment?courseId=${course.id}`}
                        className="px-4 py-2 bg-purple-900/30 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/30 rounded-lg transition-all text-sm font-bold"
                      >
                        Get Started
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
