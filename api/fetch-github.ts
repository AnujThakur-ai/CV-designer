import { z } from "zod";
import { cleanText, parseReadmeDescription, safeHttpsUrl, scoreRepository } from "../lib/normalizer.ts";
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
import { openToken, githubTokenCookie } from "../lib/oauth.ts";
import { parseCookies } from "../lib/http.ts";

const requestSchema = z.object({ includeForks: z.boolean().default(false) }).strict();
const userSchema = z.object({
  login: z.string().max(39),
  name: z.string().nullable(),
  email: z.string().nullable().optional(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  avatar_url: z.string().url(),
  html_url: z.string().url(),
});
const repositorySchema = z.object({
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
});
const pinnedSchema = z.object({
  data: z.object({
    viewer: z.object({
      pinnedItems: z.object({
        nodes: z.array(z.object({
          name: z.string().max(100),
          nameWithOwner: z.string().max(200),
          description: z.string().nullable(),
          stargazerCount: z.number().int().min(0),
          forkCount: z.number().int().min(0),
          primaryLanguage: z.object({ name: z.string() }).nullable(),
          url: z.string().url(),
          homepageUrl: z.string().nullable(),
          isFork: z.boolean(),
          pushedAt: z.string().nullable(),
          repositoryTopics: z.object({
            nodes: z.array(z.object({ topic: z.object({ name: z.string() }) })),
          }),
        })),
      }),
    }),
  }),
});

async function githubJson(url: string, token: string): Promise<Response> {
  return fetchWithTimeout(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, "POST") || !validateSameOrigin(req, res)) return;
  if (!(await enforceRateLimit(req, res))) return;
  const request = requestSchema.safeParse(readBody(req) ?? {});
  if (!request.success) return invalidBody(res);
  const encryptedToken = parseCookies(req).get(githubTokenCookie);
  const token = openToken(encryptedToken);
  if (!token) return sendJson(res, 401, { error: "Connect your GitHub account before importing projects." });

  try {
    const [userResponse, reposResponse, pinnedResponse] = await Promise.all([
      githubJson("https://api.github.com/user", token),
      githubJson("https://api.github.com/user/repos?visibility=public&affiliation=owner&sort=pushed&per_page=100", token),
      fetchWithTimeout("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          query: "query { viewer { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name nameWithOwner description stargazerCount forkCount primaryLanguage { name } url homepageUrl isFork pushedAt repositoryTopics(first: 10) { nodes { topic { name } } } } } } } }",
        }),
      }),
    ]);
    if (!userResponse.ok || !reposResponse.ok) {
      const failed = !userResponse.ok ? userResponse : reposResponse;
      if (failed.status === 401) return sendJson(res, 401, { error: "GitHub authorization expired. Connect again to continue." });
      if (failed.status === 403 || failed.status === 429) return sendJson(res, 429, { error: "GitHub API rate limit reached. Try again later." });
      return sendJson(res, 502, { error: `GitHub returned an error (${failed.status}).` });
    }
    const [rawUser, rawRepos] = await Promise.all([
      readJsonLimited(userResponse, 256 * 1024),
      readJsonLimited(reposResponse, 2 * 1024 * 1024),
    ]);
    const user = userSchema.safeParse(rawUser);
    if (!user.success || !Array.isArray(rawRepos)) return sendJson(res, 502, { error: "GitHub returned profile data in an unexpected format." });
    const repositories = rawRepos.flatMap((raw) => {
      const parsed = repositorySchema.safeParse(raw);
      if (!parsed.success || (!request.data.includeForks && parsed.data.fork)) return [];
      return [parsed.data];
    });
    const pinnedResult = pinnedResponse.ok
      ? pinnedSchema.safeParse(await readJsonLimited(pinnedResponse, 1024 * 1024))
      : null;
    const pinnedRepositories = pinnedResult?.success
      ? pinnedResult.data.data.viewer.pinnedItems.nodes
          .filter((repository) => !repository.isFork)
          .map((repository) => ({
            name: repository.name,
            description: repository.description,
            stargazers_count: repository.stargazerCount,
            forks_count: repository.forkCount,
            language: repository.primaryLanguage?.name ?? null,
            html_url: repository.url,
            homepage: repository.homepageUrl,
            fork: repository.isFork,
            pushed_at: repository.pushedAt,
            topics: repository.repositoryTopics.nodes.map((node) => node.topic.name),
          }))
      : [];
    const repositoryMap = new Map(repositories.map((repository) => [repository.html_url, repository]));
    const pinnedUrls = new Set(pinnedRepositories.map((repository) => repository.html_url));
    for (const repository of pinnedRepositories) repositoryMap.set(repository.html_url, repository);
    const candidates = [...repositoryMap.values()];
    const preliminary = candidates
      .map((repository) => ({
        repository,
        pinned: pinnedUrls.has(repository.html_url),
        score: scoreRepository({
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          pushedAt: repository.pushed_at,
          homepage: repository.homepage,
          hasReadme: false,
        }),
      }))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.score - a.score)
      .slice(0, 7);

    let readmeFailures = 0;
    const enriched = await Promise.all(preliminary.map(async ({ repository, pinned }) => {
      let readmeDescription = "";
      try {
        const response = await githubJson(
          `https://api.github.com/repos/${encodeURIComponent(user.data.login)}/${encodeURIComponent(repository.name)}/readme`,
          token,
        );
        if (response.ok) {
          const readme = z.object({ content: z.string(), encoding: z.literal("base64") }).safeParse(await readJsonLimited(response, 1400 * 1024));
          if (readme.success) {
            readmeDescription = parseReadmeDescription(Buffer.from(readme.data.content.replace(/\s/g, ""), "base64").toString("utf8"));
          } else {
            readmeFailures += 1;
          }
        } else if (response.status === 403 || response.status === 429) {
          throw new Error("GitHub API rate limit reached while reading repository metadata.");
        } else if (response.status !== 404) {
          readmeFailures += 1;
        }
      } catch (reason) {
        if (reason instanceof Error && reason.message.includes("rate limit")) throw reason;
        readmeFailures += 1;
      }
      const githubUrl = safeHttpsUrl(repository.html_url);
      if (!githubUrl || !githubUrl.startsWith("https://github.com/")) return null;
      const liveUrl = safeHttpsUrl(repository.homepage ?? undefined);
      return {
        title: cleanText(repository.name, 300),
        description: cleanText(repository.description, 5_000) || readmeDescription,
        techStack: [cleanText(repository.language, 100), ...repository.topics.map((topic) => cleanText(topic, 100))].filter(Boolean).slice(0, 20),
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        pinned,
        liveUrl,
        githubUrl,
        score: scoreRepository({
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          pushedAt: repository.pushed_at,
          homepage: repository.homepage,
          hasReadme: Boolean(readmeDescription),
        }),
      };
    }));
    const projects = enriched.filter((project): project is NonNullable<typeof project> => project !== null)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.score - a.score)
      .slice(0, 3);
    const notices = [
      !pinnedResult?.success ? "Pinned repositories were unavailable; the highest-scoring owned repositories are shown instead." : "",
      readmeFailures ? "Some README descriptions were unavailable; repository descriptions and topics were used where possible." : "",
    ].filter(Boolean);
    sendJson(res, 200, {
      personal: {
        name: cleanText(user.data.name, 200) || user.data.login,
        email: cleanText(user.data.email, 320),
        title: "",
        avatar: safeHttpsUrl(user.data.avatar_url) ?? "",
        location: cleanText(user.data.location, 300),
        bio: cleanText(user.data.bio, 5_000),
        github: `https://github.com/${user.data.login}`,
        linkedInUrl: undefined,
      },
      projects,
      experience: [],
      skills: [...new Set(projects.flatMap((project) => project.techStack))].slice(0, 30),
      notice: notices.join(" "),
    });
  } catch (reason) {
    if (reason instanceof Error && reason.name === "AbortError") {
      return sendJson(res, 504, { error: "GitHub took too long to respond. Try again." });
    }
    if (reason instanceof Error && reason.message.toLowerCase().includes("rate limit")) {
      return sendJson(res, 429, { error: reason.message });
    }
    sendJson(res, 502, { error: reason instanceof Error ? reason.message : "Could not fetch GitHub profile data." });
  }
}
