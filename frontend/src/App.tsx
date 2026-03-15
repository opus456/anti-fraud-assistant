import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { validateStoredToken, useAuthStore } from './store';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Detection from './pages/Detection';
import History from './pages/History';
import Knowledge from './pages/Knowledge';
import Visualization from './pages/Visualization';
import Profile from './pages/Profile';
import Guardians from './pages/Guardians';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Monitor from './pages/Monitor';
import GuardianPortal from './pages/GuardianPortal';

function Protected({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function ProtectedGuardian({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login?mode=guardian" replace />;
  }
  return children;
}

export default function App() {
  // 应用启动时验证 token 有效性
  useEffect(() => { validateStoredToken(); }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/guardian-portal" element={<ProtectedGuardian><GuardianPortal /></ProtectedGuardian>} />
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/monitor" element={<Monitor />} />
              <Route path="/detection" element={<Detection />} />
              <Route path="/knowledge" element={<Knowledge />} />
              <Route path="/visualization" element={<Visualization />} />
              <Route path="/history" element={<Protected><History /></Protected>} />
              <Route path="/profile" element={<Protected><Profile /></Protected>} />
              <Route path="/guardians" element={<Protected><Guardians /></Protected>} />
              <Route path="/reports" element={<Protected><Reports /></Protected>} />
              <Route path="/alerts" element={<Protected><Alerts /></Protected>} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}
