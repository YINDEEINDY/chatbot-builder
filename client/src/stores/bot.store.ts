import { create } from 'zustand';
import { Bot } from '../types';
import { botsApi } from '../api/bots';

// PREVIEW MODE: Set to true to use mock data for UI preview
const PREVIEW_MODE = false;

const mockBot: Bot = {
  id: 'mock-bot',
  name: 'Demo Bot',
  description: 'A demo bot for testing',
  userId: 'preview',
  isActive: true,
  webhookVerifyToken: 'mock-token',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: { flows: 1, messages: 0 },
};

interface BotState {
  bots: Bot[];
  currentBot: Bot | null;
  isLoading: boolean;

  loadBots: () => Promise<void>;
  loadBot: (id: string) => Promise<void>;
  createBot: (name: string, description?: string) => Promise<Bot>;
  updateBot: (id: string, data: { name?: string; description?: string; isActive?: boolean }) => Promise<void>;
  deleteBot: (id: string) => Promise<void>;
  setCurrentBot: (bot: Bot | null) => void;
}

export const useBotStore = create<BotState>((set, get) => ({
  bots: [],
  currentBot: null,
  isLoading: false,

  loadBots: async () => {
    set({ isLoading: true });
    try {
      const response = await botsApi.list();
      if (response.success && response.data) {
        set({ bots: response.data });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  loadBot: async (id: string) => {
    // Use mock data in preview mode
    if (PREVIEW_MODE) {
      set({ currentBot: mockBot, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await botsApi.get(id);
      if (response.success && response.data) {
        set({ currentBot: response.data });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  createBot: async (name: string, description?: string) => {
    const response = await botsApi.create({ name, description });
    if (response.success && response.data) {
      set({ bots: [response.data, ...get().bots] });
      return response.data;
    }
    throw new Error('Failed to create bot');
  },

  updateBot: async (id: string, data) => {
    const response = await botsApi.update(id, data);
    if (response.success && response.data) {
      set({
        bots: get().bots.map((bot) => (bot.id === id ? response.data! : bot)),
        currentBot: get().currentBot?.id === id ? response.data : get().currentBot,
      });
    }
  },

  deleteBot: async (id: string) => {
    await botsApi.delete(id);
    set({
      bots: get().bots.filter((bot) => bot.id !== id),
      currentBot: get().currentBot?.id === id ? null : get().currentBot,
    });
  },

  setCurrentBot: (bot: Bot | null) => set({ currentBot: bot }),
}));
