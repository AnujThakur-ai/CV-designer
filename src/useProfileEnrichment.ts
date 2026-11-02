import { useState } from "react";
import { UnifiedCVSchema } from "../lib/normalizer";
import type { UnifiedCVData } from "../lib/normalizer";
import { parseLinkedInFile } from "./normalizer";
import { normalizePublicGitHubProfile, parseGitHubUsername } from "./profile-import";

export type EnrichedProfile = UnifiedCVData & {
  notice?: string;
};

async function requestProfile(endpoint: string, body: unknown): Promise<EnrichedProfile> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the profile service. Run the app with `vercel dev`.");
  }
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof result === "object" && result !== null && "error" in result &&
      typeof result.error === "string" ? result.error : `Profile import failed (${response.status}).`;
    throw new Error(message);
  }
  const profile = UnifiedCVSchema.safeParse(result);
  if (!profile.success) throw new Error("The profile service returned invalid data.");
  return profile.data;
}

export function useProfileEnrichment() {
  const [profile, setProfile] = useState<EnrichedProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchGitHub(includeForks = false) {
    setLoading(true);
    setError(null);
    try {
      const result = await requestProfile("/api/fetch-github", { includeForks });
      setProfile((current) => current ? {
        ...current,
        ...result,
        personal: { ...current.personal, ...result.personal },
        projects: result.projects,
        experience: current.experience,
        skills: [...new Set([...current.skills, ...result.skills])],
      } : result);
      return result;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not fetch the GitHub profile.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function fetchPublicGitHub(value: string) {
    setLoading(true);
    setError(null);
    try {
      const username = parseGitHubUsername(value);
      const signal = AbortSignal.timeout(12_000);
      const [userResponse, repositoriesResponse] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
          headers: { Accept: "application/vnd.github+json" },
          signal,
        }),
        fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=100`, {
          headers: { Accept: "application/vnd.github+json" },
          signal,
        }),
      ]);
      if (userResponse.status === 404 || repositoriesResponse.status === 404) {
        throw new Error("That GitHub profile could not be found.");
      }
      if (userResponse.status === 403 || userResponse.status === 429 ||
        repositoriesResponse.status === 403 || repositoriesResponse.status === 429) {
        throw new Error("GitHub's public API rate limit was reached. Try again later or connect with OAuth.");
      }
      if (!userResponse.ok || !repositoriesResponse.ok) {
        throw new Error("GitHub could not return this public profile. Try again.");
      }
      const [user, repositories]: [unknown, unknown] = await Promise.all([
        userResponse.json(),
        repositoriesResponse.json(),
      ]);
      const result = normalizePublicGitHubProfile(user, repositories);
      setProfile((current) => current ? {
        ...current,
        ...result,
        personal: { ...current.personal, ...result.personal },
        projects: result.projects,
        experience: current.experience,
        skills: [...new Set([...current.skills, ...result.skills])],
      } : result);
      return result;
    } catch (reason) {
      const message = reason instanceof Error && (reason.name === "TimeoutError" || reason.name === "AbortError")
        ? "GitHub took too long to respond. Try again."
        : reason instanceof Error ? reason.message : "Could not import that GitHub profile.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function fetchLinkedIn() {
    setLoading(true);
    setError(null);
    try {
      const result = await requestProfile("/api/fetch-linkedin", {});
      setProfile((current) => current ? {
        ...current,
        ...result,
        personal: { ...current.personal, ...result.personal },
        projects: result.projects.length ? result.projects : current.projects,
        experience: result.experience.length ? result.experience : current.experience,
        skills: [...new Set([...current.skills, ...result.skills])],
      } : result);
      return result;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not fetch the LinkedIn profile.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function importLinkedInFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const result = await parseLinkedInFile(file);
      setProfile((current) => current ? {
        ...current,
        ...result,
        personal: { ...current.personal, ...result.personal },
        experience: result.experience.length ? result.experience : current.experience,
        projects: result.projects.length ? result.projects : current.projects,
        skills: [...new Set([...current.skills, ...result.skills])],
      } : result);
      return result;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not read the LinkedIn profile file.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function generateSummary(text: string): Promise<string | null> {
    setGeneratingSummary(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-summary", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string" ? result.error : `Summary generation failed (${response.status}).`;
        throw new Error(message);
      }
      if (typeof result !== "object" || result === null || !("summary" in result) || typeof result.summary !== "string") {
        throw new Error("The summary service returned invalid data.");
      }
      return result.summary;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not generate an AI summary.");
      return null;
    } finally {
      setGeneratingSummary(false);
    }
  }

  function parseLinkedIn(input: string) {
    const value = input.trim();
    if (!value) {
      setError("Paste a LinkedIn profile URL to add it to your resume.");
      return null;
    }
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (
        !/^https?:$/.test(url.protocol) ||
        !/(^|\.)linkedin\.com$/i.test(url.hostname) ||
        !/^\/(?:in|pub)\/[^/]+\/?$/i.test(url.pathname)
      ) throw new Error();
      const canonical = `https://www.linkedin.com${url.pathname}`;
      setProfile((current) => current ? {
        ...current,
        personal: { ...current.personal, linkedInUrl: canonical },
      } : {
        personal: {
          name: "", title: "", email: "", avatar: "", location: "", bio: "",
          linkedInUrl: canonical,
        },
        experience: [],
        projects: [],
        skills: [],
      });
      setError(null);
      return { linkedInUrl: canonical };
    } catch {
      setError("Enter a valid linkedin.com profile URL.");
      return null;
    }
  }

  return {
    profile,
    loading,
    generatingSummary,
    error,
    fetchGitHub,
    fetchPublicGitHub,
    fetchLinkedIn,
    importLinkedInFile,
    generateSummary,
    parseLinkedIn,
    setProfile,
    clearError: () => setError(null),
  };
}
