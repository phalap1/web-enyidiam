import type { ImageMetadata } from 'astro';
import wedding from '../assets/gallery/wedding-day.jpg';
import church from '../assets/gallery/church-women.jpg';
import birthday from '../assets/gallery/seventy-fifth.jpg';

export interface Video {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  // local poster image, so nothing loads from youtube before play
  poster?: ImageMetadata;
}

// TODO: real video ids
export const videos: Video[] = [
  {
    id: 'PLACEHOLDR1',
    title: 'Nne at her 75th birthday thanksgiving',
    description: 'Dancing with her grandchildren after Mass, 2023.',
    duration: '6:40',
    poster: birthday,
  },
  {
    id: 'PLACEHOLDR2',
    title: 'Singing with the Catholic Women Organisation',
    description: 'Her favourite Igbo hymn at SS Peter & Paul.',
    duration: '3:15',
    poster: church,
  },
  {
    id: 'PLACEHOLDR3',
    title: 'Memories: a family slideshow',
    description: 'Photographs from seven decades, set to music.',
    duration: '9:02',
    poster: wedding,
  },
];
