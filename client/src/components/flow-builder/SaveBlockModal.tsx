import { useState } from 'react';
import { X, Package } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useBlockStore } from '../../stores/block.store';
import { NodeData, NodeType } from '../../types';

interface SaveBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  nodeType: NodeType;
  nodeData: NodeData;
}

const categoryOptions = [
  'Welcome',
  'Support',
  'Sales',
  'FAQ',
  'General',
  'Custom',
];

export function SaveBlockModal({ isOpen, onClose, botId, nodeType, nodeData }: SaveBlockModalProps) {
  const { createBlock } = useBlockStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Block name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createBlock(botId, {
        name: name.trim(),
        description: description.trim() || undefined,
        nodeType,
        nodeData,
        category,
      });
      handleClose();
    } catch (err) {
      setError('Failed to save block. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setCategory('General');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Save as Block</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Block Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Message"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this block"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 text-sm text-gray-500">
            <p>This will save the current node configuration as a reusable block.</p>
            <p className="mt-1">
              Node type: <span className="font-medium text-gray-700">{nodeType}</span>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Block
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
