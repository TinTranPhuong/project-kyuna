import React, { useState, useEffect } from 'react'
import { useMemoryStore } from '@/store/memoryStore'
import ConversationMemoriesTab from '@/components/memory/ConversationMemoriesTab'
import DocumentLibraryTab from '@/components/memory/DocumentLibraryTab'
import UniversalFactsTab from '@/components/memory/UniversalFactsTab'
import MemorySearchTab from '@/components/memory/MemorySearchTab'

type TabId = 'conversation' | 'documents' | 'universals' | 'search'

const MemoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('conversation')
  const { fetchFacts, fetchDocuments, fetchUniversals } = useMemoryStore()

  useEffect(() => {
    fetchFacts()
    fetchDocuments()
    fetchUniversals()
  }, [fetchFacts, fetchDocuments, fetchUniversals])

  const tabs = [
    { id: 'conversation', label: 'Conversation Memories' },
    { id: 'documents', label: 'Document Library' },
    { id: 'universals', label: 'Universal Facts' },
    { id: 'search', label: 'Memory Search' },
  ]

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Memory & Knowledge</h1>
          <p className="text-gray-400 mt-2">
            Manage your AI's extracted memories, universal facts, and uploaded documents.
          </p>
        </header>

        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden flex flex-col min-h-[600px]">
          <div className="flex border-b border-white/10 bg-white/5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-white bg-white/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'conversation' && <ConversationMemoriesTab />}
            {activeTab === 'documents' && <DocumentLibraryTab />}
            {activeTab === 'universals' && <UniversalFactsTab />}
            {activeTab === 'search' && <MemorySearchTab />}
          </div>
        </div>

      </div>
    </div>
  )
}

export default MemoryPage