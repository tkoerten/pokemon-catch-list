import { LEAGUES, activeAvailability, bestRankFor, filterRecords, filterReferenceGroups, groupReferencePokemon, normalizeSearch, parseUrlState, priorityFor, recordForReferenceGroup, stateToSearch, upcomingAvailability } from "./core.js";

const elements = {
  results: document.querySelector("#results"),
  template: document.querySelector("#card-template"),
  search: document.querySelector("#search"),
  clearSearch: document.querySelector("#clear-search"),
  filters: document.querySelector("#filters"),
  reset: document.querySelector("#reset"),
  count: document.querySelector("#result-count"),
  notice: document.querySelector("#notice"),
  updated: document.querySelector("#updated"),
  viewKicker: document.querySelector("#view-kicker"),
  viewTitle: document.querySelector("#view-title")
};

const state = { ...parseUrlState(location.search), data: null, reference: null, referenceGroups: [] };
elements.search.value = state.query;

const CATEGORIES = ["overall", "leads", "switches", "closers"];
const TYPE_ATTACK = {
  Normal: { super: [], resist: ["Rock", "Steel"], strongResist: ["Ghost"] },
  Fire: { super: ["Grass", "Ice", "Bug", "Steel"], resist: ["Fire", "Water", "Rock", "Dragon"] },
  Water: { super: ["Fire", "Ground", "Rock"], resist: ["Water", "Grass", "Dragon"] },
  Electric: { super: ["Water", "Flying"], resist: ["Electric", "Grass", "Dragon"], strongResist: ["Ground"] },
  Grass: { super: ["Water", "Ground", "Rock"], resist: ["Fire", "Grass", "Poison", "Flying", "Bug", "Dragon", "Steel"] },
  Ice: { super: ["Grass", "Ground", "Flying", "Dragon"], resist: ["Fire", "Water", "Ice", "Steel"] },
  Fighting: { super: ["Normal", "Ice", "Rock", "Dark", "Steel"], resist: ["Poison", "Flying", "Psychic", "Bug", "Fairy"], strongResist: ["Ghost"] },
  Poison: { super: ["Grass", "Fairy"], resist: ["Poison", "Ground", "Rock", "Ghost"], strongResist: ["Steel"] },
  Ground: { super: ["Fire", "Electric", "Poison", "Rock", "Steel"], resist: ["Grass", "Bug"], strongResist: ["Flying"] },
  Flying: { super: ["Grass", "Fighting", "Bug"], resist: ["Electric", "Rock", "Steel"] },
  Psychic: { super: ["Fighting", "Poison"], resist: ["Psychic", "Steel"], strongResist: ["Dark"] },
  Bug: { super: ["Grass", "Psychic", "Dark"], resist: ["Fire", "Fighting", "Poison", "Flying", "Ghost", "Steel", "Fairy"] },
  Rock: { super: ["Fire", "Ice", "Flying", "Bug"], resist: ["Fighting", "Ground", "Steel"] },
  Ghost: { super: ["Psychic", "Ghost"], resist: ["Dark"], strongResist: ["Normal"] },
  Dragon: { super: ["Dragon"], resist: ["Steel"], strongResist: ["Fairy"] },
  Dark: { super: ["Psychic", "Ghost"], resist: ["Fighting", "Dark", "Fairy"] },
  Steel: { super: ["Ice", "Rock", "Fairy"], resist: ["Fire", "Water", "Electric", "Steel"] },
  Fairy: { super: ["Fighting", "Dragon", "Dark"], resist: ["Fire", "Poison", "Steel"] }
};

const formatDate = (value) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" })
  .format(new Date(`${value}T12:00:00`));
const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const shortLeague = (league) => league === "great" ? "GL" : league === "ultra" ? "UL" : "ML";

function leagueBadge(league) {
  const span = document.createElement("span");
  span.className = `badge badge-${league}`;
  span.textContent = league === "great" ? "GL" : league === "ultra" ? "UL" : "ML";
  span.title = `${titleCase(league)} League`;
  return span;
}

function hasRankings(entry) {
  return LEAGUES.some((league) => CATEGORIES.some((category) => entry.rankings?.[league]?.[category]));
}

function bestReferenceRank(entry) {
  const ranks = LEAGUES.flatMap((league) => CATEGORIES.map((category) => entry.rankings?.[league]?.[category]?.rank))
    .filter(Number.isFinite);
  return ranks.length ? Math.min(...ranks) : Number.POSITIVE_INFINITY;
}

function rankingCell(result) {
  const cell = document.createElement("td");
  if (!result) {
    cell.className = "rank-none";
    cell.textContent = "—";
    cell.title = "Not ranked in this PvPoke list";
    return cell;
  }
  const rank = document.createElement("strong");
  rank.textContent = `#${result.rank}`;
  const score = document.createElement("span");
  score.textContent = Number.isFinite(result.score) ? `${result.score.toFixed(1)}` : "";
  score.title = "PvPoke score out of 100";
  cell.append(rank, score);
  return cell;
}

function rankingMatrix(entry) {
  const section = document.createElement("section");
  section.className = "pokemon-ranking";
  const heading = document.createElement("div");
  heading.className = "pokemon-ranking-head";
  const name = document.createElement("h5");
  name.textContent = entry.speciesName;
  const types = document.createElement("span");
  types.textContent = (entry.types || []).map(titleCase).join(" / ");
  heading.append(name, types);
  section.append(heading);

  const scroll = document.createElement("div");
  scroll.className = "ranking-scroll";
  const table = document.createElement("table");
  table.className = "ranking-table";
  table.innerHTML = "<thead><tr><th>League</th><th>Overall</th><th>Lead</th><th>Switch</th><th>Closer</th></tr></thead>";
  const body = document.createElement("tbody");
  for (const league of LEAGUES) {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = shortLeague(league);
    row.append(label);
    for (const category of CATEGORIES) row.append(rankingCell(entry.rankings?.[league]?.[category]));
    body.append(row);
  }
  table.append(body);
  scroll.append(table);
  section.append(scroll);
  return section;
}

function rankingReferenceSection(groups, query = "") {
  const wrapper = document.createElement("section");
  wrapper.className = "full-rankings";
  const heading = document.createElement("h4");
  heading.textContent = "Full PvPoke role rankings";
  const help = document.createElement("p");
  help.className = "rank-help";
  help.textContent = "Rank is the list position; the smaller score beneath it is PvPoke’s 0–100 rating. Dashes mean not ranked in that list.";
  wrapper.append(heading, help);

  const needle = normalizeSearch(query);
  const all = groups.flatMap((group) => group.pokemon).filter(hasRankings);
  all.sort((a, b) => {
    const aMatch = normalizeSearch(a.speciesName).includes(needle);
    const bMatch = normalizeSearch(b.speciesName).includes(needle);
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    return bestReferenceRank(a) - bestReferenceRank(b) || a.speciesName.localeCompare(b.speciesName);
  });
  const shown = all.slice(0, 10);
  shown.forEach((entry) => wrapper.append(rankingMatrix(entry)));
  if (!shown.length) {
    const empty = document.createElement("p");
    empty.className = "no-rankings";
    empty.textContent = "PvPoke does not currently rank this family in Open Great, Ultra, or Master League.";
    wrapper.append(empty);
  } else if (all.length > shown.length) {
    const more = document.createElement("p");
    more.className = "more-rankings";
    more.textContent = `Showing the 10 closest or highest-ranked forms out of ${all.length}. Search a specific form to bring it to the top.`;
    wrapper.append(more);
  }
  return wrapper;
}

function referenceGroupsForRecord(record) {
  return state.referenceGroups.filter((group) => recordForReferenceGroup(group, [record]));
}

function buildDetail(record, referenceGroups = []) {
  const body = document.createElement("div");
  body.className = "detail-sections";
  const relevant = LEAGUES.filter((league) => record.leagues?.[league]);
  const leagueList = document.createElement("ul");
  leagueList.className = "detail-list";
  for (const league of relevant) {
    const item = document.createElement("li");
    const targets = (record.rankings || []).filter((rank) => rank.league === league);
    const names = [...new Set(targets.map((rank) => rank.pokemon))];
    item.innerHTML = `<strong>${titleCase(league)} League:</strong> ${names.length ? names.join(", ") : (record.pvpTargets || [record.catchTarget]).join(", ")}`;
    leagueList.append(item);
  }
  body.append(leagueList);

  if (referenceGroups.length) body.append(rankingReferenceSection(referenceGroups, state.query));

  if (record.rankings?.length) {
    const heading = document.createElement("h4");
    heading.textContent = "Best PvPoke ranks in this snapshot";
    body.append(heading);
    const ranks = document.createElement("ul");
    ranks.className = "rank-list";
    [...record.rankings].sort((a, b) => a.rank - b.rank).slice(0, 10).forEach((rank) => {
      const item = document.createElement("li");
      item.textContent = `${rank.pokemon} — ${titleCase(rank.league)} #${rank.rank} ${titleCase(rank.category)}`;
      ranks.append(item);
    });
    body.append(ranks);
  }

  const availability = activeAvailability(record);
  const notes = [...(record.acquisitionNotes || []), ...(record.notes || [])];
  if (availability.length || notes.length) {
    const heading = document.createElement("h4");
    heading.textContent = "Catch notes";
    body.append(heading);
    const list = document.createElement("ul");
    list.className = "detail-list";
    availability.forEach((entry) => {
      const item = document.createElement("li");
      const link = entry.sourceUrl ? ` <a href="${entry.sourceUrl}" rel="noreferrer">Source</a>` : "";
      item.innerHTML = `<strong>${entry.label}</strong>${entry.note ? ` — ${entry.note}` : ""}${link}`;
      list.append(item);
    });
    notes.forEach((note) => {
      const item = document.createElement("li");
      item.textContent = note;
      list.append(item);
    });
    body.append(list);
  }
  return body;
}

function guidanceFor(record) {
  const guidance = [];
  if (record.leagues?.great || record.leagues?.ultra) guidance.push("Check PvP IVs");
  if (record.leagues?.master) guidance.push("Keep high IV");
  if (record.leagues?.master) guidance.push("Save XL Candy");
  if ((record.rankings || []).some((rank) => /shadow/i.test(rank.pokemon))) guidance.push("Shadow matters");
  return guidance;
}

function bestReason(record) {
  const best = bestRankFor(record);
  if (!best) return "PvP-relevant family";
  return `${best.pokemon} — ${shortLeague(best.league)} #${best.rank} ${titleCase(best.category)}`;
}

function createCard(record, referenceGroups = []) {
  const card = elements.template.content.firstElementChild.cloneNode(true);
  card.dataset.id = record.id;
  card.classList.add("recommended-card");
  card.querySelector(".card-label").textContent = record.type === "raid" ? "Recommended raid target" : "Recommended catch";
  card.querySelector("h3").textContent = record.catchTarget;
  card.querySelector(".targets").textContent = (record.pvpTargets || []).join(" · ");
  card.querySelector(".decision-line").textContent = bestReason(record);

  const badgeBox = card.querySelector(".badges");
  LEAGUES.filter((league) => record.leagues?.[league]).forEach((league) => badgeBox.append(leagueBadge(league)));

  const status = card.querySelector(".availability-row");
  const priority = priorityFor(record);
  const decisionChip = document.createElement("span");
  decisionChip.className = "status-chip catch-chip";
  decisionChip.textContent = "✓ Catch for PvP";
  status.append(decisionChip);
  if (priority) {
    const priorityChip = document.createElement("span");
    priorityChip.className = `status-chip ${priority === "High priority" ? "priority-high" : ""}`;
    priorityChip.textContent = priority === "High priority" ? "★ High priority" : "Useful";
    status.append(priorityChip);
  }
  activeAvailability(record).slice(0, 2).forEach((entry) => {
    const chip = document.createElement("span");
    chip.className = "status-chip available-chip";
    chip.textContent = `🔥 ${entry.label}`;
    status.append(chip);
  });
  if (!status.childElementCount) status.remove();

  const actions = card.querySelector(".action-row");
  guidanceFor(record).slice(0, 3).forEach((label) => {
    const chip = document.createElement("span");
    chip.className = "action-chip";
    chip.textContent = label;
    actions.append(chip);
  });
  if (!actions.childElementCount) actions.remove();

  card.querySelector(".details-body").append(buildDetail(record, referenceGroups));
  if (referenceGroups.length) {
    card.querySelector("summary").firstChild.textContent = "See every role & league ";
    card.querySelector("details").open = true;
    card.querySelector("summary span").textContent = "−";
  }
  card.querySelector("details").addEventListener("toggle", (event) => {
    event.currentTarget.querySelector("summary span").textContent = event.currentTarget.open ? "−" : "＋";
  });
  return card;
}

function referenceFamilyName(group, query = "") {
  const needle = normalizeSearch(query);
  const exact = group.pokemon.find((entry) => normalizeSearch(entry.speciesName) === needle);
  const base = group.pokemon.find((entry) => !/\((Shadow|Mega|Primal)\)/i.test(entry.speciesName));
  return (exact || base || group.pokemon[0]).speciesName.replace(/\s*\(Shadow\)$/i, "");
}

function createReferenceCard(group) {
  const card = elements.template.content.firstElementChild.cloneNode(true);
  card.dataset.id = group.familyKey;
  card.classList.add("not-recommended-card");
  const name = referenceFamilyName(group, state.query);
  const ranked = group.pokemon.filter(hasRankings).sort((a, b) => bestReferenceRank(a) - bestReferenceRank(b));
  card.querySelector(".card-label").textContent = "Not on the recommended list";
  card.querySelector("h3").textContent = name;
  card.querySelector(".targets").textContent = ranked.length
    ? ranked.slice(0, 4).map((entry) => entry.speciesName).join(" · ")
    : "No Open League battle ranking";
  card.querySelector(".decision-line").textContent = "Low battle priority — spend your storage and Candy elsewhere.";

  const badgeBox = card.querySelector(".badges");
  const leagues = LEAGUES.filter((league) => ranked.some((entry) => CATEGORIES.some((category) => entry.rankings?.[league]?.[category])));
  leagues.forEach((league) => badgeBox.append(leagueBadge(league)));
  if (!leagues.length) badgeBox.remove();

  const status = card.querySelector(".availability-row");
  const decision = document.createElement("span");
  decision.className = "status-chip skip-chip";
  decision.textContent = "× Don’t catch for PvP";
  status.append(decision);
  card.querySelector(".action-row").remove();

  const details = card.querySelector("details");
  details.open = true;
  const summary = details.querySelector("summary");
  summary.firstChild.textContent = "See every role & league ";
  summary.querySelector("span").textContent = "−";
  details.querySelector(".details-body").append(rankingReferenceSection([group], state.query));
  details.addEventListener("toggle", (event) => {
    event.currentTarget.querySelector("summary span").textContent = event.currentTarget.open ? "−" : "＋";
  });
  return card;
}

function defenseFor(type) {
  const weak = [];
  const resist = [];
  for (const [attacker, values] of Object.entries(TYPE_ATTACK)) {
    if (values.super.includes(type)) weak.push(attacker);
    if (values.resist.includes(type)) resist.push({ type: attacker, multiplier: "×0.625" });
    if ((values.strongResist || []).includes(type)) resist.push({ type: attacker, multiplier: "×0.391" });
  }
  return { weak, resist };
}

function typePills(values, options = {}) {
  const list = document.createElement("div");
  list.className = "type-pills";
  values.forEach((value) => {
    const type = typeof value === "string" ? value : value.type;
    const pill = document.createElement("span");
    pill.className = `type-pill type-${type.toLowerCase()}`;
    pill.textContent = `${type}${typeof value === "string" ? options.suffix || "" : ` ${value.multiplier}`}`;
    list.append(pill);
  });
  if (!values.length) {
    const none = document.createElement("span");
    none.className = "type-none";
    none.textContent = "None";
    list.append(none);
  }
  return list;
}

function renderTypeChart() {
  const intro = document.createElement("section");
  intro.className = "type-intro";
  intro.innerHTML = "<strong>Fast battle reference</strong><p>These are Pokémon GO’s single-type multipliers. Dual types combine both matchups, so some weaknesses or resistances become stronger or cancel out.</p>";
  elements.results.append(intro);
  for (const [type, attack] of Object.entries(TYPE_ATTACK)) {
    const defense = defenseFor(type);
    const card = document.createElement("article");
    card.className = `type-card type-card-${type.toLowerCase()}`;
    const heading = document.createElement("h3");
    heading.textContent = type;
    const grid = document.createElement("div");
    grid.className = "type-matchups";
    const cells = [
      ["Super effective against", attack.super, " ×1.6"],
      ["Weak to", defense.weak, " ×1.6"],
      ["Resists", defense.resist, ""]
    ];
    cells.forEach(([label, values, suffix]) => {
      const cell = document.createElement("section");
      const title = document.createElement("h4");
      title.textContent = label;
      cell.append(title, typePills(values, { suffix }));
      grid.append(cell);
    });
    card.append(heading, grid);
    elements.results.append(card);
  }
  elements.results.className = "type-chart";
  elements.results.setAttribute("aria-busy", "false");
  elements.count.textContent = "18 Pokémon types · tap-friendly reference";
  elements.viewKicker.textContent = "Battle reference";
  elements.viewTitle.textContent = "Super effective, weak & resistant";
}

function opportunityScore(record, item) {
  const best = bestRankFor(record)?.rank || 76;
  const likelihood = { reliable: 0, boosted: 1, raid: 2, "if-lucky": 3 }[item.likelihood] ?? 4;
  return likelihood * 100 + best;
}

function opportunityCard(record, item, upcoming = false) {
  const article = document.createElement("article");
  article.className = "opportunity-card";
  const badges = LEAGUES.filter((league) => record.leagues?.[league])
    .map((league) => `<span class="mini-league mini-${league}">${shortLeague(league)}</span>`).join("");
  const starts = item.start
    ? new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(item.start))
    : "";
  const move = item.featuredMove ? `<p class="move-callout">⚡ ${item.featuredMove}</p>` : "";
  article.innerHTML = `
    <div class="opportunity-topline"><span class="opportunity-label">${upcoming ? `Starts ${starts}` : item.label}</span><span class="mini-leagues">${badges}</span></div>
    <h3>${item.encounterName || record.catchTarget}</h3>
    ${item.encounterName && item.encounterName !== record.catchTarget ? `<p class="family-note">${record.catchTarget} family</p>` : ""}
    <p class="opportunity-reason">${bestReason(record)}</p>
    <p class="opportunity-note">${item.note || ""}</p>
    ${move}
    <a href="${item.sourceUrl}" rel="noreferrer">Official event details ↗</a>`;
  return article;
}

function todaySection(title, description, entries, options = {}) {
  const section = document.createElement("section");
  section.className = "today-section";
  const heading = document.createElement("div");
  heading.className = "today-section-head";
  heading.innerHTML = `<div><p class="eyebrow">${options.kicker || "Today"}</p><h3>${title}</h3><p>${description}</p></div><span class="section-count">${entries.length}</span>`;
  section.append(heading);
  const grid = document.createElement("div");
  grid.className = "opportunity-grid";
  entries.forEach(({ record, item }) => grid.append(opportunityCard(record, item, options.upcoming)));
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "today-empty";
    empty.textContent = options.empty || "No verified PvP targets in this category right now.";
    grid.append(empty);
  }
  section.append(grid);
  return section;
}

function renderToday() {
  const now = new Date();
  const all = [...state.data.families, ...state.data.raids];
  const active = all.flatMap((record) => activeAvailability(record, now).map((item) => ({ record, item })))
    .sort((a, b) => opportunityScore(a.record, a.item) - opportunityScore(b.record, b.item));
  const upcoming = all.flatMap((record) => upcomingAvailability(record, now, 7).map((item) => ({ record, item })))
    .sort((a, b) => new Date(a.item.start) - new Date(b.item.start) || opportunityScore(a.record, a.item) - opportunityScore(b.record, b.item));
  const catches = active.filter(({ item }) => item.kind !== "raid" && !item.ongoing);
  const raids = active.filter(({ item }) => item.kind === "raid");
  const reliable = active.filter(({ item }) => item.ongoing);

  const hero = document.createElement("section");
  hero.className = "today-hero";
  hero.innerHTML = `<div><p class="eyebrow">Your field plan</p><h3>Catch smart today.</h3><p>Only verified opportunities are shown. Boosted does not mean guaranteed.</p></div><div class="today-date"><strong>${new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now)}</strong><span>${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(now)}</span></div>`;
  elements.results.append(hero);
  elements.results.append(todaySection("Catch these first", "High-value families officially featured in current encounters.", catches, { empty: "No verified event-boosted catch targets right now. The Catch List is still ready for spot checks." }));
  elements.results.append(todaySection("Raids worth checking", "Currently verified raids whose catches matter for PvP.", raids, { kicker: "Raid plan", empty: "No verified PvP raid target is active in the event data right now." }));
  elements.results.append(todaySection("Starting soon", "Useful catches and raids announced for the next seven days.", upcoming, { kicker: "Plan ahead", upcoming: true, empty: "Nothing verified is starting in the next seven days." }));
  elements.results.append(todaySection("Reliable any-day targets", "Repeatable tools you can choose when you want these families.", reliable, { kicker: "Any day", empty: "No repeatable acquisition tools are documented yet." }));
  elements.results.className = "today-dashboard";
  elements.results.setAttribute("aria-busy", "false");
  elements.count.textContent = `Availability checked ${formatDate(state.data.meta.availabilityLastChecked)}`;
  elements.viewKicker.textContent = "Today";
  elements.viewTitle.textContent = "What to do today";
}

function emptyMessage() {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";
  wrapper.innerHTML = state.filter === "available"
    ? `<span aria-hidden="true">🌤️</span><h3>No verified targets right now</h3><p>The regular catch list is still ready. Availability only appears when a dated, sourced item is active.</p>`
    : `<span aria-hidden="true">🔎</span><h3>No Pokémon found</h3><p>Try another evolution name or reset the filters.</p>`;
  return wrapper;
}

function updateUrl() {
  history.replaceState(null, "", `${location.pathname}${stateToSearch(state)}${location.hash}`);
}

function render() {
  if (!state.data) return;
  elements.results.replaceChildren();
  if (state.filter === "today" && !state.query) {
    renderToday();
    elements.clearSearch.hidden = true;
    elements.reset.hidden = true;
    elements.filters.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === "today"));
    });
    updateUrl();
    return;
  }
  if (state.filter === "types" && !state.query) {
    renderTypeChart();
    elements.clearSearch.hidden = true;
    elements.reset.hidden = false;
    elements.filters.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === "types"));
    });
    updateUrl();
    return;
  }
  const raidView = state.filter === "raids";
  const isSearch = Boolean(state.query);
  const allCurated = [...state.data.families, ...state.data.raids];
  const source = isSearch && ["today", "types"].includes(state.filter)
    ? allCurated
    : raidView ? state.data.raids : state.data.families;
  const filter = raidView || ["today", "types"].includes(state.filter) ? "all" : state.filter;
  const records = filterRecords(source, { query: state.query, filter });
  const referenceGroups = isSearch ? filterReferenceGroups(state.referenceGroups, state.query) : [];
  const mappedGroups = new Set();
  const fragment = document.createDocumentFragment();
  records.forEach((record) => {
    const groups = referenceGroupsForRecord(record).filter((group) => referenceGroups.includes(group));
    groups.forEach((group) => mappedGroups.add(group.familyKey));
    fragment.append(createCard(record, groups));
  });
  let extraRecommended = 0;
  const referenceOnly = referenceGroups.filter((group) => {
    if (mappedGroups.has(group.familyKey)) return false;
    const mappedRecord = recordForReferenceGroup(group, allCurated);
    if (!mappedRecord) return true;
    mappedGroups.add(group.familyKey);
    const visibleByFilter = filter === "all" || filterRecords([mappedRecord], { filter }).length > 0;
    if (visibleByFilter) {
      fragment.append(createCard(mappedRecord, [group]));
      extraRecommended += 1;
    }
    return false;
  });
  referenceOnly.forEach((group) => fragment.append(createReferenceCard(group)));
  const resultTotal = records.length + extraRecommended + referenceOnly.length;
  if (!resultTotal) fragment.append(emptyMessage());
  elements.results.className = "card-grid";
  elements.results.replaceChildren(fragment);
  elements.results.setAttribute("aria-busy", "false");
  elements.count.textContent = `${resultTotal} ${resultTotal === 1 ? "family" : "families"} · full Overall, Lead, Switch & Closer rankings`;
  elements.viewKicker.textContent = isSearch ? "Search results" : raidView ? "Raid targets" : state.filter === "all" ? "Catch list" : `${titleCase(state.filter)} filter`;
  elements.viewTitle.textContent = isSearch ? "Is it worth catching?" : raidView ? "Worth raiding for PvP" : state.filter === "available" ? "Targetable right now" : "What should we catch?";
  elements.clearSearch.hidden = !state.query;
  elements.reset.hidden = !state.query && state.filter === "today";
  elements.filters.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.filter === state.filter));
  });
  updateUrl();
}

function setFilter(filter) {
  state.filter = filter;
  render();
  document.querySelector("main").scrollIntoView({ behavior: "smooth", block: "start" });
}

elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});
elements.clearSearch.addEventListener("click", () => {
  state.query = "";
  elements.search.value = "";
  elements.search.focus();
  render();
});
elements.filters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (button) setFilter(button.dataset.filter);
});
elements.reset.addEventListener("click", () => {
  state.query = "";
  state.filter = "today";
  elements.search.value = "";
  render();
});

async function loadData() {
  try {
    const [dataResponse, referenceResponse] = await Promise.all([
      fetch("data.json", { cache: "no-cache" }),
      fetch("pvpoke.json", { cache: "no-cache" })
    ]);
    if (!dataResponse.ok) throw new Error(`Data request failed (${dataResponse.status})`);
    if (!referenceResponse.ok) throw new Error(`PvPoke reference request failed (${referenceResponse.status})`);
    state.data = await dataResponse.json();
    state.reference = await referenceResponse.json();
    state.referenceGroups = groupReferencePokemon(state.reference.pokemon);
    const all = [...state.data.families, ...state.data.raids];
    const counts = {
      all: state.data.families.length,
      great: state.data.families.filter((record) => record.leagues.great).length,
      ultra: state.data.families.filter((record) => record.leagues.ultra).length,
      master: state.data.families.filter((record) => record.leagues.master).length,
      available: all.filter((record) => activeAvailability(record).length).length,
      raids: state.data.raids.length
    };
    Object.entries(counts).forEach(([key, value]) => {
      const target = elements.filters.querySelector(`[data-count="${key}"]`);
      if (target) target.textContent = value;
    });
    elements.updated.textContent = `PvPoke rankings: ${formatDate(state.reference.meta.updated)}`;
    render();
  } catch (error) {
    console.error(error);
    elements.results.setAttribute("aria-busy", "false");
    elements.results.replaceChildren();
    elements.count.textContent = "List unavailable";
    elements.notice.hidden = false;
    elements.notice.innerHTML = `<strong>We couldn’t load the catch list.</strong><br>Please check your connection and refresh the page.`;
  }
}

loadData();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
