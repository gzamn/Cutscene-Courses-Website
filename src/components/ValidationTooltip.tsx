import React from 'react';
import { motion } from 'motion/react';

interface ValidationTooltipProps {
  message?: string;
  isVisible: boolean;
}

export default function ValidationTooltip({ message = 'Please fill out this field.', isVisible }: ValidationTooltipProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="relative mt-2 z-30 select-none self-start"
    >
      {/* Little Speech Bubble Arrow pointing upwards */}
      <div className="absolute top-[-6px] left-6 w-3 h-3 bg-white border-t border-l border-zinc-200/80 rotate-45 transform" />

      {/* Styled Bubble Container */}
      <div className="flex items-center gap-3 bg-white border border-zinc-200 text-zinc-900 rounded-lg px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.15)] max-w-sm">
        {/* Orange Exclamation Icon exactly like the image */}
        <div className="w-6 h-6 rounded bg-[#E65100] flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white text-sm font-black font-serif select-none">!</span>
        </div>

        {/* Message */}
        <span className="text-xs sm:text-sm font-sans font-medium leading-tight text-left">
          {message}
        </span>
      </div>
    </motion.div>
  );
}
