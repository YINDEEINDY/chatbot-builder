import { useCallback, useState, useEffect, useRef } from 'react';
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
import { FlowTester } from './FlowTester';
import { BlocksPanel } from './BlocksPanel';
import { SaveBlockModal } from './SaveBlockModal';
import type { Block, NodeData, NodeType } from '../../types';
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
  Undo2,
  Redo2,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CreditCard,
  Play,
  Package,
  Layers,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const nodeTypeConfig: { type: NodeType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'text', label: 'Text', icon: MessageSquare, color: 'bg-blue-500' },
  { type: 'image', label: 'Image', icon: Image, color: 'bg-purple-500' },
  { type: 'card', label: 'Card', icon: CreditCard, color: 'bg-pink-500' },
  { type: 'quickReply', label: 'Quick Reply', icon: MousePointerClick, color: 'bg-orange-500' },
  { type: 'userInput', label: 'User Input', icon: MessageCircleQuestion, color: 'bg-teal-500' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-yellow-500' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'bg-gray-500' },
  { type: 'end', label: 'End', icon: StopCircle, color: 'bg-red-500' },
];

function FlowEditorInner({
  botId,
  onSave,
}: {
  botId: string;
  onSave: () => Promise<void>;
}) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    hasUnsavedChanges,
    isSaving,
    canUndo,
    canRedo,
    undo,
    redo,
    pushHistory,
    setNodes,
  } = useFlowStore();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showTester, setShowTester] = useState(false);
  const [activeTab, setActiveTab] = useState<'nodes' | 'blocks'>('nodes');
  const [saveBlockModal, setSaveBlockModal] = useState<{ node: Node<NodeData> } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: Node<NodeData> } | null>(null);
  const { screenToFlowPosition, fitView, getNodes, zoomIn, zoomOut } = useReactFlow();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // Ctrl/Cmd + S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
      // Delete or Backspace = Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        // Don't delete start node
        if (selectedNode.type !== 'start') {
          pushHistory();
          deleteNode(selectedNode.id);
          setSelectedNode(null);
        }
      }
      // Ctrl/Cmd + Plus = Zoom In
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      }
      // Ctrl/Cmd + Minus = Zoom Out
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
      // Ctrl/Cmd + 0 = Fit View
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        fitView({ padding: 0.2 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, onSave, selectedNode, deleteNode, pushHistory, zoomIn, zoomOut, fitView]);

  // Auto-layout function
  const handleAutoLayout = useCallback(() => {
    pushHistory();
    const currentNodes = getNodes();
    if (currentNodes.length === 0) return;

    // Simple top-to-bottom layout
    const startNode = currentNodes.find(n => n.type === 'start');
    const otherNodes = currentNodes.filter(n => n.type !== 'start');

    const layoutedNodes = [];
    const VERTICAL_SPACING = 120;
    const HORIZONTAL_SPACING = 250;
    const START_X = 250;
    let currentY = 50;

    // Position start node first
    if (startNode) {
      layoutedNodes.push({
        ...startNode,
        position: { x: START_X, y: currentY },
      });
      currentY += VERTICAL_SPACING;
    }

    // Group nodes by their connections (simple BFS-like ordering)
    const visited = new Set<string>();
    const nodeQueue: Node[] = [];

    // Start from nodes connected to start
    const startEdges = edges.filter(e => e.source === startNode?.id);
    startEdges.forEach(edge => {
      const targetNode = otherNodes.find(n => n.id === edge.target);
      if (targetNode && !visited.has(targetNode.id)) {
        nodeQueue.push(targetNode);
        visited.add(targetNode.id);
      }
    });

    // Process connected nodes
    while (nodeQueue.length > 0) {
      const node = nodeQueue.shift()!;
      layoutedNodes.push({
        ...node,
        position: { x: START_X, y: currentY },
      });
      currentY += VERTICAL_SPACING;

      // Add connected nodes to queue
      const connectedEdges = edges.filter(e => e.source === node.id);
      connectedEdges.forEach((edge, index) => {
        const targetNode = otherNodes.find(n => n.id === edge.target);
        if (targetNode && !visited.has(targetNode.id)) {
          // Offset for branching (conditions)
          if (connectedEdges.length > 1) {
            const xOffset = (index - (connectedEdges.length - 1) / 2) * HORIZONTAL_SPACING;
            layoutedNodes.push({
              ...targetNode,
              position: { x: START_X + xOffset, y: currentY },
            });
            currentY += VERTICAL_SPACING;
            visited.add(targetNode.id);
          } else {
            nodeQueue.push(targetNode);
            visited.add(targetNode.id);
          }
        }
      });
    }

    // Add any unvisited nodes at the bottom
    otherNodes.forEach(node => {
      if (!visited.has(node.id)) {
        layoutedNodes.push({
          ...node,
          position: { x: START_X, y: currentY },
        });
        currentY += VERTICAL_SPACING;
      }
    });

    setNodes(layoutedNodes as Node<NodeData>[]);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [edges, getNodes, setNodes, fitView, pushHistory]);

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
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      // Check if dropping a block
      const blockData = e.dataTransfer.getData('application/block');
      if (blockData) {
        try {
          const block = JSON.parse(blockData) as Block;
          const nodeData = JSON.parse(block.nodeData) as NodeData;
          const newNode: Node = {
            id: `${block.nodeType}-${uuidv4()}`,
            type: block.nodeType,
            position,
            data: { ...nodeData, label: block.name },
          };
          pushHistory();
          addNode(newNode as Node<NodeData>);
          return;
        } catch {
          console.error('Failed to parse block data');
        }
      }

      // Handle regular node type
      const type = e.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const newNode: Node = {
        id: `${type}-${uuidv4()}`,
        type,
        position,
        data: getDefaultNodeData(type),
      };

      pushHistory();
      addNode(newNode as Node<NodeData>);
    },
    [screenToFlowPosition, addNode, pushHistory]
  );

  // Push history when connecting nodes
  const handleConnect = useCallback(
    (connection: Parameters<typeof onConnect>[0]) => {
      pushHistory();
      onConnect(connection);
    },
    [onConnect, pushHistory]
  );

  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBlockDragStart = () => {
    // Just used to close context menu if open
    setContextMenu(null);
  };

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    // Don't show context menu for start nodes
    if (node.type === 'start') return;
    setContextMenu({ x: e.clientX, y: e.clientY, node: node as Node<NodeData> });
  }, []);

  const handleSaveAsBlock = () => {
    if (contextMenu) {
      setSaveBlockModal({ node: contextMenu.node });
      setContextMenu(null);
    }
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <div className="flex h-full">
      {/* Left Panel with Tabs */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'nodes'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Nodes
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'blocks'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4" />
            Blocks
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'nodes' ? (
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
          ) : (
            <BlocksPanel botId={botId} onDragStart={handleBlockDragStart} />
          )}
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
          <Button
            variant="secondary"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAutoLayout}
            title="Auto Layout"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300" /> {/* Divider */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => zoomOut()}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => zoomIn()}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fitView({ padding: 0.2 })}
            title="Fit View"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300" /> {/* Divider */}
          <Button
            variant="secondary"
            onClick={() => setShowTester(true)}
            title="Test Flow"
          >
            <Play className="w-4 h-4 mr-2" />
            Test
          </Button>
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
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onNodeContextMenu={handleNodeContextMenu}
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

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleSaveAsBlock}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Package className="w-4 h-4" />
              Save as Block
            </button>
          </div>
        )}
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <NodePropertiesPanel node={selectedNode as Node<NodeData>} onClose={() => setSelectedNode(null)} />
      )}

      {/* Flow Tester Modal */}
      <FlowTester
        isOpen={showTester}
        onClose={() => setShowTester(false)}
      />

      {/* Save Block Modal */}
      {saveBlockModal && (
        <SaveBlockModal
          isOpen={!!saveBlockModal}
          onClose={() => setSaveBlockModal(null)}
          botId={botId}
          nodeType={saveBlockModal.node.type as NodeType}
          nodeData={saveBlockModal.node.data}
        />
      )}
    </div>
  );
}

export function FlowEditor({ botId, onSave }: { botId: string; onSave: () => Promise<void> }) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner botId={botId} onSave={onSave} />
    </ReactFlowProvider>
  );
}

function getDefaultNodeData(type: NodeType): NodeData {
  switch (type) {
    case 'text':
      return { label: 'Text Message', message: '' };
    case 'image':
      return { label: 'Image', imageUrl: '' };
    case 'card':
      return { label: 'Card', title: '', subtitle: '', imageUrl: '', buttons: [] };
    case 'quickReply':
      return { label: 'Quick Reply', message: '', buttons: [] };
    case 'userInput':
      return { label: 'User Input', prompt: '', variableName: '' };
    case 'condition':
      return { label: 'Condition', variable: '', operator: 'equals', value: '' };
    case 'delay':
      return { label: 'Delay', seconds: 1, showTyping: true };
    case 'end':
      return { label: 'End' };
    default:
      return { label: 'Node' };
  }
}
