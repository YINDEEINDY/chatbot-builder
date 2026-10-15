import { useCallback, useEffect, useState } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MarkerType, ReactFlowProvider, useReactFlow, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlowStore } from '../../stores/flow.store';
import type { NodeData, NodeType } from '../../types';
import { NODE_META, defaultData, nodeTypes } from './nodes';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { FlowPreview } from './FlowPreview';

const PALETTE: NodeType[] = ['message', 'choice', 'input', 'condition', 'handoff', 'end'];

function Editor({ botId, flowId, onSave, previewOpen, onClosePreview }: Props) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, pushHistory, undo, redo } = useFlowStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const selected = nodes.find((n) => n.id === selectedId) as Node<NodeData> | undefined;

  const add = useCallback((type: NodeType, at?: { x: number; y: number }) => {
    pushHistory();
    const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
    const center = at ?? screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    addNode({ id, type, position: { x: center.x - 130, y: center.y - 40 }, data: defaultData(type) });
    setSelectedId(id);
  }, [addNode, pushHistory, screenToFlowPosition]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 's') { e.preventDefault(); onSave(); }
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onSave, undo, redo]);

  return (
    <div className="flex h-full">
      <aside className="hidden w-[232px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-surface p-3 scroll-thin md:flex" aria-label="ขั้นตอนที่เพิ่มได้">
        <p className="text-xs text-ink-soft">คลิกหรือลากไปวาง แล้วลากเส้นจากวงกลมขวาไปขั้นตอนถัดไป</p>
        {['บอทพูด', 'ถามลูกค้า', 'แยกทาง', 'จบ'].map((group) => (
          <section key={group}>
            <h3 className="mb-1.5 text-xs font-semibold text-ink-soft">{group}</h3>
            <div className="space-y-1.5">
              {PALETTE.filter((t) => NODE_META[t].group === group).map((t) => {
                const m = NODE_META[t];
                return (
                  <button
                    key={t}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('application/x-node-type', t)}
                    onClick={() => add(t)}
                    className="flex w-full items-start gap-2.5 rounded-lg border border-line bg-paper p-2 text-left hover:border-gray-400 hover:bg-surface"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white" style={{ background: m.color }}><m.icon className="h-3.5 w-3.5" /></span>
                    <span>
                      <span className="block text-sm font-medium leading-tight">{m.label}</span>
                      <span className="block text-[11px] leading-snug text-ink-soft">{m.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </aside>

      <div
        className="relative min-w-0 flex-1"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDrop={(e) => {
          const t = e.dataTransfer.getData('application/x-node-type') as NodeType;
          if (t) add(t, screenToFlowPosition({ x: e.clientX + 130, y: e.clientY + 40 }));
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(c) => { pushHistory(); onConnect(c); }}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          onNodeDragStart={pushHistory}
          deleteKeyCode={['Delete', 'Backspace']}
          defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#9aa39c' }, style: { stroke: '#9aa39c', strokeWidth: 2 } }}
          fitView
          fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
          minZoom={0.3}
          proOptions={{ hideAttribution: true }}
          className="bg-paper"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#c7cec6" />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
        {/* mobile: palette as a bottom strip */}
        <div className="absolute inset-x-2 bottom-2 flex gap-1.5 overflow-x-auto rounded-xl border border-line bg-surface p-1.5 shadow md:hidden">
          {PALETTE.map((t) => (
            <button key={t} onClick={() => add(t)} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_META[t].color }} />{NODE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      {selected && !previewOpen && (
        <div className="absolute inset-0 z-30 md:static md:z-auto md:w-[340px] md:shrink-0">
          <NodePropertiesPanel key={selected.id} node={selected} onClose={() => setSelectedId(null)} />
        </div>
      )}
      {previewOpen && (
        <div className="absolute inset-0 z-30 md:static md:z-auto md:w-[380px] md:shrink-0">
          <FlowPreview botId={botId} flowId={flowId} onClose={onClosePreview} />
        </div>
      )}
    </div>
  );
}

interface Props { botId: string; flowId: string; onSave: () => void; previewOpen: boolean; onClosePreview: () => void }

export function FlowEditor(props: Props) {
  return <ReactFlowProvider><Editor {...props} /></ReactFlowProvider>;
}
