import { z } from 'zod';
import { getNakshatrasForRasi, getPadamsForRasiNakshatra } from '@/constants/rasi-nakshatra-mapping';

export const horoscopeSchema = z.object({
  rasi: z.string().min(1, 'Rasi is required'),
  nakshatra: z.string().min(1, 'Star / Nakshatra is required'),
  padam: z.string().min(1, 'Padam is required')
})
  .superRefine((data, ctx) => {
    const validNakshatras = getNakshatrasForRasi(data.rasi);
    if (!validNakshatras.includes(data.nakshatra)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selected Nakshatra does not belong to selected Rasi.',
        path: ['nakshatra']
      });
      return;
    }

    const validPadams = getPadamsForRasiNakshatra(data.rasi, data.nakshatra);
    if (!validPadams.includes(data.padam)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selected Padam does not belong to selected Nakshatra.',
        path: ['padam']
      });
    }
  });
