export function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">ข้อตกลงการใช้งาน</h1>
        <p className="text-sm text-gray-500 mb-8">ปรับปรุงล่าสุด 5 มีนาคม 2569</p>

        <div className="prose prose-blue max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. การยอมรับข้อตกลง</h2>
            <p className="text-gray-600 mb-4">
              เมื่อคุณเข้าใช้งานตอบไว (“บริการ”) ถือว่าคุณยอมรับข้อตกลงการใช้งานนี้
              ถ้าไม่ยอมรับ กรุณาอย่าใช้บริการ
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. บริการของเรา</h2>
            <p className="text-gray-600 mb-4">
              ตอบไวเป็นระบบตอบลูกค้าสำหรับร้านค้า ใช้สร้างและจัดการบอทตอบแชทอัตโนมัติ
              สำหรับเพจ Facebook บัญชี Instagram ธุรกิจ และช่องทางอื่น บริการประกอบด้วย
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>สร้างและตั้งค่าบอทตอบแชท</li>
              <li>เชื่อมเพจ Facebook และบัญชี Instagram ธุรกิจ</li>
              <li>ตอบข้อความอัตโนมัติทาง Facebook Messenger และ Instagram Direct</li>
              <li>สถิติข้อความและลูกค้า</li>
              <li>กล่องแชทที่ให้เจ้าหน้าที่รับเรื่องต่อจากบอท</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">3. บัญชีผู้ใช้</h2>
            <p className="text-gray-600 mb-4">
              ในการใช้บริการ คุณต้อง
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>สมัครบัญชีด้วยข้อมูลที่ถูกต้อง</li>
              <li>มีอายุ 18 ปีขึ้นไป หรือได้รับความยินยอมจากผู้ปกครอง</li>
              <li>เก็บรหัสผ่านและข้อมูลเข้าสู่ระบบไว้ให้ปลอดภัย</li>
              <li>แจ้งผู้ดูแลระบบทันทีเมื่อพบว่ามีคนเข้าบัญชีโดยไม่ได้รับอนุญาต</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. การเชื่อม Facebook และ Instagram</h2>
            <p className="text-gray-600 mb-4">
              เมื่อคุณเชื่อมเพจ Facebook หรือบัญชี Instagram ธุรกิจเข้ากับบริการ
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>คุณต้องเป็นแอดมินของเพจ Facebook หรือบัญชี Instagram ธุรกิจนั้น</li>
              <li>คุณอนุญาตให้บริการเข้าถึงและจัดการข้อความแทนคุณ ทั้งใน Facebook Messenger และ Instagram Direct</li>
              <li>คุณต้องปฏิบัติตามข้อกำหนดและนโยบายแพลตฟอร์มของ Meta</li>
              <li>คุณรับผิดชอบเนื้อหาที่บอทของคุณส่งออกไปทั้งสองแพลตฟอร์ม</li>
              <li>คุณยกเลิกการเชื่อมเพจ Facebook หรือบัญชี Instagram ได้ทุกเมื่อในหน้าตั้งค่าของบอท</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">5. การใช้งานที่ไม่อนุญาต</h2>
            <p className="text-gray-600 mb-4">
              คุณตกลงว่าจะไม่ใช้บริการเพื่อ
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>ส่งสแปมหรือข้อความที่ผู้รับไม่ได้ขอ</li>
              <li>ทำผิดกฎหมายหรือข้อบังคับใด ๆ</li>
              <li>ละเมิดทรัพย์สินทางปัญญาของผู้อื่น</li>
              <li>เผยแพร่มัลแวร์หรือเนื้อหาที่เป็นอันตราย</li>
              <li>คุกคาม ล่วงละเมิด หรือทำร้ายผู้อื่น</li>
              <li>เก็บข้อมูลส่วนบุคคลโดยไม่ได้รับความยินยอม</li>
              <li>แอบอ้างเป็นผู้อื่นหรือให้ข้อมูลเท็จ</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">6. ความเป็นเจ้าของเนื้อหา</h2>
            <p className="text-gray-600 mb-4">
              เนื้อหาที่คุณสร้างในบริการยังเป็นของคุณ เมื่อใช้บริการ คุณอนุญาตให้บริการ
              จัดเก็บ ประมวลผล และแสดงเนื้อหานั้นเท่าที่จำเป็นต่อการให้บริการ
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">7. ความพร้อมของบริการ</h2>
            <p className="text-gray-600 mb-4">
              เราพยายามให้บริการใช้งานได้ตลอดเวลา แต่ไม่รับประกันว่าจะไม่มีการหยุดชะงัก
              และอาจปรับเปลี่ยน ระงับ หรือยุติบริการบางส่วนได้ทุกเมื่อ
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">8. ข้อจำกัดความรับผิด</h2>
            <p className="text-gray-600 mb-4">
              เท่าที่กฎหมายอนุญาต ผู้ให้บริการตอบไวไม่ต้องรับผิดต่อความเสียหายทางอ้อม
              ความเสียหายโดยบังเอิญ ความเสียหายพิเศษ หรือความเสียหายต่อเนื่องที่เกิดจากการใช้บริการ
              และความรับผิดรวมทั้งหมดจะไม่เกินจำนวนเงินที่คุณจ่ายค่าบริการในช่วง 12 เดือนที่ผ่านมา
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">9. การชดใช้ค่าเสียหาย</h2>
            <p className="text-gray-600 mb-4">
              คุณตกลงชดใช้และปกป้องผู้ให้บริการตอบไวจากข้อเรียกร้อง ความเสียหาย
              หรือค่าใช้จ่ายใด ๆ ที่เกิดจากการใช้บริการของคุณ หรือจากการละเมิดข้อตกลงนี้
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">10. การยกเลิกบัญชี</h2>
            <p className="text-gray-600 mb-4">
              เราอาจยกเลิกหรือระงับบัญชีของคุณได้ทุกเมื่อหากมีการละเมิดข้อตกลงนี้
              คุณเองก็ขอยกเลิกบัญชีได้ทุกเมื่อ เมื่อบัญชีถูกยกเลิก สิทธิ์ใช้บริการจะสิ้นสุดทันที
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">11. การแก้ไขข้อตกลง</h2>
            <p className="text-gray-600 mb-4">
              เราอาจแก้ไขข้อตกลงนี้ได้ทุกเมื่อ และจะแจ้งให้ทราบเมื่อมีการเปลี่ยนแปลงสำคัญ
              การใช้บริการต่อหลังการแก้ไขถือว่าคุณยอมรับข้อตกลงฉบับใหม่
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">12. กฎหมายที่ใช้บังคับ</h2>
            <p className="text-gray-600 mb-4">
              ข้อตกลงนี้อยู่ภายใต้และตีความตามกฎหมายของประเทศไทย
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">13. ติดต่อสอบถาม</h2>
            <p className="text-gray-600 mb-4">
              หากมีคำถามเกี่ยวกับข้อตกลงนี้ ติดต่อผู้ดูแลระบบของร้านที่คุณใช้งาน
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
