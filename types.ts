export enum GateType {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  NAND = 'NAND',
  NOR = 'NOR',
  XOR = 'XOR',
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT'
}

export interface CircuitNode {
  id: string;
  type: GateType;
  x: number;
  y: number;
  label: string; // For inputs (A, B) or automatic naming
  value: boolean; // Current simulation state
}

export interface Wire {
  id: string;
  sourceNodeId: string;
  sourcePinIndex: number; // 0 for most gates, maybe more for complex components
  targetNodeId: string;
  targetPinIndex: number; // 0 or 1 for standard 2-input gates
}

export interface TruthTableRow {
  inputs: Record<string, boolean>;
  outputs: Record<string, boolean>;
}

export interface DragItem {
  type: 'NEW_GATE' | 'EXISTING_NODE';
  gateType?: GateType;
  nodeId?: string;
  offsetX?: number;
  offsetY?: number;
}
