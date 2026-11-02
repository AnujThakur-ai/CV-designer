import { z } from "zod";
import {
  appendCookies,
  clearCookie,
  cookie,
  fetchWithTimeout,
  oauthBaseUrl,
  readJsonLimited,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "./http.ts";
import {
  createOAuthState,
  githubStateCookie,
  githubTokenCookie,
  linkedinStateCookie,
  linkedinTokenCookie,
  parseOAuthToken,
  storeToken,
  verifyOAuthState,
} from "./oauth.ts";

type Provider = "github" | "linkedin";
const callbackQuery = z.object({ code: z.string().min(1).max(2_000), state: z.string().min(1).max(200) });

function providerConfig(provider: Provider) {
  if (provider === "github") {
    return {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectPath: "/api/oauth/github/callback",
      stateCookie: githubStateCookie,
      tokenCookie: githubTokenCookie,
      authorizationUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scopes: "read:user",
    };
  }
  return {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectPath: "/api/oauth/linkedin/callback",
    stateCookie: linkedinStateCookie,
    tokenCookie: linkedinTokenCookie,
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: "openid profile email",
  };
}

export function startOAuth(provider: Provider, req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }
  const config = providerConfig(provider);
  if (!config.clientId || !config.clientSecret) {
    sendJson(res, 503, { error: `${provider} OAuth is not configured.` });
    return;
  }
  try {
    const state = createOAuthState();
    const authorization = new URL(config.authorizationUrl);
    authorization.searchParams.set("response_type", "code");
    authorization.searchParams.set("client_id", config.clientId);
    authorization.searchParams.set("redirect_uri", `${oauthBaseUrl()}${config.redirectPath}`);
    authorization.searchParams.set("scope", config.scopes);
    authorization.searchParams.set("state", state);
    appendCookies(res, [cookie(config.stateCookie, state, { maxAge: 300, sameSite: "Lax" })]);
    res.statusCode = 302;
    res.setHeader("Location", authorization.toString());
    res.end();
  } catch {
    sendJson(res, 503, { error: "OAuth could not be started. Check the deployment URL and server configuration." });
  }
}

export async function finishOAuth(provider: Provider, req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }
  const config = providerConfig(provider);
  const query = new URL(req.url ?? "/", "http://localhost").searchParams;
  const state = query.get("state");
  const parsed = callbackQuery.safeParse({ code: query.get("code"), state });
  const validState = verifyOAuthState(req, config.stateCookie, state);
  appendCookies(res, [clearCookie(config.stateCookie, "Lax")]);
  if (!parsed.success || !validState || query.has("error")) {
    res.statusCode = 302;
    res.setHeader("Location", "/?oauthError=authorization");
    res.end();
    return;
  }
  if (!config.clientId || !config.clientSecret) {
    res.statusCode = 302;
    res.setHeader("Location", "/?oauthError=configuration");
    res.end();
    return;
  }
  try {
    const response = await fetchWithTimeout(config.tokenUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        ...(provider === "linkedin" ? { grant_type: "authorization_code" } : {}),
        code: parsed.data.code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${oauthBaseUrl()}${config.redirectPath}`,
      }),
    });
    if (!response.ok) throw new Error(`OAuth token exchange failed (${response.status}).`);
    const token = parseOAuthToken(await readJsonLimited(response, 16 * 1024));
    if (!token) throw new Error("OAuth returned an invalid access token.");
    storeToken(res, config.tokenCookie, token);
    res.statusCode = 302;
    res.setHeader("Location", `/?connected=${provider}`);
    res.end();
  } catch {
    res.statusCode = 302;
    res.setHeader("Location", "/?oauthError=exchange");
    res.end();
  }
}
