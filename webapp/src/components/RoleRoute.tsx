import { type JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/types';

interface RoleRouteProps {
  allow: UserRole | UserRole[];
  children: JSX.Element;
}


export default function RoleRoute({ allow, children }: RoleRouteProps) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const allowed = Array.isArray(allow) ? allow : [allow];
  if (allowed.includes(user.role)) return children;

  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'TRAINER') return <Navigate to="/trainer" replace />;
  return <Navigate to="/no-access" replace />;
}
