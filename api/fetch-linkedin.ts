import { z } from "zod";
import { cleanText, safeHttpsUrl } from "../lib/normalizer.ts";
import {
  enforceRateLimit,
  fetchWithTimeout,
  invalidBody,
  readBody,
  readJsonLimited,
  requireMethod,
  sendJson,
  setSecurityHeaders,
  validateSameOrigin,
  type ApiRequest,
  type ApiResponse,
} from "../lib/http.ts";
import { openToken, linkedinTokenCookie } from "../lib/oauth.ts";
import { parseCookies } from "../lib/http.ts";

const requestSchema = z.object({}).strict();
const userInfoSchema = z.object({
  sub: z.string().max(200),
  name: z.string().max(200).optional(),
  given_name: z.string().max(100).optional(),
  family_name: z.string().max(100).optional(),
  email: z.string().email().max(320).optional(),
  picture: z.string().url().optional(),
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, "POST") || !validateSameOrigin(req, res)) return;
  if (!(await enforceRateLimit(req, res))) return;
  if (!requestSchema.safeParse(readBody(req) ?? {}).success) return invalidBody(res);
  const token = openToken(parseCookies(req).get(linkedinTokenCookie));
  if (!token) return sendJson(res, 401, { error: "Connect your LinkedIn account before importing profile details." });
  try {
    const response = await fetchWithTimeout("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (response.status === 401 || response.status === 403) {
      return sendJson(res, 401, { error: "LinkedIn authorization expired or the profile scope was not approved. Connect again." });
    }
    if (!response.ok) return sendJson(res, 502, { error: `LinkedIn returned an error (${response.status}).` });
    const profile = userInfoSchema.safeParse(await readJsonLimited(response, 256 * 1024));
    if (!profile.success) return sendJson(res, 502, { error: "LinkedIn returned profile data in an unexpected format." });
    const name = cleanText(profile.data.name, 200) ||
      [profile.data.given_name, profile.data.family_name].map((part) => cleanText(part, 100)).filter(Boolean).join(" ");
    sendJson(res, 200, {
      personal: {
        name,
        title: "",
        email: cleanText(profile.data.email, 320),
        avatar: safeHttpsUrl(profile.data.picture) ?? "",
        location: "",
        bio: "",
      },
      experience: [],
      projects: [],
      skills: [],
      notice: "LinkedIn's approved OpenID Connect profile scope provides identity and email only. Import a LinkedIn profile PDF to add work history and skills.",
    });
  } catch (reason) {
    if (reason instanceof Error && reason.name === "AbortError") {
      return sendJson(res, 504, { error: "LinkedIn took too long to respond. Try again." });
    }
    sendJson(res, 502, { error: "Could not fetch LinkedIn profile data." });
  }
}
