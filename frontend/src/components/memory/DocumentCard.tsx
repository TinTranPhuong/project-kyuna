import React from 'react'
import { FileText, Trash2, Eye, AlertCircle } from 'lucide-react'
import { Document } from '@/types/memory.types'
import Spinner from '@/components/ui/Spinner'

interface DocumentCardProps {
  doc: Document
  onDelete: (id: string, filename: string, chunkCount: number) => void
  onViewChunks: (id: string) => void
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ doc, onDelete, onViewChunks }) => {
  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(2)} MB`
  }

  const handleDelete = () => {
    if (window.confirm(`Delete '${doc.filename}'? This will remove ${doc.chunk_count} indexed chunks.`)) {
      onDelete(doc.id, doc.filename, doc.chunk_count)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-4 overflow-hidden">
        <div className="p-3 bg-white/5 rounded-lg text-blue-400 shrink-0">
          <FileText size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-gray-200 font-medium truncate">{doc.filename}</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            <span className="uppercase">{doc.file_type}</span>
            <span>&bull;</span>
            <span>{formatSize(doc.file_size_bytes)}</span>
            <span>&bull;</span>
            <span>{doc.chunk_count} chunks</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 pl-4">
        {/* Status Badge */}
        {doc.status === 'processing' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20">
            <Spinner size="sm" />
            Processing
          </div>
        )}
        {doc.status === 'ready' && (
          <div className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium border border-green-500/20">
            Ready
          </div>
        )}
        {doc.status === 'failed' && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium border border-red-500/20" title={doc.error_message || 'Processing failed'}>
            <AlertCircle size={14} />
            Failed
          </div>
        )}

        <div className="flex items-center gap-1 border-l border-white/10 pl-4">
          <button
            onClick={() => onViewChunks(doc.id)}
            disabled={doc.status !== 'ready' || doc.chunk_count === 0}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            title="View Chunks"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Delete Document"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}