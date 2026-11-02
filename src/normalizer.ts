import { UnifiedCVSchema, cleanText, emptyUnifiedCV, safeHttpsUrl } from "../lib/normalizer.ts";
import type { UnifiedCVData } from "../lib/normalizer.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown, limit: number): string {
  return typeof value === "string" ? cleanText(value, limit) : "";
}

function canonicalProfileLink(value: unknown, domain: string): string | undefined {
  const text = readText(value, 2_000);
  if (!text) return undefined;
  const url = safeHttpsUrl(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== domain && parsed.hostname !== `www.${domain}`) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

export function parseProfileJson(source: unknown): UnifiedCVData {
  const unified = UnifiedCVSchema.safeParse(source);
  if (unified.success) {
    const profile = unified.data;
    profile.personal.avatar = safeHttpsUrl(profile.personal.avatar) ?? "";
    profile.personal.name = cleanText(profile.personal.name, 200);
    profile.personal.title = cleanText(profile.personal.title, 300);
    profile.projects = profile.projects.map((project) => ({
      ...project,
      githubUrl: safeHttpsUrl(project.githubUrl) ?? "",
      liveUrl: safeHttpsUrl(project.liveUrl),
    }));
    return profile;
  }

  if (!isRecord(source) || !isRecord(source.data)) {
    throw new Error("JSON must be a folio resume export or use the folio unified CV format.");
  }

  const data = source.data;
  const experiences = Array.isArray(data.experiences)
    ? data.experiences.slice(0, 30).flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const bullets = readText(entry.bullets, 20_000).split(/\r?\n/).map((bullet) => cleanText(bullet, 2_000)).filter(Boolean);
      return [{
        company: readText(entry.company, 300),
        role: readText(entry.title, 300),
        startDate: readText(entry.startDate, 100),
        endDate: readText(entry.endDate, 100),
        highlights: bullets.slice(0, 30),
      }];
    })
    : [];
  const projects = Array.isArray(data.projects)
    ? data.projects.slice(0, 50).flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const url = safeHttpsUrl(entry.url);
      const technologies = readText(entry.language, 500).split(/[,|]/).map((item) => cleanText(item, 100)).filter(Boolean);
      return [{
        title: readText(entry.name, 300) || "Project",
        description: readText(entry.description, 5_000),
        techStack: technologies.slice(0, 50),
        stars: typeof entry.stars === "number" && Number.isInteger(entry.stars) && entry.stars >= 0 ? entry.stars : 0,
        ...(url?.startsWith("https://github.com/") ? { githubUrl: url } : { githubUrl: "" }),
        ...(url && !url.startsWith("https://github.com/") ? { liveUrl: url } : {}),
      }];
    })
    : [];
  const skills = Array.isArray(data.skills)
    ? data.skills.filter((skill): skill is string => typeof skill === "string").slice(0, 100).map((skill) => cleanText(skill, 100)).filter(Boolean)
    : [];

  return UnifiedCVSchema.parse({
    ...emptyUnifiedCV,
    personal: {
      ...emptyUnifiedCV.personal,
      name: readText(data.name, 200),
      title: readText(data.title, 300),
      email: readText(data.email, 320),
      avatar: safeHttpsUrl(data.avatar) ?? "",
      location: readText(data.city, 300),
      bio: readText(data.summary, 5_000),
      github: canonicalProfileLink(data.github, "github.com"),
      linkedInUrl: canonicalProfileLink(data.linkedin, "linkedin.com"),
    },
    experience: experiences,
    projects,
    skills,
  });
}

function parseDateRange(text: string): { startDate: string; endDate: string } {
  const match = text.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2}\s*(?:-|–|—|to)\s*((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2}|Present|Current)/i);
  if (!match) return { startDate: "", endDate: "" };
  const [startDate = "", endDate = ""] = match[0].split(/\s*(?:-|–|—|to)\s*/i);
  return { startDate: cleanText(startDate, 100), endDate: cleanText(endDate, 100) };
}

function parseProfileText(text: string): UnifiedCVData {
  const lines = text.split(/\r?\n/).map((line) => cleanText(line, 500)).filter(Boolean);
  const headingIndex = lines.findIndex((line) => /^(experience|professional experience)$/i.test(line));
  const skillsIndex = lines.findIndex((line) => /^skills$/i.test(line));
  const educationIndex = lines.findIndex((line) => /^education$/i.test(line));
  const name = lines.find((line) => !/^(contact|top skills|experience|education|skills|languages|certifications)$/i.test(line)) ?? "";
  const sectionEnd = [skillsIndex, educationIndex].filter((index) => index > headingIndex).sort((a, b) => a - b)[0] ?? lines.length;
  const roles: UnifiedCVData["experience"] = [];
  const experienceLines = headingIndex >= 0 ? lines.slice(headingIndex + 1, sectionEnd) : [];
  let current: UnifiedCVData["experience"][number] | undefined;
  const preceding: string[] = [];
  for (const line of experienceLines) {
    const dates = parseDateRange(line);
    if (dates.startDate) {
      if (current) roles.push(current);
      const role = preceding.pop() ?? "";
      const company = preceding.pop() ?? "";
      current = { company, role, ...dates, highlights: [] };
      continue;
    }
    if (/^[•*-]\s*/.test(line) && line.length > 2) {
      if (current) current.highlights.push(line.replace(/^[•*-]\s*/, "").slice(0, 2_000));
      continue;
    }
    if (!/^(experience|professional experience)$/i.test(line)) preceding.push(line);
  }
  if (current) roles.push(current);
  const skillLines = skillsIndex >= 0 ? lines.slice(skillsIndex + 1, educationIndex > skillsIndex ? educationIndex : undefined) : [];
  const skills = skillLines.flatMap((line) => line.split(/[,•|]/)).map((skill) => cleanText(skill, 100)).filter(Boolean).slice(0, 100);
  return UnifiedCVSchema.parse({
    ...emptyUnifiedCV,
    personal: { ...emptyUnifiedCV.personal, name, title: lines[1] ?? "" },
    experience: roles.slice(0, 30),
    skills,
  });
}

export async function parseLinkedInFile(file: File): Promise<UnifiedCVData> {
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose a profile file smaller than 12 MB.");
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const [{ GlobalWorkerOptions, getDocument }, { default: workerUrl }] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    GlobalWorkerOptions.workerSrc = workerUrl;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const document = await getDocument({ data: bytes, isEvalSupported: false }).promise;
    try {
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 30); pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => "str" in item ? item.str : "").join("\n"));
      }
      const profile = parseProfileText(pages.join("\n"));
      if (!profile.personal.name && !profile.experience.length) {
        throw new Error("Could not recognize profile details in this PDF. Try LinkedIn's Save to PDF export.");
      }
      return profile;
    } finally {
      await document.destroy();
    }
  }

  if (file.type === "application/json" || file.name.toLowerCase().endsWith(".json")) {
    const source: unknown = JSON.parse(await file.text());
    return parseProfileJson(source);
  }
  throw new Error("Choose a LinkedIn profile PDF or a folio CV JSON file.");
}
