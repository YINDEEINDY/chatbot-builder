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
  facebookToken?: string;
  webhookVerifyToken: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  flows?: Flow[];
  _count?: {
    flows: number;
    messages: number;
  };
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

// Node Types for Flow Builder
export type NodeType =
  | 'start'
  | 'text'
  | 'image'
  | 'card'
  | 'quickReply'
  | 'userInput'
  | 'condition'
  | 'delay'
  | 'end';

export interface BaseNodeData {
  label: string;
  [key: string]: unknown;
}

export interface TextNodeData extends BaseNodeData {
  message: string;
}

export interface ImageNodeData extends BaseNodeData {
  imageUrl: string;
  caption?: string;
}

export interface CardButton {
  id: string;
  title: string;
  type: 'postback' | 'url';
  payload?: string;
  url?: string;
}

export interface CardNodeData extends BaseNodeData {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons: CardButton[];
}

export interface QuickReplyButton {
  id: string;
  title: string;
  payload: string;
}

export interface QuickReplyNodeData extends BaseNodeData {
  message: string;
  buttons: QuickReplyButton[];
}

export interface UserInputNodeData extends BaseNodeData {
  prompt: string;
  variableName: string;
}

export interface ConditionNodeData extends BaseNodeData {
  variable: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith';
  value: string;
}

export interface DelayNodeData extends BaseNodeData {
  seconds: number;
  showTyping?: boolean;
}

export type NodeData =
  | BaseNodeData
  | TextNodeData
  | ImageNodeData
  | CardNodeData
  | QuickReplyNodeData
  | UserInputNodeData
  | ConditionNodeData
  | DelayNodeData;

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
  sourceHandle?: string;
  targetHandle?: string;
}

// Block Card types (Chatfuel-style)
export type BlockCardType = 'text' | 'image' | 'gallery' | 'quickReply' | 'userInput' | 'delay' | 'goToBlock';

export interface TextBlockCard {
  type: 'text';
  id: string;
  text: string;
}

export interface ImageBlockCard {
  type: 'image';
  id: string;
  imageUrl: string;
  caption?: string;
}

export interface BlockCardButton {
  id: string;
  title: string;
  type: 'postback' | 'url' | 'block';
  payload?: string;
  url?: string;
  blockId?: string;
}

export interface GalleryBlockCard {
  type: 'gallery';
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons: BlockCardButton[];
}

export interface QuickReplyBlockCard {
  type: 'quickReply';
  id: string;
  text: string;
  buttons: Array<{
    id: string;
    title: string;
    blockId?: string;
  }>;
}

export interface UserInputBlockCard {
  type: 'userInput';
  id: string;
  prompt: string;
  variableName: string;
  nextBlockId?: string;
}

export interface DelayBlockCard {
  type: 'delay';
  id: string;
  seconds: number;
  showTyping?: boolean;
}

export interface GoToBlockCard {
  type: 'goToBlock';
  id: string;
  blockId: string;
}

export type BlockCard =
  | TextBlockCard
  | ImageBlockCard
  | GalleryBlockCard
  | QuickReplyBlockCard
  | UserInputBlockCard
  | DelayBlockCard
  | GoToBlockCard;

// Block types (Chatfuel-style conversation blocks)
export interface Block {
  id: string;
  name: string;
  botId: string;
  groupName?: string;
  category?: string;
  nodeType?: string;
  nodeData?: string; // JSON string of NodeData for saved nodes
  description?: string;
  isWelcome: boolean;
  isDefaultAnswer: boolean;
  isEnabled: boolean;
  cards: string; // JSON string of BlockCard[]
  triggers: string; // JSON string of string[]
  createdAt: string;
  updatedAt: string;
}

// Contact types
export interface Contact {
  id: string;
  botId: string;
  senderId: string;
  name?: string;
  profilePic?: string;
  lastSeenAt: string;
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

// Conversation types
export interface Conversation {
  id: string;
  botId: string;
  contactId: string;
  contact: Contact;
  status: 'bot' | 'human' | 'closed';
  assignedTo?: string;
  unreadCount: number;
  lastMessageAt: string;
  humanTakeoverAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Message types
export interface Message {
  id: string;
  botId: string;
  senderId: string;
  content: string;
  direction: 'incoming' | 'outgoing';
  messageType: string;
  createdAt: string;
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
