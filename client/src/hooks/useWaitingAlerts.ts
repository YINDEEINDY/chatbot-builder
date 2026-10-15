import { useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socket';
import type { Conversation } from '../types';

const PREF_KEY = 'tobwai:alerts';
const BASE_TITLE = document.title;

/** Two short soft tones — generated, so there's no audio file to ship. */
function chime() {
  try {
    const ctx = new AudioContext();
    [0, 0.16].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i ? 880 : 660;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.28);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* audio blocked until the first user gesture — fine */ }
}

/**
 * When a chat enters the waiting queue: chime, desktop notification (if allowed) and
 * "(n) " in the tab title so an owner working in another tab still notices.
 */
export function useWaitingAlerts(botId: string | null, pending: number, onOpen: (conversationId: string) => void) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch { return true; }
  });
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const seen = useRef(new Map<string, string>()); // conversationId → last status we saw
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  useEffect(() => {
    document.title = pending > 0 ? `(${pending}) ${BASE_TITLE}` : BASE_TITLE;
    return () => { document.title = BASE_TITLE; };
  }, [pending]);

  useEffect(() => {
    if (!botId) return;
    return socketService.on<Conversation>('conversation:updated', (c) => {
      const before = seen.current.get(c.id);
      seen.current.set(c.id, c.status);
      if (c.status !== 'pending' || before === 'pending' || !enabled) return;
      chime();
      if (permission === 'granted' && document.visibilityState !== 'visible') {
        const n = new Notification(`${c.contact?.name || 'ลูกค้าไม่ระบุชื่อ'} รอคนตอบ`, { body: 'บอทส่งต่อแชทนี้ให้เจ้าหน้าที่', tag: c.id, icon: '/favicon.svg' });
        n.onclick = () => { window.focus(); openRef.current(c.id); n.close(); };
      }
    });
  }, [botId, enabled, permission]);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(PREF_KEY, next ? 'on' : 'off'); } catch { /* private mode */ }
    if (next && permission === 'default') setPermission(await Notification.requestPermission());
    if (next) chime(); // the click is the user gesture that unlocks audio
  };

  return { enabled, permission, toggle };
}
