import test from "node:test";
import assert from "node:assert/strict";
import { findTemplate, templates } from "../src/templates.ts";

test("template gallery contains fifty distinct designs across professional categories", () => {
  assert.equal(templates.length, 50);
  assert.equal(new Set(templates.map((template) => template.id)).size, templates.length);
  assert.equal(new Set(templates.map((template) => template.name)).size, templates.length);
  assert.ok(templates.every((template) => template.description && template.bestFor && template.voice));
  assert.ok(new Set(templates.map((template) => template.layout)).size >= 25);
  assert.equal(templates.filter((template) => template.category === "Healthcare").length, 6);
});

test("saved template IDs from the previous gallery map to a suitable replacement", () => {
  assert.equal(findTemplate("minimal-4")?.id, "silicon-valley-minimalist");
  assert.equal(findTemplate("developer-7")?.id, "dark-neomorphic-ide");
  assert.equal(findTemplate("academic-2")?.id, "clinical-researcher-standard");
  assert.equal(findTemplate("modern-aurora-kinetic")?.id, "glassmorphism-portfolio");
  assert.equal(findTemplate("classic-standard")?.id, "silicon-valley-minimalist");
  assert.equal(findTemplate("unknown-template"), undefined);
});
