import type { Node } from '@xyflow/react';
import { useFlowStore } from '../../stores/flow.store';
import type { NodeData, NodeType, QuickReplyButton } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { X, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface NodePropertiesPanelProps {
  node: Node<NodeData>;
  onClose: () => void;
}

export function NodePropertiesPanel({ node, onClose }: NodePropertiesPanelProps) {
  const { updateNodeData, deleteNode } = useFlowStore();

  const handleChange = (key: string, value: unknown) => {
    updateNodeData(node.id, { [key]: value });
  };

  const handleDelete = () => {
    if (node.type === 'start') {
      alert('Cannot delete the start node');
      return;
    }
    if (confirm('Are you sure you want to delete this node?')) {
      deleteNode(node.id);
      onClose();
    }
  };

  const renderProperties = () => {
    const type = node.type as NodeType;
    const data = node.data as NodeData;

    switch (type) {
      case 'start':
        return (
          <div className="text-sm text-gray-500">
            This is the entry point of your flow. Connect it to the next node.
          </div>
        );

      case 'text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={(data as { message?: string }).message || ''}
              onChange={(e) => handleChange('message', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your message..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {'{{variable}}'} to insert user data
            </p>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <Input
              label="Image URL"
              value={(data as { imageUrl?: string }).imageUrl || ''}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            <Input
              label="Caption (optional)"
              value={(data as { caption?: string }).caption || ''}
              onChange={(e) => handleChange('caption', e.target.value)}
              placeholder="Image caption..."
            />
          </div>
        );

      case 'quickReply':
        const qrData = data as { message?: string; buttons?: QuickReplyButton[] };
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={qrData.message || ''}
                onChange={(e) => handleChange('message', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Choose an option..."
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Buttons</label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const newButton: QuickReplyButton = {
                      id: uuidv4(),
                      title: 'Button',
                      payload: 'button_clicked',
                    };
                    handleChange('buttons', [...(qrData.buttons || []), newButton]);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {(qrData.buttons || []).map((btn, index) => (
                  <div key={btn.id} className="flex gap-2">
                    <Input
                      value={btn.title}
                      onChange={(e) => {
                        const newButtons = [...(qrData.buttons || [])];
                        newButtons[index] = { ...btn, title: e.target.value };
                        handleChange('buttons', newButtons);
                      }}
                      placeholder="Button title"
                      className="flex-1"
                    />
                    <button
                      onClick={() => {
                        const newButtons = (qrData.buttons || []).filter((_, i) => i !== index);
                        handleChange('buttons', newButtons);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'userInput':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
              <textarea
                value={(data as { prompt?: string }).prompt || ''}
                onChange={(e) => handleChange('prompt', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What's your name?"
              />
            </div>
            <Input
              label="Save to variable"
              value={(data as { variableName?: string }).variableName || ''}
              onChange={(e) => handleChange('variableName', e.target.value)}
              placeholder="user_name"
            />
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <Input
              label="Variable"
              value={(data as { variable?: string }).variable || ''}
              onChange={(e) => handleChange('variable', e.target.value)}
              placeholder="user_choice"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <select
                value={(data as { operator?: string }).operator || 'equals'}
                onChange={(e) => handleChange('operator', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="startsWith">Starts with</option>
                <option value="endsWith">Ends with</option>
              </select>
            </div>
            <Input
              label="Value"
              value={(data as { value?: string }).value || ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="yes"
            />
          </div>
        );

      case 'delay':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delay (seconds)</label>
            <input
              type="number"
              min={0}
              max={60}
              value={(data as { seconds?: number }).seconds || 0}
              onChange={(e) => handleChange('seconds', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case 'end':
        return (
          <div className="text-sm text-gray-500">
            This marks the end of the conversation flow.
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 capitalize">
          {node.type?.replace(/([A-Z])/g, ' $1').trim()} Properties
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {renderProperties()}

        {node.type !== 'start' && (
          <div className="pt-4 border-t border-gray-200">
            <Button variant="danger" size="sm" onClick={handleDelete} className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Node
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
