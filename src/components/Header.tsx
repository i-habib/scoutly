import { Link } from '@tanstack/react-router'

import { useState } from 'react'
import {
  Home,
  Menu,
  X,
  User,
  TrendingUp,
} from 'lucide-react'
import { ScoutFleurDeLis, EagleIcon, MeritBadgeIcon, TentIcon } from './ScoutIcons'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const navBaseClass = 'flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
  const navActiveClass = 'flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-100 transition-colors text-sm font-medium'
  const mobileNavBaseClass = 'flex items-center gap-3 p-3 rounded-xl text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors mb-2'
  const mobileNavActiveClass = 'flex items-center gap-3 p-3 rounded-xl bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-100 transition-colors mb-2'

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 px-4 py-3 text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen(true)}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-semibold">
              <Link to="/" className="flex items-center gap-2 text-slate-900 transition-colors hover:text-emerald-700">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-sky-600 shadow-[0_12px_30px_rgba(14,165,233,0.2)]">
                  <ScoutFleurDeLis className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-bold tracking-tight">Scoutly</span>
                  <span className="text-xs font-medium text-slate-500">Eagle planning hub</span>
                </div>
              </Link>
            </h1>
          </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2">
          <Link
            to="/landing"
            className={navBaseClass}
            activeProps={{
              className: navActiveClass,
            }}
          >
            <ScoutFleurDeLis size={18} />
            <span>Home</span>
          </Link>

          <Link
            to="/"
            className={navBaseClass}
            activeProps={{
              className: navActiveClass,
            }}
          >
            <Home size={18} />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/ai-coach"
            className={navBaseClass}
            activeProps={{
              className: navActiveClass,
            }}
          >
            <ScoutFleurDeLis size={18} />
            <span>AI Coach</span>
          </Link>

          <Link
            to="/timeline"
            className={navBaseClass}
            activeProps={{
              className: navActiveClass,
            }}
          >
            <TrendingUp size={18} />
            <span>Timeline</span>
          </Link>

          <Link
            to="/advancement"
            className={navBaseClass}
            activeProps={{
              className: navActiveClass,
            }}
          >
            <EagleIcon size={18} />
            <span>Advancement</span>
          </Link>

          <Link
            to="/merit-badges/"
            className={navBaseClass}
            activeProps={{
              className: navActiveClass,
            }}
          >
            <MeritBadgeIcon size={18} />
            <span>Merit Badges</span>
          </Link>

          <Link
            to="/events"
            className={navBaseClass}
            activeProps={{
              className: navActiveClass,
            }}
          >
            <TentIcon size={18} />
            <span>Events</span>
          </Link>

          <Link
            to="/profile"
            className={navBaseClass}
            activeProps={{
              className: navActiveClass,
            }}
          >
            <User size={18} />
            <span>Profile</span>
          </Link>
        </nav>
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-80 transform flex-col border-r border-slate-200 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <Link
            to="/landing"
            onClick={() => setIsOpen(false)}
            className={mobileNavBaseClass}
            activeProps={{
              className: mobileNavActiveClass,
            }}
          >
            <ScoutFleurDeLis size={20} />
            <span className="font-medium">Home</span>
          </Link>

          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className={mobileNavBaseClass}
            activeProps={{
              className: mobileNavActiveClass,
            }}
          >
            <Home size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link
            to="/ai-coach"
            onClick={() => setIsOpen(false)}
            className={mobileNavBaseClass}
            activeProps={{
              className: mobileNavActiveClass,
            }}
          >
            <ScoutFleurDeLis size={20} />
            <span className="font-medium">AI Eagle Coach</span>
          </Link>

          <Link
            to="/timeline"
            onClick={() => setIsOpen(false)}
            className={mobileNavBaseClass}
            activeProps={{
              className: mobileNavActiveClass,
            }}
          >
            <TrendingUp size={20} />
            <span className="font-medium">Timeline Planner</span>
          </Link>

          <Link
            to="/advancement"
            onClick={() => setIsOpen(false)}
            className={mobileNavBaseClass}
            activeProps={{
              className: mobileNavActiveClass,
            }}
          >
            <EagleIcon size={20} />
            <span className="font-medium">Advancement</span>
          </Link>

          <Link
            to="/merit-badges/"
            onClick={() => setIsOpen(false)}
            className={mobileNavBaseClass}
            activeProps={{
              className: mobileNavActiveClass,
            }}
          >
            <MeritBadgeIcon size={20} />
            <span className="font-medium">Merit Badges</span>
          </Link>

          <Link
            to="/events"
            onClick={() => setIsOpen(false)}
            className={mobileNavBaseClass}
            activeProps={{
              className: mobileNavActiveClass,
            }}
          >
            <TentIcon size={20} />
            <span className="font-medium">Events</span>
          </Link>

          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className={mobileNavBaseClass}
            activeProps={{
              className: mobileNavActiveClass,
            }}
          >
            <User size={20} />
            <span className="font-medium">Profile</span>
          </Link>
        </nav>
      </aside>
    </>
  )
}
