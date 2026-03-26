import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import {
  Award,
  CalendarRange,
  LayoutDashboard,
  Menu,
  Route,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ScoutFleurDeLis } from './ScoutIcons';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/timeline', label: 'Timeline', icon: Route },
  { to: '/advancement', label: 'Advancement', icon: Award },
  { to: '/merit-badges/', label: 'Merit Badges', icon: ShieldCheck },
  { to: '/events', label: 'Events', icon: CalendarRange },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navBaseClass =
    'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900';
  const navActiveClass =
    'group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_8px_18px_rgba(24,35,47,0.06)]';

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/92 px-4 py-3 text-slate-900 shadow-[0_8px_24px_rgba(24,35,47,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:text-slate-900 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <Link to="/" preload="intent" className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f3448] shadow-[0_10px_18px_rgba(31,52,72,0.16)]">
                <ScoutFleurDeLis className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xl font-semibold tracking-tight text-slate-950">Scoutly</div>
                <div className="truncate text-xs font-medium text-slate-500">
                  Eagle planning workspace
                </div>
              </div>
            </Link>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    preload="intent"
                    className={navBaseClass}
                    activeProps={{ className: navActiveClass }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 transition-colors group-hover:text-slate-700">
                      <Icon size={17} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {isOpen && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/18 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[20rem] transform flex-col border-r border-slate-200 bg-white text-slate-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f3448]">
              <ScoutFleurDeLis className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Scoutly</h2>
              <p className="text-xs text-slate-500">Navigation</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:text-slate-900"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                preload="intent"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-transparent bg-white p-3 text-slate-700 transition-all hover:border-slate-200 hover:bg-slate-50"
                activeProps={{
                  className:
                    'flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-950',
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon size={18} />
                </span>
                <span className="font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
