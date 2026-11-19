import type { ImageMetadata } from 'astro';
import { portraits } from './gallery';
import records from './details.json';

export interface Video {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  // local poster image, so nothing loads from youtube before play
  poster?: ImageMetadata;
}

// empty slots, used until the Videos sheet has real links
const slots: Video[] = [
  {
    id: 'PLACEHOLDR1',
    title: 'Video to come (1)',
    poster: portraits.whiteLace,
  },
  {
    id: 'PLACEHOLDR2',
    title: 'Video to come (2)',
    poster: portraits.seatedYellow,
  },
  {
    id: 'PLACEHOLDR3',
    title: 'Video to come (3)',
    poster: portraits.redGele,
  },
];

const covers = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/records/*.jpg', { eager: true });
const cover = (file?: string) => (file ? covers[`../assets/photos/records/${file}`]?.default : undefined);
const fallback = [portraits.whiteLace, portraits.seatedYellow, portraits.redGele, portraits.pinkLace];

export const videos: Video[] = records.videos.length
  ? (records.videos as { id: string; title: string; description?: string; when?: string; cover?: string }[]).map((v, i) => ({
      id: v.id,
      title: v.title,
      description: [v.description, v.when].filter(Boolean).join(' · ') || undefined,
      poster: cover(v.cover) ?? fallback[i % fallback.length],
    }))
  : slots;
