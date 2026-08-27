import { readFile, writeFile } from "node:fs/promises";
import { normalizeSearch } from "../core.js";

const dataUrl = new URL("../data.json", import.meta.url);
const reportUrl = new URL("../refresh-report.json", import.meta.url);
const data = JSON.parse(await readFile(dataUrl, "utf8"));
const applyFlags = process.argv.includes("--apply-flags");
const leagues = { great: 1500, ultra: 2500, master: 10000 };
const categories = ["overall", "leads", "switches", "closers"];
const sourceRoot = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all";
const records = [...data.families, ...data.raids];

const keyFor = (value) => normalizeSearch(value)
  .replace(/\bforme?\b/g, "")
  .split(" ")
  .filter(Boolean)
  .sort()
  .join(" ");
const withoutShadow = (value) => value.replace(/\s*\(shadow\)\s*/i, "").replace(/^shadow\s+/i, "");
const aliasIndex = new Map();

for (const record of records) {
  for (const alias of [record.catchTarget, ...record.searchAliases]) {
    const key = keyFor(alias);
    if (!aliasIndex.has(key)) aliasIndex.set(key, []);
    if (!aliasIndex.get(key).includes(record)) aliasIndex.get(key).push(record);
  }
  record.rankings = [];
}

const unmatched = new Set();
let attached = 0;
for (const [league, cp] of Object.entries(leagues)) {
  for (const category of categories) {
    const url = `${sourceRoot}/${category}/rankings-${cp}.json`;
    const response = await fetch(url, { headers: { "user-agent": "pokemon-catch-list-refresh/1.0" } });
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    const ranking = await response.json();
    ranking.slice(0, 75).forEach((entry, index) => {
      const candidates = aliasIndex.get(keyFor(withoutShadow(entry.speciesName))) || [];
      if (candidates.length !== 1) {
        unmatched.add(entry.speciesName);
        return;
      }
      const record = candidates[0];
      record.rankings.push({ league, category, rank: index + 1, pokemon: entry.speciesName, speciesId: entry.speciesId });
      if (!record.searchAliases.includes(entry.speciesName)) record.searchAliases.push(entry.speciesName);
      if (applyFlags) record.leagues[league] = true;
      attached += 1;
    });
  }
}

data.meta.updated = new Date().toISOString().slice(0, 10);
data.meta.rankingSnapshotDate = data.meta.updated;
data.meta.note = `PvPoke Open League top 75 snapshot attached for Overall, Leads, Switches, and Closers.${applyFlags ? " League flags were expanded from the snapshot." : " Baseline league flags were preserved."}`;
await writeFile(dataUrl, `${JSON.stringify(data, null, 2)}\n`, "utf8");
const report = {
  generatedAt: new Date().toISOString(),
  source: sourceRoot,
  leagues: Object.keys(leagues),
  categories,
  topPerCategory: 75,
  attachedRankEntries: attached,
  unmatchedRankedForms: [...unmatched].sort((a, b) => a.localeCompare(b)),
  condensedRecordsWithoutRanks: records.filter((record) => !record.rankings.length).map((record) => record.catchTarget).sort((a, b) => a.localeCompare(b))
};
await writeFile(reportUrl, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Attached ${attached} ranking entries. ${unmatched.size} ranked forms were outside or ambiguous in the condensed family map.`);
if (unmatched.size) console.log(`Examples not mapped: ${[...unmatched].slice(0, 15).join(", ")}`);
