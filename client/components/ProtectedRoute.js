import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useSelector(state => state.auth);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!loading && isAuthenticated && requiredRole && user.role !== requiredRole) {
      router.push('/');
    }
  }, [isAuthenticated, loading, user, requiredRole, router]);

  if (loading || !isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return children;
}
