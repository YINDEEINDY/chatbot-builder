import { Handle, Position } from '@xyflow/react';
import { MousePointerClick } from 'lucide-react';

interface QuickReplyButton {
  id: string;
  title: string;
  payload: string;
}

interface QuickReplyNodeProps {
  data: {
    message?: string;
    buttons?: QuickReplyButton[];
  };
  selected?: boolean;
}

export function QuickReplyNode({ data, selected }: QuickReplyNodeProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 min-w-[200px] max-w-[280px] ${
        selected ? 'border-orange-500' : 'border-gray-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      <div className="px-3 py-2 bg-orange-500 text-white rounded-t-md flex items-center gap-2">
        <MousePointerClick className="w-4 h-4" />
        <span className="font-medium text-sm">Quick Reply</span>
      </div>

      <div className="p-3">
        <p className="text-sm text-gray-700 mb-2">
          {data.message || 'Click to edit message...'}
        </p>
        <div className="flex flex-wrap gap-1">
          {data.buttons && data.buttons.length > 0 ? (
            data.buttons.map((btn: QuickReplyButton) => (
              <span
                key={btn.id}
                className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
              >
                {btn.title}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400">No buttons added</span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-orange-500 border-2 border-white"
      />
    </div>
  );
}
