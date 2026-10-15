import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3001';

/** Agent realtime: one socket, one bot room. Server events: message:new · conversation:updated · contact:updated */
class SocketService {
  private socket: Socket | null = null;
  private botId: string | null = null;
  private statusListeners = new Set<(online: boolean) => void>();

  connect() {
    if (this.socket) return this.socket;
    this.socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], auth: { token: localStorage.getItem('token') } });
    this.socket.on('connect', () => {
      if (this.botId) this.socket!.emit('join:bot', this.botId);
      this.statusListeners.forEach((l) => l(true));
    });
    this.socket.on('disconnect', () => this.statusListeners.forEach((l) => l(false)));
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.botId = null;
  }

  joinBot(botId: string) {
    const s = this.connect();
    if (this.botId && this.botId !== botId) s.emit('leave:bot', this.botId);
    this.botId = botId;
    if (s.connected) s.emit('join:bot', botId);
  }

  on<T = unknown>(event: string, cb: (data: T) => void) {
    const s = this.connect();
    s.on(event, cb);
    return () => { s.off(event, cb); };
  }

  onStatus(cb: (online: boolean) => void) {
    this.statusListeners.add(cb);
    cb(this.socket?.connected ?? false);
    return () => { this.statusListeners.delete(cb); };
  }
}

export const socketService = new SocketService();
