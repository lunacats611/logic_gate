import React, { useState, useEffect } from 'react';
import GatePalette from './components/GatePalette';
import Canvas from './components/Canvas';
import AnalysisPanel from './components/AnalysisPanel';
import { CircuitNode, Wire, GateType, TruthTableRow } from './types';
import { simulateCircuit, generateTruthTable, generateExpression } from './utils/circuitLogic';
import { Cpu, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<CircuitNode[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [truthTable, setTruthTable] = useState<TruthTableRow[]>([]);
  const [expression, setExpression] = useState<string>('');

  // Simulation Loop
  useEffect(() => {
    // Only simulate if structure exists
    const simulatedNodes = simulateCircuit(nodes, wires);
    
    // Check if values actually changed to prevent render loops
    const hasChanges = simulatedNodes.some((n, i) => n.value !== nodes[i].value);
    
    if (hasChanges) {
      setNodes(simulatedNodes);
    }
    
    // Calculate analysis data
    const table = generateTruthTable(simulatedNodes, wires);
    const expr = generateExpression(simulatedNodes, wires);
    
    setTruthTable(table);
    setExpression(expr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, wires, nodes.map(n => n.value).join(',')]); 

  const handleDragStart = (e: React.DragEvent, type: GateType) => {
    e.dataTransfer.setData('gateType', type);
  };

  const handleAddGate = (type: GateType, x: number, y: number) => {
    const inputCount = nodes.filter(n => n.type === GateType.INPUT).length;
    const outputCount = nodes.filter(n => n.type === GateType.OUTPUT).length;
    
    let label = '';
    if (type === GateType.INPUT) label = String.fromCharCode(65 + inputCount); 
    if (type === GateType.OUTPUT) label = `Y${outputCount}`; 

    const newNode: CircuitNode = {
      id: `node-${Date.now()}`,
      type,
      x: x,
      y: y,
      label,
      value: false
    };

    setNodes(prev => [...prev, newNode]);
  };

  const handleToggleInput = (id: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === id && n.type === GateType.INPUT) {
        return { ...n, value: !n.value };
      }
      return n;
    }));
  };

  const handleImportCircuit = (newNodes: CircuitNode[], newWires: Wire[]) => {
    setNodes(newNodes);
    setWires(newWires);
  };

  const handleClearCircuit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bubbling
    e.preventDefault();
    if (nodes.length === 0) return;
    
    if (window.confirm('Are you sure you want to clear the entire circuit? This action cannot be undone.')) {
      setNodes([]);
      setWires([]);
      setTruthTable([]);
      setExpression('');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 justify-between shrink-0 shadow-md z-20">
        <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 p-2 rounded-lg">
                <Cpu className="text-cyan-400" size={24} />
            </div>
            <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">LogicFlow AI</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={handleClearCircuit}
                type="button"
                disabled={nodes.length === 0}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded border transition-colors text-xs font-bold
                    ${nodes.length === 0 
                        ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-50' 
                        : 'bg-red-900/20 hover:bg-red-900/40 text-red-400 border-red-900/30 cursor-pointer'}
                `}
                title="Clear entire circuit"
            >
                <Trash2 size={14} className="pointer-events-none" />
                CLEAR
            </button>
            <div className="h-6 w-px bg-slate-800" />
            <div className="text-xs text-slate-500 font-mono">
                {nodes.length} nodes · {wires.length} wires
            </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        <GatePalette onDragStart={handleDragStart} />
        
        <div className="flex flex-col flex-1 relative">
            <Canvas 
                nodes={nodes} 
                wires={wires} 
                setNodes={setNodes} 
                setWires={setWires}
                onAddGate={handleAddGate}
                onToggleInput={handleToggleInput}
            />
            
            <AnalysisPanel 
                truthTable={truthTable}
                expression={expression}
                onImportCircuit={handleImportCircuit}
            />
        </div>
      </div>
    </div>
  );
};

export default App;