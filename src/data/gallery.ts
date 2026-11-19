import type { ImageMetadata } from 'astro';

import blueHeadtie from '../assets/photos/blue-headtie.jpg';
import face from '../assets/photos/blue-headtie-face.jpg';
import whiteLace from '../assets/photos/white-lace.jpg';
import seatedYellow from '../assets/photos/seated-yellow.jpg';
import redGele from '../assets/photos/red-gele.jpg';
import pinkLace from '../assets/photos/pink-lace.jpg';
import blackWhite from '../assets/photos/black-and-white.jpg';
import records from './details.json';

export interface Photo {
  src: ImageMetadata;
  alt: string;
  caption?: string;
  era?: string;
}

// Gallery order. Every photo is cropped 4:5 with Mama in the middle, so the
// grid stays even; keep new ones the same shape (src/assets/photos).
const base: Photo[] = [
  { src: blueHeadtie, alt: 'Mama in a white blouse, a blue patterned head-tie and coral beads', caption: 'In her blue head-tie' },
  { src: blackWhite, alt: 'An older black and white photograph of Mama, seated in a white blouse with a brooch and a patterned wrapper', caption: 'An older photograph, from the framed print' },
  { src: seatedYellow, alt: 'Mama as a younger woman, seated in a yellow blouse and a wine wrapper with gold patterns', caption: 'From a framed family print' },
  { src: whiteLace, alt: 'Mama in a white lace blouse, coral beads and a silver head-tie', caption: 'In white lace and coral beads' },
  { src: redGele, alt: 'Mama smiling in a red and gold head-tie with coral beads', caption: 'Radiant in red' },
  { src: pinkLace, alt: 'Mama in a pink beaded lace blouse, coral beads and a silver head-tie', caption: 'In pink lace' },
];

// photos added through records/website-details.xlsx (npm run details)
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/records/*.jpg', { eager: true });
const added = (records.photos as { file: string; caption: string; alt: string; era?: string; home: boolean }[])
  .filter((p) => files[`../assets/photos/records/${p.file}`])
  .map((p) => ({ src: files[`../assets/photos/records/${p.file}`].default, alt: p.alt, caption: p.caption, era: p.era, home: p.home }));

export const photos: Photo[] = [...base, ...added];
// home page: the first four portraits plus any marked "Gallery and home page"
export const homePhotos: Photo[] = [...base.slice(0, 4), ...added.filter((p) => p.home)].slice(0, 8);

export const portraits = { blueHeadtie, face, whiteLace, seatedYellow, redGele, pinkLace, blackWhite };

// the home page portrait fades through these (first one shows first)
export const heroPortraits = [
  { src: blueHeadtie, label: 'in a blue head-tie' },
  { src: redGele, label: 'in a red and gold head-tie' },
  { src: whiteLace, label: 'in white lace and coral beads' },
  { src: pinkLace, label: 'in pink lace and coral beads' },
];
