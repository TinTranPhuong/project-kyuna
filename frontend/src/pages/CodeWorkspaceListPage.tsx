import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Code2, Clock, FolderOpen, Trash2 } from 'lucide-react';
import { listSessions, createSession, deleteSession, CodingSessionListItem } from '@/services/code-workspace.service';
import { timeAgo } from '@/lib/utils';

export default function CodeWorkspaceListPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CodingSessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const session = await createSession();
      navigate(`/code-workspace/${session.id}`);
    } catch (err) {
      console.error('Failed to create session', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this workspace session?')) return;
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  return (
    <div className="w-full h-full p-8 overflow-y-auto text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl backdrop-blur-md border border-emerald-500/20">
              <Code2 size={28} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Code Workspace</h1>
              <p className="text-white-400 mt-1">Your AI-powered coding sessions</p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-emerald-900/30"
          >
            <Plus size={18} />
            {creating ? 'Creating...' : 'New Session'}
          </button>
        </div>

        {/* Session list */}
        {loading ? (
          <div className="text-center text-white/40 py-16">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen size={48} className="mx-auto mb-4 text-white/20" />
            <p className="text-white/40 text-lg">No sessions yet</p>
            <p className="text-white/25 text-sm mt-1">Create one to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/code-workspace/${session.id}`)}
                className="group flex items-center justify-between p-4 rounded-xl bg-black/45 border border-white/10 hover:bg-white/25 hover:border-emerald-500/30 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Code2 size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {session.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                      <span className="flex items-center gap-1"><FolderOpen size={10} /> {session.file_count} files</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(session.last_active)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(session.id, e)}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-white/30 transition-all"
                  title="Delete session"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
