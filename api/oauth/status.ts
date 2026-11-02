import { sendJson, requireMethod, setSecurityHeaders, parseCookies, type ApiRequest, type ApiResponse } from "../../lib/http.ts";
import { openToken, githubTokenCookie, linkedinTokenCookie } from "../../lib/oauth.ts";

export default function handler(req: ApiRequest, res: ApiResponse) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, "GET")) return;
  const cookies = parseCookies(req);
  sendJson(res, 200, {
    github: Boolean(openToken(cookies.get(githubTokenCookie))),
    linkedin: Boolean(openToken(cookies.get(linkedinTokenCookie))),
  });
}
