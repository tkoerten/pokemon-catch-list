# Project instructions

This repository is a static, mobile-first Pokémon GO PvP catch reference for a parent and children. Keep the core experience extremely quick: search any family member, see the practical catch target, and scan GL/UL/ML relevance. Keep the UI friendly, readable outdoors, and free of runtime APIs or infrastructure.

## Data rules

- PvPoke is the PvP ranking source of truth. Use Open Great (1500 CP), Ultra (2500 CP), and Master League (uncapped/10,000 CP data).
- Analyze the top 75 in Overall, Leads, Switches, and Closers for each league.
- Preserve normal, Shadow, regional, and other meaningful forms before condensing them into practical catch families.
- Keep Raid Targets separate from the normal catch list.
- Search aliases must include every evolution stage, useful form names, and ranked Shadow forms. Never remove an intermediate evolution merely because it is not ranked.
- Keep genuinely distinct families such as Wooper/Paldean Wooper and Vulpix/Alolan Vulpix separate.
- The default catch list and raid list must remain alphabetical by `catchTarget`.
- Do not invent event spawn percentages. Availability entries require a label, source, source URL, last-checked date, and start/end dates when temporary.
- For lure pools, say that the Pokémon is in the pool; never imply a guarantee.
- Great and Ultra League PvP IVs are often low Attack/high bulk. Master League generally prioritizes 15/15/15 or near-perfect IVs and XL Candy.

## Re-run our Pokémon GO catch list

When asked to **“re-run our Pokémon Go catch list”**:

1. Run `npm run refresh` to fetch the current PvPoke Open League top-75 snapshot for all three leagues and four categories.
2. Review unmatched forms printed by the script. Add or correct family aliases/mapping in `scripts/seed-data.mjs`; preserve exact ranked form names.
3. Review whether baseline league flags should expand. Use `npm run refresh -- --apply-flags` only after that review.
4. Update sourced availability items and dates in `data.json`; never guess current spawns or raids.
5. Run `npm run check`.
6. Verify required evolution searches, league filters, Raid Targets, Available Now, reset behavior, phone and desktop layouts, the `/pokemon-catch-list/` project path, and the data-load error state.
7. Update the service-worker cache name when published static assets change materially.
8. Commit only after validation passes.

## Implementation rules

- Keep the website static, dependency-light, and mobile friendly.
- Keep data separate from presentation. Routine ranking updates should change `data.json`, not UI code.
- Do not introduce a framework, backend, database, login, runtime ranking fetch, or secret unless the project requirements fundamentally change.
- Use relative URLs so GitHub Pages project hosting continues to work.
- Maintain large touch targets, strong contrast, visible text labels on league badges, keyboard accessibility, and a reasonable user-facing data-load failure.
