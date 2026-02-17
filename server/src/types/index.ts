// Shared types for Flow Builder
// NOTE: Keep in sync with client/src/types/index.ts (Node/Flow types)

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
