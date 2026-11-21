// Where our uploaded soap photos live. Plain functions with no imports, because
// next.config.ts uses this too (to allow only our own photo host).

// Used only when the store can't be worked out from the environment.
export const BLOB_HOST_WILDCARD = "**.public.blob.vercel-storage.com";

type Env = Record<string, string | undefined>;

function storeIdFrom(env: Env): string | null {
  // Newer stores: BLOB_STORE_ID, e.g. "store_AbC123".
  const direct = env.BLOB_STORE_ID?.trim();
  if (direct) return direct;
  // Older stores: the id is inside the token, "vercel_blob_rw_<storeId>_<secret>".
  const match = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(
    env.BLOB_READ_WRITE_TOKEN?.trim() ?? "",
  );
  return match ? match[1] : null;
}

// "<storeid>.public.blob.vercel-storage.com" for this deployment's store, or
// null when no Blob store is configured.
export function blobHostname(env: Env = process.env): string | null {
  const id = storeIdFrom(env)?.replace(/^store_/i, "").toLowerCase();
  if (!id || !/^[a-z0-9]+$/.test(id)) return null;
  return `${id}.public.blob.vercel-storage.com`;
}

// True only for an https photo URL on our own store's host (no credentials,
// no custom port). Used to refuse image links pointing anywhere else.
export function isOurBlobUrl(value: string, env: Env = process.env): boolean {
  const host = blobHostname(env);
  if (!host) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.hostname === host &&
    url.port === "" &&
    url.username === "" &&
    url.password === ""
  );
}
