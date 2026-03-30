import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, validateStoredToken } from './store';
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

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    validateStoredToken();
  }, []);

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
          path="user-console"
          element={<ProtectedRoute><UserConsole /></ProtectedRoute>}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
