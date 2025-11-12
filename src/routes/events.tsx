import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import { Upload, Trash2, MapPin, Clock, Plus, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { analyzeCalendarEvents, needsEventReanalysis, type EventAnalysis } from '../services/aiService';
import type { Event } from '../data/userData';
import { TentIcon, MeritBadgeIcon, CompassIcon } from '../components/ScoutIcons';
import meritBadgesData from '../data/merit-badges.json';

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
          className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300"
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

function EventsPage() {
  const { userData, isLoading } = useUserData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [eventAnalysis, setEventAnalysis] = useState<Record<string, EventAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const hasTriggeredAutoAnalysis = React.useRef(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    startTime: '',
    endTime: '',
    location: '',
    type: 'other' as Event['type'],
  });

  const events = userData?.events || [];
  
  // Sort events by priority score (highest first), then by date
  const priorityValue = (p: string) => p === 'high' ? 3 : p === 'medium' ? 2 : 1;
  
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
    
  const pastEvents = events
    .filter(e => new Date(e.startTime) < new Date())
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5); // Limit to 5 past events

  // Load AI analysis from localStorage on mount
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('scoutly_event_analysis');
    if (savedAnalysis) {
      try {
        setEventAnalysis(JSON.parse(savedAnalysis));
      } catch (e) {
        console.error('Failed to parse saved analysis:', e);
      }
    }
  }, []);

  const eventAnalysisCount = Object.keys(eventAnalysis).length;

  // Auto-analyze new events when events change or analysis becomes stale
  useEffect(() => {
    const analyzeNew = async () => {
      if (!userData || events.length === 0 || isAnalyzing) return;
      
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      // Only look at events in the next 30 days
      const futureEvents = events
        .filter(e => {
          const eventDate = new Date(e.startTime);
          return eventDate >= today && eventDate <= thirtyDaysFromNow;
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      const staleEvents = futureEvents.filter(e => needsEventReanalysis(eventAnalysis[e.id]));

      // Auto-trigger if 5 or more stale events in next 30 days AND we haven't already triggered
      if (staleEvents.length < 5) {
        hasTriggeredAutoAnalysis.current = false; // Reset if below threshold
        return;
      }
      
      if (hasTriggeredAutoAnalysis.current) {
        console.log('⏭️ Auto-analysis already triggered, skipping...');
        return;
      }

      hasTriggeredAutoAnalysis.current = true;

      // Prevent multiple simultaneous requests
      console.log(`🤖 Auto-analyzing ${staleEvents.length} events needing fresh insights...`);
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeCalendarEvents(userData, eventAnalysis);
        setEventAnalysis(prev => {
          const updated = { ...prev, ...analysis };
          localStorage.setItem('scoutly_event_analysis', JSON.stringify(updated));
          return updated;
        });
        hasTriggeredAutoAnalysis.current = false; // Reset after successful analysis
      } catch (error) {
        console.error('❌ Failed to analyze calendar:', error);
        hasTriggeredAutoAnalysis.current = false; // Reset on error so they can retry
        if (error instanceof Error && error.message.includes('Rate limit')) {
          alert('Too many requests. Please wait 10 seconds before analyzing again.');
        }
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Debounce to prevent rapid-fire requests
    const timer = setTimeout(() => {
      analyzeNew();
    }, 3000); // 3 second debounce

    return () => clearTimeout(timer);
  }, [userData, events.length, eventAnalysisCount, isAnalyzing]);

  const handleManualAnalysis = async () => {
    if (!userData) return;
    
    setIsAnalyzing(true);
    try {
      console.log('🤖 Manually triggering AI analysis...');
      const analysis = await analyzeCalendarEvents(userData, eventAnalysis, { skipCache: true });
      setEventAnalysis(prev => {
        const updated = { ...prev, ...analysis };
        localStorage.setItem('scoutly_event_analysis', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('❌ Failed to analyze calendar:', error);
      if (error instanceof Error && error.message.includes('Rate limit')) {
        alert('Too many requests. Please wait 10 seconds before analyzing again.');
      } else {
        alert('Failed to analyze events. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
      hasTriggeredAutoAnalysis.current = false;
    }
  };

  const handleClearAllEvents = () => {
    if (!confirm('Are you sure you want to delete ALL events? This cannot be undone.')) return;

    const currentUserData = JSON.parse(localStorage.getItem('scoutly_user_data') || '{}');
    currentUserData.events = [];
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    
    // Clear analysis too
    localStorage.removeItem('scoutly_event_analysis');
    setEventAnalysis({});
    
    // Trigger storage event to update UI
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'scoutly_user_data',
      newValue: JSON.stringify(currentUserData),
      url: window.location.href,
      storageArea: localStorage
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsedEvents = parseICSFile(text);
      
      if (parsedEvents.length === 0) {
        alert('No events found in the ICS file. Please check the file format.');
        return;
      }

      // Add all parsed events to userData
      const currentUserData = JSON.parse(localStorage.getItem('scoutly_user_data') || '{}');
      const existingEvents = currentUserData.events || [];
      
      const newEvents = parsedEvents.map(event => ({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        createdAt: new Date().toISOString(),
        ...event,
      }));

      currentUserData.events = [...existingEvents, ...newEvents];
      localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
      
      // Trigger storage event to update UI
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'scoutly_user_data',
        newValue: JSON.stringify(currentUserData),
        url: window.location.href,
        storageArea: localStorage
      }));
      
      setShowUploadModal(false);
      e.target.value = ''; // Reset file input
      
      // Show success message with delay so modal closes first
      setTimeout(() => {
        alert(`Successfully imported ${parsedEvents.length} event(s)!`);
      }, 100);
    } catch (error) {
      console.error('Failed to parse ICS file:', error);
      alert('Failed to parse ICS file. Please make sure it\'s a valid calendar file.');
    }
  };

  const handleAddEvent = () => {
    if (!newEvent.name || !newEvent.startTime) {
      alert('Please fill in event name and start time');
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
    
    // Trigger storage event to update UI
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'scoutly_user_data',
      newValue: JSON.stringify(currentUserData),
      url: window.location.href,
      storageArea: localStorage
    }));

    setNewEvent({ name: '', startTime: '', endTime: '', location: '', type: 'other' });
    setShowAddModal(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    const currentUserData = JSON.parse(localStorage.getItem('scoutly_user_data') || '{}');
    currentUserData.events = currentUserData.events.filter((e: Event) => e.id !== eventId);
    localStorage.setItem('scoutly_user_data', JSON.stringify(currentUserData));
    
    // Delete associated AI analysis
    setEventAnalysis(prev => {
      const updated = { ...prev };
      delete updated[eventId];
      localStorage.setItem('scoutly_event_analysis', JSON.stringify(updated));
      return updated;
    });
    
    // Trigger storage event to update UI
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'scoutly_user_data',
      newValue: JSON.stringify(currentUserData),
      url: window.location.href,
      storageArea: localStorage
    }));
  };

  const getEventTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'meeting': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'campout': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'service': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
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
        <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading events...</p>
        </div>
      </div>
    );
  }

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
      <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-green-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <TentIcon className="w-6 h-6 text-white" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Troop Events</h1>
                <p className="text-slate-400">Manage your scouting calendar</p>
              </div>
            </div>

            <div className="flex gap-3">
              {!isAnalyzing && userData && (() => {
                const today = new Date();
                const thirtyDaysFromNow = new Date(today);
                thirtyDaysFromNow.setDate(today.getDate() + 30);
                
                const futureEventsInNext30Days = events.filter(e => {
                  const eventDate = new Date(e.startTime);
                  return eventDate >= today && eventDate <= thirtyDaysFromNow;
                });
                const unanalyzedCount = futureEventsInNext30Days.filter(e => !eventAnalysis[e.id]).length;
                return unanalyzedCount > 0 ? (
                  <button
                    onClick={handleManualAnalysis}
                    className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 transition-all flex items-center gap-2"
                  >
                    <CompassIcon className="w-4 h-4" size={16} />
                    Analyze Next 30 Days ({unanalyzedCount})
                  </button>
                ) : null;
              })()}
              
              {isAnalyzing && (
                <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent"></div>
                  Analyzing...
                </div>
              )}
              
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import ICS
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-black font-bold transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
              {events.length > 0 && (
                <button
                  onClick={handleClearAllEvents}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-400">{upcomingEvents.length}</div>
              <div className="text-sm text-slate-400">Upcoming Events</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-400">{events.length}</div>
              <div className="text-sm text-slate-400">Total Events</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-400">{pastEvents.length}</div>
              <div className="text-sm text-slate-400">Past Events</div>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {monthNames[month]} {year}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={previousMonth}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-black font-bold transition-all"
                  aria-label="Previous month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 transition-all"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-black font-bold transition-all"
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
                <div key={day} className="text-center text-sm font-semibold text-slate-400 pb-2">
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
                          ? 'bg-green-500/20 border-2 border-green-500 text-green-400 font-bold'
                          : hasEvents
                          ? 'bg-white/10/50 hover:bg-white/10 border border-white/10 text-white'
                          : 'bg-white/5/50 hover:bg-white/10 border border-white/10/50 text-slate-400'
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
                      <div className="absolute z-50 top-full mt-2 left-1/2 transform -translate-x-1/2 w-64 bg-white/5 border border-white/10 rounded-lg shadow-xl p-3 pointer-events-none">
                        <div className="text-xs font-semibold text-slate-400 mb-2">
                          {currentDate.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            timeZone: 'America/Los_Angeles'
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
                                <span className="text-white font-medium truncate">{event.name}</span>
                              </div>
                              <div className="text-slate-400 text-xs ml-4 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(event.startTime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  timeZone: 'America/Los_Angeles'
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
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Events on {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      timeZone: 'America/Los_Angeles'
                    })}
                  </h3>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map(event => (
                    <div
                      key={event.id}
                      className="bg-white/10/50 rounded-lg p-3 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getEventTypeColor(event.type)}`}>
                            {event.type}
                          </span>
                          <span className="text-white font-medium">{event.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.startTime).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              timeZone: 'America/Los_Angeles'
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

        {/* Analyzing Indicator */}
        {isAnalyzing && (
          <div className="mb-6">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="text-purple-300 font-medium">AI is analyzing your calendar...</p>
                <p className="text-slate-400 text-sm">Adding smart suggestions to each event</p>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
            {upcomingEvents.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">
                  Sorted by priority • {upcomingEvents.filter(e => eventAnalysis[e.id]).length} analyzed
                </span>
                {isAnalyzing && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/20 rounded text-purple-300">
                    <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </div>
                )}
              </div>
            )}
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
              <TentIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" size={48} />
              <p className="text-slate-400">No upcoming events. Add one or import from ICS file!</p>
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
            <h2 className="text-xl font-bold text-white mb-4">Past Events</h2>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add Event</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Event Name *</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Troop Meeting, Campout, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Start Time *</label>
                <input
                  type="datetime-local"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Location or address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Event Type</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as Event['type'] })}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-black font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-black font-bold transition-all"
                >
                  Add Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload ICS Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Import Calendar</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-slate-400 text-sm">
                Upload an ICS (iCalendar) file to import events from your troop calendar, Google Calendar, or other calendar apps.
              </p>

              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-green-500 transition-colors">
                <input
                  type="file"
                  accept=".ics,.ical"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="ics-upload"
                />
                <label htmlFor="ics-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-white font-medium mb-1">Click to upload</p>
                  <p className="text-sm text-slate-400">or drag and drop ICS file</p>
                </label>
              </div>

              <button
                onClick={() => setShowUploadModal(false)}
                className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-black font-bold transition-all"
              >
                Cancel
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
  const [showDetails, setShowDetails] = React.useState(false);
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

  const hasAnalysis = analysis && (
    (analysis.opportunities && analysis.opportunities.length > 0) ||
    (analysis.requirements && analysis.requirements.length > 0) ||
    (analysis.signoffs && analysis.signoffs.length > 0)
  );
  
  // Priority badge color
  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'bg-red-500/20 text-red-400 border-red-500/40';
    if (priority === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
  };

  return (
    <div 
      className={`relative bg-white/5 backdrop-blur-xl border rounded-xl p-4 transition-all ${
        isPast ? 'opacity-60 border-white/10' : hasAnalysis && analysis.priority === 'high' ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' : 'border-white/10 hover:border-green-500/50'
      }`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Quick Tooltip on Hover */}
      {!isPast && hasAnalysis && showTooltip && !showDetails && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 p-3 bg-black border border-green-500/50 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-xs text-slate-300 space-y-2">
            {/* Opportunities */}
            {analysis.opportunities && analysis.opportunities.length > 0 && (
              <div className="space-y-1">
                {analysis.opportunities.slice(0, 3).map((opp: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <CompassIcon className="w-3 h-3 text-green-400 mt-0.5 shrink-0" size={12} />
                    <span>{opp}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Requirements */}
            {analysis.requirements && analysis.requirements.length > 0 && (
              <div className="flex items-start gap-2 pt-1 border-t border-white/10">
                <MeritBadgeIcon className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" size={12} />
                <span><strong>Reqs:</strong> {analysis.requirements.slice(0, 2).map((r: any) => r.name).join(', ')}</span>
              </div>
            )}
            
            <div className="text-green-400 font-medium pt-1 border-t border-white/10">→ Click to see full analysis</div>
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
            {!isPast && hasAnalysis && analysis.priority && (
              <span className={`px-2 py-1 rounded text-xs font-bold border ${getPriorityColor(analysis.priority)}`}>
                {analysis.priority.toUpperCase()}
              </span>
            )}
            
            <h3 className="text-lg font-semibold text-white">{event.name}</h3>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              <span>
                {startDate.toLocaleDateString('en-US', dateOptions)}
                {' at '}
                {startDate.toLocaleTimeString('en-US', timeOptions)}
                {' PST'}
              </span>
            </div>

            {event.location && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
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

          {/* See More Button */}
          {!isPast && hasAnalysis && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-3 w-full py-2 px-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 rounded-lg text-sm font-medium text-green-400 transition-all flex items-center justify-center gap-2"
            >
              {showDetails ? (
                <>
                  Hide Details
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  See What You Can Do Here
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {/* AI Analysis Section - Show when button clicked */}
          {!isPast && hasAnalysis && showDetails && (
            <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in duration-200">
              <div className="grid gap-4">
                {/* Opportunities */}
                {analysis.opportunities && analysis.opportunities.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CompassIcon className="w-3.5 h-3.5 text-green-400" size={14} />
                      <h5 className="text-xs font-semibold text-green-400">What To Do</h5>
                    </div>
                    <ul className="space-y-1">
                      {analysis.opportunities.map((opp: string, i: number) => (
                        <li key={i} className="text-xs text-slate-300 pl-4 before:content-['•'] before:mr-2 before:text-green-400">
                          {convertBadgeNamesToLinks(opp)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Requirements */}
                {analysis.requirements && analysis.requirements.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      <h5 className="text-xs font-semibold text-green-400">Requirements</h5>
                    </div>
                    <ul className="space-y-1">
                      {analysis.requirements.map((req: any, i: number) => (
                        <li key={i} className="text-xs text-slate-300 pl-4 before:content-['•'] before:mr-2 before:text-green-400">
                          <strong>{req.name}</strong> - {req.requirement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Signoffs */}
                {analysis.signoffs && analysis.signoffs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                      <h5 className="text-xs font-semibold text-blue-400">Signoffs Available</h5>
                    </div>
                    <ul className="space-y-1">
                      {analysis.signoffs.map((signoff: any, i: number) => (
                        <li key={i} className="text-xs text-slate-300 pl-4 before:content-['•'] before:mr-2 before:text-blue-400">
                          {signoff.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => onDelete(event.id)}
          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
          title="Delete event"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
