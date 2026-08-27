# Pokémon GO Catch List

A fast, mobile-first Pokémon GO PvP field guide. The default **What to do today** screen turns verified event windows into a short proactive plan: useful featured catches, worthwhile raids, upcoming opportunities, and repeatable acquisition tools. Search any evolution or relevant form to spot-check a catch target and its Great, Ultra, or Master League value. Raid-first targets stay in their own view.

The production site is fully static: no login, database, runtime API, or paid service. Search and filters run locally in the browser, and a small service worker keeps the last loaded list available offline.

## Project structure

- `index.html`, `styles.css`, `app.js`: the interface and browser behavior
- `core.js`: testable search, filter, availability, priority, and URL-state logic
- `data.json`: published catch families, raid targets, rankings, and availability
- `refresh-report.json`: unmatched PvPoke forms and condensed records without rank details
- `scripts/seed-data.mjs`: recreates the supplied baseline family set
- `scripts/refresh-rankings.mjs`: attaches a current static PvPoke snapshot
- `scripts/validate-data.mjs`: enforces data invariants
- `test/`: Node tests for required searches and filters
- `.github/workflows/pages.yml`: validates and deploys the static files to GitHub Pages
- `.github/workflows/availability-review.yml`: opens one reminder issue when dated availability is stale or empty

## Data and search aliases

Every record has a practical `catchTarget`, compact `pvpTargets`, league flags, explicit `searchAliases`, ranking details, and availability fields. Aliases contain the entire evolutionary family plus relevant regional and alternate-form names. They are deliberately separate from the short names shown on cards.

Search normalizes capitalization, accents, apostrophes, punctuation, parentheses, and hyphens. It is substring-based, so `Primeape`, `Annihilape`, and `Mankey` all find the Mankey family; `Ninetales` finds both Vulpix families.

## Re-run our Pokémon GO catch list

PvPoke is the ranking source of truth. The refresh workflow reads the current Open Great (1500 CP), Ultra (2500 CP), and Master (10,000/unlimited CP) ranking JSON for the top 75 Overall, Leads, Switches, and Closers. It preserves exact ranked forms while attaching them to the condensed catch families.

```bash
npm run refresh
npm run check
```

By default, refresh replaces ranking details but preserves the reviewed baseline league flags. To expand flags when a mapped family appears in a new league snapshot:

```bash
npm run refresh -- --apply-flags
```

The script records unmatched or ambiguous forms in `refresh-report.json` for human review. Update `scripts/seed-data.mjs` when a genuinely new catch family or mapping belongs in the list, rerun `npm run seed`, and then refresh rankings. Do not silently merge regional families.

## Today dashboard and availability updates

The homepage derives its sections from dated, sourced `availability` entries. Use `kind` (`wild`, `raid`, or `tool`), `likelihood` (`boosted`, `if-lucky`, `raid`, or `reliable`), optional `encounterName` and `featuredMove`, and `ongoing` only for repeatable mechanics such as Mystery Box and Coin Bag. Temporary entries automatically move from **Starting soon** to today's plan and disappear after their end time. Times without an explicit offset are interpreted in the player's local time because official Pokémon GO events use local time.

Add time-sensitive items in `scripts/seed-data.mjs`, then regenerate `data.json`:

```json
{
  "label": "Boosted spawn",
  "source": "Pokémon GO",
  "sourceUrl": "https://pokemongolive.com/post/example/",
  "start": "2026-08-28T10:00:00-04:00",
  "end": "2026-08-28T20:00:00-04:00",
  "lastChecked": "2026-08-27",
  "note": "Appearing more often during the event."
}
```

Use sourced labels such as `Boosted spawn`, `Glacial Lure pool`, `Field Research`, or `Raid rotation`; never invent spawn percentages. Expired entries remain historical but automatically disappear from active badges and the **Available** filter. Update `meta.updated` and `meta.availabilityLastChecked`, then run `npm run check`.

The daily availability workflow checks whether the source review is more than three days old or whether no dated opportunity is active/upcoming. It opens one repository issue for review and closes that reminder after fresh data is committed; it never publishes guessed event data automatically.

## Test locally

Node 20 or newer is sufficient; there are no package dependencies.

```bash
npm run check
npm run serve
```

Open `http://127.0.0.1:4173/pokemon-catch-list/`. The project-path URL intentionally mirrors GitHub Pages and catches broken absolute paths.

## GitHub Pages deployment

Pushes to `main` run validation/tests and deploy the repository as a Pages artifact. In the GitHub repository, choose **Settings → Pages → Build and deployment → Source: GitHub Actions** once if it is not already selected. The expected project URL is:

`https://tkoerten.github.io/pokemon-catch-list/`

To redeploy without a code change, open **Actions → Deploy GitHub Pages → Run workflow**.
