import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ReactNode;
  color: 'teal' | 'blue' | 'purple' | 'amber';
  trend?: number;
}

const colorMap = {
  teal: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

export const StatCard = ({ title, value, unit, icon, color, trend }: StatCardProps) => {
  const isNumeric = typeof value === 'number';
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (isNumeric) {
      const controls = animate(count, value as number, { duration: 1.5, ease: 'easeOut' });
      return controls.stop;
    }
  }, [value, isNumeric, count]);

  return (
    <div className="relative overflow-hidden p-5 rounded-2xl bg-surface-900/40 border border-white/5 backdrop-blur-md shadow-lg flex flex-col justify-between gap-4 group">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-white/50">{title}</h3>
        <div className={cn("p-2 rounded-xl border transition-colors", colorMap[color])}>
          {icon}
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-white tracking-tight">
            {isNumeric ? <motion.span>{rounded}</motion.span> : value}
          </span>
          {unit && <span className="text-sm font-medium text-white/40">{unit}</span>}
        </div>

        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-xs font-semibold",
            trend >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{Math.abs(trend)}%</span>
            <span className="text-white/30 font-normal ml-1">vs last period</span>
          </div>
        )}
      </div>
      
      {/* Subtle background glow effect */}
      <div className={cn(
        "absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none",
        colorMap[color].split(' ')[1] // Extract the bg color utility
      )} />
    </div>
  );
};
