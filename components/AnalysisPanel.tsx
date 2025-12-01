import React, { useState } from 'react';
import { TruthTableRow, CircuitNode, Wire } from '../types';
import { parseExpressionToCircuit } from '../services/geminiService';

interface AnalysisPanelProps {
  truthTable: TruthTableRow[];
  expression: string;
  onImportCircuit: (nodes: CircuitNode[], wires: Wire[]) => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ truthTable, expression, onImportCircuit }) => {
  const [inputExpr, setInputExpr] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!inputExpr.trim()) return;
    setIsGenerating(true);
    const result = await parseExpressionToCircuit(inputExpr);
    setIsGenerating(false);
    
    if (result) {
      onImportCircuit(result.nodes, result.wires);
    } else {
      alert("Failed to generate circuit. Please try a valid boolean expression like 'A AND B'. Check API Key.");
    }
  };

  return (
    <div className="h-72 bg-slate-900 border-t border-slate-800 flex flex-row z-10 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
      {/* Left: Truth Table */}
      <div className="flex-1 flex flex-col border-r border-slate-800 min-w-[300px]">
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-800/50">
           <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Truth Table</h3>
        </div>
        <div className="flex-1 overflow-auto p-0">
          {truthTable.length === 0 ? (
             <div className="h-full flex items-center justify-center text-slate-500 text-sm italic p-4">
               Connect inputs and outputs to generate table.
             </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse sticky-header">
               <thead className="bg-slate-900 sticky top-0 z-10 shadow-sm">
                 <tr>
                    {Object.keys(truthTable[0].inputs).map(key => (
                      <th key={key} className="border-b border-r border-slate-800 p-2 text-emerald-400 font-mono text-center w-12">{key}</th>
                    ))}
                    <th className="border-b border-r border-slate-800 p-2 w-8 text-slate-600 text-center">→</th>
                    {Object.keys(truthTable[0].outputs).map(key => (
                      <th key={key} className="border-b border-slate-800 p-2 text-amber-400 font-mono text-center w-12">{key}</th>
                    ))}
                 </tr>
               </thead>
               <tbody>
                  {truthTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 last:border-0">
                      {Object.values(row.inputs).map((val, i) => (
                        <td key={i} className={`p-2 border-r border-slate-800/50 font-mono text-center ${val ? 'text-white bg-emerald-900/20' : 'text-slate-500'}`}>
                          {val ? '1' : '0'}
                        </td>
                      ))}
                      <td className="p-2 border-r border-slate-800/50 text-center text-slate-700">→</td>
                      {Object.values(row.outputs).map((val, i) => (
                        <td key={i} className={`p-2 font-mono text-center ${val ? 'text-amber-300 font-bold bg-amber-900/20' : 'text-slate-500'}`}>
                          {val ? '1' : '0'}
                        </td>
                      ))}
                    </tr>
                  ))}
               </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: Expression & AI */}
      <div className="flex-1 flex flex-col min-w-[300px]">
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-800/50">
           <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Expression & AI Analysis</h3>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-6">
            {/* Expression */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Circuit Expression</h4>
              <div className="bg-slate-950 rounded p-3 border border-slate-700 font-mono text-cyan-300 text-sm break-all shadow-inner">
                {expression || <span className="text-slate-600 italic">No output connected</span>}
              </div>
            </div>

            {/* AI Input */}
            <div>
               <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">AI Circuit Generator</h4>
               <div className="flex gap-2 mb-2">
                 <input
                   type="text"
                   value={inputExpr}
                   onChange={(e) => setInputExpr(e.target.value)}
                   placeholder="Enter expression (e.g. A XOR B)"
                   className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-sm transition-all"
                   onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                 />
                 <button
                   onClick={handleGenerate}
                   disabled={isGenerating || !inputExpr}
                   className={`
                     px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all
                     ${isGenerating || !inputExpr 
                       ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                       : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-900/20 active:translate-y-0.5'}
                   `}
                 >
                   {isGenerating ? '...' : 'Build'}
                 </button>
               </div>
               <p className="text-[10px] text-slate-500">
                 Gemini AI will analyze your boolean expression and construct an optimized circuit layout automatically.
               </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;