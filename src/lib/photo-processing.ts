import sharp from 'sharp';

export const PHOTO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const PHOTO_VARIANT_CONTENT_TYPE = 'image/webp';
export const PHOTO_THUMBNAIL_MAX_BYTES = 50 * 1024;
export const PHOTO_DISPLAY_MAX_BYTES = 300 * 1024;
export const PHOTO_MAX_PIXELS = 25_000_000;

export type PhotoVariantMetadata = {
  format: 'webp';
  width: number;
  height: number;
  bytes: number;
};

export type PhotoVariants = {
  thumbnail: Uint8Array;
  display: Uint8Array;
  thumbnailMetadata: PhotoVariantMetadata;
  displayMetadata: PhotoVariantMetadata;
};

const supportedFormats = new Set(['jpeg', 'png', 'webp']);

export async function assertPhotoDimensions(input: Uint8Array) {
  const metadata = await sharp(input, {
    failOn: 'error',
    limitInputPixels: PHOTO_MAX_PIXELS,
  }).metadata();
  if (!metadata.format || !supportedFormats.has(metadata.format)) {
    throw new Error('Unsupported image format. Choose a JPEG, PNG, or WebP photo.');
  }
  if (!metadata.width || !metadata.height || metadata.width > 10000 || metadata.height > 10000 || metadata.width * metadata.height > PHOTO_MAX_PIXELS) {
    throw new Error('Photo dimensions are not supported. Choose an image no larger than 10,000px on either side and 25 megapixels.');
  }
  return metadata;
}

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
  await assertPhotoDimensions(input);
  const [thumbnail, display] = await Promise.all([
    encodeVariant(input, {
      width: 256,
      maxBytes: PHOTO_THUMBNAIL_MAX_BYTES,
      qualities: [82, 76, 70, 64, 58],
      widths: [256, 224, 192, 160],
    }),
    encodeVariant(input, {
      width: 1200,
      maxBytes: PHOTO_DISPLAY_MAX_BYTES,
      qualities: [86, 82, 78, 74, 70, 66],
      widths: [1200, 1080, 960, 840, 720],
    }),
  ]);

  const [thumbnailMetadata, displayMetadata] = await Promise.all([
    sharp(thumbnail, { failOn: 'error' }).metadata(),
    sharp(display, { failOn: 'error' }).metadata(),
  ]);

  if (!thumbnailMetadata.width || !thumbnailMetadata.height || !displayMetadata.width || !displayMetadata.height) {
    throw new Error('Generated photo variants are invalid.');
  }

  return {
    thumbnail,
    display,
    thumbnailMetadata: {
      format: 'webp',
      width: thumbnailMetadata.width,
      height: thumbnailMetadata.height,
      bytes: thumbnail.byteLength,
    },
    displayMetadata: {
      format: 'webp',
      width: displayMetadata.width,
      height: displayMetadata.height,
      bytes: display.byteLength,
    },
  } satisfies PhotoVariants;
}

export async function readPhotoVariantMetadata(input: Uint8Array): Promise<PhotoVariantMetadata> {
  const metadata = await sharp(input, { failOn: 'error', limitInputPixels: PHOTO_MAX_PIXELS }).metadata();
  if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
    throw new Error('Stored photo variant is invalid.');
  }
  return {
    format: 'webp',
    width: metadata.width,
    height: metadata.height,
    bytes: input.byteLength,
  };
}
