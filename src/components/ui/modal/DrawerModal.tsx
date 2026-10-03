'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface DrawerModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  position?: 'bottom' | 'right';
}

export default function DrawerModal({
  isOpen,
  title,
  children,
  onClose,
  position = 'bottom',
}: DrawerModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const isBottom = position === 'bottom';

  // Animation variants
  const drawerVariants = {
    hidden: isBottom ? { y: '100%', opacity: 0.5 } : { x: '100%', opacity: 0.5 },
    visible: isBottom ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 },
    exit: isBottom ? { y: '100%', opacity: 0.5 } : { x: '100%', opacity: 0.5 },
  };

  const positionClasses = isBottom
    ? 'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-3xl border-t'
    : 'right-0 top-0 bottom-0 w-full max-w-sm border-l';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-xs justify-end items-end"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-transparent" />

          {/* Drawer Container */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`absolute bg-white dark:bg-zinc-900 border-sandal-200 dark:border-zinc-800 shadow-2xl flex flex-col text-left overflow-hidden ${positionClasses}`}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 dark:border-zinc-850">
              <h3 className="text-lg font-serif font-black text-zinc-900 dark:text-zinc-50">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer touch-target"
                aria-label="Close drawer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
