import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, useEffect, useRef } from 'react';
import { AlertTriangle, ArrowLeft, Calendar, Target, Award, Clock, Loader2, TrendingUp, CheckCircle, X } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import meritBadgesData from '../data/merit-badges.json';
import { MeritBadgeIcon } from '../components/ScoutIcons';
import { buildTimelineState } from '../lib/buildTimeline';
import { getRankDisplayName } from '../lib/constants';
import type { BadgePlanItem, TimelineState } from '../lib/timelineTypes';

const meritBadges = meritBadgesData.meritBadges;
const PRE_FIRST_CLASS_RANKS = ['Scout', 'Tenderfoot', 'Second Class', 'First Class'];

function formatRequirementsPerMeeting(signoffsPerWeek: string | number, meetingsPerWeek: number) {
  const weeklyRate = Number(signoffsPerWeek || 0);
  if (!meetingsPerWeek || meetingsPerWeek <= 0) return weeklyRate.toFixed(1);

  const perMeeting = weeklyRate / meetingsPerWeek;
  return Number.isInteger(perMeeting) ? String(perMeeting) : perMeeting.toFixed(1);
}

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
  const { userData, updateProfile, updateProgress } = useUserData();
  const [timelineTab, setTimelineTab] = useState<'signoffs' | 'badges'>('signoffs');

  // Calculate timeline using the shared builder (DRY)
  const timelineState: TimelineState = useMemo(() => {
    return buildTimelineState(userData);
  }, [userData]);

  // Auto-selection disabled to let users choose their own options and electives

  if (!userData) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const targetDate = userData.profile?.targetEagleDate
    ? new Date(userData.profile.targetEagleDate)
    : null;

  const daysUntilEagle = targetDate
    ? Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (!targetDate) {
    return (
      <div className="app-shell light-overrides min-h-screen">
        <div className="app-shell__grid fixed inset-0" />
        <div className="app-shell__glow app-shell__glow--top fixed" />
        <div className="app-shell__glow app-shell__glow--bottom fixed" />
        <div className="app-shell__content max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
          <div className="app-surface rounded-2xl p-12 text-center">
            <Target className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Set Your Eagle Target Date</h2>
            <p className="text-slate-600 mb-6">
              Go to your profile to set a target Eagle Scout date to see your personalized timeline.
            </p>
            <button
              onClick={() => navigate({ to: '/profile' })}
              className="px-6 py-3 bg-linear-to-r from-emerald-600 to-sky-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-sky-500 transition-all"
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
  const isMeritBadgeFocusedTimeline = timeline
    ? ['Star', 'Life', 'Eagle'].includes(timeline.currentRankName)
    : false;
  const preFirstClassRequirementsRemaining = rankRequirementItems.reduce(
    (total, rank) => total + rank.requirementsRemaining,
    0,
  );

  return (
    <div className="app-shell light-overrides min-h-screen">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      <div className="app-shell__content max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Hero Section */}
        <div className="app-surface rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-linear-to-br from-emerald-600 to-sky-600 rounded-xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Eagle Scout Timeline</h1>
              <p className="text-slate-600">Your personalized path to achievement</p>
            </div>
          </div>

          {targetDate && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm text-slate-600">Target Date</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-sky-600" />
                  <span className="text-sm text-slate-600">Days Remaining</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {daysUntilEagle && daysUntilEagle > 0 ? daysUntilEagle : '—'}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-slate-600">Current Rank</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {userData.profile?.currentRank
                    ? getRankDisplayName(userData.profile.currentRank)
                    : 'Scout'}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm text-slate-600">
                    {isMeritBadgeFocusedTimeline ? 'Open Merit Badges' : 'Signoffs Needed'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {timeline
                    ? isMeritBadgeFocusedTimeline
                      ? timeline.remainingBadges.length
                      : preFirstClassRequirementsRemaining || timeline.totalSignoffsNeeded
                    : '—'}
                </p>
              </div>
              {/* Meetings per month display + target signoffs per meeting (editable only in Profile) */}
              {timeline && (
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm text-slate-600">Meetings/mo</span>
                    </div>
                    <span className="text-xs text-slate-600">
                      {isMeritBadgeFocusedTimeline
                        ? `Open badges: ${timeline.remainingBadges.length}`
                        : `Target/mtg: ${timeline.signoffsPerMeetingTarget ?? Math.max(1, Math.round(timeline.adjustedReqsPerMeeting))}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-900 font-semibold">
                      {(userData.profile?.meetingsPerMonthOverride ?? timeline.meetingsPerMonth).toString()}
                    </span>
                    <button
                      onClick={() => navigate({ to: '/profile' })}
                      className="text-xs text-slate-600 underline hover:text-slate-900"
                    >
                      Edit in Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error banner when timeline state is not ok */}
        {!timelineState.ok && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{timelineState.error.message}</span>
          </div>
        )}
        {/* Tabs */}
        {timeline && (
          <div className="mb-4 flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg border ${timelineTab === 'signoffs' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setTimelineTab('signoffs')}
            >
              Signoffs Timeline
            </button>
            <button
              className={`px-4 py-2 rounded-lg border ${timelineTab === 'badges' ? 'bg-sky-100 border-sky-300 text-sky-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
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
              <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-800">
                  <AlertTriangle className="h-4 w-4" />
                  Incomplete requirements from previous ranks
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(timeline as any).prevRankCarryovers.map((r: any) => (
                    <div key={r.rankId} className="rounded-md border border-rose-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">{r.rankName}</p>
                        <span className="text-xs text-rose-700">{r.missing}/{r.total} left</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600">These must be finished before advancing.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Pace warning based on remaining signoffs vs time */}
            {(() => {
              if (!timeline || !userData?.profile?.targetEagleDate) return null;
              const targetDate = new Date(userData.profile.targetEagleDate);
              const daysLeft = Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 0) return null;
              const weeksLeft = Math.max(1, daysLeft / 7);
              const weeklyNeeded = (timeline.totalSignoffsNeeded || 0) / weeksLeft;
              const meetingsPerMonth = (timeline as any).meetingsPerMonth || 4;
              const meetingsPerWeek = meetingsPerMonth / 4;
              if (weeklyNeeded >= 5) {
                return (
                  <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                      <AlertTriangle className="h-4 w-4" />
                      Pace alert: ~{weeklyNeeded.toFixed(1)} signoffs/week needed to hit your target
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Consider doubling up at meetings (≈{meetingsPerWeek.toFixed(1)}/week), doing at-home signoffs, and prioritizing quick wins while starting time-consuming badges now.
                    </p>
                  </div>
                );
              } else if (weeklyNeeded >= 3) {
                return (
                  <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      Heads up: ~{weeklyNeeded.toFixed(1)} signoffs/week recommended to stay on track
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Aim to secure signoffs weekly and line up counselor check-ins. Keep time-consuming badges running in parallel.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-600" />
              Key Milestone Dates
            </h2>
            
            {/* Milestone Timeline */}
            <div className="space-y-3 mb-6">
              {/* Tenderfoot Promotion */}
              {timeline.rankDeadlines['Tenderfoot'] && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Tenderfoot Promotion</p>
                    <p className="text-xs text-slate-600">Next rank after Scout</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {timeline.rankDeadlines['Tenderfoot']!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-600">
                      {(timeline.remainingRanks.find(r => r.title === 'Tenderfoot')?.requirementsRemaining ?? 0)} signoffs remaining
                    </p>
                  </div>
                </div>
              )}

              {/* Second Class Promotion */}
              {timeline.rankDeadlines['Second Class'] && (
                <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-sky-800">Second Class Promotion</p>
                    <p className="text-xs text-slate-600">After Tenderfoot</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {timeline.rankDeadlines['Second Class']!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-600">
                      {(timeline.remainingRanks.find(r => r.title === 'Second Class')?.requirementsRemaining ?? 0)} signoffs remaining
                    </p>
                  </div>
                </div>
              )}

              {!timeline.isAlreadyFirstClass && (
                <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">First Class Promotion</p>
                    <p className="text-xs text-slate-600">Complete all pre-First Class requirements</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {timeline.milestones.firstClass && timeline.milestones.firstClass.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-600">
                      {(timeline.phases.preFirstClass as any)?.signoffs || 0} signoffs needed
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-violet-800">Star Rank Promotion</p>
                  <p className="text-xs text-slate-600">Minimum 4 months after First Class</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">
                    {timeline.milestones.star && timeline.milestones.star.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-600">
                    {badgeFocusByPhase.Star.total > 0
                      ? `${badgeFocusByPhase.Star.total} merit badges scheduled`
                      : 'Merit badge-focused phase'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-cyan-800">Life Rank Promotion</p>
                  <p className="text-xs text-slate-600">Minimum 6 months after Star (10 total)</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">
                    {timeline.milestones.life && timeline.milestones.life.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-600">
                    {badgeFocusByPhase.Life.total > 0
                      ? `${badgeFocusByPhase.Life.total} merit badges scheduled`
                      : 'Merit badge-focused phase'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-amber-800">Eagle Scout</p>
                  <p className="text-xs text-slate-600">Minimum 6 months after Life (16 total)</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">
                    {timeline.milestones.eagle && timeline.milestones.eagle.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-600">
                    {timeline.remainingBadges.length} eagle-required badges still open
                  </p>
                </div>
              </div>
            </div>

            {/* All Rank Deadlines */}
            <div className="border-t border-slate-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                All Rank Progression Deadlines
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(timeline.rankDeadlines).map(([rankName, deadline]) => {
                  if (!deadline) return null;
                  
                  const rankColors: { [key: string]: string } = {
                    'Scout': 'text-slate-800 border-slate-200 bg-slate-50',
                    'Tenderfoot': 'text-emerald-800 border-emerald-200 bg-emerald-50',
                    'Second Class': 'text-sky-800 border-sky-200 bg-sky-50',
                    'First Class': 'text-indigo-800 border-indigo-200 bg-indigo-50',
                    'Star': 'text-violet-800 border-violet-200 bg-violet-50',
                    'Life': 'text-cyan-800 border-cyan-200 bg-cyan-50',
                    'Eagle': 'text-amber-800 border-amber-200 bg-amber-50',
                  };
                  
                  const colorClass = rankColors[rankName] || 'text-slate-900 border-slate-200 bg-white';
                  
                  // Calculate days since last promotion (if previous date exists)
                  const previousDate = timeline.rankPreviousDates?.[rankName];
                  const daysSinceLastPromotion = previousDate 
                    ? Math.ceil((deadline.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))
                    : Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                  // Hide zero-day tiles
                  if (daysSinceLastPromotion <= 0) return null;
                  
                  return (
                    <div key={rankName} className={`rounded-lg p-3 border ${colorClass}`}>
                      <p className="mb-1 text-xs text-slate-600">{rankName}</p>
                      <p className="text-sm font-bold">
                        {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {daysSinceLastPromotion} days {previousDate ? 'since last' : 'from now'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase Breakdown */}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Phase Focus</h3>

              <div className="mb-4">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Scout Through First Class: Requirement Pace
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {timeline.phases.scout && timeline.phases.scout.days > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-600 mb-1">Scout</p>
                      <p className="text-2xl font-bold text-slate-700">
                        {formatRequirementsPerMeeting(timeline.phases.scout.signoffsPerWeek, timeline.meetingsPerWeek)}
                      </p>
                      <p className="text-xs text-slate-600">requirements/meeting</p>
                      <p className="text-[10px] text-slate-500">
                        {timeline.phases.scout.signoffs} remaining sign-offs in {Math.ceil(timeline.phases.scout.days / 7)} weeks
                      </p>
                    </div>
                  )}
                  {timeline.phases.tenderfoot && timeline.phases.tenderfoot.days > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-600 mb-1">Tenderfoot</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {formatRequirementsPerMeeting(timeline.phases.tenderfoot.signoffsPerWeek, timeline.meetingsPerWeek)}
                      </p>
                      <p className="text-xs text-slate-600">requirements/meeting</p>
                      <p className="text-[10px] text-slate-500">
                        {timeline.phases.tenderfoot.signoffs} remaining sign-offs in {Math.ceil(timeline.phases.tenderfoot.days / 7)} weeks
                      </p>
                    </div>
                  )}
                  {timeline.phases.secondClass && timeline.phases.secondClass.days > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-600 mb-1">Second Class</p>
                      <p className="text-2xl font-bold text-sky-700">
                        {formatRequirementsPerMeeting(timeline.phases.secondClass.signoffsPerWeek, timeline.meetingsPerWeek)}
                      </p>
                      <p className="text-xs text-slate-600">requirements/meeting</p>
                      <p className="text-[10px] text-slate-500">
                        {timeline.phases.secondClass.signoffs} remaining sign-offs in {Math.ceil(timeline.phases.secondClass.days / 7)} weeks
                      </p>
                    </div>
                  )}
                  {timeline.phases.firstClass && timeline.phases.firstClass.days > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-600 mb-1">First Class</p>
                      <p className="text-2xl font-bold text-indigo-700">
                        {formatRequirementsPerMeeting(timeline.phases.firstClass.signoffsPerWeek, timeline.meetingsPerWeek)}
                      </p>
                      <p className="text-xs text-slate-600">requirements/meeting</p>
                      <p className="text-[10px] text-slate-500">
                        {timeline.phases.firstClass.signoffs} remaining sign-offs in {Math.ceil(timeline.phases.firstClass.days / 7)} weeks
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Star Through Eagle: Merit Badge Focus
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {timeline.phases.star.days > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-600 mb-1">Star Phase</p>
                      <p className="text-2xl font-bold text-violet-700">{badgeFocusByPhase.Star.total}</p>
                      <p className="text-xs text-slate-600">merit badges scheduled</p>
                      <p className="text-[10px] text-slate-500">
                        {badgeFocusByPhase.Star.eagleRequired} eagle-required, {badgeFocusByPhase.Star.electiveSlots} electives
                      </p>
                    </div>
                  )}
                  {timeline.phases.life.days > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-600 mb-1">Life Phase</p>
                      <p className="text-2xl font-bold text-cyan-700">{badgeFocusByPhase.Life.total}</p>
                      <p className="text-xs text-slate-600">merit badges scheduled</p>
                      <p className="text-[10px] text-slate-500">
                        {badgeFocusByPhase.Life.eagleRequired} eagle-required, {badgeFocusByPhase.Life.electiveSlots} electives
                      </p>
                    </div>
                  )}
                  {timeline.phases.eagle.days > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                      <p className="text-xs text-slate-600 mb-1">Eagle Phase</p>
                      <p className="text-2xl font-bold text-amber-700">{timeline.remainingBadges.length}</p>
                      <p className="text-xs text-slate-600">eagle-required badges still open</p>
                      <p className="text-[10px] text-slate-500">
                        {remainingBadgeRequirements} remaining merit badge requirements
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-800">
                <strong>Smart Timeline:</strong> Time allocation adjusts based on your progress. Base ratios: Scout=1/10, Tenderfoot=3/10, Second Class=1/2, First Class=2/5 of Eagle phase.
                If you've completed 50% of a rank, it gets 50% of the time. 
                {!timeline.isAlreadyFirstClass && timeline.milestones.firstClass && ` Complete First Class by ${timeline.milestones.firstClass.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}, then`}
                {' '}shift the focus to merit badges during Star, Life, and the final push to Eagle.
              </p>
            </div>
          </div>
        )}

        {/* Merit Badges Timeline */}
        {timeline && timelineTab === 'badges' && (
          <BadgesTab
            badgePlan={timeline.badgePlan}
            userChoices={userData.profile?.badgeChoices || {}}
            selectedElectiveIds={userData.profile?.electiveBadges || []}
            onUpdateChoice={(group: string, value: string) =>
              updateProfile({ badgeChoices: { ...(userData.profile?.badgeChoices || {}), [group]: value } })
            }
            onReplaceElectives={(badgeIds: string[]) =>
              updateProfile({ electiveBadges: badgeIds })
            }
            progressMap={userData.progress || {}}
            onCompleteBadge={async (badgeId: string) => {
              try {
                const meta: any = meritBadges.find((m: any) => m.id === badgeId);
                if (!meta || !meta.requirements) return;
                const today = new Date().toISOString().split('T')[0];
                for (let reqIndex = 0; reqIndex < meta.requirements.length; reqIndex++) {
                  const req = meta.requirements[reqIndex];
                  if (req.sub_requirements && req.sub_requirements.length > 0) {
                    for (let subIndex = 0; subIndex < req.sub_requirements.length; subIndex++) {
                      updateProgress({ badgeId, requirementId: `req_${reqIndex}_${subIndex}`, completedDate: today });
                    }
                  } else {
                    updateProgress({ badgeId, requirementId: `req_${reqIndex}`, completedDate: today });
                  }
                }
              } catch (e) {
                console.error('Failed to mark badge complete', e);
              }
            }}
          />
        )}

        {/* Requirements Summary */}
        {timeline && (rankRequirementItems.length > 0 || timeline.remainingBadges.length > 0) && (
          <div className="app-surface rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-emerald-600" />
              Requirements Breakdown
            </h2>

            {/* Remaining Ranks */}
            {rankRequirementItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Rank Requirements: Scout Through First Class
                </h3>
                <div className="space-y-2">
                  {rankRequirementItems.map((rank) => (
                    <div
                      key={rank.id}
                      className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-amber-300 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-amber-600" />
                        <div>
                          <p className="text-slate-900 font-medium">{rank.title}</p>
                          <p className="text-sm text-slate-600">{rank.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-700">{rank.requirementsRemaining}</p>
                        <p className="text-xs text-slate-600">remaining</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remaining Merit Badges */}
            {timeline.remainingBadges.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  Merit Badge Focus: Star Through Eagle
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {timeline.remainingBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-sky-300 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {(() => {
                          const meta = meritBadges.find((x: any) => (x.id && badge.id && x.id === badge.id) || x.name.toLowerCase() === badge.title.toLowerCase());
                          const url = meta?.imageUrl;
                          const colorClass = 'text-blue-400';
                          return url ? (
                            <img src={url} alt={badge.title} className={`w-9 h-9 rounded-full ring-2 ${colorClass} ring-opacity-50 object-cover`} />
                          ) : (
                            <MeritBadgeIcon size={28} className={colorClass} />
                          );
                        })()}
                        <div className="min-w-0">
                          <p className="text-slate-900 font-medium text-sm truncate">{badge.title}</p>
                          <p className="text-xs text-slate-600 truncate">{badge.description}</p>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-lg font-bold text-sky-700">{badge.requirementsRemaining}</p>
                        <p className="text-[10px] text-slate-600">reqs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Badges tab component with grouped phases, choice selectors, and elective picker modal
function BadgesTab({
  badgePlan,
  userChoices,
  selectedElectiveIds,
  onUpdateChoice,
  onReplaceElectives,
  progressMap,
  onCompleteBadge,
}: {
  badgePlan: any[];
  userChoices: Record<string, string>;
  selectedElectiveIds: string[];
  onUpdateChoice: (group: string, value: string) => void;
  onReplaceElectives: (badgeIds: string[]) => void;
  progressMap: Record<string, any>;
  onCompleteBadge: (badgeId: string) => void;
}) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showElectiveManager, setShowElectiveManager] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Lock background scroll and support Esc to close when modal is open
  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus search input on open
    setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showModal]);

  const phasesOrder = ['Tenderfoot', 'Second Class', 'First Class', 'Star', 'Life'];
  const grouped: Record<string, any[]> = {};
  for (const p of phasesOrder) grouped[p] = [];
  for (const item of badgePlan || []) {
    if (!grouped[item.phase]) grouped[item.phase] = [];
    grouped[item.phase].push(item);
  }

  const electivesCatalog = meritBadges.filter((b: any) => !b.eagleRequired);
  const filteredElectives = electivesCatalog.filter((b: any) =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  const colorPalette = [
    'text-emerald-400',
    'text-sky-400',
    'text-amber-400',
    'text-pink-400',
    'text-purple-400',
    'text-blue-400',
    'text-teal-400',
  ];
  const colorFor = (idOrName: string) => {
    let hash = 0;
    for (let i = 0; i < idOrName.length; i++) {
      hash = (hash * 31 + idOrName.charCodeAt(i)) >>> 0;
    }
    return colorPalette[hash % colorPalette.length];
  };

  // Elective tracking
  const totalElectiveSlots = badgePlan.filter(b => b.isElective).length;
  const sanitizedSelectedElectiveIds = sanitizeElectiveSelection(selectedElectiveIds, totalElectiveSlots);
  const chosenIds = new Set(sanitizedSelectedElectiveIds);
  const canAddMoreElectives = chosenIds.size < totalElectiveSlots;

  // Compute badge progress (requirements completion %) for a badge id
  function computeBadgeProgress(badgeId: string) {
    const meta: any = meritBadges.find((m: any) => m.id === badgeId);
    if (!meta || !meta.requirements || meta.requirements.length === 0) {
      return { total: 0, completed: 0, percent: 0 };
    }
    const progress = progressMap[badgeId] || {};
    let total = 0;
    let completed = 0;
    meta.requirements.forEach((req: any, reqIndex: number) => {
      if (req.sub_requirements && req.sub_requirements.length > 0) {
        let completedSubs = 0;
        req.sub_requirements.forEach((_: any, subIndex: number) => {
          if (progress[`req_${reqIndex}_${subIndex}`]) completedSubs++;
        });
        const requiredCount = req.requiredCount || req.sub_requirements.length;
        total += requiredCount;
        completed += Math.min(completedSubs, requiredCount);
      } else {
        total += 1;
        if (progress[`req_${reqIndex}`]) completed += 1;
      }
    });
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }

  return (
    <div className="app-surface rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-sky-600" />
          Merit Badges Schedule
        </h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 text-sm rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={() => setShowModal(true)}
          >
            Browse electives
          </button>
          <button
            className="px-3 py-2 text-sm rounded-md bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
            onClick={() => setShowElectiveManager(true)}
          >
            Manage electives
          </button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-700">
        <span className="px-2 py-1 rounded bg-sky-50 border border-sky-200 text-sky-800">
          Electives: {sanitizedSelectedElectiveIds.length}/{totalElectiveSlots}
        </span>
        {sanitizedSelectedElectiveIds.length > 0 && (
          <span className="text-slate-600">Remove an elective to free a slot.</span>
        )}
      </div>

      {phasesOrder.map((phase) => {
        const items = grouped[phase] || [];
        if (!items.length) return null;
        return (
          <div key={phase} className="mb-4">
            <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-200 bg-linear-to-r from-indigo-50 to-sky-50">
              <span className="text-xs font-semibold text-slate-800">{phase}</span>
            </div>
            <div className="space-y-2">
              {items
                .sort((a: any, b: any) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
                .map((b: any, idx: number) => (
                <div
                  key={`${(b.id || b.name)}-${b.phase}-${idx}`}
                  className={`flex flex-col gap-2 p-3 rounded-lg transition-colors ${b.isElective ? 'bg-amber-50 border border-amber-200 hover:border-amber-300' : 'bg-white border border-slate-200 hover:border-sky-300'}`}
                >
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const meta = meritBadges.find((x: any) => (x.id && b.id && x.id === b.id) || x.name.toLowerCase() === b.name.toLowerCase());
                        const url = meta?.imageUrl;
                        const colorClass = colorFor(b.id || b.name);
                        return url ? (
                          <img src={url} alt={b.name} className={`w-9 h-9 rounded-full ring-2 ${colorClass} ring-opacity-50 object-cover`} />
                        ) : (
                          <MeritBadgeIcon size={28} className={colorClass} />
                        );
                      })()}
                      <div className="min-w-0">
                        <p className="text-sm text-slate-900 font-semibold truncate flex items-center gap-2">
                          {b.id && !b.placeholder ? (
                            <button
                              type="button"
                              onClick={() => {
                                navigate({
                                  to: '/merit-badges/$badgeId',
                                  params: { badgeId: b.id },
                                });
                              }}
                              className="truncate text-left transition-colors hover:text-sky-700"
                            >
                              {b.name}
                            </button>
                          ) : (
                            <span className="truncate">{b.name}</span>
                          )}
                          {b.note ? (
                            <span className="ml-1 text-xs text-slate-600">({b.note})</span>
                          ) : null}
                          {b.isElective && !b.placeholder && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">Elective</span>
                          )}
                          {b.id && computeBadgeProgress(b.id).percent === 100 && (
                            <span className="inline-flex items-center" aria-label="Completed">
                              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-600 flex flex-wrap gap-x-2 gap-y-1">
                          <span>Finish: {new Date(b.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          {b.wave !== null && b.wave !== undefined && (
                            <span>• Wave {b.wave === 1 ? '1 (mid-phase)' : '2 (end-phase)'}</span>
                          )}
                          <span>• Duration: {b.durationWeeks}w{b.accelerated ? ' accelerated' : ''}</span>
                          <span>• Start: {new Date(b.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        </p>
                        {b.isChoice && b.options && (
                          <div className="mt-1 text-xs text-slate-700 flex items-center gap-2">
                            <span className="text-slate-600">Choose:</span>
                            <select
                              className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 hover:border-sky-300"
                              value={userChoices?.[b.choiceGroup] || b.name}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => onUpdateChoice(b.choiceGroup, e.target.value)}
                            >
                              {b.options.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      {b.isElective && (
                        b.placeholder ? (
                          <button
                            className="text-xs px-2 py-1 rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                            onClick={() => setShowElectiveManager(true)}
                          >
                            Choose elective
                          </button>
                        ) : (
                          <button
                            className="text-xs px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                            onClick={() =>
                              onReplaceElectives(
                                sanitizeElectiveSelection(
                                  sanitizedSelectedElectiveIds.filter((id) => id !== b.id),
                                  totalElectiveSlots,
                                ),
                              )
                            }
                            title="Remove elective"
                          >
                            Remove
                          </button>
                        )
                      )}
                      {/* Mark as complete for merit badges */}
                      {!b.placeholder && b.id && (() => {
                        const prog = computeBadgeProgress(b.id);
                        if (prog.percent >= 100) return null;
                        return (
                          <button
                            className="mt-2 text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            onClick={() => onCompleteBadge(b.id)}
                            title="Mark entire badge complete"
                          >
                            Mark as complete
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                  {b.id && !b.placeholder && (() => {
                    const prog = computeBadgeProgress(b.id);
                    if (prog.total === 0) return null;
                    const pct = prog.percent;
                    return (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full bg-linear-to-r from-blue-500 to-purple-500 transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-600 w-12 text-right">{pct}%</span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-slate-900/35" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-[90vw] max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-linear-to-r from-indigo-50 to-sky-50 backdrop-blur">
              <h4 className="text-slate-900 font-semibold">Browse Elective Badges</h4>
              <button
                className="text-slate-500 hover:text-slate-900 rounded-md px-2 py-1 hover:bg-slate-100"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 pt-3">
              <input
                className="w-full mb-3 px-3 py-2 rounded-md bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                placeholder="Search electives..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                ref={inputRef}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {filteredElectives.map((b: any) => {
                const colorClass = colorFor(b.id || b.name);
                const url = b.imageUrl;
                const alreadyChosen = chosenIds.has(b.id);
                const prog = computeBadgeProgress(b.id);
                return (
                  <div key={b.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {url ? (
                        <img src={url} alt={b.name} className={`w-9 h-9 rounded-full ring-2 ${colorClass} ring-opacity-50 object-cover`} />
                      ) : (
                        <MeritBadgeIcon size={28} className={colorClass} />
                      )}
                      <div className="text-slate-800 text-sm truncate flex items-center gap-2">
                        {b.name}
                        {alreadyChosen && <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-emerald-700">Added</span>}
                        {prog.percent === 100 && (
                          <span className="inline-flex items-center" aria-label="Completed">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className={`text-xs px-2 py-1 rounded border ${
                        alreadyChosen || !canAddMoreElectives
                          ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      disabled={alreadyChosen || !canAddMoreElectives}
                      onClick={() => {
                        if (alreadyChosen || !canAddMoreElectives) return;
                        onReplaceElectives(
                          sanitizeElectiveSelection(
                            [...sanitizedSelectedElectiveIds, b.id],
                            totalElectiveSlots,
                          ),
                        );
                        setShowModal(false);
                      }}
                    >
                      {alreadyChosen ? 'Added' : !canAddMoreElectives ? 'Slots Full' : 'Add'}
                    </button>
                  </div>
                );
              })}
              {filteredElectives.length === 0 && (
                <div className="text-center text-slate-500 text-sm py-8">No electives match your search.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showElectiveManager && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-slate-900/35" onClick={() => setShowElectiveManager(false)} />
          <div className="relative z-10 w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-amber-200 shadow-2xl bg-white flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-amber-200 bg-amber-50 backdrop-blur">
              <h4 className="text-amber-800 font-semibold flex items-center gap-2"><MeritBadgeIcon size={20} /> Manage Elective Slots</h4>
              <button
                className="text-amber-700 hover:text-amber-900 rounded-md px-2 py-1 hover:bg-amber-100"
                onClick={() => setShowElectiveManager(false)}
                aria-label="Close"
              >
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
        <span className="px-2 py-1 rounded bg-amber-100 border border-amber-200 text-amber-800">Slots: {localSelection.size}/{totalSlots}</span>
        <button onClick={selectAll} className="px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100">Fill Slots</button>
        <button onClick={clearAll} className="px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200">Clear</button>
        <button onClick={applyChanges} className="ml-auto px-3 py-1.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">Apply</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {electivesCatalog.map(e => {
          const selected = localSelection.has(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`group text-left relative p-3 rounded-lg border transition-all ${selected ? 'border-amber-300 bg-amber-100' : 'border-slate-200 bg-slate-50 hover:border-amber-300'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {e.imageUrl ? (
                  <img src={e.imageUrl} alt={e.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-amber-400/40" />
                ) : (
                  <MeritBadgeIcon size={32} className="text-amber-700" />
                )}
                <span className="text-xs font-semibold text-slate-800 truncate flex-1">{e.name}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <span className={`w-3 h-3 rounded-full border ${selected ? 'bg-amber-400 border-amber-300' : 'bg-transparent border-slate-400 group-hover:border-amber-400'}`} />
                  {selected ? 'Selected' : 'Tap to select'}
                </span>
                {e.eagleRequired && <span className="text-rose-700">Eagle Req?</span>}
              </div>
            </button>
          );
        })}
      </div>
      {electivesCatalog.length === 0 && (
        <div className="text-center text-slate-500 text-sm py-12">No electives available.</div>
      )}
    </div>
  );
};
