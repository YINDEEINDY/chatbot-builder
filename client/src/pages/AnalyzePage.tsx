import { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { useBotStore } from '../stores/bot.store';
import { analyticsApi, AnalyticsSummary, DailyData, ContactStats } from '../api/analytics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Users,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Target,
  RefreshCw,
} from 'lucide-react';

export function AnalyzePage() {
  const { currentBot } = useBotStore();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [contactStats, setContactStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (currentBot?.id) {
      loadAnalytics();
    }
  }, [currentBot?.id, days]);

  const loadAnalytics = async () => {
    if (!currentBot?.id) return;

    setLoading(true);
    try {
      const [summaryRes, dailyRes, contactRes] = await Promise.all([
        analyticsApi.getSummary(currentBot.id, days),
        analyticsApi.getDailyData(currentBot.id, days),
        analyticsApi.getContactStats(currentBot.id),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
      if (dailyRes.success && dailyRes.data) {
        setDailyData(dailyRes.data);
      }
      if (contactRes.success && contactRes.data) {
        setContactStats(contactRes.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      label: 'Total Messages',
      value: summary?.totalMessages?.toLocaleString() || '0',
      change: summary?.percentChange?.messages
        ? `${summary.percentChange.messages > 0 ? '+' : ''}${summary.percentChange.messages}%`
        : '+0%',
      trend: (summary?.percentChange?.messages || 0) >= 0 ? 'up' : 'down',
      icon: MessageCircle,
      color: 'blue',
    },
    {
      label: 'Incoming',
      value: summary?.incomingMessages?.toLocaleString() || '0',
      change: '',
      trend: 'neutral',
      icon: TrendingDown,
      color: 'green',
    },
    {
      label: 'Outgoing',
      value: summary?.outgoingMessages?.toLocaleString() || '0',
      change: '',
      trend: 'neutral',
      icon: TrendingUp,
      color: 'purple',
    },
    {
      label: 'Total Users',
      value: contactStats?.totalContacts?.toLocaleString() || '0',
      change: summary?.percentChange?.users
        ? `${summary.percentChange.users > 0 ? '+' : ''}${summary.percentChange.users}%`
        : '+0%',
      trend: (summary?.percentChange?.users || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  };

  // Format chart data
  const chartData = dailyData.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analyze</h1>
            <p className="text-gray-500 mt-1">
              Track your bot's performance and user engagement
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button
              onClick={loadAnalytics}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
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
                    {stat.change && (
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
                          {stat.change} vs previous period
                        </span>
                      </div>
                    )}
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
              <p className="text-sm text-gray-500">Last {days} days</p>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 && chartData.some((d) => d.incoming > 0 || d.outgoing > 0) ? (
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="incoming" name="Incoming" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outgoing" name="Outgoing" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No data yet</p>
                    <p className="text-sm text-gray-400">
                      Charts will appear when you have message data
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Activity Chart */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">User Activity</h3>
              <p className="text-sm text-gray-500">Unique users per day</p>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 && chartData.some((d) => d.users > 0) ? (
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="users" name="Users" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No data yet</p>
                    <p className="text-sm text-gray-400">
                      User activity will appear when users start chatting
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">User Activity Summary</h3>
              <p className="text-sm text-gray-500">Recent user engagement</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-700">Total Contacts</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {contactStats?.totalContacts || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">Active Today</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {contactStats?.activeToday || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-500" />
                    <span className="text-gray-700">Active Last 7 Days</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {contactStats?.activeLast7Days || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Message Breakdown</h3>
              <p className="text-sm text-gray-500">In the selected period</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700">Total Messages</span>
                  <span className="font-semibold text-blue-900">
                    {summary?.totalMessages || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">Incoming (from users)</span>
                  <span className="font-semibold text-green-900">
                    {summary?.incomingMessages || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-700">Outgoing (bot replies)</span>
                  <span className="font-semibold text-purple-900">
                    {summary?.outgoingMessages || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Conversion Goals</h3>
              <p className="text-sm text-gray-500">Track important user actions</p>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Coming soon</p>
                  <p className="text-sm text-gray-400">
                    Goal tracking will be available soon
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
