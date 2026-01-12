import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Bot schemas
export const createBotSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Bot name is required').max(100, 'Bot name too long'),
    description: z.string().max(500, 'Description too long').optional(),
  }),
});

export const updateBotSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid bot ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Bot name is required').max(100, 'Bot name too long').optional(),
    description: z.string().max(500, 'Description too long').optional(),
    isActive: z.boolean().optional(),
  }),
});

export const botIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid bot ID'),
  }),
});

export const connectFacebookSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid bot ID'),
  }),
  body: z.object({
    pageId: z.string().min(1, 'Page ID is required'),
    accessToken: z.string().min(1, 'Access token is required'),
  }),
});

// Flow schemas
export const createFlowSchema = z.object({
  params: z.object({
    botId: z.string().uuid('Invalid bot ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Flow name is required').max(100, 'Flow name too long'),
  }),
});

export const updateFlowSchema = z.object({
  params: z.object({
    botId: z.string().uuid('Invalid bot ID'),
    flowId: z.string().uuid('Invalid flow ID'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    nodes: z.array(z.object({
      id: z.string(),
      type: z.enum(['start', 'text', 'image', 'quickReply', 'userInput', 'condition', 'delay', 'end']),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
      data: z.record(z.unknown()),
    })).optional(),
    edges: z.array(z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string().nullable().optional(),
      targetHandle: z.string().nullable().optional(),
    })).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const flowIdSchema = z.object({
  params: z.object({
    botId: z.string().uuid('Invalid bot ID'),
    flowId: z.string().uuid('Invalid flow ID'),
  }),
});

export const botIdParamSchema = z.object({
  params: z.object({
    botId: z.string().uuid('Invalid bot ID'),
  }),
});

// Block schemas
export const createBlockSchema = z.object({
  params: z.object({
    botId: z.string().uuid('Invalid bot ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Block name is required').max(100, 'Block name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    nodeType: z.enum(['text', 'image', 'card', 'quickReply', 'userInput', 'condition', 'delay']),
    nodeData: z.record(z.unknown()),
    category: z.string().max(50, 'Category too long').optional(),
  }),
});

export const updateBlockSchema = z.object({
  params: z.object({
    botId: z.string().uuid('Invalid bot ID'),
    blockId: z.string().uuid('Invalid block ID'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    nodeData: z.record(z.unknown()).optional(),
    category: z.string().max(50).optional(),
  }),
});

export const blockIdSchema = z.object({
  params: z.object({
    botId: z.string().uuid('Invalid bot ID'),
    blockId: z.string().uuid('Invalid block ID'),
  }),
});
