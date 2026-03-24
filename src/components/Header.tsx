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

  return (
    <>
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between bg-black/95 backdrop-blur-sm text-white shadow-lg border-b border-green-500/30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-green-500/20 rounded-lg transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-semibold">
            <Link to="/" className="text-white hover:text-green-400 transition-colors flex items-center gap-2">
              <div className="w-8 h-8 bg-linear-to-br from-green-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/30">
                <ScoutFleurDeLis className="w-5 h-5 text-white" />
              </div>
              Scoutly
            </Link>
          </h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2">
          <Link
            to="/landing"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium"
            activeProps={{
              className: 'flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors text-sm font-medium',
            }}
          >
            <ScoutFleurDeLis size={18} />
            <span>Home</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium"
            activeProps={{
              className: 'flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors text-sm font-medium',
            }}
          >
            <Home size={18} />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/ai-coach"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium"
            activeProps={{
              className: 'flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors text-sm font-medium',
            }}
          >
            <ScoutFleurDeLis size={18} />
            <span>AI Coach</span>
          </Link>

          <Link
            to="/timeline"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium"
            activeProps={{
              className: 'flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors text-sm font-medium',
            }}
          >
            <TrendingUp size={18} />
            <span>Timeline</span>
          </Link>

          <Link
            to="/advancement"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium"
            activeProps={{
              className: 'flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors text-sm font-medium',
            }}
          >
            <EagleIcon size={18} />
            <span>Advancement</span>
          </Link>

          <Link
            to="/merit-badges/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium"
            activeProps={{
              className: 'flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors text-sm font-medium',
            }}
          >
            <MeritBadgeIcon size={18} />
            <span>Merit Badges</span>
          </Link>

          <Link
            to="/events"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium"
            activeProps={{
              className: 'flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors text-sm font-medium',
            }}
          >
            <TentIcon size={18} />
            <span>Events</span>
          </Link>

          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium"
            activeProps={{
              className: 'flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors text-sm font-medium',
            }}
          >
            <User size={18} />
            <span>Profile</span>
          </Link>
        </nav>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-black/95 backdrop-blur-xl text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-r border-green-500/30 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-green-500/30">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <Link
            to="/landing"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-500/20 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors mb-2',
            }}
          >
            <ScoutFleurDeLis size={20} />
            <span className="font-medium">Home</span>
          </Link>

          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-500/20 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors mb-2',
            }}
          >
            <Home size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link
            to="/ai-coach"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-500/20 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors mb-2',
            }}
          >
            <ScoutFleurDeLis size={20} />
            <span className="font-medium">AI Eagle Coach</span>
          </Link>

          <Link
            to="/timeline"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-500/20 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors mb-2',
            }}
          >
            <TrendingUp size={20} />
            <span className="font-medium">Timeline Planner</span>
          </Link>

          <Link
            to="/advancement"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-500/20 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors mb-2',
            }}
          >
            <EagleIcon size={20} />
            <span className="font-medium">Advancement</span>
          </Link>

          <Link
            to="/merit-badges/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-500/20 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors mb-2',
            }}
          >
            <MeritBadgeIcon size={20} />
            <span className="font-medium">Merit Badges</span>
          </Link>

          <Link
            to="/events"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors mb-2 hover:bg-green-500/20"
            activeProps={{
              className: 'flex items-center gap-3 p-3 rounded-lg transition-colors mb-2 bg-green-500/30 border border-green-500/50 text-white'
            }}
          >
            <TentIcon size={20} />
            <span className="font-medium">Events</span>
          </Link>

          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-500/20 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-green-500/30 border border-green-500/50 hover:bg-green-500/40 transition-colors mb-2',
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
