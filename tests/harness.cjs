// Shared test harness. Runs the REAL source files in src/ (transpiled on the
// fly with the project's own TypeScript) against an in-memory Redis and
// stand-ins for Stripe, Resend and the bits of Next.js the code touches. No
// network, no real emails, no real database.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ts = require("typescript");
const jose = require("jose");

const SRC = path.join(__dirname, "..", "src") + path.sep;

const TEST_ENV = {
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  RESEND_API_KEY: "re_x",
  ORDER_NOTIFICATION_EMAIL: "owner@example.com",
  UPSTASH_REDIS_REST_URL: "https://example",
  UPSTASH_REDIS_REST_TOKEN: "t",
  ADMIN_PASSWORD: "correct horse battery staple",
  ADMIN_SESSION_SECRET: crypto.randomBytes(36).toString("base64"),
};

class Redirect extends Error {
  constructor(to) {
    super("NEXT_REDIRECT");
    this.to = to;
  }
}

function createHarness() {
  Object.assign(process.env, TEST_ENV);

  // ---------- in-memory Redis ----------
  const redis = {
    hashes: {},
    kv: {},
    down: false, // every call throws
    failCatalogRead: false, // only reads of the catalog throw
    failStockRead: false, // only reads of stock throw
  };
  const guard = () => {
    if (redis.down) throw new Error("redis down");
  };
  // Like the real client, stored JSON text comes back parsed from hgetall.
  const parseValue = (v) => {
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        /* keep as text */
      }
    }
    return v;
  };
  const fakeRedis = {
    get: async (k) => (guard(), k in redis.kv ? redis.kv[k] : null),
    set: async (k, v, o) => {
      guard();
      if (o?.nx && k in redis.kv) return null;
      redis.kv[k] = v;
      return "OK";
    },
    del: async (k) => (guard(), delete redis.kv[k], 1),
    incr: async (k) => (guard(), (redis.kv[k] = (redis.kv[k] ?? 0) + 1)),
    expire: async () => (guard(), 1),
    hsetnx: async (k, f, v) => {
      guard();
      redis.hashes[k] = redis.hashes[k] ?? {};
      if (f in redis.hashes[k]) return 0;
      redis.hashes[k][f] = v;
      return 1;
    },
    hset: async (k, o) => (guard(), (redis.hashes[k] = { ...(redis.hashes[k] ?? {}), ...o }), 1),
    hdel: async (k, f) => (guard(), redis.hashes[k] && delete redis.hashes[k][f], 1),
    hexists: async (k, f) => (guard(), redis.hashes[k] && f in redis.hashes[k] ? 1 : 0),
    hincrby: async (k, f, n) => (guard(), (redis.hashes[k][f] = (redis.hashes[k][f] ?? 0) + n)),
    hgetall: async (k) => {
      guard();
      if (redis.failCatalogRead && k === "catalog:products") throw new Error("catalog read failed");
      if (redis.failStockRead && k === "inventory:stock") throw new Error("stock read failed");
      if (!redis.hashes[k] || !Object.keys(redis.hashes[k]).length) return null;
      return Object.fromEntries(Object.entries(redis.hashes[k]).map(([f, v]) => [f, parseValue(v)]));
    },
  };
  class FakeRedis {
    constructor() {
      Object.assign(this, fakeRedis);
    }
  }

  // ---------- Stripe / Resend ----------
  const stripe = { created: [], currentPI: null };
  class FakeStripe {
    constructor() {
      this.paymentIntents = {
        create: async (p) => (stripe.created.push(p), { client_secret: "cs_test" }),
        retrieve: async () => stripe.currentPI,
      };
      this.webhooks = { constructEvent: (body) => JSON.parse(body) };
      this.paymentMethods = { retrieve: async () => ({ type: "card", card: { brand: "visa", last4: "4242" } }) };
    }
  }
  const resend = { sent: [] };
  class FakeResend {
    constructor() {
      this.emails = { send: async (m) => (resend.sent.push(m), { data: { id: "em" }, error: null }) };
    }
  }

  // ---------- Vercel Blob (photo storage) ----------
  const blob = { puts: [], deleted: [], fail: false, failDelete: false };
  const fakeBlob = {
    put: async (pathname, body, options) => {
      if (blob.fail) throw new Error("blob store unreachable");
      blob.puts.push({ pathname, size: body.length, options });
      return { url: "https://abc123.public.blob.vercel-storage.com/" + pathname.replace(".", "-XYZ.") };
    },
  };

  fakeBlob.del = async (url) => {
    if (blob.failDelete) throw new Error("blob delete failed");
    blob.deleted.push(url);
  };

  // ---------- Next.js ----------
  const next = { tagCalls: [], revalidated: [], updatedTags: [], cacheCalls: [] };
  const request = { cookies: {}, headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }, cookieOptions: {} };
  const auth = { loggedIn: true }; // used when the real admin-auth module is stubbed
  const NextResponse = {
    json: (body, init) => ({ body, status: init?.status ?? 200 }),
    next: () => ({ kind: "next" }),
    redirect: (u) => ({ kind: "redirect", to: new URL(u).pathname }),
  };

  const stubs = {
    stripe: { default: FakeStripe, __esModule: true },
    resend: { Resend: FakeResend },
    "@upstash/redis": { Redis: FakeRedis },
    "@vercel/blob": fakeBlob,
    "server-only": {},
    jose,
    "node:crypto": crypto,
    "next/server": { NextResponse, NextRequest: class {} },
    "next/cache": {
      unstable_cache: (fn, keys, opts) => (next.cacheCalls.push({ keys, opts }), fn),
      revalidateTag: (...a) => next.tagCalls.push(a),
      revalidatePath: (p) => next.revalidated.push(p),
      updateTag: (t) => next.updatedTags.push(t),
    },
    "next/headers": {
      headers: async () => ({ get: (n) => request.headers[n] ?? null }),
      cookies: async () => ({
        get: (n) => (n in request.cookies ? { name: n, value: request.cookies[n] } : undefined),
        set: (n, v, o) => ((request.cookies[n] = v), (request.cookieOptions[n] = o)),
        delete: (n) => delete request.cookies[n],
      }),
    },
    "next/navigation": {
      redirect: (to) => {
        throw new Redirect(to);
      },
    },
  };
  // Most suites don't care about login, so by default the admin pieces are
  // stand-ins. Suites that test them pass `realAuth` to `load`.
  const authStubs = {
    "@/lib/admin-auth": {
      isAdmin: async () => auth.loggedIn,
      requireAdmin: async () => {
        if (!auth.loggedIn) throw new Redirect("/admin/login");
      },
      passwordMatches: () => false,
      startAdminSession: async () => {},
      endAdminSession: async () => {},
    },
    "@/lib/admin-rate-limit": {
      LOCKOUT_MINUTES: 15,
      clearFailedLogins: async () => {},
      isLoginLocked: async () => false,
      recordFailedLogin: async () => {},
    },
  };

  const cache = {};
  function makeLoader(useRealAuth) {
    const load = (file) => {
      const key = (useRealAuth ? "real:" : "stub:") + file;
      if (cache[key]) return cache[key].exports;
      const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
      }).outputText;
      const mod = { exports: {} };
      cache[key] = mod;
      new Function("module", "exports", "require", js)(mod, mod.exports, (id) => {
        if (id in stubs) return stubs[id];
        if (!useRealAuth && id in authStubs) return authStubs[id];
        if (id.startsWith("@/")) return load(SRC + id.slice(2) + ".ts");
        throw new Error("unexpected import " + id);
      });
      return mod.exports;
    };
    return load;
  }
  const loadStub = makeLoader(false);
  const loadReal = makeLoader(true);

  return {
    SRC,
    redis,
    stripe,
    resend,
    blob,
    next,
    request,
    auth,
    Redirect,
    // load("lib/catalog") -> the module; pass { realAuth: true } for the
    // genuine admin-auth + rate-limit code.
    load: (rel, opts = {}) => (opts.realAuth ? loadReal : loadStub)(SRC + rel + ".ts"),
    resetRedis() {
      for (const k of Object.keys(redis.hashes)) delete redis.hashes[k];
      for (const k of Object.keys(redis.kv)) delete redis.kv[k];
      redis.down = redis.failCatalogRead = redis.failStockRead = false;
    },
  };
}

// Tiny reporter: prints ok/FAIL lines and exits non-zero if anything failed.
function createReporter(title) {
  let failures = 0;
  let total = 0;
  console.log(`\n=== ${title} ===`);
  return {
    section: (t) => console.log("\n-- " + t),
    check(label, cond, extra = "") {
      total++;
      if (!cond) failures++;
      console.log((cond ? "ok   " : "FAIL ") + label + (extra ? `  [${extra}]` : ""));
    },
    // Runs fn with console output silenced (code under test logs its errors).
    async quiet(fn) {
      const saved = [console.error, console.log];
      console.error = console.log = () => {};
      try {
        return await fn();
      } finally {
        [console.error, console.log] = saved;
      }
    },
    finish() {
      console.log(failures ? `\n${failures} of ${total} FAILED (${title})` : `\n${total} passed (${title})`);
      process.exit(failures ? 1 : 0);
    },
  };
}

module.exports = { createHarness, createReporter, Redirect, TEST_ENV, jose };
