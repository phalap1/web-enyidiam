// Reads records/family-records.xlsx and writes the site data:
//   src/data/family.json               people + marriages for the family map
//   src/content/tributes/records/*.md  tributes with permission to publish
// Usage: npm run records            (write)
//        npm run records -- --check (only report problems)

import ExcelJS from 'exceljs';
import sharp from 'sharp';
import { mkdir, readdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const file = path.resolve(root, args.find((a) => !a.startsWith('--')) ?? 'records/family-records.xlsx');
const photoDir = path.join(root, 'records/photos');

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const exists = (p) => access(p).then(() => true, () => false);

function text(v) {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim();
    if ('result' in v) return text(v.result);
    if ('text' in v) return text(v.text);
    return '';
  }
  return String(v).replace(/\r\n?/g, '\n').trim();
}

// rows from row 3 down (row 1 = column names, row 2 = help text)
function readSheet(wb, name, keys) {
  const ws = wb.getWorksheet(name);
  if (!ws) { err(name, 'sheet is missing'); return []; }
  const header = ws.getRow(1).values.slice(1).map((h) => text(h).replace(/\s*\*$/, ''));
  const rows = [];
  ws.eachRow((row, n) => {
    if (n < 3) return;
    const obj = { _row: n };
    keys.forEach(([key, title]) => {
      const col = header.indexOf(title);
      if (col === -1) { if (n === 3) err(name, `column "${title}" is missing`); return; }
      obj[key] = text(row.getCell(col + 1).value);
    });
    if (keys.some(([k]) => obj[k])) rows.push(obj);
  });
  return rows;
}

const yearOf = (s) => (s.match(/\d{4}/) ?? [''])[0];
const isPending = (name) => !name || /^\(.*\)$/.test(name);
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 40);

const wb = new ExcelJS.Workbook();
try {
  await wb.xlsx.readFile(file);
} catch (e) {
  console.error(`Could not open ${path.relative(root, file)}: ${e.message}`);
  process.exit(1);
}

// ---------- people ----------
const peopleRows = readSheet(wb, 'People', [
  ['id', 'ID'], ['name', 'Full name'], ['title', 'Title'], ['otherNames', 'Other names'], ['sex', 'Sex'],
  ['father', 'Father (ID)'], ['mother', 'Mother (ID)'], ['childOf', 'Child of them by'],
  ['linkedTo', 'Linked to (ID)'], ['link', 'Link'], ['born', 'Born'], ['bornWhere', 'Born where'],
  ['alive', 'Living or late'], ['died', 'Died'], ['hometown', 'Hometown / compound'], ['work', 'Work / role'],
  ['order', 'Birth order'], ['note', 'Note for the website'], ['photo', 'Photo file'], ['show', 'Show on website'],
]);

const byId = new Map();
for (const p of peopleRows) {
  const at = `People row ${p._row}`;
  p.id = p.id.toUpperCase();
  if (!/^P\d+$/.test(p.id)) { err(at, `ID "${p.id}" should look like P001`); continue; }
  if (byId.has(p.id)) { err(at, `${p.id} is used twice (also row ${byId.get(p.id)._row})`); continue; }
  byId.set(p.id, p);
}

for (const p of byId.values()) {
  const at = `${p.id} (row ${p._row})`;
  for (const k of ['father', 'mother', 'linkedTo']) {
    p[k] = p[k].toUpperCase();
    if (p[k] && !byId.has(p[k])) err(at, `${k} ${p[k]} is not on the People sheet`);
    if (p[k] === p.id) err(at, `${k} points at themselves`);
  }
  if (p.father && byId.get(p.father)?.sex === 'Female') warn(at, `father ${p.father} is marked Female`);
  if (p.mother && byId.get(p.mother)?.sex === 'Male') warn(at, `mother ${p.mother} is marked Male`);
  if (p.linkedTo && (p.father || p.mother)) warn(at, 'has parents and a "Linked to"; the parents win');
  if (p.linkedTo && !p.link) warn(at, '"Linked to" is set but Link is empty');
  if (p.order && !/^\d+$/.test(p.order)) warn(at, `birth order "${p.order}" should be a number`);
  if (p.alive === 'Living' && p.died) warn(at, 'marked Living but has a death date');
  if (p.photo && !(await exists(path.join(photoDir, p.photo)))) warn(at, `photo records/photos/${p.photo} not found`);
}

// nobody can be their own ancestor
for (const p of byId.values()) {
  const seen = new Set();
  const stack = [p.father, p.mother].filter(Boolean);
  while (stack.length) {
    const id = stack.pop();
    if (id === p.id) { err(p.id, 'is listed as their own ancestor; check Father/Mother'); break; }
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    const q = byId.get(id);
    stack.push(...[q.father, q.mother].filter(Boolean));
  }
}

if (!byId.has('P001')) err('People', 'P001 (Mama) is missing; the map is built around her');

// ---------- marriages ----------
const marriageRows = readSheet(wb, 'Marriages', [
  ['id', 'Marriage ID'], ['husband', 'Husband (ID)'], ['wife', 'Wife (ID)'], ['wifeNo', 'Wife number'],
  ['type', 'Type'], ['year', 'Year'], ['place', 'Place'], ['ended', 'How it ended'], ['note', 'Note for the website'],
]);
const marriages = [];
for (const m of marriageRows) {
  const at = `Marriages row ${m._row}`;
  m.husband = m.husband.toUpperCase();
  m.wife = m.wife.toUpperCase();
  if (!m.husband || !m.wife) { err(at, 'needs both Husband and Wife'); continue; }
  if (!byId.has(m.husband)) { err(at, `husband ${m.husband} is not on People`); continue; }
  if (!byId.has(m.wife)) { err(at, `wife ${m.wife} is not on People`); continue; }
  const n = parseInt(m.wifeNo, 10);
  marriages.push({
    id: m.id || `M${m._row}`, husband: m.husband, wife: m.wife,
    wifeNo: Number.isFinite(n) ? n : null,
    type: m.type || null, year: m.year || null, ended: m.ended || null, note: m.note || null,
  });
}

// children whose parents have no marriage row still draw fine, but say so
const married = new Set(marriages.map((m) => `${m.husband}+${m.wife}`));
for (const p of byId.values()) {
  if (p.father && p.mother && !married.has(`${p.father}+${p.mother}`)) {
    warn(p.id, `parents ${p.father} and ${p.mother} have no row on Marriages`);
    married.add(`${p.father}+${p.mother}`);
  }
}

// ---------- privacy ----------
const visible = (p) => (p.show || 'Full') !== 'Hide';
const neededAsLink = new Set();
for (const p of byId.values()) {
  if (!visible(p)) continue;
  for (const k of ['father', 'mother', 'linkedTo']) if (p[k] && !visible(byId.get(p[k]))) neededAsLink.add(p[k]);
}
for (const m of marriages) {
  const h = byId.get(m.husband), w = byId.get(m.wife);
  if (visible(h) && !visible(w)) neededAsLink.add(w.id);
  if (visible(w) && !visible(h)) neededAsLink.add(h.id);
}

const people = [];
for (const p of byId.values()) {
  const base = {
    id: p.id, sex: p.sex || null, father: p.father || null, mother: p.mother || null,
    childOf: p.childOf && p.childOf !== 'Birth' ? p.childOf : null,
    linkedTo: p.father || p.mother ? null : p.linkedTo || null, link: p.father || p.mother ? null : p.link || null,
    order: p.order ? Number(p.order) : null,
    late: p.alive === 'Late' ? true : p.alive === 'Living' ? false : null,
  };
  if (!visible(p)) {
    if (neededAsLink.has(p.id)) people.push({ ...base, name: null, pending: true, private: true });
    continue;
  }
  const pending = isPending(p.name);
  if ((p.show || 'Full') === 'Name only') {
    people.push({ ...base, name: pending ? null : p.name, title: p.title || null, pending, nameOnly: true });
    continue;
  }
  people.push({
    ...base,
    name: pending ? null : p.name,
    title: p.title || null,
    pending,
    otherNames: p.otherNames ? p.otherNames.split(';').map((s) => s.trim()).filter(Boolean) : [],
    born: p.born || null, bornYear: yearOf(p.born) || null,
    died: p.died || null, diedYear: yearOf(p.died) || null,
    bornWhere: p.bornWhere || null, hometown: p.hometown || null, work: p.work || null,
    note: p.note || null, photo: p.photo || null,
  });
}
// hidden people drop out of marriages unless they are a needed link
const ids = new Set(people.map((p) => p.id));
const publicMarriages = marriages.filter((m) => ids.has(m.husband) && ids.has(m.wife));

// ---------- tributes ----------
const tributeRows = readSheet(wb, 'Tributes', [
  ['id', 'Tribute ID'], ['name', 'Writer\'s name'], ['relation', 'Relationship to Mama'], ['personId', 'On the map? (ID)'],
  ['location', 'Town / city'], ['photo', 'Writer photo'], ['photoAlt', 'Photo description'], ['quote', 'Short quote'],
  ['text', 'Full tribute'], ['permission', 'Permission to publish'], ['featured', 'Feature around the site'],
  ['order', 'Order'],
]);
const tributes = [];
const seenT = new Set();
for (const t of tributeRows) {
  const at = `Tributes row ${t._row}`;
  if (t.permission !== 'Yes') continue;
  if (!t.id) { err(at, 'needs a Tribute ID'); continue; }
  if (seenT.has(t.id)) { err(at, `${t.id} is used twice`); continue; }
  seenT.add(t.id);
  if (!t.name) { err(at, 'needs the writer\'s name'); continue; }
  if (!t.relation) { err(at, 'needs the relationship to Mama'); continue; }
  if (!t.text) { err(at, 'has permission but no tribute text'); continue; }
  if (t.quote.length > 240) err(at, `short quote is ${t.quote.length} letters; keep it to 240`);
  t.personId = t.personId.toUpperCase();
  if (t.personId && !ids.has(t.personId)) warn(at, `person ${t.personId} is not on the map; link dropped`);
  if (t.photo && !(await exists(path.join(photoDir, t.photo)))) { warn(at, `photo records/photos/${t.photo} not found; left out`); t.photo = ''; }
  if (t.photo && !t.photoAlt) warn(at, 'has a photo but no photo description');
  tributes.push(t);
}

// ---------- report ----------
const plural = (n, w) => (w === 'person' ? `${n} ${n === 1 ? 'person' : 'people'}` : `${n} ${w}${n === 1 ? '' : 's'}`);
console.log(`\n${path.relative(root, file)}`);
console.log(`  ${plural(people.length, 'person')} on the map, ${plural(publicMarriages.length, 'marriage')}, ${plural(tributes.length, 'tribute')} ready to publish`);
if (warnings.length) console.log(`\nCheck these (${warnings.length}):\n  - ${warnings.join('\n  - ')}`);
if (errors.length) {
  console.log(`\nFix these first (${errors.length}):\n  - ${errors.join('\n  - ')}`);
  console.log('\nNothing was written.');
  process.exit(1);
}
if (checkOnly) { console.log('\nLooks good. (check only, nothing written)'); process.exit(0); }

// ---------- write ----------
await writeFile(path.join(root, 'src/data/family.json'), JSON.stringify({ people, marriages: publicMarriages }, null, 2) + '\n');

// re-saves a photo upright with no hidden data (location, phone model and so on)
const clean = (from, to) => sharp(from).rotate().toFile(to);

for (const p of people) {
  if (!p.photo) continue;
  await mkdir(path.join(root, 'src/assets/family'), { recursive: true });
  await clean(path.join(photoDir, p.photo), path.join(root, 'src/assets/family', p.photo));
}

const yaml = (v) => JSON.stringify(v);
const mdEscape = (s) => s.replace(/([\\`*_[\]<>#|])/g, '\\$1').replace(/^(\s*)(\d+)\./gm, '$1$2\\.').replace(/^(\s*)([-+])\s/gm, '$1\\$2 ');
const tDir = path.join(root, 'src/content/tributes/records');
await rm(tDir, { recursive: true, force: true });
await mkdir(tDir, { recursive: true });
for (const t of tributes) {
  if (t.photo) {
    await mkdir(path.join(root, 'src/assets/tributes'), { recursive: true });
    await clean(path.join(photoDir, t.photo), path.join(root, 'src/assets/tributes', t.photo));
  }
  const fm = [
    `name: ${yaml(t.name)}`,
    `relation: ${yaml(t.relation)}`,
    t.location && `location: ${yaml(t.location)}`,
    t.personId && ids.has(t.personId) && `personId: ${yaml(t.personId)}`,
    t.photo && `photo: ${yaml(`../../../assets/tributes/${t.photo}`)}`,
    t.photo && `photoAlt: ${yaml(t.photoAlt || t.name)}`,
    t.quote && `pullQuote: ${yaml(t.quote)}`,
    `featured: ${t.featured === 'Yes'}`,
    `order: ${Number(t.order) || 100}`,
  ].filter(Boolean);
  const body = t.text.split(/\n\s*\n|\n/).map((s) => mdEscape(s.trim())).filter(Boolean).join('\n\n');
  await writeFile(path.join(tDir, `${t.id.toLowerCase()}-${slug(t.name)}.md`), `---\n${fm.join('\n')}\n---\n\n${body}\n`);
}

// once real tributes exist, the sample ones go
let removed = 0;
if (tributes.length) {
  const dir = path.join(root, 'src/content/tributes');
  for (const f of await readdir(dir)) {
    if (!f.endsWith('.md')) continue;
    const src = await readFile(path.join(dir, f), 'utf8');
    if (/^placeholder:\s*true\s*$/m.test(src.split('---')[1] ?? '')) { await rm(path.join(dir, f)); removed++; }
  }
}

console.log(`\nWrote src/data/family.json and ${plural(tributes.length, 'tribute')}${removed ? `, removed ${plural(removed, 'sample tribute')}` : ''}.`);
