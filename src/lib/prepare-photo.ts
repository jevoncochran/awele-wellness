// Browser-only: shrinks a chosen photo before it is uploaded. Phone photos are
// often 3-10 MB, which is slow for the owner and heavy for shoppers; a
// 1600 px JPEG looks the same on the shop and is typically a few hundred KB.
import { MAX_UPLOAD_BYTES } from "@/lib/image-upload";

const MAX_EDGE = 1600;
// Keep lowering quality until the photo is at most this big (or quality bottoms out).
const TARGET_BYTES = 800_000;

export class PhotoError extends Error {}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function preparePhoto(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the camera's rotation so portraits aren't sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("Couldn't read that photo. Please choose a JPEG or PNG.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new PhotoError("Couldn't process that photo. Please try a different one.");
  }
  // JPEG has no transparency; a transparent PNG would otherwise turn black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.85;
  let blob = await toJpeg(canvas, quality);
  while (blob && blob.size > TARGET_BYTES && quality > 0.55) {
    quality -= 0.1;
    blob = await toJpeg(canvas, quality);
  }
  if (!blob || blob.size > MAX_UPLOAD_BYTES) {
    throw new PhotoError("That photo is too large. Please try a smaller one.");
  }
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
