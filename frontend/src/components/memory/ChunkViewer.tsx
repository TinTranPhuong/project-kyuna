import React, { useEffect, useState } from 'react'
import { X, Layers } from 'lucide-react'
import { memoryService } from '@/services/memory.service'
import { DocChunk } from '@/types/memory.types'
import Spinner from '@/components/ui/Spinner'

interface ChunkViewerProps {
  docId: string
  filename: string
  onClose: () => void
}

const ChunkItem: React.FC<{ chunk: DocChunk }> = ({ chunk }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="p-4 bg-black/40 border border-white/5 rounded-lg">
      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
        <span className="font-mono bg-white/5 px-2 py-0.5 rounded">Index: {chunk.chunk_index}</span>
        {chunk.page_number && <span>Page {chunk.page_number}</span>}
      </div>
      
      {chunk.section_heading && (
        <h4 className="text-sm font-medium text-gray-300 mb-2">{chunk.section_heading}</h4>
      )}
      
      <p className={`text-sm text-gray-400 leading-relaxed whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
        {chunk.content}
      </p>
      
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-blue-400 hover:text-blue-300 font-medium mt-2 focus:outline-none"
      >
        {isExpanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  )
}

export const ChunkViewer: React.FC<ChunkViewerProps> = ({ docId, filename, onClose }) => {
  const [chunks, setChunks] = useState<DocChunk[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadChunks = async () => {
      setLoading(true)
      try {
        const res = await memoryService.getChunks(docId, { limit: 100, offset: 0 })
        if (isMounted) setChunks(res.items)
      } catch (err) {
        console.error('Failed to load chunks', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadChunks()
    return () => { isMounted = false }
  }, [docId])

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#111] border-l border-white/10 shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-blue-400" />
          <h2 className="text-gray-200 font-medium truncate max-w-[200px]" title={filename}>
            {filename}
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : chunks.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-10">No chunks found for this document.</p>
        ) : (
          chunks.map(chunk => <ChunkItem key={chunk.id} chunk={chunk} />)
        )}
      </div>
    </div>
  )
}