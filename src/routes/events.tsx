import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Trash2, MapPin, Clock, Plus, X, RefreshCw } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import type { EventAnalysis } from '../services/aiService';
import { generateEventRecommendations } from '../lib/calendarRecommendations';
import type { Event } from '../data/userData';
import { TentIcon, CompassIcon } from '../components/ScoutIcons';
import meritBadgesData from '../data/merit-badges.json';
import { getUserTimezone } from '../lib/constants';
import { useToast } from '../components/Toast';
import { syncScoutbookCalendar, updateCalendarUrl } from '../services/storageService';

export const Route = createFileRoute('/events')({
  component: EventsPage,
});

// Utility to convert badge names in text to clickable links
function convertBadgeNamesToLinks(text: string): (string | React.ReactNode)[] {
  const badges = meritBadgesData.meritBadges;
  const parts: (string | React.ReactNode)[] = [];
  let remainingText = text;
  let keyCounter = 0;

  // Sort badges by name length (longest first) to match "First Aid" before "Aid"
  const sortedBadges = [...badges].sort((a, b) => b.name.length - a.name.length);

  for (const badge of sortedBadges) {
    const regex = new RegExp(`\\b${badge.name}\\b`, 'gi');
    const match = remainingText.match(regex);
    
    if (match) {
      const index = remainingText.search(regex);
      
      // Add text before the match
      if (index > 0) {
        parts.push(remainingText.substring(0, index));
      }
      
      // Add the link
      parts.push(
        <Link
          key={`badge-link-${keyCounter++}`}
          to="/merit-badges/$badgeId"
          params={{ badgeId: badge.id }}
          className="text-sky-700 hover:text-sky-800 underline decoration-sky-500/50 hover:decoration-sky-700"
        >
          {match[0]}
        </Link>
      );
      
      // Continue with remaining text
      remainingText = remainingText.substring(index + match[0].length);
      break; // Process one badge at a time to maintain order
    }
  }
  
  // Add any remaining text
  if (remainingText) {
    parts.push(remainingText);
  }
  
  return parts.length > 0 ? parts : [text];
}


// ICS Parser
function parseICSFile(icsContent: string): Omit<Event, 'id' | 'createdAt'>[] {
  const events: Omit<Event, 'id' | 'createdAt'>[] = [];
  const lines = icsContent.split(/\r?\n/);
  
  let currentEvent: Partial<Omit<Event, 'id' | 'createdAt'>> | null = null;
  let inEvent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {
        type: 'other',
      };
      continue;
    }

    if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.name && currentEvent.startTime) {
        events.push({
          name: currentEvent.name,
          startTime: currentEvent.startTime,
          endTime: currentEvent.endTime,
          location: currentEvent.location,
          type: currentEvent.type || 'other',
        });
      }
      currentEvent = null;
      inEvent = false;
      continue;
    }

    if (inEvent && currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.name = line.substring(8).trim();
      } else if (line.startsWith('DTSTART')) {
        const dateStr = line.split(':')[1]?.trim();
        if (dateStr) {
          currentEvent.startTime = parseICSDate(dateStr);
        }
      } else if (line.startsWith('DTEND')) {
        const dateStr = line.split(':')[1]?.trim();
        if (dateStr) {
          currentEvent.endTime = parseICSDate(dateStr);
        }
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9).trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        const desc = line.substring(12).toLowerCase();
        // Try to infer event type from description
        if (desc.includes('camp') || desc.includes('overnight')) {
          currentEvent.type = 'campout';
        } else if (desc.includes('service') || desc.includes('volunteer')) {
          currentEvent.type = 'service';
        } else if (desc.includes('meeting') || desc.includes('troop meeting')) {
          currentEvent.type = 'meeting';
        }
      }
    }
  }

  return events;
}

function parseICSDate(dateStr: string): string {
  // ICS dates are in format: YYYYMMDDTHHMMSS or YYYYMMDD
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  if (dateStr.includes('T')) {
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    
    // Create date in UTC and convert to PST (UTC-8)
    // ICS files usually contain UTC times (with Z suffix) or local times
    const utcDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
    
    // Convert to PST by creating a formatter with Los Angeles timezone
    const pstDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    
    // Format back to ISO string for local storage
    const pstYear = pstDate.getFullYear();
    const pstMonth = String(pstDate.getMonth() + 1).padStart(2, '0');
    const pstDay = String(pstDate.getDate()).padStart(2, '0');
    const pstHour = String(pstDate.getHours()).padStart(2, '0');
    const pstMinute = String(pstDate.getMinutes()).padStart(2, '0');
    
    return `${pstYear}-${pstMonth}-${pstDay}T${pstHour}:${pstMinute}:00`;
  }
  
  return `${year}-${month}-${day}T00:00:00`;
}

function computeMeetingsPerMonthFrom(events: Event[]) {
  const troopMeetings = events.filter(
    (event) =>
      event.type === 'meeting' &&
      typeof event.name === 'string' &&
      event.name.trim().toLowerCase() === 'troop meeting',
  );

  if (troopMeetings.length === 0) {
    return 4;
  }

  const meetingsByMonth = new Map<string, number>();

  troopMeetings.forEach((event) => {
    const date = new Date(event.startTime);
    if (Number.isNaN(date.getTime())) return;

    const key = `${date.getFullYear()}-${date.getMonth()}`;
    meetingsByMonth.set(key, (meetingsByMonth.get(key) || 0) + 1);
  });

  if (meetingsByMonth.size === 0) {
    return 4;
  }

  const totalMeetings = Array.from(meetingsByMonth.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  return Math.max(1, Math.round(totalMeetings / meetingsByMonth.size));
}

function dispatchStorageRefresh() {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'scoutly_user_data',
      newValue: localStorage.getItem('scoutly_user_data'),
      url: window.location.href,
      storageArea: localStorage,
    }),
  );
}

function EventsPage() {
  const navigate = useNavigate();
  const { userData, isLoading, updateProfile } = useUserData();
  const { showToast, confirm } = useToast();
  const userTimezone = useMemo(() => getUserTimezone(), []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingCalendarUrl, setIsSavingCalendarUrl] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [calendarUrlDraft, setCalendarUrlDraft] = useState('');
  const [newEvent, setNewEvent] = useState({
    name: '',
    startTime: '',
    endTime: '',
    location: '',
    type: 'other' as Event['type'],
  });
  const [showMeetingsDetectedModal, setShowMeetingsDetectedModal] = useState<{ open: boolean; estimate: number }>(() => ({ open: false, estimate: 0 }));

  const events = userData?.events || [];

  useEffect(() => {
    setCalendarUrlDraft(userData?.profile?.scoutbookCalendarUrl || '');
  }, [userData?.profile?.scoutbookCalendarUrl]);
  
  // Calculate analysis automatically without AI
  const eventAnalysis = useMemo(() => {
    if (!userData) return {};
    return generateEventRecommendations(userData, events);
  }, [userData, events]);

  // Use the currently viewed month to calculate meetings
  const computeAutoMeetingsPerMonth = () => {
    const targetMonth = currentMonth || new Date();
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    const troopMeetingsCurrentMonth = (events || [])
      .filter(e => e.type === 'meeting' && typeof e.name === 'string' && e.name.trim() === 'Troop Meeting')
      .filter(e => {
        const d = new Date(e.startTime || (e as any).date);
        return d >= monthStart && d <= monthEnd;
      }).length;
    return troopMeetingsCurrentMonth > 0 ? troopMeetingsCurrentMonth : 4;
  };

  const autoMeetingsPerMonth = computeAutoMeetingsPerMonth();
  const hasCalendarConnection = Boolean(userData?.profile?.scoutbookCalendarUrl);
  
  // Sort events by priority score (highest first), then by date
  const priorityValue = (p: string | undefined): number => {
    if (!p || typeof p !== 'string') return 1;
    if (p === 'high') return 3;
    if (p === 'medium') return 2;
    return 1;
  };
  
  const upcomingEvents = events
    .filter(e => new Date(e.startTime) >= new Date())
    .map(e => ({
      ...e,
      analysis: eventAnalysis[e.id],
      priorityNum: priorityValue(eventAnalysis[e.id]?.priority || 'low')
    }))
    .sort((a, b) => {
      // First sort by priority (high to low)
      if (b.priorityNum !== a.priorityNum) {
        return b.priorityNum - a.priorityNum;
      }
      // Then by date (soonest first)
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    })
    .slice(0, 15); // Limit to 15 upcoming events
  const nextUpcomingEvent = upcomingEvents[0];
    
  const pastEvents = events
    .filter(e => new Date(e.startTime) < new Date())
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5); // Limit to 5 past events

  // Auto-sync Scoutbook calendar once per day when a URL is saved
  useEffect(() => {
    if (!userData?.profile.scoutbookCalendarUrl) return;
    const lastSync = userData.profile.lastCalendarSync;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (lastSync && lastSync > oneDayAgo) return; // already synced today

    // Fire & forget background sync — show a subtle toast only on error
    (async () => {
      try {
        await syncScoutbookCalendar();
        dispatchStorageRefresh();
      } catch {
        // Silent on auto-sync; user can manually sync if needed
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.profile.scoutbookCalendarUrl]);

  // handleManualAnalysis replaced by generateEventRecommendations

  const validateCalendarUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { ok: true as const, value: '' };
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { ok: false as const, message: 'Calendar URL must start with http:// or https://' };
    }

    return { ok: true as const, value: trimmed };
  };

  const saveCalendarUrl = async (silent = false) => {
    const validation = validateCalendarUrl(calendarUrlDraft);
    if (!validation.ok) {
      if (!silent) showToast('error', validation.message);
      return null;
    }

    setIsSavingCalendarUrl(true);
    try {
      await updateCalendarUrl(validation.value || null);
      dispatchStorageRefresh();
      if (!silent) {
        showToast(
          'success',
          validation.value ? 'Calendar URL saved.' : 'Calendar URL removed.',
        );
      }
      return validation.value;
    } catch {
      if (!silent) showToast('error', 'Unable to save calendar URL right now.');
      return null;
    } finally {
      setIsSavingCalendarUrl(false);
    }
  };

  const handleSyncScoutbook = async () => {
    const validation = validateCalendarUrl(calendarUrlDraft);
    if (!validation.ok) {
      showToast('error', validation.message);
      return;
    }

    const draftChanged =
      validation.value !== (userData?.profile.scoutbookCalendarUrl || '');
    const syncSourceUrl = draftChanged ? await saveCalendarUrl(true) : validation.value;
    if (draftChanged && syncSourceUrl === null) {
      showToast('error', 'Unable to save calendar URL right now.');
      return;
    }

    const hasUrlToSync = Boolean(syncSourceUrl || userData?.profile.scoutbookCalendarUrl);

    if (!hasUrlToSync) {
      showToast('warning', 'Add a Scoutbook calendar URL before syncing.');
      return;
    }

    setIsSyncing(true);
    try {
      await syncScoutbookCalendar();
      dispatchStorageRefresh();
      showToast('success', 'Calendar synced! Events updated from Scoutbook.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed.';
      showToast('error', msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAllEvents = async () => {
    const confirmed = await confirm({ title: 'Clear All Events', message: 'Are you sure you want to delete ALL events? This cannot be undone.', destructive: true, confirmLabel: 'Delete All' });
    if (!confirmed) return;

    const currentUserData = JSON.parse(localStorage.getItem('scoutly_user_data') || '{}');
    currentUserData.events = [];
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));

    dispatchStorageRefresh();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsedEvents = parseICSFile(text);
      
      if (parsedEvents.length === 0) {
        showToast('warning', 'No events found in the ICS file. Please check the file format.');
        return;
      }

      // Add all parsed events to userData
      const currentUserData = JSON.parse(localStorage.getItem('scoutly_user_data') || '{}');
      const existingEvents = currentUserData.events || [];
      
      const newEvents = parsedEvents.map(event => ({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        createdAt: new Date().toISOString(),
        source: 'ics_file' as const,
        ...event,
      }));

  currentUserData.events = [...existingEvents, ...newEvents];
      localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
      
      dispatchStorageRefresh();

      setShowCalendarModal(false);
      e.target.value = ''; // Reset file input

      // After importing, estimate meetings/month once and prompt the user to accept or edit
      const estimated = computeMeetingsPerMonthFrom(currentUserData.events || []);
      setShowMeetingsDetectedModal({ open: true, estimate: estimated });
    } catch (error) {
      console.error('Failed to parse ICS file:', error);
      showToast('error', 'Failed to parse ICS file. Please make sure it\'s a valid calendar file.');
    }
  };

  const handleAddEvent = () => {
    if (!newEvent.name || !newEvent.startTime) {
      showToast('warning', 'Please fill in event name and start time');
      return;
    }

    const currentUserData = JSON.parse(localStorage.getItem('scoutly_user_data') || '{}');
    const event: Event = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...newEvent,
    };

    currentUserData.events = [...(currentUserData.events || []), event];
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    
    dispatchStorageRefresh();

    setNewEvent({ name: '', startTime: '', endTime: '', location: '', type: 'other' });
    setShowAddModal(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const confirmed = await confirm({ title: 'Delete Event', message: 'Are you sure you want to delete this event?', destructive: true, confirmLabel: 'Delete' });
    if (!confirmed) return;

    const currentUserData = JSON.parse(localStorage.getItem('scoutly_user_data') || '{}');
    currentUserData.events = currentUserData.events.filter((e: Event) => e.id !== eventId);
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));

    dispatchStorageRefresh();
  };

  const getEventTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'meeting': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'campout': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'service': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1));
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const handleMouseEnter = (date: Date) => {
    const timer = setTimeout(() => {
      setHoveredDate(date);
    }, 500); // 0.5 second delay
    setHoverTimer(timer);
  };

  const handleMouseLeave = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
    setHoveredDate(null);
  };

  if (isLoading) {
    return (
      <div className="app-shell light-overrides min-h-screen flex items-center justify-center">
        <div className="app-shell__grid fixed inset-0" />
        <div className="app-shell__glow app-shell__glow--top fixed" />
        <div className="app-shell__glow app-shell__glow--bottom fixed" />
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell light-overrides min-h-screen">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      {/* Main Content */}
      <div className="app-shell__content max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-emerald-600 to-sky-600 rounded-xl flex items-center justify-center shadow-[0_10px_24px_rgba(14,165,233,0.22)]">
                <TentIcon className="w-6 h-6 text-white" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Troop Events</h1>
                <p className="text-slate-600">
                  {nextUpcomingEvent
                    ? 'What is coming up next, and is the calendar helping you plan for it?'
                    : 'Get the troop calendar connected so upcoming dates can drive the rest of the plan.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Meetings/Month display */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                <span className="text-xs text-slate-500">Meetings/mo</span>
                <span className="text-sm font-medium text-slate-900">
                  {autoMeetingsPerMonth.toString()}
                </span>
              </div>
              <button
                onClick={() => setShowCalendarModal(true)}
                className="px-4 py-2 bg-linear-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 rounded-lg text-white font-semibold transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Manage Calendar
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
            <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-sky-50 via-white to-emerald-50 p-4 shadow-[0_14px_30px_rgba(24,35,47,0.05)]">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Calendar focus
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-950">
                {nextUpcomingEvent ? nextUpcomingEvent.name : hasCalendarConnection ? 'Calendar is connected' : 'Calendar setup still needed'}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                {nextUpcomingEvent
                  ? `${new Date(nextUpcomingEvent.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: userTimezone })}${nextUpcomingEvent.location ? ` • ${nextUpcomingEvent.location}` : ''}`
                  : hasCalendarConnection
                    ? 'Your Scoutbook link is saved. Use Manage Calendar to refresh imported events and keep planning current.'
                    : 'Attach Scoutbook or import ICS so Scoutly can plan around meetings, campouts, and service dates.'}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(24,35,47,0.04)]">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Connection status
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-950">
                {hasCalendarConnection ? 'Scoutbook attached' : 'No live calendar'}
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {userData?.profile.lastCalendarSync
                  ? `Last synced ${new Date(userData.profile.lastCalendarSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                  : 'No successful sync recorded yet.'}
              </div>
            </div>
          </div>

          {events.length > 0 && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={handleClearAllEvents}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition-all hover:bg-rose-100"
              >
                <X className="w-4 h-4" />
                Clear all events
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="app-surface rounded-xl p-4">
              <div className="text-2xl font-bold text-emerald-700">{upcomingEvents.length}</div>
              <div className="text-sm text-slate-600">Upcoming Events</div>
            </div>
            <div className="app-surface rounded-xl p-4">
              <div className="text-2xl font-bold text-sky-700">{events.length}</div>
              <div className="text-sm text-slate-600">Total Events</div>
            </div>
            <div className="app-surface rounded-xl p-4">
              <div className="text-2xl font-bold text-indigo-700">{pastEvents.length}</div>
              <div className="text-sm text-slate-600">Past Events</div>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="mb-8">
          <div className="app-surface rounded-xl p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {monthNames[month]} {year}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={previousMonth}
                  className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold transition-all"
                  aria-label="Previous month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-700 transition-all"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold transition-all"
                  aria-label="Next month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-slate-600 pb-2">
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* Calendar days */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const currentDate = new Date(year, month, day);
                const dayEvents = getEventsForDate(currentDate);
                const hasEvents = dayEvents.length > 0;
                const isTodayDate = isToday(day);
                const isHovered = hoveredDate?.getTime() === currentDate.getTime();

                return (
                  <div key={day} className="relative">
                    <button
                      onClick={() => setSelectedDate(currentDate)}
                      onMouseEnter={() => handleMouseEnter(currentDate)}
                      onMouseLeave={handleMouseLeave}
                      className={`w-full min-h-24 p-1.5 rounded-lg transition-all relative flex flex-col ${
                        isTodayDate
                          ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-800 font-bold'
                          : hasEvents
                          ? 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 shadow-sm'
                          : 'bg-slate-50 hover:bg-white border border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="text-sm font-semibold mb-1">{day}</div>
                      
                      {/* Event list in calendar cell */}
                      {hasEvents && (
                        <div className="space-y-0.5 text-left flex-1 overflow-hidden">
                          {dayEvents.slice(0, 3).map((event, i) => (
                            <div
                              key={i}
                              className={`text-[10px] px-1 py-0.5 rounded truncate ${
                                event.type === 'meeting'
                                  ? 'bg-blue-500/30 text-blue-300'
                                  : event.type === 'campout'
                                  ? 'bg-green-500/30 text-green-300'
                                  : event.type === 'service'
                                  ? 'bg-purple-500/30 text-purple-300'
                                  : 'bg-slate-500/30 text-slate-300'
                              }`}
                              title={event.name}
                            >
                              {event.name}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[9px] text-slate-400 px-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Hover popup for full details */}
                    {isHovered && hasEvents && (
                      <div className="absolute z-50 top-full mt-2 left-1/2 transform -translate-x-1/2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-3 pointer-events-none">
                        <div className="text-xs font-semibold text-slate-600 mb-2">
                          {currentDate.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            timeZone: userTimezone
                          })}
                        </div>
                        <div className="space-y-2">
                          {dayEvents.map((event, i) => (
                            <div key={i} className="text-sm">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    event.type === 'meeting'
                                      ? 'bg-blue-400'
                                      : event.type === 'campout'
                                      ? 'bg-green-400'
                                      : event.type === 'service'
                                      ? 'bg-purple-400'
                                      : 'bg-slate-400'
                                  }`}
                                />
                                <span className="text-slate-900 font-medium truncate">{event.name}</span>
                              </div>
                              <div className="text-slate-600 text-xs ml-4 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(event.startTime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  timeZone: userTimezone
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Date Events */}
            {selectedDate && getEventsForDate(selectedDate).length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Events on {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      timeZone: userTimezone
                    })}
                  </h3>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-slate-500 hover:text-slate-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map(event => (
                    <div
                      key={event.id}
                      className="bg-white rounded-lg p-3 border border-slate-200 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getEventTypeColor(event.type)}`}>
                            {event.type}
                          </span>
                          <span className="text-slate-900 font-medium">{event.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.startTime).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              timeZone: userTimezone
                            })} PST
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Upcoming Events</h2>
            {upcomingEvents.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">
                  Sorted by priority • {upcomingEvents.filter(e => eventAnalysis[e.id]).length} analyzed
                </span>
              </div>
            )}
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="app-surface rounded-xl p-8 text-center">
              <TentIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" size={48} />
              <p className="text-slate-600">No upcoming events. Add one or connect a calendar to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} onDelete={handleDeleteEvent} getTypeColor={getEventTypeColor} analysis={eventAnalysis[event.id]} />
              ))}
            </div>
          )}
        </div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Past Events</h2>
            <div className="space-y-3">
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} onDelete={handleDeleteEvent} getTypeColor={getEventTypeColor} isPast analysis={eventAnalysis[event.id]} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Add Event</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Name *</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Troop Meeting, Campout, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Time *</label>
                <input
                  type="datetime-local"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Location or address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as Event['type'] })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="meeting">Meeting</option>
                  <option value="campout">Campout</option>
                  <option value="service">Service Project</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  className="flex-1 px-4 py-2 bg-linear-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 rounded-lg text-white font-semibold transition-all"
                >
                  Add Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Manage Calendar</h3>
              <button onClick={() => setShowCalendarModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-slate-600 text-sm">
                Keep your troop schedule current by syncing Scoutbook and optionally importing
                calendar files.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Scoutbook calendar URL
                </label>
                <input
                  type="url"
                  value={calendarUrlDraft}
                  onChange={(event) => setCalendarUrlDraft(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-4 focus:ring-sky-100"
                  placeholder="https://api.scouting.org/advancements/events/calendar/..."
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="mt-2 text-xs text-slate-500">
                  In Scoutbook Plus Calendar, use Copy url for your troop calendar.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      void saveCalendarUrl();
                    }}
                    disabled={isSavingCalendarUrl || isSyncing}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingCalendarUrl ? 'Saving...' : 'Save URL'}
                  </button>
                  <button
                    onClick={handleSyncScoutbook}
                    disabled={isSyncing || isSavingCalendarUrl}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing…' : 'Sync now'}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  {userData?.profile.lastCalendarSync
                    ? `Last synced ${new Date(userData.profile.lastCalendarSync).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}`
                    : 'No successful sync yet.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Import calendar file (optional)</h4>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Upload an ICS file from troop, Google, or Apple calendars.
                </p>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors bg-white">
                  <input
                    type="file"
                    accept=".ics,.ical"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="ics-upload"
                  />
                  <label htmlFor="ics-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <p className="text-slate-900 font-medium mb-1">Click to upload ICS</p>
                    <p className="text-sm text-slate-600">or drag and drop file</p>
                  </label>
                </div>
              </div>

              <p className="text-slate-600 text-sm">
                Calendar connections stay managed here. Manual events can still be added from the
                main Events page.
              </p>

              <button
                onClick={() => setShowCalendarModal(false)}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meetings Detected Modal */}
      {showMeetingsDetectedModal.open && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Meetings per Month</h3>
              <button onClick={() => setShowMeetingsDetectedModal({ open: false, estimate: 0 })} className="text-slate-500 hover:text-slate-900">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-slate-700 mb-4">
              Calendar analysis estimates
              {' '}<span className="text-emerald-700 font-semibold">{showMeetingsDetectedModal.estimate}</span>{' '}
              Troop meeting(s) per month.
            </p>
            <p className="text-slate-600 text-sm mb-5">
              You can proceed with this value or edit it anytime in your profile. Once set, we won’t auto-recalculate it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  updateProfile({ meetingsPerMonthOverride: showMeetingsDetectedModal.estimate });
                  setShowMeetingsDetectedModal({ open: false, estimate: 0 });
                }}
                className="flex-1 px-4 py-2 bg-linear-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 rounded-lg text-white font-semibold transition-all"
              >
                Use {showMeetingsDetectedModal.estimate}/mo
              </button>
              <button
                onClick={() => {
                  updateProfile({ meetingsPerMonthOverride: showMeetingsDetectedModal.estimate });
                  setShowMeetingsDetectedModal({ open: false, estimate: 0 });
                  navigate({ to: '/profile' });
                }}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-all"
              >
                Edit in Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ 
  event, 
  onDelete, 
  getTypeColor, 
  isPast = false,
  analysis
}: { 
  event: Event; 
  onDelete: (id: string) => void;
  getTypeColor: (type: Event['type']) => string;
  isPast?: boolean;
  analysis?: EventAnalysis;
}) {
  const [showDetails] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(false);
  
  const startDate = new Date(event.startTime);
  const endDate = event.endTime ? new Date(event.endTime) : null;

  // Format options for PST timezone
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles'
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  };

  const endTimeOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  };

  const hasAnalysis = !!(
    analysis && ((analysis.opportunities && analysis.opportunities.length > 0) || (analysis as any).signoffs?.length > 0)
  );
  
  // Priority badge color
  const getPriorityColor = (priority: string | undefined) => {
    if (!priority || typeof priority !== 'string') return 'bg-slate-100 text-slate-700 border-slate-200';
    if (priority === 'high') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (priority === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div 
      className={`relative bg-white border rounded-xl p-4 transition-all shadow-sm ${
        isPast ? 'opacity-60 border-slate-200' : hasAnalysis && analysis.priority === 'high' ? 'border-amber-300 shadow-md' : 'border-slate-200 hover:border-emerald-300'
      }`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Quick Tooltip on Hover */}
      {!isPast && hasAnalysis && showTooltip && !showDetails && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 p-3 bg-white border border-emerald-200 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-xs text-slate-700 space-y-2">
            {/* Opportunities */}
            {analysis.opportunities && analysis.opportunities.length > 0 && (
              <div className="space-y-1">
                {analysis.opportunities.slice(0, 3).map((opp: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <CompassIcon className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" size={12} />
                    <span>{opp.title}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-emerald-700 font-medium pt-1 border-t border-slate-200">→ Click to see full analysis</div>
          </div>
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(event.type)}`}>
              {event.type}
            </span>
            
            {/* Priority Badge */}
            {!isPast && hasAnalysis && analysis.priority && typeof analysis.priority === 'string' && (
              <span className={`px-2 py-1 rounded text-xs font-bold border ${getPriorityColor(analysis.priority)}`}>
                {analysis.priority.toUpperCase()}
              </span>
            )}
            
            <h3 className="text-lg font-semibold text-slate-900">{event.name}</h3>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>
                {startDate.toLocaleDateString('en-US', dateOptions)}
                {' at '}
                {startDate.toLocaleTimeString('en-US', timeOptions)}
                {' PST'}
              </span>
            </div>

            {event.location && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}

            {endDate && (
              <div className="text-xs text-slate-500">
                Ends: {endDate.toLocaleString('en-US', endTimeOptions)} PST
              </div>
            )}
          </div>

          {/* AI Analysis Section - Shown automatically */}
          {!isPast && hasAnalysis && (
            <div className="mt-4 pt-4 border-t border-slate-200 animate-in fade-in duration-200">
              <div className="grid gap-4">
                {/* Opportunities */}
                {analysis.opportunities && analysis.opportunities.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CompassIcon className="w-3.5 h-3.5 text-emerald-600" size={14} />
                      <h5 className="text-xs font-semibold text-emerald-700">What To Do</h5>
                    </div>
                    <ul className="space-y-1">
                      {analysis.opportunities.map((opp: any, i: number) => {
                        const content = opp.kind === 'rank' ? (
                          <Link
                            to="/advancement"
                            className="underline decoration-emerald-500/40 hover:decoration-emerald-600 text-emerald-700"
                          >
                            {opp.title}
                          </Link>
                        ) : convertBadgeNamesToLinks(opp.title)
                        return (
                          <li key={i} className="text-xs text-slate-700 pl-4 before:content-['•'] before:mr-2 before:text-emerald-600">
                            {content}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* Signoffs: exact rank requirements to complete */}
                {analysis.signoffs && analysis.signoffs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-sky-500 inline-block" />
                      <h5 className="text-xs font-semibold text-sky-700">Exact Signoffs To Get</h5>
                    </div>
                    <ul className="space-y-1">
                      {analysis.signoffs.map((s: any, i: number) => {
                        const rankId: string | undefined = s.rankId;
                        // Try to extract requirement code like 2b from id or name
                        const codeFromId = typeof s.id === 'string' ? (s.id.match(/(\d+[a-z]?)/i)?.[1] ?? null) : null;
                        const codeFromName = typeof s.name === 'string' ? (s.name.match(/(\d+[a-z]?)/i)?.[1] ?? null) : null;
                        const reqCode = codeFromId || codeFromName || '';
                        const anchor = rankId && reqCode ? `${rankId}-${reqCode}` : null;
                        const href = anchor ? `/advancement#${anchor}` : '/advancement';
                        return (
                          <li key={i} className="text-xs text-slate-700 pl-4 before:content-['•'] before:mr-2 before:text-sky-600">
                            <a href={href} className="underline decoration-sky-500/40 hover:decoration-sky-600 text-sky-700">
                              {s.name}
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => onDelete(event.id)}
          className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
          title="Delete event"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
