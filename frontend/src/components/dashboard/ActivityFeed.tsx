import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { useTranslatorStore } from '@/store/translatorStore';
import { MessageSquare, Languages, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper to calculate relative time
const getRelativeTime = (dateString: string) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
};

export const ActivityFeed = () => {
  const navigate = useNavigate();
  const { conversations } = useChatStore();
  const { jobs, selectJob } = useTranslatorStore();

  // 1. Gather and map the latest 5 chats
  const recentChats = conversations.slice(0, 5).map(c => ({
    id: c.id,
    type: 'chat' as const,
    title: c.title || 'New Conversation',
    timestamp: c.updated_at || new Date().toISOString(),
  }));

  // 2. Gather and map the latest 3 translation jobs
  const recentJobs = jobs.slice(0, 3).map(j => ({
    id: j.id,
    type: 'translate' as const,
    title: (j as any).filename || `Job #${j.id.substring(0, 5)}`,
    timestamp: (j as any).created_at || new Date().toISOString(),
  }));

  // 3. Combine, sort chronologically, and take the top 8 total
  const combinedActivity = [...recentChats, ...recentJobs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  const handleNavigate = (item: typeof combinedActivity[0]) => {
    if (item.type === 'chat') {
      navigate(`/chat/${item.id}`);
    } else {
      selectJob(item.id);
      navigate('/translator');
    }
  };

  if (combinedActivity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-white/30">
        <Clock size={24} className="mb-2 opacity-50" />
        <p className="text-sm">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {combinedActivity.map((item) => (
        <div 
          key={`${item.type}-${item.id}`}
          onClick={() => handleNavigate(item)}
          className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group border border-transparent hover:border-white/5"
        >
          <div className={cn(
            "p-2.5 rounded-lg shrink-0",
            item.type === 'chat' ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
          )}>
            {item.type === 'chat' ? <MessageSquare size={16} /> : <Languages size={16} />}
          </div>
          
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
              {item.title}
            </h4>
            <p className="text-[11px] text-white/40 mt-0.5 font-medium">
              {getRelativeTime(item.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};