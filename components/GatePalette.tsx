import React from 'react';
import { GateType } from '../types';

interface GatePaletteProps {
  onDragStart: (e: React.DragEvent, type: GateType) => void;
}

const GateItem: React.FC<{ type: GateType; label: string; color: string; onDragStart: (e: React.DragEvent, type: GateType) => void }> = ({ type, label, color, onDragStart }) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, type)}
    className={`
      flex items-center justify-center p-3 mb-3 rounded-lg cursor-grab active:cursor-grabbing
      transition-all duration-200 hover:scale-105 shadow-lg border border-slate-700
      ${color} text-white font-bold text-sm tracking-wider select-none
    `}
  >
    {label}
  </div>
);

const GatePalette: React.FC<GatePaletteProps> = ({ onDragStart }) => {
  return (
    <div className="w-48 bg-slate-900 border-r border-slate-800 p-4 flex flex-col h-full overflow-y-auto z-10">
      <h2 className="text-slate-400 text-xs uppercase font-bold mb-4 tracking-widest">Components</h2>
      
      <GateItem type={GateType.INPUT} label="INPUT SWITCH" color="bg-emerald-600 hover:bg-emerald-500" onDragStart={onDragStart} />
      <GateItem type={GateType.OUTPUT} label="OUTPUT LAMP" color="bg-amber-600 hover:bg-amber-500" onDragStart={onDragStart} />
      
      <div className="h-px bg-slate-800 my-4" />
      
      <GateItem type={GateType.NOT} label="NOT" color="bg-rose-600 hover:bg-rose-500" onDragStart={onDragStart} />
      <GateItem type={GateType.AND} label="AND" color="bg-blue-600 hover:bg-blue-500" onDragStart={onDragStart} />
      <GateItem type={GateType.OR} label="OR" color="bg-purple-600 hover:bg-purple-500" onDragStart={onDragStart} />
      <GateItem type={GateType.NAND} label="NAND" color="bg-cyan-700 hover:bg-cyan-600" onDragStart={onDragStart} />
      <GateItem type={GateType.NOR} label="NOR" color="bg-fuchsia-700 hover:bg-fuchsia-600" onDragStart={onDragStart} />
      <GateItem type={GateType.XOR} label="XOR" color="bg-indigo-600 hover:bg-indigo-500" onDragStart={onDragStart} />
      
      <div className="mt-auto text-xs text-slate-600 pt-4 text-center">
        Drag components to canvas
      </div>
    </div>
  );
};

export default GatePalette;
