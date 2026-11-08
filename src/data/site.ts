// taken from the burial posters

export const person = {
  praiseName: 'Nne Omereoha',
  honorific: 'Late Nneoha',
  title: 'Madam',
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
        start: '2027-01-03T20:00',
        end: '2027-01-03T23:00',
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
        start: '2027-01-04T07:30',
        title: 'Body leaves Arochukwu Mortuary for her residence',
        venue: 'Obichie Compound, Ugwuakuma',
        mapQuery: 'Arochukwu, Abia State, Nigeria',
      },
      {
        start: '2027-01-04T08:30',
        end: '2027-01-04T09:30',
        title: 'Lying-in-State',
        venue: 'Obichie Compound, Ugwuakuma',
        mapQuery: 'Ugwuakuma, Arochukwu, Abia State, Nigeria',
      },
      {
        start: '2027-01-04T11:00',
        end: '2027-01-04T12:45',
        title: 'Funeral Service',
        venue: 'SS Peter & Paul Catholic Church, Ugwuakuma',
        mapQuery: 'SS Peter and Paul Catholic Church, Ugwuakuma, Arochukwu',
      },
      {
        start: '2027-01-04T13:00',
        title: 'Private Interment',
        venue: 'Family only',
      },
    ],
  },
];

// TODO: real contact details
export const contact = {
  tributeEmail: 'tributes@example.com',
  whatsapp: '2348000000000', // international format, no "+"
};
