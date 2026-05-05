import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import {
  ArrowRight,
  CalendarRange,
  Route as RouteIcon,
  ShieldCheck,
} from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { ScoutFleurDeLis } from '../components/ScoutIcons';
import { PageSkeleton } from '../components/SkeletonLoader';
import { isOnboardingComplete, needsOnboarding } from '../lib/onboarding';

export const Route = createFileRoute('/landing')({
  component: LandingPage,
});

function LandingPage() {
  const { userData, isLoading } = useUserData();
  const navigate = useNavigate();
  const onboardingComplete = isOnboardingComplete(userData);

  useEffect(() => {
    if (!isLoading && userData && onboardingComplete) {
      navigate({ to: '/', replace: true });
    }
  }, [userData, isLoading, navigate, onboardingComplete]);

  if (isLoading || (!isLoading && userData && onboardingComplete)) {
    return <PageSkeleton />;
  }

  const entryRoute = needsOnboarding(userData) ? '/onboarding' : '/';

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      <div className="app-shell__content mx-auto max-w-6xl px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                <ScoutFleurDeLis className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-800">Scoutly</p>
                <p className="text-xs text-stone-400">Eagle planning workspace</p>
              </div>
            </div>

            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-stone-900 md:text-5xl">
              Track rank progress, merit badges, and troop events in one place.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-500">
              Built for Scouts and families who need a straightforward system for planning the path to Eagle.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to={entryRoute}
                preload="intent"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-800 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                Open Workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/merit-badges"
                preload="intent"
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
              >
                Browse Merit Badges
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800">Core functions</h2>
            <div className="mt-4 space-y-3">
              <PreviewRow
                icon={<RouteIcon className="h-5 w-5" />}
                title="Timeline planning"
                description="See milestone dates, phase pacing, and what needs to be done next."
              />
              <PreviewRow
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Merit badge tracking"
                description="Review Eagle-required progress and manage badge completion status."
              />
              <PreviewRow
                icon={<CalendarRange className="h-5 w-5" />}
                title="Event coordination"
                description="Use meetings, campouts, and service events to guide requirement planning."
              />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="Planning" value="Direct" detail="Focused on requirements, dates, and progress." />
          <MetricCard label="Interface" value="Clean" detail="Reduced visual noise and simplified actions." />
          <MetricCard label="Use case" value="Practical" detail="Built to support real Scout advancement work." />
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-stone-800">{value}</div>
      <div className="mt-2 text-sm leading-6 text-stone-500">{detail}</div>
    </div>
  );
}

function PreviewRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-stone-800">{title}</h3>
          <p className="text-sm leading-6 text-stone-500">{description}</p>
        </div>
      </div>
    </div>
  );
}
