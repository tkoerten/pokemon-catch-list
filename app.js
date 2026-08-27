import { LEAGUES, activeAvailability, bestRankFor, filterRecords, parseUrlState, priorityFor, stateToSearch, upcomingAvailability } from "./core.js";

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

const state = { ...parseUrlState(location.search), data: null };
elements.search.value = state.query;

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

function buildDetail(record) {
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

function createCard(record) {
  const card = elements.template.content.firstElementChild.cloneNode(true);
  card.dataset.id = record.id;
  card.querySelector(".card-label").textContent = record.type === "raid" ? "Raid target" : "Catch target";
  card.querySelector("h3").textContent = record.catchTarget;
  card.querySelector(".targets").textContent = (record.pvpTargets || []).join(" · ");
  card.querySelector(".decision-line").textContent = bestReason(record);

  const badgeBox = card.querySelector(".badges");
  LEAGUES.filter((league) => record.leagues?.[league]).forEach((league) => badgeBox.append(leagueBadge(league)));

  const status = card.querySelector(".availability-row");
  const priority = priorityFor(record);
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

  card.querySelector(".details-body").append(buildDetail(record));
  card.querySelector("details").addEventListener("toggle", (event) => {
    event.currentTarget.querySelector("summary span").textContent = event.currentTarget.open ? "−" : "＋";
  });
  return card;
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
  const raidView = state.filter === "raids";
  const source = state.filter === "today" && state.query
    ? [...state.data.families, ...state.data.raids]
    : raidView ? state.data.raids : state.data.families;
  const filter = raidView || state.filter === "today" ? "all" : state.filter;
  const records = filterRecords(source, { query: state.query, filter });
  const fragment = document.createDocumentFragment();
  records.forEach((record) => fragment.append(createCard(record)));
  if (!records.length) fragment.append(emptyMessage());
  elements.results.className = "card-grid";
  elements.results.replaceChildren(fragment);
  elements.results.setAttribute("aria-busy", "false");
  elements.count.textContent = `${records.length} ${records.length === 1 ? "target" : "targets"}`;
  elements.viewKicker.textContent = state.filter === "today" ? "Search results" : raidView ? "Raid targets" : state.filter === "all" ? "Catch list" : `${titleCase(state.filter)} filter`;
  elements.viewTitle.textContent = state.filter === "today" ? "Is it worth catching?" : raidView ? "Worth raiding for PvP" : state.filter === "available" ? "Targetable right now" : "What should we catch?";
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
    const response = await fetch("data.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Data request failed (${response.status})`);
    state.data = await response.json();
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
    elements.updated.textContent = `Last updated: ${formatDate(state.data.meta.updated)}`;
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
