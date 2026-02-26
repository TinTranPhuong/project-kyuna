import { useState, type FormEvent } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import type { AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth.service'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // BUG 1 FIXED: use authStore.login (not setUser).
  // setUser only sets the user object — it never stores the access/refresh tokens,
  // so the axios interceptor has nothing to send and every protected API call
  // immediately fails with 401. login() stores user + both tokens atomically.
  const login = useAuthStore(state => state.login)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiError,  setApiError]  = useState('')
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {}
    if (!email.includes('@'))    errors.email    = 'Please enter a valid email address.'
    if (password.length < 8)    errors.password = 'Password must be at least 8 characters long.'
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setApiError('')
    if (!validateForm()) return

    setIsLoading(true)
    try {
      // BUG 2 FIXED: authService.login takes two positional args (email, password),
      // NOT a single object. Calling it as login({ email, password }) passes an
      // object as the first arg and leaves password undefined → 422 every time.
      const response = await authService.login(email, password)

      // BUG 1 CONTINUED: login() expects (user, access_token, refresh_token)
      login(response.user, response.access_token, response.refresh_token)

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'
      navigate(from, { replace: true })
    } catch (err) {
      // BUG 3 FIXED: err:any → typed AxiosError. err:any bypasses ESLint no-explicit-any.
      // BUG 4 FIXED: FastAPI returns { detail: string }, NOT { message: string }.
      // err.response?.data?.message is always undefined — the error banner never shows.
      const axiosErr = err as AxiosError<{ detail: string }>
      setApiError(
        axiosErr.response?.data?.detail ?? 'Invalid email or password. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-white/70">Sign in to continue to your dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {apiError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-2 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{apiError}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-white/90 ml-1" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
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
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
              Signing in…
            </>
          ) : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/70">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
          Register here
        </Link>
      </div>
    </>
  )
}