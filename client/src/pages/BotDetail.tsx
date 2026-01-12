import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useBotStore } from '../stores/bot.store';
import { useFlowStore } from '../stores/flow.store';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  ArrowLeft,
  Settings,
  Workflow,
  Plus,
  Trash2,
  Star,
  ExternalLink,
} from 'lucide-react';

export function BotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentBot, loadBot, updateBot, isLoading } = useBotStore();
  const { flows, loadFlows, createFlow, deleteFlow } = useFlowStore();
  const [showSettings, setShowSettings] = useState(false);
  const [botName, setBotName] = useState('');
  const [botDescription, setBotDescription] = useState('');
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');

  useEffect(() => {
    if (id) {
      loadBot(id);
      loadFlows(id);
    }
  }, [id, loadBot, loadFlows]);

  useEffect(() => {
    if (currentBot) {
      setBotName(currentBot.name);
      setBotDescription(currentBot.description || '');
    }
  }, [currentBot]);

  const handleSaveSettings = async () => {
    if (!id) return;
    await updateBot(id, { name: botName, description: botDescription });
    setShowSettings(false);
  };

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newFlowName.trim()) return;
    const flow = await createFlow(id, newFlowName);
    setShowCreateFlow(false);
    setNewFlowName('');
    navigate(`/bots/${id}/flows/${flow.id}`);
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this flow?')) {
      await deleteFlow(id, flowId);
    }
  };

  if (isLoading || !currentBot) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="animate-pulse">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/bots')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{currentBot.name}</h1>
            <p className="text-gray-500">{currentBot.description || 'No description'}</p>
          </div>
          <Button variant="secondary" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Status */}
        <Card className="mb-8">
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  currentBot.isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className="text-gray-700">
                {currentBot.isActive ? 'Bot is active' : 'Bot is inactive'}
              </span>
            </div>
            {currentBot.facebookPageId ? (
              <span className="text-sm text-gray-500">
                Connected to Facebook Page: {currentBot.facebookPageId}
              </span>
            ) : (
              <Button variant="secondary" size="sm">
                Connect Facebook
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Flows */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Flows</h2>
            <Button size="sm" onClick={() => setShowCreateFlow(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Flow
            </Button>
          </div>

          {flows.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No flows yet. Create your first flow!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flows.map((flow) => (
                <Link key={flow.id} to={`/bots/${id}/flows/${flow.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Workflow className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-gray-900">{flow.name}</h3>
                        </div>
                        {flow.isDefault && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span
                          className={`text-xs font-medium ${
                            flow.isActive ? 'text-green-600' : 'text-gray-500'
                          }`}
                        >
                          {flow.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          {!flow.isDefault && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteFlow(flow.id);
                              }}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <h2 className="text-xl font-bold text-gray-900">Bot Settings</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Bot Name"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={botDescription}
                    onChange={(e) => setBotDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowSettings(false)}
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleSaveSettings}>
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Flow Modal */}
        {showCreateFlow && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Flow</h2>
                <form onSubmit={handleCreateFlow} className="space-y-4">
                  <Input
                    label="Flow Name"
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    placeholder="Welcome Flow"
                    required
                  />
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setShowCreateFlow(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
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
