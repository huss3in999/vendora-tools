export const routes = {
  'bahrain-to-dammam': { ar: 'البحرين إلى الدمام', en: 'Bahrain to Dammam', origin: [26.2235, 50.5876], destination: [26.4207, 50.0888], direction: 'westbound' },
  'bahrain-to-khobar': { ar: 'البحرين إلى الخبر', en: 'Bahrain to Khobar', origin: [26.2235, 50.5876], destination: [26.2172, 50.1971], direction: 'westbound' },
  'dammam-to-bahrain': { ar: 'الدمام إلى البحرين', en: 'Dammam to Bahrain', origin: [26.4207, 50.0888], destination: [26.2235, 50.5876], direction: 'eastbound' },
  'khobar-to-bahrain': { ar: 'الخبر إلى البحرين', en: 'Khobar to Bahrain', origin: [26.2172, 50.1971], destination: [26.2235, 50.5876], direction: 'eastbound' }
};
// Candidate probes only. Do not call these verified carriageways until reviewed against returned geometry/OpenLR.
export const candidateProbes = [
  { id: 'bahrain-approach', point: [26.1580, 50.4590] },
  { id: 'bridge-east', point: [26.1740, 50.3970] },
  { id: 'bridge-west', point: [26.1860, 50.3400] },
  { id: 'saudi-approach', point: [26.2050, 50.2830] }
];
