import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AppLayout from './components/layout/AppLayout';
import RoleRoute from './components/RoleRoute';
import { ToastProvider } from './components/ui/Toast';
import AdminApplicationDetailPage from './pages/admin/AdminApplicationDetailPage';
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage';
import LoginPage from './pages/LoginPage';
import NoAccessPage from './pages/NoAccessPage';
import TrainerClientDetailPage from './pages/trainer/TrainerClientDetailPage';
import TrainerDashboardPage from './pages/trainer/TrainerDashboardPage';



export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
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
