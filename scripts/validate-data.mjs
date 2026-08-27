import { readFile } from "node:fs/promises";
import { normalizeSearch } from "../core.js";

const data = JSON.parse(await readFile(new URL("../data.json", import.meta.url), "utf8"));
const reference = JSON.parse(await readFile(new URL("../pvpoke.json", import.meta.url), "utf8"));
const refreshReport = JSON.parse(await readFile(new URL("../refresh-report.json", import.meta.url), "utf8"));
const errors = [];
const validLeagues = new Set(["great", "ultra", "master"]);
const validCategories = new Set(["overall", "leads", "switches", "closers"]);

function validateList(records, label) {
  const names = new Set();
  records.forEach((record, index) => {
    const path = `${label}[${index}]`;
    if (!record.catchTarget) errors.push(`${path}: catchTarget is required`);
    const key = normalizeSearch(record.catchTarget);
    if (names.has(key)) errors.push(`${path}: duplicate catch target ${record.catchTarget}`);
    names.add(key);
    if (!Array.isArray(record.searchAliases) || !record.searchAliases.length) errors.push(`${path}: searchAliases must not be empty`);
    if (!record.searchAliases?.some((alias) => normalizeSearch(alias) === key)) errors.push(`${path}: aliases must contain the catch target`);
    for (const league of ["great", "ultra", "master"]) {
      if (typeof record.leagues?.[league] !== "boolean") errors.push(`${path}: leagues.${league} must be boolean`);
    }
    (record.rankings || []).forEach((rank, rankIndex) => {
      const rankPath = `${path}.rankings[${rankIndex}]`;
      if (!validLeagues.has(rank.league)) errors.push(`${rankPath}: invalid league`);
      if (!validCategories.has(rank.category)) errors.push(`${rankPath}: invalid category`);
      if (!Number.isInteger(rank.rank) || rank.rank < 1 || rank.rank > 75) errors.push(`${rankPath}: rank must be an integer from 1 to 75`);
      if (validLeagues.has(rank.league) && record.leagues?.[rank.league] !== true) errors.push(`${rankPath}: ranking exists but league flag is false`);
    });
    (record.availability || []).forEach((item, itemIndex) => {
      const itemPath = `${path}.availability[${itemIndex}]`;
      if (!item.label || !item.source || !item.sourceUrl || !item.lastChecked) errors.push(`${itemPath}: label, source, sourceUrl, and lastChecked are required`);
      for (const field of ["start", "end", "lastChecked"]) {
        if (item[field] && Number.isNaN(new Date(item[field]).getTime())) errors.push(`${itemPath}: ${field} is not a valid date`);
      }
      if (item.start && item.end && new Date(item.start) > new Date(item.end)) errors.push(`${itemPath}: start is after end`);
    });
  });
  const sorted = [...records].sort((a, b) => a.catchTarget.localeCompare(b.catchTarget, "en", { sensitivity: "base" }));
  if (records.some((record, index) => record.catchTarget !== sorted[index].catchTarget)) errors.push(`${label}: list is not alphabetical by catchTarget`);
}

validateList(data.families, "families");
validateList(data.raids, "raids");
if (!data.meta?.updated || Number.isNaN(new Date(data.meta.updated).getTime())) errors.push("meta.updated must be a valid date");
if (!Array.isArray(refreshReport.unmatchedRankedForms)) errors.push("refresh-report.json must contain unmatchedRankedForms");
if (!Array.isArray(refreshReport.condensedRecordsWithoutRanks)) errors.push("refresh-report.json must contain condensedRecordsWithoutRanks");
if (!Array.isArray(reference.pokemon) || reference.pokemon.length < 1000) errors.push("pvpoke.json must contain the full released Pokémon reference");
const speciesIds = new Set();
for (const [index, pokemon] of (reference.pokemon || []).entries()) {
  const path = `pvpoke.pokemon[${index}]`;
  if (!pokemon.speciesId || !pokemon.speciesName || !pokemon.familyKey) errors.push(`${path}: speciesId, speciesName, and familyKey are required`);
  if (speciesIds.has(pokemon.speciesId)) errors.push(`${path}: duplicate speciesId ${pokemon.speciesId}`);
  speciesIds.add(pokemon.speciesId);
  if (!Array.isArray(pokemon.familyAliases) || !pokemon.familyAliases.length) errors.push(`${path}: familyAliases must not be empty`);
  for (const [league, categories] of Object.entries(pokemon.rankings || {})) {
    if (!validLeagues.has(league)) errors.push(`${path}: invalid reference league ${league}`);
    for (const [category, result] of Object.entries(categories || {})) {
      if (!validCategories.has(category)) errors.push(`${path}: invalid reference category ${category}`);
      if (!Number.isInteger(result.rank) || result.rank < 1) errors.push(`${path}: reference rank must be a positive integer`);
      if (!Number.isFinite(result.score) || result.score < 0 || result.score > 100) errors.push(`${path}: reference score must be from 0 to 100`);
    }
  }
}
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  const ranks = [...data.families, ...data.raids].reduce((total, record) => total + record.rankings.length, 0);
  console.log(`Validated ${data.families.length} catch families, ${data.raids.length} raid targets, ${ranks} recommended rank entries, and ${reference.pokemon.length} full-reference Pokémon.`);
}
