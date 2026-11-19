// The admin login: signed session cookies, the password check, the proxy
// guard, the login/logout actions and the five-strikes lockout. Uses the REAL
// admin-auth, session and rate-limit modules.
const { createHarness, createReporter, Redirect, TEST_ENV, jose } = require("./harness.cjs");

const h = createHarness();
const t = createReporter("admin login: sessions, password, proxy, lockout");

(async () => {
  const opts = { realAuth: true };
  const session = h.load("lib/admin-session", opts);
  const auth = h.load("lib/admin-auth", opts);
  const actions = h.load("app/admin/actions", opts);
  const { proxy } = h.load("proxy", opts);
  const secret = new TextEncoder().encode(TEST_ENV.ADMIN_SESSION_SECRET);
  const form = (pw) => ({ get: (k) => (k === "password" ? pw : null) });
  const rejects = async (fn) => {
    try {
      await fn();
      return null;
    } catch (e) {
      return e;
    }
  };

  t.section("signed session tokens");
  const token = await session.signAdminSession();
  t.check("a freshly signed token verifies", await session.verifyAdminSession(token));
  t.check("missing / empty / garbage tokens are not logged in", !(await session.verifyAdminSession(undefined)) && !(await session.verifyAdminSession("")) && !(await session.verifyAdminSession("not.a.jwt")));
  const [hd, , sig] = token.split(".");
  const tampered = hd + "." + Buffer.from(JSON.stringify({ role: "admin", exp: 9999999999 })).toString("base64url") + "." + sig;
  t.check("a token with an edited payload (bad signature) is rejected", !(await session.verifyAdminSession(tampered)));
  const forged = await new jose.SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(new TextEncoder().encode("a-different-secret-that-is-32-chars-long!!"));
  t.check("a token signed with a different secret is rejected", !(await session.verifyAdminSession(forged)));
  const noneAlg = [Buffer.from('{"alg":"none"}').toString("base64url"), Buffer.from('{"role":"admin"}').toString("base64url"), ""].join(".");
  t.check('an unsigned "alg: none" token is rejected', !(await session.verifyAdminSession(noneAlg)));
  const now = Math.floor(Date.now() / 1000);
  const expired = await new jose.SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt(now - 1000).setExpirationTime(now - 10).sign(secret);
  t.check("an expired token is rejected", !(await session.verifyAdminSession(expired)));
  const wrongRole = await new jose.SignJWT({ role: "customer" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(secret);
  t.check("a validly signed token without the admin role is rejected", !(await session.verifyAdminSession(wrongRole)));
  process.env.ADMIN_SESSION_SECRET = "too-short";
  t.check("a weak secret: signing throws and verifying fails closed", !!(await rejects(() => session.signAdminSession())) && !(await session.verifyAdminSession(token)));
  delete process.env.ADMIN_SESSION_SECRET;
  t.check("no secret: verifying fails closed", !(await session.verifyAdminSession(token)));
  process.env.ADMIN_SESSION_SECRET = TEST_ENV.ADMIN_SESSION_SECRET;

  t.section("password check");
  t.check("the right password matches", auth.passwordMatches(TEST_ENV.ADMIN_PASSWORD));
  t.check("wrong, empty and near-miss passwords don't", !auth.passwordMatches("wrong") && !auth.passwordMatches("") && !auth.passwordMatches(TEST_ENV.ADMIN_PASSWORD.slice(0, -1)) && !auth.passwordMatches(TEST_ENV.ADMIN_PASSWORD + " "));
  delete process.env.ADMIN_PASSWORD;
  const unset = await t.quiet(() => !auth.passwordMatches("") && !auth.passwordMatches("anything"));
  process.env.ADMIN_PASSWORD = TEST_ENV.ADMIN_PASSWORD;
  t.check("no ADMIN_PASSWORD set: nobody can log in, not even with an empty password", unset);

  t.section("proxy guard");
  const req = (path, tok) => ({ nextUrl: { pathname: path }, url: "http://localhost:3000" + path, cookies: { get: (n) => (tok && n === session.ADMIN_COOKIE ? { value: tok } : undefined) } });
  t.check("logged out /admin and deep admin paths redirect to the login", (await proxy(req("/admin"))).to === "/admin/login" && (await proxy(req("/admin/products/new"))).kind === "redirect");
  t.check("the login page itself is reachable", (await proxy(req("/admin/login"))).kind === "next");
  t.check("a forged cookie redirects; a real one is allowed", (await proxy(req("/admin", forged))).kind === "redirect" && (await proxy(req("/admin", token))).kind === "next");

  t.section("login and logout");
  let out = await t.quiet(() => actions.login({}, form("nope")));
  t.check("wrong password: error, no cookie, failure counted against the caller's IP", out.error === "Incorrect password." && !(session.ADMIN_COOKIE in h.request.cookies) && h.redis.kv["admin:failed-logins:203.0.113.7"] === 1);
  const ok = await rejects(() => actions.login({}, form(TEST_ENV.ADMIN_PASSWORD)));
  t.check("right password redirects to /admin", ok instanceof Redirect && ok.to === "/admin");
  const o = h.request.cookieOptions[session.ADMIN_COOKIE];
  t.check("cookie is httpOnly, sameSite=lax, site-wide, valid 7 days", o.httpOnly && o.sameSite === "lax" && o.path === "/" && o.maxAge === 7 * 86400);
  t.check("a successful login clears the failure count and the cookie is a real admin session", h.redis.kv["admin:failed-logins:203.0.113.7"] === undefined && (await session.verifyAdminSession(h.request.cookies[session.ADMIN_COOKIE])));
  t.check("isAdmin() sees the logged-in cookie", await auth.isAdmin());
  const lo = await rejects(() => actions.logout());
  t.check("logout deletes the cookie and redirects to the login", lo instanceof Redirect && lo.to === "/admin/login" && !(await auth.isAdmin()));
  const guard = await rejects(() => auth.requireAdmin());
  t.check("requireAdmin() redirects when logged out", guard instanceof Redirect && guard.to === "/admin/login");

  t.section("lockout");
  for (let i = 0; i < 5; i++) await t.quiet(() => actions.login({}, form("guess" + i)));
  out = await actions.login({}, form("guess6"));
  t.check("after 5 wrong guesses the next attempt is refused as locked", /Too many/.test(out.error));
  out = await actions.login({}, form(TEST_ENV.ADMIN_PASSWORD));
  t.check("while locked even the CORRECT password is refused, with no cookie", /Too many/.test(out.error) && !(session.ADMIN_COOKIE in h.request.cookies));
  h.request.headers = { "x-forwarded-for": "198.51.100.9" };
  const other = await rejects(() => actions.login({}, form(TEST_ENV.ADMIN_PASSWORD)));
  t.check("a different IP isn't locked out", other instanceof Redirect);
  delete h.request.cookies[session.ADMIN_COOKIE];

  h.redis.down = true;
  out = await t.quiet(() => actions.login({}, form("wrong")));
  const stillWorks = await t.quiet(() => rejects(() => actions.login({}, form(TEST_ENV.ADMIN_PASSWORD))));
  h.redis.down = false;
  t.check("Redis down: guesses can't be counted but the password is still required and still works", out.error === "Incorrect password." && stillWorks instanceof Redirect);
  delete h.request.cookies[session.ADMIN_COOKIE];

  delete process.env.ADMIN_SESSION_SECRET;
  out = await t.quiet(() => actions.login({}, form(TEST_ENV.ADMIN_PASSWORD)));
  process.env.ADMIN_SESSION_SECRET = TEST_ENV.ADMIN_SESSION_SECRET;
  t.check("secret not configured: the right password gets a clear error and no cookie", /isn't configured/.test(out.error) && !(session.ADMIN_COOKIE in h.request.cookies));

  t.finish();
})().catch((e) => {
  console.log("ERROR", e);
  process.exit(1);
});
