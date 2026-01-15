import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { blocksApi } from '../api/blocks';
import {
  Block,
  BlockCard,
  TextBlockCard,
  ImageBlockCard,
  GalleryBlockCard,
  QuickReplyBlockCard,
  UserInputBlockCard,
  DelayBlockCard,
  GoToBlockCard,
} from '../types';
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
  Image,
  LayoutGrid,
  HelpCircle,
  Pencil,
  Clock,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  X,
  Hand,
  Zap,
  ChevronRight,
  Upload,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// Card type options
const cardTypes = [
  { type: 'text', label: 'Text', icon: MessageSquare, color: 'bg-blue-100 text-blue-600' },
  { type: 'image', label: 'Image', icon: Image, color: 'bg-purple-100 text-purple-600' },
  { type: 'gallery', label: 'Gallery', icon: LayoutGrid, color: 'bg-orange-100 text-orange-600' },
  { type: 'quickReply', label: 'Quick Reply', icon: HelpCircle, color: 'bg-pink-100 text-pink-600' },
  { type: 'userInput', label: 'User Input', icon: Pencil, color: 'bg-yellow-100 text-yellow-600' },
  { type: 'delay', label: 'Typing', icon: Clock, color: 'bg-gray-100 text-gray-600' },
  { type: 'goToBlock', label: 'Go to Block', icon: ArrowRight, color: 'bg-green-100 text-green-600' },
] as const;

// Helper functions
const generateId = () => `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const parseCards = (cardsJson: string): BlockCard[] => {
  try {
    return JSON.parse(cardsJson) || [];
  } catch {
    return [];
  }
};

const parseTriggers = (triggersJson: string): string[] => {
  try {
    return JSON.parse(triggersJson) || [];
  } catch {
    return [];
  }
};

const createDefaultCard = (type: string): BlockCard => {
  const id = generateId();
  switch (type) {
    case 'text':
      return { type: 'text', id, text: '' } as TextBlockCard;
    case 'image':
      return { type: 'image', id, imageUrl: '' } as ImageBlockCard;
    case 'gallery':
      return { type: 'gallery', id, title: '', buttons: [] } as GalleryBlockCard;
    case 'quickReply':
      return { type: 'quickReply', id, text: '', buttons: [] } as QuickReplyBlockCard;
    case 'userInput':
      return { type: 'userInput', id, prompt: '', variableName: '' } as UserInputBlockCard;
    case 'delay':
      return { type: 'delay', id, seconds: 1, showTyping: true } as DelayBlockCard;
    case 'goToBlock':
      return { type: 'goToBlock', id, blockId: '' } as GoToBlockCard;
    default:
      return { type: 'text', id, text: '' } as TextBlockCard;
  }
};

export function BlocksPage() {
  const { botId } = useParams<{ botId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBlockId = searchParams.get('block');

  // Block list state
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['', 'default']));

  // Editor state
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [cards, setCards] = useState<BlockCard[]>([]);
  const [blockName, setBlockName] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [newTrigger, setNewTrigger] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  // Add Group Modal state
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Load blocks
  useEffect(() => {
    loadBlocks();
  }, [botId]);

  // Load selected block
  useEffect(() => {
    if (selectedBlockId && blocks.length > 0) {
      const block = blocks.find((b) => b.id === selectedBlockId);
      if (block) {
        setSelectedBlock(block);
        setBlockName(block.name);
        setCards(parseCards(block.cards));
        setTriggers(parseTriggers(block.triggers));
        setIsEnabled(block.isEnabled);
        setHasChanges(false);
      }
    } else if (!selectedBlockId && blocks.length > 0) {
      // Auto-select Welcome Message by default
      const welcome = blocks.find((b) => b.isWelcome);
      if (welcome) {
        setSearchParams({ block: welcome.id });
      }
    }
  }, [selectedBlockId, blocks]);

  const loadBlocks = async () => {
    if (!botId) return;
    setIsLoading(true);
    try {
      const [blocksRes, groupsRes] = await Promise.all([
        blocksApi.list(botId),
        blocksApi.getGroups(botId),
      ]);
      if (blocksRes.success && blocksRes.data) {
        setBlocks(blocksRes.data);
      }
      if (groupsRes.success && groupsRes.data) {
        setGroups(groupsRes.data);
        setExpandedGroups(new Set(['', ...groupsRes.data]));
      }
    } catch (error) {
      console.error('Failed to load blocks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectBlock = (blockId: string) => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setSearchParams({ block: blockId });
  };

  const handleSave = async () => {
    if (!botId || !selectedBlock) return;
    setIsSaving(true);
    try {
      const response = await blocksApi.update(botId, selectedBlock.id, {
        name: blockName,
        cards: cards,
        triggers: triggers,
        isEnabled: isEnabled,
      });
      if (response.success && response.data) {
        setBlocks((prev) => prev.map((b) => (b.id === selectedBlock.id ? response.data! : b)));
        setHasChanges(false);
        showNotification('success', 'Block saved successfully');
      } else {
        showNotification('error', response.message || 'Failed to save block');
      }
    } catch (error: unknown) {
      console.error('Failed to save:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        const errMsg = (error as { message: string }).message;
        if (errMsg.includes('too large') || errMsg.includes('PayloadTooLarge')) {
          showNotification('error', 'Image file is too large. Please use smaller images or image URLs instead.');
        } else {
          showNotification('error', errMsg);
        }
      } else {
        showNotification('error', 'Failed to save block. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateBlock = async (groupName?: string) => {
    if (!botId) return;
    try {
      const response = await blocksApi.create(botId, {
        name: 'New Block',
        groupName: groupName || null,
        cards: [{ type: 'text', id: generateId(), text: 'Enter your message...' }],
      });
      if (response.success && response.data) {
        setBlocks((prev) => [...prev, response.data!]);
        setSearchParams({ block: response.data.id });
      }
    } catch (error) {
      console.error('Failed to create block:', error);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!botId || !confirm('Delete this block?')) return;
    try {
      await blocksApi.delete(botId, blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      if (selectedBlockId === blockId) {
        setSearchParams({});
        setSelectedBlock(null);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleAddGroup = async () => {
    if (!botId || !newGroupName.trim()) return;
    try {
      // Create a new block with the group name - this effectively creates the group
      const response = await blocksApi.create(botId, {
        name: 'New Block',
        groupName: newGroupName.trim(),
        cards: [{ type: 'text', id: generateId(), text: 'Enter your message...' }],
      });
      if (response.success && response.data) {
        setBlocks((prev) => [...prev, response.data!]);
        // Add the new group to the groups list
        if (!groups.includes(newGroupName.trim())) {
          setGroups((prev) => [...prev, newGroupName.trim()]);
          setExpandedGroups((prev) => new Set([...prev, newGroupName.trim()]));
        }
        setSearchParams({ block: response.data.id });
        setShowAddGroupModal(false);
        setNewGroupName('');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const markChanged = useCallback(() => setHasChanges(true), []);

  // Trigger operations
  const addTrigger = () => {
    const trimmed = newTrigger.trim().toLowerCase();
    if (trimmed && !triggers.includes(trimmed)) {
      setTriggers((prev) => [...prev, trimmed]);
      setNewTrigger('');
      markChanged();
    }
  };

  const removeTrigger = (trigger: string) => {
    setTriggers((prev) => prev.filter((t) => t !== trigger));
    markChanged();
  };

  // Card operations
  const addCard = (type: string) => {
    setCards((prev) => [...prev, createDefaultCard(type)]);
    setShowAddCard(false);
    markChanged();
  };

  const removeCard = (index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  };

  const moveCard = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cards.length) return;
    setCards((prev) => {
      const newCards = [...prev];
      [newCards[index], newCards[newIndex]] = [newCards[newIndex], newCards[index]];
      return newCards;
    });
    markChanged();
  };

  const updateCard = (index: number, updates: Partial<BlockCard>) => {
    setCards((prev) => prev.map((card, i) => (i === index ? { ...card, ...updates } as BlockCard : card)));
    markChanged();
  };

  // Filter blocks by search
  const filteredBlocks = blocks.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parseTriggers(b.triggers).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Separate special blocks
  const welcomeBlock = filteredBlocks.find((b) => b.isWelcome);
  const defaultAnswerBlock = filteredBlocks.find((b) => b.isDefaultAnswer);
  const regularBlocks = filteredBlocks.filter((b) => !b.isWelcome && !b.isDefaultAnswer);

  // Group regular blocks
  const groupedBlocks = regularBlocks.reduce(
    (acc, block) => {
      const group = block.groupName || '';
      if (!acc[group]) acc[group] = [];
      acc[group].push(block);
      return acc;
    },
    {} as Record<string, Block[]>
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Render block item in list
  const renderBlockItem = (block: Block, isSpecial?: boolean) => {
    const isSelected = selectedBlockId === block.id;
    const cardCount = parseCards(block.cards).length;

    return (
      <button
        key={block.id}
        onClick={() => selectBlock(block.id)}
        className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
          isSelected
            ? isSpecial
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
            : isSpecial
              ? 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20'
              : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        <div className="flex items-center gap-2">
          {block.isWelcome && <Hand className="w-4 h-4 flex-shrink-0" />}
          {block.isDefaultAnswer && <Zap className="w-4 h-4 flex-shrink-0" />}
          <span className="font-medium truncate">{block.name}</span>
        </div>
        {isSpecial && (
          <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
            {block.isWelcome
              ? 'Every person communicating with the bot sees this block first.'
              : 'A person will see this block if the bot does not recognize a text message from them.'}
          </p>
        )}
      </button>
    );
  };

  // Render card editor
  const renderCardEditor = (card: BlockCard, index: number) => {
    const cardType = cardTypes.find((t) => t.type === card.type);

    return (
      <div key={card.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Card content based on type */}
        <div className="p-4">
          {card.type === 'text' && (
            <div className="relative">
              <textarea
                value={(card as TextBlockCard).text}
                onChange={(e) => updateCard(index, { text: e.target.value })}
                placeholder="Hi, {{first name}}! Enter your message..."
                className="w-full px-0 py-0 border-none focus:ring-0 resize-none text-gray-800 placeholder-gray-400"
                rows={3}
              />
              <p className="text-xs text-gray-400 mt-2">
                Use {'{{first name}}'} to personalize messages
              </p>
            </div>
          )}

          {card.type === 'image' && (
            <div className="space-y-3">
              {(card as ImageBlockCard).imageUrl ? (
                <>
                  <div className="relative group">
                    <img
                      src={(card as ImageBlockCard).imageUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg bg-gray-100"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <button
                        onClick={() => updateCard(index, { imageUrl: '' })}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                  {(card as ImageBlockCard).imageUrl.startsWith('data:') && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700">
                        <strong>Warning:</strong> Uploaded images won't display on Facebook Messenger.
                        Please use an image URL instead (e.g., from Imgur, Cloudinary, etc.)
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <label className="w-full h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Upload Image</span>
                  <span className="text-xs text-gray-400">Max Size 10 MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          showNotification('error', 'File size must be less than 10 MB');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          updateCard(index, { imageUrl: event.target?.result as string });
                          showNotification('error', 'Note: Uploaded images won\'t work on Facebook. Use an image URL instead.');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
              <Input
                placeholder="Paste image URL (e.g., https://i.imgur.com/...)"
                value={(card as ImageBlockCard).imageUrl.startsWith('data:') ? '' : (card as ImageBlockCard).imageUrl}
                onChange={(e) => updateCard(index, { imageUrl: e.target.value })}
              />
            </div>
          )}

          {card.type === 'gallery' && (
            <div className="space-y-3">
              {/* Gallery Image */}
              {(card as GalleryBlockCard).imageUrl ? (
                <>
                  <div className="relative group">
                    <img
                      src={(card as GalleryBlockCard).imageUrl}
                      alt="Gallery"
                      className="w-full h-32 object-cover rounded-lg bg-gray-100"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <button
                        onClick={() => updateCard(index, { imageUrl: '' })}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {(card as GalleryBlockCard).imageUrl?.startsWith('data:') && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700">
                        <strong>Warning:</strong> Use an image URL instead for Facebook.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <label className="w-full h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          showNotification('error', 'File size must be less than 10 MB');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          updateCard(index, { imageUrl: event.target?.result as string });
                          showNotification('error', 'Note: Use an image URL for Facebook.');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
              <Input
                placeholder="Image URL (e.g., https://i.imgur.com/...)"
                value={(card as GalleryBlockCard).imageUrl?.startsWith('data:') ? '' : ((card as GalleryBlockCard).imageUrl || '')}
                onChange={(e) => updateCard(index, { imageUrl: e.target.value })}
              />
              <Input
                placeholder="Card Title"
                value={(card as GalleryBlockCard).title}
                onChange={(e) => updateCard(index, { title: e.target.value })}
              />
              <Input
                placeholder="Subtitle (optional)"
                value={(card as GalleryBlockCard).subtitle || ''}
                onChange={(e) => updateCard(index, { subtitle: e.target.value })}
              />
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Buttons</p>
                {(card as GalleryBlockCard).buttons.map((btn, btnIdx) => (
                  <div key={btn.id} className="flex items-center gap-2 mb-2">
                    <Input
                      placeholder="Button title"
                      value={btn.title}
                      onChange={(e) => {
                        const newButtons = [...(card as GalleryBlockCard).buttons];
                        newButtons[btnIdx] = { ...btn, title: e.target.value };
                        updateCard(index, { buttons: newButtons });
                      }}
                      className="flex-1"
                    />
                    <button
                      onClick={() => {
                        const newButtons = (card as GalleryBlockCard).buttons.filter(
                          (_, i) => i !== btnIdx
                        );
                        updateCard(index, { buttons: newButtons });
                      }}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newButton = { id: generateId(), title: '', type: 'block' as const };
                    updateCard(index, {
                      buttons: [...(card as GalleryBlockCard).buttons, newButton],
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + ADD BUTTON (OPTIONAL)
                </button>
              </div>
            </div>
          )}

          {card.type === 'quickReply' && (
            <div className="space-y-3">
              <textarea
                value={(card as QuickReplyBlockCard).text}
                onChange={(e) => updateCard(index, { text: e.target.value })}
                placeholder="Enter message before quick replies..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                {(card as QuickReplyBlockCard).buttons.map((btn, btnIdx) => (
                  <div
                    key={btn.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full"
                  >
                    <input
                      type="text"
                      value={btn.title}
                      onChange={(e) => {
                        const newButtons = [...(card as QuickReplyBlockCard).buttons];
                        newButtons[btnIdx] = { ...btn, title: e.target.value };
                        updateCard(index, { buttons: newButtons });
                      }}
                      placeholder="Button"
                      className="bg-transparent border-none focus:ring-0 text-sm w-20 p-0"
                    />
                    <button
                      onClick={() => {
                        const newButtons = (card as QuickReplyBlockCard).buttons.filter(
                          (_, i) => i !== btnIdx
                        );
                        updateCard(index, { buttons: newButtons });
                      }}
                      className="hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newButton = { id: generateId(), title: '' };
                    updateCard(index, {
                      buttons: [...(card as QuickReplyBlockCard).buttons, newButton],
                    });
                  }}
                  className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-full text-sm hover:border-gray-400"
                >
                  + Add
                </button>
              </div>
            </div>
          )}

          {card.type === 'userInput' && (
            <div className="space-y-3">
              <Input
                placeholder="What would you like to ask?"
                value={(card as UserInputBlockCard).prompt}
                onChange={(e) => updateCard(index, { prompt: e.target.value })}
              />
              <Input
                placeholder="Save to variable (e.g., user_email)"
                value={(card as UserInputBlockCard).variableName}
                onChange={(e) => updateCard(index, { variableName: e.target.value })}
              />
            </div>
          )}

          {card.type === 'delay' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">Show typing for</span>
              </div>
              <input
                type="number"
                min="1"
                max="30"
                value={(card as DelayBlockCard).seconds}
                onChange={(e) => updateCard(index, { seconds: parseInt(e.target.value) || 1 })}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
              />
              <span className="text-gray-600">seconds</span>
            </div>
          )}

          {card.type === 'goToBlock' && (
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-green-600" />
              <select
                value={(card as GoToBlockCard).blockId}
                onChange={(e) => updateCard(index, { blockId: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select a block...</option>
                {blocks
                  .filter((b) => b.id !== selectedBlockId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Card footer with actions */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">{cardType?.label}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => moveCard(index, 'up')}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => moveCard(index, 'down')}
              disabled={index === cards.length - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button onClick={() => removeCard(index)} className="p-1 text-gray-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-0px)] flex">
        {/* Left Panel - Block List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="search by group or block name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Block List */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    BLOCKS OF YOUR BOT
                  </h3>
                  <p className="text-xs text-gray-400">
                    Your bot consists of content 'blocks'. Blocks are like individual pages on a website.
                  </p>
                </div>

                {/* Special Blocks */}
                <div className="space-y-1">
                  {welcomeBlock && renderBlockItem(welcomeBlock, true)}
                  {defaultAnswerBlock && renderBlockItem(defaultAnswerBlock, true)}
                </div>

                {/* Add Blocks Here */}
                <div>
                  <button
                    onClick={() => handleCreateBlock()}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">ADD BLOCKS HERE</span>
                  </button>
                </div>

                {/* Grouped Blocks */}
                {Object.entries(groupedBlocks).map(([group, groupBlocks]) => {
                  const isExpanded = expandedGroups.has(group);
                  const groupLabel = group || 'Ungrouped';

                  return (
                    <div key={group}>
                      <button
                        onClick={() => toggleGroup(group)}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        {groupLabel}
                      </button>
                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-2">
                          {groupBlocks.map((block) => (
                            <button
                              key={block.id}
                              onClick={() => selectBlock(block.id)}
                              className={`p-2 text-left rounded border text-xs truncate ${
                                selectedBlockId === block.id
                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {block.name}
                            </button>
                          ))}
                          <button
                            onClick={() => handleCreateBlock(group)}
                            className="p-2 border-2 border-dashed border-gray-200 rounded text-gray-400 hover:text-gray-600 hover:border-gray-300"
                          >
                            <Plus className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Sequence or Group */}
                <button
                  onClick={() => setShowAddGroupModal(true)}
                  className="w-full flex items-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                  ADD SEQUENCE OR GROUP
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Block Editor */}
        <div className="flex-1 bg-gray-50 flex flex-col">
          {selectedBlock ? (
            <>
              {/* Editor Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      value={blockName}
                      onChange={(e) => {
                        setBlockName(e.target.value);
                        markChanged();
                      }}
                      className="text-xl font-semibold text-gray-900 bg-transparent border-none focus:ring-0 p-0"
                    />
                    <button
                      onClick={() => {
                        setIsEnabled(!isEnabled);
                        markChanged();
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      title={isEnabled ? 'Block is enabled' : 'Block is disabled'}
                    >
                      {isEnabled ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedBlock.isWelcome && !selectedBlock.isDefaultAnswer && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBlock(selectedBlock.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                    <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="sm">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>

                {/* Triggers Section - Only for non-special blocks */}
                {!selectedBlock.isWelcome && !selectedBlock.isDefaultAnswer && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-700">Keywords (Triggers)</span>
                      <span className="text-xs text-gray-400">- เมื่อ user พิมพ์ keyword เหล่านี้ จะ trigger block นี้</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {triggers.map((trigger) => (
                        <span
                          key={trigger}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                        >
                          {trigger}
                          <button
                            onClick={() => removeTrigger(trigger)}
                            className="hover:text-yellow-900"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newTrigger}
                          onChange={(e) => setNewTrigger(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTrigger();
                            }
                          }}
                          placeholder="เพิ่ม keyword..."
                          className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                        <button
                          onClick={addTrigger}
                          disabled={!newTrigger.trim()}
                          className="p-1.5 text-yellow-600 hover:text-yellow-700 disabled:text-gray-300"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {triggers.length === 0 && (
                      <p className="mt-2 text-xs text-gray-400">
                        ยังไม่มี keyword - พิมพ์ keyword แล้วกด Enter เพื่อเพิ่ม (เช่น: hello, hi, สวัสดี)
                      </p>
                    )}
                  </div>
                )}

                {/* Inbound/Outbound links */}
                <div className="mt-4 flex gap-8 text-sm">
                  <div>
                    <span className="text-gray-500">Inbound links</span>
                    <span className="ml-2 text-blue-600">Facebook Page</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Outbound links</span>
                    <span className="ml-2 text-gray-400">
                      None. Send users to another block or a URL from here.
                    </span>
                  </div>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-xl mx-auto space-y-4">
                  {cards.map((card, index) => renderCardEditor(card, index))}

                  {/* Add Card Button */}
                  <div className="relative">
                    {showAddCard ? (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-gray-700">Add Content</span>
                          <button onClick={() => setShowAddCard(false)}>
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {cardTypes.map((type) => (
                            <button
                              key={type.type}
                              onClick={() => addCard(type.type)}
                              className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                            >
                              <div className={`p-2 rounded ${type.color}`}>
                                <type.icon className="w-4 h-4" />
                              </div>
                              <span className="text-xs text-gray-600">{type.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddCard(true)}
                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Add Content
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Test Flow Button */}
              <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-end">
                <Button variant="secondary">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Test this flow
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a block</h3>
                <p className="text-gray-500">Choose a block from the left panel to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 p-1 hover:bg-white/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowAddGroupModal(false);
              setNewGroupName('');
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Sequence or Group</h3>
              <button
                onClick={() => {
                  setShowAddGroupModal(false);
                  setNewGroupName('');
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <Input
                  placeholder="Enter group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGroupName.trim()) {
                      handleAddGroup();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddGroupModal(false);
                    setNewGroupName('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                  Create Group
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
