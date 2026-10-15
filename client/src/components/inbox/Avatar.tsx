import type { Contact } from '../../types';
import { initials } from './format';
import { ChannelMark } from './ChannelMark';
import { cn } from '../../utils/cn';

// Soft per-person tints (stable by name) so a list of initials is scannable.
const TINTS = [['#f3e3e6', '#8a3b4c'], ['#e1e9f5', '#2f4f7f'], ['#efe5f3', '#6b3f80'], ['#e5ece3', '#3d5a3a'], ['#f2ebdf', '#6e5426'], ['#e3eef0', '#2d5d66'], ['#f0e6e1', '#7a4632']];
const tint = (key: string) => TINTS[[...key].reduce((a, c) => a + c.codePointAt(0)!, 0) % TINTS.length];

export function Avatar({ contact, size = 40, className, ring = 'var(--color-surface)' }: { contact: Contact; size?: number; className?: string; ring?: string }) {
  const [bg, fg] = tint(contact.name || contact.senderId);
  const mark = Math.max(12, Math.round(size * 0.42));
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {contact.profilePic ? (
        <img src={contact.profilePic} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full font-semibold" style={{ background: bg, color: fg, fontSize: size * 0.4 }}>
          {initials(contact.name)}
        </span>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 rounded-[5px]" style={{ boxShadow: `0 0 0 2px ${ring}`, lineHeight: 0 }}>
        <ChannelMark platform={contact.platform} size={mark} />
      </span>
    </span>
  );
}
