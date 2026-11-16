// ---------------------------------------------------------------------------
// BILLER CATALOG  (Philippine billers with bundled logos)
// ---------------------------------------------------------------------------
// When you add a biller, you can pick it from this list, or just type its
// name: anything matching a name or alias here gets its logo and colour
// automatically. Logos live in assets/billers/ (max 256px, about 370 KB in
// total) and belong to their companies; they're only used to recognise bills.
//
// To add one: drop the logo in assets/billers/ and add an entry below.
// `logo: null` entries still get a matching colour and initial.
// ---------------------------------------------------------------------------

const L = {
  veco: require('../../../assets/billers/veco.jpg'),
  meralco: require('../../../assets/billers/meralco.png'),
  davaolight: require('../../../assets/billers/davaolight.png'),
  mcwd: require('../../../assets/billers/mcwd.png'),
  maynilad: require('../../../assets/billers/maynilad.png'),
  manilawater: require('../../../assets/billers/manilawater.png'),
  dcwd: require('../../../assets/billers/dcwd.png'),
  pldt: require('../../../assets/billers/pldt.png'),
  smart: require('../../../assets/billers/smart.png'),
  globe: require('../../../assets/billers/globe.png'),
  dito: require('../../../assets/billers/dito.png'),
  converge: require('../../../assets/billers/converge.png'),
  sky: require('../../../assets/billers/sky.png'),
  cignal: require('../../../assets/billers/cignal.png'),
  bpi: require('../../../assets/billers/bpi.png'),
  bdo: require('../../../assets/billers/bdo.png'),
  metrobank: require('../../../assets/billers/metrobank.png'),
  securitybank: require('../../../assets/billers/securitybank.png'),
  rcbc: require('../../../assets/billers/rcbc.png'),
  unionbank: require('../../../assets/billers/unionbank.png'),
  eastwest: require('../../../assets/billers/eastwest.png'),
  landbank: require('../../../assets/billers/landbank.png'),
  pnb: require('../../../assets/billers/pnb.png'),
  sss: require('../../../assets/billers/sss.png'),
  pagibig: require('../../../assets/billers/pagibig.png'),
  philhealth: require('../../../assets/billers/philhealth.png'),
  sunlife: require('../../../assets/billers/sunlife.png'),
  aia: require('../../../assets/billers/aia.png'),
  manulife: require('../../../assets/billers/manulife.png'),
  homecredit: require('../../../assets/billers/homecredit.png'),
  netflix: require('../../../assets/billers/netflix.png'),
  spotify: require('../../../assets/billers/spotify.png'),
};

/**
 * @typedef {Object} CatalogBiller
 * @property {string} key
 * @property {string} name      short name saved on the biller
 * @property {string} type      group shown in the list
 * @property {string} color
 * @property {string[]} [aliases]  other names people type (lowercase)
 */

/** @type {CatalogBiller[]} */
export const BILLER_CATALOG = [
  // Electricity
  { key: 'veco', name: 'VECO', type: 'Electricity', color: '#1E3A8A', aliases: ['visayan electric', 'visayan electric company'] },
  { key: 'meralco', name: 'Meralco', type: 'Electricity', color: '#F26522', aliases: ['manila electric'] },
  { key: 'davaolight', name: 'Davao Light', type: 'Electricity', color: '#1F2A6B', aliases: ['davao light and power'] },
  { key: 'meco', name: 'MECO', type: 'Electricity', color: '#0B6E4F', aliases: ['mactan electric', 'mactan electric company'] },
  { key: 'cebeco', name: 'CEBECO', type: 'Electricity', color: '#C62828', aliases: ['cebu electric cooperative', 'cebeco i', 'cebeco ii', 'cebeco iii'] },
  { key: 'beneco', name: 'BENECO', type: 'Electricity', color: '#2E7D32', aliases: ['benguet electric'] },

  // Water
  { key: 'mcwd', name: 'MCWD', type: 'Water', color: '#1D7FD8', aliases: ['metro cebu water', 'metropolitan cebu water district', 'cebu water'] },
  { key: 'maynilad', name: 'Maynilad', type: 'Water', color: '#0E4C92', aliases: ['maynilad water'] },
  { key: 'manilawater', name: 'Manila Water', type: 'Water', color: '#14A39A' },
  { key: 'dcwd', name: 'Davao City Water', type: 'Water', color: '#1F3C88', aliases: ['dcwd', 'davao city water district'] },
  { key: 'primewater', name: 'PrimeWater', type: 'Water', color: '#0077C8', aliases: ['prime water'] },

  // Internet, phone & TV
  { key: 'pldt', name: 'PLDT', type: 'Internet & phone', color: '#D7182A', aliases: ['pldt home', 'pldt fibr', 'fibr'] },
  { key: 'globe', name: 'Globe', type: 'Internet & phone', color: '#0033A0', aliases: ['globe at home', 'globe postpaid', 'gfiber', 'globe telecom'] },
  { key: 'smart', name: 'Smart', type: 'Internet & phone', color: '#1BA548', aliases: ['smart postpaid', 'smart signature', 'smart bro'] },
  { key: 'dito', name: 'DITO', type: 'Internet & phone', color: '#D71920', aliases: ['dito telecommunity'] },
  { key: 'converge', name: 'Converge', type: 'Internet & phone', color: '#139E8F', aliases: ['converge ict', 'bida fiber', 'surf2sawa'] },
  { key: 'sky', name: 'Sky', type: 'Internet & phone', color: '#1F3F99', aliases: ['sky fiber', 'skycable', 'sky cable'] },
  { key: 'cignal', name: 'Cignal', type: 'Internet & phone', color: '#E31B23', aliases: ['cignal tv', 'cignal postpaid'] },

  // Credit cards & loans
  { key: 'bpi', name: 'BPI', type: 'Credit cards & loans', color: '#B11F24', aliases: ['bank of the philippine islands', 'bpi credit card'] },
  { key: 'bdo', name: 'BDO', type: 'Credit cards & loans', color: '#0033A1', aliases: ['banco de oro', 'bdo credit card'] },
  { key: 'metrobank', name: 'Metrobank', type: 'Credit cards & loans', color: '#0D3B85', aliases: ['metrobank credit card'] },
  { key: 'securitybank', name: 'Security Bank', type: 'Credit cards & loans', color: '#1CA0DB' },
  { key: 'rcbc', name: 'RCBC', type: 'Credit cards & loans', color: '#2B7BD3', aliases: ['rcbc bankard', 'rizal commercial banking'] },
  { key: 'unionbank', name: 'UnionBank', type: 'Credit cards & loans', color: '#F7931E', aliases: ['union bank'] },
  { key: 'eastwest', name: 'EastWest', type: 'Credit cards & loans', color: '#5B1F69', aliases: ['eastwest bank', 'east west'] },
  { key: 'landbank', name: 'Landbank', type: 'Credit cards & loans', color: '#4CAF50', aliases: ['land bank'] },
  { key: 'pnb', name: 'PNB', type: 'Credit cards & loans', color: '#0D2C6C', aliases: ['philippine national bank'] },
  { key: 'homecredit', name: 'Home Credit', type: 'Credit cards & loans', color: '#E11B22' },

  // Government
  { key: 'sss', name: 'SSS', type: 'Government', color: '#1B4F9C', aliases: ['social security system'] },
  { key: 'pagibig', name: 'Pag-IBIG', type: 'Government', color: '#1D4E9E', aliases: ['pagibig', 'pag ibig', 'hdmf'] },
  { key: 'philhealth', name: 'PhilHealth', type: 'Government', color: '#11904A', aliases: ['phil health'] },

  // Insurance
  { key: 'sunlife', name: 'Sun Life', type: 'Insurance', color: '#F2A900', aliases: ['sunlife', 'sun life financial'] },
  { key: 'prulife', name: 'Pru Life UK', type: 'Insurance', color: '#ED1B2E', aliases: ['prulife', 'pru life', 'prudential'] },
  { key: 'aia', name: 'AIA Philam', type: 'Insurance', color: '#D31145', aliases: ['aia', 'philam', 'philam life'] },
  { key: 'manulife', name: 'Manulife', type: 'Insurance', color: '#00A758' },

  // Subscriptions
  { key: 'netflix', name: 'Netflix', type: 'Subscriptions', color: '#E50914' },
  { key: 'spotify', name: 'Spotify', type: 'Subscriptions', color: '#1DB954' },
];

/** Bundled logo for a key, or null. */
export function logoFor(key) {
  return (key && L[key]) || null;
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The catalog entry whose name or alias is exactly `name` (ignoring case/punctuation). */
export function findCatalogMatch(name) {
  const n = norm(name);
  if (!n) return null;
  return BILLER_CATALOG.find((b) => norm(b.name) === n || (b.aliases ?? []).some((a) => norm(a) === n)) ?? null;
}

/** Catalog entries whose name or alias contains the search text. */
export function searchCatalog(query) {
  const q = norm(query);
  if (!q) return BILLER_CATALOG;
  return BILLER_CATALOG.filter(
    (b) => norm(b.name).includes(q) || norm(b.type).includes(q) || (b.aliases ?? []).some((a) => norm(a).includes(q)),
  );
}
