import { createFileRoute, Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useUserData } from '../../hooks/useUserData';
import meritBadgesData from '../../data/merit-badges.json';
import { MeritBadgeIcon } from '../../components/ScoutIcons';

export const Route = createFileRoute('/merit-badges/')({
  component: MeritBadgesList,
});

function MeritBadgesList() {
  const { userData } = useUserData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'eagle' | 'started' | 'completed'>('all');

  const filteredBadges = meritBadgesData.meritBadges.filter((badge) => {
    // Search filter
    const matchesSearch = badge.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Type filter
    const progress = userData?.progress?.[badge.id] || {};
    
    // Smart counting - matches the card display logic
    const totalCount = badge.requirements.reduce((acc, req) => {
      return acc + (req.requiredCount || 1);
    }, 0);
    
    // Count completed items
    let completedCount = 0;
    badge.requirements.forEach((req, reqIndex) => {
      if (req.sub_requirements && req.sub_requirements.length > 0) {
        let completedSubReqs = 0;
        req.sub_requirements.forEach((_, subIndex) => {
          if (progress[`req_${reqIndex}_${subIndex}`]) completedSubReqs++;
        });
        completedCount += Math.min(completedSubReqs, req.requiredCount || req.sub_requirements.length);
      } else {
        if (progress[`req_${reqIndex}`]) completedCount++;
      }
    });
    
    const isStarted = completedCount > 0 && completedCount < totalCount;
    const isCompleted = completedCount === totalCount && totalCount > 0;

    let matchesFilter = true;
    if (filterType === 'eagle') matchesFilter = badge.eagleRequired;
    if (filterType === 'started') matchesFilter = isStarted;
    if (filterType === 'completed') matchesFilter = isCompleted;

    return matchesSearch && matchesFilter;
  });

  const eagleRequiredCount = meritBadgesData.meritBadges.filter(b => b.eagleRequired).length;

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-sky-600 shadow-[0_14px_30px_rgba(14,165,233,0.22)]">
              <MeritBadgeIcon className="w-6 h-6 text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Merit Badges</h1>
              <p className="text-slate-600">{meritBadgesData.meritBadges.length} badges available · {eagleRequiredCount} Eagle-required</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="app-surface mb-8 rounded-3xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merit badges..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 pl-10 text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('eagle')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'eagle'
                    ? 'bg-amber-500 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                Eagle
              </button>
              <button
                onClick={() => setFilterType('started')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'started'
                    ? 'bg-sky-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                Started
              </button>
              <button
                onClick={() => setFilterType('completed')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                Completed
              </button>
            </div>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBadges.map((badge) => {
            const progress = userData?.progress?.[badge.id] || {};
            
            // Smart counting
            const totalCount = badge.requirements.reduce((acc, req) => {
              return acc + (req.requiredCount || 1);
            }, 0);
            
            // Count completed items
            let completedCount = 0;
            badge.requirements.forEach((req, reqIndex) => {
              if (req.sub_requirements && req.sub_requirements.length > 0) {
                let completedSubReqs = 0;
                req.sub_requirements.forEach((_, subIndex) => {
                  if (progress[`req_${reqIndex}_${subIndex}`]) completedSubReqs++;
                });
                completedCount += Math.min(completedSubReqs, req.requiredCount || req.sub_requirements.length);
              } else {
                if (progress[`req_${reqIndex}`]) completedCount++;
              }
            });
            
            const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <Link
                key={badge.id}
                to="/merit-badges/$badgeId"
                params={{ badgeId: badge.id }}
                className="app-surface group rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200"
              >
                {/* Badge Icon */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition-all group-hover:border-emerald-200">
                    {'imageUrl' in badge && badge.imageUrl ? (
                      <img 
                        src={badge.imageUrl as string} 
                        alt={badge.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <MeritBadgeIcon className="hidden w-8 h-8 text-emerald-600" size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-semibold text-slate-950 transition-colors group-hover:text-emerald-700">
                      {badge.name}
                    </h3>
                    {badge.eagleRequired && (
                      <span className="inline-block px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded text-amber-400 text-xs font-semibold">
                        Eagle Required
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Progress</span>
                    <span className="text-sm font-semibold text-emerald-700">{percentage}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-linear-to-r from-emerald-500 to-sky-600 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <p className="text-sm text-slate-500">
                  {completedCount} / {totalCount} requirements completed
                </p>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredBadges.length === 0 && (
          <div className="text-center py-12">
            <MeritBadgeIcon className="mx-auto mb-4 h-16 w-16 text-slate-300" size={64} />
            <p className="text-lg text-slate-600">No merit badges found</p>
            <p className="mt-2 text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
