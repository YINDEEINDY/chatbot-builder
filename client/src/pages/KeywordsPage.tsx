import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Hash, Plus, Trash2, Save, X, MessageSquare } from 'lucide-react';
import { blocksApi } from '../api/blocks';
import { Block } from '../types';

interface Keyword {
  id: string;
  keyword: string;
  blockId: string;
  blockName: string;
  isEditing?: boolean;
}

export function KeywordsPage() {
  const { botId } = useParams<{ botId: string }>();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');

  useEffect(() => {
    if (botId) {
      loadData();
    }
  }, [botId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load blocks
      const blocksResponse = await blocksApi.list(botId!);
      if (blocksResponse.success && blocksResponse.data) {
        setBlocks(blocksResponse.data);

        // Extract keywords from blocks
        const extractedKeywords: Keyword[] = [];
        blocksResponse.data.forEach((block: Block) => {
          try {
            const triggers = JSON.parse(block.triggers || '[]');
            triggers.forEach((trigger: string, index: number) => {
              extractedKeywords.push({
                id: `${block.id}-${index}`,
                keyword: trigger,
                blockId: block.id,
                blockName: block.name,
              });
            });
          } catch {
            // Invalid JSON, skip
          }
        });
        setKeywords(extractedKeywords);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim() || !selectedBlockId) return;

    const block = blocks.find((b) => b.id === selectedBlockId);
    if (!block) return;

    try {
      const currentTriggers = JSON.parse(block.triggers || '[]');
      const updatedTriggers = [...currentTriggers, newKeyword.trim()];

      await blocksApi.update(botId!, block.id, {
        triggers: updatedTriggers,
      });

      await loadData();
      setNewKeyword('');
      setSelectedBlockId('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add keyword:', error);
    }
  };

  const handleDeleteKeyword = async (keyword: Keyword) => {
    const block = blocks.find((b) => b.id === keyword.blockId);
    if (!block) return;

    try {
      const currentTriggers = JSON.parse(block.triggers || '[]');
      const updatedTriggers = currentTriggers.filter((t: string) => t !== keyword.keyword);

      await blocksApi.update(botId!, block.id, {
        triggers: updatedTriggers,
      });

      await loadData();
    } catch (error) {
      console.error('Failed to delete keyword:', error);
    }
  };

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Keywords</h1>
            <p className="text-gray-500 mt-1">
              Set up keywords that trigger specific blocks when users send messages
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Keyword
          </Button>
        </div>

        {/* Add Keyword Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Add New Keyword</h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Input
                    label="Keyword"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="e.g., hello, help, pricing"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trigger Block
                  </label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a block...</option>
                    {blocks.map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddKeyword} disabled={!newKeyword.trim() || !selectedBlockId}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keywords List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : keywords.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Hash className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No keywords yet</h3>
                <p className="text-gray-500 mb-4">
                  Keywords help trigger specific blocks when users send matching messages
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Keyword
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      Keyword
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      Triggers Block
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {keywords.map((keyword) => (
                    <tr key={keyword.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{keyword.keyword}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-600">{keyword.blockName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteKeyword(keyword)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hash className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">How Keywords Work</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• When a user sends a message containing a keyword, the linked block is triggered</li>
                  <li>• Keywords are case-insensitive (e.g., "Hello" matches "hello", "HELLO")</li>
                  <li>• You can assign multiple keywords to the same block</li>
                  <li>• If no keyword matches, the Default Answer block is used</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
