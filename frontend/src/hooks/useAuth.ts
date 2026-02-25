import { useAuthStore } from '@/store/authStore';

/**
 * Convenience hook for accessing the most commonly used authentication state and actions.
 * Use this in your components instead of importing the full authStore directly.
 */
export function useAuth() {
  return useAuthStore((state) => ({
    user: state.user,
    isLoggedIn: state.isLoggedIn,
    login: state.login,
    logout: state.logout,
  }));
}

export default useAuth;