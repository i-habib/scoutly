import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Target, Award, Clock, Loader2, TrendingUp, CheckCircle } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import meritBadgesData from '../data/merit-badges.json';
import { MeritBadgeIcon } from '../components/ScoutIcons';
import { buildTimelineState } from '../lib/buildTimeline';
import type { TimelineState } from '../lib/timelineTypes';

const meritBadges = meritBadgesData.meritBadges;

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
      <div className="bg-black min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
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
      <div className="bg-black min-h-screen">
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-12 text-center">
            <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Set Your Eagle Target Date</h2>
            <p className="text-slate-400 mb-6">
              Go to your profile to set a target Eagle Scout date to see your personalized timeline.
            </p>
            <button
              onClick={() => navigate({ to: '/profile' })}
              className="px-6 py-3 bg-linear-to-r from-green-500 to-cyan-600 text-black font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Go to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timeline = timelineState.ok ? timelineState : undefined;

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Dotted Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      {/* Gradient Glow */}
      <div className="fixed -top-1/4 -left-1/4 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Hero Section */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-linear-to-br from-green-500 to-cyan-600 rounded-xl">
              <TrendingUp className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Eagle Scout Timeline</h1>
              <p className="text-green-300">Your personalized path to achievement</p>
            </div>
          </div>

          {targetDate && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-slate-400">Target Date</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-slate-400">Days Remaining</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {daysUntilEagle && daysUntilEagle > 0 ? daysUntilEagle : '—'}
                </p>
              </div>

              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-slate-400">Current Rank</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {userData.profile?.currentRank || 'Scout'}
                </p>
              </div>

              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-slate-400">Signoffs Needed</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {timeline?.totalSignoffsNeeded || '—'}
                </p>
              </div>
              {/* Meetings per month display + target signoffs per meeting (editable only in Profile) */}
              {timeline && (
                <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-slate-400">Meetings/mo</span>
                    </div>
                    <span className="text-xs text-slate-500">Target/mtg: {timeline.signoffsPerMeetingTarget ?? Math.max(1, Math.round(timeline.adjustedReqsPerMeeting))}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-semibold">
                      {(userData.profile?.meetingsPerMonthOverride ?? timeline.meetingsPerMonth).toString()}
                    </span>
                    <button
                      onClick={() => navigate({ to: '/profile' })}
                      className="text-xs text-slate-300 underline hover:text-white"
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
          <div className="mb-4 p-4 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
            ⚠ {timelineState.error.message}
          </div>
        )}
        {/* Tabs */}
        {timeline && (
          <div className="mb-4 flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg border ${timelineTab === 'signoffs' ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
              onClick={() => setTimelineTab('signoffs')}
            >
              Signoffs Timeline
            </button>
            <button
              className={`px-4 py-2 rounded-lg border ${timelineTab === 'badges' ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
              onClick={() => setTimelineTab('badges')}
            >
              Merit Badges Timeline
            </button>
          </div>
        )}

        {/* Timeline Stats */}
        {timeline && timelineTab === 'signoffs' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6 mb-6">
            {/* Carry-over previous rank warnings */}
            {Array.isArray((timeline as any).prevRankCarryovers) && (timeline as any).prevRankCarryovers.length > 0 && (
              <div className="mb-5 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
                <p className="text-sm font-semibold text-red-300 mb-2 flex items-center gap-2">
                  <span aria-hidden>⚠️</span>
                  Incomplete requirements from previous ranks
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(timeline as any).prevRankCarryovers.map((r: any) => (
                    <div key={r.rankId} className="p-3 rounded-md bg-red-900/20 border border-red-500/30">
                      <div className="flex items-center justify-between">
                        <p className="text-red-200 font-medium text-sm">{r.rankName}</p>
                        <span className="text-red-300 text-xs">{r.missing}/{r.total} left</span>
                      </div>
                      {/* Keep it concise; could list specific req IDs if needed */}
                      <p className="text-[11px] text-red-300/80 mt-1">These must be finished before advancing.</p>
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
                  <div className="mb-5 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
                    <p className="text-sm text-red-200 font-semibold flex items-center gap-2">
                      <span aria-hidden>⚠️</span>
                      Pace alert: ~{weeklyNeeded.toFixed(1)} signoffs/week needed to hit your target
                    </p>
                    <p className="text-[11px] text-red-200/80 mt-1">
                      Consider doubling up at meetings (≈{meetingsPerWeek.toFixed(1)}/week), doing at-home signoffs, and prioritizing quick wins while starting time-consuming badges now.
                    </p>
                  </div>
                );
              } else if (weeklyNeeded >= 3) {
                return (
                  <div className="mb-5 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
                    <p className="text-sm text-amber-200 font-semibold flex items-center gap-2">
                      <span aria-hidden>⚠️</span>
                      Heads up: ~{weeklyNeeded.toFixed(1)} signoffs/week recommended to stay on track
                    </p>
                    <p className="text-[11px] text-amber-200/80 mt-1">
                      Aim to secure signoffs weekly and line up counselor check-ins. Keep time-consuming badges running in parallel.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-green-500" />
              Key Milestone Dates
            </h2>
            
            {/* Milestone Timeline */}
            <div className="space-y-3 mb-6">
              {/* Tenderfoot Promotion */}
              {timeline.rankDeadlines['Tenderfoot'] && (
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div>
                    <p className="text-sm text-green-300 font-semibold">Tenderfoot Promotion</p>
                    <p className="text-xs text-slate-400">Next rank after Scout</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-400">
                      {timeline.rankDeadlines['Tenderfoot']!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(timeline.remainingRanks.find(r => r.title === 'Tenderfoot')?.requirementsRemaining ?? 0)} signoffs remaining
                    </p>
                  </div>
                </div>
              )}

              {/* Second Class Promotion */}
              {timeline.rankDeadlines['Second Class'] && (
                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-300 font-semibold">Second Class Promotion</p>
                    <p className="text-xs text-slate-400">After Tenderfoot</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-400">
                      {timeline.rankDeadlines['Second Class']!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(timeline.remainingRanks.find(r => r.title === 'Second Class')?.requirementsRemaining ?? 0)} signoffs remaining
                    </p>
                  </div>
                </div>
              )}

              {!timeline.isAlreadyFirstClass && (
                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-300 font-semibold">First Class Promotion</p>
                    <p className="text-xs text-slate-400">Complete all pre-First Class requirements</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-400">
                      {timeline.milestones.firstClass && timeline.milestones.firstClass.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(timeline.phases.preFirstClass as any)?.signoffs || 0} signoffs needed
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div>
                  <p className="text-sm text-purple-300 font-semibold">⭐ Star Rank Promotion</p>
                  <p className="text-xs text-slate-400">Minimum 4 months after First Class</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-400">
                    {timeline.milestones.star && timeline.milestones.star.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {timeline.phases.star.signoffs} signoffs during this phase
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div>
                  <p className="text-sm text-cyan-300 font-semibold">❤️ Life Rank Promotion</p>
                  <p className="text-xs text-slate-400">Minimum 6 months after Star (10 total)</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-cyan-400">
                    {timeline.milestones.life && timeline.milestones.life.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {timeline.phases.life.signoffs} signoffs during this phase
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div>
                  <p className="text-sm text-yellow-300 font-semibold">🦅 Eagle Scout</p>
                  <p className="text-xs text-slate-400">Minimum 6 months after Life (16 total)</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-yellow-400">
                    {timeline.milestones.eagle && timeline.milestones.eagle.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {timeline.phases.eagle.signoffs} signoffs during this phase
                  </p>
                </div>
              </div>
            </div>

            {/* All Rank Deadlines */}
            <div className="border-t border-white/10 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-green-500" />
                All Rank Progression Deadlines
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(timeline.rankDeadlines).map(([rankName, deadline]) => {
                  if (!deadline) return null;
                  
                  const rankColors: { [key: string]: string } = {
                    'Scout': 'text-gray-400 border-gray-500/30 bg-gray-500/10',
                    'Tenderfoot': 'text-green-400 border-green-500/30 bg-green-500/10',
                    'Second Class': 'text-blue-400 border-blue-500/30 bg-blue-500/10',
                    'First Class': 'text-blue-500 border-blue-600/30 bg-blue-600/10',
                    'Star': 'text-purple-400 border-purple-500/30 bg-purple-500/10',
                    'Life': 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
                    'Eagle': 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
                  };
                  
                  const colorClass = rankColors[rankName] || 'text-white border-white/30 bg-white/10';
                  
                  // Calculate days since last promotion (if previous date exists)
                  const previousDate = timeline.rankPreviousDates?.[rankName];
                  const daysSinceLastPromotion = previousDate 
                    ? Math.ceil((deadline.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))
                    : Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                  // Hide zero-day tiles
                  if (daysSinceLastPromotion <= 0) return null;
                  
                  return (
                    <div key={rankName} className={`rounded-lg p-3 border ${colorClass}`}>
                      <p className="text-xs text-slate-300 mb-1">{rankName}</p>
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
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-lg font-semibold text-white mb-3">Pace Per Phase (Adjusted for Completion)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {timeline.phases.scout && timeline.phases.scout.days > 0 && (
                  <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Scout</p>
                    <p className="text-2xl font-bold text-gray-400">
                      {(() => {
                        const spw = timeline.phases.scout.signoffsPerWeek as number
                        const mpw = (timeline as any).meetingsPerWeek as number
                        if (!mpw || mpw <= 0) return spw
                        const spm = spw / mpw
                        return spm % 1 === 0 ? spm : spm.toFixed(1)
                      })()}
                    </p>
                    <p className="text-xs text-slate-500">signoffs/meeting</p>
                    <p className="text-[10px] text-slate-600">{timeline.phases.scout.signoffs} reqs in {Math.ceil(timeline.phases.scout.days / 7)} wks</p>
                  </div>
                )}
                {timeline.phases.tenderfoot && timeline.phases.tenderfoot.days > 0 && (
                  <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Tenderfoot</p>
                    <p className="text-2xl font-bold text-green-400">
                      {(() => {
                        const spw = timeline.phases.tenderfoot.signoffsPerWeek as number
                        const mpw = (timeline as any).meetingsPerWeek as number
                        if (!mpw || mpw <= 0) return spw
                        const spm = spw / mpw
                        return spm % 1 === 0 ? spm : spm.toFixed(1)
                      })()}
                    </p>
                    <p className="text-xs text-slate-500">signoffs/meeting</p>
                    <p className="text-[10px] text-slate-600">{timeline.phases.tenderfoot.signoffs} reqs in {Math.ceil(timeline.phases.tenderfoot.days / 7)} wks</p>
                  </div>
                )}
                {timeline.phases.secondClass && timeline.phases.secondClass.days > 0 && (
                  <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Second Class</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {(() => {
                        const spw = timeline.phases.secondClass.signoffsPerWeek as number
                        const mpw = (timeline as any).meetingsPerWeek as number
                        if (!mpw || mpw <= 0) return spw
                        const spm = spw / mpw
                        return spm % 1 === 0 ? spm : spm.toFixed(1)
                      })()}
                    </p>
                    <p className="text-xs text-slate-500">signoffs/meeting</p>
                    <p className="text-[10px] text-slate-600">{timeline.phases.secondClass.signoffs} reqs in {Math.ceil(timeline.phases.secondClass.days / 7)} wks</p>
                  </div>
                )}
                {timeline.phases.firstClass && timeline.phases.firstClass.days > 0 && (
                  <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">First Class</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {(() => {
                        const spw = timeline.phases.firstClass.signoffsPerWeek as number
                        const mpw = (timeline as any).meetingsPerWeek as number
                        if (!mpw || mpw <= 0) return spw
                        const spm = spw / mpw
                        return spm % 1 === 0 ? spm : spm.toFixed(1)
                      })()}
                    </p>
                    <p className="text-xs text-slate-500">signoffs/meeting</p>
                    <p className="text-[10px] text-slate-600">{timeline.phases.firstClass.signoffs} reqs in {Math.ceil(timeline.phases.firstClass.days / 7)} wks</p>
                  </div>
                )}
                {!timeline.isAlreadyFirstClass && timeline.phases.preFirstClass && (timeline.phases.preFirstClass as any).days > 0 && (
                  <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Pre-First Class</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {(() => {
                        const spw = (timeline.phases.preFirstClass as any).signoffsPerWeek as number
                        const mpw = (timeline as any).meetingsPerWeek as number
                        if (!mpw || mpw <= 0) return spw
                        const spm = spw / mpw
                        return spm % 1 === 0 ? spm : spm.toFixed(1)
                      })()}
                    </p>
                    <p className="text-xs text-slate-500">signoffs/meeting</p>
                  </div>
                )}
                {timeline.phases.star.days > 0 && (
                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Star Phase</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {(() => {
                      const spw = timeline.phases.star.signoffsPerWeek as number
                      const mpw = (timeline as any).meetingsPerWeek as number
                      if (!mpw || mpw <= 0) return spw
                      const spm = spw / mpw
                      return spm % 1 === 0 ? spm : spm.toFixed(1)
                    })()}
                  </p>
                  <p className="text-xs text-slate-500">signoffs/meeting</p>
                </div>
                )}
                {timeline.phases.life.days > 0 && (
                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Life Phase</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {(() => {
                      const spw = timeline.phases.life.signoffsPerWeek as number
                      const mpw = (timeline as any).meetingsPerWeek as number
                      if (!mpw || mpw <= 0) return spw
                      const spm = spw / mpw
                      return spm % 1 === 0 ? spm : spm.toFixed(1)
                    })()}
                  </p>
                  <p className="text-xs text-slate-500">signoffs/meeting</p>
                </div>
                )}
                {timeline.phases.eagle.days > 0 && (
                <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Eagle Phase</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {(() => {
                      const spw = timeline.phases.eagle.signoffsPerWeek as number
                      const mpw = (timeline as any).meetingsPerWeek as number
                      if (!mpw || mpw <= 0) return spw
                      const spm = spw / mpw
                      return spm % 1 === 0 ? spm : spm.toFixed(1)
                    })()}
                  </p>
                  <p className="text-xs text-slate-500">signoffs/meeting</p>
                </div>
                )}
              </div>
            </div>

            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-300">
                🎯 <strong>Smart Timeline:</strong> Time allocation adjusts based on your progress! Base ratios: Scout=1/10, Tenderfoot=3/10, Second Class=1/2, First Class=2/5 of Eagle phase.
                If you've completed 50% of a rank, it gets 50% of the time. 
                {!timeline.isAlreadyFirstClass && timeline.milestones.firstClass && ` Complete First Class by ${timeline.milestones.firstClass.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}, then`}
                {' '}work on Star and Life requirements during their mandatory 4 and 6 month waiting periods.
              </p>
            </div>
          </div>
        )}

        {/* Merit Badges Timeline */}
        {timeline && timelineTab === 'badges' && (
          <BadgesTab
            badgePlan={timeline.badgePlan}
            userChoices={userData.profile?.badgeChoices || {}}
            onUpdateChoice={(group: string, value: string) =>
              updateProfile({ badgeChoices: { ...(userData.profile?.badgeChoices || {}), [group]: value } })
            }
            onAddElective={(badgeId: string) => {
              const existing = userData.profile?.electiveBadges || [];
              if (existing.includes(badgeId)) return; // prevent duplicates
              updateProfile({ electiveBadges: [ ...existing, badgeId ] });
            }}
            onRemoveElective={(badgeId: string) => {
              const existing = userData.profile?.electiveBadges || [];
              updateProfile({ electiveBadges: existing.filter(id => id !== badgeId) });
            }}
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
        {timeline && (timeline.remainingRanks.length > 0 || timeline.remainingBadges.length > 0) && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-green-500" />
              Requirements Breakdown
            </h2>

            {/* Remaining Ranks */}
            {timeline.remainingRanks.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Rank Requirements</h3>
                <div className="space-y-2">
                  {timeline.remainingRanks.map((rank) => (
                    <div
                      key={rank.id}
                      className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-lg hover:border-yellow-500/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-yellow-400" />
                        <div>
                          <p className="text-white font-medium">{rank.title}</p>
                          <p className="text-sm text-slate-400">{rank.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-400">{rank.requirementsRemaining}</p>
                        <p className="text-xs text-slate-500">remaining</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remaining Merit Badges */}
            {timeline.remainingBadges.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Eagle-Required Merit Badges</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {timeline.remainingBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center justify-between p-3 bg-black/40 border border-white/10 rounded-lg hover:border-blue-500/50 transition-all"
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
                          <p className="text-white font-medium text-sm truncate">{badge.title}</p>
                          <p className="text-xs text-slate-400 truncate">{badge.description}</p>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-lg font-bold text-blue-400">{badge.requirementsRemaining}</p>
                        <p className="text-[10px] text-slate-500">reqs</p>
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
  onUpdateChoice,
  onAddElective,
  onRemoveElective,
  progressMap,
  onCompleteBadge,
}: {
  badgePlan: any[];
  userChoices: Record<string, string>;
  onUpdateChoice: (group: string, value: string) => void;
  onAddElective: (badgeId: string) => void;
  onRemoveElective: (badgeId: string) => void;
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
  const chosenElectives = badgePlan.filter(b => b.isElective && !b.placeholder);
  const chosenIds = new Set(chosenElectives.map(e => e.id));

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
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-400" />
          Merit Badges Schedule
        </h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 text-sm rounded-md bg-white/10 border border-white/20 text-slate-200 hover:bg-white/15"
            onClick={() => setShowModal(true)}
          >
            Browse electives
          </button>
          <button
            className="px-3 py-2 text-sm rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 hover:bg-amber-500/30"
            onClick={() => setShowElectiveManager(true)}
          >
            Manage electives
          </button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <span className="px-2 py-1 rounded bg-blue-500/15 border border-blue-500/30 text-blue-200">
          Electives: {chosenElectives.length}/{totalElectiveSlots}
        </span>
        {chosenElectives.length > 0 && (
          <span className="text-slate-500">Remove an elective to free a slot.</span>
        )}
      </div>

      {phasesOrder.map((phase) => {
        const items = grouped[phase] || [];
        if (!items.length) return null;
        return (
          <div key={phase} className="mb-4">
            <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-linear-to-r from-indigo-500/10 to-purple-500/10">
              <span className="text-xs font-semibold text-slate-200">{phase}</span>
            </div>
            <div className="space-y-2">
              {items
                .sort((a: any, b: any) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
                .map((b: any, idx: number) => (
                <div
                  key={`${(b.id || b.name)}-${b.phase}-${idx}`}
                  className={`flex flex-col gap-2 p-3 rounded-lg transition-colors ${b.isElective ? 'bg-amber-950/40 border border-amber-400/30 hover:border-amber-300/50' : 'bg-black/30 border border-white/10 hover:border-blue-500/40'}`}
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
                      <button
                        type="button"
                        onClick={() => {
                          if (b.id && !b.placeholder) {
                            navigate({
                              to: '/merit-badges/$badgeId',
                              params: { badgeId: b.id },
                            });
                          }
                        }}
                        className="min-w-0 text-left group focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
                      >
                        <p className="text-sm text-slate-200 font-semibold truncate flex items-center gap-2">
                          {b.name}
                          {b.note ? (
                            <span className="ml-1 text-xs text-slate-400">({b.note})</span>
                          ) : null}
                          {b.isElective && !b.placeholder && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 uppercase tracking-wide">Elective</span>
                          )}
                          {b.id && computeBadgeProgress(b.id).percent === 100 && (
                            <span className="inline-flex items-center" aria-label="Completed">
                              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 flex flex-wrap gap-x-2 gap-y-1">
                          <span>Finish: {new Date(b.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          {b.wave !== null && b.wave !== undefined && (
                            <span>• Wave {b.wave === 1 ? '1 (mid-phase)' : '2 (end-phase)'}</span>
                          )}
                          <span>• Duration: {b.durationWeeks}w{b.accelerated ? ' ⚡' : ''}</span>
                          <span>• Start: {new Date(b.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        </p>
                        {b.isChoice && b.options && (
                          <div className="mt-1 text-xs text-slate-300 flex items-center gap-2">
                            <span className="text-slate-400">Choose:</span>
                            <select
                              className="bg-black/30 border border-white/10 rounded px-2 py-1 text-slate-200 hover:border-blue-500/40"
                              value={userChoices?.[b.choiceGroup] || b.name}
                              onChange={(e) => onUpdateChoice(b.choiceGroup, e.target.value)}
                            >
                              {b.options.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </button>
                    </div>
                    <div className="text-right ml-3">
                      {b.isElective && (
                        b.placeholder ? (
                          <button
                            className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30 hover:bg-blue-500/30"
                            onClick={() => setShowModal(true)}
                          >
                            Choose elective
                          </button>
                        ) : (
                          <button
                            className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-200 border border-red-400/30 hover:bg-red-500/30"
                            onClick={() => onRemoveElective(b.id)}
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
                            className="mt-2 text-xs px-2 py-1 rounded bg-green-500/20 text-green-200 border border-green-400/30 hover:bg-green-500/30"
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
                        <div className="flex-1 h-2 rounded bg-white/5 overflow-hidden">
                          <div
                            className={`h-full bg-linear-to-r from-blue-500 to-purple-500 transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 w-12 text-right">{pct}%</span>
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
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-[90vw] max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-linear-to-b from-slate-900 to-black flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-linear-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur">
              <h4 className="text-white font-semibold">Browse Elective Badges</h4>
              <button
                className="text-slate-300 hover:text-white rounded-md px-2 py-1 hover:bg-white/10"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4 pt-3">
              <input
                className="w-full mb-3 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                  <div key={b.id} className="flex items-center justify-between p-2 bg-black/40 border border-white/10 rounded-lg hover:bg-black/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {url ? (
                        <img src={url} alt={b.name} className={`w-9 h-9 rounded-full ring-2 ${colorClass} ring-opacity-50 object-cover`} />
                      ) : (
                        <MeritBadgeIcon size={28} className={colorClass} />
                      )}
                      <div className="text-slate-200 text-sm truncate flex items-center gap-2">
                        {b.name}
                        {alreadyChosen && <span className="text-[10px] px-1 py-0.5 rounded bg-green-600/30 border border-green-500/40 text-green-300">Added</span>}
                        {prog.percent === 100 && (
                          <span className="inline-flex items-center" aria-label="Completed">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className={`text-xs px-2 py-1 rounded border ${alreadyChosen ? 'bg-white/5 text-slate-400 border-white/10 cursor-not-allowed' : 'bg-green-500/20 text-green-200 border-green-400/30 hover:bg-green-500/30'}`}
                      disabled={alreadyChosen}
                      onClick={() => { if (!alreadyChosen) { onAddElective(b.id); setShowModal(false); } }}
                    >
                      {alreadyChosen ? 'Added' : 'Add'}
                    </button>
                  </div>
                );
              })}
              {filteredElectives.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">No electives match your search.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showElectiveManager && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowElectiveManager(false)} />
          <div className="relative z-10 w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-amber-400/30 shadow-2xl bg-linear-to-b from-amber-950 to-black flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-amber-400/30 bg-amber-900/40 backdrop-blur">
              <h4 className="text-amber-200 font-semibold flex items-center gap-2"><MeritBadgeIcon size={20} /> Manage Elective Slots</h4>
              <button
                className="text-amber-300 hover:text-amber-100 rounded-md px-2 py-1 hover:bg-amber-500/20"
                onClick={() => setShowElectiveManager(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ElectiveManagerComponent
              onClose={() => setShowElectiveManager(false)}
              totalSlots={totalElectiveSlots}
              chosenIds={chosenIds}
              electivesCatalog={electivesCatalog}
              onAddElective={onAddElective}
              onRemoveElective={onRemoveElective}
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
  chosenIds,
  electivesCatalog,
  onAddElective,
  onRemoveElective,
  onClose,
}: {
  totalSlots: number;
  chosenIds: Set<string>;
  electivesCatalog: any[];
  onAddElective: (id: string) => void;
  onRemoveElective: (id: string) => void;
  onClose: () => void;
}) => {
  const [localSelection, setLocalSelection] = useState<Set<string>>(new Set(chosenIds));

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
    // Add newly selected
    for (const id of localSelection) {
      if (!chosenIds.has(id)) onAddElective(id);
    }
    // Remove deselected
    for (const id of chosenIds) {
      if (!localSelection.has(id)) onRemoveElective(id);
    }
    onClose();
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200">Slots: {localSelection.size}/{totalSlots}</span>
        <button onClick={selectAll} className="px-2 py-1 rounded bg-amber-600/30 text-amber-100 border border-amber-500/40 hover:bg-amber-600/40">Fill Slots</button>
        <button onClick={clearAll} className="px-2 py-1 rounded bg-amber-800/40 text-amber-200 border border-amber-700/40 hover:bg-amber-800/60">Clear</button>
        <button onClick={applyChanges} className="ml-auto px-3 py-1.5 rounded bg-green-500/30 text-green-100 border border-green-400/40 hover:bg-green-500/40">Apply</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {electivesCatalog.map(e => {
          const selected = localSelection.has(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`group text-left relative p-3 rounded-lg border transition-all ${selected ? 'border-amber-300 bg-amber-500/20' : 'border-amber-900/40 bg-amber-950/30 hover:border-amber-400/40'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {e.imageUrl ? (
                  <img src={e.imageUrl} alt={e.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-amber-400/40" />
                ) : (
                  <MeritBadgeIcon size={32} className="text-amber-300" />
                )}
                <span className="text-xs font-semibold text-amber-200 truncate flex-1">{e.name}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-amber-300">
                <span className="inline-flex items-center gap-1">
                  <span className={`w-3 h-3 rounded-full border ${selected ? 'bg-amber-400 border-amber-300' : 'bg-transparent border-amber-600 group-hover:border-amber-400'}`} />
                  {selected ? 'Selected' : 'Tap to select'}
                </span>
                {e.eagleRequired && <span className="text-red-300">Eagle Req?</span>}
              </div>
            </button>
          );
        })}
      </div>
      {electivesCatalog.length === 0 && (
        <div className="text-center text-amber-300/70 text-sm py-12">No electives available.</div>
      )}
    </div>
  );
};
