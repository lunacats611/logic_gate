import React, { useRef, useState, useCallback, useMemo } from 'react';
import { CircuitNode, Wire, GateType } from '../types';
import { Trash2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface CanvasProps {
  nodes: CircuitNode[];
  wires: Wire[];
  setNodes: React.Dispatch<React.SetStateAction<CircuitNode[]>>;
  setWires: React.Dispatch<React.SetStateAction<Wire[]>>;
  onAddGate: (type: GateType, x: number, y: number) => void;
  onToggleInput: (id: string) => void;
}

const GATE_WIDTH = 80;
const GATE_HEIGHT = 60;

const Canvas: React.FC<CanvasProps> = ({ nodes, wires, setNodes, setWires, onAddGate, onToggleInput }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Wire creation
  const [tempWireStart, setTempWireStart] = useState<{ nodeId: string, pinIndex: number, type: 'input' | 'output' } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Helper to calculate World Coordinates from Mouse Event taking Zoom into account
  const getMouseWorldPos = (e: React.MouseEvent | React.DragEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const viewportX = e.clientX - rect.left;
    const viewportY = e.clientY - rect.top;
    
    return {
        x: (viewportX - pan.x) / zoom,
        y: (viewportY - pan.y) / zoom
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const { x: worldX, y: worldY } = getMouseWorldPos(e);
    setDragOffset({ x: worldX - node.x, y: worldY - node.y });
    setDraggingNode(nodeId);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      return; 
    }
    
    const { x: worldX, y: worldY } = getMouseWorldPos(e);
    setMousePos({ x: worldX, y: worldY });

    if (draggingNode) {
       setNodes(prev => prev.map(n => {
         if (n.id === draggingNode) {
           return {
             ...n,
             x: worldX - dragOffset.x,
             y: worldY - dragOffset.y
           };
         }
         return n;
       }));
    }
  }, [isPanning, draggingNode, dragOffset, setNodes, zoom, pan]);

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
    setTempWireStart(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('gateType') as GateType;
    if (!type) return;

    const { x: worldX, y: worldY } = getMouseWorldPos(e);
    onAddGate(type, worldX - GATE_WIDTH/2, worldY - GATE_HEIGHT/2);
  };

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setWires(prev => prev.filter(w => w.sourceNodeId !== id && w.targetNodeId !== id));
  };

  const deleteWire = (id: string) => {
    setWires(prev => prev.filter(w => w.id !== id));
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.5));
  const handleResetZoom = () => { setZoom(1); setPan({x: 0, y: 0}); };

  // Wire Connection Logic
  const handlePinMouseDown = (e: React.MouseEvent, nodeId: string, pinIndex: number, type: 'input' | 'output') => {
    e.stopPropagation();
    setTempWireStart({ nodeId, pinIndex, type });
  };
  
  const handlePinMouseUp = (e: React.MouseEvent, nodeId: string, pinIndex: number, type: 'input' | 'output') => {
     e.stopPropagation();
     if (!tempWireStart) return;
     if (tempWireStart.nodeId === nodeId) return;
     if (tempWireStart.type === type) return;

     const source = tempWireStart.type === 'output' ? tempWireStart : { nodeId, pinIndex };
     const target = tempWireStart.type === 'input' ? tempWireStart : { nodeId, pinIndex };

     setWires(prev => {
        const exists = prev.find(w => w.targetNodeId === target.nodeId && w.targetPinIndex === target.pinIndex);
        const newWire = {
            id: `wire-${Date.now()}`,
            sourceNodeId: source.nodeId,
            sourcePinIndex: source.pinIndex,
            targetNodeId: target.nodeId,
            targetPinIndex: target.pinIndex
        };
        if (exists) {
            return prev.map(w => w.id === exists.id ? newWire : w);
        }
        return [...prev, newWire];
     });
     setTempWireStart(null);
  };

  const getPinPos = (node: CircuitNode, index: number, type: 'input' | 'output') => {
    if (type === 'output') {
      return { x: node.x + GATE_WIDTH, y: node.y + GATE_HEIGHT / 2 };
    } else {
      const count = (node.type === GateType.NOT || node.type === GateType.OUTPUT) ? 1 : 2; 
      const step = GATE_HEIGHT / (count + 1);
      return { x: node.x, y: node.y + step * (index + 1) };
    }
  };

  // Offset based on SOURCE node hash
  const getWireOffset = (sourceId: string) => {
    let hash = 0;
    for (let i = 0; i < sourceId.length; i++) {
      hash = ((hash << 5) - hash) + sourceId.charCodeAt(i);
      hash |= 0;
    }
    // Return an offset between -10 and +20
    return (Math.abs(hash) % 7) * 5 - 10;
  };

  const getSimpleWirePath = (x1: number, y1: number, x2: number, y2: number) => {
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  };

  // Calculate Wire Geometry with Shared Trunks, Jumps, and Junction Dots
  const { processedWires, junctionPoints } = useMemo(() => {
    // 1. Group wires by Source to create shared trunks
    const wiresBySource: Record<string, Wire[]> = {};
    wires.forEach(w => {
        if (!wiresBySource[w.sourceNodeId]) wiresBySource[w.sourceNodeId] = [];
        wiresBySource[w.sourceNodeId].push(w);
    });

    const segments: any[] = [];
    const junctions: {x: number, y: number, color: string}[] = [];

    Object.values(wiresBySource).forEach(groupWires => {
        if (groupWires.length === 0) return;
        
        const sourceNode = nodes.find(n => n.id === groupWires[0].sourceNodeId);
        if (!sourceNode) return;

        const start = getPinPos(sourceNode, groupWires[0].sourcePinIndex, 'output');
        
        // Find common MidX for the group
        // Get all target X coordinates to find the "first" target
        const targetXs = groupWires.map(w => {
            const tNode = nodes.find(n => n.id === w.targetNodeId);
            return tNode ? getPinPos(tNode, w.targetPinIndex, 'input').x : start.x + 100;
        });

        const minTargetX = Math.min(...targetXs);
        const offset = getWireOffset(groupWires[0].sourceNodeId);
        
        // Calculate shared trunk X position
        // We calculate midpoint between source and the NEAREST target
        let commonMidX = (start.x + minTargetX) / 2 + offset;
        
        // Safety clamps to keep wires reasonable
        if (commonMidX < start.x + 20) commonMidX = start.x + 20;
        if (commonMidX > minTargetX - 20) commonMidX = minTargetX - 20;
        // Fallback for very tight spaces
        if (minTargetX <= start.x + 40) commonMidX = start.x + (minTargetX - start.x) / 2;

        const allYs = [start.y];

        // Create segments for each wire using the SHARED commonMidX
        groupWires.forEach(wire => {
            const targetNode = nodes.find(n => n.id === wire.targetNodeId);
            if (!targetNode) return;
            const end = getPinPos(targetNode, wire.targetPinIndex, 'input');
            allYs.push(end.y);

            segments.push({
                id: wire.id,
                sourceId: wire.sourceNodeId,
                start,
                end,
                midX: commonMidX, // Shared!
                minY: Math.min(start.y, end.y),
                maxY: Math.max(start.y, end.y),
                isActive: sourceNode.value
            });
        });

        // Calculate Junction Dots (3-way connections)
        if (groupWires.length > 1) {
             const minY = Math.min(...allYs);
             const maxY = Math.max(...allYs);
             // Check significant Y points (start and targets)
             const uniqueYs = Array.from(new Set(allYs.map(y => Math.round(y))));

             uniqueYs.forEach(y => {
                 // Determine connection count at (commonMidX, y)
                 let connections = 0;
                 
                 // 1. Trunk Up exists?
                 if (y > Math.round(minY)) connections++;
                 // 2. Trunk Down exists?
                 if (y < Math.round(maxY)) connections++;
                 // 3. Source connects here? (Left)
                 if (Math.abs(y - Math.round(start.y)) < 1) connections++;
                 // 4. Targets connect here? (Right)
                 const targetsAtY = groupWires.filter(w => {
                     const tNode = nodes.find(n => n.id === w.targetNodeId);
                     const p = tNode ? getPinPos(tNode, w.targetPinIndex, 'input') : null;
                     return p && Math.abs(p.y - y) < 1;
                 }).length;
                 connections += targetsAtY;

                 // If 3 or more lines meet, it's a junction point
                 if (connections >= 3) {
                     junctions.push({
                         x: commonMidX,
                         y: y,
                         color: sourceNode.value ? "#22d3ee" : "#475569"
                     });
                 }
             });
        }
    });

    // 2. Build paths with jumps
    const finalWires = segments.map(current => {
      const jumps: number[] = [];
      
      segments.forEach(other => {
        // Do not jump over wires from the SAME source group (they are electrically connected)
        if (other.sourceId === current.sourceId) return;
        
        const checkIntersection = (y: number, x1: number, x2: number) => {
          if (y > current.minY + 8 && y < current.maxY - 8) {
             const minX = Math.min(x1, x2);
             const maxX = Math.max(x1, x2);
             if (current.midX > minX && current.midX < maxX) {
                jumps.push(y);
             }
          }
        };

        // Check intersection with other's horizontal segments
        checkIntersection(other.start.y, other.start.x, other.midX); // Source -> Trunk
        checkIntersection(other.end.y, other.midX, other.end.x);     // Trunk -> Target
      });

      const isGoingDown = current.end.y > current.start.y;
      jumps.sort((a, b) => isGoingDown ? a - b : b - a);
      
      const uniqueJumps = jumps.filter((y, index, self) => 
        index === 0 || Math.abs(y - self[index - 1]) > 10
      );

      let d = `M ${current.start.x} ${current.start.y} L ${current.midX} ${current.start.y}`;
      let currentY = current.start.y;
      const arcRadius = 5;

      uniqueJumps.forEach(jumpY => {
         const dist = isGoingDown ? -arcRadius : arcRadius;
         d += ` L ${current.midX} ${jumpY + dist}`;
         const sweep = 1; 
         const dy = isGoingDown ? arcRadius * 2 : -arcRadius * 2;
         d += ` a ${arcRadius} ${arcRadius} 0 0 ${sweep} 0 ${dy}`;
      });

      d += ` L ${current.midX} ${current.end.y} L ${current.end.x} ${current.end.y}`;

      return { ...current, path: d };
    });

    return { processedWires: finalWires, junctionPoints: junctions };

  }, [nodes, wires]);

  const renderGateShape = (node: CircuitNode) => {
    const isHigh = node.value;
    const glowClass = isHigh ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : '';
    const strokeColor = isHigh ? '#22d3ee' : '#475569';
    const fillColor = '#1e293b'; 

    let path = '';
    const isInverted = node.type === GateType.NOT || node.type === GateType.NAND || node.type === GateType.NOR;
    
    switch(node.type) {
        case GateType.AND: path = "M 0 0 L 50 0 A 30 30 0 0 1 50 60 L 0 60 Z"; break; // Standard D-shape
        case GateType.OR: path = "M 0 0 C 10 0 15 20 15 30 C 15 40 10 60 0 60 C 40 60 60 45 80 30 C 60 15 40 0 0 0 Z"; break;
        case GateType.XOR: path = "M 10 0 C 20 0 25 20 25 30 C 25 40 20 60 10 60 C 50 60 70 45 90 30 C 70 15 50 0 10 0 Z M -5 0 C 5 0 10 20 10 30 C 10 40 5 60 -5 60"; break; 
        case GateType.NOT: path = "M 0 5 L 66 30 L 0 55 Z"; break; 
        case GateType.NAND: path = "M 0 0 L 36 0 A 30 30 0 0 1 36 60 L 0 60 Z"; break; // Shortened D-shape for bubble
        case GateType.NOR: path = "M 0 0 C 10 0 15 20 15 30 C 15 40 10 60 0 60 C 40 60 55 45 66 30 C 55 15 40 0 0 0 Z"; break; 
        default: path = "M 0 0 L 80 0 L 80 60 L 0 60 Z";
    }

    return (
        <g>
            <path d={path} fill={fillColor} stroke={strokeColor} strokeWidth="2" className={glowClass} />
            {isInverted && (
                 <>
                    <circle cx="71" cy="30" r="5" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
                    <line x1="76" y1="30" x2="80" y2="30" stroke={strokeColor} strokeWidth="2" />
                 </>
            )}
            <text x="40%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold" transform={`translate(${isInverted ? 25 : 35}, 30)`}>
                {node.type}
            </text>
        </g>
    );
  };

  const tempWirePoints = (() => {
    if (!tempWireStart) return null;
    const node = nodes.find(n => n.id === tempWireStart.nodeId);
    if (!node) return null;
    const pinPos = getPinPos(node, tempWireStart.pinIndex, tempWireStart.type === 'input' ? 'input' : 'output');
    if (tempWireStart.type === 'output') return { x1: pinPos.x, y1: pinPos.y, x2: mousePos.x, y2: mousePos.y };
    else return { x1: mousePos.x, y1: mousePos.y, x2: pinPos.x, y2: pinPos.y };
  })();

  return (
    <div 
        ref={canvasRef}
        className={`flex-1 bg-slate-950 relative overflow-hidden cursor-crosshair select-none ${isPanning ? 'cursor-grabbing' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                setZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, 0.5), 2));
            }
        }}
    >
      <div 
        className="absolute inset-0 grid-bg pointer-events-none opacity-50"
        style={{ 
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px` 
        }}
      />

      <div 
        className="absolute inset-0 w-full h-full origin-top-left"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
          {/* Wires Layer */}
          <svg className="absolute top-0 left-0 overflow-visible" style={{ width: 1, height: 1 }}>
            {processedWires.map(wire => (
                <g 
                    key={wire.id} 
                    className="group cursor-pointer pointer-events-auto"
                    onContextMenu={(e) => { e.preventDefault(); deleteWire(wire.id); }}
                >
                    <path d={wire.path} stroke="transparent" strokeWidth="12" fill="none" />
                    <path 
                        d={wire.path}
                        stroke={wire.isActive ? "#22d3ee" : "#475569"}
                        strokeWidth="2.5"
                        fill="none"
                        className="transition-colors duration-300 group-hover:stroke-red-500/70"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                </g>
            ))}

            {/* Junction Dots (Rendered after wires to sit on top) */}
            {junctionPoints.map((pt, i) => (
                <circle 
                    key={`j-${i}`}
                    cx={pt.x} 
                    cy={pt.y} 
                    r={5} 
                    fill={pt.color}
                    className="pointer-events-none"
                />
            ))}

            {tempWirePoints && (
                <path 
                    d={getSimpleWirePath(tempWirePoints.x1, tempWirePoints.y1, tempWirePoints.x2, tempWirePoints.y2)}
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    fill="none"
                    className="pointer-events-none"
                />
            )}
          </svg>

          {/* Nodes Layer */}
          {nodes.map(node => (
            <div
              key={node.id}
              className="absolute group hover:z-10"
              style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: GATE_WIDTH, height: GATE_HEIGHT }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
                {node.type !== GateType.INPUT && (
                    <>
                        <div 
                            className={`absolute -left-2 w-4 h-4 rounded-full bg-slate-700 hover:bg-cyan-400 cursor-pointer z-20 flex items-center justify-center border border-slate-900 
                            ${(node.type === GateType.NOT || node.type === GateType.OUTPUT) ? 'top-1/2 -translate-y-1/2' : 'top-[15px]'}`}
                            onMouseDown={(e) => handlePinMouseDown(e, node.id, 0, 'input')}
                            onMouseUp={(e) => handlePinMouseUp(e, node.id, 0, 'input')}
                        >
                            <div className="w-1.5 h-1.5 bg-slate-950 rounded-full"/>
                        </div>
                        {node.type !== GateType.NOT && node.type !== GateType.OUTPUT && (
                            <div 
                                className="absolute -left-2 bottom-[15px] w-4 h-4 rounded-full bg-slate-700 hover:bg-cyan-400 cursor-pointer z-20 flex items-center justify-center border border-slate-900"
                                onMouseDown={(e) => handlePinMouseDown(e, node.id, 1, 'input')}
                                onMouseUp={(e) => handlePinMouseUp(e, node.id, 1, 'input')}
                            >
                                <div className="w-1.5 h-1.5 bg-slate-950 rounded-full"/>
                            </div>
                        )}
                    </>
                )}
                {node.type !== GateType.OUTPUT && (
                    <div 
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-700 hover:bg-cyan-400 cursor-pointer z-20 flex items-center justify-center border border-slate-900"
                        onMouseDown={(e) => handlePinMouseDown(e, node.id, 0, 'output')}
                        onMouseUp={(e) => handlePinMouseUp(e, node.id, 0, 'output')}
                    >
                        <div className="w-1.5 h-1.5 bg-slate-950 rounded-full"/>
                    </div>
                )}
                <svg width={GATE_WIDTH + 20} height={GATE_HEIGHT} className="overflow-visible pointer-events-none">
                    {node.type === GateType.INPUT ? (
                        <g onClick={(e) => { e.stopPropagation(); onToggleInput(node.id); }} className="cursor-pointer pointer-events-auto">
                            <rect x="0" y="10" width="60" height="40" rx="4" fill={node.value ? '#059669' : '#1e293b'} stroke={node.value ? '#34d399' : '#475569'} strokeWidth="2" />
                            <text x="30" y="35" textAnchor="middle" fill="white" fontWeight="bold" fontSize="12">{node.label}</text>
                            <text x="30" y="45" textAnchor="middle" fill={node.value ? "#a7f3d0" : "#94a3b8"} fontSize="8" dy="1">{node.value ? 'ON' : 'OFF'}</text>
                        </g>
                    ) : node.type === GateType.OUTPUT ? (
                        <g>
                            <circle cx="40" cy="30" r="20" fill={node.value ? '#f59e0b' : '#1e293b'} stroke={node.value ? '#fbbf24' : '#475569'} strokeWidth="3" className={node.value ? "drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" : ""} />
                            <text x="40" y="35" textAnchor="middle" fill={node.value ? "#78350f" : "#94a3b8"} fontWeight="bold">{node.label}</text>
                        </g>
                    ) : (
                        renderGateShape(node)
                    )}
                </svg>
                <button 
                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                    className="absolute -top-3 -right-3 p-1 bg-red-500/80 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white shadow-sm z-30 cursor-pointer"
                >
                    <Trash2 size={12} />
                </button>
            </div>
          ))}
      </div>
      
      {/* Controls Overlay */}
      <div className="absolute bottom-4 right-4 flex gap-2">
         <div className="bg-slate-800/80 text-slate-400 p-1 rounded flex items-center gap-1 shadow border border-slate-700 backdrop-blur-sm">
            <button onClick={handleZoomOut} className="p-1 hover:text-white hover:bg-slate-700 rounded"><ZoomOut size={16}/></button>
            <span className="text-xs font-mono min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-1 hover:text-white hover:bg-slate-700 rounded"><ZoomIn size={16}/></button>
            <div className="w-px h-4 bg-slate-600 mx-1"></div>
            <button onClick={handleResetZoom} className="p-1 hover:text-white hover:bg-slate-700 rounded" title="Reset View"><Maximize size={16}/></button>
         </div>
      </div>
    </div>
  );
};

export default Canvas;