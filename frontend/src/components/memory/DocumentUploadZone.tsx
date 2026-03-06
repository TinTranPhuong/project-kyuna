import React, { useState, useCallback, useRef } from 'react'
import { UploadCloud } from 'lucide-react'
import { useMemoryStore } from '@/store/memoryStore'
import ProgressBar from '@/components/ui/ProgressBar'

const ALLOWED_EXTS = ['.pdf', '.docx', '.txt', '.md']
const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export const DocumentUploadZone: React.FC = () => {
  const { uploadDocument, uploadProgress } = useMemoryStore()
  const [isDragging, setIsDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndUpload = (file: File) => {
    setLocalError(null)
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    
    if (!ALLOWED_EXTS.includes(ext)) {
      setLocalError(`Invalid file type. Allowed: ${ALLOWED_EXTS.join(', ')}`)
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError(`File exceeds ${MAX_SIZE_MB}MB limit.`)
      return
    }
    
    uploadDocument(file)
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0])
      e.dataTransfer.clearData()
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0])
      e.target.value = ''
    }
  }

  return (
    <div className="mb-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-white/20 bg-black/20 hover:bg-white/5 hover:border-white/40'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept={ALLOWED_EXTS.join(',')}
          onChange={handleFileSelect}
        />
        <UploadCloud className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <p className="text-gray-200 font-medium">Click to upload or drag and drop</p>
        <p className="text-sm text-gray-500 mt-1">PDF, DOCX, TXT, or MD (max {MAX_SIZE_MB}MB)</p>
      </div>
      
      {localError && (
        <p className="text-red-400 text-sm mt-2 font-medium">{localError}</p>
      )}

      {uploadProgress > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Uploading document...</span>
            <span>{uploadProgress}%</span>
          </div>
          <ProgressBar value={uploadProgress} />
        </div>
      )}
    </div>
  )
}