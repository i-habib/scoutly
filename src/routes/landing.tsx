import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CalendarDays, Check, CircleDot, Compass, Flag, MapPinned } from 'lucide-react'
import { ScoutFleurDeLis } from '../components/ScoutIcons'

export const Route = createFileRoute('/landing')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f4f5ef] text-[#13241d]">
      <div className="mx-auto max-w-6xl px-5 py-5 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2.5" aria-label="ScoutingIQ home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#13241d] text-[#f6cf61]"><ScoutFleurDeLis className="h-5 w-5" /></span>
            <span className="text-lg font-extrabold tracking-[-0.045em]">ScoutingIQ</span>
          </Link>
          <Link to="/onboarding" className="rounded-lg border border-[#c5cdc0] bg-white px-4 py-2 text-sm font-bold transition hover:border-[#13241d]">
            Open my plan
          </Link>
        </nav>

        <section className="grid gap-12 pb-20 pt-16 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:pt-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#dce7d5] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#365843]">
              <Compass className="h-3.5 w-3.5" /> Built for the road to Eagle
            </p>
            <h1 className="mt-6 text-5xl font-extrabold leading-[0.98] tracking-[-0.065em] text-[#13241d] sm:text-6xl lg:text-7xl">
              Know what to do before the next troop meeting.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#486056] sm:text-xl">
              ScoutingIQ turns rank work, merit badges, campouts, and target dates into one practical plan your Scout can act on this week.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/onboarding" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#13241d] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#244232]">
                Build my Scout’s plan <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-sm leading-6 text-[#5b7066]">Start with a name, rank, and troop schedule. Save it securely as you go.</p>
            </div>
          </div>

          <WeeklyPlan />
        </section>
      </div>

      <section className="border-y border-[#d6ddd1] bg-white">
        <div className="mx-auto grid max-w-6xl divide-y divide-[#dfe5db] px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-10">
          <Outcome icon={<CircleDot />} title="A real next step" text="See the rank item or badge requirement that is most useful to finish next." />
          <Outcome icon={<CalendarDays />} title="A plan that uses troop life" text="Connect meetings, campouts, and service projects to advancement instead of planning around them." />
          <Outcome icon={<Flag />} title="A pace you can trust" text="Spot when a target date needs attention before it becomes a last-minute scramble." />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#557d5c]">Five minutes to a useful plan</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.055em] sm:text-5xl">Less tracking. Better decisions.</h2>
          </div>
          <ol className="space-y-5">
            <PlanStep number="01" title="Tell us where your Scout is now" text="Add their current rank and the date they want to reach Eagle." />
            <PlanStep number="02" title="Add the rhythm your troop already has" text="Meetings, campouts, and service are the raw material for a realistic plan." />
            <PlanStep number="03" title="Use the plan at home and at the meeting" text="Open one clear view of what is done, what is in motion, and what comes next." />
          </ol>
        </div>
      </section>

      <section className="bg-[#13241d] px-5 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b9dc98]">Ready when your Scout is</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.05em]">Make the next step obvious.</h2>
          </div>
          <Link to="/onboarding" className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#d6efad] px-5 py-3.5 text-sm font-extrabold text-[#13241d] transition hover:bg-[#e4f7c6]">
            Start onboarding <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}

function WeeklyPlan() {
  return (
    <section className="rounded-2xl border border-[#c9d3c4] bg-white p-4 shadow-[0_24px_60px_rgba(25,48,37,0.14)] sm:p-5" aria-label="Example weekly plan">
      <div className="flex items-center justify-between border-b border-[#e3e8df] pb-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#708277]">This week</p><h2 className="mt-1 text-xl font-extrabold">A plan with context</h2></div>
        <span className="rounded-full bg-[#eaf3e3] px-3 py-1 text-xs font-extrabold text-[#3e6a48]">On track</span>
      </div>
      <div className="mt-4 space-y-3">
        <PlanCard time="Tue" title="Troop meeting" text="Bring your map and compass for First Class 4a." tone="green" />
        <PlanCard time="Sat" title="Campout" text="Use the weekend to make progress on Camping and Cooking." tone="gold" />
        <PlanCard time="Sun" title="Ten-minute check-in" text="Mark what was signed off and choose the next move." tone="slate" />
      </div>
      <div className="mt-5 rounded-xl bg-[#f3f6f0] p-4">
        <div className="flex items-center gap-2 text-sm font-extrabold"><MapPinned className="h-4 w-4 text-[#4f8356]" /> What this protects</div>
        <p className="mt-2 text-sm leading-6 text-[#597065]">Your Scout keeps moving without losing sight of long-term requirements and dates.</p>
      </div>
    </section>
  )
}

function PlanCard({ time, title, text, tone }: { time: string; title: string; text: string; tone: 'green' | 'gold' | 'slate' }) {
  const toneClass = { green: 'bg-[#eaf3e3] text-[#3e6a48]', gold: 'bg-[#fff2cf] text-[#9a671a]', slate: 'bg-[#edf0ed] text-[#526158]' }[tone]
  return <article className="flex gap-3 rounded-xl border border-[#e0e6dc] p-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${toneClass}`}>{time}</span><div><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-1 text-sm leading-5 text-[#5d7066]">{text}</p></div></article>
}

function Outcome({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="p-7"><span className="text-[#527a58] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><h2 className="mt-5 text-lg font-extrabold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#5a6d63]">{text}</p></article>
}

function PlanStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <li className="grid grid-cols-[3.5rem_1fr] gap-4 border-b border-[#d7dfd2] pb-5 last:border-0"><span className="text-xl font-extrabold text-[#5d8a5f]">{number}</span><div><h3 className="text-xl font-extrabold">{title}</h3><p className="mt-2 leading-7 text-[#5b6d63]">{text}</p></div></li>
}
