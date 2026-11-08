import type { APIRoute } from 'astro';
import { person } from '../data/site';

export const GET: APIRoute = () => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return new Response(
    JSON.stringify({
      name: `In Memory of ${person.fullName}`,
      short_name: `Nne ${person.firstName}`,
      description: `${person.praiseName}, ${person.born} – ${person.died}`,
      start_url: base,
      scope: base,
      display: 'standalone',
      background_color: '#fbf7f0',
      theme_color: '#172c57',
      icons: [
        { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
        { src: `${base}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
};
