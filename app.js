import { LEAGUES, activeAvailability, filterRecords, parseUrlState, priorityFor, stateToSearch } from "./core.js";

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

function createCard(record) {
  const card = elements.template.content.firstElementChild.cloneNode(true);
  card.dataset.id = record.id;
  card.querySelector(".card-label").textContent = record.type === "raid" ? "Raid target" : "Catch target";
  card.querySelector("h3").textContent = record.catchTarget;
  card.querySelector(".targets").textContent = (record.pvpTargets || []).join(" · ");

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

  card.querySelector(".details-body").append(buildDetail(record));
  card.querySelector("details").addEventListener("toggle", (event) => {
    event.currentTarget.querySelector("summary span").textContent = event.currentTarget.open ? "−" : "＋";
  });
  return card;
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
  const raidView = state.filter === "raids";
  const source = raidView ? state.data.raids : state.data.families;
  const filter = raidView ? "all" : state.filter;
  const records = filterRecords(source, { query: state.query, filter });
  const fragment = document.createDocumentFragment();
  records.forEach((record) => fragment.append(createCard(record)));
  if (!records.length) fragment.append(emptyMessage());
  elements.results.replaceChildren(fragment);
  elements.results.setAttribute("aria-busy", "false");
  elements.count.textContent = `${records.length} ${records.length === 1 ? "target" : "targets"}`;
  elements.viewKicker.textContent = raidView ? "Raid targets" : state.filter === "all" ? "Catch list" : `${titleCase(state.filter)} filter`;
  elements.viewTitle.textContent = raidView ? "Worth raiding for PvP" : state.filter === "available" ? "Targetable right now" : "What should we catch?";
  elements.clearSearch.hidden = !state.query;
  elements.reset.hidden = !state.query && state.filter === "all";
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
  state.filter = "all";
  elements.search.value = "";
  render();
});

async function loadData() {
  try {
    const response = await fetch("data.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Data request failed (${response.status})`);
    state.data = await response.json();
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
