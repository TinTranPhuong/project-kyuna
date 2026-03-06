import React, { useEffect, useState } from 'react'
import { useMemoryStore } from '@/store/memoryStore'
import { DocumentUploadZone } from './DocumentUploadZone'
import { DocumentCard } from './DocumentCard'
import { ChunkViewer } from './ChunkViewer'
import { Inbox } from 'lucide-react'

export const DocumentLibraryTab: React.FC = () => {
  const { documents, fetchDocuments, deleteDocument } = useMemoryStore()
  const [viewingDocId, setViewingDocId] = useState<string | null>(null)

  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === 'processing')
    if (!hasProcessing) return

    const interval = setInterval(() => {
      fetchDocuments()
    }, 3000)

    return () => clearInterval(interval)
  }, [documents, fetchDocuments])

  const handleDelete = (id: string) => {
    deleteDocument(id)
    if (viewingDocId === id) {
      setViewingDocId(null)
    }
  }

  const viewingDocName = viewingDocId ? documents.find(d => d.id === viewingDocId)?.filename || 'Document' : ''

  return (
    <div className="p-6 relative h-full flex flex-col">
      <DocumentUploadZone />

      <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 overflow-hidden flex flex-col mt-2">
        {documents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-12">
            <Inbox size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-400">No documents yet</p>
            <p className="text-sm mt-1 text-center max-w-sm">
              Upload PDF, DOCX, TXT, or MD files above to extract semantic chunks for the AI's memory.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {documents.map((doc) => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                onDelete={() => handleDelete(doc.id)}
                onViewChunks={setViewingDocId}
              />
            ))}
          </div>
        )}
      </div>

      {viewingDocId && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-40" 
            onClick={() => setViewingDocId(null)}
          />
          <ChunkViewer 
            docId={viewingDocId} 
            filename={viewingDocName}
            onClose={() => setViewingDocId(null)} 
          />
        </>
      )}
    </div>
  )
}

export default DocumentLibraryTab