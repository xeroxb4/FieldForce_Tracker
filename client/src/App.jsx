import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import OMRLayout from './pages/omr/OMRLayout';
import Dashboard from './pages/omr/Dashboard';
import LogShop from './pages/omr/LogShop';
import DayWrapUp from './pages/omr/DayWrapUp';
import OMRReports from './pages/omr/OMRReports';
import Outlets from './pages/omr/Outlets';
import Beats from './pages/omr/Beats';
import Owings from './pages/omr/Owings';
import MerchLayout from './pages/merchandiser/MerchLayout';
import MerchVisit from './pages/merchandiser/MerchVisit';
import MerchHistory from './pages/merchandiser/MerchHistory';
import AdminLayout from './pages/admin/AdminLayout';
import AdminReports from './pages/admin/AdminReports';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      {/* OMR Routes */}
      <Route
        path="/omr"
        element={
          <PrivateRoute roles={['omr', 'admin']}>
            <OMRLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="beats" element={<Beats />} />
        <Route path="log-shop" element={<LogShop />} />
        <Route path="wrap-up" element={<DayWrapUp />} />
        <Route path="owings" element={<Owings />} />
        <Route path="outlets" element={<Outlets />} />
        <Route path="reports" element={<OMRReports />} />
      </Route>

      {/* Merchandiser Routes */}
      <Route
        path="/merch"
        element={
          <PrivateRoute roles={['merchandiser', 'admin']}>
            <MerchLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="visit" replace />} />
        <Route path="visit" element={<MerchVisit />} />
        <Route path="history" element={<MerchHistory />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="reports" replace />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : user.role === 'omr' ? (
            <Navigate to="/omr" replace />
          ) : user.role === 'merchandiser' ? (
            <Navigate to="/merch" replace />
          ) : (
            <Navigate to="/admin" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
