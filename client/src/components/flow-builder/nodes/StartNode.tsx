import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';

interface StartNodeProps {
  selected?: boolean;
}

export function StartNode({ selected }: StartNodeProps) {
  return (
    <div
      className={`px-4 py-3 bg-green-500 text-white rounded-lg shadow-md min-w-[120px] ${
        selected ? 'ring-2 ring-green-300' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4" />
        <span className="font-medium">Start</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-700 border-2 border-white"
      />
    </div>
  );
}
