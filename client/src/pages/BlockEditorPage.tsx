import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
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
  Settings,
} from 'lucide-react';

// Card type options
const cardTypes = [
  { type: 'text', label: 'Text Message', icon: MessageSquare, color: 'bg-blue-100 text-blue-600' },
  { type: 'image', label: 'Image', icon: Image, color: 'bg-purple-100 text-purple-600' },
  { type: 'gallery', label: 'Gallery/Card', icon: LayoutGrid, color: 'bg-orange-100 text-orange-600' },
  { type: 'quickReply', label: 'Quick Reply', icon: HelpCircle, color: 'bg-pink-100 text-pink-600' },
  { type: 'userInput', label: 'User Input', icon: Pencil, color: 'bg-yellow-100 text-yellow-600' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'bg-gray-100 text-gray-600' },
  { type: 'goToBlock', label: 'Go to Block', icon: ArrowRight, color: 'bg-green-100 text-green-600' },
] as const;

// Generate unique ID
const generateId = () => `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create default card data
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

// Parse cards from JSON
const parseCards = (cardsJson: string): BlockCard[] => {
  try {
    return JSON.parse(cardsJson) || [];
  } catch {
    return [];
  }
};

// Parse triggers from JSON
const parseTriggers = (triggersJson: string): string[] => {
  try {
    return JSON.parse(triggersJson) || [];
  } catch {
    return [];
  }
};

export function BlockEditorPage() {
  const { botId, blockId } = useParams<{ botId: string; blockId: string }>();
  const navigate = useNavigate();

  const [block, setBlock] = useState<Block | null>(null);
  const [cards, setCards] = useState<BlockCard[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [blockName, setBlockName] = useState('');
  const [groupName, setGroupName] = useState<string | null>(null);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [groups, setGroups] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newTrigger, setNewTrigger] = useState('');

  useEffect(() => {
    loadBlock();
  }, [botId, blockId]);

  const loadBlock = async () => {
    if (!botId || !blockId) return;
    setIsLoading(true);
    try {
      const [blockRes, blocksRes, groupsRes] = await Promise.all([
        blocksApi.get(botId, blockId),
        blocksApi.list(botId),
        blocksApi.getGroups(botId),
      ]);

      if (blockRes.success && blockRes.data) {
        const b = blockRes.data;
        setBlock(b);
        setBlockName(b.name);
        setGroupName(b.groupName || null);
        setCards(parseCards(b.cards));
        setTriggers(parseTriggers(b.triggers));
      }

      if (blocksRes.success && blocksRes.data) {
        setAllBlocks(blocksRes.data.filter((b) => b.id !== blockId));
      }

      if (groupsRes.success && groupsRes.data) {
        setGroups(groupsRes.data);
      }
    } catch (error) {
      console.error('Failed to load block:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!botId || !blockId) return;
    setIsSaving(true);
    try {
      await blocksApi.update(botId, blockId, {
        name: blockName,
        groupName: groupName,
        cards: cards,
        triggers: triggers,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save block:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  const addCard = (type: string) => {
    const newCard = createDefaultCard(type);
    setCards((prev) => [...prev, newCard]);
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
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, ...updates } : card))
    );
    markChanged();
  };

  const addTrigger = () => {
    if (!newTrigger.trim()) return;
    setTriggers((prev) => [...prev, newTrigger.trim()]);
    setNewTrigger('');
    markChanged();
  };

  const removeTrigger = (index: number) => {
    setTriggers((prev) => prev.filter((_, i) => i !== index));
    markChanged();
  };

  // Card editor components
  const renderCardEditor = (card: BlockCard, index: number) => {
    const cardType = cardTypes.find((t) => t.type === card.type);
    const Icon = cardType?.icon || MessageSquare;
    const colorClass = cardType?.color || 'bg-gray-100 text-gray-600';

    return (
      <div key={card.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
          <div className={`p-1.5 rounded ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-medium text-sm text-gray-700 flex-1">{cardType?.label}</span>

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
            <button
              onClick={() => removeCard(index)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card content */}
        <div className="p-4">{renderCardContent(card, index)}</div>
      </div>
    );
  };

  const renderCardContent = (card: BlockCard, index: number) => {
    switch (card.type) {
      case 'text':
        return (
          <textarea
            value={(card as TextBlockCard).text}
            onChange={(e) => updateCard(index, { text: e.target.value })}
            placeholder="Enter your message..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
          />
        );

      case 'image':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="url"
                value={(card as ImageBlockCard).imageUrl}
                onChange={(e) => updateCard(index, { imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
              <input
                type="text"
                value={(card as ImageBlockCard).caption || ''}
                onChange={(e) => updateCard(index, { caption: e.target.value })}
                placeholder="Image caption..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'gallery':
        const galleryCard = card as GalleryBlockCard;
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={galleryCard.title}
                onChange={(e) => updateCard(index, { title: e.target.value })}
                placeholder="Card title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={galleryCard.subtitle || ''}
                onChange={(e) => updateCard(index, { subtitle: e.target.value })}
                placeholder="Card subtitle..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="url"
                value={galleryCard.imageUrl || ''}
                onChange={(e) => updateCard(index, { imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buttons</label>
              <div className="space-y-2">
                {galleryCard.buttons.map((btn, btnIdx) => (
                  <div key={btn.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <input
                      type="text"
                      value={btn.title}
                      onChange={(e) => {
                        const newButtons = [...galleryCard.buttons];
                        newButtons[btnIdx] = { ...btn, title: e.target.value };
                        updateCard(index, { buttons: newButtons });
                      }}
                      placeholder="Button title"
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <select
                      value={btn.type}
                      onChange={(e) => {
                        const newButtons = [...galleryCard.buttons];
                        newButtons[btnIdx] = { ...btn, type: e.target.value as any };
                        updateCard(index, { buttons: newButtons });
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="block">Go to Block</option>
                      <option value="url">Open URL</option>
                      <option value="postback">Postback</option>
                    </select>
                    {btn.type === 'block' && (
                      <select
                        value={btn.blockId || ''}
                        onChange={(e) => {
                          const newButtons = [...galleryCard.buttons];
                          newButtons[btnIdx] = { ...btn, blockId: e.target.value };
                          updateCard(index, { buttons: newButtons });
                        }}
                        className="px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="">Select block...</option>
                        {allBlocks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {btn.type === 'url' && (
                      <input
                        type="url"
                        value={btn.url || ''}
                        onChange={(e) => {
                          const newButtons = [...galleryCard.buttons];
                          newButtons[btnIdx] = { ...btn, url: e.target.value };
                          updateCard(index, { buttons: newButtons });
                        }}
                        placeholder="https://..."
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    )}
                    <button
                      onClick={() => {
                        const newButtons = galleryCard.buttons.filter((_, i) => i !== btnIdx);
                        updateCard(index, { buttons: newButtons });
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newButton = {
                      id: generateId(),
                      title: '',
                      type: 'block' as const,
                    };
                    updateCard(index, { buttons: [...galleryCard.buttons, newButton] });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Button
                </button>
              </div>
            </div>
          </div>
        );

      case 'quickReply':
        const qrCard = card as QuickReplyBlockCard;
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={qrCard.text}
                onChange={(e) => updateCard(index, { text: e.target.value })}
                placeholder="Enter message before quick replies..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quick Reply Buttons</label>
              <div className="space-y-2">
                {qrCard.buttons.map((btn, btnIdx) => (
                  <div key={btn.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <input
                      type="text"
                      value={btn.title}
                      onChange={(e) => {
                        const newButtons = [...qrCard.buttons];
                        newButtons[btnIdx] = { ...btn, title: e.target.value };
                        updateCard(index, { buttons: newButtons });
                      }}
                      placeholder="Button text"
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <select
                      value={btn.blockId || ''}
                      onChange={(e) => {
                        const newButtons = [...qrCard.buttons];
                        newButtons[btnIdx] = { ...btn, blockId: e.target.value || undefined };
                        updateCard(index, { buttons: newButtons });
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="">No redirect</option>
                      {allBlocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const newButtons = qrCard.buttons.filter((_, i) => i !== btnIdx);
                        updateCard(index, { buttons: newButtons });
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newButton = { id: generateId(), title: '' };
                    updateCard(index, { buttons: [...qrCard.buttons, newButton] });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Quick Reply
                </button>
              </div>
            </div>
          </div>
        );

      case 'userInput':
        const uiCard = card as UserInputBlockCard;
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Message</label>
              <input
                type="text"
                value={uiCard.prompt}
                onChange={(e) => updateCard(index, { prompt: e.target.value })}
                placeholder="What would you like to ask?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Save to Variable</label>
              <input
                type="text"
                value={uiCard.variableName}
                onChange={(e) => updateCard(index, { variableName: e.target.value })}
                placeholder="user_email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Block (after input)</label>
              <select
                value={uiCard.nextBlockId || ''}
                onChange={(e) => updateCard(index, { nextBlockId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Continue in current block</option>
                {allBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'delay':
        const delayCard = card as DelayBlockCard;
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delay (seconds)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={delayCard.seconds}
                onChange={(e) => updateCard(index, { seconds: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`typing-${card.id}`}
                checked={delayCard.showTyping ?? true}
                onChange={(e) => updateCard(index, { showTyping: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`typing-${card.id}`} className="text-sm text-gray-700">
                Show typing indicator
              </label>
            </div>
          </div>
        );

      case 'goToBlock':
        const gotoCard = card as GoToBlockCard;
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Go to Block</label>
            <select
              value={gotoCard.blockId}
              onChange={(e) => updateCard(index, { blockId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a block...</option>
              {allBlocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return <div className="text-gray-500">Unknown card type</div>;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    );
  }

  if (!block) {
    return (
      <MainLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Block not found</h3>
              <Button onClick={() => navigate(`/bots/${botId}/blocks`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blocks
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/bots/${botId}/blocks`)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <input
                  type="text"
                  value={blockName}
                  onChange={(e) => {
                    setBlockName(e.target.value);
                    markChanged();
                  }}
                  className="text-xl font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0"
                />
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {block.isWelcome && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Welcome Message</span>
                  )}
                  {block.isDefaultAnswer && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Default Answer</span>
                  )}
                  {groupName && <span className="text-gray-400">in {groupName}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {hasChanges ? 'Save Changes' : 'Saved'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Cards panel */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {cards.map((card, index) => renderCardEditor(card, index))}

              {/* Add card button */}
              <div className="relative">
                <button
                  onClick={() => setShowAddCard(!showAddCard)}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Card
                </button>

                {showAddCard && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2">
                    <div className="grid grid-cols-2 gap-2">
                      {cardTypes.map((type) => (
                        <button
                          key={type.type}
                          onClick={() => addCard(type.type)}
                          className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-left"
                        >
                          <div className={`p-2 rounded ${type.color}`}>
                            <type.icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {cards.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No cards yet</h3>
                    <p className="text-gray-500 mb-4">
                      Add cards to define what this block sends to users
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
              <h3 className="font-semibold text-gray-900 mb-4">Block Settings</h3>

              <div className="space-y-4">
                {/* Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                  <select
                    value={groupName || ''}
                    onChange={(e) => {
                      setGroupName(e.target.value || null);
                      markChanged();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No group</option>
                    {groups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or type new group name..."
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        setGroupName(e.target.value.trim());
                        markChanged();
                        e.target.value = '';
                      }
                    }}
                  />
                </div>

                {/* Triggers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Triggers (Keywords)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    When a user types these words, this block will be triggered
                  </p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTrigger}
                      onChange={(e) => setNewTrigger(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTrigger()}
                      placeholder="Add keyword..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <Button size="sm" onClick={addTrigger}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {triggers.map((trigger, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                      >
                        {trigger}
                        <button
                          onClick={() => removeTrigger(idx)}
                          className="hover:text-green-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
