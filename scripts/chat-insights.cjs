#!/usr/bin/env node
/**
 * Chat analytics insights.
 *
 *   node scripts/chat-insights.cjs                  # database for this environment
 *   node scripts/chat-insights.cjs --env local      # force the dev database
 *   node scripts/chat-insights.cjs --env prod       # force the production database
 *   node scripts/chat-insights.cjs --env both       # local and prod, side by side
 *   node scripts/chat-insights.cjs --days 7 --limit 30
 *
 * Local dev and production are separate databases (see lib/mongo-db.ts), so
 * your test traffic never pollutes real visitor analytics. The database name is
 * printed in the banner of every run.
 *
 * Answers the question this data exists for: "what are people asking my
 * chatbot that it cannot answer well?"
 */

// Next.js reads .env.local; a standalone node script has to be told.
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

// Must match lib/mongo-db.ts.
const PROD_DB_NAME = "prod";
const DEV_DB_NAME = "socialamigo_dev";

const argv = process.argv.slice(2);
function arg(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = Number(argv[i + 1]);
  return Number.isFinite(v) ? v : fallback;
}
function strArg(name) {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
}
const DAYS = arg("days", 30);
const LIMIT = arg("limit", 20);
const MIN_ASKS = arg("min", 1);
const since = new Date(Date.now() - DAYS * 86400000);

const explicitDb = process.env.MONGODB_DB_NAME || null;
const requestedEnv = strArg("env");
const runningAsProd = process.env.NODE_ENV === "production";

// Precedence: an explicit --env flag always wins, because asking for prod data
// while pointed at the dev database is exactly the confusion this guards
// against. Only without the flag do we honour MONGODB_DB_NAME.
function targetFor(kind) {
  const forced = kind === "prod" || kind === "local";
  if (forced) {
    return {
      kind,
      dbName: kind === "prod" ? PROD_DB_NAME : DEV_DB_NAME,
      viaFlag: true,
    };
  }
  const kindDefault = runningAsProd ? "prod" : "local";
  return {
    kind: kindDefault,
    dbName: explicitDb || (runningAsProd ? PROD_DB_NAME : DEV_DB_NAME),
    viaFlag: false,
  };
}

let targets;
if (requestedEnv === "both") {
  targets = [targetFor("local"), targetFor("prod")];
} else if (requestedEnv === "prod" || requestedEnv === "production") {
  targets = [targetFor("prod")];
} else if (requestedEnv === "local" || requestedEnv === "dev" || requestedEnv === "development") {
  targets = [targetFor("local")];
} else if (requestedEnv) {
  console.error(`Unknown --env "${requestedEnv}". Use local, prod or both.`);
  process.exit(1);
} else {
  targets = [targetFor("current")];
}

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
const bar = (n, max, width = 24) =>
  max > 0 ? "\u2588".repeat(Math.max(1, Math.round((n / max) * width))) : "";
const clip = (s, n) => String(s || "").slice(0, n).replace(/\s+/g, " ");
const head = (t) => {
  console.log(`\n\x1b[1m${t}\x1b[0m`);
  console.log("\u2500".repeat(Math.max(t.length, 60)));
};
const line = (label, value) => console.log(`  ${label.padEnd(24)} ${value}`);

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

async function report(db, target) {
  const turns = db.collection("chat_turns");
  const stats = db.collection("chat_question_stats");
  const feedback = db.collection("chat_feedback");

  const [totalTurns, ratedTurns] = await Promise.all([
    turns.countDocuments({ createdAt: { $gte: since } }),
    turns.countDocuments({
      createdAt: { $gte: since },
      "feedback.rating": { $ne: null },
    }),
  ]);

  head(`Overview (last ${DAYS} days)`);
  line("Questions asked", String(totalTurns));
  line("Answers rated", `${ratedTurns} (${pct(ratedTurns, totalTurns)}%)`);

  if (totalTurns === 0) {
    console.log("\n  No turns recorded yet. Ask the chatbot something first.\n");
    return;
  }

  /* ── volume over time ─────────────────────────────────────────────── */
  head("Daily volume");
  const daily = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          asks: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 14 },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  const maxDaily = Math.max(...daily.map((d) => d.asks), 1);
  for (const d of daily) line(d._id, `${bar(d.asks, maxDaily)} ${d.asks}`);

  /* ── top questions ────────────────────────────────────────────────── */
  head(`Top questions (min ${MIN_ASKS} asks)`);
  const top = await stats
    .find({ lastAskedAt: { $gte: since }, askCount: { $gte: MIN_ASKS } })
    .sort({ askCount: -1 })
    .limit(LIMIT)
    .toArray();
  if (top.length === 0) console.log("  (none)");
  const maxAsk = Math.max(...top.map((q) => q.askCount), 1);
  for (const q of top) {
    const votes = (q.thumbsUp || 0) + (q.thumbsDown || 0);
    const net = votes > 0 ? `  [${pct(q.thumbsUp || 0, votes)}% up]` : "";
    console.log(
      `  ${String(q.askCount).padStart(4)} ${bar(q.askCount, maxAsk, 18)}  ${clip(
        q.question,
        60
      )}${net}`
    );
  }

  /* ── what is failing ──────────────────────────────────────────────── */
  head("Needs work - questions that got a thumbs down");
  const down = await feedback
    .aggregate([
      { $match: { createdAt: { $gte: since }, rating: -1 } },
      {
        $group: {
          _id: "$question",
          count: { $sum: 1 },
          sample: { $first: "$answerSnippet" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: LIMIT },
    ])
    .toArray();
  if (down.length === 0) {
    console.log("  (no thumbs down - either it's working, or nobody is rating)");
  }
  for (const d of down) {
    console.log(`  ${String(d.count).padStart(3)}x  ${clip(d._id, 68)}`);
    if (d.sample) console.log(`        answer was: ${clip(d.sample, 105)}...`);
  }

  /* ── coverage gaps ────────────────────────────────────────────────── */
  head("Knowledge coverage - topics being probed");
  const topics = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $unwind: "$text.topics" },
      {
        $group: {
          _id: "$text.topics",
          asks: { $sum: 1 },
          down: { $sum: { $cond: [{ $eq: ["$feedback.rating", -1] }, 1, 0] } },
        },
      },
      { $sort: { asks: -1 } },
    ])
    .toArray();
  const maxTopic = Math.max(...topics.map((t) => t.asks), 1);
  for (const t of topics) {
    console.log(
      `  ${String(t.asks).padStart(4)} ${bar(t.asks, maxTopic, 18)}  ${t._id}${
        t.down ? `   (${t.down} down)` : ""
      }`
    );
  }

  /* ── confusion signals ────────────────────────────────────────────── */
  head("Frustration / unclear signals");
  const neg = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $match: { "text.negativeSignals.0": { $exists: true } } },
      { $unwind: "$text.negativeSignals" },
      {
        $group: {
          _id: "$text.negativeSignals",
          count: { $sum: 1 },
          sample: { $first: "$question" },
        },
      },
      { $sort: { count: -1 } },
    ])
    .toArray();
  if (neg.length === 0) console.log("  (none detected)");
  for (const n of neg) {
    console.log(
      `  ${String(n.count).padStart(3)}x  ${n._id.padEnd(14)} e.g. "${clip(
        n.sample,
        55
      )}"`
    );
  }

  /* ── paraphrase clusters ──────────────────────────────────────────── */
  head("Paraphrase clusters (same thing asked differently)");
  const clusters = await stats
    .aggregate([
      { $match: { lastAskedAt: { $gte: since } } },
      {
        $group: {
          _id: "$signature",
          variants: { $push: { q: "$question", n: "$askCount" } },
          total: { $sum: "$askCount" },
        },
      },
      { $match: { total: { $gte: 2 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ])
    .toArray();
  if (clusters.length === 0) console.log("  (no repeats yet)");
  for (const c of clusters) {
    console.log(`  ${c.total} total across ${c.variants.length} phrasing(s):`);
    for (const v of c.variants.slice(0, 4)) {
      console.log(`      ${String(v.n).padStart(3)}x ${clip(v.q, 60)}`);
    }
  }

  /* ── entities ─────────────────────────────────────────────────────── */
  head("Tech / entities mentioned");
  const ents = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $unwind: "$text.entities" },
      { $group: { _id: "$text.entities", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 12 },
    ])
    .toArray();
  if (ents.length === 0) console.log("  (none detected)");
  const maxEnt = Math.max(...ents.map((e) => e.n), 1);
  for (const e of ents) {
    console.log(`  ${String(e.n).padStart(4)} ${bar(e.n, maxEnt, 18)}  ${e._id}`);
  }

  /* -- coverage gaps: the money section -- */
  head("UNANSWERED - questions the knowledge base cannot answer yet");
  const noCtx = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since }, outcome: "no_context" } },
      {
        $group: {
          _id: "$question",
          n: { $sum: 1 },
          visitors: { $addToSet: "$visitorId" },
        },
      },
      { $sort: { n: -1 } },
      { $limit: LIMIT },
    ])
    .toArray();
  if (noCtx.length === 0) {
    console.log("  (none - every question so far matched something in the index)");
  }
  for (const q of noCtx) {
    console.log(
      `  ${String(q.n).padStart(3)}x  ${clip(q._id, 64)}  (${q.visitors.length} visitor(s))`
    );
  }
  if (noCtx.length > 0) {
    console.log("\n  Add answers for these in knowledge/notes/, then run: yarn rag:build");
  }

  // Answered but disliked is the second-best signal: the bot had the facts
  // and still landed badly.
  const disliked = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since }, "feedback.rating": -1 } },
      { $group: { _id: "$question", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: LIMIT },
    ])
    .toArray();

  head("ANSWERED BUT DISLIKED - right topic, unhelpful answer");
  if (disliked.length === 0) {
    console.log("  (no thumbs down)");
  }
  for (const d of disliked) {
    console.log(`  ${String(d.n).padStart(3)}x  ${clip(d._id, 68)}`);
  }

  /* ── audience ─────────────────────────────────────────────────────── */
  head("Where people are");
  const geoRows = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { geo: "$geo.countryCode", city: "$geo.city" },
          n: { $sum: 1 },
        },
      },
      { $sort: { n: -1 } },
      { $limit: 10 },
    ])
    .toArray();
  if (geoRows.length === 0) console.log("  (no geo data yet)");
  for (const g of geoRows) {
    console.log(`  ${String(g.n).padStart(4)}  ${g._id.geo ?? "??"} ${g._id.city ?? ""}`);
  }

  const deviceRows = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$device.deviceType", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ])
    .toArray();
  if (deviceRows.length) {
    console.log("\n  Devices:");
    for (const d of deviceRows) {
      console.log(
        `  ${String(d.n).padStart(4)}  ${d._id ?? "unknown"} (${pct(d.n, totalTurns)}%)`
      );
    }
  }

  const browsers = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$device.browser", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 5 },
    ])
    .toArray();
  if (browsers.length) {
    console.log("\n  Browsers:");
    for (const b of browsers) {
      console.log(
        `  ${String(b.n).padStart(4)}  ${b._id ?? "unknown"} (${pct(b.n, totalTurns)}%)`
      );
    }
  }

  /* ── performance ──────────────────────────────────────────────────── */
  head("Response performance");
  const ttfts = await turns
    .find(
      { createdAt: { $gte: since }, "timing.ttftMs": { $ne: null } },
      { projection: { "timing.ttftMs": 1, "timing.totalMs": 1 }, limit: 20000 }
    )
    .toArray();
  if (ttfts.length === 0) {
    console.log("  (no timings yet)");
  } else {
    const t = ttfts.map((d) => d.timing.ttftMs).sort((a, b) => a - b);
    const totals = ttfts.map((d) => d.timing.totalMs).sort((a, b) => a - b);
    const avg = (a) => Math.round(a.reduce((s, v) => s + v, 0) / a.length);
    line("Time to first token p50", `${Math.round(percentile(t, 0.5))} ms`);
    line("Time to first token p95", `${Math.round(percentile(t, 0.95))} ms`);
    line("Time to first token avg", `${avg(t)} ms`);
    line("Total time avg", `${avg(totals)} ms`);
    line("Slowest first token", `${Math.round(t[t.length - 1])} ms`);
  }

  const models = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$model", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ])
    .toArray();
  console.log("");
  for (const m of models) line(m._id ?? "unknown", `${m.n} replies`);

  const outcomes = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$outcome", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ])
    .toArray();
  console.log("");
  for (const o of outcomes) {
    line(o._id, `${o.n} (${pct(o.n, totalTurns)}%)`);
  }

  /* ── engagement ───────────────────────────────────────────────────── */
  head("Engagement");
  const [sessions, visitors] = await Promise.all([
    turns.distinct("sessionId", { createdAt: { $gte: since } }),
    turns.distinct("visitorId", { createdAt: { $gte: since } }),
  ]);
  const returning = await turns
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$visitorId", n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
      { $count: "n" },
    ])
    .toArray();
  const unrated = totalTurns - ratedTurns;

  line("Unique visitors", String(visitors.length));
  line("Sessions", String(sessions.length));
  line("Turns per session", (totalTurns / Math.max(sessions.length, 1)).toFixed(2));
  line("Turns per visitor", (totalTurns / Math.max(visitors.length, 1)).toFixed(2));
  line("Returning visitors", String(returning[0]?.n ?? 0));
  line("Never rated", `${unrated} (${pct(unrated, totalTurns)}%)`);

  console.log("");
}

function banner(target) {
  const isCurrentEnv = target.kind === (runningAsProd ? "prod" : "local");
  const tag = target.kind.toUpperCase().padEnd(5);
  console.log("");
  console.log(
    "\x1b[7m " + tag + " \x1b[0m  database: \x1b[1m" + target.dbName + "\x1b[0m"
  );
  if (target.viaFlag) {
    console.log("      selected with --env " + target.kind);
    if (explicitDb && explicitDb !== target.dbName) {
      console.log(
        "      \x1b[33mnote: MONGODB_DB_NAME=" + explicitDb +
        " is set in this shell, so the running app writes there,\x1b[0m"
      );
      console.log("      \x1b[33m      but --env " + target.kind +
        " reads " + target.dbName + ". They will diverge.\x1b[0m");
    }
  } else if (explicitDb) {
    console.log("      via MONGODB_DB_NAME=" + explicitDb);
  }
  if (isCurrentEnv && !target.viaFlag) {
    console.log("      this is the current environment");
  }
}

(async () => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();

  try {
    for (const target of targets) {
      const db = client.db(target.dbName);
      banner(target);

      const collections = await db.listCollections({}, { nameOnly: true }).toArray();
      const known = new Set(collections.map((c) => c.name));
      if (!known.has("chat_turns")) {
        console.log(`  Database "${target.dbName}" has no chat_turns collection yet.`);
        if (target.kind === "prod") {
          console.log("  Production analytics start from the first deploy that writes to it.");
        } else {
          console.log("  Start the dev server and ask the chatbot something.");
        }
        console.log("");
        continue;
      }

      await report(db, target);
    }
  } finally {
    await client.close();
  }
})().catch((err) => {
  console.error("insights failed:", err);
  process.exit(1);
});
