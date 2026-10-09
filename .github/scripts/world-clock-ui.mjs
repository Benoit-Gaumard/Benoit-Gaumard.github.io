import { readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enhancePage } from "../../site-ui.mjs";

const countryData = JSON.parse(readFileSync(new URL("../../world-clock/timezone-countries.json", import.meta.url), "utf8"));

export function zonedParts(instant, timeZone) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute) };
}
export function wallClockUTC(parts) {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour || 0, parts.minute || 0, 0, 0);
  return date.getTime();
}
export function localTimeCandidates(value, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return [];
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const parts = { year, month, day, hour, minute }, guess = wallClockUTC(parts), check = new Date(guess);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day || hour > 23 || minute > 59) return [];
  const offsets = new Set();
  for (let shift = -48; shift <= 48; shift += 6) {
    const instant = guess + shift * 3600000;
    offsets.add(wallClockUTC(zonedParts(instant, timeZone)) - instant);
  }
  return [...offsets].map(offset => guess - offset).filter(instant => {
    const actual = zonedParts(instant, timeZone);
    return Object.keys(parts).every(key => parts[key] === actual[key]);
  }).sort((a, b) => a - b);
}
export function dayDifference(instant, zone, reference = "Europe/Paris") {
  const a = zonedParts(instant, zone), b = zonedParts(instant, reference);
  return Math.round((wallClockUTC({ ...a, hour: 0, minute: 0 }) - wallClockUTC({ ...b, hour: 0, minute: 0 })) / 86400000);
}

export function calendarFacts(instant, timeZone = "Europe/Paris") {
  const parts = zonedParts(instant, timeZone);
  const today = wallClockUTC({ ...parts, hour: 0, minute: 0 });
  const start = wallClockUTC({ year: parts.year, month: 1, day: 1 });
  const daysInYear = Math.round((wallClockUTC({ year: parts.year + 1, month: 1, day: 1 }) - start) / 86400000);
  const dayOfYear = Math.round((today - start) / 86400000) + 1;
  const thursday = new Date(today);
  thursday.setUTCDate(thursday.getUTCDate() + 3 - (thursday.getUTCDay() + 6) % 7);
  const weekYear = thursday.getUTCFullYear();
  const first = new Date(wallClockUTC({ year: weekYear, month: 1, day: 4 }));
  first.setUTCDate(first.getUTCDate() + 3 - (first.getUTCDay() + 6) % 7);
  return { dayOfYear, daysInYear, percentage: dayOfYear / daysInYear * 100, weekOfYear: 1 + Math.round((thursday - first) / 604800000), weekYear };
}

export function offsetForZone(zone, instant) {
  return new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(new Date(instant))
    .find(part => part.type === "timeZoneName")?.value || "Offset unavailable";
}

export function countryForZone(zone, catalogue) {
  const key = Object.hasOwn(catalogue.zones, zone) ? zone : Object.keys(catalogue.zones).find(key => key.toLowerCase() === zone.toLowerCase());
  const code = catalogue.zones[key];
  return code ? { code, ...catalogue.countries[code] } : null;
}

function clockRuntime({ zonedParts, wallClockUTC, localTimeCandidates, dayDifference, calendarFacts, offsetForZone, countryForZone, countryData }) {
  const PARIS = "Europe/Paris", VIEW_KEY = "world-clock-view-mode", CITIES_KEY = "world-clock-cities";
  const DEFAULTS = [
    { city: "London", tz: "Europe/London" }, { city: "New York", tz: "America/New_York" },
    { city: "Seattle", tz: "America/Los_Angeles" }, { city: "Houston", tz: "America/Chicago" },
    { city: "Hyderabad", tz: "Asia/Kolkata" }, { city: "Bengaluru", tz: "Asia/Kolkata" },
    { city: "Johannesburg", tz: "Africa/Johannesburg" },
  ];
  const el = Object.fromEntries(["parisTime", "parisDate", "parisOffset", "clockMode", "timezoneGrid", "zoneInput", "zoneOptions", "addZone", "zoneError", "meetingBase", "meetingTime", "meetingMinutes", "meetingMinuteLabel", "occurrenceField", "meetingOccurrence", "previewMeeting", "liveClock", "copyTimes", "meetingStatus", "dayOfYear", "weekOfYear", "yearProgress", "weekContext"].map(id => [id, document.getElementById(id)]));
  const state = { cities: [...DEFAULTS], preview: null, view: "cards" };
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function validZone(zone) { try { new Intl.DateTimeFormat("en", { timeZone: zone }).format(); return true; } catch { return false; } }
  function cityName(zone) { return zone.split("/").at(-1).replace(/_/g, " "); }
  function countryFlag(zone) {
    const country = countryForZone(zone, countryData);
    if (!country) {
      const globe = node("span", undefined, "clock-flag-neutral");
      globe.setAttribute("role", "img");
      globe.setAttribute("aria-label", "No country flag for this timezone");
      globe.title = "No country flag for this timezone";
      globe.innerHTML = '<svg width="24" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>';
      return globe;
    }
    const flag = node("img", undefined, "country-flag");
    flag.src = country.flag; flag.alt = country.name; flag.title = country.name;
    flag.width = 24; flag.height = 18;
    flag.addEventListener("error", () => {
      console.warn(`Country flag unavailable: ${country.flag}`);
      const fallback = node("span", country.code, "clock-flag-neutral");
      fallback.title = `${country.name}: flag unavailable`;
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", fallback.title);
      flag.replaceWith(fallback);
    }, { once: true });
    return flag;
  }
  function time(zone, instant) { return new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(instant)); }
  function date(zone, instant) { return new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", year: "numeric", month: "short", day: "numeric" }).format(new Date(instant)); }
  function localInput(instant, zone) {
    const parts = zonedParts(instant, zone), pad = value => String(value).padStart(2, "0");
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
  }
  try {
    const saved = localStorage.getItem(CITIES_KEY);
    if (saved) {
      const cities = JSON.parse(saved);
      if (!Array.isArray(cities) || cities.some(city => !city || typeof city.city !== "string" || !city.city.trim() || typeof city.tz !== "string" || !validZone(city.tz))) throw new Error("Invalid saved city list");
      state.cities = cities;
    }
    state.view = localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards";
  } catch (error) { console.warn("Clock preferences unavailable.", error); SiteUX.notice("Clock preferences could not be read; defaults are shown."); }
  let suggestions = [];
  try { suggestions = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : []; }
  catch (error) { console.warn("Timezone suggestions unavailable; IANA names can still be entered.", error); }
  suggestions = [...new Set([PARIS, "UTC", ...DEFAULTS.map(city => city.tz), ...suggestions])];
  suggestions.forEach(zone => { const option = new Option(cityName(zone), zone); option.label = cityName(zone); el.zoneOptions.append(option); });
  function saveCities() {
    try { localStorage.setItem(CITIES_KEY, JSON.stringify(state.cities)); }
    catch (error) { console.warn("Cities could not be saved.", error); SiteUX.notice("City selection changed for this page only; storage is unavailable."); }
  }
  function renderCities() {
    el.timezoneGrid.replaceChildren();
    state.cities.forEach((city, index) => {
      const article = node("article", undefined, "world-zone");
      article.dataset.zoneIndex = index;
      const header = node("div", undefined, "world-zone-head");
      const place = node("div", undefined, "world-place-heading");
      const heading = node("h3", undefined, "world-city-title");
      heading.append(countryFlag(city.tz), node("span", city.city));
      const currentOffset = node("span", "", "timezone-offset");
      currentOffset.dataset.field = "offset";
      currentOffset.title = "GMT offset at the displayed instant";
      place.append(heading, currentOffset);
      header.append(place);
      const remove = node("button", "Remove", "clock-action");
      remove.type = "button"; remove.setAttribute("aria-label", `Remove ${city.city}`);
      remove.addEventListener("click", () => { state.cities.splice(index, 1); saveCities(); renderCities(); el.zoneInput.focus({ preventScroll: true }); });
      header.append(remove);
      const clock = node("p", "", "world-zone-time"); clock.dataset.field = "time";
      const day = node("p", "", "world-zone-date"); day.dataset.field = "date";
      const shift = node("p", "", "world-zone-shift"); shift.dataset.field = "shift";
      const details = node("details", undefined, "world-zone-details");
      details.append(node("summary", "Timezone details"), node("p", `IANA zone: ${city.tz}`));
      article.append(header, clock, day, shift, details); el.timezoneGrid.append(article);
    });
    if (!state.cities.length) el.timezoneGrid.append(node("p", "Add a city to compare it with Paris."));
    const chosen = el.meetingBase.value || PARIS;
    el.meetingBase.replaceChildren(new Option("Paris — Europe/Paris", PARIS), new Option("UTC", "UTC"));
    const seen = new Set([PARIS, "UTC"]);
    state.cities.forEach(city => { if (!seen.has(city.tz)) { seen.add(city.tz); el.meetingBase.add(new Option(`${city.city} — ${city.tz}`, city.tz)); } });
    if (!seen.has(chosen) && validZone(chosen)) { seen.add(chosen); el.meetingBase.add(new Option(`${chosen} (planning base)`, chosen)); }
    el.meetingBase.value = seen.has(chosen) ? chosen : PARIS;
    el.timezoneGrid.classList.toggle("list-view", state.view === "list");
    tick();
  }
  function tick() {
    const instant = state.preview ?? Date.now();
    el.parisTime.textContent = time(PARIS, instant);
    el.parisDate.textContent = date(PARIS, instant);
    el.parisOffset.textContent = offsetForZone(PARIS, instant);
    el.clockMode.textContent = state.preview === null ? "Live clocks" : `Meeting preview — ${new Date(instant).toISOString()} (not live)`;
    el.liveClock.disabled = state.preview === null;
    const facts = calendarFacts(instant, PARIS);
    el.dayOfYear.textContent = facts.dayOfYear;
    el.yearProgress.textContent = `of ${facts.daysInYear} · ${facts.percentage.toFixed(1)}%`;
    el.weekOfYear.textContent = facts.weekOfYear;
    el.weekContext.textContent = `ISO week · ${facts.weekYear}`;
    el.timezoneGrid.querySelectorAll("[data-zone-index]").forEach(article => {
      const city = state.cities[Number(article.dataset.zoneIndex)];
      article.querySelector('[data-field="time"]').textContent = time(city.tz, instant);
      article.querySelector('[data-field="date"]').textContent = date(city.tz, instant);
      const difference = dayDifference(instant, city.tz);
      article.querySelector('[data-field="shift"]').textContent = difference === 0 ? "Same local date as Paris" : `${difference > 0 ? "+" : ""}${difference} day${Math.abs(difference) === 1 ? "" : "s"} relative to Paris`;
      article.querySelector('[data-field="offset"]').textContent = offsetForZone(city.tz, instant);
    });
  }
  function addCity() {
    const entered = el.zoneInput.value.trim();
    const alias = [...DEFAULTS, { city: "Paris", tz: PARIS }].find(city => city.city.toLowerCase() === entered.toLowerCase());
    const matches = suggestions.filter(zone => cityName(zone).toLowerCase() === entered.toLowerCase());
    const knownZone = Object.keys(countryData.zones).find(zone =>
      /^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific)\//.test(zone)
      && zone.toLowerCase() === entered.toLowerCase());
    const zone = alias?.tz || (validZone(entered) ? knownZone || new Intl.DateTimeFormat("en", { timeZone: entered }).resolvedOptions().timeZone : matches.length === 1 ? matches[0] : "");
    if (!zone || !validZone(zone)) { el.zoneInput.setAttribute("aria-invalid", "true"); el.zoneError.textContent = "Choose a listed IANA timezone, for example Asia/Tokyo."; el.zoneInput.focus(); return; }
    const city = alias?.city || cityName(zone);
    if (zone === PARIS || state.cities.some(value => value.tz === zone && value.city === city)) { el.zoneError.textContent = `${city} is already shown.`; return; }
    el.zoneInput.setAttribute("aria-invalid", "false"); el.zoneError.textContent = "";
    state.cities.push({ city, tz: zone }); saveCities(); renderCities(); el.zoneInput.value = "";
    SiteUX.notice(`${city} added. The IANA timezone determines seasonal offsets.`);
  }
  function preview() {
    const value = el.meetingTime.value, zone = el.meetingBase.value;
    const candidates = localTimeCandidates(value, zone);
    const previous = el.meetingOccurrence.value;
    el.meetingOccurrence.replaceChildren(new Option("Choose an occurrence", ""));
    candidates.forEach((instant, index) => el.meetingOccurrence.add(new Option(`${index + 1}: ${offsetForZone(zone, instant)} — ${new Date(instant).toISOString()}`, String(instant))));
    el.occurrenceField.hidden = candidates.length < 2;
    el.meetingTime.setAttribute("aria-invalid", String(!candidates.length));
    if (!candidates.length) { el.meetingStatus.textContent = `This is not a valid local time in ${zone}, or it falls in a daylight-saving gap. The displayed time has not changed.`; return; }
    if (candidates.some(instant => String(instant) === previous)) el.meetingOccurrence.value = previous;
    if (candidates.length > 1 && !el.meetingOccurrence.value) { el.meetingStatus.textContent = "This local time occurs twice. Choose the intended UTC offset; the displayed time has not changed."; return; }
    state.preview = candidates.length === 1 ? candidates[0] : Number(el.meetingOccurrence.value);
    tick();
    const parts = zonedParts(state.preview, zone);
    el.meetingMinutes.value = parts.hour * 60 + parts.minute;
    el.meetingMinuteLabel.textContent = `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} in ${zone}`;
    el.meetingMinutes.setAttribute("aria-valuetext", el.meetingMinuteLabel.textContent);
    el.meetingStatus.textContent = `Preview set to ${new Date(state.preview).toISOString()}. All clocks show that same instant.`;
  }
  el.addZone.addEventListener("click", addCity);
  el.zoneInput.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); addCity(); } });
  el.zoneInput.addEventListener("input", () => { el.zoneInput.removeAttribute("aria-invalid"); el.zoneError.textContent = ""; });
  el.previewMeeting.addEventListener("click", preview);
  el.meetingTime.addEventListener("change", preview);
  el.meetingBase.addEventListener("change", () => { el.meetingOccurrence.value = ""; preview(); });
  el.meetingOccurrence.addEventListener("change", preview);
  el.meetingMinutes.addEventListener("input", () => {
    const minutes = Number(el.meetingMinutes.value);
    el.meetingTime.value = el.meetingTime.value.slice(0, 10) + `T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    preview();
  });
  el.liveClock.addEventListener("click", () => { state.preview = null; tick(); el.meetingStatus.textContent = "Live clocks resumed."; });
  el.copyTimes.addEventListener("click", () => {
    const instant = state.preview ?? Date.now();
    const lines = [`${state.preview === null ? "Live comparison" : "Meeting preview"}: ${new Date(instant).toISOString()}`,
      ...[{ city: "Paris", tz: PARIS }, ...state.cities].map(city => `${city.city}: ${date(city.tz, instant)} ${time(city.tz, instant)} — ${city.tz} (${offsetForZone(city.tz, instant)})`)];
    SiteUX.copy(lines.join("\n"), "Time comparison", el.copyTimes);
  });
  document.querySelectorAll("[data-clock-view]").forEach(control => {
    control.setAttribute("aria-pressed", String(control.dataset.clockView === state.view));
    control.addEventListener("click", () => {
      state.view = control.dataset.clockView; el.timezoneGrid.classList.toggle("list-view", state.view === "list");
      document.querySelectorAll("[data-clock-view]").forEach(button => button.setAttribute("aria-pressed", String(button === control)));
      try { localStorage.setItem(VIEW_KEY, state.view); } catch (error) { console.warn("Clock view could not be saved.", error); SiteUX.notice("View changed for this page only."); }
    });
  });
  renderCities();
  el.meetingTime.value = localInput(Date.now(), PARIS);
  const initial = zonedParts(Date.now(), PARIS);
  el.meetingMinutes.value = initial.hour * 60 + initial.minute;
  el.meetingMinuteLabel.textContent = `${el.meetingTime.value.slice(11)} in ${PARIS}`;
  el.meetingMinutes.setAttribute("aria-valuetext", el.meetingMinuteLabel.textContent);
  setInterval(() => { if (!document.hidden) tick(); }, 1000);
  document.getElementById("currentYear").textContent = new Date().getFullYear();
  const back = document.getElementById("backToTop");
  window.addEventListener("scroll", () => back.classList.toggle("visible", scrollY > 600), { passive: true });
  back.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
}

const CSS = `
 .world-overview{display:grid;grid-template-columns:minmax(0,2fr) repeat(2,minmax(0,1fr));gap:1rem;margin:1rem 0;}
 .world-primary,.clock-calendar-card{min-width:0;padding:1.25rem;border:1px solid var(--cp-border);border-radius:10px;background:var(--cp-surface);}
 .world-primary h2{font-size:1.35rem;margin:0;}
 .clock-calendar-card{display:flex;flex-direction:column;justify-content:center;gap:.5rem;}
 .clock-calendar-card h2{font-size:.9rem;line-height:1.4;color:var(--cp-text-muted);margin:0;}
 .clock-calendar-value{font-size:2.5rem;line-height:1.2;font-weight:700;font-variant-numeric:tabular-nums;margin:0;}
 .clock-calendar-note{font-size:.85rem;line-height:1.5;color:var(--cp-text-muted);font-variant-numeric:tabular-nums;margin:0;}
 .world-primary-time{font-size:clamp(2.25rem,9vw,4.5rem);font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2;margin:.25rem 0;}
 .clock-help,.world-zone-date,.world-zone-shift{color:var(--cp-text-muted);font-size:.9rem;line-height:1.5;}
 .clock-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:.75rem 0;}
 .clock-action{display:inline-flex;align-items:center;justify-content:center;min-height:2.75rem;padding:.5rem .75rem;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface);color:var(--cp-text);font:inherit;font-size:.85rem;cursor:pointer;}
 .clock-action[aria-pressed="true"]{border-color:var(--cp-accent);background:var(--cp-accent-soft);}
 .clock-planner>summary,.world-zone-details>summary{min-height:2.75rem;padding-block:.65rem;color:var(--cp-link);cursor:pointer;font-size:.9rem;}
 .clock-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;max-width:55rem;}
 .clock-field{min-width:0;}.clock-field label{display:block;margin:.5rem 0 .4rem;font-size:.85rem;font-weight:600;}
 .clock-field input:not([type="range"]),.clock-field select{width:100%;height:3rem;min-width:0;padding:.5rem .75rem;border:1px solid var(--cp-border-strong);border-radius:8px;background:var(--cp-surface);color:var(--cp-text);}
 .clock-field input[type="range"]{width:100%;min-height:2.75rem;accent-color:var(--cp-accent);}
 .clock-range{grid-column:1/-1;}
 .world-zones{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(20rem,100%),1fr));gap:1rem;}
 .world-zone{padding:1rem;border:1px solid var(--cp-border);border-radius:8px;background:var(--cp-surface);min-width:0;}
 .world-zone-head{display:flex;gap:.5rem;align-items:center;justify-content:space-between;}.world-zone h3{margin:0;font-size:1.05rem;overflow-wrap:anywhere;}
 .world-place-heading{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;min-width:0;}
 .world-city-title{display:flex;align-items:center;gap:.5rem;min-width:0;max-width:100%;}
 .world-city-title span{min-width:0;overflow-wrap:anywhere;}
 .country-flag,.clock-flag-neutral{display:inline-flex;align-items:center;justify-content:center;flex:none;width:24px;height:18px;object-fit:contain;}
 .clock-flag-neutral{font-size:.75rem;color:var(--cp-text-muted);}
 .timezone-offset{display:inline-flex;align-items:center;padding:.2rem .5rem;border:1px solid var(--cp-border-strong);border-radius:999px;background:var(--cp-accent-soft);color:var(--cp-link);font-size:.8rem;font-weight:650;white-space:nowrap;font-variant-numeric:tabular-nums;}
 .world-zone-head>.clock-action{flex:none;}
 .world-zone-time{font-size:2rem;font-weight:700;font-variant-numeric:tabular-nums;margin:.5rem 0;}
 .world-zone-details p{font-size:.85rem;overflow-wrap:anywhere;}
 .world-zones.list-view{grid-template-columns:minmax(0,1fr);}
 .world-zones.list-view .world-zone{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,2fr);gap:.5rem 1rem;align-items:center;}
 #zoneError{color:var(--cp-danger);}#meetingTime[aria-invalid="true"],#zoneInput[aria-invalid="true"]{border-color:var(--cp-danger);}
 @media(max-width:64rem){.world-overview{grid-template-columns:repeat(2,minmax(0,1fr));}.world-primary{grid-column:1/-1;}}
 @media(max-width:32rem){.clock-calendar-card{padding:1rem;}}
 @media(max-width:48rem){.clock-fields,.world-zones,.world-zones.list-view .world-zone{grid-template-columns:minmax(0,1fr);}}
`;
const MARKUP = `<!-- world-clock-view:start -->
 <div class="world-overview">
 <section class="world-primary" aria-labelledby="parisHeading"><div class="world-place-heading"><h2 id="parisHeading" class="world-city-title"><img class="country-flag" src="/flags/fr.png" alt="" width="24" height="18"><span>Paris, France</span></h2><span id="parisOffset" class="timezone-offset" title="GMT offset at the displayed instant">--</span></div><p id="clockMode" class="clock-help">Live clocks</p><p class="world-primary-time" id="parisTime" aria-live="off">--:--:--</p><p id="parisDate" class="clock-help" aria-live="off"></p><p class="clock-help">Europe/Paris</p></section>
 <section class="clock-calendar-card" aria-labelledby="dayOfYearHeading"><h2 id="dayOfYearHeading">Day of the Year</h2><p id="dayOfYear" class="clock-calendar-value" aria-live="off">--</p><p id="yearProgress" class="clock-calendar-note"></p></section>
 <section class="clock-calendar-card" aria-labelledby="weekOfYearHeading"><h2 id="weekOfYearHeading">Week of the Year</h2><p id="weekOfYear" class="clock-calendar-value" aria-live="off">--</p><p id="weekContext" class="clock-calendar-note"></p></section>
 </div>
 <details class="clock-planner" id="meetingPlanner"><summary>Plan a meeting across timezones</summary><p class="clock-help">Choose a local date and time in the base timezone. Each city uses its offset for that instant, including seasonal changes. Ambiguous or nonexistent local times require an explicit choice.</p>
 <div class="clock-fields"><div class="clock-field"><label for="meetingBase">Base timezone</label><select id="meetingBase"></select></div><div class="clock-field"><label for="meetingTime">Meeting date and local time</label><input id="meetingTime" type="datetime-local" step="60" aria-describedby="meetingStatus"></div>
 <div class="clock-field clock-range"><label for="meetingMinutes">Meeting time slider</label><input id="meetingMinutes" type="range" min="0" max="1439" step="1"><output id="meetingMinuteLabel" for="meetingMinutes"></output></div>
 <div class="clock-field clock-range" id="occurrenceField" hidden><label for="meetingOccurrence">This time occurs twice: choose an offset</label><select id="meetingOccurrence"><option value="">Choose an occurrence</option></select></div></div>
 <div class="clock-actions"><button class="clock-action" id="previewMeeting" type="button">Preview selected time</button><button class="clock-action" id="liveClock" type="button" disabled>Return to live time</button></div><p class="clock-help" id="meetingStatus" role="status" aria-live="polite"></p></details>
 <section aria-labelledby="comparisonHeading"><h2 id="comparisonHeading">Compare cities</h2><p class="clock-help">Dates are local to each city. Day differences are relative to Paris. GMT badges use the displayed instant, including seasonal changes; IANA names remain available in each detail.</p>
 <div class="clock-fields"><div class="clock-field"><label for="zoneInput">Add a city or IANA timezone</label><input id="zoneInput" list="zoneOptions" placeholder="Tokyo or Asia/Tokyo" aria-describedby="zoneError" autocomplete="off"><datalist id="zoneOptions"></datalist></div><div class="clock-actions"><button class="clock-action" id="addZone" type="button">Add city</button></div></div><p class="clock-help" id="zoneError" role="status"></p>
 <div class="clock-actions" role="group" aria-label="Clock view"><button class="clock-action" data-clock-view="cards" type="button" aria-pressed="true">Cards</button><button class="clock-action" data-clock-view="list" type="button" aria-pressed="false">List</button><button class="clock-action" id="copyTimes" type="button">Copy time comparison</button></div>
 <div class="world-zones" id="timezoneGrid" aria-live="off"></div></section>
 <!-- world-clock-view:end -->
`;

export function upgradeClock(source) {
  let html = source.replace(/\r+\n/g, "\n");
  if (html.includes("<!-- world-clock-view:start -->")) html = html.replace(/<!-- world-clock-view:start -->[\s\S]*?<!-- world-clock-view:end -->\n?/, MARKUP);
  else {
    const start = html.indexOf('    <section aria-label="Paris time">'), end = html.indexOf('    <section class="page-notes"', start);
    if (start < 0 || end < start) throw new Error("Clock markup guard");
    html = html.slice(0, start) + MARKUP + "\n" + html.slice(end);
  }
  const embeddedCountries = JSON.stringify({ countries: countryData.countries, zones: countryData.zones }).replace(/</g, "\\u003c");
  const script = `<script data-world-clock>(()=>{\n${[zonedParts, wallClockUTC, localTimeCandidates, dayDifference, calendarFacts, offsetForZone, countryForZone].map(fn => fn.toString()).join("\n")}\n(${clockRuntime.toString()})({zonedParts,wallClockUTC,localTimeCandidates,dayDifference,calendarFacts,offsetForZone,countryForZone,countryData:${embeddedCountries}});\n})();</script>`;
  if (html.includes("<script data-world-clock>")) html = html.replace(/<script data-world-clock>[\s\S]*?<\/script>/, () => script);
  else {
    const token = html.indexOf('    const VIEW_STORAGE_KEY = "world-clock-view-mode"'), start = html.lastIndexOf("<script>", token), end = html.indexOf("</script>", token);
    if (token < 0 || start < 0 || end < start) throw new Error("Clock script guard");
    html = html.slice(0, start) + script + html.slice(end + 9);
  }
  html = html.replace(/<style data-world-clock>[\s\S]*?<\/style>\n?/g, "").replace("</head>", `<style data-world-clock>${CSS}</style>\n</head>`);
  return enhancePage(html.replace(/\n/g, "\r\n"), { path: "/world-clock/" });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = join(process.cwd(), "world-clock", "index.html");
  await writeFile(file, upgradeClock(await readFile(file, "utf8")));
  console.log("World clock and meeting planner updated.");
}
