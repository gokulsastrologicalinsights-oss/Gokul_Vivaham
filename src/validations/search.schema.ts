import { z } from 'zod';

export const searchSchema = z.object({
  gender: z.enum(['Male', 'Female'])
});
