import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { AuthShell } from '../components/layout/AuthShell';
import { Field, Notice, inputCls, btnPrimary } from '../components/ui/kit';
import { errorText } from '../api/replies';

export const FACEBOOK_LOGIN = import.meta.env.VITE_FACEBOOK_LOGIN !== 'false';

export const FacebookIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const { login, loginWithFacebook } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const e = params.get('error');
    if (e) setError(decodeURIComponent(e));
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate('/bots');
    } catch (err) {
      setError(errorText(err, 'เข้าสู่ระบบไม่สำเร็จ ตรวจอีเมลและรหัสผ่านอีกครั้ง'));
    } finally {
      setLoading(false);
    }
  };

  const facebook = async () => {
    setError('');
    setFbLoading(true);
    try { await loginWithFacebook(); }
    catch (err) { setError(errorText(err, 'เข้าสู่ระบบด้วย Facebook ไม่สำเร็จ')); setFbLoading(false); }
  };

  return (
    <AuthShell title="เข้าสู่ระบบ" sub="กลับมาตอบลูกค้าต่อจากที่ค้างไว้">
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      <form onSubmit={submit} className="space-y-4">
        <Field label="อีเมล">
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
        </Field>
        <Field label="รหัสผ่าน">
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 accent-jade-600" />
          จำไว้ในเครื่องนี้ 30 วัน
        </label>
        <button disabled={loading} className={`${btnPrimary} w-full py-2.5`}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}เข้าสู่ระบบ</button>
      </form>

      {FACEBOOK_LOGIN && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-ink-soft"><span className="h-px flex-1 bg-line" />หรือ<span className="h-px flex-1 bg-line" /></div>
          <button type="button" onClick={facebook} disabled={fbLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] py-2.5 text-sm font-medium text-white hover:bg-[#166FE5] disabled:opacity-60">
            {fbLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FacebookIcon />}เข้าสู่ระบบด้วย Facebook
          </button>
        </>
      )}

      <p className="mt-8 text-center text-sm text-ink-soft">ยังไม่มีบัญชี <Link to="/register" className="font-medium text-jade-700 hover:underline">สมัครใช้งาน</Link></p>
    </AuthShell>
  );
}
