import assert from "node:assert/strict";
import test from "node:test";
import { parseProfileJson } from "../src/normalizer.ts";
import { normalizePublicGitHubProfile, parseGitHubUsername } from "../src/profile-import.ts";

test("GitHub importer accepts handles and profile URLs but rejects unrelated URLs", () => {
  assert.equal(parseGitHubUsername("octocat"), "octocat");
  assert.equal(parseGitHubUsername("https://github.com/octocat/"), "octocat");
  assert.throws(() => parseGitHubUsername("https://example.com/octocat"), /GitHub username/);
  assert.throws(() => parseGitHubUsername("github.com/octocat/repo"), /GitHub username/);
});

test("public GitHub profile import ranks non-fork repositories and normalizes profile data", () => {
  const profile = normalizePublicGitHubProfile({
    login: "octocat",
    name: "The Octocat",
    bio: "Builds examples",
    location: "San Francisco",
    avatar_url: "https://avatars.githubusercontent.com/u/583231",
    html_url: "https://github.com/octocat",
  }, [
    { name: "forked", description: null, stargazers_count: 100, forks_count: 1, language: "JS", html_url: "https://github.com/octocat/forked", homepage: null, fork: true, pushed_at: null, topics: [] },
    { name: "portfolio", description: "Personal site", stargazers_count: 4, forks_count: 1, language: "TypeScript", html_url: "https://github.com/octocat/portfolio", homepage: "https://octocat.dev", fork: false, pushed_at: "2026-10-01T00:00:00Z", topics: ["portfolio"] },
  ]);
  assert.equal(profile.personal.name, "The Octocat");
  assert.equal(profile.personal.github, "https://github.com/octocat");
  assert.equal(profile.projects.length, 1);
  assert.equal(profile.projects[0].githubUrl, "https://github.com/octocat/portfolio");
  assert.equal(profile.projects[0].liveUrl, "https://octocat.dev/");
  assert.deepEqual(profile.skills, ["TypeScript", "portfolio"]);
});

test("profile JSON importer supports the app's exported resume format", () => {
  const profile = parseProfileJson({
    version: 2,
    data: {
      name: "Ada Lovelace",
      title: "Engineer",
      email: "ada@example.com",
      city: "London",
      summary: "Builds useful software",
      github: "github.com/ada",
      linkedin: "linkedin.com/in/ada",
      experiences: [{ title: "Engineer", company: "Analytical Engines", startDate: "2022", endDate: "Present", bullets: "Built a compiler\nImproved performance" }],
      projects: [{ name: "Engine", description: "A project", url: "https://github.com/ada/engine", language: "TypeScript", stars: 2 }],
      skills: ["TypeScript", "React"],
    },
  });
  assert.equal(profile.personal.name, "Ada Lovelace");
  assert.equal(profile.personal.github, "https://github.com/ada");
  assert.equal(profile.experience[0].highlights.length, 2);
  assert.equal(profile.projects[0].githubUrl, "https://github.com/ada/engine");
  assert.deepEqual(profile.skills, ["TypeScript", "React"]);
});
