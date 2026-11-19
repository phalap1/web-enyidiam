// Family map: data from src/data/family.json (written by `npm run records`)
// and a simple generational layout worked out at build time.
import type { ImageMetadata } from 'astro';
import data from '../data/family.json';
import { portraits } from '../data/gallery';

export interface Person {
  id: string;
  name: string | null;
  title?: string | null;
  pending: boolean;
  nameOnly?: boolean;
  private?: boolean;
  sex: string | null;
  father: string | null;
  mother: string | null;
  childOf: string | null;
  linkedTo: string | null;
  link: string | null;
  order: number | null;
  late: boolean | null;
  otherNames?: string[];
  born?: string | null;
  bornYear?: string | null;
  died?: string | null;
  diedYear?: string | null;
  bornWhere?: string | null;
  hometown?: string | null;
  work?: string | null;
  note?: string | null;
  photo?: string | null;
}

export interface Marriage {
  id: string;
  husband: string;
  wife: string;
  wifeNo: number | null;
  type: string | null;
  year: string | null;
  ended: string | null;
  note: string | null;
}

export const ROOT = 'P001';
export const people = data.people as Person[];
export const marriages = data.marriages as Marriage[];
export const byId = new Map(people.map((p) => [p.id, p]));

const photoFiles = import.meta.glob<{ default: ImageMetadata }>('../assets/family/*.{jpg,jpeg,png,webp}', { eager: true });
export function photoOf(p: Person): ImageMetadata | undefined {
  if (p.photo) {
    const hit = Object.entries(photoFiles).find(([k]) => k.endsWith(`/${p.photo}`));
    if (hit) return hit[1].default;
  }
  return p.id === ROOT ? portraits.face : undefined;
}

// ---------- names ----------
export function displayName(p: Person) {
  if (p.private) return 'Family member';
  if (p.pending || !p.name) return 'Name to come';
  return p.name;
}
export function fullName(p: Person) {
  return p.title && !p.pending ? `${p.title} ${displayName(p)}` : displayName(p);
}
export function initials(p: Person) {
  if (p.pending || !p.name) return '';
  const parts = p.name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
export function years(p: Person) {
  const b = p.bornYear, d = p.diedYear;
  if (b && d) return `${b} – ${d}`;
  if (b && p.late) return `${b} – ?`;
  if (b) return `Born ${b}`;
  if (d) return `Died ${d}`;
  return p.late ? 'Late' : '';
}

// ---------- relations ----------
export const childrenOf = (id: string) =>
  people
    .filter((p) => p.father === id || p.mother === id)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (a.bornYear ?? '9999').localeCompare(b.bornYear ?? '9999') || a.id.localeCompare(b.id));
export const spousesOf = (id: string) =>
  marriages
    .filter((m) => m.husband === id || m.wife === id)
    .sort((a, b) => (a.wifeNo ?? 9) - (b.wifeNo ?? 9))
    .map((m) => byId.get(m.husband === id ? m.wife : m.husband)!)
    .filter(Boolean);
export const parentsOf = (p: Person) => [p.father, p.mother].filter(Boolean).map((id) => byId.get(id!)!).filter(Boolean);
export const linkedFrom = (id: string) => people.filter((p) => p.linkedTo === id);

const LINK_STEP: Record<string, number> = {
  'Uncle / Aunt': -1, Grandparent: -2, Guardian: -1, 'Nephew / Niece': 1, Grandchild: 2,
};
export function linkWord(link: string | null, sex: string | null = null) {
  const pick = (m: string, f: string, either: string) => (sex === 'Male' ? m : sex === 'Female' ? f : either);
  switch (link) {
    case 'Uncle / Aunt': return pick('uncle', 'aunt', 'uncle or aunt');
    case 'Brother / Sister': return pick('brother', 'sister', 'brother or sister');
    case 'Half-brother / Half-sister': return pick('half-brother', 'half-sister', 'half-sibling');
    case 'Nephew / Niece': return pick('nephew', 'niece', 'nephew or niece');
    case 'Grandparent': return pick('grandfather', 'grandmother', 'grandparent');
    case 'Grandchild': return pick('grandson', 'granddaughter', 'grandchild');
    case 'Close family friend': return 'family friend';
    default: return (link ?? 'relative').toLowerCase();
  }
}

// ---------- generations ----------
function generations() {
  const gen = new Map<string, number>();
  const seeds = [ROOT, ...people.map((p) => p.id)];
  for (const seed of seeds) {
    if (gen.has(seed) || !byId.has(seed)) continue;
    gen.set(seed, 0);
    const queue = [seed];
    while (queue.length) {
      const id = queue.shift()!;
      const g = gen.get(id)!;
      const p = byId.get(id)!;
      const next: [string | null, number][] = [
        [p.father, g - 1], [p.mother, g - 1],
        ...childrenOf(id).map((c) => [c.id, g + 1] as [string, number]),
        ...spousesOf(id).map((s) => [s.id, g] as [string, number]),
        [p.linkedTo, g - (LINK_STEP[p.link ?? ''] ?? 0)],
        ...linkedFrom(id).map((q) => [q.id, g + (LINK_STEP[q.link ?? ''] ?? 0)] as [string, number]),
      ];
      for (const [n, ng] of next) {
        if (n && byId.has(n) && !gen.has(n)) { gen.set(n, ng); queue.push(n); }
      }
    }
  }
  return gen;
}

// ---------- layout ----------
export const NODE_W = 172;
export const NODE_H = 92;
const GAP = 26;
const SPOUSE_GAP = 40;
const ROW_H = 210;
const PAD = 80;

interface Unit { members: string[]; x: number; w: number; row: number }

export function layout() {
  const gen = generations();
  const minG = Math.min(...gen.values());
  const maxG = Math.max(...gen.values());

  // order of first visit, so families start out grouped together
  const seq = new Map<string, number>();
  const visit = (id: string | null) => {
    if (!id || seq.has(id) || !byId.has(id)) return;
    const p = byId.get(id)!;
    seq.set(id, seq.size);
    visit(p.father); visit(p.mother);
    spousesOf(id).forEach((s) => visit(s.id));
    childrenOf(id).forEach((c) => visit(c.id));
    linkedFrom(id).forEach((q) => visit(q.id));
  };
  // start from the top of Mama's line so her parents' side sits left, husband's side right
  visit(ROOT);
  people.forEach((p) => visit(p.id));

  // spouses in the same generation travel together; a man with several wives sits in the middle
  const unitOf = new Map<string, Unit>();
  const units: Unit[] = [];
  for (const p of [...people].sort((a, b) => seq.get(a.id)! - seq.get(b.id)!)) {
    if (unitOf.has(p.id)) continue;
    const group = new Set([p.id]);
    const stack = [p.id];
    while (stack.length) {
      const id = stack.pop()!;
      for (const s of spousesOf(id)) {
        if (!group.has(s.id) && gen.get(s.id) === gen.get(p.id)) { group.add(s.id); stack.push(s.id); }
      }
    }
    const ids = [...group];
    const hub = ids.reduce((a, b) => (spousesOf(b).length > spousesOf(a).length ? b : a));
    const others = spousesOf(hub).map((s) => s.id).filter((id) => group.has(id));
    const rest = ids.filter((id) => id !== hub && !others.includes(id));
    const left: string[] = [], right: string[] = [];
    others.forEach((id, i) => (i % 2 === 0 ? left.unshift(id) : right.push(id)));
    const members = others.length ? [...left, hub, ...right, ...rest] : ids;
    const u: Unit = { members, x: 0, w: members.length * NODE_W + (members.length - 1) * SPOUSE_GAP, row: gen.get(hub)! - minG };
    members.forEach((id) => unitOf.set(id, u));
    units.push(u);
  }

  const rows: Unit[][] = Array.from({ length: maxG - minG + 1 }, () => []);
  units.forEach((u) => rows[u.row].push(u));
  rows.forEach((r) => r.sort((a, b) => Math.min(...a.members.map((m) => seq.get(m)!)) - Math.min(...b.members.map((m) => seq.get(m)!))));

  const cx = (id: string) => { const u = unitOf.get(id)!; return u.x + u.members.indexOf(id) * (NODE_W + SPOUSE_GAP) + NODE_W / 2; };
  const unitCx = (u: Unit) => u.x + u.w / 2;

  const pack = (row: Unit[]) => { let x = 0; for (const u of row) { u.x = x; x += u.w + GAP * 2; } };
  rows.forEach(pack);

  // where each member would like its unit to sit, given its neighbours above or below
  const wantFromParents = (u: Unit) => {
    const xs: number[] = [];
    for (const id of u.members) {
      const p = byId.get(id)!;
      const ps = [p.father, p.mother].filter((q) => q && unitOf.has(q) && unitOf.get(q)!.row < u.row) as string[];
      if (ps.length) xs.push(ps.reduce((s, q) => s + cx(q), 0) / ps.length + (u.members.indexOf(id) - (u.members.length - 1) / 2) * -(NODE_W + SPOUSE_GAP));
      else if (p.linkedTo && unitOf.has(p.linkedTo)) xs.push(cx(p.linkedTo));
    }
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const wantFromChildren = (u: Unit) => {
    const xs: number[] = [];
    for (const id of u.members) {
      for (const c of childrenOf(id)) if (unitOf.get(c.id)!.row > u.row) xs.push(cx(c.id));
      for (const q of linkedFrom(id)) if (unitOf.get(q.id)!.row !== u.row) xs.push(cx(q.id));
      const own = byId.get(id)!.linkedTo;
      if (own && unitOf.has(own) && unitOf.get(own)!.row !== u.row) xs.push(cx(own));
    }
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };

  // place units as close to where they want to be as the row allows
  const settle = (row: Unit[], want: (u: Unit) => number | null) => {
    const target = row.map((u) => { const w = want(u); return w === null ? unitCx(u) : w; });
    const order = row.map((u, i) => ({ u, t: target[i] })).sort((a, b) => a.t - b.t);
    row.splice(0, row.length, ...order.map((o) => o.u));
    const t = order.map((o) => o.t - o.u.w / 2);
    const l2r = t.slice(), r2l = t.slice();
    for (let i = 1; i < row.length; i++) l2r[i] = Math.max(l2r[i], l2r[i - 1] + row[i - 1].w + GAP);
    for (let i = row.length - 2; i >= 0; i--) r2l[i] = Math.min(r2l[i], r2l[i + 1] - row[i].w - GAP);
    const mid = t.map((_, i) => (l2r[i] + r2l[i]) / 2);
    for (let i = 1; i < row.length; i++) mid[i] = Math.max(mid[i], mid[i - 1] + row[i - 1].w + GAP);
    row.forEach((u, i) => (u.x = mid[i]));
  };

  for (let pass = 0; pass < 8; pass++) {
    for (let r = 1; r < rows.length; r++) settle(rows[r], wantFromParents);
    for (let r = rows.length - 2; r >= 0; r--) settle(rows[r], wantFromChildren);
  }
  for (let r = 1; r < rows.length; r++) settle(rows[r], wantFromParents);

  const minX = Math.min(...units.map((u) => u.x));
  units.forEach((u) => (u.x += PAD - minX));
  const width = Math.max(...units.map((u) => u.x + u.w)) + PAD;
  const height = rows.length * ROW_H - (ROW_H - NODE_H) + PAD * 2;
  const top = (row: number) => PAD + row * ROW_H;

  const nodes = people.map((p) => {
    const u = unitOf.get(p.id)!;
    return { p, x: cx(p.id) - NODE_W / 2, y: top(u.row), gen: gen.get(p.id)! };
  });
  const at = new Map(nodes.map((n) => [n.p.id, n]));

  // ---------- lines ----------
  const paths: { d: string; kind: 'marriage' | 'child' | 'adopted' | 'link'; ids: string[] }[] = [];
  const labels: { x: number; y: number; text: string; ids: string[] }[] = [];
  const midY = (id: string) => at.get(id)!.y + 34;

  for (const m of marriages) {
    const a = at.get(m.husband), b = at.get(m.wife);
    if (!a || !b) continue;
    const [l, r] = a.x < b.x ? [a, b] : [b, a];
    if (l.y === r.y && Math.abs(r.x - l.x - NODE_W - SPOUSE_GAP) < 1) {
      paths.push({ d: `M${l.x + NODE_W - 22},${midY(l.p.id)} H${r.x + 22}`, kind: 'marriage', ids: [m.husband, m.wife] });
    } else {
      const y = Math.min(l.y, r.y) - 6;
      paths.push({ d: `M${l.x + NODE_W / 2},${l.y} C${l.x + NODE_W / 2},${y - 50} ${r.x + NODE_W / 2},${y - 50} ${r.x + NODE_W / 2},${r.y}`, kind: 'marriage', ids: [m.husband, m.wife] });
    }
  }

  // children hang from their parents' line through a short "bus"
  const families = new Map<string, Person[]>();
  for (const p of people) {
    if (!p.father && !p.mother) continue;
    const key = `${p.father ?? ''}+${p.mother ?? ''}`;
    families.set(key, [...(families.get(key) ?? []), p]);
  }
  const busCount = new Map<number, number>();
  for (const [key, kids] of families) {
    const [f, m] = key.split('+').filter(Boolean).length === 2 ? key.split('+') : [key.split('+').find(Boolean)!, ''];
    const pa = at.get(f), pb = m ? at.get(m) : undefined;
    if (!pa) continue;
    let ax: number, ay: number;
    if (pb && pa.y === pb.y) { ax = (pa.x + pb.x + NODE_W) / 2; ay = midY(pa.p.id); }
    else { ax = pa.x + NODE_W / 2; ay = pa.y + NODE_H; }
    const placed = kids.map((k) => at.get(k.id)!).filter((k) => k.y > pa.y);
    if (!placed.length) continue;
    const childTop = Math.min(...placed.map((k) => k.y));
    const n = busCount.get(childTop) ?? 0;
    busCount.set(childTop, n + 1);
    const busY = childTop - 44 - (n % 3) * 12;
    const parents = [f, m].filter(Boolean);
    const xs = placed.map((k) => k.x + NODE_W / 2);
    const lo = Math.min(ax, ...xs), hi = Math.max(ax, ...xs);
    paths.push({ d: `M${ax},${ay} V${busY} M${lo},${busY} H${hi}`, kind: 'child', ids: [...parents, ...placed.map((k) => k.p.id)] });
    for (const k of placed) {
      paths.push({ d: `M${k.x + NODE_W / 2},${busY} V${k.y}`, kind: k.p.childOf ? 'adopted' : 'child', ids: [...parents, k.p.id] });
    }
  }

  for (const p of people) {
    if (!p.linkedTo || !at.has(p.linkedTo)) continue;
    const a = at.get(p.id)!, b = at.get(p.linkedTo)!;
    const x1 = a.x + NODE_W / 2, y1 = a.y < b.y ? a.y + NODE_H : a.y;
    const x2 = b.x + NODE_W / 2, y2 = a.y < b.y ? b.y : b.y + NODE_H;
    const my = (y1 + y2) / 2;
    paths.push({ d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, kind: 'link', ids: [p.id, p.linkedTo] });
    labels.push({ x: (x1 + x2) / 2, y: my, text: linkWord(p.link, p.sex), ids: [p.id, p.linkedTo] });
  }

  const genName = (g: number) =>
    ({ [-3]: 'Great-grandparents', [-2]: 'Grandparents', [-1]: 'Her parents’ generation', 0: 'Mama’s generation', 1: 'Children', 2: 'Grandchildren', 3: 'Great-grandchildren', 4: 'Great-great-grandchildren' } as Record<number, string>)[g] ?? `Generation ${g}`;
  const bands = rows.map((_, r) => ({ y: top(r), label: genName(r + minG) }));

  return { nodes, paths, labels, bands, width, height, root: at.get(ROOT) };
}

// ---------- branches, for the filters ----------
export function branches() {
  const out = new Map<string, Set<string>>(people.map((p) => [p.id, new Set<string>()]));
  const tag = (id: string, b: string) => out.get(id)?.add(b);
  const descendants = (id: string, acc = new Set<string>()) => {
    for (const c of childrenOf(id)) if (!acc.has(c.id)) { acc.add(c.id); descendants(c.id, acc); }
    return acc;
  };
  const ancestors = (id: string, acc = new Set<string>()) => {
    for (const p of parentsOf(byId.get(id)!)) if (!acc.has(p.id)) { acc.add(p.id); ancestors(p.id, acc); }
    return acc;
  };
  const withSpouses = (ids: Set<string>) => { for (const id of [...ids]) spousesOf(id).forEach((s) => ids.add(s.id)); return ids; };

  const line = descendants(ROOT, new Set([ROOT]));
  const lineAndSpouses = withSpouses(new Set(line));
  for (const id of lineAndSpouses) tag(id, 'line');

  const parentSide = new Set<string>();
  for (const a of ancestors(ROOT)) { parentSide.add(a); descendants(a, parentSide); }
  linkedFrom(ROOT).forEach((q) => parentSide.add(q.id));
  for (const id of withSpouses(parentSide)) if (!line.has(id)) tag(id, 'parents');

  const husbandSide = new Set<string>();
  for (const h of spousesOf(ROOT)) {
    husbandSide.add(h.id);
    for (const a of ancestors(h.id)) { husbandSide.add(a); descendants(a, husbandSide); }
    descendants(h.id, husbandSide);
  }
  for (const id of withSpouses(husbandSide)) if (id !== ROOT && !line.has(id)) tag(id, 'husband');
  spousesOf(ROOT).forEach((h) => tag(h.id, 'husband'));
  return out;
}
