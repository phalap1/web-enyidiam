import type { APIRoute } from 'astro';
import { funeral, person } from '../data/site';

// calendar file for "add to my calendar"
const stamp = (local: string) => local.replace(/[-:]/g, '').slice(0, 13) + '00';
const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1');
const plusHour = (local: string) => {
  const [d, t] = local.split('T');
  const [h, m] = t.split(':').map(Number);
  return `${d}T${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const GET: APIRoute = () => {
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const events = funeral.flatMap((day) =>
    day.events.map((e, i) => {
      const endLocal = stamp(e.end ?? plusHour(e.start));
      return [
        'BEGIN:VEVENT',
        `UID:${day.date}-${i}@enyidia-memorial`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=Africa/Lagos:${stamp(e.start)}`,
        `DTEND;TZID=Africa/Lagos:${endLocal}`,
        `SUMMARY:${esc(`${e.title} · ${person.fullName}`)}`,
        `LOCATION:${esc(e.venue)}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT12H',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(e.title)}`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n');
    }),
  );

  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Enyidia Memorial//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:Africa/Lagos',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0100',
    'TZNAME:WAT',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');

  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
