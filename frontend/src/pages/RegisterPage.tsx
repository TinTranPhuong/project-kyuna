import { useState, useEffect, type FormEvent, type ChangeEvent, type FocusEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import type { AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth.service'

const INIT_FORM    = { username: '', email: '', password: '', confirmPassword: '' }
const INIT_TOUCHED = { username: false, email: false, password: false, confirmPassword: false }
const INIT_ERRORS  = { username: '', email: '', password: '', confirmPassword: '' }

export default function RegisterPage() {
  const navigate = useNavigate()

  // BUG 1 FIXED: use authStore.login (not setUser).
  // After register, the backend returns { user, access_token, refresh_token }.
  // setUser() only sets the user object — it discards both tokens, so the
  // axios interceptor has nothing to attach to subsequent requests → instant 401.
  const login = useAuthStore(state => state.login)

  const [formData, setFormData] = useState(INIT_FORM)
  const [touched,  setTouched]  = useState(INIT_TOUCHED)
  const [errors,   setErrors]   = useState(INIT_ERRORS)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError,  setApiError]  = useState('')

  // Real-time validation whenever field values or touched flags change
  useEffect(() => {
    const next = { ...INIT_ERRORS }

    if (touched.username) {
      if (formData.username.length < 3 || formData.username.length > 20) {
        next.username = 'Username must be 3–20 characters.'
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        next.username = 'Username can only contain letters, numbers, and underscores.'
      }
    }

    if (touched.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      next.email = 'Please enter a valid email address.'
    }

    if (touched.password) {
      if (formData.password.length < 8) {
        next.password = 'Password must be at least 8 characters.'
      } else if (!/\d/.test(formData.password)) {
        next.password = 'Password must contain at least one number.'
      }
    }

    if (touched.confirmPassword && formData.password !== formData.confirmPassword) {
      next.confirmPassword = 'Passwords do not match.'
    }

    setErrors(next)
  }, [formData, touched])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setTouched(prev  => ({ ...prev, [name]: true  }))
  }

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setApiError('')
    // Touch all fields to surface any un-touched validation errors
    setTouched({ username: true, email: true, password: true, confirmPassword: true })

    const hasErrors = Object.values(errors).some(err => err !== '')
    const allFilled = Object.values(formData).every(val => val.trim() !== '')
    if (hasErrors || !allFilled) return

    setIsLoading(true)
    try {
      // BUG 2 FIXED: authService.register takes THREE positional args
      // (username, email, password), NOT a single object. Passing an object
      // makes username receive the whole object and email/password = undefined
      // → 422 Unprocessable Entity on every registration attempt.
      const response = await authService.register(
        formData.username,
        formData.email,
        formData.password,
      )

      // BUG 1 CONTINUED: store user + both tokens, not just the user
      login(response.user, response.access_token, response.refresh_token)
      navigate('/', { replace: true })
    } catch (err) {
      // BUG 3 FIXED: err:any → typed AxiosError (ESLint no-explicit-any violation)
      // BUG 4 FIXED: FastAPI returns { detail: string }, NOT { message: string }
      const axiosErr = err as AxiosError<{ detail: string }>
      setApiError(
        axiosErr.response?.data?.detail ?? 'Registration failed. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const fields = [
    { id: 'username',        label: 'Username',         type: 'text',     autoComplete: 'username',     placeholder: 'johndoe123' },
    { id: 'email',           label: 'Email',            type: 'email',    autoComplete: 'email',        placeholder: 'name@example.com' },
    { id: 'password',        label: 'Password',         type: 'password', autoComplete: 'new-password', placeholder: '••••••••' },
    { id: 'confirmPassword', label: 'Confirm Password', type: 'password', autoComplete: 'new-password', placeholder: '••••••••' },
  ] as const

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold text-white mb-2">Create Account</h2>
        <p className="text-white/70">Join us and start your journey</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {apiError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-2 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{apiError}</p>
          </div>
        )}

        {fields.map(field => (
          <div key={field.id} className="space-y-1">
            <label className="text-sm font-medium text-white/90 ml-1" htmlFor={field.id}>
              {field.label}
            </label>
            <input
              id={field.id}
              name={field.id}
              type={field.type}
              autoComplete={field.autoComplete}
              value={formData[field.id]}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`glass-input ${errors[field.id] ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
              placeholder={field.placeholder}
              disabled={isLoading}
            />
            {errors[field.id] && (
              <p className="text-red-400 text-xs ml-1">{errors[field.id]}</p>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={isLoading || Object.values(errors).some(e => e !== '')}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Registering…
            </>
          ) : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/70">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
          Login here
        </Link>
      </div>
    </>
  )
}