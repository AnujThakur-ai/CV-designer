import assert from "node:assert/strict";
import test from "node:test";
import { addUniqueSkills, getSkillBrands, splitSkillInput } from "../src/skills.ts";

test("skill brands recognize common tools and combined skills", () => {
  assert.deepEqual(getSkillBrands("React & TypeScript"), ["react", "typescript"]);
  assert.deepEqual(getSkillBrands("GitHub"), ["github"]);
  assert.deepEqual(getSkillBrands("Custom skill"), []);
});

test("comma-separated skill entry preserves the unfinished value while committing completed skills", () => {
  assert.deepEqual(splitSkillInput("React, TypeScript"), {
    skills: ["React"],
    draft: " TypeScript",
  });
  assert.deepEqual(splitSkillInput("Figma"), { skills: [], draft: "Figma" });
});

test("adding skills trims values and avoids case-insensitive duplicates", () => {
  assert.deepEqual(addUniqueSkills(["React", "Figma"], [" react ", "TypeScript", ""]), [
    "React",
    "Figma",
    "TypeScript",
  ]);
});
