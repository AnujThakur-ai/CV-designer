import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setSecurityHeaders } from "../lib/http.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fakeResponse() {
  const headers = new Map();
  return {
    headers,
    statusCode: 200,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    getHeader(name) { return headers.get(name.toLowerCase()); },
    end() {},
  };
}

test("Multi-page calculation computes full A4 pages without leaving trailing blank half-pages", () => {
  const mmInPx = 96 / 25.4;
  const a4HeightPx = 297 * mmInPx; // ~1122.52px

  function calculatePrintPages(contentHeightPx) {
    return Math.max(1, Math.ceil((contentHeightPx - 14) / a4HeightPx));
  }

  // 1-page tests
  assert.equal(calculatePrintPages(500), 1);
  assert.equal(calculatePrintPages(1100), 1);
  assert.equal(calculatePrintPages(1122), 1);

  // 2-page tests (content spills past 1st page)
  assert.equal(calculatePrintPages(1150), 2);
  assert.equal(calculatePrintPages(1800), 2);
  assert.equal(calculatePrintPages(2230), 2);

  // 3-page tests
  assert.equal(calculatePrintPages(2300), 3);
  assert.equal(calculatePrintPages(3200), 3);
});

test("CSS print styles enforce full-page coverage, continuous sidebar, and page break prevention", () => {
  const css = fs.readFileSync(path.join(__dirname, "../src/styles.css"), "utf8");

  // Multi-page template coverage
  assert.ok(
    css.includes("min-height: calc(var(--print-pages, 1) * 297mm)"),
    "resume-paper must calculate height in full multiples of 297mm",
  );
  assert.ok(
    css.includes("background: var(--template-bg, #ffffff) !important"),
    "print body must use the active template background",
  );
  assert.ok(
    css.includes("overflow: visible !important"),
    "resume-paper must have overflow visible in print to prevent clipping",
  );

  // Continuous sidebar
  assert.ok(
    css.includes("background-image: linear-gradient("),
    "split-layout must use a linear gradient column for continuous sidebar",
  );
  assert.ok(
    css.includes(".split-layout .resume-sidebar {\n    background: transparent !important"),
    "split-layout sidebar element must be transparent so gradient column shines through",
  );

  // Heading orphan and entry clipping avoidance
  assert.ok(
    css.includes(".resume-section h3,\n  .resume-header,\n  .entry-heading,\n  .project-title"),
    "headings must be protected from page break separation",
  );
  assert.ok(
    css.includes("break-after: avoid !important"),
    "headings must have break-after avoid",
  );
  assert.ok(
    css.includes(".resume-entry,\n  .resume-project,"),
    "entries must have break-inside avoid",
  );
  assert.ok(
    css.includes("break-inside: avoid !important"),
    "cards and entries must avoid break-inside",
  );
});

test("Dark and colored templates define their background variables for print", () => {
  const css = fs.readFileSync(path.join(__dirname, "../src/styles.css"), "utf8");

  assert.ok(css.includes(".layout-terminal {") && css.includes("--template-bg: #0a0e14;"));
  assert.ok(css.includes(".layout-ide {") && css.includes("--template-bg: #1b1b2b;"));
  assert.ok(css.includes(".layout-boardroom {") && css.includes("--template-bg: #faf8f4;"));
  assert.ok(css.includes(".layout-bento {") && css.includes("--template-bg: #0d1117;"));
  assert.ok(css.includes(".layout-founder {") && css.includes("--template-bg: #fffdfa;"));
});

test("Content Security Policy is set on HTML head and API responses", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.ok(
    html.includes('http-equiv="Content-Security-Policy"'),
    "index.html must include CSP meta tag",
  );
  assert.ok(
    html.includes("default-src 'self'"),
    "CSP must define default-src 'self'",
  );

  const res = fakeResponse();
  setSecurityHeaders(res);
  assert.ok(
    res.headers.get("content-security-policy")?.includes("default-src 'self'"),
    "API responses must include Content-Security-Policy header",
  );
});
