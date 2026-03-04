import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
//import { cn } from '@/lib/utils';

export const TypingIndicator = () => {
  // Animation variant for the pulsing dots
  const dotVariants = {
    initial: { scale: 0.8, opacity: 0.4 },
    animate: { 
      scale: 1.2, 
      opacity: 1,
      transition: {
        duration: 0.6,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="flex items-start gap-3 w-full mb-6 animate-in fade-in duration-300">
      {/* Assistant Avatar - Matches ChatMessage styling */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-md bg-surface-800 border border-white/10">
        <Bot size={18} className="text-primary-400" />
      </div>

      {/* Pulsing Bubble */}
      <div className="flex flex-col space-y-1">
        <div className="px-4 py-3 rounded-2xl rounded-tl-none glass-card border border-white/10 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              variants={dotVariants}
              initial="initial"
              animate="animate"
              transition={{
                delay: i * 0.2 // Sequential stagger delay
              }}
              className="w-1.5 h-1.5 rounded-full bg-primary-800"
            />
          ))}
        </div>
        
        <span className="text-[10px] text-white/80 font-medium px-1 uppercase tracking-widest">
          Kyuna is thinking
        </span>
      </div>
    </div>
  );
};

export default TypingIndicator;