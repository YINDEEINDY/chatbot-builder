// User types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Bot types
export interface Bot {
  id: string;
  name: string;
  description?: string;
  userId: string;
  facebookPageId?: string;
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
}

export type NodeData =
  | BaseNodeData
  | TextNodeData
  | ImageNodeData
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

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}
