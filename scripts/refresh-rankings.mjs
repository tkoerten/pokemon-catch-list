import { readFile, writeFile } from "node:fs/promises";
import { normalizeSearch } from "../core.js";

const dataUrl = new URL("../data.json", import.meta.url);
const referenceUrl = new URL("../pvpoke.json", import.meta.url);
const reportUrl = new URL("../refresh-report.json", import.meta.url);
const data = JSON.parse(await readFile(dataUrl, "utf8"));
const applyFlags = process.argv.includes("--apply-flags");
const leagues = { great: 1500, ultra: 2500, master: 10000 };
const categories = ["overall", "leads", "switches", "closers"];
const sourceRoot = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all";
const pokemonUrl = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster/pokemon.json";
const records = [...data.families, ...data.raids];

const keyFor = (value) => normalizeSearch(value)
  .replace(/\bforme?\b/g, "")
  .split(" ")
  .filter(Boolean)
  .sort()
  .join(" ");
const withoutShadow = (value) => value.replace(/\s*\(shadow\)\s*/i, "").replace(/^shadow\s+/i, "");
const regionalSuffix = (speciesId) => ["alolan", "galarian", "hisuian", "paldean"]
  .find((region) => speciesId.includes(`_${region}`));
const familyKeyFor = (pokemon) => `${pokemon.family?.id || `SPECIES_${pokemon.dex}`}${regionalSuffix(pokemon.speciesId) ? `_${regionalSuffix(pokemon.speciesId).toUpperCase()}` : ""}`;

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "user-agent": "pokemon-catch-list-refresh/2.0" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
}

const aliasIndex = new Map();
for (const record of records) {
  for (const alias of [record.catchTarget, ...record.searchAliases]) {
    const key = keyFor(alias);
    if (!aliasIndex.has(key)) aliasIndex.set(key, []);
    if (!aliasIndex.get(key).includes(record)) aliasIndex.get(key).push(record);
  }
  record.rankings = [];
}

const gamemaster = await fetchJson(pokemonUrl);
const pokemon = gamemaster
  .filter((entry) => entry.released !== false)
  .map((entry) => ({
    speciesId: entry.speciesId,
    speciesName: entry.speciesName,
    dex: entry.dex,
    types: (entry.types || []).filter((type) => type && type !== "none"),
    familyKey: familyKeyFor(entry),
    rankings: {}
  }));
const pokemonById = new Map(pokemon.map((entry) => [entry.speciesId, entry]));
const familyNames = new Map();
for (const entry of pokemon) {
  if (!familyNames.has(entry.familyKey)) familyNames.set(entry.familyKey, new Set());
  familyNames.get(entry.familyKey).add(entry.speciesName);
}
for (const entry of pokemon) entry.familyAliases = [...familyNames.get(entry.familyKey)].sort((a, b) => a.localeCompare(b));

const unmatched = new Set();
let attached = 0;
let fullRankEntries = 0;
for (const [league, cp] of Object.entries(leagues)) {
  for (const category of categories) {
    const url = `${sourceRoot}/${category}/rankings-${cp}.json`;
    const ranking = await fetchJson(url);
    ranking.forEach((entry, index) => {
      const reference = pokemonById.get(entry.speciesId);
      if (reference) {
        reference.rankings[league] ||= {};
        reference.rankings[league][category] = { rank: index + 1, score: entry.score };
        fullRankEntries += 1;
      }

      if (index >= 75) return;
      const candidates = aliasIndex.get(keyFor(withoutShadow(entry.speciesName))) || [];
      if (candidates.length !== 1) {
        unmatched.add(entry.speciesName);
        return;
      }
      const record = candidates[0];
      record.rankings.push({ league, category, rank: index + 1, score: entry.score, pokemon: entry.speciesName, speciesId: entry.speciesId });
      if (!record.searchAliases.includes(entry.speciesName)) record.searchAliases.push(entry.speciesName);
      if (applyFlags) record.leagues[league] = true;
      attached += 1;
    });
  }
}

const snapshotDate = new Date().toISOString().slice(0, 10);
data.meta.updated = snapshotDate;
data.meta.rankingSnapshotDate = snapshotDate;
data.meta.note = `PvPoke Open League full rankings power search; recommendations use only the reviewed top 75 in Overall, Leads, Switches, and Closers.${applyFlags ? " League flags were expanded from the top-75 snapshot." : " Baseline league flags were preserved."}`;
await writeFile(dataUrl, `${JSON.stringify(data, null, 2)}\n`, "utf8");

const reference = {
  meta: {
    updated: snapshotDate,
    source: "PvPoke Open League rankings and gamemaster",
    sourceUrl: "https://pvpoke.com/rankings/",
    categories,
    leagues: Object.keys(leagues),
    pokemonCount: pokemon.length,
    rankingCount: fullRankEntries
  },
  pokemon: pokemon.sort((a, b) => a.dex - b.dex || a.speciesName.localeCompare(b.speciesName))
};
await writeFile(referenceUrl, `${JSON.stringify(reference)}\n`, "utf8");

const report = {
  generatedAt: new Date().toISOString(),
  source: sourceRoot,
  leagues: Object.keys(leagues),
  categories,
  topPerCategory: 75,
  attachedRankEntries: attached,
  fullReferencePokemon: pokemon.length,
  fullReferenceRankEntries: fullRankEntries,
  unmatchedRankedForms: [...unmatched].sort((a, b) => a.localeCompare(b)),
  condensedRecordsWithoutRanks: records.filter((record) => !record.rankings.length).map((record) => record.catchTarget).sort((a, b) => a.localeCompare(b))
};
await writeFile(reportUrl, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Attached ${attached} recommended ranking entries and wrote ${fullRankEntries} full reference entries for ${pokemon.length} Pokémon.`);
if (unmatched.size) console.log(`Examples not mapped to recommendations: ${[...unmatched].slice(0, 15).join(", ")}`);
