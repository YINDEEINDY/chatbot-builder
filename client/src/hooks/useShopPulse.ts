import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { botsApi, type ShopOverview } from '../api/bots';
import { socketService } from '../services/socket';

/** One live snapshot of the shop (queue counts, today's numbers, setup progress) shared by the shell and pages. */
export function useShopPulseSource(botId: string | null) {
  const [data, setData] = useState<ShopOverview | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!botId) return;
    try {
      setData(await botsApi.overview(botId));
      setUpdatedAt(Date.now());
    } catch { /* keep the last good snapshot */ }
  }, [botId]);

  useEffect(() => {
    if (!botId) return;
    setData(null);
    refresh();
    socketService.joinBot(botId);
    let t: ReturnType<typeof setTimeout>;
    const soon = () => { clearTimeout(t); t = setTimeout(refresh, 500); };
    const offs = [socketService.on('conversation:updated', soon), socketService.on('message:new', soon)];
    const timer = setInterval(refresh, 30_000); // Zaapi-style: the live view refreshes itself
    return () => { offs.forEach((o) => o()); clearTimeout(t); clearInterval(timer); };
  }, [botId, refresh]);

  return { data, updatedAt, refresh };
}

export type ShopPulse = ReturnType<typeof useShopPulseSource>;
export const ShopPulseContext = createContext<ShopPulse>({ data: null, updatedAt: null, refresh: async () => {} });
export const useShopPulse = () => useContext(ShopPulseContext);

export const SETUP_STEPS = [
  { key: 'channel', label: 'เชื่อมช่องทาง', path: 'channels', hint: 'ต่อ LINE OA หรือเพจ Facebook' },
  { key: 'bot', label: 'แก้บอททักทาย', path: 'flows', hint: 'ใส่คำถามที่ร้านต้องถามทุกครั้ง' },
  { key: 'rules', label: 'ตั้งคำตอบตามคำ', path: 'auto-reply', hint: 'เช่น ราคา เวลาเปิด ที่อยู่' },
  { key: 'canned', label: 'เก็บคำตอบสำเร็จรูป', path: 'auto-reply', hint: 'ประโยคที่ตอบซ้ำทุกวัน' },
  { key: 'tested', label: 'ลองทักจากมือถือ', path: 'channels', hint: 'สแกน QR แล้วทักร้านตัวเอง' },
] as const;
