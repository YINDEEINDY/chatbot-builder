import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private currentBotId: string | null = null;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      // Rejoin bot room if we were in one
      if (this.currentBotId) {
        this.joinBot(this.currentBotId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentBotId = null;
    }
  }

  joinBot(botId: string) {
    if (!this.socket?.connected) {
      this.currentBotId = botId;
      return;
    }

    // Leave previous bot room if different
    if (this.currentBotId && this.currentBotId !== botId) {
      this.socket.emit('leave:bot', this.currentBotId);
    }

    this.socket.emit('join:bot', botId);
    this.currentBotId = botId;
  }

  leaveBot(botId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave:bot', botId);
    }
    if (this.currentBotId === botId) {
      this.currentBotId = null;
    }
  }

  joinConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join:conversation', conversationId);
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave:conversation', conversationId);
    }
  }

  onMessage(callback: (data: {
    botId: string;
    senderId: string;
    content: string;
    direction: 'incoming' | 'outgoing';
    conversationId?: string;
    contactId?: string;
    timestamp: string;
  }) => void) {
    this.socket?.on('message:new', callback);
    return () => {
      this.socket?.off('message:new', callback);
    };
  }

  onConversationUpdate(callback: (data: {
    conversationId: string;
    status: string;
    unreadCount?: number;
  }) => void) {
    this.socket?.on('conversation:update', callback);
    return () => {
      this.socket?.off('conversation:update', callback);
    };
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
