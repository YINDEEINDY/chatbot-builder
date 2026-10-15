import { cn } from '../../utils/cn';

export const inputCls = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-jade-500 disabled:bg-gray-50';
export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-jade-600 px-4 py-2 text-sm font-medium text-white hover:bg-jade-700 disabled:bg-gray-200 disabled:text-ink-soft';
export const btnGhost = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50';

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

/** A settings block: title + explanation on the left, controls on the right (stacks on mobile). */
export function Section({ title, sub, children, className }: { title: string; sub?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('grid gap-4 border-t border-line py-7 md:grid-cols-[260px_1fr] md:gap-10', className)}>
      <div>
        <h2 className="font-semibold">{title}</h2>
        {sub && <div className="mt-1 text-sm leading-relaxed text-ink-soft">{sub}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label || "เปิดใช้"} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left text-sm">
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-jade-600' : 'bg-gray-300')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </span>
      {label}
    </button>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: React.ReactNode }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-lg px-3 py-2 text-sm', {
      info: 'bg-gray-100 text-ink-soft', warn: 'bg-marigold-50 text-marigold-700', error: 'bg-red-50 text-red-800', ok: 'bg-jade-50 text-jade-800',
    }[tone])}>{children}</p>
  );
}
