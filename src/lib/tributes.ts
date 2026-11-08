import { getCollection, type CollectionEntry } from 'astro:content';

export type Tribute = CollectionEntry<'tributes'>;

export async function getTributes(): Promise<Tribute[]> {
  const all = await getCollection('tributes');
  return all.sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name));
}

// first sentence, used if there is no pullQuote
export function excerpt(t: Tribute, max = 200): string {
  if (t.data.pullQuote) return t.data.pullQuote;
  const text = (t.body ?? '').replace(/[#*_>`\[\]]/g, '').replace(/\s+/g, ' ').trim();
  const first = text.match(/^.*?[.!?](\s|$)/)?.[0]?.trim() ?? text;
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

// split featured tributes between the spotlight slots so none repeats on a page
export async function spotlightPools(slots: number, offset = 0): Promise<Tribute[][]> {
  const featured = (await getTributes()).filter((t) => t.data.featured);
  const pools: Tribute[][] = Array.from({ length: slots }, () => []);
  featured.forEach((t, i) => pools[(i + offset) % slots].push(t));
  return pools;
}
