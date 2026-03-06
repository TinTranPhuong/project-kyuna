import React, { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Edit2, Trash2, X, Link as LinkIcon } from 'lucide-react'
import { UniversalFact } from '@/types/memory.types'

interface UniversalFactRowProps {
  fact: UniversalFact
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, text: string) => void
}

export const UniversalFactRow: React.FC<UniversalFactRowProps> = ({ fact, onToggle, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(fact.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(editText.length, editText.length)
    }
  }, [isEditing, editText.length])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (editText.trim() && editText !== fact.content) {
        onUpdate(fact.id, editText.trim())
      }
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setEditText(fact.content)
      setIsEditing(false)
    }
  }

  return (
    <div className={`flex items-start gap-4 p-4 border-b border-white/10 hover:bg-white/5 transition-all duration-300 ${!fact.is_active ? 'opacity-50 grayscale-[50%]' : ''}`}>
      {/* Toggle Switch */}
      <button
        type="button"
        onClick={() => onToggle(fact.id)}
        className={`mt-1 relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${fact.is_active ? 'bg-blue-500' : 'bg-gray-600'}`}
        role="switch"
        aria-checked={fact.is_active}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${fact.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>

      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {fact.source === 'promoted' ? (
            <NavLink
              to={`/chat/${fact.origin_id}`}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
              title="View origin conversation"
            >
              <LinkIcon size={10} />
              Promoted
            </NavLink>
          ) : (
            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Manual
            </span>
          )}
        </div>

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
          <p className={`text-gray-200 text-sm leading-relaxed ${!fact.is_active ? 'line-through text-gray-400' : ''}`}>
            {fact.content}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
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