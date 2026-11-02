import { cleanText, emptyUnifiedCV, safeHttpsUrl, scoreRepository } from "../lib/normalizer.ts";
import type { UnifiedCVData } from "../lib/normalizer.ts";
import { z } from "zod";

const githubUserSchema = z.object({
  login: z.string().regex(/^[A-Za-z0-9-]{1,39}$/),
  name: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  avatar_url: z.string().url(),
  html_url: z.string().url(),
});

const githubRepositoriesSchema = z.array(z.object({
  name: z.string().max(100),
  description: z.string().nullable(),
  stargazers_count: z.number().int().min(0),
  forks_count: z.number().int().min(0),
  language: z.string().nullable(),
  html_url: z.string().url(),
  homepage: z.string().nullable(),
  fork: z.boolean(),
  pushed_at: z.string().nullable(),
  topics: z.array(z.string()).optional().default([]),
}));

export function parseGitHubUsername(value: string): string {
  const input = value.trim();
  if (!input) throw new Error("Enter a GitHub username or profile URL.");
  if (/^[A-Za-z0-9-]{1,39}$/.test(input) && !input.startsWith("-") && !input.endsWith("-")) {
    return input;
  }
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    const segments = url.pathname.split("/").filter(Boolean);
    if (url.hostname.toLowerCase() !== "github.com" || segments.length !== 1 ||
      !/^[A-Za-z0-9-]{1,39}$/.test(segments[0]) || segments[0].startsWith("-") || segments[0].endsWith("-")) {
      throw new Error();
    }
    return segments[0];
  } catch {
    throw new Error("Enter a GitHub username or a github.com/username profile URL.");
  }
}

export function normalizePublicGitHubProfile(userInput: unknown, repositoriesInput: unknown): UnifiedCVData {
  const user = githubUserSchema.safeParse(userInput);
  const repositories = githubRepositoriesSchema.safeParse(repositoriesInput);
  if (!user.success || !repositories.success) {
    throw new Error("GitHub returned profile data in an unexpected format.");
  }

  const projects = repositories.data
    .filter((repository) => !repository.fork)
    .map((repository) => ({
      repository,
      score: scoreRepository({
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        pushedAt: repository.pushed_at,
        homepage: repository.homepage,
        hasReadme: false,
      }),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map(({ repository }) => ({
      title: cleanText(repository.name, 300),
      description: cleanText(repository.description, 5_000),
      techStack: [...new Set([
        cleanText(repository.language, 100),
        ...repository.topics.map((topic) => cleanText(topic, 100)),
      ].filter(Boolean))].slice(0, 50),
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      liveUrl: safeHttpsUrl(repository.homepage),
      githubUrl: `https://github.com/${user.data.login}/${repository.name}`,
    }));

  return {
    ...emptyUnifiedCV,
    personal: {
      ...emptyUnifiedCV.personal,
      name: cleanText(user.data.name, 200) || user.data.login,
      avatar: safeHttpsUrl(user.data.avatar_url) ?? "",
      location: cleanText(user.data.location, 300),
      bio: cleanText(user.data.bio, 5_000),
      github: `https://github.com/${user.data.login}`,
    },
    projects,
    skills: [...new Set(projects.flatMap((project) => project.techStack))].slice(0, 100),
    notice: "Imported public GitHub profile data. GitHub limits unauthenticated requests; connect with OAuth for pinned repositories and higher limits.",
  };
}
