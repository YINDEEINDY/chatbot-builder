import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Send, Bot, User, RotateCcw, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useFlowStore } from '../../stores/flow.store';
import type { Node } from '@xyflow/react';
import type { NodeData } from '../../types';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  nodeType?: string;
  buttons?: Array<{ title: string; payload: string }>;
  card?: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    buttons?: Array<{ title: string; type: string; payload?: string; url?: string }>;
  };
}

interface FlowTesterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FlowTester({ isOpen, onClose }: FlowTesterProps) {
  const { nodes, edges } = useFlowStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [context, setContext] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findNode = useCallback((nodeId: string): Node<NodeData> | undefined => {
    return nodes.find(n => n.id === nodeId) as Node<NodeData> | undefined;
  }, [nodes]);

  const findStartNode = useCallback((): Node<NodeData> | undefined => {
    return nodes.find(n => n.type === 'start') as Node<NodeData> | undefined;
  }, [nodes]);

  const getNextNode = useCallback((nodeId: string, handle?: string): Node<NodeData> | undefined => {
    const edge = edges.find(e =>
      e.source === nodeId && (!handle || e.sourceHandle === handle)
    );
    if (!edge) return undefined;
    return findNode(edge.target);
  }, [edges, findNode]);

  const interpolate = useCallback((text: string): string => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] || `{{${key}}}`);
  }, [context]);

  const addMessage = useCallback((msg: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: `msg-${Date.now()}-${Math.random()}` }]);
  }, []);

  const executeNode = useCallback(async (node: Node<NodeData>): Promise<Node<NodeData> | null> => {
    const data = node.data as NodeData;

    switch (node.type) {
      case 'start':
        return getNextNode(node.id) || null;

      case 'text': {
        const textData = data as { message?: string };
        if (textData.message) {
          addMessage({ type: 'bot', content: interpolate(textData.message), nodeType: 'text' });
          await new Promise(r => setTimeout(r, 500));
        }
        return getNextNode(node.id) || null;
      }

      case 'image': {
        const imageData = data as { imageUrl?: string; caption?: string };
        if (imageData.imageUrl) {
          addMessage({
            type: 'bot',
            content: imageData.caption ? interpolate(imageData.caption) : `[Image: ${imageData.imageUrl}]`,
            nodeType: 'image'
          });
          await new Promise(r => setTimeout(r, 500));
        }
        return getNextNode(node.id) || null;
      }

      case 'card': {
        const cardData = data as {
          title?: string;
          subtitle?: string;
          imageUrl?: string;
          buttons?: Array<{ title: string; type: string; payload?: string; url?: string }>;
        };
        if (cardData.title) {
          addMessage({
            type: 'bot',
            content: '',
            nodeType: 'card',
            card: {
              title: interpolate(cardData.title),
              subtitle: cardData.subtitle ? interpolate(cardData.subtitle) : undefined,
              imageUrl: cardData.imageUrl,
              buttons: cardData.buttons,
            }
          });
          await new Promise(r => setTimeout(r, 500));
        }
        return getNextNode(node.id) || null;
      }

      case 'quickReply': {
        const qrData = data as { message?: string; buttons?: Array<{ title: string; payload: string }> };
        if (qrData.message) {
          addMessage({
            type: 'bot',
            content: interpolate(qrData.message),
            nodeType: 'quickReply',
            buttons: qrData.buttons
          });
          await new Promise(r => setTimeout(r, 500));
        }
        return getNextNode(node.id) || null;
      }

      case 'userInput': {
        const inputData = data as { prompt?: string; variableName?: string };
        if (inputData.prompt) {
          addMessage({ type: 'bot', content: interpolate(inputData.prompt), nodeType: 'userInput' });
        }
        setIsWaitingForInput(true);
        setCurrentNodeId(node.id);
        return null; // Wait for user input
      }

      case 'delay': {
        const delayData = data as { seconds?: number; showTyping?: boolean };
        const seconds = delayData.seconds || 1;
        addMessage({ type: 'bot', content: `[Typing... ${seconds}s]`, nodeType: 'delay' });
        await new Promise(r => setTimeout(r, seconds * 1000));
        return getNextNode(node.id) || null;
      }

      case 'condition': {
        const condData = data as { variable?: string; operator?: string; value?: string };
        const actualValue = (context[condData.variable || ''] || '').toLowerCase();
        const expectedValue = (condData.value || '').toLowerCase();

        let result = false;
        switch (condData.operator) {
          case 'equals': result = actualValue === expectedValue; break;
          case 'contains': result = actualValue.includes(expectedValue); break;
          case 'startsWith': result = actualValue.startsWith(expectedValue); break;
          case 'endsWith': result = actualValue.endsWith(expectedValue); break;
        }

        const handle = result ? 'true' : 'false';
        return getNextNode(node.id, handle) || null;
      }

      case 'end':
        addMessage({ type: 'bot', content: '[Flow ended]', nodeType: 'end' });
        return null;

      default:
        return getNextNode(node.id) || null;
    }
  }, [addMessage, context, getNextNode, interpolate]);

  const runFlow = useCallback(async (startNode: Node<NodeData>) => {
    setIsRunning(true);
    let currentNode: Node<NodeData> | null = startNode;

    while (currentNode) {
      const nextNode = await executeNode(currentNode);
      if (!nextNode) break;
      currentNode = nextNode;
    }

    setIsRunning(false);
  }, [executeNode]);

  const handleStart = useCallback(() => {
    const startNode = findStartNode();
    if (!startNode) {
      addMessage({ type: 'bot', content: 'Error: No start node found!' });
      return;
    }
    setMessages([]);
    setContext({});
    setCurrentNodeId(null);
    setIsWaitingForInput(false);
    runFlow(startNode);
  }, [findStartNode, addMessage, runFlow]);

  const handleUserInput = useCallback(async (input: string) => {
    if (!input.trim()) return;

    addMessage({ type: 'user', content: input });
    setUserInput('');

    if (isWaitingForInput && currentNodeId) {
      const currentNode = findNode(currentNodeId);
      if (currentNode) {
        const inputData = currentNode.data as { variableName?: string };
        if (inputData.variableName) {
          setContext(prev => ({ ...prev, [inputData.variableName!]: input }));
        }
        setIsWaitingForInput(false);
        const nextNode = getNextNode(currentNodeId);
        if (nextNode) {
          await new Promise(r => setTimeout(r, 300));
          runFlow(nextNode);
        }
      }
    }
  }, [isWaitingForInput, currentNodeId, findNode, getNextNode, runFlow, addMessage]);

  const handleQuickReply = useCallback((payload: string, title: string) => {
    handleUserInput(title);
  }, [handleUserInput]);

  const handleReset = useCallback(() => {
    setMessages([]);
    setContext({});
    setCurrentNodeId(null);
    setIsWaitingForInput(false);
    setIsRunning(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Test Flow</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 hover:bg-gray-100 rounded"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Bot className="w-12 h-12 mb-2 text-gray-300" />
              <p className="text-sm">Click "Start Test" to begin</p>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-2 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.type === 'user' ? 'bg-blue-500' : 'bg-gray-200'
                  }`}>
                    {msg.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <div>
                    {msg.card ? (
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        {msg.card.imageUrl && (
                          <img src={msg.card.imageUrl} alt="" className="w-full h-32 object-cover" />
                        )}
                        <div className="p-3">
                          <p className="font-semibold text-gray-900">{msg.card.title}</p>
                          {msg.card.subtitle && (
                            <p className="text-sm text-gray-500 mt-1">{msg.card.subtitle}</p>
                          )}
                          {msg.card.buttons && msg.card.buttons.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.card.buttons.map((btn, i) => (
                                <button
                                  key={i}
                                  onClick={() => btn.type === 'postback' && handleQuickReply(btn.payload || '', btn.title)}
                                  className="w-full text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded"
                                >
                                  {btn.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={`rounded-lg px-3 py-2 ${
                        msg.type === 'user'
                          ? 'bg-blue-500 text-white'
                          : msg.nodeType === 'delay' || msg.nodeType === 'end'
                            ? 'bg-gray-100 text-gray-500 italic text-sm'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {msg.content}
                      </div>
                    )}
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.buttons.map((btn, i) => (
                          <button
                            key={i}
                            onClick={() => handleQuickReply(btn.payload, btn.title)}
                            className="text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full"
                          >
                            {btn.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          {messages.length === 0 ? (
            <Button onClick={handleStart} className="w-full" disabled={isRunning}>
              <Play className="w-4 h-4 mr-2" />
              Start Test
            </Button>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleUserInput(userInput); }} className="flex gap-2">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isWaitingForInput ? "Type your response..." : "Flow is running..."}
                disabled={!isWaitingForInput && isRunning}
                className="flex-1"
              />
              <Button type="submit" disabled={!isWaitingForInput || !userInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
