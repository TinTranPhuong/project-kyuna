import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TabsProps {
  tabs: { label: string; value: string }[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}

export const Tabs = ({ tabs, activeTab, onChange, className }: TabsProps) => {
  return (
    <div 
      className={cn(
        "inline-flex p-1 bg-white/5 backdrop-blur-md rounded-xl border border-white/10",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative px-4 py-1.5 text-sm font-medium transition-colors duration-200 outline-none min-w-[80px]",
              isActive ? "text-white" : "text-white/50 hover:text-white/80"
            )}
          >
            {/* The sliding indicator */}
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-surface-800 rounded-lg shadow-sm border border-white/5"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            
            {/* Label must be relative and z-10 to stay on top of the indicator */}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;