import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { ScoutFleurDeLis } from '../components/ScoutIcons'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type Mode = 'signin' | 'signup'

function LoginPage() {
  const navigate = useNavigate()
  const { session, isAuthLoading, signIn, signUp, isSigningIn, isSigningUp } = useAuth()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthLoading && session) {
      navigate({ to: '/', replace: true })
    }
  }, [session, isAuthLoading, navigate])

  const toggleMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
    setError(null)
    setMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      if (mode === 'signup') {
        const response = await signUp({ email, password })
        if (response.emailConfirmationRequired) {
          setMessage('Check your inbox to confirm your email. Once verified, you can sign in!')
        } else if (response.user) {
          setMessage('Account created. Redirecting you to the dashboard...')
          navigate({ to: '/' })
        } else {
          setMessage('Account created. You can sign in now!')
        }
        setMode('signin')
      } else {
        await signIn({ email, password })
        navigate({ to: '/' })
      }
    } catch (err: any) {
      setError(err?.message ?? 'Authentication failed.')
    }
  }

  return (
    <div className="app-shell flex items-center justify-center px-4 py-12">
      <div className="app-shell__grid" />
      <div className="app-shell__glow app-shell__glow--top" />
      <div className="app-shell__glow app-shell__glow--bottom" />

      <div className="app-surface relative z-10 w-full max-w-lg rounded-2xl p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-800 text-white shadow-sm">
            <ScoutFleurDeLis size={28} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            {mode === 'signin' ? 'Welcome back to Scoutly' : 'Create your Scoutly account'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            {mode === 'signin'
              ? 'Sign in to sync your progress and open your planning workspace.'
              : 'Create an account to sync your progress securely across devices.'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-600">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400  outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-300"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-600">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400  outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-300"
              placeholder="Enter a strong password"
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-600">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400  outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-300"
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {(error || message) && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                error
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {error ?? message}
            </div>
          )}

          <button
            type="submit"
            disabled={mode === 'signin' ? isSigningIn : isSigningUp}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-stone-800 px-4 py-3 text-sm font-medium tracking-wide text-white shadow-sm transition hover:bg-stone-700  disabled:cursor-not-allowed disabled:opacity-70"
          >
            {mode === 'signin' ? (isSigningIn ? 'Signing In...' : 'Sign In') : (isSigningUp ? 'Creating Account...' : 'Create Account')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-stone-500">
          {mode === 'signin' ? (
            <>
              Need an account?
              <button type="button" onClick={toggleMode} className="ml-1 rounded-xl font-medium text-stone-700 hover:text-stone-600">
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?
              <button type="button" onClick={toggleMode} className="ml-1 rounded-xl font-medium text-stone-700 hover:text-stone-600">
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-stone-400">
          By continuing you agree to our{' '}
          <span className="font-medium text-stone-700">Terms</span> and <span className="font-medium text-stone-700">Privacy Policy</span>.
        </div>

        <div className="mt-8 text-center text-sm">
          <Link to="/" className="text-stone-500 transition hover:text-stone-900">
            ← Back to landing
          </Link>
        </div>
      </div>
    </div>
  )
}
