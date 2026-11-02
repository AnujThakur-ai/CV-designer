import { UnifiedCVSchema, cleanText, emptyUnifiedCV, safeHttpsUrl } from "../lib/normalizer";
import type { UnifiedCVData } from "../lib/normalizer";

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
    const parsed = UnifiedCVSchema.safeParse(source);
    if (!parsed.success) throw new Error("JSON must use the folio unified CV format.");
    parsed.data.personal.avatar = safeHttpsUrl(parsed.data.personal.avatar) ?? "";
    parsed.data.personal.name = cleanText(parsed.data.personal.name, 200);
    parsed.data.personal.title = cleanText(parsed.data.personal.title, 300);
    parsed.data.projects = parsed.data.projects.map((project) => ({
      ...project,
      githubUrl: safeHttpsUrl(project.githubUrl) ?? "",
      liveUrl: safeHttpsUrl(project.liveUrl),
    }));
    return parsed.data;
  }
  throw new Error("Choose a LinkedIn profile PDF or a folio CV JSON file.");
}
