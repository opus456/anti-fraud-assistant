import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, validateStoredToken } from './store';
import { useModeStore } from './store/modeStore';
import { initializeSettings } from './store/settingsStore';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Detection from './pages/Detection';
import History from './pages/History';
import Monitor from './pages/Monitor';
import UserConsole from './pages/UserConsole';
import GuardianDashboard from './pages/GuardianDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Visualization from './pages/Visualization';
import Knowledge from './pages/Knowledge';
import Profile from './pages/Profile';
import Guardians from './pages/Guardians';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import SmsInbox from './pages/SmsInbox';
import Settings from './pages/Settings';
import Family from './pages/Family';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuthStore();
  const { setMode } = useModeStore();
  
  useEffect(() => {
    // 验证存储的 token
    validateStoredToken();
    // 初始化设置（主题、字体等）
    initializeSettings();
  }, []);
  
  // 当用户信息变化时，根据 role_type 校验模式
  useEffect(() => {
    if (user?.role_type) {
      // 只在首次加载或用户变化时自动设置模式
      // 如果用户手动切换过模式，则保持用户选择
      const storedMode = localStorage.getItem('anti-fraud-mode');
      const isFirstLoad = !storedMode || storedMode === '{}';
      
      if (isFirstLoad) {
        if (user.role_type === 'elderly') {
          setMode('elder');
        } else if (user.role_type === 'student') {
          setMode('minor');
        }
      }
    }
  }, [user?.role_type, user?.id, setMode]);

  return (
    <Routes>
      {/* Auth pages - no layout */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected standalone pages */}
      <Route
        path="/guardian-dashboard"
        element={
          <ProtectedRoute roles={['guardian', 'admin']}>
            <GuardianDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Layout-wrapped pages */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="detection" element={<Detection />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="visualization" element={<Visualization />} />
        <Route
          path="monitor"
          element={<ProtectedRoute><Monitor /></ProtectedRoute>}
        />
        <Route
          path="history"
          element={<ProtectedRoute><History /></ProtectedRoute>}
        />
        <Route
          path="alerts"
          element={<ProtectedRoute><Alerts /></ProtectedRoute>}
        />
        <Route
          path="sms-inbox"
          element={<ProtectedRoute><SmsInbox /></ProtectedRoute>}
        />
        <Route
          path="guardians"
          element={<ProtectedRoute><Guardians /></ProtectedRoute>}
        />
        <Route
          path="reports"
          element={<ProtectedRoute><Reports /></ProtectedRoute>}
        />
        <Route
          path="profile"
          element={<ProtectedRoute><Profile /></ProtectedRoute>}
        />
        <Route
          path="settings"
          element={<ProtectedRoute><Settings /></ProtectedRoute>}
        />
        <Route
          path="family"
          element={<ProtectedRoute><Family /></ProtectedRoute>}
        />
        <Route
          path="user-console"
          element={<ProtectedRoute><UserConsole /></ProtectedRoute>}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
