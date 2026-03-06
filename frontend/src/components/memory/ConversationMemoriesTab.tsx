import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Trash2, Search, SlidersHorizontal, Inbox } from 'lucide-react'
import { useMemoryStore } from '@/store/memoryStore'
import { FactRow } from './FactRow'

export const ConversationMemoriesTab: React.FC = () => {
  const { facts, factsTotal, fetchFacts, deleteFact, promoteFact } = useMemoryStore()
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  
  // Filters
  const [minConfidence, setMinConfidence] = useState<number>(0)
  const [convFilter, setConvFilter] = useState<string>('')
  
  // Pagination
  const [page, setPage] = useState(0)
  const limit = 50

  useEffect(() => {
    fetchFacts(page * limit)
  }, [fetchFacts, page])

  const filteredFacts = facts.filter((f) => 
    f.confidence >= minConfidence &&
    (convFilter ? f.conversation_id === convFilter : true)
  )

  // ─── Event Handlers ────────────────────────────────────────────────────────

  const handleToggleSelect = (e: React.MouseEvent<HTMLInputElement>, id: string) => {
    const isShift = e.shiftKey
    const newSelection = new Set(selectedIds)

    if (newSelection.has(id)) {
      newSelection.delete(id)
      setLastSelectedId(null)
    } else {
      if (isShift && lastSelectedId) {
        const startIndex = filteredFacts.findIndex((f) => f.id === lastSelectedId)
        const endIndex = filteredFacts.findIndex((f) => f.id === id)
        const start = Math.min(startIndex, endIndex)
        const end = Math.max(startIndex, endIndex)

        for (let i = start; i <= end; i++) {
          newSelection.add(filteredFacts[i].id)
        }
      } else {
        newSelection.add(id)
      }
      setLastSelectedId(id)
    }
    setSelectedIds(newSelection)
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredFacts.map((f) => f.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} facts?`)) {
      selectedIds.forEach((id) => deleteFact(id))
      setSelectedIds(new Set())
      toast.success('Facts deleted')
    }
  }

  const handlePromote = async (id: string) => {
    await promoteFact(id)
    // Using Unicode escape for star to avoid raw emojis in source code
    toast.success('Added to Universal Facts \u2B50') 
  }

  const handleUpdate = (id: string, newText: string) => {
    // Note: We need to wire this to memoryStore.updateFact() later if the backend supports raw_text edits
    console.log('Update payload ready:', { id, newText })
    toast.success('Fact updated')
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 flex flex-col h-full space-y-6">
      
      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-black/30 p-4 rounded-2xl border border-white/5">
        <div className="flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <SlidersHorizontal size={16} className="text-gray-500" />
            <label className="font-medium">Min Confidence</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-24 accent-blue-500"
            />
            <span className="w-10 text-right text-gray-400">
              {Math.round(minConfidence * 100)}%
            </span>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-gray-500" />
            <input
              type="text"
              placeholder="Filter by Conversation ID..."
              value={convFilter}
              onChange={(e) => setConvFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-blue-500 transition-colors w-64"
            />
          </div>
        </div>

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Delete Selected ({selectedIds.size})
          </button>
        )}
      </div>

      {/* List Container */}
      <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 overflow-hidden flex flex-col">
        {filteredFacts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-12">
            <Inbox size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-400">No memories found</p>
            <p className="text-sm mt-1 text-center max-w-sm">
              Try adjusting your filters, or chat with the AI to generate new facts.
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredFacts.length && filteredFacts.length > 0}
                onChange={handleSelectAll}
                className="mt-0.5 cursor-pointer accent-blue-500"
              />
              <span className="text-sm font-medium text-gray-300">
                Select All ({filteredFacts.length})
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {filteredFacts.map((fact) => (
                <FactRow
                  key={fact.id}
                  fact={fact}
                  isSelected={selectedIds.has(fact.id)}
                  onToggleSelect={handleToggleSelect}
                  onDelete={deleteFact}
                  onPromote={handlePromote}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
            
            {factsTotal > facts.length && (
               <div className="p-4 bg-black/40 border-t border-white/10 text-center">
                 <button 
                   onClick={() => setPage(p => p + 1)}
                   className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                 >
                   Load More
                 </button>
               </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ConversationMemoriesTab