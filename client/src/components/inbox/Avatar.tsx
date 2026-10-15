import type { Contact } from '../../types';
import { PLATFORM, initials } from './format';
import { cn } from '../../utils/cn';

export function Avatar({ contact, size = 40, className }: { contact: Contact; size?: number; className?: string }) {
  const p = PLATFORM[contact.platform] ?? PLATFORM.web;
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {contact.profilePic ? (
        <img src={contact.profilePic} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-jade-100 font-semibold text-jade-800" style={{ fontSize: size * 0.42 }}>
          {initials(contact.name)}
        </span>
      )}
      <span
        className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-surface"
        style={{ width: size * 0.36, height: size * 0.36, background: p.color }}
        title={p.label}
      />
    </span>
  );
}
