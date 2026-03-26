// Server function to fetch a Scoutbook ICS calendar URL server-side,
// bypassing browser CORS restrictions.
import { createServerFn } from '@tanstack/react-start';

export const fetchCalendarICS = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    const { url } = data;

    // Basic URL validation
    if (!url || !url.startsWith('http')) {
      throw new Error('Invalid calendar URL.');
    }

    try {
      const response = await fetch(url, {
        headers: {
          // Some ICS servers require an Accept header
          Accept: 'text/calendar, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`Calendar server returned ${response.status} ${response.statusText}.`);
      }

      const icsText = await response.text();

      if (!icsText.includes('BEGIN:VCALENDAR')) {
        throw new Error('The URL does not point to a valid ICS calendar file.');
      }

      return { icsText };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Could not fetch calendar: ${msg}`);
    }
  });
