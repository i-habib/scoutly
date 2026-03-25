import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useUserData } from '../hooks/useUserData'
import { ScoutFleurDeLis, CompassIcon, TentIcon, EagleIcon } from '../components/ScoutIcons'

export const Route = createFileRoute('/landing')({
  component: LandingPage,
})

function LandingPage() {
  const { userData, isLoading } = useUserData()
  const navigate = useNavigate()

  useEffect(() => {
    // If user data is loaded and a profile exists, redirect to the dashboard
    if (!isLoading && userData?.profile?.name) {
      navigate({ to: '/', replace: true })
    }
  }, [userData, isLoading, navigate])

  // While loading, show a blank page to avoid flicker
  if (isLoading || (!isLoading && userData?.profile?.name)) {
    return <div className="app-shell min-h-screen" />
  }

  return (
    <div className="app-shell">
      <div className="app-shell__grid" />
      <div className="app-shell__glow app-shell__glow--top" />
      <div className="app-shell__glow app-shell__glow--bottom" />

      <div className="app-shell__content flex min-h-screen flex-col items-center justify-center p-6">
        {/* Header */}
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-sky-600 shadow-[0_12px_24px_rgba(14,165,233,0.22)]">
              <ScoutFleurDeLis className="w-5 h-5 text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950">Scoutly</h1>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">AI planning for Scouts</p>
            </div>
          </div>
          <Link
            to={userData?.profile?.name ? '/' : '/onboarding'}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-700"
          >
            Get Started
          </Link>
        </header>

        {/* Hero Section */}
  <main className="flex grow flex-col items-center justify-center py-20 text-center">
          <div className="mb-5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Professional planning for the road to Eagle
          </div>
          <h2 className="mb-6 max-w-4xl text-5xl font-bold tracking-tight text-slate-950 md:text-7xl">
            Plan every badge, milestone, and deadline with confidence.
          </h2>
          <p className="mb-10 max-w-3xl text-lg leading-8 text-slate-600">
            Scoutly brings progress tracking, troop events, and AI-guided recommendations into one polished workspace so Scouts and families can stay organized on the path to Eagle.
          </p>

          <div className="app-surface app-surface--soft mb-10 rounded-[2rem] p-4 sm:p-6">
            <svg width="540" height="220" viewBox="0 0 540 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
              <rect x="0" y="0" width="540" height="220" rx="20" fill="url(#g)" opacity="0.12" />
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
              <g transform="translate(40,32)">
                <circle cx="60" cy="60" r="40" fill="#ecfdf5" stroke="#10B981" strokeWidth="3" />
                <path d="M120 20 L200 20 L230 90 L180 140 L100 140 L60 90 Z" fill="#ecfeff" stroke="#06B6D4" strokeWidth="3" opacity="0.9" />
                <g transform="translate(260,8)">
                  <rect x="0" y="0" width="160" height="120" rx="12" fill="#ffffff" stroke="#0ea5a5" strokeWidth="2" />
                  <path d="M14 28h132M14 52h132M14 76h80" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
                </g>
              </g>
            </svg>
          </div>

          <Link
            to={userData?.profile?.name ? '/' : '/onboarding'}
            className="rounded-2xl bg-linear-to-r from-emerald-600 to-sky-600 px-8 py-4 text-lg font-bold text-white shadow-[0_18px_40px_rgba(14,165,233,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(14,165,233,0.28)]"
          >
            Get Started Today
          </Link>
        </main>

        {/* Features Section */}
        <section className="mx-auto grid w-full max-w-6xl gap-8 text-left md:grid-cols-3">
          <FeatureCard
            icon={<CompassIcon className="w-6 h-6 text-emerald-600" size={24} />}
            title="AI-Powered Planning"
            description="Our AI coach analyzes your progress and generates a weekly action plan to keep you on track for your Eagle goal."
          />
          <FeatureCard
            icon={<TentIcon className="w-6 h-6 text-emerald-600" size={24} />}
            title="Smart Event Sync"
            description="Connect your troop calendar to get reminders and requirement suggestions tailored to upcoming campouts and meetings."
          />
          <FeatureCard
            icon={<EagleIcon className="w-6 h-6 text-emerald-600" size={24} />}
            title="Visual Progress Tracking"
            description="See your entire journey at a glance, from your next requirement to your final Eagle-required merit badge."
          />
        </section>

        {/* Footer */}
        <footer className="mx-auto mt-10 w-full max-w-6xl border-t border-slate-200 py-10 text-center">
          <p className="text-sm text-slate-500">Built by Scouts, for Scouts.</p>
        </footer>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="app-surface rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}
