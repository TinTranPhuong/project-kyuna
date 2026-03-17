import { create } from 'zustand';

export interface FileTreeEntry {
  size: number;
  lang: string;
}

export interface CodingSession {
  id: string;
  title: string;
  file_tree: Record<string, FileTreeEntry>;
  file_count: number;
  created_at: string;
  last_active: string;
}

export interface CodingAgentEvent {
  event: string;
  agent?: string;
  tool?: string;
  file?: string;
  step?: number;
  task?: string;
  content?: string;
  message?: string;
  args?: Record<string, any>;
  result?: string;
  steps?: any[];
  changed_lines?: number[];
}

interface CodeWorkspaceState {
  // Sessions
  sessions: CodingSession[];
  activeSession: CodingSession | null;

  // File tree
  fileTree: Record<string, FileTreeEntry>;
  activeFile: string;
  openFiles: string[];
  unsavedFiles: Set<string>;
  fileContents: Record<string, string>;

  // Chat
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  isAgentRunning: boolean;
  currentStreamContent: string;
  agentEvents: CodingAgentEvent[];

  // Editor
  fontSize: number;

  // Actions
  setSessions: (sessions: CodingSession[]) => void;
  setActiveSession: (session: CodingSession | null) => void;
  setFileTree: (tree: Record<string, FileTreeEntry>) => void;
  setActiveFile: (path: string) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setFileContent: (path: string, content: string) => void;
  markUnsaved: (path: string) => void;
  markSaved: (path: string) => void;
  addMessage: (msg: { role: 'user' | 'assistant'; content: string }) => void;
  setAgentRunning: (running: boolean) => void;
  setStreamContent: (content: string) => void;
  appendStreamContent: (token: string) => void;
  addAgentEvent: (event: CodingAgentEvent) => void;
  clearAgentEvents: () => void;
  applyFilePatch: (file: string, content: string) => void;
  setFontSize: (size: number) => void;
  setMessages: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void;
  reset: () => void;
}

export const useCodeWorkspaceStore = create<CodeWorkspaceState>((set, get) => ({
  sessions: [],
  activeSession: null,
  fileTree: {},
  activeFile: '',
  openFiles: [],
  unsavedFiles: new Set(),
  fileContents: {},
  messages: [],
  isAgentRunning: false,
  currentStreamContent: '',
  agentEvents: [],
  fontSize: 14,

  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (session) => set({ activeSession: session, fileTree: session?.file_tree || {} }),
  setFileTree: (tree) => set({ fileTree: tree }),

  setActiveFile: (path) => {
    const { openFiles } = get();
    if (!openFiles.includes(path)) {
      set({ activeFile: path, openFiles: [...openFiles, path] });
    } else {
      set({ activeFile: path });
    }
  },

  openFile: (path) => {
    const { openFiles } = get();
    if (!openFiles.includes(path)) {
      set({ openFiles: [...openFiles, path], activeFile: path });
    } else {
      set({ activeFile: path });
    }
  },

  closeFile: (path) => {
    const { openFiles, activeFile } = get();
    const next = openFiles.filter(f => f !== path);
    set({
      openFiles: next,
      activeFile: activeFile === path ? (next[next.length - 1] || '') : activeFile,
    });
  },

  setFileContent: (path, content) => set(s => ({
    fileContents: { ...s.fileContents, [path]: content }
  })),

  markUnsaved: (path) => set(s => {
    const next = new Set(s.unsavedFiles);
    next.add(path);
    return { unsavedFiles: next };
  }),

  markSaved: (path) => set(s => {
    const next = new Set(s.unsavedFiles);
    next.delete(path);
    return { unsavedFiles: next };
  }),

  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),
  setAgentRunning: (running) => set({ isAgentRunning: running }),
  setStreamContent: (content) => set({ currentStreamContent: content }),
  appendStreamContent: (token) => set(s => ({ currentStreamContent: s.currentStreamContent + token })),
  addAgentEvent: (event) => set(s => ({ agentEvents: [...s.agentEvents, event] })),
  clearAgentEvents: () => set({ agentEvents: [] }),

  applyFilePatch: (file, content) => set(s => {
    const next = new Set(s.unsavedFiles);
    next.delete(file);
    return {
      fileContents: { ...s.fileContents, [file]: content },
      unsavedFiles: next,
    };
  }),

  setFontSize: (size) => set({ fontSize: Math.max(10, Math.min(24, size)) }),
  setMessages: (messages) => set({ messages }),

  reset: () => set({
    activeSession: null, fileTree: {}, activeFile: '', openFiles: [],
    unsavedFiles: new Set(), fileContents: {}, messages: [],
    isAgentRunning: false, currentStreamContent: '', agentEvents: [],
  }),
}));
