import { useState, FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [apiError, setApiError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    let isValid = true;

    if (!email.includes('@')) {
      errors.email = 'Please enter a valid email address.';
      isValid = false;
    }
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(''); 

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const user = await authService.login({ email, password });
      setUser(user);

      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
      
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-white/70">Sign in to continue to your dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {apiError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-2 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-white/90 ml-1" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`glass-input ${validationErrors.email ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
            placeholder="name@example.com"
            disabled={isLoading}
          />
          {validationErrors.email && (
            <p className="text-red-400 text-xs ml-1 mt-1">{validationErrors.email}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-white/90 ml-1" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`glass-input ${validationErrors.password ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
            placeholder="••••••••"
            disabled={isLoading}
          />
          {validationErrors.password && (
            <p className="text-red-400 text-xs ml-1 mt-1">{validationErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/70">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
          Register here
        </Link>
      </div>
    </>
  );
}