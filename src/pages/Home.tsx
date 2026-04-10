import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Star, Users, BookOpen, ShieldCheck, Clock, Play, Video } from 'lucide-react';
import { COURSES } from '../types';
import { useLanguage } from '../context/LanguageContext';

const STUDENT_WORK = [
  {
    courseId: '1',
    courseTitle: 'Basic Video Editing',
    works: [
      { id: 'w1', studentName: 'Ahmed Z.', thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=400&auto=format&fit=crop' },
      { id: 'w2', studentName: 'Sara M.', thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=400&auto=format&fit=crop' },
      { id: 'w3', studentName: 'Karim L.', thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=400&auto=format&fit=crop' },
    ]
  },
  {
    courseId: '2',
    courseTitle: 'Advanced Video Editing',
    works: [
      { id: 'w4', studentName: 'Yassine B.', thumbnail: 'https://images.unsplash.com/photo-1535016120720-40c646bebbfc?q=80&w=400&auto=format&fit=crop' },
      { id: 'w5', studentName: 'Lina K.', thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&auto=format&fit=crop' },
      { id: 'w9', studentName: 'Amir T.', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=400&auto=format&fit=crop' },
    ]
  },
  {
    courseId: '3',
    courseTitle: 'Motion Design',
    works: [
      { id: 'w6', studentName: 'Omar D.', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop' },
      { id: 'w7', studentName: 'Meriem S.', thumbnail: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=400&auto=format&fit=crop' },
      { id: 'w8', studentName: 'Sofiane R.', thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400&auto=format&fit=crop' },
    ]
  }
];

export default function Home() {
  const { t, language } = useLanguage();
  const scrollToStudentsWork = () => {
    const element = document.getElementById('students-work');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-black text-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-7 text-left"
            >
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-12 bg-purple-500/50" />
                <span className="text-micro text-purple-400">
                  {t('hero.badge')}
                </span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter uppercase">
                {language === 'ar' ? (
                  <>
                    حاب تتعلم <br />
                    <span className="text-brand-gradient">مونتاج</span>؟ <br />
                    <span className="opacity-40">Cutscene</span>
                  </>
                ) : (
                  <>
                    {t('hero.title1')} <br />
                    <span className="text-brand-gradient">{t('hero.title2')}</span>? <br />
                    <span className="opacity-40">Cutscene</span>
                  </>
                )}
              </h1>
              
              <p className="text-xl text-gray-400 mb-12 max-w-xl leading-relaxed font-light">
                {t('hero.subtitle')}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Link 
                  to="/courses" 
                  className="w-full sm:w-auto px-10 py-5 bg-brand-radial hover:scale-105 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 group shadow-2xl shadow-purple-600/40"
                >
                  {t('hero.explore')}
                  <ArrowRight className={`w-6 h-6 group-hover:translate-x-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
                </Link>
                <button 
                  onClick={scrollToStudentsWork}
                  className="w-full sm:w-auto px-10 py-5 glass-surface hover:bg-white/10 text-white rounded-2xl font-bold text-lg transition-all"
                >
                  {t('hero.studentsWork')}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="lg:col-span-5 hidden lg:block relative"
            >
              <div className="relative z-10 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-700">
                <img 
                  src="https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=800&auto=format&fit=crop" 
                  alt="Hero"
                  className="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10">
                  <div className="text-micro text-purple-400 mb-2">Featured Work</div>
                  <div className="text-2xl font-black uppercase tracking-tighter">Cinematic Masterclass</div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 border border-purple-500/20 rounded-full animate-spin-slow" />
              <div className="absolute -bottom-10 -left-10 w-60 h-60 border border-purple-900/20 rounded-full" />
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-32 border border-white/5 rounded-[2rem] overflow-hidden glass-surface-dark"
          >
            {[
              { label: t('stats.students'), value: '330+', icon: Users },
              { label: t('stats.courses'), value: '3+', icon: BookOpen },
              { label: t('stats.workshops'), value: '40+', icon: Star },
              { label: t('stats.certified'), value: '100%', icon: ShieldCheck },
            ].map((stat, i) => (
              <div key={i} className={`p-10 text-center border-white/5 ${i !== 3 ? 'md:border-r' : ''} ${i % 2 === 0 ? 'border-r md:border-r-0' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} hover:bg-white/5 transition-colors group`}>
                <div className="flex justify-center mb-4">
                  <stat.icon className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-4xl font-black mb-2 tracking-tighter">{stat.value}</div>
                <div className="text-micro text-gray-500">{stat.label}</div>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('courses.title')}</h2>
              <p className="text-gray-400">{t('courses.subtitle')}</p>
            </div>
            <Link to="/courses" className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1">
              {t('courses.seeAll')} <ArrowRight className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
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
                        {t('courses.details')}
                      </Link>
                      <Link 
                        to={`/payment?courseId=${course.id}`}
                        className="px-4 py-2 bg-brand-radial hover:opacity-90 text-white border border-purple-500/30 rounded-lg transition-all text-sm font-bold shadow-lg shadow-purple-600/10"
                      >
                        {t('courses.getStarted')}
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Students Work Section */}
      <section id="students-work" className="py-24 bg-black relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-900/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('studentsWork.title')}</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              {t('studentsWork.subtitle')}
            </p>
          </div>

          <div className="space-y-20">
            {STUDENT_WORK.map((category, idx) => (
              <div key={category.courseId}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center">
                    <Video className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-bold">{category.courseTitle}</h3>
                  <div className="flex-grow h-px bg-purple-900/20 ml-4" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {category.works.map((work, i) => (
                    <motion.div 
                      key={work.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="group"
                    >
                      <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-purple-900/20 group-hover:border-purple-500/50 transition-all shadow-xl">
                        <img 
                          src={work.thumbnail} 
                          alt={work.studentName}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-600/40">
                            <Play className="w-6 h-6 text-white fill-current" />
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-400" />
                            {work.studentName}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
