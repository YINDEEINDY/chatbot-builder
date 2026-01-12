import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

interface ConditionNodeProps {
  data: {
    variable?: string;
    operator?: string;
    value?: string;
  };
  selected?: boolean;
}

export function ConditionNode({ data, selected }: ConditionNodeProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 min-w-[200px] max-w-[280px] ${
        selected ? 'border-yellow-500' : 'border-gray-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      <div className="px-3 py-2 bg-yellow-500 text-white rounded-t-md flex items-center gap-2">
        <GitBranch className="w-4 h-4" />
        <span className="font-medium text-sm">Condition</span>
      </div>

      <div className="p-3">
        {data.variable ? (
          <div className="text-sm">
            <span className="font-mono text-yellow-700">{data.variable}</span>
            <span className="text-gray-500 mx-1">{data.operator}</span>
            <span className="text-gray-700">"{data.value}"</span>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Click to set condition...</p>
        )}
      </div>

      <div className="flex justify-between px-3 pb-2">
        <div className="flex flex-col items-center">
          <span className="text-xs text-green-600 mb-1">True</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="w-3 h-3 bg-green-500 border-2 border-white !relative !transform-none"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-red-600 mb-1">False</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="w-3 h-3 bg-red-500 border-2 border-white !relative !transform-none"
          />
        </div>
      </div>
    </div>
  );
}
