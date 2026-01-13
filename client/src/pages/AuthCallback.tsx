import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { Card, CardContent } from '../components/ui/Card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(decodeURIComponent(error));
        setTimeout(() => {
          navigate('/login?error=' + encodeURIComponent(error));
        }, 2000);
        return;
      }

      if (!token) {
        setStatus('error');
        setErrorMessage('No authentication token received');
        setTimeout(() => {
          navigate('/login?error=No authentication token received');
        }, 2000);
        return;
      }

      try {
        await setToken(token);
        setStatus('success');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed');
        setTimeout(() => {
          navigate('/login?error=Authentication failed');
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, setToken, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Signing you in...</h2>
              <p className="text-gray-500">Please wait while we complete your login.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Login successful!</h2>
              <p className="text-gray-500">Redirecting to dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Login failed</h2>
              <p className="text-gray-500">{errorMessage}</p>
              <p className="text-sm text-gray-400 mt-2">Redirecting back to login...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
