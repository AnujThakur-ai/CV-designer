import { z } from "zod";

export const UnifiedCVSchema = z.object({
  personal: z.object({
    name: z.string().max(200).default(""),
    title: z.string().max(300).default(""),
    email: z.string().max(320).default(""),
    avatar: z.string().max(2_000).default(""),
    location: z.string().max(300).default(""),
    bio: z.string().max(5_000).default(""),
    github: z.string().max(2_000).optional(),
    linkedInUrl: z.string().max(2_000).optional(),
  }),
  experience: z.array(z.object({
    company: z.string().max(300).default(""),
    role: z.string().max(300).default(""),
    startDate: z.string().max(100).default(""),
    endDate: z.string().max(100).default(""),
    highlights: z.array(z.string().max(2_000)).max(30).default([]),
  })).max(30).default([]),
  projects: z.array(z.object({
    title: z.string().max(300),
    description: z.string().max(5_000).default(""),
    techStack: z.array(z.string().max(100)).max(50).default([]),
    stars: z.number().int().min(0).default(0),
    forks: z.number().int().min(0).optional(),
    pinned: z.boolean().optional(),
    liveUrl: z.string().max(2_000).optional(),
    githubUrl: z.string().max(2_000).default(""),
  })).max(100).default([]),
  skills: z.array(z.string().max(100)).max(100).default([]),
  notice: z.string().max(1_000).optional(),
});

export type UnifiedCVData = z.infer<typeof UnifiedCVSchema>;

export const emptyUnifiedCV: UnifiedCVData = {
  personal: { name: "", title: "", email: "", avatar: "", location: "", bio: "" },
  experience: [],
  projects: [],
  skills: [],
};

export function cleanText(value: unknown, maxLength = 5_000): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}

export function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2_000) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return undefined;
    if (parsed.hostname === "localhost" || parsed.hostname.endsWith(".localhost") || parsed.hostname.endsWith(".local")) return undefined;
    const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
    if (hostname.includes(":")) {
      const normalized = hostname.toLowerCase();
      const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
      if (!mappedIpv4 || isPrivateIpv4(mappedIpv4)) return undefined;
    }
    if (isPrivateIpv4(hostname)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return false;
  const ipv4 = hostname.split(".").map(Number);
  if (ipv4.some((part) => part < 0 || part > 255)) return false;
  return ipv4[0] === 10 || ipv4[0] === 127 || ipv4[0] === 0 ||
    (ipv4[0] === 169 && ipv4[1] === 254) ||
    (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) ||
    (ipv4[0] === 192 && ipv4[1] === 168);
}

export function parseReadmeDescription(markdown: string): string {
  const lines = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .split(/\r?\n/)
    .map((line) => cleanText(line.replace(/^#{1,6}\s*/, "").replace(/^\s*[-*+]\s+/, ""), 500))
    .filter((line) => line && !/^https?:\/\//i.test(line));
  const description = lines.find((line) => !/^installation$|^usage$|^contributing$|^license$/i.test(line));
  return description?.slice(0, 280) ?? "";
}

export function scoreRepository(repository: {
  stars: number;
  forks: number;
  pushedAt: string | null;
  homepage: string | null;
  hasReadme: boolean;
}): number {
  const pushedAt = repository.pushedAt ? Date.parse(repository.pushedAt) : NaN;
  const ageDays = Number.isFinite(pushedAt) ? Math.max(0, (Date.now() - pushedAt) / 86_400_000) : 3650;
  const recency = 30 * Math.exp(-ageDays / 180);
  return repository.stars * 2 + repository.forks * 1.5 + recency +
    (repository.hasReadme ? 8 : 0) + (repository.homepage ? 12 : 0);
}
