import { z } from 'zod';

export const profileSchema = z.object({
  fullName: z.string().min(2),
  age: z.number().min(18)
});
