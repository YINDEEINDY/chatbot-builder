import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import type { Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore } from '../../stores/flow.store';
import { nodeTypes } from './nodes';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import type { NodeData, NodeType } from '../../types';
import { Button } from '../ui/Button';
import {
  MessageSquare,
  Image,
  MousePointerClick,
  MessageCircleQuestion,
  GitBranch,
  Clock,
  StopCircle,
  Save,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const nodeTypeConfig: { type: NodeType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'text', label: 'Text', icon: MessageSquare, color: 'bg-blue-500' },
  { type: 'image', label: 'Image', icon: Image, color: 'bg-purple-500' },
  { type: 'quickReply', label: 'Quick Reply', icon: MousePointerClick, color: 'bg-orange-500' },
  { type: 'userInput', label: 'User Input', icon: MessageCircleQuestion, color: 'bg-teal-500' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-yellow-500' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'bg-gray-500' },
  { type: 'end', label: 'End', icon: StopCircle, color: 'bg-red-500' },
];

function FlowEditorInner({
  onSave,
}: {
  onSave: () => Promise<void>;
}) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, hasUnsavedChanges, isSaving } =
    useFlowStore();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const newNode: Node = {
        id: `${type}-${uuidv4()}`,
        type,
        position,
        data: getDefaultNodeData(type),
      };

      addNode(newNode as Node<NodeData>);
    },
    [screenToFlowPosition, addNode]
  );

  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex h-full">
      {/* Node Palette */}
      <div className="w-56 bg-white border-r border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Nodes</h3>
        <div className="space-y-2">
          {nodeTypeConfig.map((config) => (
            <div
              key={config.type}
              draggable
              onDragStart={(e) => handleDragStart(e, config.type)}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-grab hover:bg-gray-100 transition-colors"
            >
              <div className={`p-1.5 rounded ${config.color}`}>
                <config.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-gray-700">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 relative">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}
          <Button onClick={onSave} isLoading={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>

        <ReactFlow
          nodes={nodes as Node[]}
          edges={edges}
          onNodesChange={onNodesChange as (changes: unknown) => void}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <NodePropertiesPanel node={selectedNode as Node<NodeData>} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}

export function FlowEditor({ onSave }: { botId: string; onSave: () => Promise<void> }) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner onSave={onSave} />
    </ReactFlowProvider>
  );
}

function getDefaultNodeData(type: NodeType): NodeData {
  switch (type) {
    case 'text':
      return { label: 'Text Message', message: '' };
    case 'image':
      return { label: 'Image', imageUrl: '' };
    case 'quickReply':
      return { label: 'Quick Reply', message: '', buttons: [] };
    case 'userInput':
      return { label: 'User Input', prompt: '', variableName: '' };
    case 'condition':
      return { label: 'Condition', variable: '', operator: 'equals', value: '' };
    case 'delay':
      return { label: 'Delay', seconds: 1 };
    case 'end':
      return { label: 'End' };
    default:
      return { label: 'Node' };
  }
}
