// Rules for uploaded soap photos. Shared by the upload route and the browser
// code that prepares a photo before sending it.

// Vercel rejects request bodies over 4.5 MB, so stay safely under it. The
// browser shrinks every photo well below this first.
export const MAX_UPLOAD_BYTES = 4_000_000;

export type ImageType = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

// Identifies the real format from the file's first bytes. The file name and
// the type the browser claims can't be trusted; the bytes can.
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const startsWith = (sig: number[], offset = 0) =>
    bytes.length >= offset + sig.length && sig.every((b, i) => bytes[offset + i] === b);

  if (startsWith([0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", ext: "png" };
  }
  // WebP: "RIFF" + 4 size bytes + "WEBP".
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}
