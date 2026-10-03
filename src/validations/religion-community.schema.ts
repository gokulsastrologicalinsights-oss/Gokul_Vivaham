import { z } from 'zod';
import { isValidCombination } from '@/constants/religion-community-mapping';

export const religionCommunitySchema = z.object({
  religion: z.string().min(1, 'Religion is required'),
  caste: z.string().min(1, 'Caste/Community is required'),
}).refine((data) => {
  return isValidCombination(data.religion, data.caste);
}, {
  message: 'Selected Community does not belong to selected Religion.',
  path: ['caste'],
});

/**
 * Validates a religion and community/caste combination.
 * Returns an error string if invalid, or null if valid.
 */
export function validateReligionCommunity(
  religion: string,
  community: string,
  customMapping?: Record<string, string[]>
): string | null {
  if (!religion) return 'Religion is required';
  if (!community) return 'Community / Caste is required';

  const valid = isValidCombination(religion, community, customMapping);
  if (!valid) {
    return 'Selected Community does not belong to selected Religion.';
  }
  
  return null;
}
