import React, { useEffect, useState } from 'react'
import { Inbox, Plus } from 'lucide-react'
import { useMemoryStore } from '@/store/memoryStore'
import { UniversalFactRow } from './UniversalFactRow'

export const UniversalFactsTab: React.FC = () => {
  const { universals, fetchUniversals, addUniversalFact, toggleUniversalFact, deleteUniversal, updateUniversalFact } = useMemoryStore()
  const [newFactContent, setNewFactContent] = useState('')

  useEffect(() => {
    fetchUniversals()
  }, [fetchUniversals])

  const handleAddFact = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return
    if (!newFactContent.trim()) return

    addUniversalFact(newFactContent.trim())
    setNewFactContent('')
  }

  return (
    <div className="p-6 flex flex-col h-full space-y-6">
      
      {/* Add New Fact Input */}
      <div className="relative flex items-center bg-black/30 p-2 rounded-2xl border border-white/10 shadow-inner">
        <input
          type="text"
          placeholder="Add a new universal fact or rule (e.g., 'Always format code in Python 3.12+')..."
          value={newFactContent}
          onChange={(e) => setNewFactContent(e.target.value)}
          onKeyDown={handleAddFact}
          className="flex-1 bg-transparent border-none px-4 py-2 text-sm text-white placeholder:text-gray-500 outline-none"
        />
        <button
          onClick={() => handleAddFact()}
          disabled={!newFactContent.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-gray-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Rule
        </button>
      </div>

      {/* Facts List */}
      <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 overflow-hidden flex flex-col">
        {universals.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-12">
            <Inbox size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-400">No universal facts yet.</p>
            <p className="text-sm mt-1 text-center max-w-sm">
              Add rules the AI should always follow, or promote existing memories from your conversations.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {universals.map((fact) => (
              <UniversalFactRow
                key={fact.id}
                fact={fact}
                onToggle={toggleUniversalFact}
                onDelete={deleteUniversal}
                onUpdate={updateUniversalFact}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default UniversalFactsTab