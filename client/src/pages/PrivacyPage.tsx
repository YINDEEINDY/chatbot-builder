export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-sm text-gray-500 mb-8">ปรับปรุงล่าสุด 5 มีนาคม 2569</p>

        <div className="prose prose-blue max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. บทนำ</h2>
            <p className="text-gray-600 mb-4">
              ตอบไว (“เรา”) ให้ความสำคัญกับความเป็นส่วนตัวและความปลอดภัยของข้อมูลส่วนบุคคลของคุณ
              นโยบายนี้อธิบายว่าเราเก็บ ใช้ เปิดเผย และปกป้องข้อมูลของคุณอย่างไร
              เมื่อคุณใช้ระบบตอบลูกค้าตอบไว
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. ข้อมูลที่เราเก็บ</h2>
            <p className="text-gray-600 mb-4">เราเก็บข้อมูลประเภทต่อไปนี้</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>ข้อมูลบัญชี:</strong> ชื่อ อีเมล และข้อมูลโปรไฟล์ที่ใช้ตอนสมัคร</li>
              <li><strong>ข้อมูล Facebook:</strong> เมื่อคุณเชื่อมเพจ Facebook เราเข้าถึงชื่อเพจ Page ID และข้อความในเพจ</li>
              <li><strong>ข้อมูล Instagram:</strong> เมื่อคุณเชื่อมบัญชี Instagram ธุรกิจ เราเข้าถึงชื่อผู้ใช้ Instagram รหัสบัญชี และข้อความ Direct</li>
              <li><strong>ข้อมูลการใช้งาน:</strong> วิธีที่คุณใช้ระบบ รวมถึงการตั้งค่าบอทและสถิติ</li>
              <li><strong>ข้อมูลการสนทนา:</strong> ข้อความที่ส่งและรับผ่านเพจ Facebook และบัญชี Instagram ธุรกิจที่เชื่อมไว้</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">3. เราใช้ข้อมูลอย่างไร</h2>
            <p className="text-gray-600 mb-4">เราใช้ข้อมูลที่เก็บเพื่อ</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>ให้บริการและดูแลระบบตอบลูกค้า</li>
              <li>รับและตอบข้อความในเพจ Facebook และบัญชี Instagram ธุรกิจของคุณ</li>
              <li>แสดงสถิติข้อความและลูกค้าของเพจ</li>
              <li>ปรับปรุงบริการให้เหมาะกับการใช้งานของคุณ</li>
              <li>แจ้งข่าวสำคัญเกี่ยวกับบริการ</li>
              <li>ปฏิบัติตามกฎหมาย</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. การใช้ข้อมูล Facebook และ Instagram</h2>
            <p className="text-gray-600 mb-4">
              เมื่อคุณเชื่อมเพจ Facebook และบัญชี Instagram ธุรกิจ เราขอสิทธิ์ต่อไปนี้
            </p>
            <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">สิทธิ์ของเพจ Facebook</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>pages_show_list:</strong> แสดงรายชื่อเพจที่คุณดูแล เพื่อให้เลือกเพจที่จะเชื่อมกับบอท</li>
              <li><strong>pages_read_engagement:</strong> อ่านและแสดงโพสต์ คอมเมนต์ และข้อมูลการมีส่วนร่วมของเพจ เพื่อให้คุณติดตามและจัดการเนื้อหาในเพจได้</li>
              <li><strong>pages_manage_metadata:</strong> แสดงข้อมูลเพจ และสมัครรับเหตุการณ์ Webhook เพื่อรับข้อความแบบทันที</li>
              <li><strong>pages_messaging:</strong> รับและส่งข้อความผ่านบอททาง Facebook Messenger ทั้งการตอบอัตโนมัติและการแชทกับเจ้าหน้าที่</li>
              <li><strong>pages_read_user_content:</strong> อ่านเนื้อหาที่ผู้ใช้โพสต์ในเพจ เช่น คอมเมนต์และรีวิว เพื่อให้คุณดูและจัดการได้</li>
            </ul>
            <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">สิทธิ์ของ Instagram</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>instagram_basic:</strong> เข้าถึงข้อมูลโปรไฟล์บัญชี Instagram ธุรกิจ เช่น ชื่อผู้ใช้และรหัสบัญชี</li>
              <li><strong>instagram_manage_messages:</strong> รับและส่งข้อความ Direct ในบัญชี Instagram ธุรกิจผ่านบอท ทั้งการตอบอัตโนมัติและการแชทกับเจ้าหน้าที่</li>
            </ul>
            <p className="text-gray-600 mt-4">
              เราเข้าถึงและเก็บเฉพาะข้อมูลที่จำเป็นต่อการให้บริการ และไม่ขายข้อมูล Facebook
              หรือ Instagram ของคุณให้บุคคลอื่น
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">5. การจัดเก็บและความปลอดภัย</h2>
            <p className="text-gray-600 mb-4">
              เรามีมาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อปกป้องข้อมูลส่วนบุคคลของคุณ
              ข้อมูลถูกจัดเก็บอย่างปลอดภัยและเข้ารหัสระหว่างส่ง
              อย่างไรก็ตาม ไม่มีวิธีส่งข้อมูลผ่านอินเทอร์เน็ตใดที่ปลอดภัยได้ 100%
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">6. ระยะเวลาเก็บข้อมูล</h2>
            <p className="text-gray-600 mb-4">
              เราเก็บข้อมูลส่วนบุคคลไว้ตลอดช่วงที่บัญชียังใช้งาน หรือเท่าที่จำเป็นต่อการให้บริการ
              คุณขอให้ลบข้อมูลได้ทุกเมื่อ
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">7. สิทธิ์ของคุณ</h2>
            <p className="text-gray-600 mb-4">คุณมีสิทธิ์</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>เข้าถึงข้อมูลส่วนบุคคลของคุณ</li>
              <li>แก้ไขข้อมูลที่ไม่ถูกต้อง</li>
              <li>ขอให้ลบข้อมูลของคุณ</li>
              <li>ยกเลิกการเชื่อมเพจ Facebook และบัญชี Instagram ได้ทุกเมื่อ</li>
              <li>ขอสำเนาข้อมูลของคุณ</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">8. การลบข้อมูล</h2>
            <p className="text-gray-600 mb-4">
              ถ้าต้องการลบข้อมูล คุณทำได้โดย
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>ยกเลิกการเชื่อมเพจ Facebook ในหน้าตั้งค่า Facebook และ Instagram</li>
              <li>ลบร้านในหน้า “ร้านของฉัน” ซึ่งจะลบแชทและข้อมูลลูกค้าของร้านนั้นทั้งหมด</li>
              <li>ติดต่อผู้ดูแลระบบของร้านที่คุณใช้งาน เพื่อขอลบข้อมูลทั้งหมด</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">9. บริการของบุคคลอื่น</h2>
            <p className="text-gray-600 mb-4">
              ระบบของเราเชื่อมต่อกับบริการของ Facebook/Meta รวมถึง Messenger API และ Instagram Messaging API
              โปรดอ่านนโยบายความเป็นส่วนตัวของ Meta ว่าจัดการข้อมูลของคุณอย่างไร
              เราไม่รับผิดชอบต่อการจัดการความเป็นส่วนตัวของบริการภายนอก
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">10. การแก้ไขนโยบาย</h2>
            <p className="text-gray-600 mb-4">
              เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว เมื่อมีการเปลี่ยนแปลง เราจะลงนโยบายฉบับใหม่ในหน้านี้
              และแก้วันที่ “ปรับปรุงล่าสุด” ด้านบน
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">11. ติดต่อสอบถาม</h2>
            <p className="text-gray-600 mb-4">
              หากมีคำถามเกี่ยวกับนโยบายนี้ ติดต่อผู้ดูแลระบบของร้านที่คุณใช้งาน
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a href="/login" className="text-blue-600 hover:text-blue-800">
            &larr; กลับไปหน้าเข้าสู่ระบบ
          </a>
        </div>
      </div>
    </div>
  );
}
