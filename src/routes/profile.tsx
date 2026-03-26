import { createFileRoute, Link } from '@tanstack/react-router';
import { useUserData } from '../hooks/useUserData';
import { useState, useEffect } from 'react';
import meritBadgesData from '../data/merit-badges.json';
import rankRequirementsData from '../data/rank-reqs.json';
import { ScoutFleurDeLis, EagleIcon, MeritBadgeIcon } from '../components/ScoutIcons';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Edit2,
  Gauge,
  Save,
  Target,
  X,
} from 'lucide-react';
import { computeBadgeProgressByMeta, splitEagleRequiredByStatus } from '../lib/progress';

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
      setAiPace('Set a target date to calculate your current pace.');
      return;
    }

    const today = new Date();
    const targetDate = new Date(userData.profile.targetEagleDate);
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate current progress using shared utilities
    const eagleRequiredBadges = meritBadgesData.meritBadges.filter(b => b.eagleRequired);
    let completedBadges = 0;
    eagleRequiredBadges.forEach(badge => {
      const { total, completed } = computeBadgeProgressByMeta(badge as any, userData.progress[badge.id]);
      if (completed >= total && total > 0) completedBadges++;
    });

    const badgesNeeded = 21 - completedBadges;
    
    // Calculate remaining requirements and sign-offs needed
    const incompleteBadges = eagleRequiredBadges.filter(badge => {
      const { total, completed } = computeBadgeProgressByMeta(badge as any, userData.progress[badge.id]);
      return completed < total;
    });

    // Calculate total requirements remaining
    let totalRequirementsRemaining = 0;
    incompleteBadges.forEach(badge => {
      const { total, completed } = computeBadgeProgressByMeta(badge as any, userData.progress[badge.id]);
      totalRequirementsRemaining += Math.max(0, total - completed);
    });

    const badgeNames = incompleteBadges.slice(0, 3).map(b => b.name).join(', ');
    const moreBadges = incompleteBadges.length > 3 ? ` +${incompleteBadges.length - 3} more` : '';
    
    if (daysRemaining <= 0) {
      setAiPace('Your target date has already passed. Update the goal to rebuild a realistic plan.');
      return;
    }

    const badgesPerMonth = badgesNeeded / (daysRemaining / 30);
    const badgesPerMonthLabel = badgesPerMonth.toFixed(1);
    const reqsPerWeek = (totalRequirementsRemaining / (daysRemaining / 7)).toFixed(1);
    
    if (badgesPerMonth < 0.5) {
      setAiPace(`Ahead of schedule. ${badgesNeeded} badges remain (${totalRequirementsRemaining} requirements, about ${reqsPerWeek} sign-offs each week). Priority badges: ${badgeNames}${moreBadges}.`);
    } else if (badgesPerMonth < 1) {
      setAiPace(`On track. Plan for roughly one badge each month (${totalRequirementsRemaining} requirements, about ${reqsPerWeek} sign-offs each week). Priority badges: ${badgeNames}${moreBadges}.`);
    } else if (badgesPerMonth < 2) {
      setAiPace(`A faster pace is needed. You need about ${badgesPerMonthLabel} badges each month (${totalRequirementsRemaining} requirements, about ${reqsPerWeek} sign-offs each week). Focus on: ${badgeNames}${moreBadges}.`);
    } else {
      setAiPace(`This target is very aggressive. You need about ${badgesPerMonthLabel} badges each month (${totalRequirementsRemaining} requirements, about ${reqsPerWeek} sign-offs each week). Immediate focus: ${badgeNames}${moreBadges}.`);
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
    return splitEagleRequiredByStatus(userData);
  };

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="text-center relative z-10">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  const rankInfo = getRankInfo();
  const { completed, inProgress, notStarted } = getBadgeProgress();

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="app-surface rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-sky-600 shadow-[0_14px_30px_rgba(14,165,233,0.22)]">
                  <ScoutFleurDeLis className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-950">Scout Profile</h1>
                  <p className="text-slate-600">Manage your scouting information</p>
                </div>
              </div>
              
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 transition-all hover:bg-emerald-100"
                >
                  <Edit2 size={18} />
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Scout Name
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-emerald-100"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Target Eagle Scout Date
                  </label>
                  <input
                    type="date"
                    value={editedTargetDate}
                    onChange={(e) => setEditedTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-emerald-100"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Set your goal date to track your progress and pace
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    className="flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-sky-600 px-4 py-2 font-bold text-white transition-all hover:from-emerald-500 hover:to-sky-500"
                  >
                    <Save size={18} />
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 transition-all hover:bg-slate-50"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="mb-1 text-sm text-slate-500">Scout Name</div>
                  <div className="text-xl font-semibold text-slate-950">{userData?.profile.name || 'Not set'}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-slate-500">Target Eagle Date</div>
                  <div className="text-xl font-semibold text-slate-950">
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
        <div className="app-surface mb-6 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <EagleIcon className="text-emerald-600" size={28} />
            <h2 className="text-xl font-bold text-slate-950">Current Rank Progress</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Rank */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Award className="h-5 w-5" />
              </div>
              <div className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Current Rank</div>
              <div className="text-xl font-bold text-slate-950">{rankInfo?.currentRankDisplay}</div>
            </div>

            {/* Next Rank Progress */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Target className="h-5 w-5" />
                </span>
                <span className="text-2xl font-bold text-slate-950">{rankInfo?.progress}%</span>
              </div>
              <div className="mb-2 text-sm font-semibold text-[#1f3448]">
                Progress to {rankInfo?.nextRankDisplay}
              </div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 to-sky-600 transition-all duration-500"
                  style={{ width: `${rankInfo?.progress}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">
                {rankInfo?.completed}/{rankInfo?.total} requirements completed
              </div>
            </div>

            {/* Target Date */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Eagle Target</div>
              <div className="text-xl font-bold text-slate-950">
                {userData?.profile.targetEagleDate 
                  ? new Date(userData.profile.targetEagleDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : 'Not set'}
              </div>
            </div>
          </div>
        </div>

        {/* Pace Assessment */}
        <div className="mb-6 rounded-3xl border border-slate-200 bg-linear-to-r from-[#f2f6f3] via-white to-[#f3eee4] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
              <Gauge className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-950">Pace Assessment</h2>
          </div>
          <p className="text-lg font-semibold text-slate-900">{aiPace}</p>
          <p className="mt-2 text-sm text-slate-600">
            Based on your target date and current progress
          </p>
        </div>

        {/* Completed Badges */}
        {completed.length > 0 && (
          <div className="app-surface mb-6 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-950">
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
                  <div className="cursor-pointer rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center transition-all hover:scale-105 hover:border-emerald-300">
                    {badge.imageUrl ? (
                      <img 
                        src={badge.imageUrl} 
                        alt={badge.name}
                        className="w-16 h-16 mx-auto mb-2 object-contain"
                      />
                    ) : (
                      <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white">
                        <MeritBadgeIcon className="h-8 w-8 text-emerald-700" />
                      </div>
                    )}
                    <div className="mb-1 min-h-8 line-clamp-2 text-xs font-semibold text-slate-900">
                      {badge.name}
                    </div>
                    <div className="text-sm font-bold text-emerald-700">100%</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* In Progress Badges */}
        {inProgress.length > 0 && (
          <div className="app-surface mb-6 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-sky-600" />
              <h2 className="text-xl font-bold text-slate-950">
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
                  <div className="cursor-pointer rounded-2xl border border-sky-200 bg-sky-50 p-3 text-center transition-all hover:scale-105 hover:border-sky-300">
                    {badge.imageUrl ? (
                      <img 
                        src={badge.imageUrl} 
                        alt={badge.name}
                        className="w-16 h-16 mx-auto mb-2 object-contain"
                      />
                    ) : (
                      <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white">
                        <MeritBadgeIcon className="h-8 w-8 text-sky-700" />
                      </div>
                    )}
                    <div className="mb-2 min-h-8 line-clamp-2 text-xs font-semibold text-slate-900">
                      {badge.name}
                    </div>
                    <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-linear-to-r from-emerald-500 to-sky-600"
                        style={{ width: `${badge.percentage}%` }}
                      />
                    </div>
                    <div className="text-sm font-bold text-sky-700">{badge.percentage}%</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Not Started Badges */}
        {notStarted.length > 0 && (
          <div className="app-surface rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <MeritBadgeIcon className="h-6 w-6 text-slate-500" />
              <h2 className="text-xl font-bold text-slate-950">
                Not Started ({notStarted.length})
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {notStarted.map((badge) => {
                return (
                  <Link
                    key={badge.id}
                    to="/merit-badges/$badgeId"
                    params={{ badgeId: badge.id }}
                    className="group"
                  >
                    <div className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center transition-all hover:scale-105 hover:border-slate-300">
                      {badge.imageUrl ? (
                        <img 
                          src={badge.imageUrl} 
                          alt={badge.name}
                          className="mx-auto mb-2 h-16 w-16 object-contain opacity-60 transition-opacity group-hover:opacity-80"
                        />
                      ) : (
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white opacity-70 transition-opacity group-hover:opacity-100">
                          <MeritBadgeIcon className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      <div className="mb-1 min-h-8 line-clamp-2 text-xs font-semibold text-slate-700">
                        {badge.name}
                      </div>
                      <div className="text-sm font-bold text-slate-400">0%</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
