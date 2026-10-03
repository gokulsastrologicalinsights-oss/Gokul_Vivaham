export const RASIS = [
  'Mesham', 'Rishabham', 'Mithunam', 'Kadagam', 'Simham', 'Kanni',
  'Thulaam', 'Viruchigam', 'Dhanusu', 'Magaram', 'Kumbham', 'Meenam'
] as const;

export type RasiType = typeof RASIS[number];

export const NAKSHATRAS = [
  'Aswini', 'Bharani', 'Karthigai', 'Rohini', 'Mirugaseerisham', 'Thiruvathirai',
  'Punarpoosam', 'Poosam', 'Ayilyam', 'Magham', 'Pooram', 'Uthiram',
  'Hastham', 'Chithirai', 'Swathi', 'Visagam', 'Anusham', 'Kettai',
  'Moolam', 'Pooradam', 'Uthiradam', 'Thiruvonam', 'Avittam', 'Sathayam',
  'Poorattadhi', 'Uthirattadhi', 'Revathi'
] as const;

export type NakshatraType = typeof NAKSHATRAS[number];

export const PADAMS = ['1', '2', '3', '4'] as const;

export type PadamType = typeof PADAMS[number];

// Standard Rasi names display values
export const RASI_DISPLAY_NAMES: Record<string, string> = {
  'Mesham': 'Mesham (Aries)',
  'Rishabham': 'Rishabham (Taurus)',
  'Mithunam': 'Mithunam (Gemini)',
  'Kadagam': 'Kadagam (Cancer)',
  'Simham': 'Simham (Leo)',
  'Kanni': 'Kanni (Virgo)',
  'Thulaam': 'Thulaam (Libra)',
  'Viruchigam': 'Viruchigam (Scorpio)',
  'Dhanusu': 'Dhanusu (Sagittarius)',
  'Magaram': 'Magaram (Capricorn)',
  'Kumbham': 'Kumbham (Aquarius)',
  'Meenam': 'Meenam (Pisces)'
};

// Map spelling variations to standard ones
export function normalizeRasi(rasi: string | null | undefined): string {
  if (!rasi) return '';
  const clean = rasi.trim().toLowerCase();
  
  if (clean.startsWith('mesha')) return 'Mesham';
  if (clean.startsWith('rishaba')) return 'Rishabham';
  if (clean.startsWith('mithuna') || clean.startsWith('midhuna')) return 'Mithunam';
  if (clean.startsWith('kadaga')) return 'Kadagam';
  if (clean.startsWith('simha')) return 'Simham';
  if (clean.startsWith('kanni')) return 'Kanni';
  if (clean.startsWith('thulaa') || clean.startsWith('thula')) return 'Thulaam';
  if (clean.startsWith('viruchiga')) return 'Viruchigam';
  if (clean.startsWith('dhanusu') || clean.startsWith('dhanus')) return 'Dhanusu';
  if (clean.startsWith('magara')) return 'Magaram';
  if (clean.startsWith('kumbha') || clean.startsWith('kumba')) return 'Kumbham';
  if (clean.startsWith('meena')) return 'Meenam';
  
  // Exact checks or fallbacks
  for (const r of RASIS) {
    if (r.toLowerCase() === clean || clean.includes(r.toLowerCase())) {
      return r;
    }
  }
  return rasi;
}

export function normalizeNakshatra(nakshatra: string | null | undefined): string {
  if (!nakshatra) return '';
  const clean = nakshatra.trim().toLowerCase();
  
  if (clean.startsWith('aswini') || clean.startsWith('ashwini')) return 'Aswini';
  if (clean.startsWith('bharani')) return 'Bharani';
  if (clean.startsWith('karthigai') || clean.startsWith('krittika') || clean.startsWith('krithika')) return 'Karthigai';
  if (clean.startsWith('rohini')) return 'Rohini';
  if (clean.startsWith('mirugaseer') || clean.startsWith('mrigas') || clean.startsWith('mirugashira')) return 'Mirugaseerisham';
  if (clean.startsWith('thiruvath') || clean.startsWith('ardra') || clean.startsWith('thiruva')) return 'Thiruvathirai';
  if (clean.startsWith('punarpoo') || clean.startsWith('punarva')) return 'Punarpoosam';
  if (clean.startsWith('poosam') || clean.startsWith('pushya')) return 'Poosam';
  if (clean.startsWith('ayilyam') || clean.startsWith('ashlesha')) return 'Ayilyam';
  if (clean.startsWith('magha') || clean.startsWith('magham')) return 'Magham';
  if (clean.startsWith('pooram') || clean.includes('poorva phalguni')) return 'Pooram';
  if (clean.startsWith('uthiram') || clean.includes('uttara phalguni')) return 'Uthiram';
  if (clean.startsWith('hastha') || clean.startsWith('hasta')) return 'Hastham';
  if (clean.startsWith('chithirai') || clean.startsWith('chitra')) return 'Chithirai';
  if (clean.startsWith('swath') || clean.startsWith('swati')) return 'Swathi';
  if (clean.startsWith('visag') || clean.startsWith('vishak')) return 'Visagam';
  if (clean.startsWith('anush') || clean.startsWith('anuradh')) return 'Anusham';
  if (clean.startsWith('kettai') || clean.startsWith('jyesh')) return 'Kettai';
  if (clean.startsWith('moolam') || clean.startsWith('moola')) return 'Moolam';
  if (clean.startsWith('poorad') || clean.includes('poorva ashada')) return 'Pooradam';
  if (clean.startsWith('uthirad') || clean.includes('uttara ashada')) return 'Uthiradam';
  if (clean.startsWith('thiruvon') || clean.startsWith('shravan')) return 'Thiruvonam';
  if (clean.startsWith('avittam') || clean.startsWith('dhanis')) return 'Avittam';
  if (clean.startsWith('sathay') || clean.startsWith('shatabh')) return 'Sathayam';
  if (clean.startsWith('pooratt') || clean.includes('poorva bhadra')) return 'Poorattadhi';
  if (clean.startsWith('uthiratt') || clean.includes('uttara bhadra')) return 'Uthirattadhi';
  if (clean.startsWith('revath')) return 'Revathi';
  
  for (const n of NAKSHATRAS) {
    if (n.toLowerCase() === clean || clean.includes(n.toLowerCase())) {
      return n;
    }
  }
  return nakshatra;
}

export const RASI_NAKSHATRA_MAPPING: Record<string, string[]> = {
  'Mesham': ['Aswini', 'Bharani', 'Karthigai'],
  'Rishabham': ['Karthigai', 'Rohini', 'Mirugaseerisham'],
  'Mithunam': ['Mirugaseerisham', 'Thiruvathirai', 'Punarpoosam'],
  'Kadagam': ['Punarpoosam', 'Poosam', 'Ayilyam'],
  'Simham': ['Magham', 'Pooram', 'Uthiram'],
  'Kanni': ['Uthiram', 'Hastham', 'Chithirai'],
  'Thulaam': ['Chithirai', 'Swathi', 'Visagam'],
  'Viruchigam': ['Visagam', 'Anusham', 'Kettai'],
  'Dhanusu': ['Moolam', 'Pooradam', 'Uthiradam'],
  'Magaram': ['Uthiradam', 'Thiruvonam', 'Avittam'],
  'Kumbham': ['Avittam', 'Sathayam', 'Poorattadhi'],
  'Meenam': ['Poorattadhi', 'Uthirattadhi', 'Revathi']
};

export function getNakshatrasForRasi(rasi: string): string[] {
  const norm = normalizeRasi(rasi);
  return RASI_NAKSHATRA_MAPPING[norm] || [];
}

export function getPadamsForRasiNakshatra(rasi: string, nakshatra: string): string[] {
  const normRasi = normalizeRasi(rasi);
  const normStar = normalizeNakshatra(nakshatra);

  if (normStar === 'Karthigai') {
    if (normRasi === 'Mesham') return ['1'];
    if (normRasi === 'Rishabham') return ['2', '3', '4'];
  }
  if (normStar === 'Mirugaseerisham') {
    if (normRasi === 'Rishabham') return ['1', '2'];
    if (normRasi === 'Mithunam') return ['3', '4'];
  }
  if (normStar === 'Punarpoosam') {
    if (normRasi === 'Mithunam') return ['1', '2', '3'];
    if (normRasi === 'Kadagam') return ['4'];
  }
  if (normStar === 'Uthiram') {
    if (normRasi === 'Simham') return ['1'];
    if (normRasi === 'Kanni') return ['2', '3', '4'];
  }
  if (normStar === 'Chithirai') {
    if (normRasi === 'Kanni') return ['1', '2'];
    if (normRasi === 'Thulaam') return ['3', '4'];
  }
  if (normStar === 'Visagam') {
    if (normRasi === 'Thulaam') return ['1', '2', '3'];
    if (normRasi === 'Viruchigam') return ['4'];
  }
  if (normStar === 'Uthiradam') {
    if (normRasi === 'Dhanusu') return ['1'];
    if (normRasi === 'Magaram') return ['2', '3', '4'];
  }
  if (normStar === 'Avittam') {
    if (normRasi === 'Magaram') return ['1', '2'];
    if (normRasi === 'Kumbham') return ['3', '4'];
  }
  if (normStar === 'Poorattadhi') {
    if (normRasi === 'Kumbham') return ['1', '2', '3'];
    if (normRasi === 'Meenam') return ['4'];
  }

  // For nakshatras that belong entirely to a single Rasi
  const stars = RASI_NAKSHATRA_MAPPING[normRasi] || [];
  if (stars.includes(normStar)) {
    return ['1', '2', '3', '4'];
  }

  return [];
}

export function isValidCombination(rasi: string | null | undefined, nakshatra: string | null | undefined, padam: string | null | undefined): boolean {
  if (!rasi || !nakshatra) return false;
  
  const normRasi = normalizeRasi(rasi);
  const normStar = normalizeNakshatra(nakshatra);
  
  // Verify star belongs to Rasi
  const stars = RASI_NAKSHATRA_MAPPING[normRasi] || [];
  if (!stars.includes(normStar)) return false;
  
  // Verify padam if provided
  if (padam) {
    const padams = getPadamsForRasiNakshatra(normRasi, normStar);
    if (!padams.includes(padam.toString())) return false;
  }
  
  return true;
}
