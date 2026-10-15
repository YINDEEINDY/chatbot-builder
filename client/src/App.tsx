import { useEffect, lazy, Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { AuthCallbackPage } from './pages/AuthCallback';
import { BotListPage } from './pages/BotList';
import { InboxPage } from './pages/InboxPage';
import { OverviewPage } from './pages/OverviewPage';

// Heavier / less-used screens load on demand (the flow editor pulls in xyflow, analytics pulls in recharts).
const FlowsPage = lazy(() => import('./pages/FlowsPage').then((m) => ({ default: m.FlowsPage })));
const FlowEditorPage = lazy(() => import('./pages/FlowEditorPage').then((m) => ({ default: m.FlowEditorPage })));
const AutoReplyPage = lazy(() => import('./pages/AutoReplyPage').then((m) => ({ default: m.AutoReplyPage })));
const ChannelsPage = lazy(() => import('./pages/ChannelsPage').then((m) => ({ default: m.ChannelsPage })));
const PeoplePage = lazy(() => import('./pages/PeoplePage').then((m) => ({ default: m.PeoplePage })));
const BroadcastListPage = lazy(() => import('./pages/BroadcastList').then((m) => ({ default: m.BroadcastListPage })));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage').then((m) => ({ default: m.AnalyzePage })));
const PagePostsPage = lazy(() => import('./pages/PagePostsPage').then((m) => ({ default: m.PagePostsPage })));
const GrowPage = lazy(() => import('./pages/GrowPage').then((m) => ({ default: m.GrowPage })));
const ConfigurePage = lazy(() => import('./pages/ConfigurePage').then((m) => ({ default: m.ConfigurePage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));

function Spinner() {
  return (
    <div className="flex h-dvh items-center justify-center bg-paper" role="status" aria-label="กำลังโหลด">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-jade-200 border-t-jade-600" />
    </div>
  );
}

function Private({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <Spinner />;
  return isAuthenticated ? <Suspense fallback={<Spinner />}>{children}</Suspense> : <Navigate to="/login" replace />;
}

function Public({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <Spinner />;
  return isAuthenticated ? <Navigate to="/bots" replace /> : <>{children}</>;
}

function ToInbox() {
  const { botId } = useParams();
  return <Navigate to={`/bots/${botId}/overview`} replace />;
}

const botPages: [string, React.ReactNode][] = [
  ['overview', <OverviewPage />],
  ['inbox', <InboxPage />],
  ['flows', <FlowsPage />],
  ['flows/:flowId', <FlowEditorPage />],
  ['auto-reply', <AutoReplyPage />],
  ['people', <PeoplePage />],
  ['channels', <ChannelsPage />],
  ['settings', <ConfigurePage />],
  ['broadcasts', <BroadcastListPage />],
  ['analyze', <AnalyzePage />],
  ['page-posts', <PagePostsPage />],
  ['grow', <GrowPage />],
];

// Data router (needed for useBlocker in the flow editor's unsaved-changes guard).
const router = createBrowserRouter(createRoutesFromElements(
  <>
    <Route path="/login" element={<Public><LoginPage /></Public>} />
    <Route path="/register" element={<Public><RegisterPage /></Public>} />
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route path="/privacy" element={<Suspense fallback={<Spinner />}><PrivacyPage /></Suspense>} />
    <Route path="/terms" element={<Suspense fallback={<Spinner />}><TermsPage /></Suspense>} />
    <Route path="/bots" element={<Private><BotListPage /></Private>} />
    <Route path="/bots/:botId" element={<ToInbox />} />
    {botPages.map(([path, el]) => <Route key={path} path={`/bots/:botId/${path}`} element={<Private>{el}</Private>} />)}
    <Route path="/profile" element={<Private><ProfilePage /></Private>} />
    <Route path="*" element={<Navigate to="/bots" replace />} />
  </>,
));

export default function App() {
  const { loadUser } = useAuthStore();
  useEffect(() => { loadUser(); }, [loadUser]);
  return <RouterProvider router={router} />;
}
