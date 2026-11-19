// Reads records/website-details.xlsx and writes src/data/details.json, plus the
// photos it lists (cropped 4:5, camera data removed) into src/assets/photos/records.
//
//   npm run details            check and write
//   npm run details -- --check only check, write nothing
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const file = path.resolve(root, args.find((a) => !a.startsWith('--')) ?? 'records/website-details.xlsx');
const photoDir = path.join(root, 'records/photos');
const outPhotos = path.join(root, 'src/assets/photos/records');

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
    if ('hyperlink' in v && 'text' in v) return text(v.hyperlink || v.text);
    if ('result' in v) return text(v.result);
    if ('text' in v) return text(v.text);
    return '';
  }
  return String(v).replace(/\r\n?/g, '\n').trim();
}

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
    if (keys.some(([k, , counts = true]) => counts && obj[k])) rows.push(obj);
  });
  return rows;
}

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/\.[a-z]+$/, '').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 40);

// https://youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /live/ID, /embed/ID
function youtubeId(link) {
  try {
    const u = new URL(link);
    if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1, 12);
    if (u.searchParams.get('v')) return u.searchParams.get('v').slice(0, 11);
    const m = u.pathname.match(/\/(?:shorts|live|embed)\/([\w-]{11})/);
    return m ? m[1] : '';
  } catch {
    return /^[\w-]{11}$/.test(link) ? link : '';
  }
}

if (!(await exists(file))) {
  console.error(`Cannot find ${path.relative(root, file)}`);
  process.exit(1);
}
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);

// ---------- Details ----------
const KNOWN = ['site_url', 'tribute_email', 'tribute_whatsapp', 'contact_name', 'contact_phone', 'dress_code', 'livestream_url', 'directions'];
const details = {};
for (const r of readSheet(wb, 'Details', [['key', 'Item'], ['value', 'Your answer', false]])) {
  const at = `Details row ${r._row}`;
  if (!KNOWN.includes(r.key)) { warn(at, `"${r.key}" is not an item the website uses; ignored`); continue; }
  if (!r.value) continue;
  let v = r.value;
  if (r.key === 'site_url' || r.key === 'livestream_url') {
    if (!/^https?:\/\//.test(v)) v = `https://${v}`;
    try { new URL(v); } catch { err(at, `${r.key} "${r.value}" is not a web address`); continue; }
  }
  if (r.key === 'tribute_email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { err(at, `"${v}" does not look like an email address`); continue; }
  if (r.key === 'tribute_whatsapp' || r.key === 'contact_phone') {
    v = v.replace(/[\s+()-]/g, '');
    if (/^0\d{10}$/.test(v)) v = `234${v.slice(1)}`; // 0803… → 234803…
    if (!/^\d{10,15}$/.test(v)) { err(at, `${r.key} "${r.value}" should be digits like 2348031234567`); continue; }
  }
  details[r.key] = v;
}

// ---------- Videos ----------
const videos = [];
for (const r of readSheet(wb, 'Videos', [['order', 'Order', false], ['link', 'YouTube link'], ['title', 'Title'], ['description', 'Short description'], ['when', 'When recorded'], ['cover', 'Cover photo file'], ['show', 'Show on website', false]])) {
  const at = `Videos row ${r._row}`;
  if (r.show !== 'Yes') continue;
  const id = youtubeId(r.link);
  if (!id) { err(at, `cannot read a YouTube video from "${r.link}"`); continue; }
  if (!r.title) { err(at, 'needs a Title'); continue; }
  if (r.cover && !(await exists(path.join(photoDir, r.cover)))) { err(at, `cover photo ${r.cover} is not in records/photos`); continue; }
  videos.push({ id, title: r.title, description: r.description || undefined, when: r.when || undefined, cover: r.cover || undefined, order: Number(r.order) || 100 });
}
videos.sort((a, b) => a.order - b.order);

// ---------- Photos ----------
const photos = [];
const seen = new Set();
for (const r of readSheet(wb, 'Photos', [['file', 'File name'], ['caption', 'Caption'], ['alt', 'What the photo shows'], ['when', 'Year or era'], ['useOn', 'Use on'], ['focus', 'Keep in frame'], ['permission', 'Permission', false]])) {
  const at = `Photos row ${r._row}`;
  if (r.permission !== 'Yes') { if (r.permission !== 'No') warn(at, `${r.file || 'photo'} has no permission yet, left off the site`); continue; }
  if (!r.file) { err(at, 'needs a File name'); continue; }
  if (seen.has(r.file)) { err(at, `${r.file} is listed twice`); continue; }
  seen.add(r.file);
  if (!(await exists(path.join(photoDir, r.file)))) { err(at, `${r.file} is not in records/photos`); continue; }
  if (!r.caption) err(at, 'needs a Caption');
  if (!r.alt) err(at, 'needs "What the photo shows"');
  const meta = await sharp(path.join(photoDir, r.file)).metadata().catch(() => null);
  if (!meta) { err(at, `${r.file} is not an image the site can read`); continue; }
  const w = meta.orientation >= 5 ? meta.height : meta.width;
  if (w < 600) warn(at, `${r.file} is only ${w} pixels wide and may look soft; a bigger copy is better`);
  photos.push({ ...r, out: `${slug(r.file)}.jpg` });
}

// ---------- report ----------
for (const w of warnings) console.log(`  note  ${w}`);
for (const e of errors) console.log(`  fix   ${e}`);
if (errors.length) {
  console.log(`\n${errors.length} thing${errors.length === 1 ? '' : 's'} to fix in ${path.relative(root, file)}. Nothing was written.`);
  process.exit(1);
}
if (checkOnly) { console.log('\nAll good. (Check only, nothing written.)'); process.exit(0); }

// photos: upright 4:5, person kept in frame, metadata dropped (sharp writes none by default)
const POS = { 'Top': 'north', 'Centre': 'centre', 'Bottom': 'south' };
await rm(outPhotos, { recursive: true, force: true });
await mkdir(outPhotos, { recursive: true });
await writeFile(path.join(outPhotos, '.gitkeep'), '');
for (const p of photos) {
  const img = sharp(path.join(photoDir, p.file)).rotate();
  const { width, height } = await img.metadata().then((m) => (m.orientation >= 5 ? { width: m.height, height: m.width } : m));
  const tw = Math.min(width, Math.round(height * 0.8));
  await img
    .resize({ width: tw, height: Math.round(tw * 1.25), fit: 'cover', position: POS[p.focus] ?? sharp.strategy.attention })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(path.join(outPhotos, p.out));
}
for (const v of videos) {
  if (!v.cover) continue;
  const out = `cover-${slug(v.cover)}.jpg`;
  await sharp(path.join(photoDir, v.cover)).rotate().resize({ width: 1280, height: 720, fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 85, mozjpeg: true }).toFile(path.join(outPhotos, out));
  v.cover = out;
}

const data = {
  details,
  videos: videos.map(({ order, ...v }) => v),
  photos: photos.map((p) => ({ file: p.out, caption: p.caption, alt: p.alt, era: p.when || undefined, home: p.useOn === 'Gallery and home page' })),
};
await writeFile(path.join(root, 'src/data/details.json'), JSON.stringify(data, null, 2) + '\n');
const n = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
console.log(`\nWrote src/data/details.json: ${n(Object.keys(details).length, 'detail')}, ${n(videos.length, 'video')}, ${n(photos.length, 'photo')}.`);
