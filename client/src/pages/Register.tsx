import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { AuthShell } from '../components/layout/AuthShell';
import { Field, Notice, inputCls, btnPrimary } from '../components/ui/kit';
import { errorText } from '../api/replies';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('รหัสผ่านสองช่องไม่ตรงกัน');
    if (password.length < 8) return setError('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/bots');
    } catch (err) {
      setError(errorText(err, 'สมัครไม่สำเร็จ ลองอีกครั้ง'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="สมัครใช้งาน" sub="ใช้เวลาไม่ถึงนาที แล้วสร้างร้านแรกได้เลย">
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      <form onSubmit={submit} className="space-y-4">
        <Field label="ชื่อของคุณ" hint="ลูกค้าไม่เห็นชื่อนี้ ใช้แสดงในทีมของคุณ">
          <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={100} />
        </Field>
        <Field label="อีเมล">
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="รหัสผ่าน" hint="อย่างน้อย 8 ตัวอักษร">
          <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </Field>
        <Field label="ยืนยันรหัสผ่าน">
          <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
        </Field>
        <button disabled={loading} className={`${btnPrimary} w-full py-2.5`}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}สมัครใช้งาน</button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-soft">มีบัญชีแล้ว <Link to="/login" className="font-medium text-jade-700 hover:underline">เข้าสู่ระบบ</Link></p>
    </AuthShell>
  );
}
