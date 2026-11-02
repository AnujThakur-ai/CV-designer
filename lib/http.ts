import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export type ApiRequest = IncomingMessage & { body?: unknown };
export type ApiResponse = ServerResponse<IncomingMessage> & {
  status(code: number): ApiResponse;
  json(value: unknown): void;
};

const errorSchema = z.object({ error: z.string() });
let limiter: Ratelimit | undefined;

export function sendJson(res: ApiResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function readBody(req: ApiRequest): unknown {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as unknown;
    } catch {
      return null;
    }
  }
  return req.body;
}

export function parseCookies(req: ApiRequest): Map<string, string> {
  const raw = req.headers.cookie ?? "";
  return new Map(
    raw.split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      if (separator < 0) return [];
      try {
        return [[part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())]];
      } catch {
        return [];
      }
    }),
  );
}

export function appendCookies(res: ApiResponse, cookies: string[]) {
  const existing = res.getHeader("Set-Cookie");
  const values = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : [];
  res.setHeader("Set-Cookie", [...values, ...cookies]);
}

export function cookie(name: string, value: string, options: {
  maxAge: number;
  sameSite: "Lax" | "Strict";
  path?: string;
}): string {
  const secure = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? "/"}`,
    `Max-Age=${options.maxAge}`,
    "HttpOnly",
    "Secure",
    `SameSite=${options.sameSite}`,
  ].join("; ");
}

export function clearCookie(name: string, sameSite: "Lax" | "Strict"): string {
  return cookie(name, "", { maxAge: 0, sameSite });
}

export function oauthBaseUrl(): string {
  const configured = process.env.APP_BASE_URL;
  const vercel = process.env.VERCEL_URL;
  const base = configured ?? (vercel ? `https://${vercel}` : "http://localhost:3000");
  const parsed = new URL(base);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("APP_BASE_URL must use HTTPS.");
  }
  return parsed.origin;
}

export function requireMethod(req: ApiRequest, res: ApiResponse, method: string): boolean {
  if (req.method === method) return true;
  res.setHeader("Allow", method);
  sendJson(res, 405, { error: "Method not allowed." });
  return false;
}

export function validateSameOrigin(req: ApiRequest, res: ApiResponse): boolean {
  const origin = req.headers.origin;
  try {
    if (origin && new URL(origin).origin === oauthBaseUrl()) return true;
  } catch {
    // An invalid Origin is rejected below.
  }
  sendJson(res, 403, { error: "Cross-origin requests are not allowed." });
  return false;
}

export async function enforceRateLimit(req: ApiRequest, res: ApiResponse): Promise<boolean> {
  const address = req.headers["x-real-ip"];
  const ip = typeof address === "string" ? address : undefined;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!ip || !redisUrl || !redisToken) {
    sendJson(res, 503, { error: "Profile imports are unavailable until IP rate limiting is configured." });
    return false;
  }
  limiter ??= new Ratelimit({
    redis: new Redis({ url: redisUrl, token: redisToken }),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "folio:profile-import",
    analytics: false,
  });
  try {
    const addressHash = createHash("sha256").update(ip).digest("hex");
    const result = await limiter.limit(addressHash);
    res.setHeader("X-RateLimit-Limit", String(result.limit));
    res.setHeader("X-RateLimit-Remaining", String(result.remaining));
    if (result.success) return true;
    res.setHeader("Retry-After", String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))));
    sendJson(res, 429, { error: "Too many profile imports. Try again in a minute." });
    return false;
  } catch {
    sendJson(res, 503, { error: "Rate limiting is temporarily unavailable; no profile data was fetched." });
    return false;
  }
}

export function invalidBody(res: ApiResponse) {
  sendJson(res, 400, errorSchema.parse({ error: "Request body is invalid." }));
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8_000): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

export async function readJsonLimited(response: Response, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new Error("The profile provider response exceeded the allowed size.");
  }
  if (!response.body) throw new Error("The profile provider returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("The profile provider response exceeded the allowed size.");
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export function setSecurityHeaders(res: ApiResponse) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}
