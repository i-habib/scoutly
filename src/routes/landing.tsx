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
    return <div className="bg-black min-h-screen" />
  }

  return (
    <div className="bg-black text-white min-h-screen overflow-hidden">
      {/* Dotted Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      {/* Gradient Glow */}
      <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s]" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        {/* Header */}
        <header className="w-full max-w-6xl mx-auto flex justify-between items-center py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-green-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <ScoutFleurDeLis className="w-5 h-5 text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold">Scoutly</h1>
          </div>
          <Link
            to={userData?.profile?.name ? '/' : '/onboarding'}
            className="px-4 py-2 text-sm font-semibold bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
          >
            Get Started
          </Link>
        </header>

        {/* Hero Section */}
        <main className="flex-grow flex flex-col items-center justify-center text-center py-20">
          <div className="bg-green-500/20 text-green-300 text-xs font-medium px-3 py-1 rounded-full mb-4 border border-green-500/50">
            Your AI-Powered Path to Eagle Scout
          </div>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Never Miss a Step</h2>
          <p className="max-w-2xl text-lg text-slate-400 mb-8">
            Scoutly is the ultimate planning tool for Scouts. It combines your
            progress, troop schedule, and AI insights to create a personalized
            roadmap to Eagle.
          </p>

          {/* Simple inline SVG illustration to give the hero some personality */}
          <div className="mb-8">
            <svg width="540" height="220" viewBox="0 0 540 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
              <rect x="0" y="0" width="540" height="220" rx="20" fill="url(#g)" opacity="0.06" />
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
              <g transform="translate(40,32)">
                <circle cx="60" cy="60" r="40" fill="#052e19" stroke="#10B981" strokeWidth="3" />
                <path d="M120 20 L200 20 L230 90 L180 140 L100 140 L60 90 Z" fill="#042f3a" stroke="#06B6D4" strokeWidth="3" opacity="0.9" />
                <g transform="translate(260,8)">
                  <rect x="0" y="0" width="160" height="120" rx="12" fill="#07121a" stroke="#0ea5a5" strokeWidth="2" />
                  <path d="M14 28h132M14 52h132M14 76h80" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                </g>
              </g>
            </svg>
          </div>

          <Link
            to={userData?.profile?.name ? '/' : '/onboarding'}
            className="bg-gradient-to-r from-green-400 to-cyan-500 text-black font-bold text-lg px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(45,212,191,0.5)] hover:shadow-[0_0_30px_rgba(45,212,191,0.7)] transition-shadow duration-300"
          >
            Get Started Today
          </Link>
        </main>

        {/* Features Section */}
        <section className="w-full max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-left">
          <FeatureCard
            icon={<CompassIcon className="w-6 h-6 text-green-400" size={24} />}
            title="AI-Powered Planning"
            description="Our AI coach analyzes your progress and generates a weekly action plan to keep you on track for your Eagle goal."
          />
          <FeatureCard
            icon={<TentIcon className="w-6 h-6 text-green-400" size={24} />}
            title="Smart Event Sync"
            description="Connect your troop calendar to get reminders and requirement suggestions tailored to upcoming campouts and meetings."
          />
          <FeatureCard
            icon={<EagleIcon className="w-6 h-6 text-green-400" size={24} />}
            title="Visual Progress Tracking"
            description="See your entire journey at a glance, from your next requirement to your final Eagle-required merit badge."
          />
        </section>

        {/* Footer */}
        <footer className="w-full max-w-6xl mx-auto text-center py-10 mt-10 border-t border-white/10">
          <p className="text-slate-500 text-sm">Built by Scouts, for Scouts.</p>
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
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  )
}

