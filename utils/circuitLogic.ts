import { GateType, CircuitNode, Wire, TruthTableRow } from '../types';

// Helper to get input values for a node based on wires
const getNodeInputs = (nodeId: string, wires: Wire[], allNodes: CircuitNode[]): (boolean | undefined)[] => {
  // Find wires connected to this node's inputs
  const inputWires = wires.filter(w => w.targetNodeId === nodeId);
  
  // Sort by pin index to ensure input 0 is first, input 1 is second
  inputWires.sort((a, b) => a.targetPinIndex - b.targetPinIndex);

  const inputs: (boolean | undefined)[] = [undefined, undefined]; // Max 2 inputs for basic gates

  inputWires.forEach(w => {
    const sourceNode = allNodes.find(n => n.id === w.sourceNodeId);
    if (sourceNode && w.targetPinIndex < 2) {
      inputs[w.targetPinIndex] = sourceNode.value;
    }
  });

  return inputs;
};

// Evaluate a single gate
export const evaluateGate = (type: GateType, inputs: (boolean | undefined)[]): boolean => {
  const a = inputs[0] === true; // Treat undefined as false for stability
  const b = inputs[1] === true;

  switch (type) {
    case GateType.AND: return a && b;
    case GateType.OR: return a || b;
    case GateType.NOT: return !a;
    case GateType.NAND: return !(a && b);
    case GateType.NOR: return !(a || b);
    case GateType.XOR: return (a && !b) || (!a && b);
    case GateType.INPUT: return a; // Should be set manually, but this is a fallback
    case GateType.OUTPUT: return a; // Pass through
    default: return false;
  }
};

// Topological sort / Simulation step
// For simplicity in this reactive model, we will perform a multi-pass propagation
// to handle the depth of the circuit.
export const simulateCircuit = (nodes: CircuitNode[], wires: Wire[]): CircuitNode[] => {
  let newNodes = [...nodes];
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 50; // Prevent infinite loops

  // Initialize: Inputs keep their values, others reset (optional, but good for cleanliness)
  // Actually, we keep previous state to support latches if we wanted, but for combinational
  // logic, strictly calculating from inputs is safer.
  
  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    const nextNodes = newNodes.map(node => {
      if (node.type === GateType.INPUT) return node; // Inputs are driven by user

      const inputs = getNodeInputs(node.id, wires, newNodes);
      const newValue = evaluateGate(node.type, inputs);

      if (newValue !== node.value) {
        changed = true;
        return { ...node, value: newValue };
      }
      return node;
    });
    newNodes = nextNodes;
    iterations++;
  }

  return newNodes;
};

// Generate Truth Table
export const generateTruthTable = (nodes: CircuitNode[], wires: Wire[]): TruthTableRow[] => {
  const inputs = nodes.filter(n => n.type === GateType.INPUT).sort((a, b) => a.label.localeCompare(b.label));
  const outputs = nodes.filter(n => n.type === GateType.OUTPUT).sort((a, b) => a.label.localeCompare(b.label));

  if (inputs.length === 0) return [];

  const numRows = 1 << inputs.length; // 2^n
  const table: TruthTableRow[] = [];

  for (let i = 0; i < numRows; i++) {
    // 1. Set Input States
    let tempNodes = nodes.map(node => {
      if (node.type === GateType.INPUT) {
        const inputIndex = inputs.findIndex(inp => inp.id === node.id);
        // Extract bit value
        const val = ((i >> (inputs.length - 1 - inputIndex)) & 1) === 1;
        return { ...node, value: val };
      }
      return node;
    });

    // 2. Simulate
    tempNodes = simulateCircuit(tempNodes, wires);

    // 3. Record Result
    const rowInputs: Record<string, boolean> = {};
    inputs.forEach((inp, idx) => {
      // Re-find the input in tempNodes to be safe, though ID mapping works
      rowInputs[inp.label] = ((i >> (inputs.length - 1 - idx)) & 1) === 1;
    });

    const rowOutputs: Record<string, boolean> = {};
    outputs.forEach(out => {
      const computedNode = tempNodes.find(n => n.id === out.id);
      rowOutputs[out.label] = computedNode ? computedNode.value : false;
    });

    table.push({ inputs: rowInputs, outputs: rowOutputs });
  }

  return table;
};

// Generate Expression (Recursive)
export const generateExpression = (nodes: CircuitNode[], wires: Wire[]): string => {
  const outputs = nodes.filter(n => n.type === GateType.OUTPUT);
  if (outputs.length === 0) return "No Output";

  const buildExpr = (nodeId: string, visited: Set<string>): string => {
    if (visited.has(nodeId)) return "[LOOP]";
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return "?";

    if (node.type === GateType.INPUT) return node.label;

    // Find sources
    const inputWires = wires.filter(w => w.targetNodeId === nodeId).sort((a, b) => a.targetPinIndex - b.targetPinIndex);
    const sources = inputWires.map(w => buildExpr(w.sourceNodeId, new Set(visited)));

    if (sources.length === 0) return node.label || "?";

    const a = sources[0] || "0";
    const b = sources[1] || "0";

    switch (node.type) {
      case GateType.AND: return `(${a} · ${b})`;
      case GateType.OR: return `(${a} + ${b})`;
      case GateType.NOT: return `¬${a}`;
      case GateType.NAND: return `¬(${a} · ${b})`;
      case GateType.NOR: return `¬(${a} + ${b})`;
      case GateType.XOR: return `(${a} ⊕ ${b})`;
      case GateType.OUTPUT: return sources[0] || "?";
      default: return "?";
    }
  };

  return outputs.map(out => `${out.label} = ${buildExpr(out.id, new Set())}`).join("; ");
};
