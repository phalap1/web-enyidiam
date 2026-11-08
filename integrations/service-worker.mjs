// writes dist/sw.js after the build with the list of files to precache.
// photos are left out on purpose, they get cached as people view them.

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHELL_EXT = /\.(html|css|js|woff2|webmanifest|svg|ico|ics)$/i;
const SKIP = [/^sw\.js$/, /^404\.html$/, /^_headers$/, /^robots\.txt$/];
const MAX_SHELL_FILE_BYTES = 120 * 1024;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

export default function serviceWorker() {
  return {
    name: 'memorial-service-worker',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const files = await walk(distDir);
        const hash = createHash('sha256');
        const precache = [];
        let bytes = 0;

        for (const file of files.sort()) {
          const rel = relative(distDir, file).split(sep).join('/');
          if (SKIP.some((re) => re.test(rel))) continue;
          if (!SHELL_EXT.test(rel) && !rel.startsWith('icons/')) continue;
          const size = (await stat(file)).size;
          if (size > MAX_SHELL_FILE_BYTES) continue;

          // relative to the sw scope so it works under /repo/ too
          const url = rel.endsWith('index.html') ? rel.slice(0, -'index.html'.length) : rel;
          precache.push(url);
          bytes += size;
          hash.update(rel).update(await readFile(file));
        }

        const version = hash.digest('hex').slice(0, 12);
        const template = await readFile(
          fileURLToPath(new URL('../src/sw/sw.template.js', import.meta.url)),
          'utf8',
        );
        const sw = template
          .replace("'__VERSION__'", JSON.stringify(version))
          .replace('self.__PRECACHE__', JSON.stringify(precache));

        await writeFile(join(distDir, 'sw.js'), sw);
        logger.info(
          `sw.js v${version}: ${precache.length} shell files, ${(bytes / 1024).toFixed(0)} KB uncompressed`,
        );
      },
    },
  };
}
