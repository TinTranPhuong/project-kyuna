import React from 'react';
import { useTranslatorStore } from '@/store/translatorStore';
import { Trash2, FileImage, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export const JobList = () => {
  const { jobs, activeJobId, selectJob, deleteJob } = useTranslatorStore();

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent triggering the row click
    if (window.confirm('Are you sure you want to delete this translation job?')) {
      deleteJob(id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle2 size={14} className="text-emerald-400" />;
      case 'processing': return <Loader2 size={14} className="text-blue-400 animate-spin" />;
      case 'failed': return <AlertCircle size={14} className="text-red-400" />;
      default: return <Clock size={14} className="text-white/40" />; // pending
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-white/40 italic bg-surface-900/30 rounded-lg border border-white/5">
        No translation jobs yet. Upload a file to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-1">
      {jobs.map((job) => {
        const isActive = job.id === activeJobId;
        
        return (
          <div
            key={job.id}
            onClick={() => selectJob(job.id)}
            className={cn(
              "group relative flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
              isActive 
                ? "bg-primary-500/10 border-primary-500/30 shadow-sm" 
                : "bg-surface-900/50 border-white/5 hover:border-white/20 hover:bg-surface-800"
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded bg-surface-950 text-white/60 shrink-0">
                <FileImage size={16} />
              </div>
              
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-white/90 truncate pr-4">
                  {/* Assumes job object has a filename property. Fallback provided. */}
                  {(job as any).filename || `Translation Job #${job.id.substring(0, 5)}`}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getStatusIcon((job as any).status || 'pending')}
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                    {(job as any).status || 'pending'}
                  </span>
                  <span className="text-[10px] text-white/20 ml-1">
                    • {new Date((job as any).created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => handleDelete(e, job.id)}
              className="absolute right-3 p-1.5 rounded-md text-white/20 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
              title="Delete Job"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default JobList;