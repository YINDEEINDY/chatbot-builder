import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, Bell, BellOff, Bot, Check, ChevronDown, ChevronsUpDown, Facebook, FileText, LayoutDashboard, LogOut,
  MessagesSquare, Plus, Radio, Search, Settings, Store, TrendingUp, UserRound, Users, Zap, type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useBotStore } from '../../stores/bot.store';
import { ShopPulseContext, SETUP_STEPS, useShopPulseSource } from '../../hooks/useShopPulse';
import { useWaitingAlerts } from '../../hooks/useWaitingAlerts';
import { CommandPalette, type PaletteAction } from './CommandPalette';
import { initials } from '../inbox/format';
import { cn } from '../../utils/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M8 10.5A3.5 3.5 0 0 1 11.5 7h9A3.5 3.5 0 0 1 24 10.5v6a3.5 3.5 0 0 1-3.5 3.5H15l-5 4v-4.2A3.5 3.5 0 0 1 8 16.5z" fill="#fff" />
      <circle cx="21.5" cy="9.5" r="3.5" fill="#d9920b" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

interface NavItem { to: string; label: string; icon: LucideIcon; badge?: number; end?: boolean }

function useClickOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, close]);
  return ref;
}

export function MainLayout({ children, fullBleed }: { children: React.ReactNode; fullBleed?: boolean }) {
  const { user, logout } = useAuthStore();
  const { bots, currentBot, loadBot, loadBots } = useBotStore();
  const navigate = useNavigate();
  const location = useLocation();
  const botId = location.pathname.match(/^\/bots\/([^/]+)/)?.[1] ?? null;
  const pulse = useShopPulseSource(botId);
  const pending = pulse.data?.now.pending ?? 0;
  const alerts = useWaitingAlerts(botId, pending, (id) => navigate(`/bots/${botId}/inbox?c=${id}`));

  const [shopOpen, setShopOpen] = useState(false);
  const [meOpen, setMeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [away, setAway] = useState(() => { try { return localStorage.getItem('tobwai:away') === '1'; } catch { return false; } });
  const shopRef = useClickOutside<HTMLDivElement>(shopOpen, () => setShopOpen(false));
  const meRef = useClickOutside<HTMLDivElement>(meOpen, () => setMeOpen(false));

  useEffect(() => { if (botId && currentBot?.id !== botId) loadBot(botId); }, [botId, currentBot?.id, loadBot]);
  useEffect(() => { if (shopOpen && !bots.length) loadBots(); }, [shopOpen, bots.length, loadBots]);
  useEffect(() => { setShopOpen(false); setMeOpen(false); }, [location.pathname]);

  // Ctrl+K / ⌘K anywhere, "/" when not typing
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true); }
      else if (e.key === '/' && !typing) { e.preventDefault(); setPaletteOpen(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const b = (p: string) => `/bots/${botId}/${p}`;
  const main: NavItem[] = botId ? [
    { to: b('overview'), label: 'ภาพรวม', icon: LayoutDashboard },
    { to: b('inbox'), label: 'แชท', icon: MessagesSquare, badge: pending },
    { to: b('people'), label: 'ลูกค้า', icon: Users },
  ] : [{ to: '/bots', label: 'ร้านของฉัน', icon: Store, end: true }];
  const build: NavItem[] = botId ? [
    { to: b('flows'), label: 'บอทและแบบสอบถาม', icon: Bot },
    { to: b('auto-reply'), label: 'ตอบอัตโนมัติ', icon: Zap },
    { to: b('analyze'), label: 'รายงาน', icon: BarChart3 },
    { to: b('channels'), label: 'ตั้งค่าและช่องทาง', icon: Settings },
  ] : [];
  const more: NavItem[] = botId ? [
    { to: b('broadcasts'), label: 'ส่งข้อความหาหลายคน', icon: Radio },
    { to: b('page-posts'), label: 'โพสต์และคอมเมนต์เพจ', icon: FileText },
    { to: b('grow'), label: 'ลิงก์และ QR ชวนทัก', icon: TrendingUp },
    { to: b('settings'), label: 'ตั้งค่า Facebook', icon: Facebook },
  ] : [];
  const tabs: NavItem[] = botId ? [main[0], main[1], main[2], build[0], build[3]] : main;

  const paletteActions: PaletteAction[] = useMemo(() => [
    ...[...main, ...build, ...more].map((n) => ({ label: n.label, icon: n.icon, to: n.to })),
    { label: 'ร้านของฉัน', icon: Store, to: '/bots', keywords: 'สลับร้าน shop' },
    { label: 'โปรไฟล์', icon: UserRound, to: '/profile', keywords: 'บัญชี รหัสผ่าน' },
  ], [botId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setup = pulse.data?.setup;
  const doneSteps = setup ? SETUP_STEPS.filter((s) => setup[s.key]).length : 0;
  const nextStep = setup ? SETUP_STEPS.find((s) => !setup[s.key]) : undefined;

  const navLink = (n: NavItem) => (
    <NavLink
      key={n.to}
      to={n.to}
      end={n.end}
      className={({ isActive }) => cn(
        'flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors',
        isActive ? 'bg-surface font-semibold text-ink shadow-[inset_0_0_0_1px_var(--color-line)] [&>svg]:text-jade-600' : 'text-ink-soft hover:bg-gray-200/60 hover:text-ink',
      )}
    >
      <n.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
      <span className="min-w-0 flex-1 truncate">{n.label}</span>
      {!!n.badge && (
        <span className="min-w-[20px] rounded-full bg-marigold-500 px-1.5 text-center text-xs font-semibold leading-5 text-white tabular-nums" aria-label={`รอคนตอบ ${n.badge} ราย`}>
          {n.badge > 99 ? '99+' : n.badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <ShopPulseContext.Provider value={pulse}>
      <div className="flex h-dvh bg-paper text-ink">
        <aside className="hidden w-[228px] shrink-0 flex-col border-r border-line bg-[#eceeeb] px-3 pb-3 pt-3 md:flex" aria-label="เมนูหลัก">
          {/* shop switcher */}
          <div className="relative" ref={shopRef}>
            <button onClick={() => setShopOpen((v) => !v)} aria-expanded={shopOpen} className="flex h-12 w-full items-center gap-2.5 rounded-lg px-2 text-left hover:bg-gray-200/60">
              <span className="text-jade-600"><Logo className="h-8 w-8" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold leading-tight">{botId ? currentBot?.name ?? 'กำลังโหลด' : 'ตอบไว'}</span>
                <span className="block text-xs text-ink-soft">{botId ? 'สลับร้าน' : 'กล่องแชทร้าน'}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 text-ink-soft" />
            </button>
            {shopOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
                {bots.map((s) => (
                  <Link key={s.id} to={`/bots/${s.id}/overview`} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-gray-100">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-jade-100 text-xs font-semibold text-jade-800">{initials(s.name)}</span>
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    {s.id === botId && <Check className="h-4 w-4 text-jade-600" />}
                  </Link>
                ))}
                <div className="my-1 h-px bg-line" />
                <Link to="/bots" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-gray-100"><Plus className="h-4 w-4" />เพิ่มหรือจัดการร้าน</Link>
              </div>
            )}
          </div>

          <button onClick={() => setPaletteOpen(true)} className="mt-3 flex h-8 items-center gap-2 rounded-lg border border-gray-300 bg-surface px-2.5 text-[13px] text-ink-soft hover:border-gray-400">
            <Search className="h-4 w-4" />ค้นหา
            <kbd className="ml-auto rounded border border-line border-b-2 bg-surface px-1 text-[11px] leading-4">Ctrl K</kbd>
          </button>

          <nav className="mt-3 flex flex-col gap-0.5">
            {main.map(navLink)}
            {build.length > 0 && <div className="mx-2 my-2 h-px bg-line" />}
            {build.map(navLink)}
            {more.length > 0 && (
              <>
                <button onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} className="mt-1 flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs text-ink-soft hover:text-ink">
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !moreOpen && '-rotate-90')} />เครื่องมือเพิ่มเติม
                </button>
                {moreOpen && more.map(navLink)}
              </>
            )}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            {botId && setup && nextStep && (
              <Link to={b(nextStep.path)} className="rounded-xl border border-gray-300 bg-surface p-3 hover:border-gray-400">
                <span className="flex items-baseline justify-between text-[13px]"><b className="font-semibold">เริ่มต้นใช้งาน</b><span className="text-xs text-ink-soft tabular-nums">{doneSteps}/{SETUP_STEPS.length}</span></span>
                <span className="my-2 block h-1 rounded-full bg-line"><span className="block h-1 rounded-full bg-jade-600" style={{ width: `${(doneSteps / SETUP_STEPS.length) * 100}%` }} /></span>
                <span className="block text-xs text-ink-soft">ถัดไป: {nextStep.label} <span className="font-medium text-jade-700">ทำต่อ</span></span>
              </Link>
            )}

            <div className="relative flex items-center gap-2 border-t border-line px-1 pt-3" ref={meRef}>
              <button onClick={() => setMeOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left" aria-expanded={meOpen} aria-label="เมนูบัญชี">
                <span className="relative">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-jade-100 text-[13px] font-semibold text-jade-800">{user?.name ? initials(user.name) : <UserRound className="h-4 w-4" />}</span>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#eceeeb]', away ? 'bg-gray-400' : 'bg-jade-500')} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold leading-tight">{user?.name}</span>
                  <span className="block text-xs text-ink-soft">{away ? 'ไม่อยู่' : 'ออนไลน์'}</span>
                </span>
              </button>
              {botId && (
                <button onClick={alerts.toggle} className="rounded-lg p-1.5 text-ink-soft hover:bg-gray-200/60 hover:text-ink" title={alerts.enabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'} aria-label={alerts.enabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}>
                  {alerts.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </button>
              )}
              {meOpen && (
                <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
                  <button onClick={() => { const v = !away; setAway(v); try { localStorage.setItem('tobwai:away', v ? '1' : '0'); } catch { /* ignore */ } }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-gray-100">
                    <span className={cn('h-2.5 w-2.5 rounded-full', away ? 'bg-jade-500' : 'bg-gray-400')} />{away ? 'กลับมาออนไลน์' : 'ตั้งเป็นไม่อยู่'}
                  </button>
                  <Link to="/profile" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-gray-100"><UserRound className="h-4 w-4 text-ink-soft" />โปรไฟล์</Link>
                  <button onClick={() => { logout(); navigate('/login'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" />ออกจากระบบ</button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* mobile header: shop + search (the sidebar is hidden on phones) */}
          {!fullBleed && (
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 md:hidden">
              <Link to="/bots" className="flex min-w-0 flex-1 items-center gap-2">
                <span className="text-jade-600"><Logo className="h-7 w-7" /></span>
                <span className="truncate text-sm font-semibold">{botId ? currentBot?.name : 'ตอบไว'}</span>
                {botId && <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-soft" />}
              </Link>
              <button onClick={() => setPaletteOpen(true)} className="rounded-lg p-2 text-ink-soft hover:bg-gray-100" aria-label="ค้นหา"><Search className="h-5 w-5" /></button>
              <Link to="/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-jade-100 text-xs font-semibold text-jade-800" aria-label="โปรไฟล์">{user?.name ? initials(user.name) : <UserRound className="h-4 w-4" />}</Link>
            </header>
          )}
          <main className={cn('min-h-0 min-w-0 flex-1 pb-16 md:pb-0', fullBleed ? 'overflow-hidden' : 'overflow-y-auto scroll-thin')}>
            {fullBleed ? children : <div className="mx-auto max-w-6xl px-4 py-6 md:px-10 md:py-8">{children}</div>}
          </main>
        </div>

        {/* mobile tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-line bg-surface px-1 pb-[env(safe-area-inset-bottom)] pt-1 md:hidden" aria-label="เมนูหลัก">
          {tabs.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px]', isActive ? 'bg-jade-50 font-semibold text-jade-800' : 'text-ink-soft')}>
              <n.icon className="h-5 w-5" strokeWidth={1.8} />
              <span className="max-w-full truncate px-1">{n.label === 'บอทและแบบสอบถาม' ? 'บอท' : n.label === 'ตั้งค่าและช่องทาง' ? 'ตั้งค่า' : n.label}</span>
              {!!n.badge && <span className="absolute right-3 top-0.5 min-w-[18px] rounded-full bg-marigold-500 px-1 text-center text-[10px] font-semibold leading-[18px] text-white">{n.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} botId={botId} actions={paletteActions} />
      </div>
    </ShopPulseContext.Provider>
  );
}
