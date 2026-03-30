import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { COURSES } from '../types';
import { Clock, BarChart, ArrowLeft, CheckCircle2, Star, User, ShieldCheck, BookOpen, Users } from 'lucide-react';

const FEEDBACK = [
  { id: 1, name: 'Ahmed', rating: 5, comment: 'Best course ever! Learned so much about cutting and transitions.' },
  { id: 2, name: 'Sara', rating: 4, comment: 'Very clear instructions. The instructor is great.' },
  { id: 3, name: 'Mohamed', rating: 5, comment: 'Highly recommended for anyone starting with video editing.' },
  { id: 4, name: 'Layla', rating: 5, comment: 'The hands-on projects were really helpful.' },
  { id: 5, name: 'Yassine', rating: 4, comment: 'Great value for money. I feel much more confident now.' },
  { id: 6, name: 'Karim', rating: 5, comment: 'Amazing content, very professional editing tips!' },
  { id: 7, name: 'Amira', rating: 5, comment: 'I started from zero and now I can edit my own vlogs.' },
];

export default function CourseDetail() {
  const { id } = useParams();
  const course = COURSES.find(c => c.id === id);

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Course Not Found</h1>
          <Link to="/courses" className="text-purple-500 hover:underline">Back to Courses</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/courses" className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to courses
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">{course.title}</h1>
              <div className="flex flex-wrap gap-4 mb-8">
                <span className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                  {course.level}
                </span>
                <span className="px-4 py-1.5 bg-zinc-900 text-gray-300 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" /> {course.duration}
                </span>
                <span className="px-4 py-1.5 bg-zinc-900 text-gray-300 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <BarChart className="w-3.5 h-3.5 text-purple-400" /> {course.level} Level
                </span>
              </div>
              <img 
                src={course.image} 
                alt={course.title} 
                className="w-full aspect-video object-cover rounded-[2.5rem] border border-purple-900/20 mb-8"
                referrerPolicy="no-referrer"
              />
              <p className="text-xl text-gray-300 leading-relaxed mb-8">
                {course.detailedDescription}
              </p>
            </motion.div>

            {/* Prerequisites */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-purple-500" />
                Prerequisites
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {course.prerequisites.map((pre, idx) => (
                  <li key={idx} className="bg-zinc-950 border border-purple-900/10 p-4 rounded-2xl text-gray-400 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-600 mt-2 shrink-0" />
                    {pre}
                  </li>
                ))}
              </ul>
            </section>

            {/* Instructor */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8 md:p-12">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                <img 
                  src={course.instructor.avatar} 
                  alt={course.instructor.name} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-purple-600"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="text-2xl font-bold mb-2">Instructor: {course.instructor.name}</h3>
                  <p className="text-gray-400 leading-relaxed italic">
                    "{course.instructor.bio}"
                  </p>
                </div>
              </div>
            </section>

            {/* Student Feedback Section */}
            <section className="overflow-hidden py-12">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-500" />
                  Student Feedback
                </h2>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="text-white font-bold">4.9/5</span>
                  <span className="text-gray-500 text-sm ml-1">(120+ reviews)</span>
                </div>
              </div>

              {/* Marquee Animation */}
              <div className="relative flex overflow-x-hidden">
                <motion.div
                  className="flex gap-6 py-4"
                  animate={{
                    x: [0, -1000],
                  }}
                  transition={{
                    x: {
                      repeat: Infinity,
                      repeatType: "loop",
                      duration: 30,
                      ease: "linear",
                    },
                  }}
                >
                  {[...FEEDBACK, ...FEEDBACK].map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex-shrink-0 w-80 bg-zinc-950 border border-purple-900/20 p-6 rounded-3xl space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">{item.name}</span>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < item.rating ? 'text-yellow-500 fill-current' : 'text-gray-700'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm italic leading-relaxed">
                        "{item.comment}"
                      </p>
                    </div>
                  ))}
                </motion.div>
              </div>
            </section>
          </div>

          {/* Sidebar - Enrollment */}
          <div className="space-y-6">
            <div className="bg-zinc-950 border border-purple-900/30 rounded-[2.5rem] p-8 sticky top-40">
              <div className="text-4xl font-black text-white mb-6">
                {course.price.toLocaleString()} {course.currency}
              </div>
              
              <Link 
                to={`/payment?courseId=${course.id}`}
                className="block w-full py-4 bg-purple-600 hover:bg-purple-500 text-white text-center rounded-2xl font-bold text-lg transition-all shadow-lg shadow-purple-600/20 mb-6"
              >
                Enroll Now
              </Link>

              <div className="space-y-4">
                <h4 className="text-white font-semibold text-sm">Course includes:</h4>
                {[
                  { icon: Clock, text: course.duration + ' of content' },
                  { icon: BookOpen, text: 'Hands-on projects' },
                  { icon: ShieldCheck, text: 'Certificate of completion' },
                  { icon: Users, text: 'Community access' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-400 text-sm">
                    <item.icon className="w-4 h-4 text-purple-500" />
                    {item.text}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-purple-900/20">
                <p className="text-gray-500 text-xs text-center">
                  Secure payment powered by Stripe. 
                  30-day money back guarantee.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
