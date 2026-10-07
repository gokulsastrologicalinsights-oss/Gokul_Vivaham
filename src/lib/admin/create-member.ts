import { z } from 'zod';
import { horoscopeSchema } from '@/validations/horoscope.schema';
import { validateReligionCommunity } from '@/validations/religion-community.schema';

const required = z.string().trim().min(1, 'This field is required').max(200);
const optional = z.string().trim().max(200).default('');
export function memberAge(dob: string) {
  const birth = new Date(dob + 'T00:00:00Z');
  const today = new Date();
  return today.getUTCFullYear() - birth.getUTCFullYear() -
    (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate()) ? 1 : 0);
}

// The admin form and server share validation; authorization stays exclusively on the server.
export const createMemberSchema = z.object({
  fullName: required, gender: z.enum(['Male', 'Female']),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date of birth'),
  email: z.email().trim().toLowerCase(), password: z.string().min(10, 'Use at least 10 characters').max(72),
  confirmPassword: z.string(), mobileNumber: z.string().trim().regex(/^\+?[1-9]\d{9,14}$/, 'Enter 10 digits or an international number with country code'),
  maritalStatus: z.enum(['Never Married', 'Widowed', 'Divorced', 'Awaiting Divorce']),
  motherTongue: required, religion: required, caste: required, subCaste: optional,
  rasi: required, star: required, padam: required, gothram: optional,
  height: z.string().refine(v => Number(v) >= 120 && Number(v) <= 220, 'Choose a height'),
  weight: optional.refine(v => !v || (Number(v) >= 30 && Number(v) <= 150), 'Choose a valid weight'),
  physicalStatus: required, education: required, occupation: required, companyName: optional,
  annualIncome: z.string().trim().min(1, 'Annual income is required').refine(v => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1e12, 'Enter a valid annual income'),
  workLocation: required, country: required, state: optional,
  fatherName: required, fatherOccupation: optional, motherName: required, motherOccupation: optional,
  siblings: optional, nativePlace: required, familyType: required,
  aboutMe: z.string().trim().max(5000).default(''), partnerExpectations: z.string().trim().max(5000).default(''),
  visibility: z.enum(['public', 'private']), adminAttestation: z.literal(true, { error: 'Confirm the member has authorized you to create their profile' }),
}).strict().superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
  const date = new Date(data.dob + 'T00:00:00Z');
  const age = memberAge(data.dob);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== data.dob || age < (data.gender === 'Male' ? 21 : 18) || age > 100)
    ctx.addIssue({ code: 'custom', path: ['dob'], message: 'Enter an eligible date of birth (men 21+, women 18+)' });
  const communityError = validateReligionCommunity(data.religion, data.caste);
  if (communityError) ctx.addIssue({ code: 'custom', path: ['caste'], message: communityError });
  const horoscope = horoscopeSchema.safeParse({ rasi: data.rasi, nakshatra: data.star, padam: data.padam });
  if (!horoscope.success) for (const issue of horoscope.error.issues)
    ctx.addIssue({ code: 'custom', path: [issue.path[0] === 'nakshatra' ? 'star' : String(issue.path[0])], message: issue.message });
});
