import assert from "node:assert/strict";
import test from "node:test";
import { parseReadmeDescription, safeHttpsUrl, scoreRepository } from "../lib/normalizer.ts";
import { createOAuthState, githubStateCookie, openToken, sealToken, verifyOAuthState } from "../lib/oauth.ts";
import { readJsonLimited } from "../lib/http.ts";
import fetchGithub from "../api/fetch-github.ts";
import startGithubOAuth from "../api/oauth/github/start.ts";
import finishGithubOAuth from "../api/oauth/github/callback.ts";

function fakeResponse() {
  const headers = new Map();
  return {
    headers,
    statusCode: 200,
    body: "",
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    getHeader(name) { return headers.get(name.toLowerCase()); },
    end(value = "") { this.body = value; },
  };
}

test("OAuth tokens are encrypted and authenticated before decryption", () => {
  process.env.OAUTH_COOKIE_SECRET = "a".repeat(64);
  const sealed = sealToken("provider-access-token");
  assert.notEqual(sealed, "provider-access-token");
  assert.equal(openToken(sealed), "provider-access-token");
  assert.equal(openToken(`${sealed.slice(0, -2)}aa`), null);
});

test("OAuth state is random and must match the HttpOnly state cookie", () => {
  const state = createOAuthState();
  const request = { headers: { cookie: `${githubStateCookie}=${state}` } };
  assert.equal(state.length, 43);
  assert.equal(verifyOAuthState(request, githubStateCookie, state), true);
  assert.equal(verifyOAuthState(request, githubStateCookie, `${state.slice(0, -1)}a`), false);
  assert.equal(verifyOAuthState({ headers: {} }, githubStateCookie, state), false);
});

test("GitHub OAuth start sets secure state and uses least-privilege scope", () => {
  process.env.APP_BASE_URL = "http://localhost:3000";
  process.env.GITHUB_CLIENT_ID = "test-client";
  process.env.GITHUB_CLIENT_SECRET = "test-secret";
  const response = fakeResponse();
  startGithubOAuth({ method: "GET", headers: {} }, response);
  const authorization = new URL(response.headers.get("location"));
  const stateCookie = response.headers.get("set-cookie").join("; ");
  assert.equal(response.statusCode, 302);
  assert.equal(authorization.origin, "https://github.com");
  assert.equal(authorization.searchParams.get("scope"), "read:user");
  assert.ok(stateCookie.includes("HttpOnly"));
  assert.ok(stateCookie.includes("Secure"));
  assert.ok(stateCookie.includes("SameSite=Lax"));
  assert.equal(authorization.searchParams.get("state"), stateCookie.match(/=([^;]+)/)?.[1]);
});

test("OAuth callback rejects invalid state before exchanging a code", async () => {
  process.env.APP_BASE_URL = "http://localhost:3000";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("OAuth code exchange must not run"); };
  try {
    const response = fakeResponse();
    await finishGithubOAuth({
      method: "GET",
      url: "/api/oauth/github/callback?code=sample&state=attacker",
      headers: { cookie: `${githubStateCookie}=expected` },
    }, response);
    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.get("location"), "/?oauthError=authorization");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("URLs reject non-HTTPS and private network targets", () => {
  assert.equal(safeHttpsUrl("https://example.com/profile"), "https://example.com/profile");
  assert.equal(safeHttpsUrl("http://example.com"), undefined);
  assert.equal(safeHttpsUrl("https://127.0.0.1"), undefined);
  assert.equal(safeHttpsUrl("https://169.254.169.254/latest/meta-data"), undefined);
  assert.equal(safeHttpsUrl("https://[::1]/"), undefined);
});

test("upstream JSON responses are size bounded", async () => {
  const normal = new Response(JSON.stringify({ value: "ok" }));
  assert.deepEqual(await readJsonLimited(normal, 100), { value: "ok" });
  const oversized = new Response(JSON.stringify({ value: "too large" }));
  await assert.rejects(readJsonLimited(oversized, 4), /exceeded the allowed size/);
});

test("Repository scoring rewards activity and portfolio metadata", () => {
  const recent = new Date().toISOString();
  const strong = scoreRepository({
    stars: 10,
    forks: 3,
    pushedAt: recent,
    homepage: "https://example.com",
    hasReadme: true,
  });
  const stale = scoreRepository({
    stars: 0,
    forks: 0,
    pushedAt: "2010-01-01T00:00:00Z",
    homepage: null,
    hasReadme: false,
  });
  assert.ok(strong > stale);
});

test("README summaries are reduced to plain text", () => {
  const description = parseReadmeDescription("# Portfolio\n\nA **fast** project [guide](https://example.com).\n\n```js\nunsafe()\n```");
  assert.equal(description, "Portfolio");
  assert.ok(!description.includes("<"));
});

test("profile routes reject cross-origin requests", async () => {
  process.env.APP_BASE_URL = "http://localhost:3000";
  const response = fakeResponse();
  await fetchGithub({
    method: "POST",
    headers: { origin: "https://attacker.example", "x-real-ip": "203.0.113.10" },
    body: {},
  }, response);
  assert.equal(response.statusCode, 403);
  assert.match(response.body, /Cross-origin/);
});

test("profile routes fail closed when distributed rate limiting is not configured", async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.APP_BASE_URL = "http://localhost:3000";
  const response = fakeResponse();
  await fetchGithub({
    method: "POST",
    headers: { origin: "http://localhost:3000", "x-real-ip": "203.0.113.10" },
    body: {},
  }, response);
  assert.equal(response.statusCode, 503);
  assert.match(response.body, /rate limiting is configured/i);
  if (previousUrl) process.env.UPSTASH_REDIS_REST_URL = previousUrl;
  if (previousToken) process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
});
