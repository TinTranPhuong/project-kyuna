import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'framer-motion';
import { X, Calculator as CalcIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculatorModalProps {
  onClose: () => void;
}

export default function CalculatorModal({ onClose }: CalculatorModalProps) {
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);

  // --- Calculator Logic State ---
  const [display, setDisplay] = useState('0');
  const [previous, setPrevious] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const handleNum = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDot = () => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperator = (op: string) => {
    const currentVal = parseFloat(display);

    if (previous === null) {
      setPrevious(currentVal);
    } else if (operator && !waitingForNewValue) {
      const result = calculate(previous, currentVal, operator);
      setDisplay(String(result));
      setPrevious(result);
    }

    setOperator(op);
    setWaitingForNewValue(true);
  };

  const calculate = (a: number, b: number, op: string) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? 0 : a / b;
      default: return b;
    }
  };

  const handleEqual = () => {
    if (operator && previous !== null) {
      const currentVal = parseFloat(display);
      const result = calculate(previous, currentVal, operator);
      setDisplay(String(result));
      setPrevious(null);
      setOperator(null);
      setWaitingForNewValue(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevious(null);
    setOperator(null);
    setWaitingForNewValue(false);
  };

  const handleToggleSign = () => {
    setDisplay(String(parseFloat(display) * -1));
  };

  const handlePercentage = () => {
    setDisplay(String(parseFloat(display) / 100));
  };

  // --- Button Configuration ---
  const buttons = [
    { label: 'AC', onClick: handleClear, className: 'text-red-400 bg-white/5 hover:bg-white/10' },
    { label: '+/-', onClick: handleToggleSign, className: 'text-white/70 bg-white/5 hover:bg-white/10' },
    { label: '%', onClick: handlePercentage, className: 'text-white/70 bg-white/5 hover:bg-white/10' },
    { label: '÷', onClick: () => handleOperator('/'), className: 'text-white bg-primary-600/80 hover:bg-primary-500' },
    
    { label: '7', onClick: () => handleNum('7'), className: 'text-white hover:bg-white/10' },
    { label: '8', onClick: () => handleNum('8'), className: 'text-white hover:bg-white/10' },
    { label: '9', onClick: () => handleNum('9'), className: 'text-white hover:bg-white/10' },
    { label: '×', onClick: () => handleOperator('*'), className: 'text-white bg-primary-600/80 hover:bg-primary-500' },
    
    { label: '4', onClick: () => handleNum('4'), className: 'text-white hover:bg-white/10' },
    { label: '5', onClick: () => handleNum('5'), className: 'text-white hover:bg-white/10' },
    { label: '6', onClick: () => handleNum('6'), className: 'text-white hover:bg-white/10' },
    { label: '-', onClick: () => handleOperator('-'), className: 'text-white bg-primary-600/80 hover:bg-primary-500 text-xl' },
    
    { label: '1', onClick: () => handleNum('1'), className: 'text-white hover:bg-white/10' },
    { label: '2', onClick: () => handleNum('2'), className: 'text-white hover:bg-white/10' },
    { label: '3', onClick: () => handleNum('3'), className: 'text-white hover:bg-white/10' },
    { label: '+', onClick: () => handleOperator('+'), className: 'text-white bg-primary-600/80 hover:bg-primary-500 text-xl' },
    
    { label: '0', onClick: () => handleNum('0'), className: 'text-white hover:bg-white/10 col-span-2 rounded-2xl' },
    { label: '.', onClick: handleDot, className: 'text-white hover:bg-white/10 text-xl' },
    { label: '=', onClick: handleEqual, className: 'text-white bg-white/20 hover:bg-white/30 text-xl font-bold' },
  ];

  return createPortal(
    <div ref={constraintsRef} className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      <motion.div
        drag dragControls={dragControls} dragListener={false} dragMomentum={false} dragElastic={0} dragConstraints={constraintsRef}
        initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute top-24 right-24 pointer-events-auto flex flex-col bg-black/70 backdrop-blur-3xl shadow-2xl border border-white/10 rounded-3xl w-72 overflow-hidden"
      >
        {/* --- Top Bar (Drag Handle) --- */}
        <div 
          className="h-10 px-4 flex items-center justify-between border-b border-white/5 bg-black/40 cursor-grab active:cursor-grabbing shrink-0"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex items-center gap-2 text-white/50" onPointerDown={e => e.stopPropagation()}>
            <CalcIcon size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Calculator</span>
          </div>
          <button 
            onPointerDown={e => e.stopPropagation()} onClick={onClose} 
            className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* --- Display Screen --- */}
        <div className="p-6 pb-4 flex flex-col items-end justify-end min-h-[100px]" onPointerDown={e => e.stopPropagation()}>
          <div className="text-white/40 text-xs font-mono h-4 mb-1">
            {previous !== null && operator ? `${previous} ${operator === '*' ? '×' : operator === '/' ? '÷' : operator}` : ''}
          </div>
          <div className="text-4xl text-white font-light tracking-tight truncate w-full text-right select-all">
            {display}
          </div>
        </div>

        {/* --- Keypad Grid --- */}
        <div className="grid grid-cols-4 gap-2 p-3 pt-0" onPointerDown={e => e.stopPropagation()}>
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              className={cn(
                "h-12 flex items-center justify-center text-lg rounded-xl transition-all active:scale-90 shadow-sm",
                btn.className
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}