import type { ImageMetadata } from 'astro';

import redGele from '../assets/portraits/red-gele.jpg';
import whiteLace from '../assets/portraits/white-lace.jpg';
import pinkLace from '../assets/portraits/pink-lace.jpg';
import childhood from '../assets/gallery/childhood-arochukwu.jpg';
import wedding from '../assets/gallery/wedding-day.jpg';
import youngMother from '../assets/gallery/young-mother.jpg';
import market from '../assets/gallery/market-days.jpg';
import church from '../assets/gallery/church-women.jpg';
import grandchild from '../assets/gallery/first-grandchild.jpg';
import christmas from '../assets/gallery/family-christmas.jpg';
import seventyFifth from '../assets/gallery/seventy-fifth.jpg';

export interface Photo {
  src: ImageMetadata;
  alt: string;
  caption?: string;
  era?: string;
}

// gallery order. originals go in src/assets/gallery
export const photos: Photo[] = [
  { src: childhood, alt: 'Placeholder for a childhood photograph in Arochukwu', caption: 'Growing up in Ugwuakuma', era: '1950s' },
  { src: wedding, alt: 'Placeholder for her wedding photograph', caption: 'Her wedding day', era: '1960s' },
  { src: youngMother, alt: 'Placeholder for a photograph of her as a young mother', caption: 'A young mother', era: '1970s' },
  { src: market, alt: 'Placeholder for a photograph from her market days', caption: 'Market days', era: '1980s' },
  { src: church, alt: 'Placeholder for a photograph with the Catholic Women Organisation', caption: 'With the Catholic Women Organisation', era: '1990s' },
  { src: grandchild, alt: 'Placeholder for a photograph holding her first grandchild', caption: 'Her first grandchild', era: '2000s' },
  { src: christmas, alt: 'Placeholder for a family Christmas photograph at Obichie Compound', caption: 'Christmas at Obichie Compound', era: '2010s' },
  { src: pinkLace, alt: 'Nne in a pink embroidered lace blouse and white head-tie', caption: 'In pink lace', era: '2020s' },
  { src: whiteLace, alt: 'Nne seated in a white lace blouse, coral beads and a silver head-tie', caption: 'In white lace and coral beads', era: '2020s' },
  { src: seventyFifth, alt: 'Placeholder for a photograph from her 75th birthday', caption: 'Her 75th birthday', era: '2023' },
  { src: redGele, alt: 'Nne smiling in a red and gold head-tie with coral beads', caption: 'Radiant in red', era: '2020s' },
];

export const portraits = { redGele, whiteLace, pinkLace };
