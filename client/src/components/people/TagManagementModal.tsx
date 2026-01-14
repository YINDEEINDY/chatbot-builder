import { useState, useEffect } from 'react';
import { X, Tag, Plus, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { contactsApi } from '../../api/contacts';

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  contactIds: string[];
  existingTags: string[];
  onSuccess: () => void;
}

const popularTags = ['VIP', 'Lead', 'Support', 'Premium', 'New', 'Hot'];

export function TagManagementModal({
  isOpen,
  onClose,
  botId,
  contactIds,
  existingTags,
  onSuccess,
}: TagManagementModalProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removedTags, setRemovedTags] = useState<string[]>([]);
  const [addedTags, setAddedTags] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTags([...existingTags]);
      setRemovedTags([]);
      setAddedTags([]);
      setNewTag('');
    }
  }, [isOpen, existingTags]);

  if (!isOpen) return null;

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || tags.includes(trimmedTag)) return;

    setTags([...tags, trimmedTag]);
    if (existingTags.includes(trimmedTag)) {
      setRemovedTags(removedTags.filter((t) => t !== trimmedTag));
    } else {
      setAddedTags([...addedTags, trimmedTag]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    if (existingTags.includes(tag)) {
      setRemovedTags([...removedTags, tag]);
    } else {
      setAddedTags(addedTags.filter((t) => t !== tag));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const promises: Promise<unknown>[] = [];

      if (addedTags.length > 0) {
        promises.push(contactsApi.addTags(botId, contactIds, addedTags));
      }
      if (removedTags.length > 0) {
        promises.push(contactsApi.removeTags(botId, contactIds, removedTags));
      }

      await Promise.all(promises);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Failed to update tags:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewTag('');
    setTags([]);
    setRemovedTags([]);
    setAddedTags([]);
    onClose();
  };

  const hasChanges = addedTags.length > 0 || removedTags.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Manage Tags ({contactIds.length} contact{contactIds.length > 1 ? 's' : ''})
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Current Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Tags
            </label>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 rounded-lg">
              {tags.length === 0 ? (
                <span className="text-sm text-gray-400">No tags yet</span>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      addedTags.includes(tag)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1.5 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Add New Tag */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Tags
            </label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Enter tag name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(newTag);
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleAddTag(newTag)}
                disabled={!newTag.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Popular Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Popular Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {popularTags
                .filter((tag) => !tags.includes(tag))
                .map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
            </div>
          </div>

          {/* Changes Summary */}
          {hasChanges && (
            <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg">
              {addedTags.length > 0 && (
                <p>
                  Adding: <span className="font-medium">{addedTags.join(', ')}</span>
                </p>
              )}
              {removedTags.length > 0 && (
                <p>
                  Removing: <span className="font-medium">{removedTags.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!hasChanges || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
