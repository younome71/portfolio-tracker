import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const router = useRouter();
  const { isAuthenticated, user, loading, hydrated } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (!hydrated || loading) return;

    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      router.replace('/');
    }
  }, [isAuthenticated, loading, hydrated, user, requiredRole, router]);

  if (!hydrated || loading || !isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return children;
}
