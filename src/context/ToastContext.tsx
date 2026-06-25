import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const toastHelpers = {
    success: (msg: string, dur?: number) => showToast(msg, 'success', dur),
    error: (msg: string, dur?: number) => showToast(msg, 'error', dur),
    info: (msg: string, dur?: number) => showToast(msg, 'info', dur),
    warning: (msg: string, dur?: number) => showToast(msg, 'warning', dur),
  };

  return (
    <ToastContext.Provider value={{ toast: toastHelpers, showToast }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div 
        id="toast-container"
        className="fixed top-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-[380px] pointer-events-none px-4 md:px-0"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            // Pick icon and style based on type
            let Icon = Info;
            let iconColor = 'text-blue-400';
            let borderColor = 'border-blue-500/20';
            let bgGlow = 'rgba(59, 130, 246, 0.05)';
            let barColor = 'bg-blue-500';

            switch (t.type) {
              case 'success':
                Icon = CheckCircle2;
                iconColor = 'text-green-400';
                borderColor = 'border-green-500/20';
                bgGlow = 'rgba(34, 197, 94, 0.05)';
                barColor = 'bg-green-500';
                break;
              case 'error':
                Icon = XCircle;
                iconColor = 'text-red-400';
                borderColor = 'border-red-500/20';
                bgGlow = 'rgba(239, 68, 68, 0.05)';
                barColor = 'bg-red-500';
                break;
              case 'warning':
                Icon = AlertCircle;
                iconColor = 'text-yellow-400';
                borderColor = 'border-yellow-500/20';
                bgGlow = 'rgba(234, 179, 8, 0.05)';
                barColor = 'bg-yellow-500';
                break;
              case 'info':
                Icon = Info;
                iconColor = 'text-purple-400';
                borderColor = 'border-purple-500/20';
                bgGlow = 'rgba(168, 85, 247, 0.05)';
                barColor = 'bg-purple-500';
                break;
            }

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                style={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', boxShadow: `0 10px 30px -10px ${bgGlow}` }}
                className={`pointer-events-auto flex gap-3 p-4 rounded-2xl border ${borderColor} backdrop-blur-md relative overflow-hidden group select-none`}
              >
                {/* Left Side Icon */}
                <div className="shrink-0 pt-0.5">
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>

                {/* Message Body */}
                <div className="flex-1 text-xs font-semibold text-gray-200 leading-relaxed pr-4">
                  {t.message}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 h-fit text-gray-500 hover:text-white transition-colors cursor-pointer p-0.5 rounded-md hover:bg-white/5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Premium Animating Timeout Bar */}
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: (t.duration || 4000) / 1000, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-[3px] ${barColor} opacity-75`}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
