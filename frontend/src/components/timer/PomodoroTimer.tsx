import { useState } from 'react';
import { Settings, Maximize2, Camera } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

// Assume these will be imported from their respective files next
import TimerDisplay from './TimerDisplay';
import TimerControls from './TimerControls';
import SessionCounter from './SessionCounter';
import StopwatchTimer from './StopwatchTimer';

export const PomodoroTimer = () => {
  const { mode, setMode } = useTimerStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings state mapping
  const { 
    pomodoroWork, 
    pomodoroShortBreak, 
    pomodoroLongBreak, 
    setPomodoroWork, 
    setPomodoroShortBreak, 
    setPomodoroLongBreak 
  } = useSettingsStore();

  const tabOptions = [
    { label: 'POMODORO', value: 'pomodoro' },
    { label: 'STOPWATCH', value: 'stopwatch' }
  ];

  return (
    <div className={cn(
      "relative w-full max-w-md mx-auto p-6 flex flex-col items-center",
      "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
    )}>
      {/* Top Bar: Tabs & MVP Action Icons */}
      <div className="w-full flex justify-between items-center mb-8">
        <Tabs 
          tabs={tabOptions} 
          activeTab={mode} 
          onChange={(val) => setMode(val as 'pomodoro' | 'stopwatch')} 
        />
        
        <div className="flex items-center gap-3 text-white/40">
          <button className="hover:text-white transition-colors" aria-label="Screenshot">
            <Camera size={18} />
          </button>
          <button className="hover:text-white transition-colors" aria-label="Expand">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* Main Timer Body */}
      {mode === 'pomodoro' ? (
        <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
          <TimerDisplay />
          <TimerControls />
          
          <div className="w-full flex justify-between items-end mt-8">
            <SessionCounter />
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              aria-label="Timer Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
          <StopwatchTimer />
        </div>
      )}

      {/* Settings Modal */}
      <Modal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        title="Timer Settings"
      >
        <div className="space-y-4 py-2">
          <div className="flex justify-between items-center">
            <label className="text-sm text-white/80 font-medium">Work Duration (min)</label>
            <input 
              type="number" 
              value={pomodoroWork}
              onChange={(e) => setPomodoroWork(Number(e.target.value))}
              className="w-20 bg-surface-900 border border-white/10 rounded-md p-1.5 text-white text-center text-sm outline-none focus:border-primary-500"
              min={1}
            />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm text-white/80 font-medium">Short Break (min)</label>
            <input 
              type="number" 
              value={pomodoroShortBreak}
              onChange={(e) => setPomodoroShortBreak(Number(e.target.value))}
              className="w-20 bg-surface-900 border border-white/10 rounded-md p-1.5 text-white text-center text-sm outline-none focus:border-primary-500"
              min={1}
            />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm text-white/80 font-medium">Long Break (min)</label>
            <input 
              type="number" 
              value={pomodoroLongBreak}
              onChange={(e) => setPomodoroLongBreak(Number(e.target.value))}
              className="w-20 bg-surface-900 border border-white/10 rounded-md p-1.5 text-white text-center text-sm outline-none focus:border-primary-500"
              min={1}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PomodoroTimer;