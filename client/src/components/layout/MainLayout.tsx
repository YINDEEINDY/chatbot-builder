import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { MessagesSquare, Workflow, Zap, Users, PlugZap, MoreHorizontal, Store, LogOut, UserRound, Radio, BarChart3, FileText, TrendingUp, Facebook } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useBotStore } from '../../stores/bot.store';
import { conversationsApi } from '../../api/conversations';
import { socketService } from '../../services/socket';
import { cn } from '../../utils/cn';

/** Waiting-for-a-person count, kept live from socket events. */
function usePendingCount(botId: string | null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!botId) return;
    let timer: ReturnType<typeof setTimeout>;
    const load = () => conversationsApi.list(botId, { status: 'pending' }).then((r) => setCount(r.data?.counts.pending ?? 0)).catch(() => {});
    load();
    socketService.joinBot(botId);
    const off = socketService.on('conversation:updated', () => { clearTimeout(timer); timer = setTimeout(load, 400); });
    return () => { off(); clearTimeout(timer); };
  }, [botId]);
  return count;
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M8 10.5A3.5 3.5 0 0 1 11.5 7h9A3.5 3.5 0 0 1 24 10.5v6a3.5 3.5 0 0 1-3.5 3.5H15l-5 4v-4.2A3.5 3.5 0 0 1 8 16.5z" fill="#fff" />
      <circle cx="21.5" cy="9.5" r="3.5" fill="#d9920b" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function MainLayout({ children, fullBleed }: { children: React.ReactNode; fullBleed?: boolean }) {
  const { user, logout } = useAuthStore();
  const { currentBot, loadBot } = useBotStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const botId = location.pathname.match(/^\/bots\/([^/]+)/)?.[1] ?? null;
  const pending = usePendingCount(botId);

  useEffect(() => {
    if (botId && currentBot?.id !== botId) loadBot(botId);
  }, [botId, currentBot?.id, loadBot]);

  useEffect(() => setMoreOpen(false), [location.pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const main = botId ? [
    { to: `/bots/${botId}/inbox`, label: 'แชท', icon: MessagesSquare, badge: pending },
    { to: `/bots/${botId}/flows`, label: 'บอทถามตอบ', icon: Workflow },
    { to: `/bots/${botId}/auto-reply`, label: 'ตอบอัตโนมัติ', icon: Zap },
    { to: `/bots/${botId}/people`, label: 'ลูกค้า', icon: Users },
    { to: `/bots/${botId}/channels`, label: 'ช่องทาง', icon: PlugZap },
  ] : [{ to: '/bots', label: 'ร้านของฉัน', icon: Store }];

  const more = botId ? [
    { to: `/bots/${botId}/broadcasts`, label: 'ส่งข้อความหาหลายคน', icon: Radio },
    { to: `/bots/${botId}/analyze`, label: 'สถิติ', icon: BarChart3 },
    { to: `/bots/${botId}/page-posts`, label: 'โพสต์และคอมเมนต์เพจ', icon: FileText },
    { to: `/bots/${botId}/grow`, label: 'ลิงก์และ QR ชวนทัก', icon: TrendingUp },
    { to: `/bots/${botId}/settings`, label: 'ตั้งค่า Facebook', icon: Facebook },
  ] : [];

  const item = (n: (typeof main)[number], mobile = false) => (
    <NavLink
      key={n.to}
      to={n.to}
      className={({ isActive }) => cn(
        'relative flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] leading-tight transition-colors',
        mobile ? 'flex-1 py-1.5' : 'w-[64px] py-2',
        isActive ? 'bg-jade-100 text-jade-800 font-semibold' : 'text-ink-soft hover:bg-gray-100 hover:text-ink',
      )}
    >
      <n.icon className="h-5 w-5" strokeWidth={1.8} />
      <span className="text-center">{n.label}</span>
      {!!n.badge && (
        <span className="absolute right-2 top-1 min-w-[18px] rounded-full bg-marigold-500 px-1 text-center text-[10px] font-semibold leading-[18px] text-white" aria-label={`รอคนตอบ ${n.badge} ราย`}>
          {n.badge > 99 ? '99+' : n.badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <div className="flex h-dvh bg-paper text-ink">
      {/* desktop rail */}
      <nav className="hidden w-[80px] shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-3 md:flex" aria-label="เมนูหลัก">
        <Link to="/bots" className="mb-3 text-jade-600" title="ร้านของฉัน"><Logo className="h-9 w-9" /></Link>
        {main.map((n) => item(n))}
        {more.length > 0 && (
          <div className="relative" ref={moreRef}>
            <button onClick={() => setMoreOpen((v) => !v)} className={cn('flex w-[64px] flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] text-ink-soft hover:bg-gray-100', moreOpen && 'bg-gray-100 text-ink')} aria-expanded={moreOpen}>
              <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
              <span>เพิ่มเติม</span>
            </button>
            {moreOpen && (
              <div className="absolute left-[72px] top-0 z-50 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
                {more.map((m) => (
                  <Link key={m.to} to={m.to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-100">
                    <m.icon className="h-4 w-4 text-ink-soft" />{m.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="mt-auto flex flex-col items-center gap-1">
          {botId && (
            <Link to="/bots" className="flex w-[64px] flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] text-ink-soft hover:bg-gray-100" title={currentBot?.name}>
              <Store className="h-5 w-5" strokeWidth={1.8} />
              <span className="line-clamp-1 max-w-[60px]">{currentBot?.name ?? 'ร้าน'}</span>
            </Link>
          )}
          <Link to="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-jade-100 text-sm font-semibold text-jade-800" title={user?.name}>
            {user?.name?.slice(0, 1) ?? <UserRound className="h-4 w-4" />}
          </Link>
          <button onClick={() => { logout(); navigate('/login'); }} className="rounded-lg p-2 text-ink-soft hover:bg-gray-100 hover:text-ink" title="ออกจากระบบ" aria-label="ออกจากระบบ">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>

      <main className={cn('min-w-0 flex-1 pb-16 md:pb-0', fullBleed ? 'overflow-hidden' : 'overflow-y-auto scroll-thin')}>
        {fullBleed ? children : <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>}
      </main>

      {/* mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-line bg-surface px-1 pb-[env(safe-area-inset-bottom)] pt-1 md:hidden" aria-label="เมนูหลัก">
        {main.map((n) => item(n, true))}
      </nav>
    </div>
  );
}
