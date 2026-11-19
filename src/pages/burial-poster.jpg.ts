// The poster people download: the burial poster with a thin credit strip
// added underneath, so nothing on the poster itself is covered.
import type { APIRoute } from 'astro';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.join(process.cwd(), 'src/assets/posters');

export const GET: APIRoute = async () => {
  const poster = sharp(path.join(dir, 'poster-final.jpg'));
  const { width = 734, height = 1037 } = await poster.metadata();
  const strip = await sharp(path.join(dir, 'credit-strip.png')).resize({ width }).toBuffer();
  const { height: sh = 30 } = await sharp(strip).metadata();
  const body = await poster
    .extend({ bottom: sh, background: '#1b3a70' })
    .composite([{ input: strip, top: height, left: 0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': 'image/jpeg' } });
};
