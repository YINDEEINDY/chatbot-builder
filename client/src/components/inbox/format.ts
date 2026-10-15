import type { ConversationStatus, Message, Platform } from '../../types';

export const STATUS: Record<ConversationStatus, { label: string; tone: string; dot: string }> = {
  pending: { label: 'รอคนตอบ', tone: 'text-marigold-600', dot: 'bg-marigold-500' },
  open: { label: 'กำลังคุย', tone: 'text-jade-700', dot: 'bg-jade-500' },
  bot: { label: 'บอทดูแล', tone: 'text-lilac-600', dot: 'bg-lilac-600' },
  resolved: { label: 'ปิดแล้ว', tone: 'text-gray-500', dot: 'bg-gray-400' },
};

/** Status display, tolerant of pre-revamp values ('human' → open, 'closed' → resolved). */
export const statusOf = (s: string) =>
  STATUS[(s === 'human' ? 'open' : s === 'closed' ? 'resolved' : s) as ConversationStatus] ?? STATUS.bot;

export const PLATFORM: Record<Platform, { label: string; color: string }> = {
  line: { label: 'LINE', color: '#06C755' },
  facebook: { label: 'Messenger', color: '#0866FF' },
  instagram: { label: 'Instagram', color: '#D62976' },
  web: { label: 'เว็บไซต์', color: '#0f766e' },
};

const rtf = new Intl.RelativeTimeFormat('th', { numeric: 'auto' });

/** "เมื่อสักครู่" · "5 นาทีที่แล้ว" · "14:32" (today) · "12 ต.ค." */
export function shortTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'เมื่อสักครู่';
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute');
  if (new Date().toDateString() === d.toDateString()) return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

export function waited(iso?: string | null) {
  if (!iso) return null;
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'เพิ่งเข้าคิว';
  if (min < 60) return `รอมา ${min} นาที`;
  const h = Math.floor(min / 60);
  return h < 24 ? `รอมา ${h} ชม.` : `รอมา ${Math.floor(h / 24)} วัน`;
}

export const clock = (iso: string) => new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
export const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'วันนี้';
  if (d.toDateString() === yesterday.toDateString()) return 'เมื่อวาน';
  return d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export function meta(m: Message): { buttons: { label: string }[]; imageUrl?: string } {
  try { return m.meta ? JSON.parse(m.meta) : { buttons: [] }; } catch { return { buttons: [] }; }
}

export function preview(m?: Message | null) {
  if (!m) return '';
  const who = m.sender === 'bot' ? 'บอท: ' : m.sender === 'agent' ? 'คุณ: ' : '';
  return who + (m.content || (meta(m).imageUrl ? '[รูปภาพ]' : ''));
}

export const parseAttrs = (s?: string): Record<string, string> => {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
};

/** First consonant for avatars: skip Thai leading vowels (เ แ โ ใ ไ) so "เมย์" shows ม, not เ. */
export function initials(name?: string) {
  const n = (name?.trim() || 'ลูกค้า').replace(/^[เแโใไ]+/, '');
  return [...n][0] ?? 'ล';
}
