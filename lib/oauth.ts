import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { appendCookies, cookie, parseCookies, type ApiRequest, type ApiResponse } from "./http.ts";

export const githubStateCookie = "__Host-folio-github-state";
export const linkedinStateCookie = "__Host-folio-linkedin-state";
export const githubTokenCookie = "__Host-folio-github-token";
export const linkedinTokenCookie = "__Host-folio-linkedin-token";

const tokenSchema = z.object({ access_token: z.string().min(1), token_type: z.string().optional() });

function cookieKey(): Buffer {
  const secret = process.env.OAUTH_COOKIE_SECRET ?? "";
  if (!/^[\da-f]{64}$/i.test(secret)) {
    throw new Error("OAUTH_COOKIE_SECRET must be a 32-byte key encoded as 64 hexadecimal characters.");
  }
  return Buffer.from(secret, "hex");
}

export function sealToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cookieKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function openToken(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const bytes = Buffer.from(value, "base64url");
    if (bytes.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", cookieKey(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function verifyOAuthState(req: ApiRequest, cookieName: string, received: unknown): boolean {
  if (typeof received !== "string" || !/^[\da-zA-Z_-]{43}$/.test(received)) return false;
  const expected = parseCookies(req).get(cookieName);
  if (!expected || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function storeToken(res: ApiResponse, name: string, token: string) {
  appendCookies(res, [cookie(name, sealToken(token), {
    maxAge: 8 * 60 * 60,
    sameSite: "Strict",
  })]);
}

export function parseOAuthToken(value: unknown): string | null {
  const result = tokenSchema.safeParse(value);
  if (!result.success) return null;
  if (result.data.token_type && result.data.token_type.toLowerCase() !== "bearer") return null;
  return result.data.access_token;
}
