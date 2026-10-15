import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useBotStore } from '../stores/bot.store';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { broadcastsApi } from '../api/broadcasts';
import { Broadcast, BroadcastMessage } from '../types';
import {
  ArrowLeft,
  Send,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Radio,
  Edit,
} from 'lucide-react';

export function BroadcastListPage() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { currentBot, loadBot } = useBotStore();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (botId) {
      loadBot(botId);
      loadBroadcasts();
    }
  }, [botId, loadBot]);

  const loadBroadcasts = async () => {
    if (!botId) return;
    setIsLoading(true);
    try {
      const response = await broadcastsApi.list(botId);
      if (response.success && response.data) {
        setBroadcasts(response.data);
      }
    } catch (error) {
      console.error('Failed to load broadcasts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botId || !newName.trim() || !newMessage.trim()) return;

    setIsCreating(true);
    try {
      const message: BroadcastMessage = { type: 'text', text: newMessage };
      const response = await broadcastsApi.create(botId, { name: newName, message });
      if (response.success && response.data) {
        setBroadcasts([response.data, ...broadcasts]);
        setShowCreate(false);
        setNewName('');
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to create broadcast:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (broadcastId: string) => {
    if (!botId || !confirm('ลบข้อความนี้ใช่ไหม')) return;
    try {
      await broadcastsApi.delete(botId, broadcastId);
      setBroadcasts(broadcasts.filter((b) => b.id !== broadcastId));
    } catch (error) {
      console.error('Failed to delete broadcast:', error);
    }
  };

  const handleSend = async (broadcastId: string) => {
    if (!botId || !confirm('ส่งข้อความนี้ตอนนี้เลยใช่ไหม')) return;
    try {
      await broadcastsApi.send(botId, broadcastId);
      loadBroadcasts();
    } catch (error) {
      console.error('Failed to send broadcast:', error);
      alert('ส่งข้อความไม่สำเร็จ ตรวจว่ามีรายชื่อลูกค้าแล้ว และเชื่อมเพจไว้แล้ว');
    }
  };

  const getStatusIcon = (status: Broadcast['status']) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4 text-gray-500" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'sending':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: Broadcast['status']) => {
    switch (status) {
      case 'draft':
        return 'ฉบับร่าง';
      case 'scheduled':
        return 'ตั้งเวลาไว้';
      case 'sending':
        return 'กำลังส่ง';
      case 'sent':
        return 'ส่งแล้ว';
      case 'failed':
        return 'ส่งไม่สำเร็จ';
      default:
        return status;
    }
  };

  const getMessage = (broadcast: Broadcast): string => {
    try {
      const msg = JSON.parse(broadcast.message) as BroadcastMessage;
      return msg.text || msg.title || '[รูปภาพหรือไฟล์]';
    } catch {
      return broadcast.message;
    }
  };

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(`/bots/${botId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">ส่งข้อความหาหลายคน</h1>
            <p className="text-gray-500">{currentBot?.name} · ส่งข้อความเดียวถึงลูกค้าหลายคนพร้อมกัน</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            สร้างข้อความ
          </Button>
        </div>

        {/* Broadcasts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : broadcasts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Radio className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">ยังไม่มีข้อความที่สร้างไว้</p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" />
                สร้างข้อความ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {broadcasts.map((broadcast) => (
              <Card key={broadcast.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{broadcast.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        {getStatusIcon(broadcast.status)}
                        <span>{getStatusText(broadcast.status)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{getMessage(broadcast)}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>ผู้รับ {broadcast.totalTargets} คน</span>
                      {broadcast.status === 'sent' && (
                        <>
                          <span>ส่งถึง {broadcast.sentCount} คน</span>
                          {broadcast.failedCount > 0 && (
                            <span className="text-red-500">ส่งไม่ถึง {broadcast.failedCount} คน</span>
                          )}
                        </>
                      )}
                      <span>สร้างเมื่อ {new Date(broadcast.createdAt).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {broadcast.status === 'draft' && (
                      <Button size="sm" onClick={() => handleSend(broadcast.id)}>
                        <Send className="w-4 h-4 mr-1" />
                        ส่งเลย
                      </Button>
                    )}
                    {broadcast.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(broadcast.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">สร้างข้อความ</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <Input
                    label="ชื่อเรียกข้อความนี้"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="เช่น โปรสิ้นเดือน"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ข้อความ
                    </label>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="พิมพ์ข้อความที่จะส่ง"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    ข้อความจะถูกส่งถึงลูกค้าทุกคนที่เคยทักบอทนี้และยังรับข้อความอยู่
                  </p>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setShowCreate(false)}
                    >
                      ยกเลิก
                    </Button>
                    <Button type="submit" className="flex-1" isLoading={isCreating}>
                      สร้าง
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
