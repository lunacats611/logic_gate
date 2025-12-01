import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GateType, CircuitNode, Wire } from "../types";

const parseExpressionToCircuit = async (expression: string): Promise<{ nodes: CircuitNode[], wires: Wire[] } | null> => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    You are an expert digital logic engineer.
    Your task is to convert a Boolean expression (e.g., "A AND (B OR C)") into a visual circuit layout.
    
    Rules:
    1. Break down the expression into logic gates (AND, OR, NOT, NAND, NOR, XOR).
    2. Create Input nodes for variables (A, B, C...).
    3. Create an Output node for the final result.
    4. layout the nodes logically on a 2D grid. 
       - Inputs should be on the left (x around 50-100).
       - The Output should be on the right (x around 800-1000).
       - Intermediate gates should flow left-to-right.
       - Avoid overlapping nodes. 
       - y coordinates should range from 50 to 600.
    5. Generate unique IDs for all nodes (e.g., "node-1", "node-2").
    6. Define wires to connect them correctly.
  `;

  const nodeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      type: { type: Type.STRING, enum: Object.values(GateType) },
      x: { type: Type.NUMBER },
      y: { type: Type.NUMBER },
      label: { type: Type.STRING },
    },
    required: ["id", "type", "x", "y", "label"],
  };

  const wireSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      sourceNodeId: { type: Type.STRING },
      targetNodeId: { type: Type.STRING },
      targetPinIndex: { type: Type.INTEGER, description: "0 for first input, 1 for second input" },
    },
    required: ["sourceNodeId", "targetNodeId", "targetPinIndex"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Convert this expression to a circuit: "${expression}"`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: { type: Type.ARRAY, items: nodeSchema },
            wires: { type: Type.ARRAY, items: wireSchema },
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) return null;

    const data = JSON.parse(jsonText);
    
    // Post-process to ensure IDs and types match our internal structure if needed
    // Add default 'value' false
    const nodes = data.nodes.map((n: any) => ({ ...n, value: false }));
    
    // Generate wire IDs
    const wires = data.wires.map((w: any, idx: number) => ({
      id: `wire-gen-${idx}`,
      sourceNodeId: w.sourceNodeId,
      sourcePinIndex: 0, // Assume single output for standard gates
      targetNodeId: w.targetNodeId,
      targetPinIndex: w.targetPinIndex,
    }));

    return { nodes, wires };

  } catch (error) {
    console.error("Gemini conversion failed:", error);
    return null;
  }
};

export { parseExpressionToCircuit };
