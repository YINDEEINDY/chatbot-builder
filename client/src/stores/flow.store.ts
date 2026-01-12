import { create } from 'zustand';
import { Node, Edge, addEdge, Connection, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';
import { Flow, FlowNode, FlowEdge, NodeData } from '../types';
import { flowsApi } from '../api/flows';

// PREVIEW MODE: Set to true to use mock data for UI preview
const PREVIEW_MODE = false;

// Mock data for preview
const mockFlow: Flow = {
  id: 'mock-flow',
  name: 'Welcome Flow',
  botId: 'mock-bot',
  nodes: '[]',
  edges: '[]',
  triggers: '[]',
  isDefault: true,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockNodes: Node<NodeData>[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { label: 'Start' },
  },
  {
    id: 'text-1',
    type: 'text',
    position: { x: 250, y: 150 },
    data: { label: 'Welcome Message', message: 'Hello! Welcome to our bot.' },
  },
  {
    id: 'quickReply-1',
    type: 'quickReply',
    position: { x: 250, y: 280 },
    data: {
      label: 'Main Menu',
      message: 'How can I help you?',
      buttons: [
        { id: '1', title: 'Support', payload: 'support' },
        { id: '2', title: 'Sales', payload: 'sales' },
      ]
    },
  },
];

const mockEdges: Edge[] = [
  { id: 'e1', source: 'start-1', target: 'text-1' },
  { id: 'e2', source: 'text-1', target: 'quickReply-1' },
];

// History state for undo/redo
interface HistoryState {
  nodes: Node<NodeData>[];
  edges: Edge[];
}

const MAX_HISTORY_SIZE = 50;

interface FlowState {
  flows: Flow[];
  currentFlow: Flow | null;
  nodes: Node<NodeData>[];
  edges: Edge[];
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;

  // Undo/Redo state
  history: HistoryState[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  loadFlows: (botId: string) => Promise<void>;
  loadFlow: (botId: string, flowId: string) => Promise<void>;
  createFlow: (botId: string, name: string) => Promise<Flow>;
  saveFlow: (botId: string) => Promise<void>;
  deleteFlow: (botId: string, flowId: string) => Promise<void>;
  setDefaultFlow: (botId: string, flowId: string) => Promise<void>;
  duplicateFlow: (botId: string, flowId: string) => Promise<Flow>;
  updateTriggers: (botId: string, flowId: string, triggers: string[]) => Promise<void>;

  // React Flow handlers
  onNodesChange: (changes: NodeChange<Node<NodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node<NodeData>) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  deleteNode: (nodeId: string) => void;
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;

  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  flows: [],
  currentFlow: null,
  nodes: [],
  edges: [],
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,

  // Undo/Redo state
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,

  loadFlows: async (botId: string) => {
    set({ isLoading: true });
    try {
      const response = await flowsApi.list(botId);
      if (response.success && response.data) {
        set({ flows: response.data });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  loadFlow: async (botId: string, flowId: string) => {
    // Use mock data in preview mode
    if (PREVIEW_MODE) {
      set({
        currentFlow: mockFlow,
        nodes: mockNodes,
        edges: mockEdges,
        isLoading: false,
        hasUnsavedChanges: false,
        history: [{ nodes: mockNodes, edges: mockEdges }],
        historyIndex: 0,
        canUndo: false,
        canRedo: false,
      });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await flowsApi.get(botId, flowId);
      if (response.success && response.data) {
        const flow = response.data;
        const nodes = JSON.parse(flow.nodes as string) as Node<NodeData>[];
        const edges = JSON.parse(flow.edges as string) as Edge[];
        set({
          currentFlow: flow,
          nodes,
          edges,
          hasUnsavedChanges: false,
          history: [{ nodes, edges }],
          historyIndex: 0,
          canUndo: false,
          canRedo: false,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  createFlow: async (botId: string, name: string) => {
    const response = await flowsApi.create(botId, { name });
    if (response.success && response.data) {
      set({ flows: [...get().flows, response.data] });
      return response.data;
    }
    throw new Error('Failed to create flow');
  },

  saveFlow: async (botId: string) => {
    const { currentFlow, nodes, edges } = get();
    if (!currentFlow) return;

    set({ isSaving: true });
    try {
      const flowNodes: FlowNode[] = nodes.map((n) => ({
        id: n.id,
        type: n.type as FlowNode['type'],
        position: n.position,
        data: n.data as NodeData,
      }));

      const flowEdges: FlowEdge[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
      }));

      await flowsApi.update(botId, currentFlow.id, {
        nodes: flowNodes,
        edges: flowEdges,
      });

      set({ hasUnsavedChanges: false });
    } finally {
      set({ isSaving: false });
    }
  },

  deleteFlow: async (botId: string, flowId: string) => {
    await flowsApi.delete(botId, flowId);
    set({
      flows: get().flows.filter((f) => f.id !== flowId),
      currentFlow: get().currentFlow?.id === flowId ? null : get().currentFlow,
    });
  },

  setDefaultFlow: async (botId: string, flowId: string) => {
    const response = await flowsApi.setDefault(botId, flowId);
    if (response.success) {
      // Update flows to reflect new default
      set({
        flows: get().flows.map((f) => ({
          ...f,
          isDefault: f.id === flowId,
        })),
      });
    }
  },

  duplicateFlow: async (botId: string, flowId: string) => {
    const response = await flowsApi.duplicate(botId, flowId);
    if (response.success && response.data) {
      set({ flows: [...get().flows, response.data] });
      return response.data;
    }
    throw new Error('Failed to duplicate flow');
  },

  updateTriggers: async (botId: string, flowId: string, triggers: string[]) => {
    const response = await flowsApi.update(botId, flowId, { triggers });
    if (response.success && response.data) {
      // Update flows list
      set({
        flows: get().flows.map((f) =>
          f.id === flowId ? { ...f, triggers: JSON.stringify(triggers) } : f
        ),
        // Update current flow if it's the one being edited
        currentFlow: get().currentFlow?.id === flowId
          ? { ...get().currentFlow!, triggers: JSON.stringify(triggers) }
          : get().currentFlow,
      });
    }
  },

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      hasUnsavedChanges: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      hasUnsavedChanges: true,
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
      hasUnsavedChanges: true,
    });
  },

  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
      hasUnsavedChanges: true,
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
      hasUnsavedChanges: true,
    });
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      hasUnsavedChanges: true,
    });
  },

  setNodes: (nodes) => set({ nodes, hasUnsavedChanges: true }),
  setEdges: (edges) => set({ edges, hasUnsavedChanges: true }),

  // Undo/Redo implementations
  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);

    // Add current state to history
    newHistory.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    });

    // Limit history size
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const previousState = history[newIndex];

    set({
      nodes: JSON.parse(JSON.stringify(previousState.nodes)),
      edges: JSON.parse(JSON.stringify(previousState.edges)),
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: true,
      hasUnsavedChanges: true,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];

    set({
      nodes: JSON.parse(JSON.stringify(nextState.nodes)),
      edges: JSON.parse(JSON.stringify(nextState.edges)),
      historyIndex: newIndex,
      canUndo: true,
      canRedo: newIndex < history.length - 1,
      hasUnsavedChanges: true,
    });
  },
}));
