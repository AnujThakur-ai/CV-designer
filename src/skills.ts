export type SkillBrand =
  | "react"
  | "typescript"
  | "javascript"
  | "python"
  | "figma"
  | "github"
  | "git"
  | "node"
  | "docker"
  | "aws"
  | "html"
  | "css"
  | "java"
  | "go"
  | "rust";

const brandAliases: Record<SkillBrand, string[]> = {
  react: ["react", "react.js", "reactjs"],
  typescript: ["typescript", "ts"],
  javascript: ["javascript", "js", "ecmascript"],
  python: ["python", "python3"],
  figma: ["figma"],
  github: ["github"],
  git: ["git"],
  node: ["node", "node.js", "nodejs"],
  docker: ["docker"],
  aws: ["aws", "amazon web services"],
  html: ["html", "html5"],
  css: ["css", "css3"],
  java: ["java"],
  go: ["go", "golang"],
  rust: ["rust"],
};

function normalizedToken(token: string): string {
  return token.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getSkillBrands(skill: string): SkillBrand[] {
  const tokens = skill.split(/[,/&+]/).map(normalizedToken).filter(Boolean);
  const brands = new Set<SkillBrand>();
  for (const token of tokens) {
    for (const [brand, aliases] of Object.entries(brandAliases) as Array<[SkillBrand, string[]]>) {
      if (aliases.includes(token)) brands.add(brand);
    }
  }
  return [...brands];
}

export function addUniqueSkills(current: string[], incoming: string[]): string[] {
  const skills = new Map<string, string>();
  for (const skill of [...current, ...incoming]) {
    const trimmed = skill.trim();
    if (trimmed && !skills.has(normalizedToken(trimmed))) skills.set(normalizedToken(trimmed), trimmed);
  }
  return [...skills.values()];
}

export function splitSkillInput(value: string): { skills: string[]; draft: string } {
  const parts = value.split(",");
  const committed = parts.slice(0, -1).map((part) => part.trim()).filter(Boolean);
  return { skills: committed, draft: parts[parts.length - 1] ?? "" };
}
