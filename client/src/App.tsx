import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/Layout/AppLayout';

// Pages
import LoginPage from '@/pages/Login';
import HomePage from '@/pages/Home';
import DashboardPage from '@/pages/Dashboard';
import AnalyticsPage from '@/pages/Analytics';
import StoragePage from '@/pages/Storage';
import AlertsPage from '@/pages/Alerts';
import EnvironmentalPage from '@/pages/Environmental';
import AdminPage from '@/pages/Admin';
import AboutPage from '@/pages/About';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* Protected — all authenticated users */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/storage" element={<StoragePage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/environmental" element={<EnvironmentalPage />} />
              <Route path="/about" element={<AboutPage />} />

              {/* Admin only */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
