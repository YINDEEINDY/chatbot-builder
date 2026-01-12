import { Handle, Position } from '@xyflow/react';
import { MessageCircleQuestion } from 'lucide-react';

interface UserInputNodeProps {
  data: {
    prompt?: string;
    variableName?: string;
  };
  selected?: boolean;
}

export function UserInputNode({ data, selected }: UserInputNodeProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 min-w-[200px] max-w-[280px] ${
        selected ? 'border-teal-500' : 'border-gray-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      <div className="px-3 py-2 bg-teal-500 text-white rounded-t-md flex items-center gap-2">
        <MessageCircleQuestion className="w-4 h-4" />
        <span className="font-medium text-sm">User Input</span>
      </div>

      <div className="p-3">
        <p className="text-sm text-gray-700 mb-2">
          {data.prompt || 'Click to set prompt...'}
        </p>
        {data.variableName && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Save to:</span>
            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded font-mono">
              {data.variableName}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-teal-500 border-2 border-white"
      />
    </div>
  );
}
