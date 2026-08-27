import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [html, css, app, workflow] = await Promise.all([
  read("index.html"), read("styles.css"), read("app.js"), read(".github/workflows/pages.yml")
]);

test("page uses a phone viewport and relative project-path assets", () => {
  assert.match(html, /name="viewport"[^>]+width=device-width/);
  for (const asset of ["styles.css", "manifest.webmanifest", "app.js"]) assert.match(html, new RegExp(`["']${asset.replace(".", "\\.")}["']`));
  assert.doesNotMatch(html, /(?:src|href)=["']\/(?!\/)/);
  assert.match(app, /fetch\("data\.json"/);
  assert.match(app, /fetch\("pvpoke\.json"/);
});

test("all required filter controls and reset affordance are present", () => {
  for (const filter of ["today", "all", "great", "ultra", "master", "available", "raids", "types"]) assert.match(html, new RegExp(`data-filter="${filter}"`));
  assert.match(html, /id="reset"/);
  assert.match(html, /id="clear-search"/);
});

test("responsive card layouts include mobile, tablet, and desktop treatments", () => {
  assert.match(css, /\.card-grid\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /@media \(min-width: 46rem\)/);
  assert.match(css, /@media \(min-width: 68rem\)/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /\.today-dashboard/);
  assert.match(css, /\.opportunity-grid/);
});

test("the homepage includes proactive Today guidance", () => {
  assert.match(app, /What to do today/);
  assert.match(app, /Catch these first/);
  assert.match(app, /Raids worth checking/);
  assert.match(app, /Starting soon/);
});

test("search distinguishes recommendations and exposes all four ranking roles", () => {
  assert.match(app, /Catch for PvP/);
  assert.match(app, /Don’t catch for PvP/);
  for (const role of ["Overall", "Lead", "Switch", "Closer"]) assert.match(app, new RegExp(role));
});

test("type reference includes all three requested matchup views", () => {
  assert.match(app, /Super effective against/);
  assert.match(app, /Weak to/);
  assert.match(app, /Resists/);
  assert.match(css, /\.type-chart/);
});

test("load failures show a user-facing message", () => {
  assert.match(app, /We couldn’t load the catch list/);
  assert.match(app, /List unavailable/);
});

test("GitHub Pages deploy waits for validation", () => {
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /needs: test/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
