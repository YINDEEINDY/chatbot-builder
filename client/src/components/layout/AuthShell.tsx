import { Logo } from './MainLayout';

/** Login/register frame. The left side shows what the product actually does: a filled-in ใบรับเรื่อง. */
export function AuthShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-paper text-ink">
      <aside className="relative hidden w-[44%] max-w-[620px] flex-col justify-between overflow-hidden bg-jade-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="text-white"><Logo className="h-9 w-9 text-jade-600" /></span>ตอบไว
        </div>
        <div>
          <p className="max-w-md text-[28px] font-semibold leading-snug">บอทถามให้ก่อน คนตอบต่อได้ทันที</p>
          <p className="mt-3 max-w-sm text-jade-100">แชทจาก LINE, Facebook, Instagram และเว็บไซต์ รวมในกล่องเดียว</p>
          <div className="mt-10 max-w-[340px] rotate-[-1.5deg] text-ink" aria-hidden>
            <div className="ticket px-5 pb-5 pt-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="font-semibold">สมชาย รักดี</span>
                <span className="stamp text-marigold-600">รอคนตอบ</span>
              </div>
              <p className="text-xs text-ink-soft">ทักผ่าน LINE เมื่อ 2 นาทีก่อน</p>
              <dl className="mt-4 text-sm">
                {[['หัวข้อ', 'สั่งซื้อ / จองคิว'], ['สินค้า', 'ช่อกุหลาบแดง 20 ดอก'], ['เบอร์โทร', '081 234 5678'], ['วันส่ง', 'พรุ่งนี้เช้า']].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[88px_1fr] border-b border-dashed border-gray-200 py-1.5">
                    <dt className="text-ink-soft">{k}</dt><dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
        <p className="text-xs text-jade-200">ติดตั้งบนเครื่องของคุณเอง ข้อมูลลูกค้าอยู่กับคุณ</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5 text-lg font-semibold lg:hidden"><Logo className="h-8 w-8 text-jade-600" />ตอบไว</div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{sub}</p>
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
