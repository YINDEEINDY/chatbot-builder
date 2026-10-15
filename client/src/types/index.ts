// Client types - source of truth for all shared types
// NOTE: Node/Flow types should stay in sync with server/src/types/index.ts

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  profilePic?: string;
  facebookId?: string;
  createdAt: string;
}

// Notification settings
export interface NotificationSettings {
  notifyNewMessages: boolean;
  notifyDailySummary: boolean;
  notifyBotErrors: boolean;
}

// Bot types
export interface Bot {
  id: string;
  name: string;
  description?: string;
  userId: string;
  facebookPageId?: string;
  facebookPageName?: string;
  hasFacebookToken?: boolean;
  igUserId?: string;
  igUsername?: string;
  webhookVerifyToken: string;
  lineConnected?: boolean;
  welcomeFlowId?: string | null;
  fallbackText?: string | null;
  handoffOnFallback: boolean;
  widgetColor: string;
  widgetGreeting?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  flows?: Flow[];
  _count?: {
    flows: number;
    messages: number;
  };
}

export interface BotSettings {
  name?: string;
  description?: string;
  isActive?: boolean;
  welcomeFlowId?: string | null;
  fallbackText?: string | null;
  handoffOnFallback?: boolean;
  widgetColor?: string;
  widgetGreeting?: string | null;
  lineChannelSecret?: string | null;
  lineChannelToken?: string | null;
}

// Flow types
export interface Flow {
  id: string;
  name: string;
  botId: string;
  nodes: string;
  edges: string;
  triggers: string; // JSON array of trigger keywords
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Node Types for Flow Builder (must match server/src/engine/flow-runner.ts)
export type NodeType = 'start' | 'message' | 'choice' | 'input' | 'condition' | 'handoff' | 'end';
export type InputKind = 'text' | 'phone' | 'email' | 'number';
export interface ChoiceItem { id: string; label: string }

export interface NodeData {
  text?: string;
  imageUrl?: string;
  variable?: string;
  items?: ChoiceItem[];
  kind?: InputKind;
  retryText?: string;
  operator?: 'equals' | 'contains' | 'notEmpty';
  value?: string;
  [key: string]: unknown;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

// Contact types
export interface Contact {
  id: string;
  botId: string;
  senderId: string;
  name?: string;
  profilePic?: string;
  platform: Platform;
  lastSeenAt: string;
  attributes: string; // JSON {variable: answer} collected by questionnaires
  messageCount: number;
  tags: string; // JSON array
  isSubscribed: boolean;
  createdAt: string;
  updatedAt: string;
}

// Broadcast types
export interface BroadcastMessage {
  type: 'text' | 'image' | 'card';
  text?: string;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  buttons?: { title: string; type: string; payload?: string; url?: string }[];
}

export interface Broadcast {
  id: string;
  botId: string;
  name: string;
  message: string; // JSON BroadcastMessage
  messageType: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  targetFilter: string; // JSON
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export type Platform = 'facebook' | 'instagram' | 'line' | 'web';
export type ConversationStatus = 'bot' | 'pending' | 'open' | 'resolved';

// Conversation types
export interface Conversation {
  id: string;
  botId: string;
  contactId: string;
  contact: Contact;
  status: ConversationStatus;
  assignedTo?: string | null;
  waitingSince?: string | null;
  unreadCount: number;
  lastMessageAt: string;
  humanTakeoverAt?: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message | null;
}

// Message types
export interface Message {
  id: string;
  botId: string;
  senderId: string;
  content: string;
  direction: 'incoming' | 'outgoing' | 'internal';
  messageType: string;
  sender: 'contact' | 'bot' | 'agent' | 'system';
  meta?: string | null; // JSON {buttons:[{label,payload}], imageUrl}
  createdAt: string;
}

export interface CannedResponse {
  id: string;
  shortcut: string;
  content: string;
}

export interface AutoReplyRule {
  id: string;
  name: string;
  keywords: string[];
  matchType: 'contains' | 'exact';
  replyText?: string | null;
  flowId?: string | null;
  priority: number;
  isActive: boolean;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data?: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
