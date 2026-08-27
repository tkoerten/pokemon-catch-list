export const LEAGUES = ["great", "ultra", "master"];

export function normalizeSearch(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function isAvailabilityActive(item, now = new Date()) {
  if (!item) return false;
  const instant = now.getTime();
  const starts = item.start ? new Date(item.start).getTime() : Number.NEGATIVE_INFINITY;
  const ends = item.end ? new Date(item.end).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(starts) || Number.isFinite(ends) || item.ongoing === true
    ? instant >= starts && instant <= ends
    : false;
}

export function activeAvailability(record, now = new Date()) {
  return (record.availability || []).filter((item) => isAvailabilityActive(item, now));
}

export function upcomingAvailability(record, now = new Date(), withinDays = 7) {
  const nowTime = now.getTime();
  const cutoff = nowTime + withinDays * 24 * 60 * 60 * 1000;
  return (record.availability || []).filter((item) => {
    if (!item.start || item.ongoing) return false;
    const starts = new Date(item.start).getTime();
    return Number.isFinite(starts) && starts > nowTime && starts <= cutoff;
  });
}

export function matchesQuery(record, query) {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return [record.catchTarget, ...(record.searchAliases || [])]
    .some((alias) => normalizeSearch(alias).includes(needle));
}

export function filterRecords(records, { query = "", filter = "all", now = new Date() } = {}) {
  return records
    .filter((record) => matchesQuery(record, query))
    .filter((record) => {
      if (LEAGUES.includes(filter)) return record.leagues?.[filter] === true;
      if (filter === "available") return activeAvailability(record, now).length > 0;
      return true;
    })
    .sort((a, b) => a.catchTarget.localeCompare(b.catchTarget, "en", { sensitivity: "base" }));
}

export function priorityFor(record) {
  const ranks = (record.rankings || []).map((entry) => entry.rank).filter(Number.isFinite);
  if (!ranks.length) return null;
  return Math.min(...ranks) <= 20 ? "High priority" : "Useful";
}

export function bestRankFor(record) {
  return [...(record.rankings || [])].sort((a, b) => a.rank - b.rank)[0] || null;
}

export function parseUrlState(search = "") {
  const params = new URLSearchParams(search);
  const filter = params.get("filter") || params.get("league") || "today";
  return {
    query: params.get("q") || "",
    filter: ["today", "all", "great", "ultra", "master", "available", "raids"].includes(filter) ? filter : "today"
  };
}

export function stateToSearch({ query = "", filter = "today" }) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (filter !== "today") params.set(filter === "great" || filter === "ultra" || filter === "master" ? "league" : "filter", filter);
  const value = params.toString();
  return value ? `?${value}` : "";
}
