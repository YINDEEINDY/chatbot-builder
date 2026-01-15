import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useBotStore } from '../stores/bot.store';
import { Button } from '../components/ui/Button';
import { conversationsApi } from '../api/conversations';
import { socketService } from '../services/socket';
import { Conversation, Message } from '../types';
import {
  ArrowLeft,
  MessageSquare,
  User as UserIcon,
  Send,
  Bot,
  UserCheck,
  X,
  Loader2,
  Radio,
} from 'lucide-react';

export function LiveChatPage() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { currentBot, loadBot } = useBotStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (botId) {
      loadBot(botId);
      loadConversations();
      socketService.connect();
      socketService.joinBot(botId);
    }

    return () => {
      if (botId) {
        socketService.leaveBot(botId);
      }
    };
  }, [botId, loadBot]);

  useEffect(() => {
    loadConversations();
  }, [statusFilter]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Listen for new messages via socket
  useEffect(() => {
    const unsubscribe = socketService.onMessage((data) => {
      if (data.direction === 'incoming') {
        // Update conversation list
        setConversations((prev) => {
          const updated = prev.map((conv) => {
            if (conv.id === data.conversationId) {
              return {
                ...conv,
                unreadCount: conv.unreadCount + 1,
                lastMessageAt: data.timestamp,
              };
            }
            return conv;
          });
          // Sort by lastMessageAt
          return updated.sort(
            (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
          );
        });

        // Add message if this conversation is selected
        if (selectedConversation?.id === data.conversationId) {
          const newMsg: Message = {
            id: Date.now().toString(),
            botId: data.botId,
            senderId: data.senderId,
            content: data.content,
            direction: data.direction,
            messageType: 'text',
            createdAt: data.timestamp,
          };
          setMessages((prev) => [...prev, newMsg]);
        }
      }
    });

    return unsubscribe;
  }, [selectedConversation]);

  const loadConversations = async () => {
    if (!botId) return;
    setIsLoading(true);
    try {
      const response = await conversationsApi.list(botId, statusFilter || undefined);
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    try {
      const response = await conversationsApi.getMessages(botId!, conversation.id);
      if (response.success && response.data) {
        setMessages(response.data.messages);
        // Clear unread count locally
        setConversations((prev) =>
          prev.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleTakeover = async () => {
    if (!botId || !selectedConversation) return;
    try {
      const response = await conversationsApi.takeover(botId, selectedConversation.id);
      if (response.success && response.data) {
        setSelectedConversation(response.data);
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConversation.id ? response.data! : c))
        );
      }
    } catch (error) {
      console.error('Failed to takeover:', error);
    }
  };

  const handleRelease = async () => {
    if (!botId || !selectedConversation) return;
    try {
      const response = await conversationsApi.release(botId, selectedConversation.id);
      if (response.success && response.data) {
        setSelectedConversation(response.data);
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConversation.id ? response.data! : c))
        );
      }
    } catch (error) {
      console.error('Failed to release:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botId || !selectedConversation || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await conversationsApi.sendMessage(
        botId,
        selectedConversation.id,
        newMessage.trim()
      );
      if (response.success && response.data) {
        setMessages((prev) => [...prev, response.data!]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'human':
        return 'bg-orange-500';
      case 'bot':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'human':
        return 'Human';
      case 'bot':
        return 'Bot';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <button
            onClick={() => navigate(`/bots/${botId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Live Chat</h1>
            <p className="text-sm text-gray-500">{currentBot?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Conversations</option>
              <option value="bot">Bot Mode</option>
              <option value="human">Human Mode</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Conversation List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-4">
                <div>
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No conversations yet</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full p-4 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {conversation.contact?.profilePic ? (
                            <img
                              src={conversation.contact.profilePic}
                              alt={conversation.contact.name || 'Contact'}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <UserIcon className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(
                            conversation.status
                          )}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 truncate">
                            {conversation.contact?.name || conversation.contact?.senderId}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              conversation.status === 'human' ? 'text-orange-600' : ''
                            }`}
                          >
                            {conversation.status === 'human' ? (
                              <UserCheck className="w-3 h-3" />
                            ) : (
                              <Bot className="w-3 h-3" />
                            )}
                            {getStatusLabel(conversation.status)}
                          </span>
                          <span>•</span>
                          <span>{new Date(conversation.lastMessageAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {selectedConversation.contact?.profilePic ? (
                        <img
                          src={selectedConversation.contact.profilePic}
                          alt={selectedConversation.contact.name || 'Contact'}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedConversation.contact?.name ||
                          selectedConversation.contact?.senderId}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedConversation.status)}`} />
                        <span>{getStatusLabel(selectedConversation.status)} mode</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConversation.status === 'bot' ? (
                      <Button size="sm" onClick={handleTakeover}>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Take Over
                      </Button>
                    ) : selectedConversation.status === 'human' ? (
                      <Button variant="secondary" size="sm" onClick={handleRelease}>
                        <Bot className="w-4 h-4 mr-2" />
                        Release to Bot
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No messages yet
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.direction === 'incoming' ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                              message.direction === 'incoming'
                                ? 'bg-gray-100 text-gray-900'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.direction === 'incoming' ? 'text-gray-500' : 'text-blue-200'
                              }`}
                            >
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                {selectedConversation.status === 'human' ? (
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={sending}
                      />
                      <Button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-sm text-gray-500 text-center">
                      {selectedConversation.status === 'bot' ? (
                        <>Click "Take Over" to start chatting as a human agent</>
                      ) : (
                        <>This conversation is closed</>
                      )}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <Radio className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
