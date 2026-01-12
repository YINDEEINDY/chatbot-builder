import { create } from 'zustand';
import { Block, NodeData, NodeType } from '../types';
import { blocksApi } from '../api/blocks';

interface BlockState {
  blocks: Block[];
  isLoading: boolean;
  error: string | null;

  loadBlocks: (botId: string) => Promise<void>;
  createBlock: (
    botId: string,
    data: {
      name: string;
      description?: string;
      nodeType: NodeType;
      nodeData: NodeData;
      category?: string;
    }
  ) => Promise<Block>;
  updateBlock: (
    botId: string,
    blockId: string,
    data: {
      name?: string;
      description?: string;
      nodeData?: NodeData;
      category?: string;
    }
  ) => Promise<void>;
  deleteBlock: (botId: string, blockId: string) => Promise<void>;
  duplicateBlock: (botId: string, blockId: string) => Promise<Block>;
  clearBlocks: () => void;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blocks: [],
  isLoading: false,
  error: null,

  loadBlocks: async (botId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await blocksApi.list(botId);
      if (response.success && response.data) {
        set({ blocks: response.data });
      }
    } catch (error) {
      set({ error: 'Failed to load blocks' });
      console.error('Failed to load blocks:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createBlock: async (botId, data) => {
    set({ error: null });
    try {
      const response = await blocksApi.create(botId, data);
      if (response.success && response.data) {
        set({ blocks: [...get().blocks, response.data] });
        return response.data;
      }
      throw new Error('Failed to create block');
    } catch (error) {
      set({ error: 'Failed to create block' });
      throw error;
    }
  },

  updateBlock: async (botId, blockId, data) => {
    set({ error: null });
    try {
      const response = await blocksApi.update(botId, blockId, data);
      if (response.success && response.data) {
        set({
          blocks: get().blocks.map((b) =>
            b.id === blockId ? response.data! : b
          ),
        });
      }
    } catch (error) {
      set({ error: 'Failed to update block' });
      throw error;
    }
  },

  deleteBlock: async (botId, blockId) => {
    set({ error: null });
    try {
      await blocksApi.delete(botId, blockId);
      set({ blocks: get().blocks.filter((b) => b.id !== blockId) });
    } catch (error) {
      set({ error: 'Failed to delete block' });
      throw error;
    }
  },

  duplicateBlock: async (botId, blockId) => {
    set({ error: null });
    try {
      const response = await blocksApi.duplicate(botId, blockId);
      if (response.success && response.data) {
        set({ blocks: [...get().blocks, response.data] });
        return response.data;
      }
      throw new Error('Failed to duplicate block');
    } catch (error) {
      set({ error: 'Failed to duplicate block' });
      throw error;
    }
  },

  clearBlocks: () => {
    set({ blocks: [], error: null });
  },
}));
