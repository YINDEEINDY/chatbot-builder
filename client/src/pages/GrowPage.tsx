import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useBotStore } from '../stores/bot.store';
import {
  Link2,
  QrCode,
  MessageCircle,
  Share2,
  Copy,
  ExternalLink,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

export function GrowPage() {
  const { currentBot } = useBotStore();
  const [copied, setCopied] = useState<string | null>(null);

  const messengerLink = currentBot?.facebookPageId
    ? `https://m.me/${currentBot.facebookPageId}`
    : null;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const growthTools = [
    {
      id: 'messenger-link',
      title: 'Messenger Link',
      description: 'Share a direct link to start a conversation with your bot',
      icon: Link2,
      available: !!messengerLink,
    },
    {
      id: 'qr-code',
      title: 'QR Code',
      description: 'Generate a QR code that opens Messenger when scanned',
      icon: QrCode,
      available: !!messengerLink,
    },
    {
      id: 'chat-widget',
      title: 'Chat Widget',
      description: 'Embed a chat widget on your website',
      icon: MessageCircle,
      available: false,
      comingSoon: true,
    },
    {
      id: 'referral',
      title: 'Referral Program',
      description: 'Let subscribers invite friends and earn rewards',
      icon: Share2,
      available: false,
      comingSoon: true,
    },
  ];

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Grow</h1>
          <p className="text-gray-500 mt-1">
            Tools to grow your subscriber base and reach more people
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">Total Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">New This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Link2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">Link Clicks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Growth Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {growthTools.map((tool) => (
            <Card key={tool.id} className={tool.comingSoon ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <tool.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {tool.title}
                      {tool.comingSoon && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">{tool.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {tool.id === 'messenger-link' && (
                  <div className="space-y-3">
                    {messengerLink ? (
                      <>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={messengerLink}
                            className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-600"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCopy(messengerLink, 'messenger-link')}
                          >
                            {copied === 'messenger-link' ? (
                              'Copied!'
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(messengerLink, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Share this link on social media, email, or your website
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                        Connect a Facebook Page in Configure to get your Messenger link
                      </p>
                    )}
                  </div>
                )}

                {tool.id === 'qr-code' && (
                  <div className="space-y-3">
                    {messengerLink ? (
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                          <QrCode className="w-16 h-16 text-gray-400" />
                        </div>
                        <div className="space-y-2">
                          <Button size="sm" variant="secondary" disabled>
                            Download PNG
                          </Button>
                          <Button size="sm" variant="secondary" disabled>
                            Download SVG
                          </Button>
                          <p className="text-xs text-gray-500">QR generation coming soon</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                        Connect a Facebook Page in Configure to generate QR code
                      </p>
                    )}
                  </div>
                )}

                {tool.comingSoon && (
                  <p className="text-sm text-gray-500">
                    This feature is under development and will be available soon.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
