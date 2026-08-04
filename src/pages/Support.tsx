import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, MessageCircle, Phone, ArrowRight, HelpCircle, Send, CheckCircle2, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const faqs = [
  {
    question: {
      en: "How do the courses work? Is it live or recorded?",
      fr: "Comment fonctionnent les cours ? Est-ce en direct ou enregistré ?",
      ar: "كيف تعمل هذه الدورات؟ هل هي مباشرة أم مسجلة؟"
    },
    answer: {
      en: "We offer dual studying trajectories: Recorded Mode provides you with flexible, self-paced access to pre-recorded cinematic lessons, while Online Live Mode connects you with interactive group sessions scheduled around official start dates. Both pathways include 1-on-1 personalized task reviews and support.",
      fr: "Nous proposons deux approches : le Mode Enregistré offre un accès autonome et flexible à nos leçons préenregistrées, tandis que le Mode En Ligne Live vous réunit lors de sessions collectives interactives à des dates précises. Les deux parcours incluent des revues individuelles de vos projets.",
      ar: "نوفر طريقتين للدراسة: 'الدراسة المسجلة' تمنحك وصولاً مرناً للمحاضرات المسجلة لتتعلم في أي وقت والسرعة التي تناسبك، و'الدراسة التفاعلية المباشرة' تجمعك في حصص جماعية أونلاين بمواعيد مجدولة. كلا الاتجاهين يتضمنان مراجعة وتقييم مشاريعك ومتابعة مستمرة."
    }
  },
  {
    question: {
      en: "What software and specifications do I need to learn?",
      fr: "Quels logiciels et configurations dois-je posséder pour apprendre ?",
      ar: "ما هي البرمجيات والمواصفات التي أحتاج إليها للتعلم؟"
    },
    answer: {
      en: "Our specialized curriculum revolves primarily around Adobe Premiere Pro and DaVinci Resolve. Detailed software recommendations and recommended PC specifications are outlined under each corresponding course chapter in the requirements panel.",
      fr: "Notre spécialisation se concentre principalement sur Adobe Premiere Pro et DaVinci Resolve. Les recommandations détaillées de logiciels ainsi que les spécifications de PC recommandées sont listées sous chaque chapitre de cours correspondant.",
      ar: "يركز المنهج المخصص لدينا بشكل أساسي على Adobe Premiere Pro و DaVinci Resolve. تتوفر توصيات تفصيلية حول البرمجيات الضرورية ومواصفات الكمبيوتر الموصى بها مسبقاً في تبويب متطلبات كل دورة تعليمية."
    }
  },
  {
    question: {
      en: "Will I receive an official certificate upon graduation?",
      fr: "Est-ce que je recevrai un certificat de réussite officiel ?",
      ar: "هل سأحصل على شهادة تخرج رسمية معتمدة؟"
    },
    answer: {
      en: "Absolutely! After finishing all interactive chapters, submitting your exercises, and passing homework critiques evaluated directly by our veteran instructors, you will generate and secure a verified digital completion certificate ready for download.",
      fr: "Absolument ! Après avoir complété tous les chapitres interactifs, soumis vos exercices et validé vos revues de projets évaluées par nos formateurs, vous débloquerez un certificat de réussite officiel et vérifiable immédiatement téléchargeable.",
      ar: "بكل تأكيد! بمجرد إكمال جميع الفصول الدراسية وتطبيق التمارين واجتياز تقييم الواجبات اليومية ومراجعتها من قبل المدربين الخبراء، سيتم إصدار شهادة تخرج رقمية معتمدة جاهزة للتحميل الفوري."
    }
  },
  {
    question: {
      en: "How can I reach my instructors if I get stuck?",
      fr: "Comment puis-je contacter mes formateurs en cas de blocage ?",
      ar: "كيف يمكنني التواصل مع المدربين إذا واجهتني أي صعوبة؟"
    },
    answer: {
      en: "We offer multiple connection pathways. You can ask quick technical questions to our integrated server-side AI Mentor inside the video interface, write directly to our technical desk via WhatsApp, or issue a formal request using the support terminal below.",
      fr: "Nous offrons de multiples canaux de communication : vous pouvez poser vos questions au Mentor IA intégré directement dans le lecteur, chatter directement via WhatsApp, ou envoyer un message d'assistance via le formulaire ci-dessous.",
      ar: "هناك عدة طرق للتواصل السريع؛ حيث يمكنك كتابة أسئلتك للمدرب الذكي (AI Mentor) المدمج مباشرة داخل مشغل الفيديو للحصول على إجابة فورية، أو التحديث إلينا عبر واتساب، أو إرسال استفسار رسمي عبر النموذج أدناه."
    }
  },
  {
    question: {
      en: "Do you offer team plans or corporate training solutions?",
      fr: "Proposez-vous des formules d'équipe ou pour les entreprises ?",
      ar: "هل توفرون باقات مخصصة للفرق وحلول التدريب للمؤسسات؟"
    },
    answer: {
      en: "Yes, we coordinate group learning plans and customized enterprise setups! Feel free to reach out to our administration desk via phone call or direct support email with your team details to design a tailored masterclass.",
      fr: "Oui, nous concevons des plans de formation pour les groupes et les entreprises ! N'hésitez pas à contacter notre administration par téléphone ou par e-mail avec les détails de votre équipe pour concevoir un programme parfaitement adapté.",
      ar: "نعم بالطبع! نحن نسق خططاً تدريبية مخصصة ومناسبة للمجموعات والشركات. يسعدنا تواصلك مع إدارة المنصة هاتفياً أو عبر البريد الإلكتروني لمطابقة الأهداف وصياغة منهج مخصص لفريقك."
    }
  }
];

function FAQItem({ item, lang }: { item: typeof faqs[0]; lang: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`bg-zinc-950 border transition-all duration-300 rounded-3xl mb-4 overflow-hidden shadow-lg ${
      isOpen ? 'border-purple-500/30 bg-purple-950/5' : 'border-purple-900/15 hover:border-purple-500/20'
    }`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-start py-5 px-6 sm:px-8 flex items-center justify-between gap-4 cursor-pointer outline-none select-none"
      >
        <span className={`font-bold text-base sm:text-lg transition-colors ${
          isOpen ? 'text-purple-400' : 'text-zinc-200'
        }`}>
          {item.question[lang as keyof typeof item.question] || item.question.en}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-purple-500 animate-pulse" />
        </motion.span>
      </button>

      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
        className="overflow-hidden"
      >
        <div className="px-6 pb-6 sm:px-8 sm:pb-6 text-gray-400 leading-relaxed text-sm sm:text-base border-t border-purple-900/10 pt-4">
          {item.answer[lang as keyof typeof item.answer] || item.answer.en}
        </div>
      </motion.div>
    </div>
  );
}

export default function Support() {
  const { t, language } = useLanguage();

  const faqTitles = {
    en: { title: "Frequently Asked Questions", desc: "Find answers to the most common queries about Cutscene Academy, our learning structure, and mentorship support." },
    fr: { title: "Questions Fréquemment Posées", desc: "Trouvez des réponses aux questions les plus courantes sur l'Académie Cutscene, notre structure d'apprentissage et l'aide de nos mentors." },
    ar: { title: "الأسئلة الشائعة", desc: "ابحث عن إجابات للأسئلة الأكثر شيوعاً حول أكاديمية Cutscene وهيكل التعلم والدعم الإرشادي المتاح." }
  };

  const currentFaqHeader = faqTitles[language as keyof typeof faqTitles] || faqTitles.en;

  const supportItems = [
    { 
      title: t('support.emailTitle'), 
      desc: t('support.emailDesc'), 
      contact: 'cutscenedz@gmail.com', 
      icon: Mail,
      action: t('support.emailAction'),
      url: 'mailto:cutscenedz@gmail.com'
    },
    { 
      title: t('support.whatsappTitle'), 
      desc: t('support.whatsappDesc'), 
      contact: '+213 776 76 22 66', 
      icon: MessageCircle,
      action: t('support.whatsappAction'),
      url: 'https://wa.me/213776762266'
    },
    { 
      title: t('support.phoneTitle'), 
      desc: t('support.phoneDesc'), 
      contact: '+213 776 76 22 66', 
      icon: Phone,
      action: t('support.phoneAction'),
      url: 'tel:+213776762266'
    }
  ];

  return (
    <div className="min-h-screen bg-transparent text-white pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/30 rounded-full border border-purple-500/30 text-purple-400 text-sm font-bold mb-6"
          >
            <HelpCircle className="w-4 h-4" />
            {t('support.center')}
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">{t('support.title')}</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {t('support.desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {supportItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-950 border border-purple-900/30 rounded-3xl p-8 group hover:bg-zinc-900 transition-all"
            >
              <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <item.icon className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">{item.desc}</p>
              <div className="text-white font-bold mb-8">{item.contact}</div>
              <a 
                href={item.url}
                target={item.url.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-purple-400 font-bold hover:text-purple-300 transition-colors group/btn cursor-pointer"
              >
                {item.action}
                <ArrowRight className={`w-5 h-5 group-hover/btn:translate-x-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
              </a>
            </motion.div>
          ))}
        </div>

        {/* Accordion FAQ Section */}
        <div className="max-w-4xl mx-auto mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-white tracking-tight">
              {currentFaqHeader.title}
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              {currentFaqHeader.desc}
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} item={faq} lang={language} />
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-zinc-950/40 backdrop-blur-md border border-purple-900/30 rounded-[2.5rem] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-12 bg-purple-600 text-white flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-6">{t('support.sendMessage')}</h2>
              <p className="text-purple-100 mb-8 leading-relaxed">
                {t('support.formDesc')}
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span>{t('support.feature1')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span>{t('support.feature2')}</span>
                </div>
              </div>
            </div>
            
            <div className="p-12">
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">{t('support.fullName')}</label>
                  <input 
                    type="text" 
                    placeholder={t('support.namePlaceholder')}
                    className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">{t('support.emailAddress')}</label>
                  <input 
                    type="email" 
                    placeholder={t('support.emailPlaceholder')}
                    className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">{t('support.message')}</label>
                  <textarea 
                    rows={4}
                    placeholder={t('support.messagePlaceholder')}
                    className="w-full bg-black border border-purple-900/30 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                  />
                </div>
                <button className="w-full py-4 bg-brand-radial hover:opacity-90 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group shadow-lg shadow-purple-600/20">
                  {t('support.send')}
                  <Send className={`w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform ${language === 'ar' ? 'rotate-180' : ''}`} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
