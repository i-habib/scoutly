import { Link } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
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
  { to: '/merit-badges', label: 'Merit Badges', icon: ShieldCheck },
  { to: '/events', label: 'Events', icon: CalendarRange },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const moveIndicatorTo = (to: string) => {
    const navEl = navRef.current;
    const activeEl = itemRefs.current[to];
    if (!navEl || !activeEl) return;
    const navRect = navEl.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    setIndicatorStyle({
      left: activeRect.left - navRect.left,
      width: activeRect.width,
    });
  };

  const isActive = useMemo(
    () => (to: string) => {
      const path = location.pathname;
      if (to === '/') return path === '/';
      if (to === '/merit-badges') return path.startsWith('/merit-badges');
      return path === to || path.startsWith(`${to}/`);
    },
    [location.pathname],
  );

  useLayoutEffect(() => {
    const activeItem = navItems.find((item) => isActive(item.to));
    if (!activeItem) return;
    moveIndicatorTo(activeItem.to);
  }, [isActive, location.pathname]);

  useLayoutEffect(() => {
    const onResize = () => {
      const activeItem = navItems.find((item) => isActive(item.to));
      if (!activeItem) return;
      moveIndicatorTo(activeItem.to);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isActive]);

  const navBaseClass =
    'group relative z-10 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800';
  const navActiveClass = 'text-stone-800 font-semibold';

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white px-4 py-3 text-stone-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="rounded-lg border border-stone-200 bg-white p-2.5 text-stone-500 transition-colors hover:text-stone-800 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <Link to="/" preload="intent" className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-800 text-white">
                <ScoutFleurDeLis className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xl font-semibold tracking-tight text-stone-800">Scoutly</div>
                <div className="truncate text-xs font-medium text-stone-400">
                  Eagle planning workspace
                </div>
              </div>
            </Link>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <nav
              ref={navRef}
              className="relative flex items-center gap-1 rounded-2xl border border-stone-200 bg-stone-100 p-1"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-1 top-1 left-0 rounded-xl border border-stone-200 bg-white shadow-sm transition-transform duration-160 ease-out will-change-transform"
                style={{
                  width: indicatorStyle.width,
                  transform: `translate3d(${indicatorStyle.left}px, 0, 0)`,
                }}
              />
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    ref={(el) => {
                      itemRefs.current[item.to] = el;
                    }}
                    key={item.to}
                    to={item.to}
                    preload="intent"
                    onMouseDown={() => moveIndicatorTo(item.to)}
                    onClick={() => moveIndicatorTo(item.to)}
                    className={`${navBaseClass} ${isActive(item.to) ? navActiveClass : ''}`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-stone-500 transition-colors group-hover:text-stone-600">
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
          className="fixed inset-0 z-40 bg-stone-900/20 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[20rem] transform flex-col border-r border-stone-200 bg-white text-stone-800 transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-800 text-white">
              <ScoutFleurDeLis className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-800">Scoutly</h2>
              <p className="text-xs text-stone-400">Navigation</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg border border-stone-200 bg-white p-2 text-stone-500 transition-colors hover:text-stone-800"
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
                className="flex items-center gap-3 rounded-xl border border-transparent bg-white p-3 text-stone-500 transition-all hover:border-stone-200 hover:bg-stone-50"
                activeProps={{
                  className:
                    'flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 text-stone-800',
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
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
