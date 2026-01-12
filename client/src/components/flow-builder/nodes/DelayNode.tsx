import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';

interface DelayNodeProps {
  data: {
    seconds?: number;
  };
  selected?: boolean;
}

export function DelayNode({ data, selected }: DelayNodeProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 min-w-[150px] ${
        selected ? 'border-gray-500' : 'border-gray-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      <div className="px-3 py-2 bg-gray-500 text-white rounded-t-md flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <span className="font-medium text-sm">Delay</span>
      </div>

      <div className="p-3 text-center">
        <span className="text-2xl font-bold text-gray-700">{data.seconds || 0}</span>
        <span className="text-sm text-gray-500 ml-1">seconds</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-500 border-2 border-white"
      />
    </div>
  );
}
