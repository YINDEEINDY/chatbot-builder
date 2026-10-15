import type { Platform } from '../../types';
import { cn } from '../../utils/cn';

/** Brand marks — the only place channel colours appear (LINE green, Messenger blue, IG gradient). */
export function ChannelMark({ platform, size = 16, className }: { platform: Platform; size?: number; className?: string }) {
  const s = { width: size, height: size };
  switch (platform) {
    case 'line':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-label="LINE" role="img">
          <rect width="24" height="24" rx="6" fill="#06C755" />
          <path fill="#fff" d="M12 5.2c-4.3 0-7.8 2.8-7.8 6.3 0 3.1 2.8 5.7 6.5 6.2.3.1.6.2.7.4.1.2.1.5 0 .7l-.1.7c0 .2-.2.8.7.4.9-.4 4.8-2.8 6.5-4.8 1.2-1.3 1.8-2.6 1.8-4.1 0-3.5-3.5-6.3-7.8-6.3z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-label="Messenger" role="img">
          <circle cx="12" cy="12" r="12" fill="#0084FF" />
          <path fill="#fff" d="M12 4.8c-4 0-7.2 3-7.2 6.9 0 2.1 1 3.9 2.5 5.1v2.4l2.3-1.3c.8.2 1.6.4 2.4.4 4 0 7.2-3 7.2-6.8S16 4.8 12 4.8zm.7 9.2-1.8-2-3.6 2 4-4.2 1.9 2 3.5-2z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-label="Instagram" role="img">
          <defs>
            <linearGradient id="ig-mark" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#feda75" /><stop offset=".35" stopColor="#fa7e1e" /><stop offset=".6" stopColor="#d62976" /><stop offset="1" stopColor="#4f5bd5" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6.5" fill="url(#ig-mark)" />
          <rect x="6" y="6" width="12" height="12" rx="3.6" fill="none" stroke="#fff" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="2.9" fill="none" stroke="#fff" strokeWidth="1.7" />
          <circle cx="15.6" cy="8.4" r=".9" fill="#fff" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" style={s} className={cn(className)} aria-label="เว็บไซต์" role="img">
          <circle cx="12" cy="12" r="12" fill="#56605a" />
          <g fill="none" stroke="#fff" strokeWidth="1.5"><circle cx="12" cy="12" r="6.5" /><path d="M5.5 12h13M12 5.5c2 2 2 11 0 13M12 5.5c-2 2-2 11 0 13" /></g>
        </svg>
      );
  }
}
