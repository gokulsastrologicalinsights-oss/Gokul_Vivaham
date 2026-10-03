export const RELIGION_COMMUNITY_MAPPING: Record<string, string[]> = {
  Hindu: [
    'Brahmin',
    'Iyer',
    'Iyengar',
    'Pillai',
    'Kshatriya / Rajput',
    'Vaishya',
    'Yadav',
    'Jat',
    'Maratha',
    'Nair',
    'Vokkaliga',
    'Lingayat',
    'Reddy',
    'Kamma',
    'Mudaliar',
    'Chettiar',
    'Gounder',
    'Thevar',
    'Vanniyar',
    'Nadar',
    'Ezhava',
    'Kurmi',
    'Patel / Patidar',
    'Scheduled Caste',
    'Scheduled Tribe'
  ],
  Muslim: [
    'Syed',
    'Sheikh',
    'Pathan',
    'Mughal',
    'Ansari',
    'Qureshi',
    'Mansoori',
    'Saifi',
    'Memon',
    'Bohra',
    'Rowther',
    'Labbai',
    'Marakkayar',
    'Mapilla'
  ],
  Christian: [
    'Syrian Christian',
    'Latin Catholic',
    'Anglo-Indian',
    'Dalit Christian',
    'Nadar Christian',
    'Mukkuvar Christian',
    'Other Christian Community'
  ],
  Sikh: [
    'Jat Sikh',
    'Khatri',
    'Arora',
    'Ramgarhia',
    'Mazhabi Sikh',
    'Ravidasia',
    'Lubana',
    'Saini'
  ],
  Buddhist: [
    'Neo-Buddhist',
    'Scheduled Caste Buddhist',
    'Traditional Himalayan Buddhist'
  ],
  Jain: [
    'Digambar Jain',
    'Shwetambar Jain',
    'Oswal',
    'Agarwal Jain',
    'Porwal',
    'Khandelwal Jain'
  ]
};

export const RELIGIONS = Object.keys(RELIGION_COMMUNITY_MAPPING);

/**
 * Checks if a given religion and community/caste combination is valid.
 * Supports comma-separated community lists (useful for partner preferences).
 */
export function isValidCombination(
  religion: string,
  community: string,
  customMapping?: Record<string, string[]>
): boolean {
  if (!religion || !community) return true;

  const mapping = customMapping || RELIGION_COMMUNITY_MAPPING;
  
  // Split preferred religions in case of comma-separated list
  const preferredReligions = religion.split(',').map(r => r.trim());
  
  // Split preferred communities in case of comma-separated list
  const preferredCommunities = community.split(',').map(c => c.trim());

  for (const caste of preferredCommunities) {
    let casteValid = false;
    for (const rel of preferredReligions) {
      const validCastes = mapping[rel];
      if (validCastes && validCastes.includes(caste)) {
        casteValid = true;
        break;
      }
    }
    // If any single caste in the list doesn't match any preferred religion, return false
    if (!casteValid) return false;
  }

  return true;
}
