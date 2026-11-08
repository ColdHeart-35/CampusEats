'use client';

import { useAuthContext } from '@/lib/auth';

export const useAuth = () => {
  const context = useAuthContext();
  return {
    user: context.user,
    role: context.role,
    isAuthenticated: context.isAuthenticated,
    loading: context.loading,
    login: context.login,
    register: context.register,
    logout: context.logout,
    refreshUser: context.refreshUser,
  };
};

export default useAuth;
