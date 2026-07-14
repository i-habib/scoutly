import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Award,
  CalendarDays,
  CircleDot,
  Compass,
  Flag,
  Route as RouteIcon,
} from 'lucide-react'
import { ScoutFleurDeLis } from '../components/ScoutIcons'

export const Route = createFileRoute('/landing')({
  component: LandingPage,
})

const LOCAL_USER_DATA_KEY = 'scoutly_user_data'

const HIGHLIGHTS = [
  { icon: RouteIcon, label: 'Rank requirements in order' },
  { icon: Award, label: 'Merit badge progress' },
  { icon: CalendarDays, label: 'Troop meetings & campouts' },
]

export function LandingPage({
  dashboardHref = '/',
  onboardingHref = '/onboarding',
  homeHref = '/landing',
}: {
  dashboardHref?: string
  onboardingHref?: string
  homeHref?: string
}) {
  return (
    <div className="landing-page min-h-screen">
      <div className="landing-hero__topography border-b border-[var(--lp-line)]">
        <div className="mx-auto max-w-6xl px-5 py-5 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between gap-4">
            <a href={homeHref} className="flex min-w-0 items-center gap-3" aria-label="ScoutingIQ home">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-sm"
                style={{ background: 'var(--lp-brand)', color: 'var(--lp-gold-soft)' }}
              >
                <ScoutFleurDeLis size={22} />
              </span>
              <span className="min-w-0">
                <span className="block text-xl font-semibold tracking-tight" style={{ color: 'var(--lp-ink)' }}>
                  ScoutingIQ
                </span>
                <span className="block text-xs font-medium" style={{ color: 'var(--lp-muted)' }}>
                  Eagle advancement planner
                </span>
              </span>
            </a>
            <LandingPlanLink
              dashboardHref={dashboardHref}
              onboardingHref={onboardingHref}
              className="landing-btn-secondary shrink-0"
            />
          </nav>

          <section className="landing-hero" aria-labelledby="landing-hero-title">
            <p className="landing-eyebrow">
              <Compass className="h-3.5 w-3.5" /> Built for the road to Eagle
            </p>
            <h1 id="landing-hero-title" className="landing-hero__title mt-8">
              <span className="landing-hero__title-line">Know what to do</span>
              <span className="landing-hero__title-line landing-hero__title-accent">
                before the next troop meeting.
              </span>
            </h1>
            <p className="landing-hero__lead">
              ScoutingIQ turns rank work, merit badges, campouts, and target dates into one practical plan your Scout can act on this week.
            </p>
            <div className="landing-hero__actions">
              <a href={onboardingHref} className="landing-btn-primary landing-btn-primary--large">
                Start your journey <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="landing-hero__highlights" aria-label="What ScoutingIQ covers">
              {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                <div key={label} className="landing-hero__highlight">
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="border-b border-[var(--lp-line)]" style={{ background: 'var(--lp-surface)' }}>
        <div className="mx-auto grid max-w-6xl divide-y divide-[var(--lp-line)] px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-10">
          <Outcome icon={<CircleDot />} title="A real next step" text="See the rank item or badge requirement that is most useful to finish next." />
          <Outcome icon={<CalendarDays />} title="A plan that uses troop life" text="Connect meetings, campouts, and service projects to advancement instead of planning around them." />
          <Outcome icon={<Flag />} title="A pace you can trust" text="Spot when a target date needs attention before it becomes a last-minute scramble." />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="landing-section-label">Five minutes to a useful plan</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: 'var(--lp-ink)' }}>
              Less tracking. Better decisions.
            </h2>
          </div>
          <ol className="space-y-5">
            <PlanStep number="01" title="Tell us where your Scout is now" text="Add their current rank and the date they want to reach Eagle." />
            <PlanStep number="02" title="Add the rhythm your troop already has" text="Meetings, campouts, and service are the raw material for a realistic plan." />
            <PlanStep number="03" title="Use the plan at home and at the meeting" text="Open one clear view of what is done, what is in motion, and what comes next." />
          </ol>
        </div>
      </section>

      <section
        className="border-t border-[color-mix(in_srgb,var(--lp-brand)_40%,transparent)] px-5 py-16 text-white sm:px-8 lg:px-10"
        style={{ background: 'var(--lp-brand)' }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p
              className="landing-section-label"
              style={{ color: 'color-mix(in srgb, var(--lp-gold-soft) 75%, white)' }}
            >
              Ready when your Scout is
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Make the next step obvious.</h2>
          </div>
          <a href={onboardingHref} className="landing-btn-accent w-fit">
            Start onboarding <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  )
}

function LandingPlanLink({
  dashboardHref,
  onboardingHref,
  className,
}: {
  dashboardHref: string
  onboardingHref: string
  className: string
}) {
  const [isReady, setIsReady] = useState(false)
  const [hasLocalPlan, setHasLocalPlan] = useState(false)

  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_USER_DATA_KEY)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData) as { profile?: { hasCompletedOnboarding?: boolean } }
        setHasLocalPlan(parsed.profile?.hasCompletedOnboarding === true)
      } catch {
        setHasLocalPlan(false)
      }
    }
    setIsReady(true)
  }, [])

  const href = isReady && hasLocalPlan ? dashboardHref : onboardingHref
  return (
    <a href={href} className={className} aria-busy={!isReady}>
      {isReady && hasLocalPlan ? 'Open Dashboard' : 'Start your journey'}
    </a>
  )
}

function Outcome({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="p-7">
      <span className="landing-icon-badge">{icon}</span>
      <h2 className="mt-5 text-lg font-semibold" style={{ color: 'var(--lp-ink)' }}>{title}</h2>
      <p className="mt-2 text-sm leading-6" style={{ color: 'var(--lp-body)' }}>{text}</p>
    </article>
  )
}

function PlanStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <li className="grid grid-cols-[3.5rem_1fr] gap-4 border-b border-[var(--lp-line)] pb-5 last:border-0">
      <span className="text-xl font-semibold" style={{ color: 'var(--lp-gold)' }}>{number}</span>
      <div>
        <h3 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--lp-ink)' }}>{title}</h3>
        <p className="mt-2 leading-7" style={{ color: 'var(--lp-body)' }}>{text}</p>
      </div>
    </li>
  )
}
