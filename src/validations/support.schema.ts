import { z } from 'zod';

export const supportSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().max(254).pipe(z.email()),
  mobile: z.string().trim().max(30).refine(value => value === '' || /^[+\d][\d ()-]{6,29}$/.test(value), 'Enter a valid phone number'),
  subject: z.enum(['General Inquiry', 'Profile Verification', 'Horoscope Match Help', 'Premium Plans Support', 'Report Bug', 'Refund Request', 'Privacy Request']),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0).optional().default(''),
}).strict();
