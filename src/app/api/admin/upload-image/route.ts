import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { detectImageType, MAX_UPLOAD_BYTES } from "@/lib/image-upload";

// Admin-only: stores one soap photo and returns its public URL. The admin
// form then saves that URL with the soap.

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// Server Actions get cross-site protection built in; plain routes don't, so
// require the request to come from this same site.
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return fail("Please log in again.", 401);
  if (!isSameOrigin(request)) return fail("Request not allowed.", 403);

  // Refuse oversized bodies before reading them. A little slack covers the
  // form encoding around the file.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 200_000) {
    return fail("That photo is too large. Try a smaller one.", 413);
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return fail("Couldn't read the upload. Please try again.", 400);
  }
  if (!(file instanceof Blob) || file.size === 0) {
    return fail("Please choose a photo.", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail("That photo is too large. Try a smaller one.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) return fail("Please choose a JPEG, PNG or WebP photo.", 400);

  try {
    // The original file name is never kept; a random suffix keeps every
    // upload on its own address.
    const blob = await put(`soaps/photo.${type.ext}`, Buffer.from(bytes), {
      access: "public",
      addRandomSuffix: true,
      contentType: type.mime,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[admin] Photo upload failed:", err);
    return fail("Couldn't upload the photo. Please try again.", 503);
  }
}
