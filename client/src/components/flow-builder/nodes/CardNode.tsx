import { Handle, Position } from '@xyflow/react';
import { LayoutGrid, ExternalLink, MousePointerClick } from 'lucide-react';

interface CardButton {
  id: string;
  title: string;
  type: 'postback' | 'url';
  payload?: string;
  url?: string;
}

interface CardNodeProps {
  data: {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    buttons?: CardButton[];
  };
  selected?: boolean;
}

export function CardNode({ data, selected }: CardNodeProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 min-w-[220px] max-w-[280px] ${
        selected ? 'border-pink-500' : 'border-gray-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      <div className="px-3 py-2 bg-pink-500 text-white rounded-t-md flex items-center gap-2">
        <LayoutGrid className="w-4 h-4" />
        <span className="font-medium text-sm">Card</span>
      </div>

      <div className="p-3">
        {/* Image Preview */}
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt="Card"
            className="w-full h-20 object-cover rounded mb-2"
          />
        ) : (
          <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center mb-2">
            <LayoutGrid className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-semibold text-gray-900 truncate">
          {data.title || 'Card Title'}
        </p>

        {/* Subtitle */}
        {data.subtitle && (
          <p className="text-xs text-gray-500 truncate mt-1">{data.subtitle}</p>
        )}

        {/* Buttons Preview */}
        {data.buttons && data.buttons.length > 0 && (
          <div className="mt-2 space-y-1">
            {data.buttons.slice(0, 3).map((btn) => (
              <div
                key={btn.id}
                className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded"
              >
                {btn.type === 'url' ? (
                  <ExternalLink className="w-3 h-3" />
                ) : (
                  <MousePointerClick className="w-3 h-3" />
                )}
                <span className="truncate">{btn.title}</span>
              </div>
            ))}
            {data.buttons.length > 3 && (
              <p className="text-xs text-gray-400">+{data.buttons.length - 3} more</p>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-pink-500 border-2 border-white"
      />
    </div>
  );
}
