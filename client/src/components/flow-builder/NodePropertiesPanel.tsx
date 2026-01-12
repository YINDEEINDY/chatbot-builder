import type { Node } from '@xyflow/react';
import { useFlowStore } from '../../stores/flow.store';
import type { NodeData, NodeType, QuickReplyButton, CardButton } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { X, Plus, Trash2, ExternalLink, MousePointerClick } from 'lucide-react';
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

      case 'card':
        const cardData = data as { title?: string; subtitle?: string; imageUrl?: string; buttons?: CardButton[] };
        return (
          <div className="space-y-4">
            <Input
              label="Image URL"
              value={cardData.imageUrl || ''}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            <Input
              label="Title"
              value={cardData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Card Title"
            />
            <Input
              label="Subtitle"
              value={cardData.subtitle || ''}
              onChange={(e) => handleChange('subtitle', e.target.value)}
              placeholder="Card subtitle..."
            />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Buttons (max 3)</label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if ((cardData.buttons || []).length >= 3) return;
                    const newButton: CardButton = {
                      id: uuidv4(),
                      title: 'Button',
                      type: 'postback',
                      payload: 'button_clicked',
                    };
                    handleChange('buttons', [...(cardData.buttons || []), newButton]);
                  }}
                  disabled={(cardData.buttons || []).length >= 3}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {(cardData.buttons || []).map((btn, index) => (
                  <div key={btn.id} className="p-2 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={btn.title}
                        onChange={(e) => {
                          const newButtons = [...(cardData.buttons || [])];
                          newButtons[index] = { ...btn, title: e.target.value };
                          handleChange('buttons', newButtons);
                        }}
                        placeholder="Button title"
                        className="flex-1"
                      />
                      <button
                        onClick={() => {
                          const newButtons = (cardData.buttons || []).filter((_, i) => i !== index);
                          handleChange('buttons', newButtons);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={btn.type}
                        onChange={(e) => {
                          const newButtons = [...(cardData.buttons || [])];
                          newButtons[index] = { ...btn, type: e.target.value as 'postback' | 'url' };
                          handleChange('buttons', newButtons);
                        }}
                        className="px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="postback">Postback</option>
                        <option value="url">URL</option>
                      </select>
                      {btn.type === 'postback' ? (
                        <div className="flex items-center gap-1 flex-1">
                          <MousePointerClick className="w-4 h-4 text-gray-400" />
                          <Input
                            value={btn.payload || ''}
                            onChange={(e) => {
                              const newButtons = [...(cardData.buttons || [])];
                              newButtons[index] = { ...btn, payload: e.target.value };
                              handleChange('buttons', newButtons);
                            }}
                            placeholder="Payload"
                            className="flex-1"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-1">
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                          <Input
                            value={btn.url || ''}
                            onChange={(e) => {
                              const newButtons = [...(cardData.buttons || [])];
                              newButtons[index] = { ...btn, url: e.target.value };
                              handleChange('buttons', newButtons);
                            }}
                            placeholder="https://..."
                            className="flex-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
        const delayData = data as { seconds?: number; showTyping?: boolean };
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delay (seconds)</label>
              <input
                type="number"
                min={1}
                max={20}
                value={delayData.seconds || 1}
                onChange={(e) => handleChange('seconds', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={delayData.showTyping !== false}
                  onChange={(e) => handleChange('showTyping', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm text-gray-700">Show typing indicator</span>
            </div>
            <p className="text-xs text-gray-500">
              When enabled, shows "..." typing animation to the user during the delay.
            </p>
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
