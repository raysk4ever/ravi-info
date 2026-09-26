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
const { collectInsights } = require("./lib/insights-data.cjs");

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
const fmtMs = (n) => (n == null ? "-" : Math.round(n) + " ms");


async function report(db, target) {
  const d = await collectInsights(db, { since, limit: LIMIT, minAsks: MIN_ASKS });
  const t = d.totals;

  head(`Overview (last ${DAYS} days)`);
  line("Questions asked", String(t.questions));
  line("Answers rated", `${t.rated} (${pct(t.rated, t.questions)}%)`);

  if (!d.hasTurns) {
    console.log("\n  No turns recorded yet. Ask the chatbot something first.\n");
    return;
  }

  head("Daily volume");
  const maxDaily = Math.max(...d.daily.map((x) => x.asks), 1);
  for (const day of d.daily) line(day._id, `${bar(day.asks, maxDaily)} ${day.asks}`);

  head("Top questions (min " + MIN_ASKS + " asks)");
  if (d.topQuestions.length === 0) console.log("  (none)");
  const maxAsk = Math.max(...d.topQuestions.map((q) => q.askCount), 1);
  for (const q of d.topQuestions) {
    const votes = q.thumbsUp + q.thumbsDown;
    const net = votes > 0 ? `  [${pct(q.thumbsUp, votes)}% up]` : "";
    console.log(
      `  ${String(q.askCount).padStart(4)} ${bar(q.askCount, maxAsk, 18)}  ${clip(q.question, 60)}${net}`
    );
  }

  head("Needs work - questions that got a thumbs down");
  if (d.thumbsDownDetail.length === 0) {
    console.log("  (no thumbs down - either it's working, or nobody is rating)");
  }
  for (const x of d.thumbsDownDetail) {
    console.log(`  ${String(x.n).padStart(3)}x  ${clip(x.question, 68)}`);
    if (x.sample) console.log(`        answer was: ${clip(x.sample, 105)}...`);
  }

  head("UNANSWERED - questions the knowledge base cannot answer yet");
  if (d.unanswered.length === 0) {
    console.log("  (none - every question so far matched something in the index)");
  }
  for (const q of d.unanswered) {
    console.log(`  ${String(q.n).padStart(3)}x  ${clip(q.question, 64)}  (${q.visitors} visitor(s))`);
  }
  if (d.unanswered.length > 0) {
    console.log("\n  Add answers for these in knowledge/notes/, then run: yarn rag:build");
  }

  head("ANSWERED BUT DISLIKED - right topic, unhelpful answer");
  if (d.disliked.length === 0) console.log("  (no thumbs down)");
  for (const x of d.disliked) {
    console.log(`  ${String(x.n).padStart(3)}x  ${clip(x.question, 68)}`);
  }

  head("Knowledge coverage - topics being probed");
  const maxTopic = d.topics.length ? Math.max(...d.topics.map((x) => x.asks), 1) : 1;
  for (const x of d.topics) {
    console.log(
      `  ${String(x.asks).padStart(4)} ${bar(x.asks, maxTopic, 18)}  ${x.topic}${x.down ? `   (${x.down} down)` : ""}`
    );
  }

  head("Frustration / unclear signals");
  if (d.negatives.length === 0) console.log("  (none detected)");
  for (const n of d.negatives) {
    console.log(`  ${String(n.count).padStart(3)}x  ${n.signal.padEnd(14)} e.g. "${clip(n.sample, 55)}"`);
  }

  head("Paraphrase clusters (same thing asked differently)");
  if (d.clusters.length === 0) console.log("  (no repeats yet)");
  for (const c of d.clusters) {
    console.log(`  ${c.total} total across ${c.variants.length} phrasing(s):`);
    for (const v of c.variants.slice(0, 4)) {
      console.log(`      ${String(v.n).padStart(3)}x ${clip(v.q, 60)}`);
    }
  }

  head("Tech / entities mentioned");
  if (d.entities.length === 0) console.log("  (none detected)");
  const maxEnt = d.entities.length ? Math.max(...d.entities.map((e) => e.n), 1) : 1;
  for (const e of d.entities) {
    console.log(`  ${String(e.n).padStart(4)} ${bar(e.n, maxEnt, 18)}  ${e.entity}`);
  }

  head("Where people are");
  const geoRows = d.geo.filter((g) => g.country);
  if (geoRows.length === 0) console.log("  (no geo data yet)");
  for (const g of geoRows) {
    console.log(`  ${String(g.n).padStart(4)}  ${g.country} ${g.city || ""}`);
  }

  if (d.devices.length) {
    console.log("\n  Devices:");
    for (const x of d.devices) {
      console.log(`  ${String(x.n).padStart(4)}  ${x.device} (${pct(x.n, t.questions)}%)`);
    }
  }
  if (d.browsers.length) {
    console.log("\n  Browsers:");
    for (const x of d.browsers) {
      console.log(`  ${String(x.n).padStart(4)}  ${x.browser} (${pct(x.n, t.questions)}%)`);
    }
  }

  head("Response performance");
  if (!d.timing.samples) {
    console.log("  (no timings yet)");
  } else {
    line("Time to first token p50", fmtMs(d.timing.ttftP50));
    line("Time to first token p95", fmtMs(d.timing.ttftP95));
    line("Time to first token avg", fmtMs(d.timing.ttftAvg));
    line("Total time avg", fmtMs(d.timing.totalAvg));
    line("Slowest first token", fmtMs(d.timing.ttftMax));
  }
  if (d.models.length) {
    console.log("");
    for (const m of d.models) line(m.model, `${m.n} replies`);
  }
  if (d.outcomes.length) {
    console.log("");
    for (const o of d.outcomes) line(o.outcome, `${o.n} (${pct(o.n, t.questions)}%)`);
  }

  head("Engagement");
  line("Unique visitors", String(t.uniqueVisitors));
  line("Sessions", String(t.sessions));
  line("Turns per session", t.turnsPerSession.toFixed(2));
  line("Turns per visitor", t.turnsPerVisitor.toFixed(2));
  line("Returning visitors", String(t.returning));
  line("Never rated", `${t.neverRated} (${pct(t.neverRated, t.questions)}%)`);

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

      const hasTurns = (await db.collection("chat_turns").estimatedDocumentCount()) > 0;
      if (!hasTurns) {
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
