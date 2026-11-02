import { appendCookies, clearCookie, requireMethod, sendJson, setSecurityHeaders, validateSameOrigin, type ApiRequest, type ApiResponse } from "../../lib/http.ts";
import { githubTokenCookie, linkedinTokenCookie } from "../../lib/oauth.ts";

export default function handler(req: ApiRequest, res: ApiResponse) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, "POST") || !validateSameOrigin(req, res)) return;
  appendCookies(res, [clearCookie(githubTokenCookie, "Strict"), clearCookie(linkedinTokenCookie, "Strict")]);
  sendJson(res, 200, { ok: true });
}
