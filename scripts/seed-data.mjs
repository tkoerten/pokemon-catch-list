import { writeFile } from "node:fs/promises";

const baseline = `
Alolan Vulpix|Y|Y|N
Alomomola|N|Y|N
Amaura|N|Y|N
Bagon|Y|N|N
Beldum|N|N|Y
Bunnelby|Y|N|N
Carbink|Y|N|N
Charmander|N|Y|N
Chinchou|Y|N|N
Clefairy|N|Y|N
Cosmog|N|N|Y
Deino|Y|N|Y
Dewpider|Y|N|N
Dondozo|Y|Y|N
Dratini|Y|N|Y
Duskull|Y|Y|N
Dwebble|Y|Y|N
Eevee|Y|Y|Y
Elekid / Electabuzz|N|Y|N
Feebas|Y|Y|N
Flabébé|N|Y|Y
Fletchling|N|Y|N
Frigibax|N|N|Y
Frillish|Y|Y|N
Froakie|Y|N|N
Galarian Corsola|Y|N|N
Galarian Moltres|Y|Y|N
Galarian Stunfisk|Y|Y|N
Galarian Yamask|N|Y|N
Gible|N|N|Y
Gimmighoul|N|N|Y
Gligar|Y|N|N
Goldeen|N|Y|N
Goomy|Y|N|Y
Grubbin|Y|N|N
Hippopotas|Y|Y|N
Hisuian Qwilfish|Y|N|N
Honedge|N|Y|N
Hoothoot|Y|N|N
Hoppip|Y|N|N
Horsea|Y|Y|N
Inkay|Y|Y|N
Jangmo-o|N|Y|N
Jirachi|N|N|Y
Keldeo|N|N|Y
Lapras|Y|Y|N
Larvitar|N|N|Y
Lickitung|Y|Y|N
Lileep|Y|Y|N
Lunatone|Y|N|N
Magikarp|N|Y|Y
Mankey|Y|Y|Y
Mareanie|Y|N|N
Mareep|N|Y|N
Marshadow|N|N|Y
Meditite|Y|N|N
Meloetta|N|N|Y
Meltan|N|N|Y
Miltank|Y|N|N
Mimikyu|Y|Y|N
Mudkip|Y|Y|N
Onix|N|Y|N
Oranguru|Y|Y|N
Oshawott|Y|Y|N
Paldean Wooper|Y|N|N
Pidgey|Y|N|N
Pikipek|N|Y|N
Pineco|Y|Y|N
Piplup|Y|Y|N
Poliwag|Y|N|N
Ponyta|Y|Y|N
Popplio|N|N|Y
Pumpkaboo (Average)|N|Y|N
Qwilfish|Y|N|N
Rhyhorn|N|N|Y
Rookidee|Y|Y|N
Rowlet|Y|N|N
Sableye|Y|N|N
Seel|Y|N|N
Shellos|Y|N|N
Skorupi|Y|Y|N
Skwovet|Y|N|N
Solrock|Y|N|N
Spearow|Y|N|N
Spheal|Y|Y|N
Spoink|N|Y|N
Spritzee|N|Y|N
Squirtle|N|Y|N
Staryu|N|Y|N
Swablu|Y|N|N
Tadbulb|N|Y|N
Tentacool|Y|Y|N
Timburr|N|N|Y
Tinkatink|Y|Y|N
Togepi|N|N|Y
Torchic|N|Y|N
Totodile|Y|Y|N
Toxel|N|Y|N
Turtonator|Y|Y|N
Tympole|N|Y|N
Vulpix|Y|Y|N
Wimpod|N|Y|N
Wingull|Y|N|N
Wooper|Y|N|N
Yamask|N|Y|N
Zygarde|N|Y|Y
`.trim();

const families = {
  "Alolan Vulpix": ["Alolan Vulpix", "Alolan Ninetales", "Vulpix Alolan", "Ninetales Alolan"],
  Alomomola: ["Alomomola"], Amaura: ["Amaura", "Aurorus"],
  Bagon: ["Bagon", "Shelgon", "Salamence"], Beldum: ["Beldum", "Metang", "Metagross"],
  Bunnelby: ["Bunnelby", "Diggersby"], Carbink: ["Carbink"],
  Charmander: ["Charmander", "Charmeleon", "Charizard"], Chinchou: ["Chinchou", "Lanturn"],
  Clefairy: ["Cleffa", "Clefairy", "Clefable"], Cosmog: ["Cosmog", "Cosmoem", "Solgaleo", "Lunala"],
  Deino: ["Deino", "Zweilous", "Hydreigon"], Dewpider: ["Dewpider", "Araquanid"], Dondozo: ["Dondozo"],
  Dratini: ["Dratini", "Dragonair", "Dragonite"], Duskull: ["Duskull", "Dusclops", "Dusknoir"],
  Dwebble: ["Dwebble", "Crustle"],
  Eevee: ["Eevee", "Vaporeon", "Jolteon", "Flareon", "Espeon", "Umbreon", "Leafeon", "Glaceon", "Sylveon"],
  "Elekid / Electabuzz": ["Elekid / Electabuzz", "Elekid", "Electabuzz", "Electivire"], Feebas: ["Feebas", "Milotic"],
  "Flabébé": ["Flabébé", "Flabebe", "Floette", "Florges"], Fletchling: ["Fletchling", "Fletchinder", "Talonflame"],
  Frigibax: ["Frigibax", "Arctibax", "Baxcalibur"], Frillish: ["Frillish", "Jellicent"],
  Froakie: ["Froakie", "Frogadier", "Greninja"], "Galarian Corsola": ["Galarian Corsola", "Corsola Galarian", "Cursola"],
  "Galarian Moltres": ["Galarian Moltres", "Moltres Galarian"],
  "Galarian Stunfisk": ["Galarian Stunfisk", "Stunfisk Galarian"],
  "Galarian Yamask": ["Galarian Yamask", "Yamask Galarian", "Runerigus"],
  Gible: ["Gible", "Gabite", "Garchomp"], Gimmighoul: ["Gimmighoul", "Gholdengo"],
  Gligar: ["Gligar", "Gliscor"], Goldeen: ["Goldeen", "Seaking"], Goomy: ["Goomy", "Sliggoo", "Goodra"],
  Grubbin: ["Grubbin", "Charjabug", "Vikavolt"], Hippopotas: ["Hippopotas", "Hippowdon"],
  "Hisuian Qwilfish": ["Hisuian Qwilfish", "Qwilfish Hisuian", "Overqwil"],
  Honedge: ["Honedge", "Doublade", "Aegislash", "Aegislash Blade", "Aegislash Shield"],
  Hoothoot: ["Hoothoot", "Noctowl"], Hoppip: ["Hoppip", "Skiploom", "Jumpluff"],
  Horsea: ["Horsea", "Seadra", "Kingdra"], Inkay: ["Inkay", "Malamar"],
  "Jangmo-o": ["Jangmo-o", "Hakamo-o", "Kommo-o"], Jirachi: ["Jirachi"], Keldeo: ["Keldeo", "Keldeo Resolute"],
  Lapras: ["Lapras"], Larvitar: ["Larvitar", "Pupitar", "Tyranitar"],
  Lickitung: ["Lickitung", "Lickilicky"], Lileep: ["Lileep", "Cradily"], Lunatone: ["Lunatone"],
  Magikarp: ["Magikarp", "Gyarados"], Mankey: ["Mankey", "Primeape", "Annihilape"],
  Mareanie: ["Mareanie", "Toxapex"], Mareep: ["Mareep", "Flaaffy", "Ampharos"],
  Marshadow: ["Marshadow"], Meditite: ["Meditite", "Medicham"], Meloetta: ["Meloetta", "Meloetta Aria", "Meloetta Pirouette"],
  Meltan: ["Meltan", "Melmetal"], Miltank: ["Miltank"], Mimikyu: ["Mimikyu"],
  Mudkip: ["Mudkip", "Marshtomp", "Swampert"], Onix: ["Onix", "Steelix"], Oranguru: ["Oranguru"],
  Oshawott: ["Oshawott", "Dewott", "Samurott", "Hisuian Samurott"],
  "Paldean Wooper": ["Paldean Wooper", "Wooper Paldean", "Clodsire"],
  Pidgey: ["Pidgey", "Pidgeotto", "Pidgeot"], Pikipek: ["Pikipek", "Trumbeak", "Toucannon"],
  Pineco: ["Pineco", "Forretress"], Piplup: ["Piplup", "Prinplup", "Empoleon"],
  Poliwag: ["Poliwag", "Poliwhirl", "Poliwrath", "Politoed"], Ponyta: ["Ponyta", "Rapidash"],
  Popplio: ["Popplio", "Brionne", "Primarina"],
  "Pumpkaboo (Average)": ["Pumpkaboo", "Pumpkaboo Average", "Average Pumpkaboo", "Gourgeist", "Gourgeist Average"],
  Qwilfish: ["Qwilfish"], Rhyhorn: ["Rhyhorn", "Rhydon", "Rhyperior"],
  Rookidee: ["Rookidee", "Corvisquire", "Corviknight"], Rowlet: ["Rowlet", "Dartrix", "Decidueye", "Hisuian Decidueye"],
  Sableye: ["Sableye"], Seel: ["Seel", "Dewgong"], Shellos: ["Shellos", "Gastrodon", "East Sea Shellos", "West Sea Shellos"],
  Skorupi: ["Skorupi", "Drapion"], Skwovet: ["Skwovet", "Greedent"], Solrock: ["Solrock"],
  Spearow: ["Spearow", "Fearow"], Spheal: ["Spheal", "Sealeo", "Walrein"], Spoink: ["Spoink", "Grumpig"],
  Spritzee: ["Spritzee", "Aromatisse"], Squirtle: ["Squirtle", "Wartortle", "Blastoise"],
  Staryu: ["Staryu", "Starmie"], Swablu: ["Swablu", "Altaria"], Tadbulb: ["Tadbulb", "Bellibolt"],
  Tentacool: ["Tentacool", "Tentacruel"], Timburr: ["Timburr", "Gurdurr", "Conkeldurr"],
  Tinkatink: ["Tinkatink", "Tinkatuff", "Tinkaton"], Togepi: ["Togepi", "Togetic", "Togekiss"],
  Torchic: ["Torchic", "Combusken", "Blaziken"], Totodile: ["Totodile", "Croconaw", "Feraligatr"],
  Toxel: ["Toxel", "Toxtricity", "Toxtricity Amped", "Toxtricity Low Key"], Turtonator: ["Turtonator"],
  Tympole: ["Tympole", "Palpitoad", "Seismitoad"], Vulpix: ["Vulpix", "Ninetales"],
  Wimpod: ["Wimpod", "Golisopod"], Wingull: ["Wingull", "Pelipper"], Wooper: ["Wooper", "Quagsire"],
  Yamask: ["Yamask", "Cofagrigus"], Zygarde: ["Zygarde", "Zygarde 10%", "Zygarde 50%", "Zygarde Complete"]
};

const raidsText = `
Cresselia|N|Y|N
Dialga|N|N|Y
Enamorus|N|N|Y
Eternatus|N|N|Y
Giratina|N|Y|Y
Groudon|N|N|Y
Guzzlord|Y|N|N
Heatran|N|N|Y
Ho-Oh|N|Y|Y
Kyogre|N|N|Y
Kyurem|N|N|Y
Landorus|N|N|Y
Latias|N|N|Y
Latios|N|N|Y
Lugia|N|N|Y
Mewtwo|N|N|Y
Necrozma|N|N|Y
Palkia|N|N|Y
Raikou|N|Y|Y
Regice|N|Y|N
Regidrago|Y|Y|N
Regirock|N|Y|N
Registeel|Y|Y|N
Reshiram|N|N|Y
Tapu Lele|N|N|Y
Virizion|N|Y|N
Xerneas|N|Y|Y
Yveltal|N|N|Y
Zacian|N|N|Y
Zamazenta|N|N|Y
Zapdos|N|Y|N
Zekrom|N|N|Y
`.trim();

const raidAliases = {
  Dialga: ["Dialga", "Dialga Origin", "Origin Forme Dialga"],
  Giratina: ["Giratina", "Giratina Altered", "Giratina Origin", "Altered Forme Giratina", "Origin Forme Giratina"],
  Kyurem: ["Kyurem", "Kyurem Black", "Black Kyurem", "Kyurem White", "White Kyurem"],
  Landorus: ["Landorus", "Landorus Therian", "Landorus Incarnate"],
  Necrozma: ["Necrozma", "Necrozma Dawn Wings", "Dawn Wings Necrozma", "Necrozma Dusk Mane", "Dusk Mane Necrozma"],
  Palkia: ["Palkia", "Palkia Origin", "Origin Forme Palkia"],
  Zacian: ["Zacian", "Zacian Hero", "Zacian Crowned Sword", "Crowned Sword Zacian"],
  Zamazenta: ["Zamazenta", "Zamazenta Hero", "Zamazenta Crowned Shield", "Crowned Shield Zamazenta"]
};

const displayOverrides = {
  "Alolan Vulpix": ["Alolan Ninetales"],
  Cosmog: ["Solgaleo", "Lunala"],
  Eevee: ["Umbreon", "Sylveon", "Glaceon"],
  "Flabébé": ["Floette", "Florges"],
  "Galarian Corsola": ["Cursola"],
  "Galarian Yamask": ["Runerigus"],
  "Hisuian Qwilfish": ["Overqwil"],
  Honedge: ["Doublade", "Aegislash"],
  Meloetta: ["Meloetta Aria", "Meloetta Pirouette"],
  Oshawott: ["Samurott", "Hisuian Samurott"],
  "Paldean Wooper": ["Clodsire"],
  "Pumpkaboo (Average)": ["Gourgeist (Average)"],
  Rowlet: ["Decidueye", "Hisuian Decidueye"],
  Shellos: ["Gastrodon"],
  Toxel: ["Toxtricity"],
  Zygarde: ["Zygarde Complete"]
};

const worldsSource = "https://pokemongo.com/news/world-championships-event-2026";
const worldsSourceName = "Pokémon GO: PokémonXP & 2026 World Championships";
const currentEvent = { start: "2026-08-25T10:00:00", end: "2026-08-28T10:00:00", source: worldsSourceName, sourceUrl: worldsSource, lastChecked: "2026-08-27" };
const worldsEvent = { start: "2026-08-28T10:00:00", end: "2026-08-30T20:00:00", source: worldsSourceName, sourceUrl: worldsSource, lastChecked: "2026-08-27" };
const currentRaidRotation = { start: "2026-08-26T06:00:00", end: "2026-08-28T10:00:00", source: "Pokémon GO Hub: Current Raid Bosses", sourceUrl: "https://pokemongohub.net/post/guide/current-go-raids/", lastChecked: "2026-08-27", kind: "raid", likelihood: "raid" };
const boosted = (note, featuredMove) => ({ ...worldsEvent, label: "Boosted wild spawn", kind: "wild", likelihood: "boosted", note, ...(featuredMove ? { featuredMove } : {}) });
const ifLucky = (encounterName, note, featuredMove) => ({ ...worldsEvent, label: "If you're lucky — wild", kind: "wild", likelihood: "if-lucky", encounterName, note, ...(featuredMove ? { featuredMove } : {}) });

const availabilityByTarget = {
  Spheal: [{ ...currentEvent, label: "Boosted wild spawn", kind: "wild", likelihood: "boosted", note: "Appearing more frequently during PokémonXP.", featuredMove: "Evolve to Walrein for Powder Snow and Icicle Spear during the event." }],
  Deino: [
    { ...currentEvent, label: "If you're lucky — wild", kind: "wild", likelihood: "if-lucky", note: "A less-common wild encounter during PokémonXP.", featuredMove: "Evolve to Hydreigon for Brutal Swing during the event." },
    ifLucky("Deino", "A less-common wild encounter during the World Championships event.", "Evolve to Hydreigon for Brutal Swing during the event.")
  ],
  Mankey: [
    { label: "Spotlight Hour", kind: "wild", likelihood: "boosted", start: "2026-08-27T18:00:00", end: "2026-08-27T19:00:00", source: "Leek Duck event calendar", sourceUrl: "https://leekduck.com/events/", lastChecked: "2026-08-27", note: "Featured from 6:00–7:00 p.m. local time with 2× Catch Candy." },
    boosted("Appearing more frequently during the World Championships event.", "Primeape and Annihilape can learn Rage Fist during the event.")
  ],
  Lickitung: [boosted("Appearing more frequently during the World Championships event.", "Lickitung and Lickilicky can learn Body Slam during the event.")],
  Totodile: [boosted("Appearing more frequently during the World Championships event.", "Evolve to Feraligatr for Hydro Cannon during the event.")],
  Wooper: [boosted("Appearing more frequently during the World Championships event.", "Evolve to Quagsire for Aqua Tail during the event.")],
  Froakie: [boosted("Appearing more frequently during the World Championships event.", "Evolve to Greninja for Hydro Cannon during the event.")],
  Beldum: [ifLucky("Beldum", "A less-common wild encounter during the World Championships event.", "Evolve to Metagross for Meteor Mash during the event.")],
  Togepi: [ifLucky("Togetic", "A less-common wild encounter during the World Championships event.", "Evolve to Togekiss for Aura Sphere during the event.")],
  Honedge: [{ ...worldsEvent, label: "One-star raid", kind: "raid", likelihood: "raid", encounterName: "Honedge", note: "Available in one-star raids during the World Championships event." }],
  Magikarp: [{ ...currentRaidRotation, label: "Mega Raid", encounterName: "Gyarados", note: "Mega Gyarados is in the current Mega Raid rotation." }],
  Meltan: [{
    label: "Mystery Box", kind: "tool", likelihood: "reliable", ongoing: true,
    source: "Pokémon GO: Steeled Resolve 2026", sourceUrl: "https://pokemongo.com/news/steeled-resolve-2026?hl=eng",
    lastChecked: "2026-08-27", note: "Send a Pokémon to Pokémon HOME or a compatible Pokémon: Let's Go game to obtain and recharge the Mystery Box."
  }],
  Gimmighoul: [{
    label: "Coin Bag", kind: "tool", likelihood: "reliable", ongoing: true,
    source: "Pokémon GO: Connect to Pokémon Scarlet and Violet", sourceUrl: "https://pokemongo.com/post/gocoin",
    lastChecked: "2026-08-27", note: "Send a Postcard to Pokémon Scarlet or Violet to use the Coin Bag and encounter Roaming Form Gimmighoul."
  }]
};

const raidAvailabilityByTarget = {
  Regice: [{ ...currentRaidRotation, label: "Five-star raid", note: "Regice is in the current five-star raid rotation." }],
  Regirock: [{ ...currentRaidRotation, label: "Five-star raid", note: "Regirock is in the current five-star raid rotation." }],
  Registeel: [{ ...currentRaidRotation, label: "Five-star raid", note: "Registeel is in the current five-star raid rotation." }]
};

const acquisitionByTarget = {
  Meltan: ["Open a Mystery Box to create a repeatable Meltan encounter window."],
  Gimmighoul: ["Use a Coin Bag for Roaming Form Gimmighoul; collect 999 Gimmighoul Coins to evolve Gholdengo."]
};

const slug = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const makeRecord = (line, type) => {
  const [catchTarget, great, ultra, master] = line.split("|");
  const aliases = type === "raid" ? (raidAliases[catchTarget] || [catchTarget]) : families[catchTarget];
  if (!aliases) throw new Error(`Missing aliases for ${catchTarget}`);
  return {
    id: slug(catchTarget),
    catchTarget,
    type,
    searchAliases: [...new Set(aliases)],
    pvpTargets: displayOverrides[catchTarget] || (aliases.filter((name) => name !== catchTarget).slice(0, 4).length
      ? aliases.filter((name) => name !== catchTarget).slice(0, 4)
      : [catchTarget]),
    leagues: { great: great === "Y", ultra: ultra === "Y", master: master === "Y" },
    rankings: [],
    availability: type === "catch" ? (availabilityByTarget[catchTarget] || []) : (raidAvailabilityByTarget[catchTarget] || []),
    acquisitionNotes: type === "raid" ? ["Catch from a raid rotation when available."] : (acquisitionByTarget[catchTarget] || []),
    notes: master === "Y" ? ["For Master League, prioritize high IVs and XL Candy."] : []
  };
};

const data = {
  meta: {
    updated: "2026-08-27",
    rankingSource: "PvPoke Open League rankings",
    rankingSourceUrl: "https://pvpoke.com/rankings/",
    rankingSnapshotDate: null,
    availabilityLastChecked: "2026-08-27",
    note: "League flags are seeded from the project baseline. Run npm run refresh to attach a current PvPoke ranking snapshot."
  },
  families: baseline.split("\n").map((line) => makeRecord(line, "catch")),
  raids: raidsText.split("\n").map((line) => makeRecord(line, "raid"))
};

await writeFile(new URL("../data.json", import.meta.url), `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Wrote ${data.families.length} catch families and ${data.raids.length} raid targets.`);
