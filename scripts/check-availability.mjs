import { readFile } from "node:fs/promises";
import { activeAvailability, upcomingAvailability } from "../core.js";

const data = JSON.parse(await readFile(new URL("../data.json", import.meta.url), "utf8"));
const now = new Date();
const records = [...data.families, ...data.raids];
const temporaryActive = records.flatMap((record) => activeAvailability(record, now).filter((item) => !item.ongoing));
const temporaryUpcoming = records.flatMap((record) => upcomingAvailability(record, now, 7));
const lastChecked = new Date(`${data.meta.availabilityLastChecked}T12:00:00`);
const ageDays = Math.floor((now - lastChecked) / (24 * 60 * 60 * 1000));
const stale = ageDays > 3 || (!temporaryActive.length && !temporaryUpcoming.length);

console.log(`Availability last checked: ${data.meta.availabilityLastChecked} (${ageDays} days ago)`);
console.log(`Temporary opportunities active: ${temporaryActive.length}`);
console.log(`Temporary opportunities starting within 7 days: ${temporaryUpcoming.length}`);

if (stale) {
  console.error("Availability needs a source review: the check is older than three days or no dated opportunity is active/upcoming.");
  process.exitCode = 1;
} else {
  console.log("Availability coverage is current.");
}
