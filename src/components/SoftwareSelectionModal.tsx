import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Lock, Sparkles } from 'lucide-react';
import { CourseSoftwareOption } from '../types';
import { useLanguage } from '../context/LanguageContext';

export const DEFAULT_SOFTWARE_OPTIONS: CourseSoftwareOption[] = [
  {
    id: 'premiere',
    title: 'Adobe Premiere Pro',
    imageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=300&q=80',
    status: 'available'
  },
  {
    id: 'davinci',
    title: 'DaVinci Resolve',
    imageUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=300&q=80',
    status: 'coming_soon'
  },
  {
    id: 'capcut',
    title: 'CapCut',
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=300&q=80',
    status: 'coming_soon'
  }
];

interface SoftwareSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (softwareId: string, option: CourseSoftwareOption) => void;
  courseTitle?: string;
  options?: CourseSoftwareOption[];
  initialSelectedId?: string;
}

export function SoftwareSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  courseTitle,
  options,
  initialSelectedId
}: SoftwareSelectionModalProps) {
  const { language } = useLanguage();
  const softwareList = options && options.length > 0 ? options : DEFAULT_SOFTWARE_OPTIONS;
  
  const [selectedId, setSelectedId] = useState<string>(initialSelectedId || '');

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
    } else {
      setSelectedId('');
    }
  }, [initialSelectedId, isOpen]);

  if (!isOpen) return null;

  const selectedOption = softwareList.find(opt => opt.id === selectedId);
  const isConfirmDisabled = !selectedId || selectedOption?.status === 'coming_soon';

  const handleSelect = (option: CourseSoftwareOption) => {
    if (option.status === 'coming_soon') {
      return; // Do not allow selecting coming soon software
    }
    setSelectedId(option.id);
  };

  const handleConfirm = () => {
    if (isConfirmDisabled || !selectedOption) return;
    onConfirm(selectedId, selectedOption);
  };

  // Translations
  const titleText = language === 'ar'
    ? 'اختر برنامج المونتاج الخاص بك'
    : language === 'fr'
    ? 'Choisissez votre logiciel de montage'
    : 'Choose Your Editing Software';

  const subtitleText = language === 'ar'
    ? 'اختر البرنامج الذي ترغب في التعلم عليه لمتابعة الدروس المخصصة له.'
    : language === 'fr'
    ? 'Sélectionnez le logiciel sur lequel vous souhaitez suivre le cours.'
    : 'Select the program you want to learn with to continue to your customized sessions.';

  const confirmText = language === 'ar' ? 'تأكيد والمتابعة' : language === 'fr' ? 'Confirmer et continuer' : 'Confirm & Continue';
  const comingSoonText = language === 'ar' ? 'قريباً' : language === 'fr' ? 'Bientôt' : 'Coming Soon';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl bg-zinc-950 border border-purple-500/30 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl shadow-purple-950/50 z-10 overflow-hidden"
        >
          {/* Top Decorative Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-purple-600/20 blur-[80px] pointer-events-none rounded-full" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-white transition-colors cursor-pointer z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/40 text-purple-300 text-xs font-mono uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{courseTitle || 'Video Editing'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {titleText}
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
              {subtitleText}
            </p>
          </div>

          {/* Software Icons Row (Next to each other) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8 relative z-10">
            {softwareList.map((option) => {
              const isSelected = selectedId === option.id;
              const isComingSoon = option.status === 'coming_soon';

              return (
                <div
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  className={`relative flex flex-col items-center group cursor-pointer transition-all ${
                    isComingSoon ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {/* Square Icon Container */}
                  <div
                    className={`relative w-full aspect-square max-w-[120px] rounded-2xl overflow-hidden bg-zinc-900 border transition-all duration-300 flex items-center justify-center p-2.5 ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.4)] scale-105'
                        : isComingSoon
                        ? 'border-purple-900/20 bg-zinc-950/80'
                        : 'border-purple-900/30 hover:border-purple-500/50 hover:scale-102'
                    }`}
                  >
                    <img
                      src={option.imageUrl}
                      alt={option.title}
                      className="w-full h-full object-cover rounded-xl"
                      referrerPolicy="no-referrer"
                    />

                    {/* Overlay for selection checkmark */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/50 scale-110">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                      </div>
                    )}

                    {/* Coming Soon Lock Overlay */}
                    {isComingSoon && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 text-center">
                        <Lock className="w-5 h-5 text-purple-400 mb-1" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-300 bg-purple-950/90 px-2 py-0.5 rounded-full border border-purple-800/40">
                          {comingSoonText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title of Software Under Icon */}
                  <span className={`mt-3 text-xs sm:text-sm font-bold text-center line-clamp-1 transition-colors ${
                    isSelected ? 'text-purple-300 font-extrabold' : 'text-gray-300 group-hover:text-white'
                  }`}>
                    {option.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Confirm Button */}
          <div className="relative z-10">
            <button
              type="button"
              disabled={isConfirmDisabled}
              onClick={handleConfirm}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                isConfirmDisabled
                  ? 'bg-zinc-800/80 text-zinc-500 border border-zinc-700/30 cursor-not-allowed opacity-50'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-xl shadow-purple-600/40 hover:scale-[1.02] cursor-pointer'
              }`}
            >
              <span>{confirmText}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
