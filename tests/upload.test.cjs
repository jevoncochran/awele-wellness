const { createHarness, createReporter } = require("./harness.cjs");

const h = createHarness();
const t = createReporter("photos: upload route, file checks, photo host");

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

function fileOf(bytes, name = "photo.jpg", type = "image/jpeg", pad = 0) {
  return new File([new Uint8Array([...bytes, ...new Array(pad).fill(7)])], name, { type });
}

// A same-site POST by default; options override pieces of it.
function post({ file, origin = "http://localhost:3000", host = "localhost:3000", omitOrigin = false, headers = {} } = {}) {
  const body = new FormData();
  if (file) body.set("file", file);
  const h2 = { host, ...headers };
  if (!omitOrigin) h2.origin = origin;
  return new Request("http://localhost:3000/api/admin/upload-image", { method: "POST", body, headers: h2 });
}

(async () => {
  const route = h.load("app/api/admin/upload-image/route");
  const img = h.load("lib/image-upload");
  const host = h.load("lib/blob-host");

  t.section("recognising the real file type from its bytes");
  t.check("JPEG, PNG and WebP are recognised", img.detectImageType(new Uint8Array(JPEG))?.ext === "jpg" && img.detectImageType(new Uint8Array(PNG))?.ext === "png" && img.detectImageType(new Uint8Array(WEBP))?.ext === "webp");
  t.check("a web page, a PDF, GIF, SVG and an empty file are not", [[0x3c, 0x68, 0x74, 0x6d, 0x6c], [0x25, 0x50, 0x44, 0x46], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], [0x3c, 0x73, 0x76, 0x67], []].every((b) => img.detectImageType(new Uint8Array(b)) === null));
  t.check("RIFF without WEBP (a .wav, say) is not an image", img.detectImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45])) === null);

  t.section("who is allowed to upload");
  h.auth.loggedIn = false;
  let res = await route.POST(post({ file: fileOf(JPEG) }));
  t.check("logged out: refused (401) and nothing stored", res.status === 401 && h.blob.puts.length === 0);
  h.auth.loggedIn = true;
  res = await route.POST(post({ file: fileOf(JPEG), origin: "https://evil.example" }));
  t.check("request from another website: refused (403)", res.status === 403 && h.blob.puts.length === 0);
  res = await route.POST(post({ file: fileOf(JPEG), omitOrigin: true }));
  t.check("request with no origin: refused", res.status === 403);
  res = await route.POST(post({ file: fileOf(JPEG), origin: "https://shop.example", host: "internal:3000", headers: { "x-forwarded-host": "shop.example" } }));
  t.check("behind Vercel the public host (x-forwarded-host) is what counts", res.status === 200);

  t.section("a good upload");
  h.blob.puts.length = 0;
  res = await route.POST(post({ file: fileOf(JPEG, "IMG_2231.JPG", "image/jpeg", 5000) }));
  t.check("JPEG is stored and its address returned", res.status === 200 && /^https:\/\/abc123\.public\.blob\.vercel-storage\.com\/soaps\/photo/.test(res.body.url));
  const put = h.blob.puts[0];
  t.check("stored publicly, with a random suffix, under a neutral name (no original file name)", put.options.access === "public" && put.options.addRandomSuffix === true && put.pathname === "soaps/photo.jpg" && !put.pathname.includes("IMG"));
  t.check("stored with the real type", put.options.contentType === "image/jpeg");
  res = await route.POST(post({ file: fileOf(PNG, "a.png", "image/png") }));
  t.check("PNG works and is stored as PNG", res.status === 200 && h.blob.puts.at(-1).pathname === "soaps/photo.png" && h.blob.puts.at(-1).options.contentType === "image/png");
  res = await route.POST(post({ file: fileOf(WEBP, "a.webp", "image/webp") }));
  t.check("WebP works", res.status === 200 && h.blob.puts.at(-1).options.contentType === "image/webp");

  t.section("bad uploads");
  const before = h.blob.puts.length;
  res = await route.POST(post({ file: fileOf([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e], "evil.jpg", "image/jpeg") }));
  t.check("a web page renamed .jpg and labelled image/jpeg is refused (checked by bytes)", res.status === 400 && /JPEG, PNG or WebP/.test(res.body.error));
  res = await route.POST(post({ file: fileOf([0x3c, 0x73, 0x76, 0x67], "x.svg", "image/svg+xml") }));
  t.check("SVG (can carry scripts) is refused", res.status === 400);
  res = await route.POST(post({}));
  t.check("no file at all: refused", res.status === 400);
  res = await route.POST(post({ file: new File([], "empty.jpg", { type: "image/jpeg" }) }));
  t.check("empty file: refused", res.status === 400);
  res = await route.POST(post({ file: fileOf(JPEG, "big.jpg", "image/jpeg", img.MAX_UPLOAD_BYTES + 10) }));
  t.check("over the size cap: refused (413)", res.status === 413);
  res = await route.POST(post({ file: fileOf(JPEG), headers: { "content-length": String(img.MAX_UPLOAD_BYTES + 1_000_000) } }));
  t.check("a declared giant body is refused before reading it (413)", res.status === 413);
  t.check("none of the bad uploads reached the store", h.blob.puts.length === before);

  t.section("storage trouble");
  h.blob.fail = true;
  res = await t.quiet(() => route.POST(post({ file: fileOf(JPEG) })));
  h.blob.fail = false;
  t.check("store unreachable: a clear 503, no crash and no internal details", res.status === 503 && /try again/i.test(res.body.error) && !/unreachable/.test(res.body.error));

  t.section("our photo host");
  t.check("new-style store id gives the host (prefix dropped, lowercased)", host.blobHostname({ BLOB_STORE_ID: "store_PJm1gfu8HfHDrR99" }) === "pjm1gfu8hfhdrr99.public.blob.vercel-storage.com");
  t.check("older token-only setups: host comes from the token", host.blobHostname({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_AbC123_secretpart" }) === "abc123.public.blob.vercel-storage.com");
  t.check("nothing configured, or a malformed id: no host (never guessed)", host.blobHostname({}) === null && host.blobHostname({ BLOB_STORE_ID: "store_a.evil.com" }) === null);
  const env = { BLOB_STORE_ID: "store_AbC123" };
  t.check("our own photo address is accepted", host.isOurBlobUrl("https://abc123.public.blob.vercel-storage.com/soaps/photo-x.jpg", env));
  t.check("another Blob store, another site, http, tricks and junk are rejected", [
    "https://zzz999.public.blob.vercel-storage.com/a.jpg",
    "https://evil.example/a.jpg",
    "http://abc123.public.blob.vercel-storage.com/a.jpg",
    "https://abc123.public.blob.vercel-storage.com.evil.example/a.jpg",
    "https://abc123.public.blob.vercel-storage.com@evil.example/a.jpg",
    "https://user:pw@abc123.public.blob.vercel-storage.com/a.jpg",
    "https://abc123.public.blob.vercel-storage.com:8443/a.jpg",
    "/assets/images/shop/a.png",
    "javascript:alert(1)",
    "",
  ].every((u) => !host.isOurBlobUrl(u, env)));
  t.check("with no store configured nothing counts as ours", !host.isOurBlobUrl("https://abc123.public.blob.vercel-storage.com/a.jpg", {}));

  t.finish();
})().catch((e) => {
  console.log("ERROR", e);
  process.exit(1);
});
