import type { Event } from '../data/userData';

/**
 * Parses an ICS (iCalendar) string and returns a list of events
 * without `id` or `createdAt` (those are added by the caller).
 */
export function parseICSContent(icsContent: string): Omit<Event, 'id' | 'createdAt'>[] {
  const events: Omit<Event, 'id' | 'createdAt'>[] = [];
  const lines = icsContent.split(/\r?\n/);

  let currentEvent: Partial<Omit<Event, 'id' | 'createdAt'>> | null = null;
  let inEvent = false;
  // ICS lines can be "folded" — continuation lines start with a space or tab
  const unfoldedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfoldedLines.length > 0) {
      unfoldedLines[unfoldedLines.length - 1] += line.slice(1);
    } else {
      unfoldedLines.push(line);
    }
  }

  for (const rawLine of unfoldedLines) {
    const line = rawLine.trim();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = { type: 'other' };
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
          source: currentEvent.source,
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
        const dateStr = line.split(':').slice(1).join(':').trim();
        if (dateStr) currentEvent.startTime = parseICSDate(dateStr);
      } else if (line.startsWith('DTEND')) {
        const dateStr = line.split(':').slice(1).join(':').trim();
        if (dateStr) currentEvent.endTime = parseICSDate(dateStr);
      } else if (line.startsWith('LOCATION:')) {
        const loc = line.substring(9).trim();
        if (loc) currentEvent.location = loc;
      } else if (line.startsWith('DESCRIPTION:')) {
        const desc = line.substring(12).toLowerCase();
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

/**
 * Infer event type from the summary/name as a fallback when description
 * doesn't have enough signal.
 */
export function inferEventType(name: string): Event['type'] {
  const lower = name.toLowerCase();
  if (lower.includes('troop meeting') || lower.includes('patrol meeting') || lower.includes('green bar')) {
    return 'meeting';
  }
  if (lower.includes('camp') || lower.includes('camporee') || lower.includes('jamboree') || lower.includes('backpack')) {
    return 'campout';
  }
  if (lower.includes('service') || lower.includes('eagle project') || lower.includes('volunteer')) {
    return 'service';
  }
  return 'other';
}

/**
 * Parses an ICS datetime string into a local ISO-like string.
 * Handles YYYYMMDDTHHMMSSZ (UTC), YYYYMMDDTHHMMSS (local), and YYYYMMDD (all-day).
 */
export function parseICSDate(dateStr: string): string {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  if (dateStr.includes('T')) {
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    const isUTC = dateStr.endsWith('Z');

    if (isUTC) {
      const utcDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
      const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      const ly = localDate.getFullYear();
      const lm = String(localDate.getMonth() + 1).padStart(2, '0');
      const ld = String(localDate.getDate()).padStart(2, '0');
      const lh = String(localDate.getHours()).padStart(2, '0');
      const lmin = String(localDate.getMinutes()).padStart(2, '0');
      return `${ly}-${lm}-${ld}T${lh}:${lmin}:00`;
    }

    return `${year}-${month}-${day}T${hour}:${minute}:00`;
  }

  return `${year}-${month}-${day}T00:00:00`;
}
