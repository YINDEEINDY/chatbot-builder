import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useBotStore } from '../stores/bot.store';
import { Card, CardContent } from '../components/ui/Card';
import { Bot, MessageSquare, Plus, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function DashboardPage() {
  const { bots, loadBots, isLoading } = useBotStore();

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  const totalBots = bots.length;
  const activeBots = bots.filter((bot) => bot.isActive).length;
  const totalMessages = bots.reduce((sum, bot) => sum + (bot._count?.messages || 0), 0);

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here's an overview of your chatbots.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Bots</p>
                <p className="text-2xl font-bold text-gray-900">{totalBots}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Bots</p>
                <p className="text-2xl font-bold text-gray-900">{activeBots}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{totalMessages}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <Link to="/bots">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Bot
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Bots */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Bots</h2>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : bots.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No bots yet. Create your first bot to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bots.slice(0, 6).map((bot) => (
                <Link key={bot.id} to={`/bots/${bot.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {bot.description || 'No description'}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            bot.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {bot.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                        <span>{bot._count?.flows || 0} flows</span>
                        <span>{bot._count?.messages || 0} messages</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
