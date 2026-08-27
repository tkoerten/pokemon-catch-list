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
});

test("all required filter controls and reset affordance are present", () => {
  for (const filter of ["all", "great", "ultra", "master", "available", "raids"]) assert.match(html, new RegExp(`data-filter="${filter}"`));
  assert.match(html, /id="reset"/);
  assert.match(html, /id="clear-search"/);
});

test("responsive card layouts include mobile, tablet, and desktop treatments", () => {
  assert.match(css, /\.card-grid\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /@media \(min-width: 46rem\)/);
  assert.match(css, /@media \(min-width: 68rem\)/);
  assert.match(css, /overflow-x:\s*auto/);
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
