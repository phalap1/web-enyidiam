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

## Content

- `src/data/site.ts`: names, dates, funeral programme, contact details
- `src/content/chapters/`: her life story, one markdown file per chapter
- `src/content/tributes/`: one markdown file per tribute (optional photo in `src/assets/tributes/`)
- `src/data/gallery.ts`: gallery photos (originals in `src/assets/gallery/`)
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

Still to replace: tribute texts, chapter text marked *Placeholder*, the
"Photograph to come" images, the video ids, and the WhatsApp/email in `site.ts`.

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
