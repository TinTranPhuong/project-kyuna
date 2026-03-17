import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FilePlus, FolderPlus, Trash2, Pencil } from 'lucide-react';
import { useCodeWorkspaceStore, FileTreeEntry } from '@/store/codeWorkspaceStore';
import { cn } from '@/lib/utils';

// File type icon colors
const LANG_COLORS: Record<string, string> = {
  python: 'text-yellow-400', javascript: 'text-yellow-300', typescript: 'text-blue-400',
  typescriptreact: 'text-blue-400', javascriptreact: 'text-yellow-300',
  html: 'text-orange-400', css: 'text-blue-300', scss: 'text-pink-400',
  json: 'text-green-400', markdown: 'text-white/60', yaml: 'text-red-300',
  rust: 'text-orange-500', go: 'text-cyan-400', java: 'text-red-400',
  csharp: 'text-green-500', ruby: 'text-red-500', php: 'text-purple-400',
};

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  entry?: FileTreeEntry;
}

function buildTree(fileTree: Record<string, FileTreeEntry>): TreeNode[] {
  const root: TreeNode[] = [];
  const dirs: Record<string, TreeNode> = {};

  const getOrCreateDir = (parts: string[]): TreeNode => {
    const key = parts.join('/');
    if (dirs[key]) return dirs[key];
    const node: TreeNode = { name: parts[parts.length - 1], path: key, isDir: true, children: [] };
    dirs[key] = node;
    if (parts.length > 1) {
      const parent = getOrCreateDir(parts.slice(0, -1));
      if (!parent.children.find(c => c.path === key)) parent.children.push(node);
    } else {
      if (!root.find(c => c.path === key)) root.push(node);
    }
    return node;
  };

  for (const [path, entry] of Object.entries(fileTree)) {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    const fileNode: TreeNode = { name: fileName, path, isDir: false, children: [], entry };

    if (parts.length > 1) {
      const parent = getOrCreateDir(parts.slice(0, -1));
      parent.children.push(fileNode);
    } else {
      root.push(fileNode);
    }
  }

  // Sort: folders first, then files alphabetically
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => { if (n.isDir) sort(n.children); });
  };
  sort(root);
  return root;
}

interface FileNodeProps {
  node: TreeNode;
  depth: number;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string) => void;
}

const FileNode = ({ node, depth, onSelect, onDelete, onRename }: FileNodeProps) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showMenu, setShowMenu] = useState(false);
  const activeFile = useCodeWorkspaceStore(s => s.activeFile);
  const unsavedFiles = useCodeWorkspaceStore(s => s.unsavedFiles);
  const isActive = activeFile === node.path;
  const isUnsaved = unsavedFiles.has(node.path);
  const color = node.entry?.lang ? LANG_COLORS[node.entry.lang] || 'text-white/50' : 'text-white/50';

  return (
    <div>
      <button
        onClick={() => {
          if (node.isDir) setExpanded(!expanded);
          else onSelect(node.path);
        }}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors group",
          isActive ? "bg-emerald-500/20 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.isDir ? (
          expanded ? <ChevronDown size={12} className="text-white/40 shrink-0" /> : <ChevronRight size={12} className="text-white/40 shrink-0" />
        ) : <span className="w-3 shrink-0" />}

        {node.isDir ? (
          expanded ? <FolderOpen size={14} className="text-amber-400/80 shrink-0" /> : <Folder size={14} className="text-amber-400/60 shrink-0" />
        ) : (
          <File size={14} className={cn(color, "shrink-0")} />
        )}

        <span className="truncate flex-1 text-left">{node.name}</span>

        {isUnsaved && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}

        {/* Hover actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onRename(node.path); }} className="p-0.5 hover:bg-white/10 rounded" title="Rename">
            <Pencil size={10} className="text-white/40" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(node.path); }} className="p-0.5 hover:bg-red-500/20 rounded" title="Delete">
            <Trash2 size={10} className="text-red-400/60" />
          </button>
        </div>
      </button>

      {/* Context menu */}
      {showMenu && (
        <div className="ml-8 mt-1 mb-1 bg-black/80 border border-white/10 rounded-lg p-1 text-xs shadow-2xl z-50">
          <button onClick={() => { onRename(node.path); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded text-white/70 flex items-center gap-2">
            <Pencil size={12} /> Rename
          </button>
          <button onClick={() => { onDelete(node.path); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 rounded text-red-400 flex items-center gap-2">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      {node.isDir && expanded && node.children.map(child => (
        <FileNode key={child.path} node={child} depth={depth + 1} onSelect={onSelect} onDelete={onDelete} onRename={onRename} />
      ))}
    </div>
  );
};

interface FileExplorerProps {
  onCreateFile?: () => void;
  onCreateDir?: () => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (path: string) => void;
}

export const FileExplorer = ({ onCreateFile, onCreateDir, onDeleteFile, onRenameFile }: FileExplorerProps) => {
  const fileTree = useCodeWorkspaceStore(s => s.fileTree);
  const setActiveFile = useCodeWorkspaceStore(s => s.setActiveFile);
  const tree = useMemo(() => buildTree(fileTree), [fileTree]);

  return (
    <div className="flex flex-col h-full">
      {/* File tree */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30 text-xs">
            <Folder size={32} className="mb-2 opacity-30" />
            <p>No files yet</p>
            <p className="text-[10px] mt-1">Upload a folder to get started</p>
          </div>
        ) : (
          tree.map(node => (
            <FileNode
              key={node.path}
              node={node}
              depth={0}
              onSelect={setActiveFile}
              onDelete={onDeleteFile || (() => {})}
              onRename={onRenameFile || (() => {})}
            />
          ))
        )}
      </div>

      {/* Bottom actions */}
      <div className="shrink-0 border-t border-white/10 p-2 flex gap-1">
        <button onClick={onCreateFile} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-colors">
          <FilePlus size={12} /> New File
        </button>
        <button onClick={onCreateDir} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-colors">
          <FolderPlus size={12} /> New Dir
        </button>
      </div>
    </div>
  );
};

export default FileExplorer;
