import React, { useState } from 'react';
import { useTranslatorStore } from '@/store/translatorStore';
import { cn } from '@/lib/utils';
import { FileText, CheckCircle2, AlertCircle, Loader2, Pencil, Trash2 } from 'lucide-react';

// --- Native Date Helper ---
function timeAgo(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const JobItem = ({ job, isActive, onClick, onRename, onDelete }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(job.original_filename);

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editValue.trim()) {
      onRename(job.id, editValue.trim());
      setIsEditing(false);
    }
  };

  return (
    <div
      onClick={() => {
        if (!isEditing) onClick();
      }}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border",
        isActive 
          ? "bg-primary-500/10 border-primary-500/50" 
          : "bg-surface-900 border-white/5 hover:bg-white/5 hover:border-white/10"
      )}
    >
      {/* Icon Status */}
      <div className={cn("shrink-0", isActive ? "text-primary-400" : "text-white/40")}>
        {job.status === 'processing' ? <Loader2 size={18} className="animate-spin text-blue-400" /> :
         job.status === 'completed' ? <CheckCircle2 size={18} className="text-green-400" /> :
         job.status === 'failed' ? <AlertCircle size={18} className="text-red-400" /> :
         <FileText size={18} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <form onSubmit={handleSave} className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full bg-surface-950 border border-primary-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none"
              onBlur={() => handleSave()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditValue(job.original_filename);
                  setIsEditing(false);
                }
              }}
            />
          </form>
        ) : (
          <div className="flex flex-col">
            <span className={cn("text-xs font-medium truncate", isActive ? "text-white" : "text-white/70 group-hover:text-white")}>
              {job.original_filename}
            </span>
            <span className="text-[10px] text-white/30 truncate">
               {timeAgo(job.created_at)}
            </span>
          </div>
        )}
      </div>

      {/* Actions (Visible on Hover) */}
      {!isEditing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Rename"
          >
            <Pencil size={12} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this job?')) onDelete(job.id);
            }}
            className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

export const JobList = () => {
  const { jobs, activeJobId, selectJob, renameJob, deleteJob } = useTranslatorStore();

  return (
    <div className="flex flex-col gap-2">
      {jobs.map((job) => (
        <JobItem
          key={job.id}
          job={job}
          isActive={activeJobId === job.id}
          onClick={() => selectJob(job.id)}
          onRename={renameJob}
          onDelete={deleteJob}
        />
      ))}
    </div>
  );
};

export default JobList;