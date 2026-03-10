import React, { useState } from 'react';
import { PlanStep } from '@/services/agent.service';
import { useChatStore } from '@/store/chatStore';
import { Check, X, Edit, Save } from 'lucide-react';

export const AgentPlanPanel: React.FC = () => {
  const { agentState, approvePlan, cancelPlan, editPlanStep, removePlanStep } = useChatStore();
  const [enableConsensus, setEnableConsensus] = useState(false);
  
  if (!agentState || agentState.planStatus !== 'pending') return null;
  
  const steps = agentState.planSteps;

  return (
    <div className="bg-black/20 border border-primary-500/20 rounded-xl p-4 my-4 max-w-full w-full">
      <h3 className="text-lg font-bold text-white mb-2 flex items-center">
        <span className="text-primary-400 mr-2">✦</span> Agent Plan
      </h3>
      <p className="text-sm text-white/50 mb-4">Please review and approve the execution plan below:</p>
      
      <div className="space-y-2 mb-4">
        {steps.map((step, idx) => (
          <PlanStepItem 
            key={idx} 
            step={step} 
            onEdit={(newDesc) => editPlanStep(idx, newDesc)} 
            onRemove={() => removePlanStep(idx)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70 hover:text-white transition-colors">
          <input
            type="checkbox"
            className="rounded border-none accent-primary-500 w-4 h-4 cursor-pointer"
            checked={enableConsensus}
            onChange={(e) => setEnableConsensus(e.target.checked)}
          />
          Enable Consensus (Double-check answer quality)
        </label>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={cancelPlan}
            className="px-4 py-2 border border-white/10 text-white/70 hover:bg-white/5 hover:text-white rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => approvePlan(steps, enableConsensus)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Check size={16} /> Approve Plan
          </button>
        </div>
      </div>
    </div>
  );
};

const PlanStepItem: React.FC<{ step: PlanStep, onEdit: (desc: string) => void, onRemove: () => void }> = ({ step, onEdit, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(step.description);

  const handleSave = () => {
    onEdit(editValue);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3">
        <span className="text-xs font-mono px-2 py-1 bg-black/40 text-primary-300 rounded block w-fit">
          {step.tool_name}
        </span>
        {isEditing ? (
          <input
            type="text"
            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-primary-500"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        ) : (
          <span className="text-sm text-white/80">{step.description}</span>
        )}
      </div>
      
      <div className="flex items-center gap-2 mt-2 md:mt-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {isEditing ? (
          <button onClick={handleSave} className="p-1 hover:bg-white/10 rounded text-green-400">
            <Save size={14} />
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-white/10 rounded text-blue-400">
            <Edit size={14} />
          </button>
        )}
        <button onClick={onRemove} className="p-1 hover:bg-rose-500/20 rounded text-rose-400">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
