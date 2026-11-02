window.createReleaseCalendar = function ({ controls, results, apply, sync, kind = "azure", productLabel = value => value }) {
  const serviceName = { azure: "Azure Updates", m365: "Microsoft 365 Roadmap", aws: "AWS Updates" }[kind];
  const dateLabel = kind === "m365" ? "Feed dates" : "Publication dates";
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  let month = currentMonth;
  let view = "list";
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const button = (text, action) => {
    const element = node("button", text, "news-action");
    element.type = "button";
    element.addEventListener("click", action);
    return element;
  };
  const switcher = node("div", undefined, "news-actions");
  switcher.setAttribute("role", "group");
  switcher.setAttribute("aria-label", "Announcement view");
  const change = () => { apply(); sync(); };
  const listButton = button("List view", () => { view = "list"; change(); });
  const calendarButton = button("Calendar view", () => { view = "calendar"; change(); });
  const diagramButton = button("Diagram view", () => { view = "diagram"; change(); });
  switcher.append(listButton, calendarButton, diagramButton);
  controls.prepend(switcher);
  const panel = node("section", undefined, "release-calendar");
  panel.setAttribute("aria-label", "Monthly publication calendar");
  panel.hidden = true;
  const toolbar = node("div", undefined, "calendar-toolbar");
  const label = node("label", "Month (UTC)");
  const input = node("input");
  input.type = "month";
  input.value = month;
  input.setAttribute("aria-label", "Calendar month (UTC)");
  label.append(input);
  const step = (offset) => {
    const date = new Date(`${month}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    month = date.toISOString().slice(0, 7);
    input.value = month;
    change();
  };
  toolbar.append(button("Previous month", () => step(-1)), label,
    button("Next month", () => step(1)),
    button("This month", () => { month = currentMonth; input.value = month; change(); }));
  input.addEventListener("change", () => {
    if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(input.value)) {
      input.value = month;
      window.SiteUX.notice("Choose a valid calendar month.");
      return;
    }
    month = input.value;
    change();
  });
  const heading = node("h2");
  const help = node("p", `${dateLabel} (UTC), not planned release dates. Only announcements retained in the current snapshot are available.`, "news-help");
  const grid = node("div", undefined, "calendar-grid");
  const diagrams = node("div", undefined, "release-diagrams");
  panel.append(toolbar, heading, help, grid, diagrams);
  results.before(panel);
  function chart(title, counts, limit) {
    const section = node("section", undefined, "release-chart");
    section.append(node("h3", title));
    const entries = [...counts].slice(0, limit);
    if (!entries.length) { section.append(node("p", "No matching announcements.")); return section; }
    const max = Math.max(...entries.map(([, count]) => count), 1);
    const list = node("ul");
    entries.forEach(([label, count]) => {
      const row = node("li");
      row.append(node("span", label, "chart-label"), node("strong", count.toLocaleString("en-US")));
      const track = node("div", undefined, "chart-track");
      const bar = node("div", undefined, "chart-bar");
      bar.style.width = `${count / max * 100}%`;
      track.setAttribute("aria-hidden", "true");
      track.append(bar); row.append(track); list.append(row);
    });
    section.append(list);
    return section;
  }
  function renderDiagrams(items) {
    const months = new Map(), statuses = new Map(), products = new Map();
    items.forEach(item => {
      const key = new Date(item.pubDate).toISOString().slice(0, 7);
      months.set(key, (months.get(key) || 0) + 1);
      const groups = kind === "aws" ? (item.categories.length ? item.categories : ["Not recorded"]) : [item.statusLabel || "Not recorded"];
      groups.forEach(group => statuses.set(group, (statuses.get(group) || 0) + 1));
      item.products.forEach(product => {
        const label = kind === "aws" ? productLabel(product) : product;
        products.set(label, (products.get(label) || 0) + 1);
      });
    });
    const chronological = [...months].sort(([a], [b]) => a.localeCompare(b));
    const range = chronological.length ? `${chronological[0][0]} to ${chronological.at(-1)[0]}` : "No dated announcements";
    const summary = node("div", undefined, "diagram-summary");
    [["Matching updates", items.length], ["Products", products.size], [`${kind === "m365" ? "Feed" : "Publication"} range (UTC)`, range]].forEach(([label, value]) => {
      const stat = node("div");
      stat.append(node("strong", value), node("span", label));
      summary.append(stat);
    });
    // Include empty months between the first and last retained publication.
    const series = new Map();
    if (chronological.length) {
      const cursor = new Date(`${chronological[0][0]}-01T00:00:00Z`);
      const end = chronological.at(-1)[0];
      while (cursor.toISOString().slice(0, 7) <= end) {
        const key = cursor.toISOString().slice(0, 7);
        series.set(key, months.get(key) || 0);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }
    diagrams.replaceChildren(summary,
      chart("Updates by Month", series),
      chart(kind === "aws" ? "Updates by Category" : "Updates by Status", new Map([...statuses].sort((a, b) => b[1] - a[1]))),
      chart("Top 10 Products", new Map([...products].sort((a, b) => b[1] - a[1])), 10));
    diagrams.append(node("p", `Counts use ${dateLabel.toLowerCase()} (UTC), not planned release dates. One update can mention several products or categories, so their counts may exceed the number of updates. An empty month means no retained matching entries, not necessarily no announcements.`, "news-help"));
  }
  return {
    get active() { return view !== "list"; },
    get summary() { return view === "diagram" ? `All retained ${dateLabel.toLowerCase()} (UTC)` : "Calendar month (UTC)"; },
    matches(iso) { return Number.isFinite(Date.parse(iso)) && (view === "diagram" || new Date(iso).toISOString().slice(0, 7) === month); },
    sync(params) {
      params.delete("view"); params.delete("month");
      if (view !== "list") params.set("view", view);
      if (view === "calendar") params.set("month", month);
    },
    restore(params) {
      view = ["calendar", "diagram"].includes(params.get("view")) ? params.get("view") : "list";
      const value = params.get("month");
      month = value && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value) ? value : currentMonth;
      input.value = month;
    },
    render(items) {
      listButton.setAttribute("aria-pressed", String(view === "list"));
      calendarButton.setAttribute("aria-pressed", String(view === "calendar"));
      diagramButton.setAttribute("aria-pressed", String(view === "diagram"));
      panel.hidden = view === "list";
      results.hidden = view !== "list";
      const period = document.getElementById("lastUpdate");
      period.disabled = view !== "list";
      if (view === "list") return;
      toolbar.hidden = view !== "calendar";
      grid.hidden = view !== "calendar";
      diagrams.hidden = view !== "diagram";
      panel.setAttribute("aria-label", view === "diagram" ? "Announcement statistics" : "Monthly publication calendar");
      if (view === "diagram") {
        heading.textContent = `${serviceName} · Statistics`;
        help.textContent = `Statistics cover all retained ${dateLabel.toLowerCase()} and respect search, status/category, product and favorites filters. The current snapshot is not a complete historical archive.`;
        renderDiagrams(items);
        return;
      }
      const first = new Date(`${month}-01T00:00:00Z`);
      heading.textContent = first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
      grid.replaceChildren();
      const byDay = new Map();
      items.forEach(item => {
        const key = new Date(item.pubDate).getUTCDate();
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(item);
      });
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(day => grid.append(node("div", day, "calendar-weekday")));
      const offset = (first.getUTCDay() + 6) % 7;
      for (let i = 0; i < offset; i++) {
        const blank = node("div", undefined, "calendar-blank");
        blank.setAttribute("aria-hidden", "true");
        grid.append(blank);
      }
      const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
      for (let day = 1; day <= days; day++) {
        const section = node("section", undefined, "calendar-day");
        const date = `${month}-${String(day).padStart(2, "0")}`;
        const title = node("h3");
        const time = node("time", String(day));
        time.dateTime = date;
        if (date === today.toISOString().slice(0, 10)) time.setAttribute("aria-current", "date");
        title.append(time);
        section.setAttribute("aria-label", date);
        section.append(title);
        const entries = byDay.get(day) || [];
        section.append(node("p", `${entries.length} update${entries.length === 1 ? "" : "s"}`, "calendar-count"));
        const list = node("ul");
        entries.forEach(item => {
          const entry = node("li");
          const link = node("a", item.title);
          link.href = item.link; link.target = "_blank"; link.rel = "noopener noreferrer";
          link.title = `${item.title}${item.statusLabel ? " · " + item.statusLabel : ""}`;
          entry.append(link); list.append(entry);
        });
        section.append(list); grid.append(section);
      }
      if (!items.length) help.textContent = "No announcements match this month and the active filters. Only dates retained in the snapshot are available.";
      else help.textContent = `${dateLabel} (UTC), not planned release dates. Only announcements retained in the current snapshot are available.`;
    },
  };
};
