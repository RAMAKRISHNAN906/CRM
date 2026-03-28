import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const navigate = useNavigate();
  const { user, accessToken, refreshToken, isAuthenticated, isLoading, setAuth, clearAuth, updateUser } = useAuthStore();

  const login = useCallback(async (email: string, password: string) => {
    const data = await authService.login({ email, password });
    setAuth(data.user, data.accessToken, data.refreshToken);
    toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
    navigate('/dashboard');
    return data;
  }, [setAuth, navigate]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await authService.register({ name, email, password });
    setAuth(data.user, data.accessToken, data.refreshToken);
    toast.success('Account created successfully!');
    navigate('/dashboard');
    return data;
  }, [setAuth, navigate]);

  const logout = useCallback(async () => {
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } catch { /* ignore */ }
    clearAuth();
    toast.success('Logged out successfully');
    navigate('/login');
  }, [refreshToken, clearAuth, navigate]);

  return { user, accessToken, isAuthenticated, isLoading, login, register, logout, updateUser };
};
