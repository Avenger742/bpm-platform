import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/UI';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ('ADMIN' | 'OPERATOR' | 'GENERAL_USER')[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/home" replace />;

  return <>{children}</>;
}
