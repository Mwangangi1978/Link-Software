import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  canAccess: boolean;
  fallback: ReactNode;
  children: ReactNode;
}

export function ProtectedRoute({ canAccess, fallback, children }: ProtectedRouteProps) {
  if (!canAccess) return <>{fallback}</>;
  return <>{children}</>;
}
