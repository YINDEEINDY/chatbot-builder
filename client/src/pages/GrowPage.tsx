import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { QRCodeDisplay } from '../components/ui/QRCode';
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
      title: 'ลิงก์ Messenger',
      description: 'ลิงก์ที่กดแล้วเปิดแชทกับร้านใน Messenger ได้ทันที',
      icon: Link2,
      available: !!messengerLink,
    },
    {
      id: 'qr-code',
      title: 'QR สำหรับสแกนทัก',
      description: 'สแกนแล้วเปิดแชทกับร้านใน Messenger ใช้ติดหน้าร้านหรือบนสินค้าได้',
      icon: QrCode,
      available: !!messengerLink,
    },
    {
      id: 'chat-widget',
      title: 'ปุ่มแชทบนเว็บไซต์',
      description: 'ปุ่มแชทมุมจอบนเว็บไซต์ของร้าน',
      icon: MessageCircle,
      available: false,
      comingSoon: true,
    },
    {
      id: 'referral',
      title: 'ชวนเพื่อนรับรางวัล',
      description: 'ให้ลูกค้าชวนเพื่อนมาทักร้านแล้วได้รางวัล',
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
          <h1 className="text-2xl font-bold text-gray-900">ลิงก์และ QR ชวนทัก</h1>
          <p className="text-gray-500 mt-1">
            ช่องทางให้ลูกค้าใหม่ทักเข้ามาหาร้านได้ง่ายขึ้น
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
                  <p className="text-sm text-gray-500">ลูกค้าทั้งหมด</p>
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
                  <p className="text-sm text-gray-500">ลูกค้าใหม่สัปดาห์นี้</p>
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
                  <p className="text-sm text-gray-500">คนกดลิงก์</p>
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
                          เร็ว ๆ นี้
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
                              'คัดลอกแล้ว'
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
                          แชร์ลิงก์นี้ในโพสต์ ไบโอ อีเมล หรือเว็บไซต์ของร้าน
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                        เชื่อมเพจ Facebook ในหน้าตั้งค่า Facebook และ Instagram ก่อน ถึงจะได้ลิงก์ Messenger
                      </p>
                    )}
                  </div>
                )}

                {tool.id === 'qr-code' && (
                  <div className="space-y-3">
                    {messengerLink ? (
                      <div className="flex items-start gap-4">
                        <QRCodeDisplay value={messengerLink} size={128} />
                        <div className="text-sm text-gray-500 mt-2">
                          <p className="font-medium text-gray-700 mb-1">สแกนเพื่อทักแชท</p>
                          <p>ลูกค้าสแกน QR นี้ด้วยกล้องมือถือ แล้วจะเปิดแชทกับร้านได้ทันที</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                        เชื่อมเพจ Facebook ในหน้าตั้งค่า Facebook และ Instagram ก่อน ถึงจะสร้าง QR ได้
                      </p>
                    )}
                  </div>
                )}

                {tool.comingSoon && (
                  <p className="text-sm text-gray-500">
                    กำลังพัฒนา จะเปิดให้ใช้เร็ว ๆ นี้
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
