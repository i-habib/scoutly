import { createFileRoute, Link } from '@tanstack/react-router';
import { Award, Search } from 'lucide-react';
import { useState } from 'react';
import { useUserData } from '../../hooks/useUserData';
import meritBadgesData from '../../data/merit-badges.json';

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
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-linear-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Merit Badges</h1>
              <p className="text-gray-400">{meritBadgesData.meritBadges.length} badges available · {eagleRequiredCount} Eagle-required</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merit badges..."
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-900/50 text-gray-400 hover:bg-slate-900 hover:text-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('eagle')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'eagle'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-900/50 text-gray-400 hover:bg-slate-900 hover:text-gray-300'
                }`}
              >
                Eagle
              </button>
              <button
                onClick={() => setFilterType('started')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'started'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-900/50 text-gray-400 hover:bg-slate-900 hover:text-gray-300'
                }`}
              >
                Started
              </button>
              <button
                onClick={() => setFilterType('completed')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  filterType === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-900/50 text-gray-400 hover:bg-slate-900 hover:text-gray-300'
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
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group"
              >
                {/* Badge Icon */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-slate-700/30 rounded-xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-slate-600 group-hover:border-cyan-500/50 transition-all">
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
                    <Award className="w-8 h-8 text-cyan-400 hidden" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
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
                    <span className="text-cyan-400 text-sm font-semibold">{percentage}%</span>
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
            <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No merit badges found</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
