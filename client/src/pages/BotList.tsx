import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useBotStore } from '../stores/bot.store';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Bot, Plus, Search, Trash2, Edit, Workflow } from 'lucide-react';

export function BotListPage() {
  const { bots, loadBots, createBot, deleteBot, isLoading } = useBotStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotDescription, setNewBotDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  const filteredBots = bots.filter(
    (bot) =>
      bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim()) return;

    setIsCreating(true);
    try {
      const bot = await createBot(newBotName, newBotDescription);
      setShowCreateModal(false);
      setNewBotName('');
      setNewBotDescription('');
      navigate(`/bots/${bot.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBot = async (botId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this bot?')) {
      await deleteBot(botId);
    }
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bots</h1>
            <p className="text-gray-500">Manage your chatbots</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Bot
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Bot List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filteredBots.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bots found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Try a different search term' : 'Create your first bot to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bot
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBots.map((bot) => (
              <Link key={bot.id} to={`/bots/${bot.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Bot className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                          <span
                            className={`text-xs font-medium ${
                              bot.isActive ? 'text-green-600' : 'text-gray-500'
                            }`}
                          >
                            {bot.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 flex-1 mb-4">
                      {bot.description || 'No description'}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Workflow className="w-4 h-4" />
                          {bot._count?.flows || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/bots/${bot.id}/edit`);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteBot(bot.id, e)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Bot</h2>
                <form onSubmit={handleCreateBot} className="space-y-4">
                  <Input
                    label="Bot Name"
                    id="botName"
                    value={newBotName}
                    onChange={(e) => setNewBotName(e.target.value)}
                    placeholder="My Awesome Bot"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={newBotDescription}
                      onChange={(e) => setNewBotDescription(e.target.value)}
                      placeholder="A helpful bot for..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" isLoading={isCreating}>
                      Create
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
