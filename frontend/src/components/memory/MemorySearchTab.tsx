import React, { useState, useMemo } from 'react'
import { Search, BrainCircuit, FileText, Star } from 'lucide-react'
import { useMemoryStore } from '@/store/memoryStore'
import Tabs from '@/components/ui/Tabs'
import Skeleton from '@/components/ui/Skeleton'
import { SearchResultItem } from '@/types/memory.types'

// Helper component for individual result cards
const ResultCard: React.FC<{ item: SearchResultItem & { type: string } }> = ({ item }) => {
  const percent = Math.round(item.score * 100)
  
  // Color code based on score threshold
  const scoreColor = percent > 85 ? 'bg-green-400' : percent > 65 ? 'bg-yellow-400' : 'bg-blue-400'
  
  const p = item.payload
  const content = p.content || p.raw_text || 'No content available'
  
  // Determine icon and metadata based on source type
  let Icon = BrainCircuit
  let metaText = ''
  
  if (item.type === 'document') {
    Icon = FileText
    metaText = `${p.doc_filename || 'Document'}${p.page_number ? ` (Page ${p.page_number})` : ''}`
  } else if (item.type === 'universal') {
    Icon = Star
    metaText = `Universal Fact • ${p.source === 'promoted' ? 'Promoted' : 'Manual'}`
  } else {
    metaText = p.created_at ? new Date(p.created_at as string).toLocaleDateString() : 'Past Conversation'
  }

  return (
    <div className="p-4 bg-black/30 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
          <Icon size={14} className={item.type === 'universal' ? 'text-yellow-400' : 'text-blue-400'} />
          <span className="uppercase tracking-wider">{item.type}</span>
          <span>&bull;</span>
          <span>{metaText}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-300">{percent}% match</span>
          <div className="h-1.5 w-16 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full ${scoreColor}`} style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-200 leading-relaxed">{content as string}</p>
    </div>
  )
}

export const MemorySearchTab: React.FC = () => {
  const { search, searchResults, isSearching } = useMemoryStore()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      search(query.trim())
    }
  }

  // Combine and sort results for the "All" tab
  const allResults = useMemo(() => {
    if (!searchResults) return []
    return [
      ...searchResults.memories.map(m => ({ ...m, type: 'memory' })),
      ...searchResults.documents.map(d => ({ ...d, type: 'document' })),
      ...searchResults.universals.map(u => ({ ...u, type: 'universal' }))
    ].sort((a, b) => b.score - a.score)
  }, [searchResults])

  // Filter based on selected tab
  const displayedResults = useMemo(() => {
    if (!searchResults) return []
    if (activeTab === 'memories') return searchResults.memories.map(m => ({ ...m, type: 'memory' }))
    if (activeTab === 'documents') return searchResults.documents.map(d => ({ ...d, type: 'document' }))
    if (activeTab === 'universals') return searchResults.universals.map(u => ({ ...u, type: 'universal' }))
    return allResults
  }, [activeTab, searchResults, allResults])

  const tabOptions = [
    { value: 'all', label: `All (${allResults.length})` },
    { value: 'memories', label: `Memories (${searchResults?.memories.length || 0})` },
    { value: 'documents', label: `Documents (${searchResults?.documents.length || 0})` },
    { value: 'universals', label: `Universal Facts (${searchResults?.universals.length || 0})` }
  ]

  return (
    <div className="p-6 flex flex-col h-full space-y-6">
      
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search your AI's memories, documents, and universal facts..."
          className="w-full bg-black/40 border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-gray-500 outline-none focus:border-blue-500 focus:bg-black/60 transition-all text-lg shadow-inner"
        />
      </div>

      {/* Results Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {searchResults && (
          <div className="mb-4">
            <Tabs tabs={tabOptions} activeTab={activeTab} onChange={setActiveTab} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {isSearching ? (
            // Loading Skeletons
            <>
              <Skeleton className="h-28 w-full rounded-xl opacity-20" />
              <Skeleton className="h-28 w-full rounded-xl opacity-10" />
              <Skeleton className="h-28 w-full rounded-xl opacity-5" />
            </>
          ) : !searchResults ? (
            // Initial State
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-400">Semantic Search</p>
              <p className="text-sm mt-1 text-center max-w-sm">
                Type a query above to search through all embedded vector knowledge.
              </p>
            </div>
          ) : displayedResults.length === 0 ? (
            // Empty Results
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>No results found for this category.</p>
            </div>
          ) : (
            // Result Cards
            displayedResults.map((item) => (
              <ResultCard key={item.id} item={item} />
            ))
          )}
        </div>
      </div>

    </div>
  )
}

export default MemorySearchTab