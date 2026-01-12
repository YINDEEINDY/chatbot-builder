import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';

// Pages
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { DashboardPage } from './pages/Dashboard';
import { BotListPage } from './pages/BotList';
import { BotDetailPage } from './pages/BotDetail';
import { FlowEditorPage } from './pages/FlowEditorPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Private routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/bots"
          element={
            <PrivateRoute>
              <BotListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/bots/:id"
          element={
            <PrivateRoute>
              <BotDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/bots/:botId/flows/:flowId"
          element={
            <PrivateRoute>
              <FlowEditorPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />

        {/* Redirect root to dashboard or login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                <p className="text-gray-500">Page not found</p>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
