import { Handle, Position } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

interface TextNodeProps {
  data: {
    message?: string;
  };
  selected?: boolean;
}

export function TextNode({ data, selected }: TextNodeProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 min-w-[200px] max-w-[280px] ${
        selected ? 'border-blue-500' : 'border-gray-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      <div className="px-3 py-2 bg-blue-500 text-white rounded-t-md flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        <span className="font-medium text-sm">Text Message</span>
      </div>

      <div className="p-3">
        <p className="text-sm text-gray-700 line-clamp-3">
          {data.message || 'Click to edit message...'}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
    </div>
  );
}
