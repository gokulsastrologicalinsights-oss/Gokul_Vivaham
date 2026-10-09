import sharp from 'sharp';

export const PHOTO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const PHOTO_VARIANT_CONTENT_TYPE = 'image/webp';

type VariantOptions = {
  width: number;
  maxBytes: number;
  qualities: number[];
  widths: number[];
};

async function encodeVariant(input: Uint8Array, options: VariantOptions) {
  let last: Uint8Array = new Uint8Array(0);

  for (const width of options.widths) {
    for (const quality of options.qualities) {
      const output = await sharp(input, { failOn: 'error' })
        .rotate()
        .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer();

      last = output;
      if (output.byteLength <= options.maxBytes) return output;
    }
  }

  return last;
}

export async function createPhotoVariants(input: Uint8Array) {
  const [thumbnail, display] = await Promise.all([
    encodeVariant(input, {
      width: 480,
      maxBytes: 50 * 1024,
      qualities: [78, 72, 66, 60, 54],
      widths: [480, 420, 360, 320],
    }),
    encodeVariant(input, {
      width: 1600,
      maxBytes: 300 * 1024,
      qualities: [84, 80, 76, 72, 68, 64],
      widths: [1600, 1400, 1200, 1000, 900],
    }),
  ]);

  return { thumbnail, display };
}
