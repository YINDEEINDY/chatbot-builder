import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useBotStore } from '../stores/bot.store';
import {
  BarChart3,
  Users,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Target,
} from 'lucide-react';

export function AnalyzePage() {
  const { currentBot } = useBotStore();

  const stats = [
    {
      label: 'Total Users',
      value: '0',
      change: '+0%',
      trend: 'up',
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Messages Today',
      value: '0',
      change: '+0%',
      trend: 'up',
      icon: MessageCircle,
      color: 'green',
    },
    {
      label: 'Active Users',
      value: '0',
      change: '+0%',
      trend: 'up',
      icon: Zap,
      color: 'purple',
    },
    {
      label: 'Avg Response Time',
      value: '0s',
      change: '0%',
      trend: 'neutral',
      icon: Clock,
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  };

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Analyze</h1>
          <p className="text-gray-500 mt-1">
            Track your bot's performance and user engagement
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : stat.trend === 'down' ? (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      ) : null}
                      <span
                        className={`text-xs ${
                          stat.trend === 'up'
                            ? 'text-green-500'
                            : stat.trend === 'down'
                            ? 'text-red-500'
                            : 'text-gray-500'
                        }`}
                      >
                        {stat.change} vs last week
                      </span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${colorClasses[stat.color].bg}`}>
                    <stat.icon className={`w-5 h-5 ${colorClasses[stat.color].text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Messages Chart */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Messages Over Time</h3>
              <p className="text-sm text-gray-500">Last 7 days</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No data yet</p>
                  <p className="text-sm text-gray-400">
                    Charts will appear when you have message data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Growth Chart */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">User Growth</h3>
              <p className="text-sm text-gray-500">Last 30 days</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No data yet</p>
                  <p className="text-sm text-gray-400">
                    Growth chart will appear when users start chatting
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Top Triggered Blocks</h3>
              <p className="text-sm text-gray-500">Most popular conversation paths</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-sm font-medium">
                        {i}
                      </div>
                      <span className="text-gray-400">No data</span>
                    </div>
                    <span className="text-gray-400">-</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Conversion Goals</h3>
              <p className="text-sm text-gray-500">Track important user actions</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No goals configured</p>
                  <p className="text-sm text-gray-400">
                    Set up conversion goals to track user actions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
