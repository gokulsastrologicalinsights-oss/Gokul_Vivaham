interface AstroCoords {
  rasi: string;
  nakshatra: string;
  padam?: string | null;
}

export function generateCompatibility(
  p1: string | AstroCoords,
  p2: string | AstroCoords
): number {
  let r1 = '';
  let n1 = '';
  let pad1 = '';
  
  let r2 = '';
  let n2 = '';
  let pad2 = '';

  if (typeof p1 === 'object' && p1 !== null) {
    r1 = p1.rasi || '';
    n1 = p1.nakshatra || '';
    pad1 = p1.padam || '';
  } else {
    r1 = p1 || '';
  }

  if (typeof p2 === 'object' && p2 !== null) {
    r2 = p2.rasi || '';
    n2 = p2.nakshatra || '';
    pad2 = p2.padam || '';
  } else {
    r2 = p2 || '';
  }

  // Strip parenthetical descriptions from inputs (e.g. "Mesham (Aries)" to "Mesham")
  const cleanSignName = (s: string) => {
    if (!s) return '';
    return s.split(' ')[0].trim();
  };

  const cleanR1 = cleanSignName(r1);
  const cleanR2 = cleanSignName(r2);

  if (!cleanR1 || !cleanR2) return 75;

  const { normalizeRasi, normalizeNakshatra } = require('@/constants/rasi-nakshatra-mapping');
  const normR1 = normalizeRasi(cleanR1);
  const normR2 = normalizeRasi(cleanR2);
  const normN1 = normalizeNakshatra(n1);
  const normN2 = normalizeNakshatra(n2);

  // 1. Rasi Lords Compatibility (Zodiac Elements)
  let baseScore = 70;
  if (normR1 === normR2) {
    baseScore = 85; 
  } else {
    const fire = ['Mesham', 'Simham', 'Dhanusu'];
    const earth = ['Rishabham', 'Kanni', 'Magaram'];
    const air = ['Mithunam', 'Thulaam', 'Kumbham'];
    const water = ['Kadagam', 'Viruchigam', 'Meenam'];

    const getElement = (r: string) => {
      if (fire.includes(r)) return 'fire';
      if (earth.includes(r)) return 'earth';
      if (air.includes(r)) return 'air';
      if (water.includes(r)) return 'water';
      return '';
    };

    const el1 = getElement(normR1);
    const el2 = getElement(normR2);

    if (el1 && el2) {
      if (el1 === el2) {
        baseScore = 82; 
      } else if (
        (el1 === 'fire' && el2 === 'air') || (el1 === 'air' && el2 === 'fire') ||
        (el1 === 'earth' && el2 === 'water') || (el1 === 'water' && el2 === 'earth')
      ) {
        baseScore = 78; 
      } else if (
        (el1 === 'fire' && el2 === 'water') || (el1 === 'water' && el2 === 'fire')
      ) {
        baseScore = 60; 
      } else {
        baseScore = 72; 
      }
    }
  }

  // 2. Nakshatra Compatibility points
  let starBonus = 0;
  if (normN1 && normN2) {
    if (normN1 === normN2) {
      starBonus = 10;
    } else {
      const combined = normN1 + normN2;
      let hash = 0;
      for (let i = 0; i < combined.length; i++) {
        hash = combined.charCodeAt(i) + ((hash << 5) - hash);
      }
      const scoreMod = Math.abs(hash) % 11; 
      starBonus = scoreMod;
    }
  }

  // 3. Padam Fine-tuning
  let padamBonus = 0;
  if (pad1 && pad2) {
    if (pad1.toString() === pad2.toString()) {
      padamBonus = 5; 
    } else {
      const pDiff = Math.abs(parseInt(pad1) - parseInt(pad2));
      if (pDiff === 2) {
        padamBonus = 3; 
      } else {
        padamBonus = 1;
      }
    }
  }

  return Math.min(baseScore + starBonus + padamBonus, 100);
}
