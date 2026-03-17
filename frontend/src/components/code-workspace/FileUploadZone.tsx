import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFiles } from '@/services/code-workspace.service';
import { useCodeWorkspaceStore } from '@/store/codeWorkspaceStore';

interface FileUploadZoneProps {
  sessionId: string;
}

export const FileUploadZone = ({ sessionId }: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setFileTree = useCodeWorkspaceStore(s => s.setFileTree);

  const handleUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setProgress(`Uploading ${files.length} files...`);

    try {
      const result = await uploadFiles(sessionId, files);
      setFileTree(result.file_tree);
      setProgress(`✓ Uploaded ${result.uploaded} files`);
      setTimeout(() => setProgress(''), 3000);
    } catch (err: any) {
      setProgress(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
        isDragging
          ? "border-emerald-500 bg-emerald-500/10 scale-[1.02]"
          : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10",
        isUploading && "opacity-60 pointer-events-none"
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      <Upload size={32} className={cn("mb-3 transition-colors", isDragging ? "text-emerald-400" : "text-white/40")} />
      <p className="text-sm font-medium text-white/70 mb-1">
        {isDragging ? 'Drop files here' : 'Drag a folder here'}
      </p>
      <p className="text-xs text-white/40">or click to browse</p>

      {progress && (
        <p className={cn("mt-3 text-xs font-medium", progress.startsWith('✓') ? "text-emerald-400" : progress.startsWith('Error') ? "text-red-400" : "text-white/60")}>
          {progress}
        </p>
      )}

      {/* Hidden file input with directory support */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        {...({ webkitdirectory: "true", directory: "true" } as any)}
        onChange={(e) => { if (e.target.files) handleUpload(e.target.files); }}
      />
    </div>
  );
};

export default FileUploadZone;
