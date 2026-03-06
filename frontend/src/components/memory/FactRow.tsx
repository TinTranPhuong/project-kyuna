import React, { useState, useRef, useEffect } from 'react'
import { Star, Edit2, Trash2, X } from 'lucide-react'
import { MemoryFact } from '@/types/memory.types'

interface FactRowProps {
  fact: MemoryFact
  isSelected: boolean
  onToggleSelect: (e: React.MouseEvent<HTMLInputElement>, id: string) => void
  onDelete: (id: string) => void
  onPromote: (id: string) => void
  onUpdate: (id: string, text: string) => void
}

export const FactRow: React.FC<FactRowProps> = ({
  fact,
  isSelected,
  onToggleSelect,
  onDelete,
  onPromote,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(fact.raw_text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const confidenceColor =
    fact.confidence > 0.85
      ? 'bg-green-400'
      : fact.confidence >= 0.65
      ? 'bg-yellow-400'
      : 'bg-red-400'

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to the end
      textareaRef.current.setSelectionRange(editText.length, editText.length)
    }
  }, [isEditing, editText.length])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onUpdate(fact.id, editText)
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setEditText(fact.raw_text)
      setIsEditing(false)
    }
  }

  const handlePromote = () => {
    if (window.confirm('Promote this fact to Universal Facts?')) {
      onPromote(fact.id)
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 border-b border-white/10 hover:bg-white/5 transition-colors">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {}} // React requires onChange if checked is provided, but we handle via onClick for shiftKey
        onClick={(e) => onToggleSelect(e, fact.id)}
        className="mt-1.5 cursor-pointer accent-blue-500"
      />
      
      <div className="flex-1 space-y-2">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-black/50 border border-white/20 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors resize-none"
            rows={2}
          />
        ) : (
          <p className="text-gray-200 text-sm leading-relaxed">{fact.raw_text}</p>
        )}
        
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-32 bg-gray-800 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full ${confidenceColor} transition-all duration-500`}
              style={{ width: `${Math.round(fact.confidence * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {Math.round(fact.confidence * 100)}% Confidence
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
        <button
          onClick={handlePromote}
          className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
          title="Promote to Universal Fact"
        >
          <Star size={18} />
        </button>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
          title={isEditing ? 'Cancel Edit' : 'Edit Fact'}
        >
          {isEditing ? <X size={18} /> : <Edit2 size={18} />}
        </button>
        <button
          onClick={() => onDelete(fact.id)}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          title="Delete Fact"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}