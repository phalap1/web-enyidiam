// prefixes links with the base path (needed for github pages /repo/)
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export function url(path = ''): string {
  const clean = path.replace(/^\/+/, '');
  if (!clean) return BASE;
  const isFile = /\.[a-z0-9]+$/i.test(clean.split(/[?#]/)[0]);
  return BASE + (isFile || clean.endsWith('/') || /[?#]/.test(clean) ? clean : `${clean}/`);
}

export const BASE_URL = BASE;
