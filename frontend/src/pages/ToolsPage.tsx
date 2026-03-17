import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StickyNote, Languages, ArrowRight, Wrench, Code2 } from 'lucide-react';

export default function ToolsPage() {
  const navigate = useNavigate();

  const tools = [
    {
      id: 'notes',
      name: 'Notes',
      description: 'Manage your quick thoughts, tasks, and code snippets.',
      icon: <StickyNote size={32} className="text-blue-400" />,
      action: () => navigate('/notes'), 
      gradient: 'from-blue-500/20 to-blue-900/10',
      hoverBorder: 'hover:border-blue-500/50',
    },
    {
      id: 'translate',
      name: 'Translate',
      description: 'AI-powered document and manga translation pipeline.',
      icon: <Languages size={32} className="text-purple-400" />,
      action: () => navigate('/translate'),
      gradient: 'from-purple-500/20 to-purple-900/10',
      hoverBorder: 'hover:border-purple-500/50',
    },
    {
      id: 'code-workspace',
      name: 'Code Workspace',
      description: 'AI-powered coding environment with 9 specialist agents.',
      icon: <Code2 size={32} className="text-emerald-400" />,
      action: () => navigate('/code-workspace'),
      gradient: 'from-emerald-500/20 to-emerald-900/10',
      hoverBorder: 'hover:border-emerald-500/50',
    }
  ];

  return (
    <div className="w-full h-full p-8 overflow-y-auto text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
            <Wrench size={28} className="text-black-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tools Hub</h1>
            <p className="text-white-400 mt-1">Access your development and productivity utilities.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.id}
              onClick={tool.action}
              className={`group relative flex flex-col p-6 cursor-pointer rounded-2xl border border-white/10 bg-gradient-to-br ${tool.gradient} backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${tool.hoverBorder} shadow-lg`}
            >
              <div className="mb-4 p-3 bg-black/40 inline-flex rounded-lg border border-white/5 w-fit">
                {tool.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-white transition-colors">
                {tool.name}
              </h3>
              <p className="text-white-900 text-sm flex-grow mb-6">
                {tool.description}
              </p>
              
              <div className="flex items-center text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                Launch Tool 
                <ArrowRight size={16} className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </div>
            </div>
          ))}
          
          {/* Placeholder for future tools */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-white/20 bg-black/20 text-gray-500 min-h-[240px]">
            <Wrench size={24} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">More tools coming soon</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}