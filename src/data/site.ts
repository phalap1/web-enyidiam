// wording follows the final burial poster (Nov 2026)
import records from './details.json';

// answers from records/website-details.xlsx (npm run details)
const d: Record<string, string | undefined> = records.details;

export const person = {
  praiseName: 'Nne Omereoha',
  honorific: 'Late Nneoha',
  title: 'Madam',
  birthName: 'Mgbeke Kalu Okoro',
  firstName: 'Enyidia',
  christianName: 'Margaret',
  surname: 'Nwosu',
  fullName: 'Madam Enyidia Margaret Nwosu',
  born: 1948,
  died: 2026,
  age: 78,
  hometown: 'Obichie Compound, Ugwuakuma – Arochukwu, Abia State',
  epitaph: 'Mama, may your gentle soul rest in perfect peace, Amen!',
} as const;

export const announcement =
  'The family of Late Mazi Nwosu Okoro of Obichie Compound, Ugwuakuma – Arochukwu, Abia State, ' +
  'with total submission to the will of God, regretfully announces the passing to eternal glory ' +
  'of our dearly beloved daughter, sister, wife, mother, grandmother, and matriarch, ' +
  'who departed this life after a brief illness.';

export const mourners =
  'Children, grandchildren, sons and daughters-in-law, in-laws, and numerous relations';

export const signedBy = { name: 'Mazi Fidelis Okoro Nwosu', role: 'Son, for the family' };

export interface FuneralEvent {
  start: string; // local time (WAT)
  end?: string;
  title: string;
  venue: string;
  mapQuery?: string;
}

export interface FuneralDay {
  date: string;
  label: string;
  events: FuneralEvent[];
}

export const funeral: FuneralDay[] = [
  {
    date: '2027-01-03',
    label: 'Sunday, 3rd January 2027',
    events: [
      {
        start: '2027-01-03T15:30',
        title: 'Body leaves Arochukwu Mortuary for her residence, for lying-in-state',
        venue: 'Obichie Compound, Ugwuakuma',
        mapQuery: 'Ugwuakuma, Arochukwu, Abia State, Nigeria',
      },
      {
        start: '2027-01-03T20:00',
        title: 'Wake-Keeping Service',
        venue: 'Obichie Compound, Ugwuakuma',
        mapQuery: 'Ugwuakuma, Arochukwu, Abia State, Nigeria',
      },
    ],
  },
  {
    date: '2027-01-04',
    label: 'Monday, 4th January 2027',
    events: [
      {
        start: '2027-01-04T11:00',
        title: 'Funeral Service',
        venue: 'Divine Mercy Catholic Church, Barracks, Arochukwu',
        mapQuery: 'Divine Mercy Catholic Church, Arochukwu, Abia State',
      },
      {
        start: '2027-01-04T13:00',
        title: 'Private Interment',
        venue: 'Family only',
      },
      {
        start: '2027-01-04T13:30',
        title: 'Funeral ceremonies and condolences by family, relatives, friends and well-wishers',
        venue: 'Obichie Compound, Ugwuakuma',
        mapQuery: 'Ugwuakuma, Arochukwu, Abia State, Nigeria',
      },
    ],
  },
  {
    date: '2027-01-10',
    label: 'Sunday, 10th January 2027',
    events: [
      {
        start: '2027-01-10T06:00',
        title: 'Outing and Thanksgiving Mass',
        venue: 'SS Peter & Paul Catholic Church, Ugwuakuma',
        mapQuery: 'SS Peter and Paul Catholic Church, Ugwuakuma, Arochukwu',
      },
    ],
  },
];

// dummy values until the Details sheet has the real ones
export const contact = {
  tributeEmail: d.tribute_email ?? 'tributes@example.com',
  whatsapp: d.tribute_whatsapp ?? '2348000000000', // international format, no "+"
};

// optional notes for visitors on the funeral page; blank ones are left out
export const visitorNotes = {
  contactName: d.contact_name,
  contactPhone: d.contact_phone,
  dressCode: d.dress_code,
  livestream: d.livestream_url,
  directions: d.directions,
};

// who built the site; shown as small print in the footer and the poster view
export const maker = {
  lead: 'Made by',
  name: 'Innova Byte',
  mark: '™', // registered later? switch to ®, only once the certificate is issued
};
