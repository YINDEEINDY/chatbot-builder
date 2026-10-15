import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MessagesSquare, WifiOff } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { ConversationList, type StatusFilter } from '../components/inbox/ConversationList';
import { ChatPane } from '../components/inbox/ChatPane';
import { Ticket } from '../components/inbox/Ticket';
import { conversationsApi, type Assignee } from '../api/conversations';
import { cannedApi, errorText } from '../api/replies';
import { socketService } from '../services/socket';
import type { CannedResponse, Conversation, ConversationStatus, Message } from '../types';
import { cn } from '../utils/cn';
import { useAuthStore } from '../stores/auth.store';

export function InboxPage() {
  const { botId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('c');

  const [assignee, setAssignee] = useState<Assignee>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [counts, setCounts] = useState<Partial<Record<ConversationStatus, number>>>({});
  const [listLoading, setListLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [current, setCurrent] = useState<Conversation | null>(null);

  // Latest-request-wins: a slow response must not overwrite a newer one.
  const listSeq = useRef(0);
  const loadList = useCallback(async () => {
    const seq = ++listSeq.current;
    try {
      const r = await conversationsApi.list(botId, { status, assignee, search: search.trim() || undefined });
      if (seq !== listSeq.current || !r.data) return;
      setConversations(r.data.conversations);
      setCounts(r.data.counts);
    } finally {
      if (seq === listSeq.current) setListLoading(false);
    }
  }, [botId, status, assignee, search]);

  useEffect(() => {
    setListLoading(true);
    const t = setTimeout(loadList, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [loadList, search]);

  useEffect(() => { cannedApi.list(botId).then(setCanned).catch(() => {}); }, [botId]);

  // Keep the open conversation even when it falls out of the current filter.
  useEffect(() => {
    const found = conversations.find((c) => c.id === selectedId);
    if (found) setCurrent(found);
    else if (!selectedId) setCurrent(null);
  }, [conversations, selectedId]);

  const msgSeq = useRef(0);
  useEffect(() => {
    if (!selectedId) return;
    const seq = ++msgSeq.current;
    setMsgLoading(true);
    setMessages([]);
    setError(null);
    conversationsApi.getMessages(botId, selectedId)
      .then((r) => { if (seq === msgSeq.current) setMessages(r.data?.messages ?? []); })
      .finally(() => { if (seq === msgSeq.current) setMsgLoading(false); });
  }, [botId, selectedId]);

  // Realtime
  const currentRef = useRef(current);
  currentRef.current = current;
  useEffect(() => {
    socketService.joinBot(botId);
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(loadList, 300); };
    const offs = [
      socketService.on<{ contactId: string; message: Message }>('message:new', ({ contactId, message }) => {
        if (currentRef.current?.contactId === contactId) {
          setMessages((ms) => ms.some((m) => m.id === message.id) ? ms : [...ms, message]);
        }
        refresh();
      }),
      socketService.on<Conversation>('conversation:updated', (c) => {
        if (currentRef.current?.id === c.id) setCurrent((prev) => prev && { ...prev, ...c });
        refresh();
      }),
      socketService.on<{ contactId: string; attributes: Record<string, string> }>('contact:updated', ({ contactId, attributes }) => {
        setCurrent((prev) => prev && prev.contactId === contactId ? { ...prev, contact: { ...prev.contact, attributes: JSON.stringify(attributes) } } : prev);
      }),
      socketService.onStatus((up) => { setOnline(up); if (up) refresh(); }),
    ];
    return () => { offs.forEach((off) => off()); clearTimeout(timer); };
  }, [botId, loadList]);

  const select = (id: string | null) => {
    setParams(id ? { c: id } : {}, { replace: false });
    setTicketOpen(false);
  };

  const act = async (fn: () => Promise<{ data?: Conversation }>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      if (r.data) setCurrent((prev) => prev && { ...prev, ...r.data });
      await loadList();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const send = async (text: string) => {
    if (!current) return false;
    setBusy(true);
    setError(null);
    try {
      const r = await conversationsApi.sendMessage(botId, current.id, text);
      if (r.data) setMessages((ms) => ms.some((m) => m.id === r.data!.id) ? ms : [...ms, r.data!]);
      return true;
    } catch (e) {
      setError(errorText(e, 'ส่งข้อความไม่สำเร็จ ข้อความยังอยู่ในช่องพิมพ์'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (data: { tags?: string[]; notes?: string | null }) => {
    if (!current) return false;
    try {
      const r = await conversationsApi.saveProfile(botId, current.contactId, data);
      if (r.data) setCurrent((prev) => prev && { ...prev, contact: { ...prev.contact, tags: r.data!.tags, notes: r.data!.notes } });
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    }
  };

  // Keyboard: J/K move through the list, A take the chat, E resolve (ignored while typing)
  const meId = useAuthStore((st) => st.user?.id);
  const keysRef = useRef({ conversations, selectedId, current });
  keysRef.current = { conversations, selectedId, current };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable) return;
      const { conversations: list, selectedId: sel, current: cur } = keysRef.current;
      const i = list.findIndex((c) => c.id === sel);
      const k = e.key.toLowerCase();
      if (k === 'j' || k === 'k') {
        const next = list[k === 'j' ? Math.min(i + 1, list.length - 1) : Math.max(i - 1, 0)] ?? list[0];
        if (next) { e.preventDefault(); setParams({ c: next.id }); }
      } else if (k === 'a' && cur && (cur.status === 'bot' || cur.status === 'pending')) {
        e.preventDefault(); act(() => conversationsApi.takeover(botId, cur.id));
      } else if (k === 'e' && cur && cur.status !== 'resolved') {
        e.preventDefault(); act(() => conversationsApi.close(botId, cur.id));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [botId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAttrs = async (attrs: Record<string, string>) => {
    if (!current) return false;
    try {
      const r = await conversationsApi.saveAttributes(botId, current.contactId, attrs);
      if (r.data) setCurrent((prev) => prev && { ...prev, contact: { ...prev.contact, attributes: r.data!.attributes } });
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    }
  };

  return (
    <MainLayout fullBleed>
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-marigold-100 px-3 py-1.5 text-xs text-marigold-700" role="status">
          <WifiOff className="h-3.5 w-3.5" />ขาดการเชื่อมต่อ ข้อความใหม่จะยังไม่เด้งขึ้น กำลังเชื่อมต่อใหม่
        </div>
      )}
      <div className="flex h-full">
        <div className={cn('w-full shrink-0 border-r border-line lg:w-[320px] 2xl:w-[360px]', selectedId && 'hidden lg:block')}>
          <ConversationList
            conversations={conversations}
            counts={counts}
            loading={listLoading}
            selectedId={selectedId}
            onSelect={select}
            assignee={assignee}
            onAssignee={setAssignee}
            status={status}
            onStatus={setStatus}
            search={search}
            onSearch={setSearch}
            meId={meId}
          />
        </div>

        {current ? (
          <>
            <div className={cn('min-w-0 flex-1', !selectedId && 'hidden lg:block')}>
              <ChatPane
                conversation={current}
                messages={messages}
                loading={msgLoading}
                canned={canned}
                busy={busy}
                error={error}
                onBack={() => select(null)}
                onToggleTicket={() => setTicketOpen((v) => !v)}
                onSend={send}
                onTakeover={() => act(() => conversationsApi.takeover(botId, current.id))}
                onRelease={() => act(() => conversationsApi.release(botId, current.id))}
                onResolve={() => act(() => conversationsApi.close(botId, current.id))}
              />
            </div>
            <div className="hidden w-[320px] shrink-0 border-l border-line xl:block 2xl:w-[340px]">
              <Ticket conversation={current} onSave={saveAttrs} onSaveProfile={saveProfile} />
            </div>
            {ticketOpen && (
              <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 xl:hidden" onClick={() => setTicketOpen(false)}>
                <div className="h-full w-[min(360px,92vw)] border-l border-line shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <Ticket conversation={current} onSave={saveAttrs} onSaveProfile={saveProfile} onClose={() => setTicketOpen(false)} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-center lg:flex">
            <MessagesSquare className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
            <p className="text-sm text-ink-soft">
              {counts.pending ? `มีลูกค้า ${counts.pending} รายรอคนตอบ เลือกจากรายการทางซ้ายได้เลย` : 'เลือกแชททางซ้ายเพื่อเริ่มตอบ'}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
