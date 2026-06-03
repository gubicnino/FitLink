import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AppLayout from './components/layout/AppLayout';
import RoleRoute from './components/RoleRoute';
import { ToastProvider } from './components/ui/Toast';
import { useAuth } from './context/AuthContext';
import AdminApplicationDetailPage from './pages/admin/AdminApplicationDetailPage';
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage';
import LoginPage from './pages/LoginPage';
import NoAccessPage from './pages/NoAccessPage';
import TrainerClientDetailPage from './pages/trainer/TrainerClientDetailPage';
import TrainerDashboardPage from './pages/trainer/TrainerDashboardPage';


function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'TRAINER') return <Navigate to="/trainer" replace />;
  return <Navigate to="/no-access" replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        {/* Alias used by sosolec's LoginPage on email-login success */}
        <Route path="/home" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/no-access" element={<NoAccessPage />} />

        {/* Admin area */}
        <Route
          element={
            <RoleRoute allow="ADMIN">
              <AppLayout />
            </RoleRoute>
          }
        >
          <Route path="/admin" element={<AdminApplicationsPage />} />
          <Route path="/admin/applications/:id" element={<AdminApplicationDetailPage />} />
        </Route>

        {/* Trainer area */}
        <Route
          element={
            <RoleRoute allow="TRAINER">
              <AppLayout />
            </RoleRoute>
          }
        >
          <Route path="/trainer" element={<TrainerDashboardPage />} />
          <Route path="/trainer/clients/:traineeId" element={<TrainerClientDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
