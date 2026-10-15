// "What the customer sees": faithful-enough mocks of each app, driven by the same simulated conversation.
// Behaviour per official docs (2026-10):
//  - Messenger / Instagram quick replies: pills above the composer, max 13, vanish after a tap or the next
//    message; the tapped title is posted as the customer's message. Instagram: not shown on desktop.
//    Messenger desktop: not documented by Meta — treated as "may not show".
//  - LINE: we send a Flex bubble with buttons — supported on every LINE version and it stays in the chat.
// Colours are approximations of each app (LINE values measured from LINE's docs screenshots).
import { ChevronLeft, Info, Phone, SendHorizontal, Video } from 'lucide-react';
import { cn } from '../../utils/cn';

export type MockPlatform = 'web' | 'messenger' | 'line' | 'instagram';
export type MockDevice = 'mobile' | 'desktop';
export interface MockLine { from: 'bot' | 'me' | 'note'; text: string; buttons?: { id: string; label: string; payload: string }[] }

/** Same text the server sends to Messenger/Instagram and as LINE altText (server/src/channels/text.ts). */
export const withNumbers = (text: string, labels: string[]) =>
  labels.length ? `${text}\n\n${labels.map((l, i) => `${i + 1}. ${l}`).join('\n')}` : text;
const clip = (s: string, max: number) => ([...s].length <= max ? s : [...s].slice(0, max - 1).join('') + '…');

export const PLATFORM_NOTES: Record<MockPlatform, Record<MockDevice, string>> = {
  web: {
    mobile: 'ปุ่มอยู่ใต้คำถามและค้างไว้ กดได้เฉพาะชุดล่าสุด',
    desktop: 'ปุ่มอยู่ใต้คำถามและค้างไว้ กดได้เฉพาะชุดล่าสุด',
  },
  messenger: {
    mobile: 'ปุ่มลอยเหนือช่องพิมพ์ กดแล้วปุ่มหาย และชื่อปุ่มขึ้นเป็นข้อความของลูกค้า ย้อนดูทีหลังจะเห็นแค่รายการตัวเลขในคำถาม',
    desktop: 'Meta ไม่ได้ยืนยันว่าบนคอมแสดงปุ่ม ลูกค้ายังเห็นรายการตัวเลขและพิมพ์เลขตอบได้',
  },
  line: {
    mobile: 'ส่งเป็นการ์ดที่มีปุ่ม ปุ่มค้างอยู่ในแชท กดแล้วชื่อปุ่มขึ้นเป็นข้อความของลูกค้า',
    desktop: 'การ์ดแบบเดียวกันใช้ได้บน LINE คอมด้วย (ปุ่มตอบเร็วแบบลอยของ LINE ไม่แสดงบนคอม จึงไม่ใช้)',
  },
  instagram: {
    mobile: 'ปุ่มลอยเหนือช่องพิมพ์ กดแล้วปุ่มหาย ชื่อปุ่มขึ้นเป็นข้อความของลูกค้า',
    desktop: 'instagram.com บนคอมไม่แสดงปุ่ม ลูกค้าเห็นคำถามพร้อมรายการตัวเลข และพิมพ์เลขตอบได้',
  },
};

interface Props {
  platform: MockPlatform;
  device: MockDevice;
  shopName: string;
  lines: MockLine[];
  waiting: boolean;
  onTap: (label: string, payload: string) => void;
}

const THEME = {
  messenger: { bg: '#ffffff', them: 'bg-[#F0F0F0] text-[#050505]', me: 'bg-[#0084FF] text-white', pill: 'border border-[#0084FF] text-[#0084FF] bg-white' },
  instagram: { bg: '#ffffff', them: 'bg-[#EFEFEF] text-[#262626]', me: 'bg-gradient-to-r from-[#A033FF] to-[#3797F0] text-white', pill: 'border border-[#DBDBDB] text-[#262626] bg-white' },
};

export function PlatformMock({ platform, device, shopName, lines, waiting, onTap }: Props) {
  const lastBot = [...lines].reverse().find((l) => l.from !== 'note');
  // Quick replies exist only on the newest bot message and only until the customer answers.
  const quick = waiting && lastBot?.from === 'bot' && lastBot.buttons?.length ? lastBot.buttons : null;
  const pillsVisible = !(device === 'desktop' && (platform === 'instagram' || platform === 'messenger'));

  if (platform === 'line') {
    return (
      <Frame device={device} header={<div className="flex items-center gap-2 bg-[#1F2A3C] px-3 py-2.5 text-white"><ChevronLeft className="h-5 w-5" /><span className="flex-1 truncate text-sm font-semibold">{shopName}</span></div>}>
        <div className="flex-1 space-y-2.5 overflow-y-auto p-3 scroll-thin" style={{ background: '#8BABD7' }}>
          {lines.map((l, i) => l.from === 'note' ? <Note key={i} text={l.text} dark /> : l.from === 'me' ? (
            <p key={i} className="ml-auto w-fit max-w-[78%] whitespace-pre-wrap rounded-[18px] rounded-tr-[4px] bg-[#6CE67B] px-3 py-2 text-[13px] text-black">{l.text}</p>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-white/70" />
              {l.buttons?.length ? (
                <div className="w-[78%] overflow-hidden rounded-[14px] bg-white">
                  <p className="whitespace-pre-wrap px-3.5 py-3 text-[13px] text-[#111]">{l.text}</p>
                  <div className="space-y-1.5 px-3 pb-3">
                    {l.buttons.map((b) => (
                      <button key={b.id} onClick={() => onTap(b.label, b.payload)} className="block w-full truncate rounded-md bg-[#DCDFE5] px-2 py-1.5 text-center text-[13px] font-semibold text-[#111] hover:brightness-95">{clip(b.label, 40)}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="max-w-[78%] whitespace-pre-wrap rounded-[18px] rounded-tl-[4px] bg-white px-3 py-2 text-[13px] text-[#111]">{l.text}</p>
              )}
            </div>
          ))}
        </div>
        <Composer tone="line" disabled={!waiting} />
      </Frame>
    );
  }

  if (platform === 'messenger' || platform === 'instagram') {
    const t = THEME[platform];
    return (
      <Frame device={device} header={
        <div className="flex items-center gap-2 border-b border-[#E4E6EB] bg-white px-3 py-2.5">
          <ChevronLeft className={cn('h-5 w-5', platform === 'messenger' ? 'text-[#0084FF]' : 'text-[#262626]')} />
          <span className="h-7 w-7 rounded-full bg-gray-200" />
          <span className="flex-1 truncate text-sm font-semibold text-[#050505]">{shopName}</span>
          <Phone className={cn('h-4 w-4', platform === 'messenger' ? 'text-[#0084FF]' : 'text-[#262626]')} />
          <Video className={cn('h-4 w-4', platform === 'messenger' ? 'text-[#0084FF]' : 'text-[#262626]')} />
          {platform === 'messenger' && <Info className="h-4 w-4 text-[#0084FF]" />}
        </div>
      }>
        <div className="flex-1 space-y-1.5 overflow-y-auto bg-white p-3 scroll-thin">
          {lines.map((l, i) => l.from === 'note' ? <Note key={i} text={l.text} /> : (
            <p key={i} className={cn('w-fit max-w-[78%] whitespace-pre-wrap rounded-[18px] px-3 py-2 text-[13px]', l.from === 'me' ? cn('ml-auto', t.me) : t.them)}>
              {l.from === 'bot' && l.buttons?.length ? withNumbers(l.text, l.buttons.map((b) => b.label)) : l.text}
            </p>
          ))}
        </div>
        {quick && pillsVisible && (
          <div className="flex gap-1.5 overflow-x-auto bg-white px-3 pb-2 pt-1 [scrollbar-width:none]">
            {quick.map((b) => (
              <button key={b.id} onClick={() => onTap(b.label, b.payload)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium', t.pill)}>{clip(b.label, 20)}</button>
            ))}
          </div>
        )}
        <Composer tone={platform} disabled={!waiting} />
      </Frame>
    );
  }

  return null; // web: the regular preview renders it
}

function Note({ text, dark }: { text: string; dark?: boolean }) {
  return <p className={cn('mx-auto w-fit rounded-full px-3 py-1 text-center text-[11px]', dark ? 'bg-black/20 text-white' : 'bg-gray-100 text-gray-500')}>{text}</p>;
}

function Composer({ tone, disabled }: { tone: 'line' | 'messenger' | 'instagram'; disabled: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2', tone === 'line' ? 'bg-white' : 'border-t border-[#E4E6EB] bg-white')}>
      <span className={cn('flex-1 rounded-full px-3 py-1.5 text-[12px] text-gray-400', tone === 'line' ? 'bg-[#F3F5F7]' : 'bg-[#F0F2F5]')}>{disabled ? 'จบขั้นตอนบอทแล้ว' : 'Aa'}</span>
      <SendHorizontal className={cn('h-4 w-4', tone === 'messenger' ? 'text-[#0084FF]' : tone === 'line' ? 'text-gray-400' : 'text-[#3797F0]')} />
    </div>
  );
}

function Frame({ device, header, children }: { device: MockDevice; header: React.ReactNode; children: React.ReactNode }) {
  return device === 'mobile' ? (
    <div className="mx-auto flex h-[560px] w-[300px] flex-col overflow-hidden rounded-[32px] border-[6px] border-[#1b2530] bg-white shadow-xl">
      <div className="flex h-6 shrink-0 items-center justify-between bg-white px-5 text-[10px] font-semibold text-black"><span>9:41</span><span className="h-3 w-16 rounded-full bg-black" /><span>100%</span></div>
      {header}
      {children}
    </div>
  ) : (
    <div className="mx-auto flex h-[460px] w-full max-w-[460px] flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
      <div className="flex h-7 shrink-0 items-center gap-1.5 bg-gray-100 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-green-400" />
      </div>
      {header}
      {children}
    </div>
  );
}
