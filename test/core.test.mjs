import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { filterRecords, isAvailabilityActive, matchesQuery, normalizeSearch, parseUrlState, stateToSearch } from "../core.js";

const data = JSON.parse(await readFile(new URL("../data.json", import.meta.url), "utf8"));
const expectedSearches = {
  mankey: "Mankey", primeape: "Mankey", annihilape: "Mankey",
  spheal: "Spheal", sealeo: "Spheal", walrein: "Spheal",
  piplup: "Piplup", prinplup: "Piplup", empoleon: "Piplup",
  rookidee: "Rookidee", corvisquire: "Rookidee", corviknight: "Rookidee",
  swablu: "Swablu", altaria: "Swablu", lickilicky: "Lickitung",
  quagsire: "Wooper", clodsire: "Paldean Wooper", aegislash: "Honedge",
  hydreigon: "Deino", dusknoir: "Duskull", kingdra: "Horsea"
};

test("normalization ignores case, accents, punctuation, and hyphens", () => {
  assert.equal(normalizeSearch(" Flabébé’s-Test "), "flabebes test");
  assert.equal(normalizeSearch("Jangmo-o"), "jangmo o");
});

for (const [query, catchTarget] of Object.entries(expectedSearches)) {
  test(`search ${query} finds ${catchTarget}`, () => {
    assert.ok(filterRecords(data.families, { query }).some((record) => record.catchTarget === catchTarget));
  });
}

test("Ninetales finds normal and Alolan families", () => {
  assert.deepEqual(filterRecords(data.families, { query: "ninetales" }).map((item) => item.catchTarget), ["Alolan Vulpix", "Vulpix"]);
});

test("regional families remain distinct", () => {
  assert.deepEqual(filterRecords(data.families, { query: "quagsire" }).map((item) => item.catchTarget), ["Wooper"]);
  assert.deepEqual(filterRecords(data.families, { query: "clodsire" }).map((item) => item.catchTarget), ["Paldean Wooper"]);
});

test("league filters only return matching flags", () => {
  for (const league of ["great", "ultra", "master"]) {
    const results = filterRecords(data.families, { filter: league });
    assert.ok(results.length > 0);
    assert.ok(results.every((record) => record.leagues[league]));
  }
});

test("raid form aliases find their parent target", () => {
  assert.equal(filterRecords(data.raids, { query: "dawn wings" })[0].catchTarget, "Necrozma");
  assert.equal(filterRecords(data.raids, { query: "origin forme palkia" })[0].catchTarget, "Palkia");
});

test("availability respects date windows", () => {
  assert.equal(isAvailabilityActive({ start: "2026-08-01", end: "2026-08-31T23:59:59Z" }, new Date("2026-08-27T12:00:00Z")), true);
  assert.equal(isAvailabilityActive({ start: "2026-08-01", end: "2026-08-20" }, new Date("2026-08-27T12:00:00Z")), false);
  assert.equal(isAvailabilityActive({ ongoing: true }, new Date()), true);
});

test("URL state round trips and rejects unknown filters", () => {
  const query = stateToSearch({ query: "Mankey", filter: "great" });
  assert.deepEqual(parseUrlState(query), { query: "Mankey", filter: "great" });
  assert.equal(parseUrlState("?filter=unknown").filter, "all");
});

test("substring matching is alias-aware", () => {
  const record = data.families.find((item) => item.catchTarget === "Mankey");
  assert.equal(matchesQuery(record, "nihil"), true);
});
