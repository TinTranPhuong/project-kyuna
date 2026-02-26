import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, FileWarning } from 'lucide-react';
import { useTranslatorStore } from '@/store/translatorStore';
import { cn } from '@/lib/utils';

export const FileUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useTranslatorStore();

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateAndProcessFile = async (file: File) => {
    setError(null);
    setWarning(null);

    // 1. Enforce file types
    const validExtensions = ['.jpg', '.jpeg', '.png', '.cbz'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Only JPG, PNG, and CBZ are allowed.');
      return;
    }

    // 2. Enforce size limits
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > 100) {
      setError(`File is too large (${sizeInMB.toFixed(1)}MB). Maximum allowed is 100MB.`);
      return;
    }
    if (sizeInMB > 50) {
      setWarning(`Large file detected (${sizeInMB.toFixed(1)}MB). Processing may take longer than usual.`);
    }

    // 3. Trigger upload with progress callback
    try {
      await uploadFile(file, (percentCompleted) => {
        setProgress(percentCompleted);
      });
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-surface-900/50",
          isDragging ? "border-primary-500 bg-primary-500/10" : "border-white/10 hover:border-white/30 hover:bg-surface-800",
          isUploading && "pointer-events-none opacity-50"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept=".jpg,.jpeg,.png,.cbz"
          className="hidden"
        />
        
        <UploadCloud size={48} className={cn("mb-4 transition-colors", isDragging ? "text-primary-400" : "text-white/20")} />
        
        <h3 className="text-lg font-semibold text-white/80 mb-1">
          {isDragging ? 'Drop file here' : 'Click or drag file to upload'}
        </h3>
        <p className="text-sm text-white/40 text-center">
          Supports .JPG, .PNG, and .CBZ archives (Max 100MB)
        </p>

        {/* Upload Progress Bar */}
        {isUploading && progress > 0 && (
          <div className="w-full max-w-xs mt-6 space-y-2">
            <div className="flex justify-between text-xs text-white/60">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm border border-red-400/20 animate-in fade-in">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {warning && !error && (
        <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 p-3 rounded-lg text-sm border border-yellow-400/20 animate-in fade-in">
          <FileWarning size={16} />
          {warning}
        </div>
      )}
    </div>
  );
};

export default FileUploader;