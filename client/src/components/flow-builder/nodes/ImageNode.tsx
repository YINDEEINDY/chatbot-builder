import { Handle, Position } from '@xyflow/react';
import { Image } from 'lucide-react';

interface ImageNodeProps {
  data: {
    imageUrl?: string;
    caption?: string;
  };
  selected?: boolean;
}

export function ImageNode({ data, selected }: ImageNodeProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 min-w-[200px] max-w-[280px] ${
        selected ? 'border-purple-500' : 'border-gray-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      <div className="px-3 py-2 bg-purple-500 text-white rounded-t-md flex items-center gap-2">
        <Image className="w-4 h-4" />
        <span className="font-medium text-sm">Image</span>
      </div>

      <div className="p-3">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt="Preview"
            className="w-full h-24 object-cover rounded"
          />
        ) : (
          <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center">
            <Image className="w-8 h-8 text-gray-400" />
          </div>
        )}
        {data.caption && (
          <p className="text-xs text-gray-500 mt-2">{data.caption}</p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
      />
    </div>
  );
}
