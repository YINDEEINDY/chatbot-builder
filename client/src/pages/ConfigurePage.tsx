import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useBotStore } from '../stores/bot.store';
import { authApi } from '../api/auth';
import { profileApi } from '../api/profile';
import type { NotificationSettings } from '../types';
import {
  Settings,
  Facebook,
  Instagram,
  Key,
  Bell,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  X,
  Loader2,
  Link as LinkIcon,
  Unlink,
  Power,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface FacebookPage {
  id: string;
  name: string;
  picture?: string;
  igAccount?: { id: string; username: string };
}

export function ConfigurePage() {
  const { currentBot, updateBot, loadBot } = useBotStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Facebook Pages picker state
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [pageSessionId, setPageSessionId] = useState<string | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    notifyNewMessages: true,
    notifyDailySummary: false,
    notifyBotErrors: true,
  });
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    if (currentBot) {
      setFormData({
        name: currentBot.name || '',
        description: currentBot.description || '',
      });
    }
  }, [currentBot]);

  // Fetch notification settings on mount
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const response = await profileApi.getNotificationSettings();
        if (response.success && response.data) {
          setNotificationSettings(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch notification settings:', err);
      } finally {
        setLoadingNotifications(false);
      }
    };
    fetchNotificationSettings();
  }, []);

  // Check for pageSession or error in URL
  useEffect(() => {
    const pageSession = searchParams.get('pageSession');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clear from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      setSearchParams(newParams);
    }

    if (pageSession) {
      setPageSessionId(pageSession);
      fetchPagesFromSession(pageSession);
      // Clear from URL after storing
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('pageSession');
      setSearchParams(newParams);
    }
  }, [searchParams, setSearchParams]);

  const fetchPagesFromSession = async (sessionId: string) => {
    setLoadingPages(true);
    try {
      const response = await authApi.getFacebookPagesFromSession(sessionId);
      if (response.success && response.data) {
        setPages(response.data.pages);
        setShowPagePicker(true);
      } else {
        setError('Failed to load Facebook Pages. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch Facebook Pages');
    } finally {
      setLoadingPages(false);
    }
  };

  const handleConnectFacebook = async () => {
    if (!currentBot) return;
    setIsConnecting(true);
    setError(null);
    try {
      const response = await authApi.getFacebookPagesAuthUrl(currentBot.id);
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start Facebook connection');
      setIsConnecting(false);
    }
  };

  const handleSelectPage = async (pageId: string) => {
    if (!currentBot || !pageSessionId) return;
    setIsConnecting(true);
    setError(null);
    try {
      const response = await authApi.connectFacebookPage(currentBot.id, pageSessionId, pageId);
      if (response.success) {
        // Reload bot to get updated data
        await loadBot(currentBot.id);
        setShowPagePicker(false);
        setPages([]);
        setPageSessionId(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect Facebook Page');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectFacebook = async () => {
    if (!currentBot) return;
    if (!window.confirm('Are you sure you want to disconnect this Facebook Page? Your bot will stop responding to messages.')) {
      return;
    }
    setIsDisconnecting(true);
    setError(null);
    try {
      const response = await authApi.disconnectFacebookPage(currentBot.id);
      if (response.success) {
        await loadBot(currentBot.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disconnect Facebook Page');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    if (!currentBot) return;
    setIsLoading(true);
    try {
      await updateBot(currentBot.id, formData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!currentBot) return;
    setIsTogglingActive(true);
    setError(null);
    try {
      await updateBot(currentBot.id, { isActive: !currentBot.isActive });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update bot status');
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleNotificationChange = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    try {
      await profileApi.updateNotificationSettings({ [key]: value });
    } catch (err) {
      // Revert on error
      setNotificationSettings(notificationSettings);
      console.error('Failed to update notification settings:', err);
    }
  };

  const webhookUrl = currentBot
    ? `${import.meta.env.VITE_SERVER_PUBLIC_URL || window.location.origin.replace('5173', '3001')}/api/webhooks/facebook/${currentBot.id}`
    : '';

  return (
    <MainLayout>
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Configure</h1>
          <p className="text-gray-500 mt-1">Manage your bot settings and integrations</p>
        </div>

        {/* Bot Status Toggle */}
        <Card className={`mb-6 ${currentBot?.isActive ? 'border-green-200' : 'border-red-200'}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${currentBot?.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Power className={`w-5 h-5 ${currentBot?.isActive ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Bot Status</h3>
                  <p className={`text-sm ${currentBot?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {currentBot?.isActive ? 'Active - Bot is responding to messages' : 'Inactive - Bot is not responding'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleActive}
                disabled={isTogglingActive}
                className="focus:outline-none disabled:opacity-50"
              >
                {isTogglingActive ? (
                  <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                ) : currentBot?.isActive ? (
                  <ToggleRight className="w-10 h-10 text-green-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-400" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* General Settings */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">General Settings</h3>
                <p className="text-sm text-gray-500">Basic bot configuration</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Bot Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Awesome Bot"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this bot do?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button onClick={handleSave} isLoading={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Facebook Integration */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Facebook className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Facebook Integration</h3>
                <p className="text-sm text-gray-500">Connect your Facebook Page</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentBot?.facebookPageId ? (
              // Connected state
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-800">Connected to Facebook</p>
                      <p className="text-sm text-green-700">
                        Page: <span className="font-semibold">{currentBot.facebookPageName || currentBot.facebookPageId}</span>
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDisconnectFacebook}
                      isLoading={isDisconnecting}
                    >
                      <Unlink className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Your bot is now active and will respond to messages on your Facebook Page.
                    Make sure you have set up the webhook in your Facebook App.
                  </p>
                </div>
              </>
            ) : (
              // Not connected state
              <>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-800">Not Connected</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    Connect a Facebook Page to enable messaging
                  </p>
                </div>

                <Button onClick={handleConnectFacebook} isLoading={isConnecting || loadingPages}>
                  <Facebook className="w-4 h-4 mr-2" />
                  Connect Facebook Page
                </Button>

                <p className="text-sm text-gray-500">
                  You will be redirected to Facebook to authorize access to your Pages.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Instagram Integration */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                <Instagram className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Instagram Integration</h3>
                <p className="text-sm text-gray-500">Instagram Business Account linked via Facebook Page</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {currentBot?.igUsername ? (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-pink-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-pink-600" />
                  <div className="flex-1">
                    <p className="font-medium text-pink-800">Instagram Connected</p>
                    <p className="text-sm text-pink-700">
                      @<span className="font-semibold">{currentBot.igUsername}</span>
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      window.open(`https://instagram.com/${currentBot.igUsername}`, '_blank')
                    }
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Profile
                  </Button>
                </div>
                <p className="text-sm text-pink-700 mt-2">
                  Your bot will also respond to Instagram Direct Messages.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  {currentBot?.facebookPageId
                    ? 'No Instagram Business Account is linked to this Facebook Page. Link an Instagram account to your Page in Facebook settings to enable Instagram DM support.'
                    : 'Connect a Facebook Page first. If the page has a linked Instagram Business Account, it will be detected automatically.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Settings */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Key className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Webhook Settings</h3>
                <p className="text-sm text-gray-500">Configure Facebook webhook</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-600"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(webhookUrl, 'webhook')}
                >
                  {copied === 'webhook' ? 'Copied!' : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use this URL in your Facebook App webhook settings
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verify Token
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentBot?.webhookVerifyToken || ''}
                  className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-600"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    handleCopy(currentBot?.webhookVerifyToken || '', 'verify')
                  }
                >
                  {copied === 'verify' ? 'Copied!' : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter this token when setting up the webhook in Facebook
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={() =>
                window.open('https://developers.facebook.com/apps/', '_blank')
              }
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Facebook Developer Console
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-500">Manage notification preferences</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingNotifications ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading notification settings...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    checked={notificationSettings.notifyNewMessages}
                    onChange={(e) => handleNotificationChange('notifyNewMessages', e.target.checked)}
                  />
                  <span className="text-gray-700">Email notifications for new messages</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    checked={notificationSettings.notifyDailySummary}
                    onChange={(e) => handleNotificationChange('notifyDailySummary', e.target.checked)}
                  />
                  <span className="text-gray-700">Daily summary email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    checked={notificationSettings.notifyBotErrors}
                    onChange={(e) => handleNotificationChange('notifyBotErrors', e.target.checked)}
                  />
                  <span className="text-gray-700">Alert when bot encounters an error</span>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900">Danger Zone</h3>
                <p className="text-sm text-red-600">Irreversible actions</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium text-red-900">Delete this bot</p>
                <p className="text-sm text-red-600">
                  This will permanently delete the bot and all its data
                </p>
              </div>
              <Button variant="danger">Delete Bot</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facebook Page Picker Modal */}
      {showPagePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Select a Facebook Page</h2>
                <button
                  onClick={() => {
                    setShowPagePicker(false);
                    setPages([]);
                    setPageSessionId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Choose which page you want to connect to this bot
              </p>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {pages.length === 0 ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">Loading your pages...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => handleSelectPage(page.id)}
                      disabled={isConnecting}
                      className="w-full p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center gap-3 text-left disabled:opacity-50"
                    >
                      {page.picture ? (
                        <img
                          src={page.picture}
                          alt={page.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Facebook className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{page.name}</p>
                        {page.igAccount ? (
                          <p className="text-sm text-pink-600">
                            <Instagram className="w-3 h-3 inline mr-1" />
                            @{page.igAccount.username}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">ID: {page.id}</p>
                        )}
                      </div>
                      <LinkIcon className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isConnecting && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center gap-3 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting page...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
