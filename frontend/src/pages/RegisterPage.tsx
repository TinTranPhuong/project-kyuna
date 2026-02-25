import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const newErrors = { username: '', email: '', password: '', confirmPassword: '' };

    if (touched.username) {
      if (formData.username.length < 3 || formData.username.length > 20) {
        newErrors.username = 'Username must be 3–20 characters.';
      } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
        newErrors.username = 'Username can only contain letters and numbers.';
      }
    }

    if (touched.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (touched.password) {
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters.';
      } else if (!/\d/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one number.';
      }
    }

    if (touched.confirmPassword || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(newErrors);
  }, [formData, touched]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');

    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    const hasErrors = Object.values(errors).some((err) => err !== '');
    const isReady = Object.values(formData).every((val) => val.trim() !== '');
    
    if (hasErrors || !isReady) return;

    setIsLoading(true);

    try {
      const user = await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      
      setUser(user);
      navigate('/', { replace: true });
      
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold text-white mb-2">Create Account</h2>
        <p className="text-white/70">Join us and start your journey</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {apiError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-2 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-white/90 ml-1" htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`glass-input ${errors.username ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
            placeholder="johndoe123"
            disabled={isLoading}
          />
          {errors.username && <p className="text-red-400 text-xs ml-1">{errors.username}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-white/90 ml-1" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`glass-input ${errors.email ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
            placeholder="name@example.com"
            disabled={isLoading}
          />
          {errors.email && <p className="text-red-400 text-xs ml-1">{errors.email}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-white/90 ml-1" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`glass-input ${errors.password ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
            placeholder="••••••••"
            disabled={isLoading}
          />
          {errors.password && <p className="text-red-400 text-xs ml-1">{errors.password}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-white/90 ml-1" htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`glass-input ${errors.confirmPassword ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
            placeholder="••••••••"
            disabled={isLoading}
          />
          {errors.confirmPassword && <p className="text-red-400 text-xs ml-1">{errors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || Object.values(errors).some(err => err !== '')}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Registering...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/70">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
          Login here
        </Link>
      </div>
    </>
  );
}