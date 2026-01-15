import { useEffect, useState } from 'react';
import { useBlockStore } from '../../stores/block.store';
import { Block } from '../../types';
import {
  MessageSquare,
  Image,
  MousePointerClick,
  MessageCircleQuestion,
  GitBranch,
  Clock,
  CreditCard,
  Trash2,
  Copy,
  MoreVertical,
  Package,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/Button';

const nodeTypeIcons: Record<string, React.ElementType> = {
  text: MessageSquare,
  image: Image,
  card: CreditCard,
  quickReply: MousePointerClick,
  userInput: MessageCircleQuestion,
  condition: GitBranch,
  delay: Clock,
};

const nodeTypeColors: Record<string, string> = {
  text: 'bg-blue-500',
  image: 'bg-purple-500',
  card: 'bg-pink-500',
  quickReply: 'bg-orange-500',
  userInput: 'bg-teal-500',
  condition: 'bg-yellow-500',
  delay: 'bg-gray-500',
};

interface BlocksPanelProps {
  botId: string;
  onDragStart: (e: React.DragEvent, block: Block) => void;
}

export function BlocksPanel({ botId, onDragStart }: BlocksPanelProps) {
  const { blocks, isLoading, loadBlocks, deleteBlock, duplicateBlock } = useBlockStore();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    loadBlocks(botId);
  }, [botId, loadBlocks]);

  const handleDelete = async (blockId: string) => {
    if (confirm('Are you sure you want to delete this block?')) {
      await deleteBlock(botId, blockId);
    }
    setOpenMenu(null);
  };

  const handleDuplicate = async (blockId: string) => {
    await duplicateBlock(botId, blockId);
    setOpenMenu(null);
  };

  const handleDragStart = (e: React.DragEvent, block: Block) => {
    e.dataTransfer.setData('application/block', JSON.stringify(block));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(e, block);
  };

  // Group blocks by category
  const groupedBlocks = blocks.reduce((acc, block) => {
    const category = block.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(block);
    return acc;
  }, {} as Record<string, Block[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="p-4 text-center">
        <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No saved blocks yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Right-click a node and select "Save as Block" to create one
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedBlocks).map(([category, categoryBlocks]) => (
        <div key={category}>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1">
            {category}
          </h4>
          <div className="space-y-2">
            {categoryBlocks.map((block) => {
              const nodeType = block.nodeType || 'text';
              const Icon = nodeTypeIcons[nodeType] || MessageSquare;
              const colorClass = nodeTypeColors[nodeType] || 'bg-gray-500';

              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, block)}
                  className="group relative flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-grab hover:bg-gray-100 transition-colors"
                >
                  <div className={`p-1.5 rounded ${colorClass}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 block truncate">{block.name}</span>
                    {block.description && (
                      <span className="text-xs text-gray-400 block truncate">{block.description}</span>
                    )}
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === block.id ? null : block.id);
                      }}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                    {openMenu === block.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenu(null)}
                        />
                        <div className="absolute right-0 top-6 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-32">
                          <button
                            onClick={() => handleDuplicate(block.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Copy className="w-3 h-3" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleDelete(block.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
