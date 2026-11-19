# Enyidia'm

Memorial site for Madam Enyidia Margaret Nwosu (Nne Omereoha), 1948 – 2026.

Built with Astro as a static site. Most visitors will be on slow mobile data,
so it ships very little JavaScript, serves AVIF/WebP images and keeps working
offline through a service worker.

## Running it

```bash
npm install
npm run dev      # localhost:4321
npm run build    # output in dist/
npm run preview
```

Node 22.12 or newer.

## Family records

`records/family-records.xlsx` holds the family tree, the tributes, story notes
and open questions for the elders. Open it in Excel, LibreOffice or Google
Sheets (download as .xlsx when done). The "Start here" sheet explains every
column. Photos for people and tribute writers go in `records/photos/`.

```bash
npm run records             # reads the sheet, writes src/data/family.json and the tributes
npm run records -- --check  # only lists problems
```

Only tributes marked "Yes" under permission are published. Once the first real
tribute is imported, the sample tributes (`placeholder: true`) are removed.
"Lives now", the source columns and private notes are never written out.

The family map is built from `src/data/family.json` (`src/lib/family.ts`
works out the layout, `src/components/FamilyMap.astro` draws it). It is on the
story page (opened from `FamilyPreview`) and the funeral page (opened from
`FamilyPit`, under "Left to mourn her are"); it is not in the menu. Any link to
`#family` or `#family-P004` on those pages opens it, and leaving it goes back
to the exact spot on that page. To add it to another page, place
`<FamilyMap home="id-of-the-opening-card" />` and mark the photo the map should
open out of with `data-family-origin`.

The "Made by Innova Byte™" line lives in `maker` in `src/data/site.ts`. Keep
™ until the trade mark is registered; only then switch it to ®.

`notes/story-original.md` keeps the first transcript of her story word for word.

## Content

- `src/data/site.ts`: names, dates, funeral programme, contact details
- `src/content/chapters/`: her life story, one markdown file per chapter
- `src/content/tributes/`: one markdown file per tribute (optional photo in `src/assets/tributes/`);
  the ones in `records/` are written by `npm run records`, so edit the sheet, not those files
- `src/data/gallery.ts`: gallery photos (in `src/assets/photos/`, each cropped 4:5 with Mama in the middle so the grid stays even)
- `src/data/videos.ts`: unlisted YouTube video ids

Example tribute:

```markdown
---
name: Ada Okafor
relation: Granddaughter
location: Enugu
photo: ../../assets/tributes/ada.jpg
featured: true
order: 10
---

Tribute text here.
```

`featured: true` puts it in the rotating quotes around the site.

## Website details

`records/website-details.xlsx` collects everything else the site still needs:
a "Still needed" checklist, the contact details and website address
(Details), videos (YouTube links) and photographs. Photo files go in
`records/photos/`. Then run:

```sh
npm run details           # check and update the site
npm run details -- --check
```

It writes `src/data/details.json` and puts the photos, cropped to the same
upright shape with camera data removed, in `src/assets/photos/records/`.
Blank answers are left off the site; until the Videos sheet has links, the
videos page keeps its empty slots.

The download button in the poster view serves `/burial-poster.jpg`, the
poster with a thin credit strip added underneath
(`src/assets/posters/credit-strip.png`).

Still to replace: the sample tributes, the "Still to come" notes in the
chapters, the video ids (the videos page borrows gallery photos as covers
until then), and the
WhatsApp/email in `site.ts`.

## Deploying

**Cloudflare Pages:** build command `npm run build`, output `dist`, and set
`SITE_URL` to the site address. `public/_headers` sets the cache headers.

**Vercel:** import the repo. `vercel.json` has the build and header settings.

**GitHub Pages:** pushing to `main` runs `.github/workflows/deploy.yml`. In the
repo go to Settings → Pages and choose "GitHub Actions" as the source.

## Notes

- Images are resized and converted at build time. Every `<img>` has a width and
  height, and everything below the first screen is lazy loaded.
- YouTube videos show a poster image and only load the player when tapped.
- The service worker (`src/sw/sw.template.js`) caches pages and any photos
  people have viewed. On the gallery page there is a button to save all photos
  for offline viewing.
- `/funeral.ics` adds the funeral programme to a phone calendar.
