/**
 * Renders collected chat insights as a self-contained HTML report.
 *
 * One file, no build step, no runtime CDN dependency for the data - just fonts.
 * Light and dark are both first-class; the report remembers the toggle in
 * localStorage and falls back to the OS preference.
 */

const { clean } = require("./insights-data.cjs");

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

const fmtInt = (n) => (n == null ? "-" : Number(n).toLocaleString("en-US"));
const fmtMs = (n) =>
  n == null ? "-" : n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "s" : Math.round(n) + "ms";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function bar(value, max, extraClass = "") {
  const w = max > 0 ? Math.max(1.5, (value / max) * 100) : 0;
  return `<span class="bar ${extraClass}" style="--w:${w}%"></span>`;
}

function emptyState(text, hint) {
  return `<div class="empty">
    <span class="empty-mark" aria-hidden="true">/</span>
    <p>${esc(text)}</p>
    ${hint ? `<p class="empty-hint">${esc(hint)}</p>` : ""}
  </div>`;
}

/* ── KPI tiles ───────────────────────────────────────────────────────── */

function kpis(d) {
  const t = d.totals;
  const tiles = [
    { label: "Questions asked", value: fmtInt(t.questions), sub: `${d.daily.length} active day${d.daily.length === 1 ? "" : "s"}`, tone: "neutral" },
    { label: "Unique visitors", value: fmtInt(t.uniqueVisitors), sub: `${t.returning} returned`, tone: "neutral" },
    { label: "Approval rate", value: t.approval == null ? "-" : pct(t.approval * 100, 100) + "%", sub: `${t.rated} of ${t.questions} rated`, tone: t.approval == null ? "neutral" : t.approval >= 0.7 ? "good" : t.approval < 0.4 ? "bad" : "warn" },
    { label: "Median TTFT", value: fmtMs(d.timing.ttftP50), sub: `p95 ${fmtMs(d.timing.ttftP95)}`, tone: d.timing.ttftP50 == null ? "neutral" : d.timing.ttftP50 > 4000 ? "warn" : "good" },
    { label: "Cannot answer", value: fmtInt(d.unanswered.length), sub: d.unanswered.length ? "knowledge gaps" : "nothing missing", tone: d.unanswered.length ? "bad" : "good" },
    { label: "Thumbs down", value: fmtInt(t.thumbsDown), sub: `${t.neverRated} never rated`, tone: t.thumbsDown ? "bad" : "good" },
  ];
  return tiles
    .map(
      (k) => `<article class="kpi tone-${k.tone}">
        <p class="kpi-label">${esc(k.label)}</p>
        <p class="kpi-value">${esc(k.value)}</p>
        <p class="kpi-sub">${esc(k.sub)}</p>
      </article>`
    )
    .join("\n");
}

/* ── volume chart ────────────────────────────────────────────────────── */

function volume(d) {
  if (!d.daily.length) return emptyState("No activity in this window.");
  const max = Math.max(...d.daily.map((x) => x.asks), 1);
  return `<div class="chart" role="img" aria-label="Questions per day">
    ${d.daily
      .map(
        (day) => `<div class="chart-col" title="${esc(day._id)}: ${day.asks} question(s)">
          <span class="chart-num">${day.asks}</span>
          <span class="chart-bar" style="--h:${(day.asks / max) * 100}%"></span>
          <span class="chart-day">${esc(day._id.slice(5))}</span>
        </div>`
      )
      .join("\n")}
  </div>`;
}

/* ── action queue: the part Ravi actually acts on ────────────────────── */

function actionQueue(d) {
  const blocks = [];

  blocks.push(`<section class="panel panel-alert" id="gaps">
    <header class="panel-head">
      <h3>Cannot answer</h3>
      <span class="tag tag-bad">${d.unanswered.length}</span>
    </header>
    <p class="panel-note">Retrieval found nothing relevant, so the bot declined. These are gaps in the knowledge base, not bad answers.</p>
    ${
      d.unanswered.length
        ? `<ol class="qlist" data-filterable>
            ${d.unanswered
              .map(
                (q) => `<li class="qrow" data-search="${esc(q.question.toLowerCase())}">
                  <span class="qtext">${esc(q.question)}</span>
                  <span class="qmeta"><b>${q.n}×</b> · ${q.visitors} visitor${q.visitors === 1 ? "" : "s"}</span>
                </li>`
              )
              .join("\n")}
          </ol>`
        : emptyState("Every question so far matched something in the index.")
    }
  </section>`);

  blocks.push(`<section class="panel panel-warn" id="unhappy">
    <header class="panel-head">
      <h3>Answered, but disliked</h3>
      <span class="tag tag-warn">${d.disliked.length}</span>
    </header>
    <p class="panel-note">The facts were retrieved, but the response still landed badly. Fix the prompt or the source document, not the index.</p>
    ${
      d.disliked.length
        ? `<ol class="qlist" data-filterable>
            ${d.disliked
              .map(
                (q) => `<li class="qrow" data-search="${esc(q.question.toLowerCase())}">
                  <span class="qtext">${esc(q.question)}</span>
                  <span class="qmeta"><b>${q.n}×</b> disliked</span>
                </li>`
              )
              .join("\n")}
          </ol>`
        : emptyState("No thumbs down recorded.", "Either it is answering well, or nobody is rating.")
    }
  </section>`);

  return blocks.join("\n");
}

/* ── top questions table ─────────────────────────────────────────────── */

function topTable(d) {
  if (!d.topQuestions.length) return emptyState("No question statistics yet.");
  const max = Math.max(...d.topQuestions.map((q) => q.askCount), 1);
  return `<div class="tablewrap">
    <table class="grid sortable" id="topq">
      <thead><tr>
        <th data-sort="num">Asked</th>
        <th data-sort="text">Question</th>
        <th data-sort="num">Votes</th>
        <th data-sort="num">Approval</th>
        <th>Topics</th>
      </tr></thead>
      <tbody>
        ${d.topQuestions
          .map((q) => {
            const votes = q.thumbsUp + q.thumbsDown;
            const approval = votes ? pct(q.thumbsUp, votes) : null;
            const tone = approval == null ? "" : approval >= 70 ? "ok" : approval < 40 ? "bad" : "mid";
            return `<tr data-search="${esc(q.question.toLowerCase())}">
              <td class="num" data-num="${q.askCount}"><span class="cellbar">${bar(q.askCount, max)}<b>${q.askCount}</b></span></td>
              <td data-text="${esc(q.question.toLowerCase())}">${esc(clean(q.question, 110))}</td>
              <td class="num" data-num="${votes}">${votes || "-"}</td>
              <td class="num ${tone}" data-num="${approval ?? -1}">${approval == null ? "-" : approval + "%"}</td>
              <td class="pills">${(q.topics || []).slice(0, 3).map((t) => `<span class="pill">${esc(t)}</span>`).join("") || "<span class='dim'>-</span>"}</td>
            </tr>`;
          })
          .join("\n")}
      </tbody>
    </table>
  </div>`;
}

/* ── breakdown lists ─────────────────────────────────────────────────── */

function rankedList(rows, key, label, max) {
  if (!rows.length) return emptyState("Nothing recorded yet.");
  const m = max ?? Math.max(...rows.map((r) => key(r)), 1);
  return `<ul class="ranked">
    ${rows
      .map(
        (r) => `<li>
          <span class="ranked-label">${esc(r[key.name])}</span>
          ${bar(key.value(r), m)}
          <span class="ranked-val">${key.value(r)}</span>
        </li>`
      )
      .join("\n")}
  </ul>`;
}

/** Horizontal share-of-total list, used for device/browser splits. */
function dist(rows, label) {
  if (!rows.length) return emptyState("No data.");
  const total = rows.reduce((a, b) => a + b.n, 0);
  return `<ul class="dist">
    ${rows
      .map(
        (r) => `<li>
          <span class="dist-label">${esc(label(r))}</span>
          <span class="dist-track"><span class="dist-fill" style="--w:${(r.n / total) * 100}%"></span></span>
          <span class="dist-val">${pct(r.n, total)}%</span>
        </li>`
      )
      .join("\n")}
  </ul>`;
}

function breakdown(d) {
  const topicMax = d.topics.length ? Math.max(...d.topics.map((t) => t.asks), 1) : 1;
  const entMax = d.entities.length ? Math.max(...d.entities.map((e) => e.n), 1) : 1;

  return `
  <section class="panel" id="topics">
    <header class="panel-head"><h3>Topics probed</h3></header>
    ${
      d.topics.length
        ? `<ul class="ranked">
            ${d.topics
              .map(
                (t) => `<li>
                  <span class="ranked-label">${esc(t.topic)}${t.down ? `<span class="mini-bad">${t.down} down</span>` : ""}</span>
                  ${bar(t.asks, topicMax)}
                  <span class="ranked-val">${t.asks}</span>
                </li>`
              )
              .join("\n")}
          </ul>`
        : emptyState("No topics detected.", "Topics come from keyword matching, so unusual phrasing will not classify.")
    }
  </section>

  <section class="panel" id="entities">
    <header class="panel-head"><h3>Tech mentioned</h3></header>
    ${rankedList(d.entities, { name: "entity", value: (e) => e.n }, (e) => e.entity, entMax)}
  </section>

  <section class="panel" id="clusters">
    <header class="panel-head"><h3>Asked the same thing differently</h3></header>
    ${
      d.clusters.length
        ? `<div class="clusters">
            ${d.clusters
              .map(
                (c) => `<div class="cluster">
                  <p class="cluster-total">${c.total} asks · ${c.variants.length} phrasing${c.variants.length === 1 ? "" : "s"}</p>
                  <ul>${c.variants.map((v) => `<li><b>${v.n}×</b> ${esc(v.q)}</li>`).join("")}</ul>
                </div>`
              )
              .join("\n")}
          </div>`
        : emptyState("No repeated questions yet.")
    }
  </section>

  <section class="panel" id="signals">
    <header class="panel-head"><h3>Frustration signals</h3></header>
    ${
      d.negatives.length
        ? `<ul class="ranked">
            ${d.negatives
              .map(
                (n) => `<li>
                  <span class="ranked-label">${esc(n.signal.replace(/_/g, " "))}<span class="dim"> — "${esc(n.sample)}"</span></span>
                  <span class="ranked-val">${n.count}</span>
                </li>`
              )
              .join("\n")}
          </ul>`
        : emptyState("None detected.")
    }
  </section>`;
}

/* ── audience + performance ──────────────────────────────────────────── */

function audience(d) {
  const geoRows = d.geo.filter((g) => g.country);
  return `
  <section class="panel" id="where">
    <header class="panel-head"><h3>Where they are</h3></header>
    ${
      geoRows.length
        ? `<ul class="ranked">
            ${geoRows
              .map(
                (g) => `<li>
                  <span class="ranked-label"><span class="cc">${esc(g.country)}</span> ${esc(g.city || "")}</span>
                  <span class="ranked-val">${g.n}</span>
                </li>`
              )
              .join("\n")}
          </ul>`
        : emptyState("No location data.", "Needs traffic from a real IP, or the Vercel geo headers.")
    }
  </section>

  <section class="panel" id="audience">
    <header class="panel-head"><h3>Devices</h3></header>
    ${dist(d.devices, (r) => r.device)}
  </section>

  <section class="panel" id="browsers">
    <header class="panel-head"><h3>Browsers</h3></header>
    ${dist(d.browsers, (r) => r.browser)}
  </section>`;
}

function performance(d) {
  const outcomeTone = { error: "bad", rate_limited: "warn", no_context: "warn", llm: "ok", resume_card: "ok" };
  return `
  <section class="panel" id="perf">
    <header class="panel-head"><h3>Latency</h3><span class="tag">${d.timing.samples} samples</span></header>
    ${
      d.timing.samples
        ? `<div class="statgrid">
            ${[
              ["Time to first token · p50", fmtMs(d.timing.ttftP50)],
              ["Time to first token · p95", fmtMs(d.timing.ttftP95)],
              ["Time to first token · avg", fmtMs(d.timing.ttftAvg)],
              ["Slowest first token", fmtMs(d.timing.ttftMax)],
              ["Total response · avg", fmtMs(d.timing.totalAvg)],
            ]
              .map(([k, v]) => `<div class="stat"><span>${esc(k)}</span><b>${esc(v)}</b></div>`)
              .join("")}
          </div>`
        : emptyState("No timings recorded.")
    }
  </section>

  <section class="panel" id="models">
    <header class="panel-head"><h3>Models</h3></header>
    ${
      d.models.length
        ? `<ul class="ranked">
            ${d.models.map((m) => `<li><span class="ranked-label mono">${esc(clean(m.model, 46))}</span><span class="ranked-val">${m.n}</span></li>`).join("")}
          </ul>`
        : emptyState("No replies yet.")
    }
  </section>

  <section class="panel" id="outcomes">
    <header class="panel-head"><h3>Outcomes</h3></header>
    ${
      d.outcomes.length
        ? `<ul class="ranked">
            ${d.outcomes
              .map(
                (o) => `<li>
                  <span class="ranked-label"><span class="dot dot-${outcomeTone[o.outcome] || "ok"}"></span>${esc(o.outcome.replace(/_/g, " "))}</span>
                  <span class="ranked-val">${o.n} <span class="dim">(${pct(o.n, d.totals.questions)}%)</span></span>
                </li>`
              )
              .join("")}
          </ul>`
        : emptyState("No outcomes yet.")
    }
  </section>

  <section class="panel" id="engagement">
    <header class="panel-head"><h3>Engagement</h3></header>
    <div class="statgrid">
      ${[
        ["Sessions", fmtInt(d.totals.sessions)],
        ["Turns per session", d.totals.turnsPerSession.toFixed(2)],
        ["Turns per visitor", d.totals.turnsPerVisitor.toFixed(2)],
        ["Returning visitors", fmtInt(d.totals.returning)],
        ["Rated", `${d.totals.rated}`],
        ["Never rated", `${d.totals.neverRated}`],
      ]
        .map(([k, v]) => `<div class="stat"><span>${esc(k)}</span><b>${esc(v)}</b></div>`)
        .join("")}
    </div>
  </section>`;
}

/* ── shell ───────────────────────────────────────────────────────────── */

const CSS = `
:root{
  --bg:#0c0b09; --bg-2:#141311; --bg-3:#1c1a17;
  --line:#2a2724; --line-2:#3a3632;
  --fg:#f2ede4; --fg-2:#a8a099; --fg-3:#6f6862;
  --good:#8fd694; --warn:#f2c14e; --bad:#ff7a6b; --accent:#7fd4c1;
  --shadow:0 1px 0 rgba(255,255,255,.03), 0 18px 40px -24px rgba(0,0,0,.9);
  --r:14px;
  --font-d:"Instrument Serif",ui-serif,Georgia,serif;
  --font-b:"Sora",ui-sans-serif,system-ui,sans-serif;
  --font-m:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}
html[data-theme="light"]{
  --bg:#faf7f2; --bg-2:#ffffff; --bg-3:#f2ede4;
  --line:#e2d9cb; --line-2:#cfc3b0;
  --fg:#1a1613; --fg-2:#5d554c; --fg-3:#8c837a;
  --good:#1f7a3d; --warn:#8a6100; --bad:#c0392b; --accent:#0f6d5e;
  --shadow:0 1px 0 rgba(0,0,0,.04), 0 18px 40px -28px rgba(60,40,20,.5);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:84px}
body{
  margin:0;background:var(--bg);color:var(--fg);
  font-family:var(--font-b);font-size:15px;line-height:1.55;
  -webkit-font-smoothing:antialiased;
  background-image:
    radial-gradient(1100px 520px at 82% -8%, color-mix(in srgb,var(--accent) 11%,transparent), transparent 62%),
    radial-gradient(760px 420px at 4% 4%, color-mix(in srgb,var(--bad) 7%,transparent), transparent 58%);
  background-attachment:fixed;
}
body::before{
  content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.5;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:56px 56px;
  mask-image:radial-gradient(ellipse 100% 62% at 50% 0%,#000 12%,transparent 76%);
  -webkit-mask-image:radial-gradient(ellipse 100% 62% at 50% 0%,#000 12%,transparent 76%);
}
.wrap{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:0 28px 96px}

/* masthead */
.masthead{padding:64px 0 34px;border-bottom:1px solid var(--line)}
.eyebrow{
  display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 20px;
  font-family:var(--font-m);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--fg-3);
}
.env{
  font-family:var(--font-m);font-size:11px;letter-spacing:.16em;padding:5px 11px;border-radius:999px;
  border:1px solid var(--line-2);background:var(--bg-2);color:var(--fg-2);
}
.env-prod{color:var(--bad);border-color:color-mix(in srgb,var(--bad) 46%,transparent);background:color-mix(in srgb,var(--bad) 11%,transparent)}
.env-local{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 46%,transparent);background:color-mix(in srgb,var(--accent) 11%,transparent)}
h1{
  font-family:var(--font-d);font-weight:400;font-size:clamp(40px,7vw,78px);
  line-height:.98;letter-spacing:-.02em;margin:0 0 18px;max-width:16ch;
}
h1 em{font-style:italic;color:var(--accent)}
.sub{color:var(--fg-2);max-width:62ch;margin:0;font-size:15.5px}
.sub b{color:var(--fg);font-weight:500}
.metaline{
  display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:26px;
  font-family:var(--font-m);font-size:12px;color:var(--fg-3);
}
.metaline span b{color:var(--fg-2);font-weight:500}

/* controls */
.controls{
  position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;gap:10px;
  padding:14px 0;margin-bottom:30px;
  background:color-mix(in srgb,var(--bg) 84%,transparent);
  backdrop-filter:blur(14px) saturate(140%);
  -webkit-backdrop-filter:blur(14px) saturate(140%);
  border-bottom:1px solid var(--line);
}
.controls nav{display:flex;flex-wrap:wrap;gap:2px;flex:1;min-width:260px}
.controls nav a{
  font-family:var(--font-m);font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;
  color:var(--fg-3);text-decoration:none;padding:7px 10px;border-radius:8px;transition:.16s;
}
.controls nav a:hover{color:var(--fg);background:var(--bg-3)}
.controls nav a.on{color:var(--accent);background:color-mix(in srgb,var(--accent) 13%,transparent)}
.tools{display:flex;gap:8px;align-items:center}
.search{
  font-family:var(--font-m);font-size:12.5px;color:var(--fg);background:var(--bg-2);
  border:1px solid var(--line-2);border-radius:9px;padding:7px 11px;width:210px;outline:none;transition:.16s;
}
.search::placeholder{color:var(--fg-3)}
.search:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
.btn{
  font-family:var(--font-m);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--fg-2);background:var(--bg-2);border:1px solid var(--line-2);border-radius:9px;
  padding:8px 13px;cursor:pointer;transition:.16s;white-space:nowrap;
}
.btn:hover{color:var(--fg);border-color:var(--fg-3);transform:translateY(-1px)}
.btn:active{transform:translateY(0)}

/* kpis */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(172px,1fr));gap:12px;margin-bottom:34px}
.kpi{
  position:relative;overflow:hidden;background:var(--bg-2);border:1px solid var(--line);
  border-radius:var(--r);padding:17px 18px 15px;box-shadow:var(--shadow);
  animation:rise .5s cubic-bezier(.16,1,.3,1) backwards;
}
.kpi::before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--line-2)}
.kpi.tone-good::before{background:var(--good)}
.kpi.tone-warn::before{background:var(--warn)}
.kpi.tone-bad::before{background:var(--bad)}
.kpi:nth-child(1){animation-delay:.02s}.kpi:nth-child(2){animation-delay:.06s}
.kpi:nth-child(3){animation-delay:.1s}.kpi:nth-child(4){animation-delay:.14s}
.kpi:nth-child(5){animation-delay:.18s}.kpi:nth-child(6){animation-delay:.22s}
.kpi-label{font-family:var(--font-m);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--fg-3);margin:0 0 9px}
.kpi-value{font-family:var(--font-d);font-size:40px;line-height:1;margin:0;letter-spacing:-.02em}
.kpi-sub{font-family:var(--font-m);font-size:11px;color:var(--fg-3);margin:8px 0 0}

.sec{scroll-margin-top:88px}
section{scroll-margin-top:88px}
.panel{
  background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r);
  padding:22px 24px 24px;margin-bottom:16px;box-shadow:var(--shadow);
}
.panel-alert{border-color:color-mix(in srgb,var(--bad) 34%,var(--line))}
.panel-warn{border-color:color-mix(in srgb,var(--warn) 30%,var(--line))}
.panel-head{display:flex;align-items:center;gap:11px;margin-bottom:6px;flex-wrap:wrap}
.panel-head h3{
  font-family:var(--font-m);font-size:12px;letter-spacing:.15em;text-transform:uppercase;
  font-weight:500;margin:0;color:var(--fg);
}
.panel-note{color:var(--fg-3);font-size:13.5px;margin:0 0 16px;max-width:70ch}
.tag{
  font-family:var(--font-m);font-size:11px;padding:2px 9px;border-radius:999px;
  border:1px solid var(--line-2);color:var(--fg-3);
}
.tag-bad{color:var(--bad);border-color:color-mix(in srgb,var(--bad) 44%,transparent)}
.tag-warn{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 44%,transparent)}

h2{
  font-family:var(--font-d);font-weight:400;font-size:30px;letter-spacing:-.01em;
  margin:52px 0 4px;display:flex;align-items:baseline;gap:14px;
}
h2::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--line),transparent)}
h2 span{font-family:var(--font-m);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-3)}

/* align-items:start so a tall panel (e.g. latency) does not stretch its
   shorter siblings into a field of dead space. */
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px;align-items:start;margin-bottom:16px}
.grid2 .panel{margin-bottom:0}

/* chart */
.chart{display:flex;align-items:flex-end;gap:5px;height:186px;padding:26px 0 0;overflow-x:auto}
.chart-col{flex:1;min-width:26px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;position:relative}
.chart-num{font-family:var(--font-m);font-size:10.5px;color:var(--fg-3);margin-bottom:5px;opacity:0;transition:.16s}
.chart-col:hover .chart-num{opacity:1}
.chart-bar{
  width:100%;min-height:3px;height:var(--h);border-radius:5px 5px 2px 2px;
  background:linear-gradient(180deg,var(--accent),color-mix(in srgb,var(--accent) 34%,transparent));
  animation:grow .7s cubic-bezier(.16,1,.3,1) backwards;
}
.chart-col:hover .chart-bar{filter:brightness(1.25)}
.chart-day{font-family:var(--font-m);font-size:9.5px;color:var(--fg-3);margin-top:8px;white-space:nowrap}

/* question lists */
.qlist{list-style:none;margin:0;padding:0;counter-reset:q}
.qrow{
  display:flex;align-items:center;gap:14px;padding:11px 2px;border-top:1px solid var(--line);
  animation:fade .4s ease backwards;
}
.qrow:first-child{border-top:none}
.qrow:hover .qtext{color:var(--fg)}
.qtext{flex:1;font-size:14.5px;color:var(--fg-2);min-width:0}
.qmeta{font-family:var(--font-m);font-size:11.5px;color:var(--fg-3);white-space:nowrap}
.qmeta b{color:var(--fg-2)}

/* tables */
.tablewrap{overflow-x:auto;margin:0 -4px}
table.grid{width:100%;border-collapse:collapse;font-size:13.5px}
table.grid th{
  text-align:left;font-family:var(--font-m);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;
  color:var(--fg-3);font-weight:500;padding:0 12px 10px;border-bottom:1px solid var(--line-2);
  cursor:pointer;user-select:none;white-space:nowrap;transition:.16s;
}
table.grid th:hover{color:var(--fg)}
table.grid th::after{content:"↕";opacity:.3;margin-left:6px;font-size:9px}
table.grid th.sorted-asc::after{content:"↑";opacity:1;color:var(--accent)}
table.grid th.sorted-desc::after{content:"↓";opacity:1;color:var(--accent)}
table.grid td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:middle;color:var(--fg-2)}
table.grid tbody tr{transition:.14s}
table.grid tbody tr:hover{background:var(--bg-3)}
table.grid tbody tr:hover td{color:var(--fg)}
td.num{font-family:var(--font-m);font-size:12.5px;white-space:nowrap}
td.ok{color:var(--good)}td.mid{color:var(--warn)}td.bad{color:var(--bad)}
/* Flex lives on an inner span: display:flex on a <td> drops it out of the
   table layout and the columns collapse. */
.cellbar{display:inline-flex;align-items:center;gap:10px}
.bar{display:inline-block;height:5px;width:74px;min-width:3px;border-radius:3px;background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 30%,transparent))}

.pills{display:flex;flex-wrap:wrap;gap:5px}
.pill{
  font-family:var(--font-m);font-size:10px;padding:2px 8px;border-radius:999px;
  background:var(--bg-3);color:var(--fg-3);border:1px solid var(--line);
}

/* ranked lists */
.ranked{list-style:none;margin:0;padding:0}
.ranked li{display:flex;align-items:center;gap:12px;padding:9px 0;border-top:1px solid var(--line)}
.ranked li:first-child{border-top:none}
.ranked-label{flex:1;min-width:0;font-size:13.5px;color:var(--fg-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ranked-label.mono{font-family:var(--font-m);font-size:12px}
.ranked-val{font-family:var(--font-m);font-size:12px;color:var(--fg-2);white-space:nowrap}
.mini-bad{font-family:var(--font-m);font-size:10px;color:var(--bad);margin-left:9px}
.dim{color:var(--fg-3)}
.cc{
  display:inline-block;font-family:var(--font-m);font-size:10.5px;letter-spacing:.06em;
  border:1px solid var(--line-2);border-radius:4px;padding:1px 6px;color:var(--fg-3);margin-right:9px;
}

/* distribution */
.dist{list-style:none;margin:0;padding:0}
.dist li{display:flex;align-items:center;gap:12px;padding:9px 0;border-top:1px solid var(--line)}
.dist li:first-child{border-top:none}
.dist-label{flex:none;width:96px;font-size:13.5px;color:var(--fg-2);text-transform:capitalize}
.dist-track{flex:1;height:7px;border-radius:4px;background:var(--bg-3);overflow:hidden}
.dist-fill{display:block;height:100%;width:var(--w);border-radius:4px;background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 40%,transparent));animation:slide .8s cubic-bezier(.16,1,.3,1) backwards}
.dist-val{font-family:var(--font-m);font-size:11.5px;color:var(--fg-3);width:44px;text-align:right}

/* clusters */
.clusters{display:grid;gap:12px}
.cluster{background:var(--bg-3);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.cluster-total{font-family:var(--font-m);font-size:11.5px;color:var(--accent);margin:0 0 9px}
.cluster ul{margin:0;padding-left:17px;color:var(--fg-2);font-size:13.5px}
.cluster li{margin:3px 0}
.cluster li b{font-family:var(--font-m);font-size:11.5px;color:var(--fg-3);margin-right:7px}

/* stat grids */
.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.stat{background:var(--bg-2);padding:14px 15px;display:flex;flex-direction:column;gap:7px}
.stat span{font-family:var(--font-m);font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--fg-3)}
.stat b{font-family:var(--font-d);font-size:27px;font-weight:400;line-height:1}

.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:9px;vertical-align:1px}
.dot-ok{background:var(--good)}.dot-warn{background:var(--warn)}.dot-bad{background:var(--bad)}

/* empty states */
.empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
  padding:34px 18px;text-align:center;border:1px dashed var(--line-2);border-radius:10px;
  background:repeating-linear-gradient(-45deg,transparent,transparent 9px,color-mix(in srgb,var(--line) 42%,transparent) 9px,color-mix(in srgb,var(--line) 42%,transparent) 10px);
}
.empty-mark{font-family:var(--font-m);font-size:24px;color:var(--fg-3);opacity:.55;line-height:1}
.empty p{margin:0;font-size:13.5px;color:var(--fg-2)}
.empty-hint{font-size:12px;color:var(--fg-3)}

/* footer */
footer{
  margin-top:60px;padding-top:26px;border-top:1px solid var(--line);
  display:flex;flex-wrap:wrap;gap:10px 26px;justify-content:space-between;
  font-family:var(--font-m);font-size:11.5px;color:var(--fg-3);
}
footer b{color:var(--fg-2);font-weight:500}

@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes slide{from{width:0}}
@keyframes fade{from{opacity:0}to{opacity:1}}

@media (max-width:760px){
  .wrap{padding:0 18px 64px}
  .masthead{padding:40px 0 26px}
  .controls{position:static}
  .search{width:100%}
  .tools{width:100%}
  h2{font-size:25px;margin-top:40px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media print{
  body{background:#fff;color:#111}
  body::before,.controls{display:none}
  .panel,.kpi{box-shadow:none;break-inside:avoid}
  a[href]::after{content:""}
}
`;

const JS = `
// theme
(function(){
  var root=document.documentElement, btn=document.getElementById('theme');
  var saved=null; try{saved=localStorage.getItem('insights-theme')}catch(e){}
  var prefersLight=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches;
  function set(t){root.setAttribute('data-theme',t);try{localStorage.setItem('insights-theme',t)}catch(e){}
    if(btn)btn.textContent=t==='dark'?'Light':'Dark';}
  set(saved||(prefersLight?'light':'dark'));
  if(btn)btn.addEventListener('click',function(){
    set(root.getAttribute('data-theme')==='dark'?'light':'dark')});
})();

// scroll spy - the active section is the last one whose heading has passed
// just below the sticky control bar.
(function(){
  var bar=document.querySelector('.controls');
  var links=[].slice.call(document.querySelectorAll('.controls nav a'));
  var secs=links.map(function(a){return document.querySelector(a.getAttribute('href'))}).filter(Boolean);
  function spy(){
    // Measured from the bar itself, plus room for the section heading, so the
    // highlight flips at the right moment regardless of bar height.
    var y=(bar?bar.getBoundingClientRect().height:62)+130;
    var cur=secs[0];
    secs.forEach(function(s){if(s&&s.getBoundingClientRect().top<=y)cur=s});
    links.forEach(function(a){a.classList.toggle('on',!!cur&&a.getAttribute('href')==='#'+cur.id)});
  }
  window.addEventListener('scroll',spy,{passive:true});
  window.addEventListener('resize',spy);
  spy();
})();

// filter question lists
(function(){
  var box=document.getElementById('q');
  if(!box)return;
  box.addEventListener('input',function(){
    var q=box.value.trim().toLowerCase();
    [].slice.call(document.querySelectorAll('[data-search]')).forEach(function(row){
      row.style.display=!q||row.getAttribute('data-search').indexOf(q)>-1?'':'none';
    });
  });
})();

// sortable tables
(function(){
  [].slice.call(document.querySelectorAll('table.sortable')).forEach(function(t){
    var dir={};
    t.querySelectorAll('th').forEach(function(th){
      th.addEventListener('click',function(){
        var i=[].slice.call(th.parentNode.children).indexOf(th);
        var asc=!dir[i];dir[i]=!asc;
        t.querySelectorAll('th').forEach(function(o){o.classList.remove('sorted-asc','sorted-desc')});
        th.classList.add(asc?'sorted-asc':'sorted-desc');
        var body=t.tBodies[0];
        var rows=[].slice.call(body.rows);
        rows.sort(function(a,b){
          var x=a.cells[i],y=b.cells[i];
          var xv=x.getAttribute('data-num'),yv=y.getAttribute('data-num');
          if(xv!=null&&yv!=null)return (parseFloat(xv)-parseFloat(yv))*(asc?1:-1);
          return x.textContent.trim().localeCompare(y.textContent.trim())*(asc?1:-1);
        });
        rows.forEach(function(r){body.appendChild(r)});
      });
    });
  });
})();

// print
(function(){
  var b=document.getElementById('print');if(b)b.addEventListener('click',function(){window.print()});
})();
`;

/** Build the whole HTML document. */
function renderHtml(sections, meta) {
  const nav = sections
    .map((s) => `<a href="#${s.id}">${esc(s.label)}</a>`)
    .join("");

  const banner = meta.empty
    ? `<div class="panel panel-warn" style="margin-top:8px">
         <header class="panel-head"><h3>No data for ${esc(meta.envLabel)}</h3></header>
         <p class="panel-note">${esc(meta.empty)}</p>
       </div>`
    : "";

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chat insights — ${esc(meta.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Sora:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">
      <span class="env env-${esc(meta.envClass)}">${esc(meta.envLabel)}</span>
      <span>chatbot intelligence</span>
      <span>·</span>
      <span>${esc(meta.rangeLabel)}</span>
    </p>
    <h1>What your chatbot<br>is <em>actually</em> being asked.</h1>
    <p class="sub">Every question, what it retrieved, how long it took and whether anyone liked the answer. Start with the two red panels: <b>cannot answer</b> is your knowledge backlog, <b>answered but disliked</b> is a prompt problem.</p>
    <div class="metaline">
      <span>database <b>${esc(meta.dbName)}</b></span>
      <span>generated <b>${esc(meta.generatedAt)}</b></span>
      <span>window <b>${esc(meta.days)} day${meta.days === 1 ? "" : "s"}</b></span>
    </div>
  </header>

  <div class="controls">
    <nav>${nav}</nav>
    <div class="tools">
      <input id="q" class="search" type="search" placeholder="Filter questions…" aria-label="Filter questions">
      <button id="print" class="btn">Print</button>
      <button id="theme" class="btn">Light</button>
    </div>
  </div>

  ${banner}
  ${meta.empty ? "" : sections.map((s) => s.html).join("\n")}

  <footer>
    <span>source <b>${esc(meta.dbName)}</b> · ${esc(meta.collectionNote)}</span>
    <span>${esc(meta.rangeLabel)} · generated ${esc(meta.generatedAt)}</span>
  </footer>
</div>
<script>${JS}</script>
</body>
</html>`;
}

/** Assembles the report body into nav-linked sections. */
function collectSections(d) {
  const sec = (id, heading, note, body) =>
    `<div class="sec" id="${id}">
       <h2>${heading}${note ? ` <span>${note}</span>` : ""}</h2>
       ${body}
     </div>`;

  return [
    {
      id: "overview",
      label: "Overview",
      html: sec(
        "overview", "Overview", "volume & vitals",
        `<div class="kpis">${kpis(d)}</div>
         <section class="panel"><header class="panel-head"><h3>Questions per day</h3></header>${volume(d)}</section>`
      ),
    },
    {
      id: "actions",
      label: "Act on this",
      html: sec("actions", "Act on this", "highest value", actionQueue(d)),
    },
    {
      id: "questions",
      label: "Questions",
      html: sec(
        "questions", "Questions", "ranked by frequency",
        `<section class="panel"><header class="panel-head"><h3>Most asked</h3></header>${topTable(d)}</section>`
      ),
    },
    { id: "topics", label: "Topics", html: sec("topics", "Coverage", "what is being probed", `<div class="grid2">${breakdown(d)}</div>`) },
    { id: "audience", label: "Audience", html: sec("audience", "Audience", "who is asking", `<div class="grid2">${audience(d)}</div>`) },
    { id: "performance", label: "Performance", html: sec("performance", "Performance", "latency & outcomes", `<div class="grid2">${performance(d)}</div>`) },
  ];
}

module.exports = { renderHtml, collectSections, kpis, volume, actionQueue, topTable, breakdown, audience, performance };
