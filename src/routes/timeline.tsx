import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, useEffect, useRef } from 'react';
import { AlertTriangle, Calendar, Target, Award, Clock, Loader2, TrendingUp, CheckCircle, X } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import meritBadgesData from '../data/merit-badges.json';
import { MeritBadgeIcon } from '../components/ScoutIcons';
import { buildTimelineState } from '../lib/buildTimeline';
import { getRankDisplayName } from '../lib/constants';
import { RANK_COLORS, RANK_ACCENT_COLORS, RANK_TEXT_COLORS } from '../lib/constants';
import { getWorkingRankId } from '../lib/scoutFocus';
import { computeBadgeProgress } from '../lib/progress';
import { formatRequirementsPerMeeting } from '../lib/pacing';
import type { BadgePlanItem, TimelineState } from '../lib/timelineTypes';

const meritBadges = meritBadgesData.meritBadges;
const PRE_FIRST_CLASS_RANKS = ['Scout', 'Tenderfoot', 'Second Class', 'First Class'];
const RANK_ORDER = ['Scout', 'Tenderfoot', 'Second Class', 'First Class', 'Star', 'Life', 'Eagle'] as const;

const rankNameToId: Record<string, string> = {
  'Scout': 'rank_scout',
  'Tenderfoot': 'rank_tenderfoot',
  'Second Class': 'rank_second_class',
  'First Class': 'rank_first_class',
  'Star': 'rank_star',
  'Life': 'rank_life',
  'Eagle': 'rank_eagle',
};

const rankAccentColor = (rankName: string) => RANK_ACCENT_COLORS[rankNameToId[rankName] || 'rank_scout'];
const rankTextColor = (rankName: string) => RANK_TEXT_COLORS[rankNameToId[rankName] || 'rank_scout'];

function summarizeBadgeFocusByPhase(badgePlan: BadgePlanItem[]) {
  const summary = {
    Star: { total: 0, eagleRequired: 0, electiveSlots: 0 },
    Life: { total: 0, eagleRequired: 0, electiveSlots: 0 },
  };

  badgePlan.forEach((item) => {
    if (item.phase !== 'Star' && item.phase !== 'Life') return;

    summary[item.phase].total += 1;
    if (item.isElective) summary[item.phase].electiveSlots += 1;

    const badgeMeta = meritBadges.find(
      (badge: any) =>
        (item.id && badge.id === item.id) ||
        badge.name.toLowerCase() === item.name.toLowerCase(),
    );

    if (badgeMeta?.eagleRequired) {
      summary[item.phase].eagleRequired += 1;
    }
  });

  return summary;
}

function sanitizeElectiveSelection(ids: string[], totalSlots: number) {
  const uniqueIds: string[] = [];
  ids.forEach((id) => {
    if (!id || uniqueIds.includes(id)) return;
    uniqueIds.push(id);
  });
  return uniqueIds.slice(0, totalSlots);
}

export const Route = createFileRoute('/timeline')({
  component: TimelinePage,
});

// Types now imported from ../lib/timelineTypes

function TimelinePage() {
  const navigate = useNavigate();
  const { userData, updateProfile, updateProgress, batchUpdateProgress } = useUserData();
  const [timelineTab, setTimelineTab] = useState<'signoffs' | 'badges'>('signoffs');

  // Calculate timeline using the shared builder (DRY)
  const timelineState: TimelineState = useMemo(() => {
    return buildTimelineState(userData);
  }, [userData]);

  // Auto-selection disabled to let users choose their own options and electives

  if (!userData) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-800" />
      </div>
    );
  }

  const targetDate = userData.profile?.targetEagleDate
    ? new Date(userData.profile.targetEagleDate)
    : null;

  const daysUntilEagle = targetDate
    ? Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const hasNoRank = !userData.profile?.currentRank;
  const currentRankName = userData.profile?.currentRank
    ? getRankDisplayName(userData.profile.currentRank)
    : 'Scout';
  const workingRankId = getWorkingRankId(userData.profile?.currentRank);

  if (!targetDate) {
    return (
      <div className="app-shell light-overrides min-h-screen">
        <div className="app-shell__content max-w-7xl mx-auto px-4 py-6">
          <div className="app-surface rounded-2xl p-12 text-center">
            <Target className="w-16 h-16 text-stone-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-stone-900 mb-2">Set Your Eagle Target Date</h2>
            <p className="text-stone-600 mb-6">
              Go to your profile to set a target Eagle Scout date to see your personalized timeline.
            </p>
            <button
              onClick={() => navigate({ to: '/profile' })}
              className="px-6 py-3 bg-stone-800 text-white font-semibold rounded-xl hover:bg-stone-700 transition-all"
            >
              Go to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timeline = timelineState.ok ? timelineState : undefined;
  const rankRequirementItems = timeline
    ? timeline.remainingRanks.filter((rank) => PRE_FIRST_CLASS_RANKS.includes(rank.title))
    : [];
  const badgeFocusByPhase = useMemo(
    () => summarizeBadgeFocusByPhase(timeline?.badgePlan || []),
    [timeline?.badgePlan],
  );
  const remainingBadgeRequirements = timeline
    ? timeline.remainingBadges.reduce((total, badge) => total + badge.requirementsRemaining, 0)
    : 0;
  const isAtLeastFirstClass = useMemo(() => {
    const currentRankIndex = RANK_ORDER.indexOf(currentRankName as any);
    const firstClassIndex = RANK_ORDER.indexOf('First Class');
    if (currentRankIndex === -1) return false; // no rank yet / unknown should stay in signoff-focused flow
    return currentRankIndex >= firstClassIndex;
  }, [currentRankName]);
  const isMeritBadgeFocusedTimeline = timeline
    ? ['Star', 'Life', 'Eagle'].includes(timeline.currentRankName)
    : false;
  const preFirstClassRequirementsRemaining = rankRequirementItems.reduce(
    (total, rank) => total + rank.requirementsRemaining,
    0,
  );

  return (
    <div className="app-shell light-overrides min-h-screen">
      <div className="app-shell__content max-w-7xl mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="app-surface rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 ${RANK_COLORS[workingRankId] || 'bg-stone-500'} rounded-xl`}>
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Eagle Scout Timeline</h1>
              <p className="text-stone-500">Your personalized path to achievement</p>
            </div>
          </div>

          {targetDate && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-stone-500" />
                  <span className="text-sm text-stone-500">Target Date</span>
                </div>
                <p className="text-2xl font-semibold text-stone-800">
                  {targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-stone-500" />
                  <span className="text-sm text-stone-500">Days Remaining</span>
                </div>
                <p className="text-2xl font-semibold text-stone-800">
                  {daysUntilEagle && daysUntilEagle > 0 ? daysUntilEagle : '—'}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-stone-500" />
                  <span className="text-sm text-stone-500">Current Rank</span>
                </div>
                <p className="text-2xl font-semibold text-stone-800">
                  {currentRankName}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-stone-500" />
                  <span className="text-sm text-stone-500">
                    {isMeritBadgeFocusedTimeline ? 'Open Merit Badges' : 'Signoffs Needed'}
                  </span>
                </div>
                <p className="text-2xl font-semibold text-stone-800">
                  {timeline
                    ? isMeritBadgeFocusedTimeline
                      ? timeline.remainingBadges.length
                      : preFirstClassRequirementsRemaining || timeline.totalSignoffsNeeded
                    : '—'}
                </p>
              </div>

            </div>
          )}
        </div>

        {/* Error banner when timeline state is not ok */}
        {!timelineState.ok && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{timelineState.error.message}</span>
          </div>
        )}
        {/* Tabs */}
        {timeline && (
          <div className="mb-4 flex gap-2">
            <button
              className={`px-4 py-2 rounded-xl border ${timelineTab === 'signoffs' ? 'bg-stone-100 border-stone-300 text-stone-800 font-medium' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}
              onClick={() => setTimelineTab('signoffs')}
            >
              Signoffs Timeline
            </button>
            <button
              className={`px-4 py-2 rounded-xl border ${timelineTab === 'badges' ? 'bg-stone-100 border-stone-300 text-stone-800 font-medium' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}
              onClick={() => setTimelineTab('badges')}
            >
              Merit Badges Timeline
            </button>
          </div>
        )}

        {/* Timeline Stats */}
        {timeline && timelineTab === 'signoffs' && (
          <div className="app-surface rounded-2xl p-6 mb-6">
            {/* Carry-over previous rank warnings */}
            {Array.isArray((timeline as any).prevRankCarryovers) && (timeline as any).prevRankCarryovers.length > 0 && (
              <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800">
                  <AlertTriangle className="h-4 w-4" />
                  Incomplete requirements from previous ranks
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(timeline as any).prevRankCarryovers.map((r: any) => (
                    <div key={r.rankId} className="rounded-2xl border border-stone-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-stone-800">{r.rankName}</p>
                        <span className="text-xs text-stone-700">{r.missing}/{r.total} left</span>
                      </div>
                      <p className="mt-1 text-[11px] text-stone-500">These must be finished before advancing.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-xl font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-stone-600" />
              Key Milestone Dates
            </h2>
            
      {/* Milestone Timeline */}
      <div className="space-y-3 mb-6">
              {/* Scout Promotion (shown when user has no rank yet) */}
              {hasNoRank && timeline.rankDeadlines['Scout'] && (
                <div className={`flex items-center justify-between rounded-2xl border p-4 ${rankAccentColor('Scout')}`}>
                  <div>
                    <p className={`text-sm font-semibold ${rankTextColor('Scout')}`}>Scout Rank Signoff</p>
                    <p className="text-xs text-stone-500">First milestone before Tenderfoot</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-stone-800">
                      {timeline.rankDeadlines['Scout']!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-stone-500">
                      {(timeline.remainingRanks.find(r => r.title === 'Scout')?.requirementsRemaining ?? 0)} signoffs remaining
                    </p>
                  </div>
                </div>
              )}

              {/* Tenderfoot Promotion */}
              {timeline.rankDeadlines['Tenderfoot'] && (
                <div className={`flex items-center justify-between rounded-2xl border p-4 ${rankAccentColor('Tenderfoot')}`}>
                  <div>
                    <p className={`text-sm font-semibold ${rankTextColor('Tenderfoot')}`}>Tenderfoot Promotion</p>
                    <p className="text-xs text-stone-500">Next rank after Scout</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-stone-800">
                      {timeline.rankDeadlines['Tenderfoot']!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-stone-500">
                      {(timeline.remainingRanks.find(r => r.title === 'Tenderfoot')?.requirementsRemaining ?? 0)} signoffs remaining
                    </p>
                  </div>
                </div>
              )}

              {/* Second Class Promotion */}
              {timeline.rankDeadlines['Second Class'] && (
                <div className={`flex items-center justify-between rounded-2xl border p-4 ${rankAccentColor('Second Class')}`}>
                  <div>
                    <p className={`text-sm font-semibold ${rankTextColor('Second Class')}`}>Second Class Promotion</p>
                    <p className="text-xs text-stone-500">After Tenderfoot</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-stone-800">
                      {timeline.rankDeadlines['Second Class']!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-stone-500">
                      {(timeline.remainingRanks.find(r => r.title === 'Second Class')?.requirementsRemaining ?? 0)} signoffs remaining
                    </p>
                  </div>
                </div>
              )}

              {!timeline.isAlreadyFirstClass && (
                  <div className={`flex items-center justify-between rounded-2xl border p-4 ${rankAccentColor('First Class')}`}>
                  <div>
                    <p className={`text-sm font-semibold ${rankTextColor('First Class')}`}>First Class Promotion</p>
                    <p className="text-xs text-stone-500">Complete all pre-First Class requirements</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-stone-800">
                      {timeline.milestones.firstClass && timeline.milestones.firstClass.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-stone-500">
                      {(timeline.phases.preFirstClass as any)?.signoffs || 0} signoffs needed
                    </p>
                  </div>
                </div>
              )}
              
              <div className={`flex items-center justify-between rounded-2xl border p-4 ${rankAccentColor('Star')}`}>
                <div>
                  <p className={`text-sm font-semibold ${rankTextColor('Star')}`}>Star Rank Promotion</p>
                  <p className="text-xs text-stone-500">Minimum 4 months after First Class</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold text-stone-800">
                    {timeline.milestones.star && timeline.milestones.star.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-stone-500">
                    {badgeFocusByPhase.Star.total > 0
                      ? `${badgeFocusByPhase.Star.total} merit badges scheduled`
                      : 'Merit badge-focused phase'}
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center justify-between rounded-2xl border p-4 ${rankAccentColor('Life')}`}>
                <div>
                  <p className={`text-sm font-semibold ${rankTextColor('Life')}`}>Life Rank Promotion</p>
                  <p className="text-xs text-stone-500">Minimum 6 months after Star (10 total)</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold text-stone-800">
                    {timeline.milestones.life && timeline.milestones.life.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-stone-500">
                    {badgeFocusByPhase.Life.total > 0
                      ? `${badgeFocusByPhase.Life.total} merit badges scheduled`
                      : 'Merit badge-focused phase'}
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center justify-between rounded-2xl border p-4 ${rankAccentColor('Eagle')}`}>
                <div>
                  <p className={`text-sm font-semibold ${rankTextColor('Eagle')}`}>Eagle Scout</p>
                  <p className="text-xs text-stone-500">Minimum 6 months after Life (16 total)</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold text-stone-800">
                    {timeline.milestones.eagle && timeline.milestones.eagle.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-stone-500">
                    {timeline.remainingBadges.length} eagle-required badges still open
                  </p>
                </div>
              </div>
            </div>

            {/* All Rank Deadlines */}
            <div className="border-t border-stone-200 pt-6 mt-6 pb-6">
              <h3 className="text-lg font-semibold text-stone-800 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-stone-600" />
                All Rank Progression Deadlines
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(timeline.rankDeadlines).map(([rankName, deadline]) => {
                  if (!deadline) return null;
                  const colorClass = RANK_ACCENT_COLORS[rankNameToId[rankName] || 'rank_scout'];
                  
                  // Calculate days since last promotion (if previous date exists)
                  const previousDate = timeline.rankPreviousDates?.[rankName];
                  const daysSinceLastPromotion = previousDate 
                    ? Math.ceil((deadline.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))
                    : Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                  // Hide zero-day tiles
                  if (daysSinceLastPromotion <= 0) return null;
                  
                  return (
                    <div key={rankName} className={`rounded-2xl p-5 border ${colorClass}`}>
                      <p className="mb-1 text-xs text-stone-500">{rankName}</p>
                      <p className="text-sm font-semibold">
                        {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">
                        {daysSinceLastPromotion} days {previousDate ? 'since last' : 'from now'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase Breakdown */}
            <div className="border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between mb-3">
<h3 className="text-lg font-semibold text-stone-800">Phase Focus</h3>
<span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-3 py-1 text-sm font-medium text-stone-600">{timeline.meetingsPerMonth} meetings per month</span>
</div>

{!timeline.isAlreadyFirstClass && (
<div className="mb-4">
<p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-stone-400">
Scout Through First Class: Requirement Pace
</p>
<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
{timeline.phases.scout && timeline.phases.scout.days > 0 && (
<div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
<p className="text-xs text-stone-500 mb-1">Scout</p>
<p className={`text-2xl font-semibold ${rankTextColor('Scout')}`}>
{formatRequirementsPerMeeting(timeline.phases.scout.signoffsPerWeek, timeline.meetingsPerWeek)}
</p>
<p className="text-xs text-stone-500">requirements/meeting</p>
<p className="text-[10px] text-stone-400">
{timeline.phases.scout.signoffs} remaining sign-offs in {Math.ceil(timeline.phases.scout.days / 7)} weeks
</p>
</div>
)}
{timeline.phases.tenderfoot && timeline.phases.tenderfoot.days > 0 && (
<div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
<p className="text-xs text-stone-500 mb-1">Tenderfoot</p>
<p className={`text-2xl font-semibold ${rankTextColor('Tenderfoot')}`}>
{formatRequirementsPerMeeting(timeline.phases.tenderfoot.signoffsPerWeek, timeline.meetingsPerWeek)}
</p>
<p className="text-xs text-stone-500">requirements/meeting</p>
<p className="text-[10px] text-stone-400">
{timeline.phases.tenderfoot.signoffs} remaining sign-offs in {Math.ceil(timeline.phases.tenderfoot.days / 7)} weeks
</p>
</div>
)}
{timeline.phases.secondClass && timeline.phases.secondClass.days > 0 && (
<div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
<p className="text-xs text-stone-500 mb-1">Second Class</p>
<p className={`text-2xl font-semibold ${rankTextColor('Second Class')}`}>
{formatRequirementsPerMeeting(timeline.phases.secondClass.signoffsPerWeek, timeline.meetingsPerWeek)}
</p>
<p className="text-xs text-stone-500">requirements/meeting</p>
<p className="text-[10px] text-stone-400">
{timeline.phases.secondClass.signoffs} remaining sign-offs in {Math.ceil(timeline.phases.secondClass.days / 7)} weeks
</p>
</div>
)}
{timeline.phases.firstClass && timeline.phases.firstClass.days > 0 && (
<div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
<p className="text-xs text-stone-500 mb-1">First Class</p>
<p className={`text-2xl font-semibold ${rankTextColor('First Class')}`}>
{formatRequirementsPerMeeting(timeline.phases.firstClass.signoffsPerWeek, timeline.meetingsPerWeek)}
</p>
<p className="text-xs text-stone-500">requirements/meeting</p>
<p className="text-[10px] text-stone-400">
{timeline.phases.firstClass.signoffs} remaining sign-offs in {Math.ceil(timeline.phases.firstClass.days / 7)} weeks
</p>
</div>
)}
</div>
</div>
)}

              {isAtLeastFirstClass && (
                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-stone-400">
                    Star Through Eagle: Merit Badge Focus
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {timeline.phases.star.days > 0 && (
                      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                        <p className="text-xs text-stone-500 mb-1">Star Phase</p>
                        <p className={`text-2xl font-semibold ${rankTextColor('Star')}`}>{badgeFocusByPhase.Star.total}</p>
                        <p className="text-xs text-stone-500">merit badges scheduled</p>
                        <p className="text-[10px] text-stone-400">
                          {badgeFocusByPhase.Star.eagleRequired} eagle-required, {badgeFocusByPhase.Star.electiveSlots} electives
                        </p>
                      </div>
                    )}
                    {timeline.phases.life.days > 0 && (
                      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                        <p className="text-xs text-stone-500 mb-1">Life Phase</p>
                        <p className={`text-2xl font-semibold ${rankTextColor('Life')}`}>{badgeFocusByPhase.Life.total}</p>
                        <p className="text-xs text-stone-500">merit badges scheduled</p>
                        <p className="text-[10px] text-stone-400">
                          {badgeFocusByPhase.Life.eagleRequired} eagle-required, {badgeFocusByPhase.Life.electiveSlots} electives
                        </p>
                      </div>
                    )}
                    {timeline.phases.eagle.days > 0 && (
                      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                        <p className="text-xs text-stone-500 mb-1">Eagle Phase</p>
                        <p className={`text-2xl font-semibold ${rankTextColor('Eagle')}`}>{timeline.remainingBadges.length}</p>
                        <p className="text-xs text-stone-500">eagle-required badges still open</p>
                        <p className="text-[10px] text-stone-400">
                          {remainingBadgeRequirements} remaining merit badge requirements
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>


          </div>
        )}

        {/* Merit Badges Timeline */}
        {timeline && timelineTab === 'badges' && (
      <BadgesTab
        badgePlan={timeline.badgePlan}
        currentRankName={currentRankName}
        userChoices={userData.profile?.badgeChoices || {}}
        selectedElectiveIds={userData.profile?.electiveBadges || []}
        onUpdateChoice={(group: string, value: string) =>
          updateProfile({ badgeChoices: { ...(userData.profile?.badgeChoices || {}), [group]: value } })
        }
        onReplaceElectives={(badgeIds: string[]) =>
          updateProfile({ electiveBadges: badgeIds })
        }
        onClearBadge={async (badgeId: string) => {
          try {
            const meta: any = meritBadges.find((m: any) => m.id === badgeId);
            if (!meta || !meta.requirements) return;
            const updates: { requirementId: string; badgeId: string; completedDate: string | null }[] = [];
            for (let reqIndex = 0; reqIndex < meta.requirements.length; reqIndex++) {
              const req = meta.requirements[reqIndex];
              if (req.sub_requirements && req.sub_requirements.length > 0) {
                for (let subIndex = 0; subIndex < req.sub_requirements.length; subIndex++) {
                  updates.push({ badgeId, requirementId: `req_${reqIndex}_${subIndex}`, completedDate: null });
                }
              } else {
                updates.push({ badgeId, requirementId: `req_${reqIndex}`, completedDate: null });
              }
            }
            batchUpdateProgress(updates);
          } catch (e) {
            console.error('Failed to clear badge progress', e);
          }
        }}
        progressMap={userData.progress || {}}
        onCompleteBadge={async (badgeId: string) => {
                try {
                  const meta: any = meritBadges.find((m: any) => m.id === badgeId);
                  if (!meta || !meta.requirements) return;
                  const today = new Date().toISOString().split('T')[0];
                  const updates: { requirementId: string; badgeId: string; completedDate: string }[] = [];
                  for (let reqIndex = 0; reqIndex < meta.requirements.length; reqIndex++) {
                    const req = meta.requirements[reqIndex];
                    if (req.sub_requirements && req.sub_requirements.length > 0) {
                      for (let subIndex = 0; subIndex < req.sub_requirements.length; subIndex++) {
                        updates.push({ badgeId, requirementId: `req_${reqIndex}_${subIndex}`, completedDate: today });
                      }
                    } else {
                      updates.push({ badgeId, requirementId: `req_${reqIndex}`, completedDate: today });
                    }
                  }
                  batchUpdateProgress(updates);
                } catch (e) {
                  console.error('Failed to mark badge complete', e);
                }
              }}
          />
        )}


      </div>
    </div>
  );
}

// Badges tab component with grouped phases, choice selectors, and elective picker modal
function BadgesTab({
  badgePlan,
  currentRankName,
  userChoices,
  selectedElectiveIds,
  onUpdateChoice,
  onReplaceElectives,
  onClearBadge,
  progressMap,
  onCompleteBadge,
}: {
  badgePlan: any[];
  currentRankName: string;
  userChoices: Record<string, string>;
  selectedElectiveIds: string[];
  onUpdateChoice: (group: string, value: string) => void;
  onReplaceElectives: (badgeIds: string[]) => void;
  onClearBadge: (badgeId: string) => void;
  progressMap: Record<string, any>;
  onCompleteBadge: (badgeId: string) => void;
}) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showElectiveManager, setShowElectiveManager] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => inputRef.current?.focus(), 0);
    return () => { window.removeEventListener('keydown', onKeyDown); document.body.style.overflow = prevOverflow; };
  }, [showModal]);

  const ALL_PHASES = ['Tenderfoot', 'Second Class', 'First Class', 'Star', 'Life'] as const;
  const RANK_TO_DISPLAY_PHASE: Record<string, string> = {
    Scout: 'Tenderfoot',
    Tenderfoot: 'Tenderfoot',
    'Second Class': 'Second Class',
    'First Class': 'First Class',
    Star: 'Star',
    Life: 'Life',
    Eagle: 'Life',
  };

  const displayStart = RANK_TO_DISPLAY_PHASE[currentRankName] || 'Tenderfoot';
  const displayStartIdx = ALL_PHASES.indexOf(displayStart as any);

  // Visible headings: from current rank through Life
  const visiblePhases = ALL_PHASES.slice(displayStartIdx >= 0 ? displayStartIdx : 0);

  // Group badges: any badges from phases BEFORE the current rank get stacked into the first visible heading
  const grouped: Record<string, any[]> = {};
  for (const p of visiblePhases) grouped[p] = [];
  for (const item of badgePlan || []) {
    const itemPhaseIdx = ALL_PHASES.indexOf(item.phase as any);
    if (itemPhaseIdx < 0 || itemPhaseIdx < (displayStartIdx >= 0 ? displayStartIdx : 0)) {
      grouped[visiblePhases[0]].push(item);
    } else if (grouped[item.phase]) {
      grouped[item.phase].push(item);
    }
  }

  const electivesCatalog = meritBadges.filter((b: any) => !b.eagleRequired);
  const filteredElectives = electivesCatalog.filter((b: any) =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  const totalElectiveSlots = badgePlan.filter(b => b.isElective).length;
  const sanitizedSelectedElectiveIds = sanitizeElectiveSelection(selectedElectiveIds, totalElectiveSlots);
  const chosenIds = new Set(sanitizedSelectedElectiveIds);
  const canAddMoreElectives = chosenIds.size < totalElectiveSlots;

  function computeBadgeProgressLocal(badgeId: string) {
    return computeBadgeProgress(badgeId, progressMap);
  }

  const phaseToRankId: Record<string, string> = {
    Tenderfoot: 'rank_tenderfoot',
    'Second Class': 'rank_second_class',
    'First Class': 'rank_first_class',
    Star: 'rank_star',
    Life: 'rank_life',
  };

  return (
  <div className="app-surface rounded-2xl p-6 mb-6">
  <div className="flex items-center justify-between mb-6">
  <h2 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
  <Calendar className="w-6 h-6 text-stone-600" />
  Merit Badges Schedule
  </h2>
  <div className="flex gap-2">
  <button
  className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 font-medium"
  onClick={() => setShowModal(true)}
  >
  Browse electives
  </button>
  <button
  className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 font-medium"
  onClick={() => setShowElectiveManager(true)}
  >
  Manage electives
  </button>
  </div>
  </div>

  {visiblePhases.map((phase) => {
  const items = grouped[phase] || [];
  if (!items.length) return null;
  const rankId = phaseToRankId[phase] || 'rank_scout';
  const accentClasses = RANK_ACCENT_COLORS[rankId] || 'border-stone-200 bg-stone-50 text-stone-700';
  const textClass = RANK_TEXT_COLORS[rankId] || 'text-stone-700';
  const [borderCls, bgCls, textCls] = accentClasses.split(' ');
  const progressBg = rankId === 'rank_tenderfoot' ? 'bg-emerald-600'
    : rankId === 'rank_second_class' ? 'bg-sky-600'
    : rankId === 'rank_first_class' ? 'bg-rose-600'
    : rankId === 'rank_star' ? 'bg-violet-600'
    : rankId === 'rank_life' ? 'bg-pink-500'
    : 'bg-stone-800';
  return (
  <div key={phase} className="mb-6">
  <div className={`mb-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${borderCls} ${bgCls}`}>
  <span className={`text-sm font-semibold ${textCls}`}>{phase}</span>
  </div>
  <div className="space-y-2">
  {items
  .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  .map((b: any, idx: number) => {
  const prog = (!b.placeholder && b.id) ? computeBadgeProgressLocal(b.id) : { total: 0, completed: 0, percent: 0 };
  const isComplete = prog.percent >= 100;
  const fmtDate = (d: Date) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const btnBase = 'text-sm px-4 py-2 rounded-xl font-medium min-w-[5.5rem] text-center';
  return (
  <div
  key={`${(b.id || b.name)}-${b.phase}-${idx}`}
  className={`flex items-center gap-4 p-3 rounded-2xl border transition-colors ${isComplete ? `${bgCls} ${borderCls}` : 'bg-white border-stone-200 hover:border-stone-300'}`}
  >
  <div className="flex-1 min-w-0">
  <div className="flex items-center gap-2 mb-0.5">
  {b.id && !b.placeholder ? (
  <button
  type="button"
  onClick={() => navigate({ to: '/merit-badges/$badgeId', params: { badgeId: b.id } })}
  className={`text-sm font-semibold truncate hover:underline text-left ${isComplete ? textCls : 'text-stone-800'}`}
  >
  {b.name}
  </button>
  ) : (
  <span className={`text-sm font-semibold truncate ${isComplete ? textCls : 'text-stone-800'}`}>{b.name}</span>
  )}
  {b.isElective && !b.placeholder && (
  <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wide ${accentClasses}`}>Elective</span>
  )}
  {isComplete && <CheckCircle className={`w-4 h-4 shrink-0 ${textCls}`} />}
  </div>
  <div className="flex items-center gap-3 text-xs text-stone-500">
  <span>{fmtDate(b.startDate)}</span>
  <span className="text-stone-300">→</span>
  <span>{fmtDate(b.targetDate)}</span>
  </div>
  {b.isChoice && b.options && (
  <select
  className="mt-1 bg-white border border-stone-200 rounded-xl px-2 py-1 text-xs text-stone-700 hover:border-stone-300 focus:ring-2 focus:ring-stone-300"
  value={userChoices?.[b.choiceGroup] || b.name}
  onClick={(e) => e.stopPropagation()}
  onChange={(e) => onUpdateChoice(b.choiceGroup, e.target.value)}
  >
  {b.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
  </select>
  )}
  </div>

  {!b.placeholder && b.id && prog.total > 0 && (
  <div className="w-28 shrink-0">
  <div className="h-2 rounded-xl bg-stone-100 overflow-hidden">
  <div className={`h-full transition-all ${progressBg}`} style={{ width: `${prog.percent}%` }} />
  </div>
  <p className="text-[10px] text-stone-400 mt-0.5 text-right">{prog.percent}%</p>
  </div>
  )}

  <div className="shrink-0">
  {b.isElective && b.placeholder ? (
  <button
  className={`${btnBase} bg-white border border-stone-800 text-stone-800 hover:bg-stone-50`}
  onClick={() => setShowElectiveManager(true)}
  >
  Choose
  </button>
  ) : b.isElective && !b.placeholder ? (
  <button
  className={`${btnBase} bg-white border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50`}
  onClick={() => onReplaceElectives(sanitizeElectiveSelection(sanitizedSelectedElectiveIds.filter((id) => id !== b.id), totalElectiveSlots))}
  title="Remove elective"
  >
  Remove
  </button>
  ) : !b.placeholder && b.id && isComplete ? (
  <button
  className={`${btnBase} bg-white border border-stone-800 text-stone-800 hover:bg-stone-50`}
  onClick={() => onClearBadge(b.id)}
  >
  Clear
  </button>
  ) : !b.placeholder && b.id && !isComplete ? (
  <button
  className={`${btnBase} bg-white border border-stone-800 text-stone-800 hover:bg-stone-50`}
  onClick={() => onCompleteBadge(b.id)}
  >
  Complete
  </button>
  ) : null}
  </div>
  </div>
  );
  })}
  </div>
  </div>
  );
  })}

      {showModal && (
        <div className="fixed inset-0 z-50" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-stone-800/20" />
          <div className="absolute top-16 right-4 z-10 w-[90vw] max-w-md max-h-[70vh] overflow-hidden rounded-2xl border border-stone-200 shadow-2xl bg-white flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50 backdrop-blur">
              <h4 className="text-stone-800 font-semibold">Browse Elective Badges</h4>
              <button className="text-stone-400 hover:text-stone-800 rounded-xl px-2 py-1 hover:bg-stone-100" onClick={() => setShowModal(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 pt-3">
              <input
                className="w-full mb-3 px-3 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
                placeholder="Search electives..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                ref={inputRef}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {filteredElectives.map((b: any) => {
                const alreadyChosen = chosenIds.has(b.id);
                const prog = computeBadgeProgressLocal(b.id);
                return (
                  <div key={b.id} className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200 rounded-2xl hover:bg-stone-100 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {b.imageUrl ? (
                        <img src={b.imageUrl} alt={b.name} className="w-9 h-9 rounded-full ring-2 ring-stone-400 ring-opacity-50 object-cover" />
                      ) : (
                        <MeritBadgeIcon size={28} className="text-stone-400" />
                      )}
                      <div className="text-stone-700 text-sm truncate flex items-center gap-2">
                        {b.name}
                        {alreadyChosen && <span className="text-[10px] px-1 py-0.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-600">Added</span>}
                        {prog.percent === 100 && <CheckCircle className="w-4 h-4 text-stone-800" />}
                      </div>
                    </div>
                <button
                  className={`${btnBase} border ${
                    alreadyChosen || !canAddMoreElectives
                      ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                      : 'bg-white text-stone-800 border-stone-800 hover:bg-stone-50'
                  }`}
                  disabled={alreadyChosen || !canAddMoreElectives}
                  onClick={() => {
                    if (alreadyChosen || !canAddMoreElectives) return;
                    onReplaceElectives(sanitizeElectiveSelection([...sanitizedSelectedElectiveIds, b.id], totalElectiveSlots));
                    setShowModal(false);
                  }}
                >
                  {alreadyChosen ? 'Added' : !canAddMoreElectives ? 'Slots Full' : 'Add'}
                </button>
                  </div>
                );
              })}
              {filteredElectives.length === 0 && (
                <div className="text-center text-stone-400 text-sm py-8">No electives match your search.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showElectiveManager && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-stone-800/30" onClick={() => setShowElectiveManager(false)} />
          <div className="relative z-10 w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-stone-200 shadow-2xl bg-white flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50 backdrop-blur">
              <h4 className="text-stone-800 font-semibold flex items-center gap-2"><MeritBadgeIcon size={20} /> Manage Elective Slots</h4>
              <button className="text-stone-400 hover:text-stone-800 rounded-xl px-2 py-1 hover:bg-stone-100" onClick={() => setShowElectiveManager(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ElectiveManagerComponent
              onClose={() => setShowElectiveManager(false)}
              totalSlots={totalElectiveSlots}
              selectedIds={sanitizedSelectedElectiveIds}
              electivesCatalog={electivesCatalog}
              onReplaceElectives={onReplaceElectives}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Bulk elective manager component
const ElectiveManagerComponent = ({
  totalSlots,
  selectedIds,
  electivesCatalog,
  onReplaceElectives,
  onClose,
}: {
  totalSlots: number;
  selectedIds: string[];
  electivesCatalog: any[];
  onReplaceElectives: (badgeIds: string[]) => void;
  onClose: () => void;
}) => {
  const [localSelection, setLocalSelection] = useState<Set<string>>(new Set(selectedIds));

  const toggle = (id: string) => {
    const next = new Set(localSelection);
    if (next.has(id)) next.delete(id); else {
      if (next.size < totalSlots) next.add(id); // enforce slot limit
    }
    setLocalSelection(next);
  };

  const selectAll = () => {
    const next = new Set(localSelection);
    for (const e of electivesCatalog) {
      if (next.size >= totalSlots) break;
      if (!next.has(e.id)) next.add(e.id);
    }
    setLocalSelection(next);
  };

  const clearAll = () => setLocalSelection(new Set());

  const applyChanges = () => {
    onReplaceElectives(sanitizeElectiveSelection(Array.from(localSelection), totalSlots));
    onClose();
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-xl bg-stone-100 border border-stone-200 text-stone-800">Slots: {localSelection.size}/{totalSlots}</span>
        <button onClick={selectAll} className="px-2 py-1 rounded-xl bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 font-medium">Fill Slots</button>
        <button onClick={clearAll} className="px-2 py-1 rounded-xl bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200">Clear</button>
        <button onClick={applyChanges} className="ml-auto px-3 py-1.5 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-700">Apply</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {electivesCatalog.map(e => {
          const selected = localSelection.has(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`group text-left relative p-3 rounded-xl border transition-all ${selected ? 'border-stone-800 bg-stone-50' : 'border-stone-200 bg-stone-50 hover:border-stone-300'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {e.imageUrl ? (
                  <img src={e.imageUrl} alt={e.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-stone-400/40" />
                ) : (
                  <MeritBadgeIcon size={32} className="text-stone-800" />
                )}
                <span className="text-xs font-semibold text-stone-700 truncate flex-1">{e.name}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span className="inline-flex items-center gap-1">
                  <span className={`w-3 h-3 rounded-full border ${selected ? 'bg-stone-800 border-stone-800' : 'bg-transparent border-stone-400 group-hover:border-stone-800'}`} />
                  {selected ? 'Selected' : 'Tap to select'}
                </span>
                {e.eagleRequired && <span className="text-stone-700">Eagle Req?</span>}
              </div>
            </button>
          );
        })}
      </div>
      {electivesCatalog.length === 0 && (
        <div className="text-center text-stone-400 text-sm py-12">No electives available.</div>
      )}
    </div>
  );
};
