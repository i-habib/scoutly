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
    <div 
      className="min-h-screen bg-black"
      style={{
        backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        backgroundPosition: '0 0, 14px 14px',
      }}
    >
      {/* Gradient glows */}
      <div className="fixed top-0 left-0 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-linear-to-br from-green-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <MeritBadgeIcon className="w-6 h-6 text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Merit Badges</h1>
              <p className="text-slate-400">{meritBadgesData.meritBadges.length} badges available · {eagleRequiredCount} Eagle-required</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merit badges..."
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-green-500 text-black font-bold'
                    : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-slate-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('eagle')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'eagle'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-slate-300'
                }`}
              >
                Eagle
              </button>
              <button
                onClick={() => setFilterType('started')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'started'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-slate-300'
                }`}
              >
                Started
              </button>
              <button
                onClick={() => setFilterType('completed')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-slate-300'
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
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 group"
              >
                {/* Badge Icon */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-white/10 group-hover:border-green-500/50 transition-all">
                    {'imageUrl' in badge && badge.imageUrl ? (
                      <img 
                        src={badge.imageUrl as string} 
                        alt={badge.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <MeritBadgeIcon className="w-8 h-8 text-green-400 hidden" size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-green-400 transition-colors">
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
                    <span className="text-gray-400 text-sm">Progress</span>
                    <span className="text-green-400 text-sm font-semibold">{percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <p className="text-gray-400 text-sm">
                  {completedCount} / {totalCount} requirements completed
                </p>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredBadges.length === 0 && (
          <div className="text-center py-12">
            <MeritBadgeIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" size={64} />
            <p className="text-gray-400 text-lg">No merit badges found</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
