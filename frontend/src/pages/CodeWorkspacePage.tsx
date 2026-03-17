import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Code2, GripVertical, Pencil } from 'lucide-react';

import { getSession, readFile, writeFile, deleteFile as deleteFileApi, getDownloadUrl, renameSession } from '@/services/code-workspace.service';
import { useCodeWorkspaceStore } from '@/store/codeWorkspaceStore';

import FileExplorer from '@/components/code-workspace/FileExplorer';
import CodeEditor from '@/components/code-workspace/CodeEditor';
import WorkspaceChat from '@/components/code-workspace/WorkspaceChat';
import FileUploadZone from '@/components/code-workspace/FileUploadZone';

// ── Resizable Panel Hook ─────────────────────────────────────────────────────
// Custom implementation since react-resizable-panels v4 API is problematic.
function useResizable(initialLeft: number, initialRight: number) {
  const [leftWidth, setLeftWidth] = useState(initialLeft);
  const [rightWidth, setRightWidth] = useState(initialRight);

  const handleLeftDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newWidth = Math.max(180, Math.min(400, startWidth + delta));
      setLeftWidth(newWidth);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [leftWidth]);

  const handleRightDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const newWidth = Math.max(250, Math.min(500, startWidth + delta));
      setRightWidth(newWidth);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightWidth]);

  return { leftWidth, rightWidth, handleLeftDrag, handleRightDrag };
}

export default function CodeWorkspacePage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const {
    activeSession, setActiveSession, setFileTree, setActiveFile,
    activeFile, setFileContent, markSaved, fileTree, reset,
  } = useCodeWorkspaceStore();

  const { leftWidth, rightWidth, handleLeftDrag, handleRightDrag } = useResizable(220, 320);

  // Load session on mount
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getSession(sessionId);
        if (!cancelled) {
          setActiveSession({
            id: data.id,
            title: data.title,
            file_tree: data.file_tree,
            file_count: Object.keys(data.file_tree).length,
            created_at: data.created_at,
            last_active: data.last_active,
          });
          setFileTree(data.file_tree);
        }
      } catch (err) {
        console.error('Failed to load session', err);
        if (!cancelled) navigate('/code-workspace');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; reset(); };
  }, [sessionId]);

  // Load file content when active file changes
  useEffect(() => {
    if (!sessionId || !activeFile) return;
    const loadFile = async () => {
      try {
        const data = await readFile(sessionId, activeFile);
        setFileContent(activeFile, data.content);
        markSaved(activeFile);
      } catch (err) {
        console.error('Failed to read file', err);
      }
    };
    const existing = useCodeWorkspaceStore.getState().fileContents[activeFile];
    if (existing === undefined) loadFile();
  }, [activeFile, sessionId]);

  // Save file handler (Ctrl+S)
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!sessionId || !activeFile) return;
        const content = useCodeWorkspaceStore.getState().fileContents[activeFile];
        if (content !== undefined) {
          await writeFile(sessionId, activeFile, content);
          markSaved(activeFile);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sessionId, activeFile]);

  const handleDeleteFile = useCallback(async (path: string) => {
    if (!sessionId) return;
    if (!confirm(`Delete ${path}?`)) return;
    try {
      await deleteFileApi(sessionId, path);
      const data = await getSession(sessionId);
      setFileTree(data.file_tree);
    } catch (err) {
      console.error('Failed to delete file', err);
    }
  }, [sessionId]);

  const handleCreateFile = useCallback(async () => {
    const name = prompt('New file name (e.g., src/main.py):');
    if (!name || !sessionId) return;
    await writeFile(sessionId, name, '');
    const data = await getSession(sessionId);
    setFileTree(data.file_tree);
    setActiveFile(name);
  }, [sessionId]);

  const handleCreateDir = useCallback(async () => {
    const name = prompt('New directory name (e.g., src/utils):');
    if (!name || !sessionId) return;
    await writeFile(sessionId, `${name}/.gitkeep`, '');
    const data = await getSession(sessionId);
    setFileTree(data.file_tree);
  }, [sessionId]);

  const handleRenameFile = useCallback(async (path: string) => {
    const newName = prompt('New name:', path);
    if (!newName || newName === path || !sessionId) return;
    try {
      const old = await readFile(sessionId, path);
      await writeFile(sessionId, newName, old.content);
      await deleteFileApi(sessionId, path);
      const data = await getSession(sessionId);
      setFileTree(data.file_tree);
    } catch (err) {
      console.error('Rename failed', err);
    }
  }, [sessionId]);

  const handleDownload = () => {
    if (!sessionId) return;
    const token = localStorage.getItem('accessToken');
    window.open(`${getDownloadUrl(sessionId)}?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/40">
        <div className="text-center">
          <Code2 size={32} className="mx-auto mb-3 text-emerald-400 animate-pulse" />
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  const hasFiles = Object.keys(fileTree).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/code-workspace')}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <Code2 size={18} className="text-emerald-400" />

          {/* Inline rename */}
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={async () => {
                if (renameValue.trim() && sessionId && renameValue !== activeSession?.title) {
                  try {
                    const updated = await renameSession(sessionId, renameValue.trim());
                    setActiveSession({ ...activeSession!, title: updated.title });
                  } catch { /* ignore */ }
                }
                setIsRenaming(false);
              }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setIsRenaming(false); }}
              className="bg-white/10 border border-emerald-500/30 rounded-md px-2 py-0.5 text-sm text-white font-semibold outline-none focus:border-emerald-500/60 w-48"
            />
          ) : (
            <button
              onClick={() => { setRenameValue(activeSession?.title || ''); setIsRenaming(true); }}
              className="group flex items-center gap-1.5 hover:bg-white/5 rounded-md px-1.5 py-0.5 transition-colors"
              title="Click to rename"
            >
              <span className="font-semibold text-white text-sm">{activeSession?.title || 'Workspace'}</span>
              <Pencil size={11} className="text-white/20 group-hover:text-white/50 transition-colors" />
            </button>
          )}

          <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
            {Object.keys(fileTree).length} files
          </span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Download size={14} /> Download .zip
        </button>
      </div>

      {/* Three-panel layout */}
      {!hasFiles ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <FileUploadZone sessionId={sessionId!} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* ── Left Panel: File Explorer ────────────────────────────────── */}
          <div
            className="shrink-0 h-full bg-black/30 border-r border-white/10 flex flex-col overflow-hidden"
            style={{ width: leftWidth }}
          >
            <div className="shrink-0 px-3 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest border-b border-white/5">
              Explorer
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <FileExplorer
                onCreateFile={handleCreateFile}
                onCreateDir={handleCreateDir}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
              />
            </div>
            <div className="shrink-0 p-2 border-t border-white/10">
              <FileUploadZone sessionId={sessionId!} />
            </div>
          </div>

          {/* ── Left Resize Handle ───────────────────────────────────────── */}
          <div
            className="shrink-0 w-1.5 bg-white/5 hover:bg-emerald-500/40 active:bg-emerald-500/60 cursor-col-resize transition-colors flex items-center justify-center group"
            onMouseDown={handleLeftDrag}
          >
            <GripVertical size={10} className="text-white/10 group-hover:text-white/30 transition-colors" />
          </div>

          {/* ── Center Panel: Monaco Editor ──────────────────────────────── */}
          <div className="flex-1 min-w-0 h-full overflow-hidden">
            <CodeEditor />
          </div>

          {/* ── Right Resize Handle ──────────────────────────────────────── */}
          <div
            className="shrink-0 w-1.5 bg-white/5 hover:bg-emerald-500/40 active:bg-emerald-500/60 cursor-col-resize transition-colors flex items-center justify-center group"
            onMouseDown={handleRightDrag}
          >
            <GripVertical size={10} className="text-white/10 group-hover:text-white/30 transition-colors" />
          </div>

          {/* ── Right Panel: AI Chat ─────────────────────────────────────── */}
          <div
            className="shrink-0 h-full overflow-hidden"
            style={{ width: rightWidth }}
          >
            <WorkspaceChat sessionId={sessionId!} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
