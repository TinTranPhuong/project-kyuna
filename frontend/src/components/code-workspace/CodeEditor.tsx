import { useRef, useCallback } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import { useCodeWorkspaceStore } from '@/store/codeWorkspaceStore';
import { X, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Map our lang strings to Monaco language IDs
const MONACO_LANGS: Record<string, string> = {
  python: 'python', javascript: 'javascript', typescript: 'typescript',
  typescriptreact: 'typescript', javascriptreact: 'javascript',
  html: 'html', css: 'css', scss: 'scss', json: 'json',
  markdown: 'markdown', yaml: 'yaml', sql: 'sql', rust: 'rust',
  go: 'go', java: 'java', c: 'c', cpp: 'cpp', csharp: 'csharp',
  ruby: 'ruby', php: 'php', swift: 'swift', kotlin: 'kotlin',
  xml: 'xml', plaintext: 'plaintext', shellscript: 'shell',
  dockerfile: 'dockerfile', toml: 'ini',
};

export const CodeEditor = () => {
  const editorRef = useRef<any>(null);
  const {
    activeFile, openFiles, fileContents, fileTree,
    setActiveFile, closeFile, setFileContent, markUnsaved,
    fontSize, setFontSize,
  } = useCodeWorkspaceStore();

  const lang = fileTree[activeFile]?.lang || 'plaintext';
  const monacoLang = MONACO_LANGS[lang] || 'plaintext';
  const content = fileContents[activeFile] || '';

  const handleEditorWillMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('catppuccin', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'cba6f7' },
        { token: 'string', foreground: 'a6e3a1' },
        { token: 'number', foreground: 'fab387' },
        { token: 'type', foreground: 'f9e2af' },
        { token: 'function', foreground: '89b4fa' },
        { token: 'variable', foreground: 'cdd6f4' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editorLineNumber.foreground': '#585b70',
        'editorCursor.foreground': '#f5e0dc',
        'editor.selectionBackground': '#585b7040',
        'editor.inactiveSelectionBackground': '#31324480',
        'editor.lineHighlightBackground': '#31324450',
      }
    });
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined && activeFile) {
      setFileContent(activeFile, value);
      markUnsaved(activeFile);
    }
  }, [activeFile, setFileContent, markUnsaved]);

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1e1e2e] text-white/30 h-full">
        <div className="text-center">
          <p className="text-lg font-medium mb-1">No file open</p>
          <p className="text-sm">Select a file from the explorer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e]">
      {/* Tab bar + font size controls */}
      <div className="shrink-0 flex items-center bg-[#181825] border-b border-[#313244]">
        {/* Tabs */}
        <div className="flex-1 flex items-center overflow-x-auto custom-scrollbar">
          {openFiles.map(file => {
            const fileName = file.split('/').pop() || file;
            const isActive = file === activeFile;
            const isUnsaved = useCodeWorkspaceStore.getState().unsavedFiles.has(file);
            return (
              <div
                key={file}
                onClick={() => setActiveFile(file)}
                className={cn(
                  "group flex items-center gap-1.5 px-3 py-1.5 text-xs shrink-0 transition-colors border-r border-[#313244] cursor-pointer",
                  isActive ? "bg-[#1e1e2e] text-[#cdd6f4]" : "bg-[#181825] text-white/50 hover:text-white/80"
                )}
              >
                {isUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                <span>{fileName}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeFile(file); }}
                  className="ml-1 p-0.5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Font size controls */}
        <div className="shrink-0 flex items-center gap-1 px-2 border-l border-[#313244]">
          <button
            onClick={() => setFontSize(fontSize - 1)}
            className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
            title="Decrease font size"
          >
            <Minus size={12} />
          </button>
          <span className="text-[10px] text-white/40 w-6 text-center tabular-nums">{fontSize}</span>
          <button
            onClick={() => setFontSize(fontSize + 1)}
            className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
            title="Increase font size"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          theme="catppuccin"
          language={monacoLang}
          value={content}
          onChange={handleChange}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorMount}
          options={{
            fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: true, scale: 1 },
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
            padding: { top: 8 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
