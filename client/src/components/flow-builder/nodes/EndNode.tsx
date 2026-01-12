import { Handle, Position } from '@xyflow/react';
import { StopCircle } from 'lucide-react';

interface EndNodeProps {
  selected?: boolean;
}

export function EndNode({ selected }: EndNodeProps) {
  return (
    <div
      className={`px-4 py-3 bg-red-500 text-white rounded-lg shadow-md min-w-[120px] ${
        selected ? 'ring-2 ring-red-300' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-red-700 border-2 border-white"
      />
      <div className="flex items-center gap-2">
        <StopCircle className="w-4 h-4" />
        <span className="font-medium">End</span>
      </div>
    </div>
  );
}
