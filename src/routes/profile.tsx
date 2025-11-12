import { createFileRoute, Link } from '@tanstack/react-router';
import { useUserData } from '../hooks/useUserData';
import { useState, useEffect } from 'react';
import meritBadgesData from '../data/merit-badges.json';
import rankRequirementsData from '../data/rank-reqs.json';
import { ScoutFleurDeLis, EagleIcon } from '../components/ScoutIcons';
import { Edit2, Save, X } from 'lucide-react';

export const Route = createFileRoute('/profile')({ component: Profile });

const RANK_ORDER = ['scout', 'tenderfoot', 'second_class', 'first_class', 'star', 'life', 'eagle'];
const RANK_DISPLAY_NAMES = ['Scout', 'Tenderfoot', 'Second Class', 'First Class', 'Star', 'Life', 'Eagle'];

function Profile() {
  const { userData, isLoading } = useUserData();
  const [aiPace, setAiPace] = useState<string>('Calculating...');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedTargetDate, setEditedTargetDate] = useState('');

  useEffect(() => {
    if (userData) {
      calculatePace();
      setEditedName(userData.profile.name || '');
      setEditedTargetDate(userData.profile.targetEagleDate || '');
    }
  }, [userData]);

  const handleSaveProfile = () => {
    const currentUserData = JSON.parse(localStorage.getItem('scoutly_user_data') || '{}');
    currentUserData.profile = {
      ...currentUserData.profile,
      name: editedName,
      targetEagleDate: editedTargetDate,
    };
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    
    // Trigger storage event to update UI
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'scoutly_user_data',
      newValue: JSON.stringify(currentUserData),
      url: window.location.href,
      storageArea: localStorage
    }));
    
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedName(userData?.profile.name || '');
    setEditedTargetDate(userData?.profile.targetEagleDate || '');
    setIsEditing(false);
  };

  useEffect(() => {
    if (userData) {
      calculatePace();
    }
  }, [userData]);

  const calculatePace = () => {
    if (!userData?.profile.targetEagleDate) {
      setAiPace('No target date set');
      return;
    }

    const today = new Date();
    const targetDate = new Date(userData.profile.targetEagleDate);
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate current progress
    const eagleRequiredBadges = meritBadgesData.meritBadges.filter(b => b.eagleRequired);
    let completedBadges = 0;
    
    eagleRequiredBadges.forEach(badge => {
      const badgeProgress = userData.progress[badge.id] || {};
      const totalReqs = badge.requirements.reduce((acc, req) => acc + (req.requiredCount || 1), 0);
      let completed = 0;

      badge.requirements.forEach((req, reqIndex) => {
        if (req.sub_requirements && req.sub_requirements.length > 0) {
          let completedSubReqs = 0;
          req.sub_requirements.forEach((_, subIndex) => {
            if (badgeProgress[`req_${reqIndex}_${subIndex}`]) completedSubReqs++;
          });
          completed += Math.min(completedSubReqs, req.requiredCount || req.sub_requirements.length);
        } else {
          if (badgeProgress[`req_${reqIndex}`]) completed++;
        }
      });

      if (completed >= totalReqs) completedBadges++;
    });

    const badgesNeeded = 21 - completedBadges;
    
    if (daysRemaining <= 0) {
      setAiPace('⚠️ Past target date - Update your goal');
      return;
    }

    const badgesPerMonth = badgesNeeded / (daysRemaining / 30);
    const badgesPerMonthLabel = badgesPerMonth.toFixed(1);
    
    if (badgesPerMonth < 0.5) {
      setAiPace(`🟢 Ahead of schedule! ${badgesNeeded} badges in ${Math.floor(daysRemaining / 30)} months`);
    } else if (badgesPerMonth < 1) {
      setAiPace(`🟡 On track - Complete ~1 badge per month`);
    } else if (badgesPerMonth < 2) {
      setAiPace(`🟠 Fast pace needed - ${badgesPerMonthLabel} badges/month`);
    } else {
      setAiPace(`🔴 Very aggressive pace - ${badgesPerMonthLabel} badges/month required`);
    }
  };

  const getRankInfo = () => {
    if (!userData) return null;

    let currentRank = userData.profile.currentRank || 'scout';
    if (currentRank.startsWith('rank_')) {
      currentRank = currentRank.replace('rank_', '');
    }

    const currentRankIndex = RANK_ORDER.indexOf(currentRank.toLowerCase());
    const nextRankIndex = currentRankIndex < RANK_ORDER.length - 1 ? currentRankIndex + 1 : currentRankIndex;
    
    const currentRankDisplay = RANK_DISPLAY_NAMES[currentRankIndex] || 'Scout';
    const nextRankDisplay = RANK_DISPLAY_NAMES[nextRankIndex];
    
    // Get next rank requirements
    const nextRankId = `rank_${RANK_ORDER[nextRankIndex]}`;
    const nextRankData = rankRequirementsData.find(r => r.id === nextRankId);
    
    if (!nextRankData) return { currentRankDisplay, nextRankDisplay, progress: 0, completed: 0, total: 0 };

    // Calculate progress
    const rankProgress = userData.rankProgress?.[nextRankId] || {};
    const allRequirements = nextRankData.requirements.flatMap(req => {
      if ('sub_requirements' in req && (req as any).sub_requirements) {
        return [req, ...(req as any).sub_requirements];
      }
      return [req];
    });
    
    const completed = Object.keys(rankProgress).filter(key => rankProgress[key]).length;
    const total = allRequirements.length;
    const progress = Math.round((completed / total) * 100);

    return { currentRankDisplay, nextRankDisplay, progress, completed, total };
  };

  const getBadgeProgress = () => {
    if (!userData) return { completed: [], inProgress: [], notStarted: [] };

    const completed: any[] = [];
    const inProgress: any[] = [];
    const notStarted: any[] = [];

    meritBadgesData.meritBadges.filter(b => b.eagleRequired).forEach(badge => {
      const badgeProgress = userData.progress[badge.id] || {};
      const totalReqs = badge.requirements.reduce((acc, req) => acc + (req.requiredCount || 1), 0);
      let completedReqs = 0;

      badge.requirements.forEach((req, reqIndex) => {
        if (req.sub_requirements && req.sub_requirements.length > 0) {
          let completedSubReqs = 0;
          req.sub_requirements.forEach((_, subIndex) => {
            if (badgeProgress[`req_${reqIndex}_${subIndex}`]) completedSubReqs++;
          });
          completedReqs += Math.min(completedSubReqs, req.requiredCount || req.sub_requirements.length);
        } else {
          if (badgeProgress[`req_${reqIndex}`]) completedReqs++;
        }
      });

      const percentage = Math.round((completedReqs / totalReqs) * 100);

      if (percentage === 100) {
        completed.push({ ...badge, percentage });
      } else if (percentage > 0) {
        inProgress.push({ ...badge, percentage });
      } else {
        notStarted.push({ ...badge, percentage });
      }
    });

    return { completed, inProgress, notStarted };
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen bg-black flex items-center justify-center"
        style={{
          backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          backgroundPosition: '0 0, 14px 14px',
        }}
      >
        {/* Gradient glows */}
        <div className="fixed top-0 left-0 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none" />
        <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  const rankInfo = getRankInfo();
  const { completed, inProgress, notStarted } = getBadgeProgress();

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

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-linear-to-br from-green-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                  <ScoutFleurDeLis className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Scout Profile</h1>
                  <p className="text-gray-400">Manage your scouting information</p>
                </div>
              </div>
              
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 transition-all"
                >
                  <Edit2 size={18} />
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Scout Name
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Target Eagle Scout Date
                  </label>
                  <input
                    type="date"
                    value={editedTargetDate}
                    onChange={(e) => setEditedTargetDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Set your goal date to track your progress and pace
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-black font-bold transition-all"
                  >
                    <Save size={18} />
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Scout Name</div>
                  <div className="text-xl font-semibold text-white">{userData?.profile.name || 'Not set'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Target Eagle Date</div>
                  <div className="text-xl font-semibold text-white">
                    {userData?.profile.targetEagleDate 
                      ? new Date(userData.profile.targetEagleDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Not set'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rank Progress Section */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <EagleIcon className="text-green-400" size={28} />
            <h2 className="text-xl font-bold text-white">Current Rank Progress</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Rank */}
            <div className="bg-white/10/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-green-400 font-semibold text-sm mb-1">Current Rank</div>
              <div className="text-white font-bold text-xl">{rankInfo?.currentRankDisplay}</div>
            </div>

            {/* Next Rank Progress */}
            <div className="bg-white/10/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎯</span>
                <span className="text-white font-bold text-2xl">{rankInfo?.progress}%</span>
              </div>
              <div className="text-green-400 font-semibold text-sm mb-2">
                Progress to {rankInfo?.nextRankDisplay}
              </div>
              <div className="h-2 rounded-full bg-slate-600 overflow-hidden mb-2">
                <div
                  className="h-full bg-linear-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                  style={{ width: `${rankInfo?.progress}%` }}
                />
              </div>
              <div className="text-xs text-gray-400">
                {rankInfo?.completed}/{rankInfo?.total} requirements completed
              </div>
            </div>

            {/* Target Date */}
            <div className="bg-white/10/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-green-400 font-semibold text-sm mb-1">Eagle Target</div>
              <div className="text-white font-bold text-xl">
                {userData?.profile.targetEagleDate 
                  ? new Date(userData.profile.targetEagleDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : 'Not set'}
              </div>
            </div>
          </div>
        </div>

        {/* AI Pace Analysis */}
        <div className="bg-linear-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🤖</span>
            <h2 className="text-xl font-bold text-white">AI Pace Analysis</h2>
          </div>
          <p className="text-white text-lg font-semibold">{aiPace}</p>
          <p className="text-gray-300 text-sm mt-2">
            Based on your target date and current progress
          </p>
        </div>

        {/* Completed Badges */}
        {completed.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">✅</span>
              <h2 className="text-xl font-bold text-white">
                Completed Eagle-Required Badges ({completed.length}/21)
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {completed.map((badge) => (
                <Link
                  key={badge.id}
                  to="/merit-badges/$badgeId"
                  params={{ badgeId: badge.id }}
                  className="group"
                >
                  <div className="bg-emerald-500/20 border-2 border-emerald-500 rounded-lg p-3 text-center hover:bg-emerald-500/30 transition-all hover:scale-105 cursor-pointer">
                    <div className="text-3xl mb-2">🏅</div>
                    <div className="text-white font-semibold text-xs mb-1 line-clamp-2 min-h-8">
                      {badge.name}
                    </div>
                    <div className="text-emerald-400 font-bold text-sm">100%</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* In Progress Badges */}
        {inProgress.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🔄</span>
              <h2 className="text-xl font-bold text-white">
                In Progress ({inProgress.length})
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {inProgress.map((badge) => (
                <Link
                  key={badge.id}
                  to="/merit-badges/$badgeId"
                  params={{ badgeId: badge.id }}
                  className="group"
                >
                  <div className="bg-white/10/50 border-2 border-cyan-500/50 rounded-lg p-3 text-center hover:bg-white/10 hover:border-cyan-500 transition-all hover:scale-105 cursor-pointer">
                    <div className="text-3xl mb-2">🏅</div>
                    <div className="text-white font-semibold text-xs mb-2 line-clamp-2 min-h-8">
                      {badge.name}
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-600 overflow-hidden mb-1">
                      <div
                        className="h-full bg-linear-to-r from-cyan-400 to-blue-500"
                        style={{ width: `${badge.percentage}%` }}
                      />
                    </div>
                    <div className="text-green-400 font-bold text-sm">{badge.percentage}%</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Not Started Badges */}
        {notStarted.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⬜</span>
              <h2 className="text-xl font-bold text-white">
                Not Started ({notStarted.length})
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {notStarted.map((badge) => (
                <Link
                  key={badge.id}
                  to="/merit-badges/$badgeId"
                  params={{ badgeId: badge.id }}
                  className="group"
                >
                  <div className="bg-white/10/30 border-2 border-slate-600 rounded-lg p-3 text-center hover:bg-white/10/50 hover:border-slate-500 transition-all hover:scale-105 cursor-pointer">
                    <div className="text-3xl mb-2 opacity-50">🏅</div>
                    <div className="text-gray-400 font-semibold text-xs mb-1 line-clamp-2 min-h-8">
                      {badge.name}
                    </div>
                    <div className="text-gray-500 font-bold text-sm">0%</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
