import { motion } from 'framer-motion';
import { useState } from 'react';
import { X, GripHorizontal } from 'lucide-react';

export default function Notepad({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");

  return (
    <motion.div
      drag
      dragMomentum={false}
      // Keeps the notepad constrained roughly to the screen
      dragConstraints={{ left: 0, right: 800, top: 0, bottom: 600 }} 
      className="fixed top-24 right-10 w-72 h-96 bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden z-50"
    >
      {/* Drag Handle */}
      <div className="bg-gray-900 p-3 flex justify-between items-center cursor-grab active:cursor-grabbing border-b border-gray-700">
        <div className="flex items-center text-gray-400">
          <GripHorizontal size={16} className="mr-2" />
          <span className="text-sm font-semibold text-gray-200">Quick Notes</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-teal-400 transition-colors">
          <X size={18} />
        </button>
      </div>
      
      {/* Text Area */}
      <textarea
        className="flex-1 w-full p-4 bg-transparent text-gray-100 resize-none outline-none text-base"
        placeholder="Jot down focus notes here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck="false"
      />
    </motion.div>
  );
}