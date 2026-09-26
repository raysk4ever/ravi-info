#!/usr/bin/env node
/**
 * Chat insights as a self-contained HTML report.
 *
 *   node scripts/chat-report.cjs                      # current environment
 *   node scripts/chat-report.cjs --env prod           # production data
 *   node scripts/chat-report.cjs --env both           # one page, both databases
 *   node scripts/chat-report.cjs --days 7 --limit 40
 *   node scripts/chat-report.cjs --out reports/prod.html
 *   node scripts/chat-report.cjs --open
 *
 * Writes a single .html file with no build step and no runtime data
 * dependency, so it can be opened, emailed or committed as an artefact.
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { collectInsights } = require("./lib/insights-data.cjs");
const { renderHtml, collectSections } = require("./lib/insights-html.cjs");

// Must match lib/mongo-db.ts.
const PROD_DB_NAME = "prod";
const DEV_DB_NAME = "socialamigo_dev";

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const val = (n, fallback) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? fallback : argv[i + 1];
};
const num = (n, fallback) => {
  const v = Number(val(n, NaN));
  return Number.isFinite(v) ? v : fallback;
};

const DAYS = num("days", 30);
const LIMIT = num("limit", 25);
const MIN_ASKS = num("min", 1);
const OUT = val("out", null);
const OPEN = has("open");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

const explicitDb = process.env.MONGODB_DB_NAME || null;
const runningAsProd = process.env.NODE_ENV === "production";
const requested = val("env", null);

function targetFor(kind) {
  if (kind === "prod" || kind === "local") {
    return { kind, dbName: kind === "prod" ? PROD_DB_NAME : DEV_DB_NAME, viaFlag: true };
  }
  return {
    kind: runningAsProd ? "prod" : "local",
    dbName: explicitDb || (runningAsProd ? PROD_DB_NAME : DEV_DB_NAME),
    viaFlag: false,
  };
}

let targets;
if (requested === "both") {
  targets = [targetFor("local"), targetFor("prod")];
} else if (/^(prod|production)$/i.test(requested || "")) {
  targets = [targetFor("prod")];
} else if (/^(local|dev|development)$/i.test(requested || "")) {
  targets = [targetFor("local")];
} else if (requested) {
  console.error(`Unknown --env "${requested}". Use local, prod or both.`);
  process.exit(1);
} else {
  targets = [targetFor("current")];
}

const since = new Date(Date.now() - DAYS * 86400000);
const rangeLabel = `${since.toISOString().slice(0, 10)} → ${new Date().toISOString().slice(0, 10)}`;
const generatedAt = new Date().toLocaleString("en-GB", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});

(async () => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();

  try {
    const pages = [];

    for (const target of targets) {
      const db = client.db(target.dbName);
      const hasTurns = (await db.collection("chat_turns").estimatedDocumentCount()) > 0;

      if (!hasTurns) {
        const why =
          target.kind === "prod"
            ? "Production analytics begin with the first deploy that writes to this database."
            : "Ask the chatbot something locally, then regenerate the report.";
        pages.push({ kind: target.kind, dbName: target.dbName, empty: true, html: renderHtml([], {
            title: `${target.kind} · ${target.dbName}`,
            envLabel: `${target.kind.toUpperCase()} · ${target.dbName}`,
            envClass: target.kind,
            dbName: target.dbName,
            rangeLabel,
            generatedAt,
            days: DAYS,
            empty: why,
            collectionNote: "chat_turns, chat_question_stats, chat_feedback",
          }),
        });
        console.log(`  ${target.kind.toUpperCase().padEnd(5)} ${target.dbName} - no data (${why})`);
        continue;
      }

      const d = await collectInsights(db, { since, limit: LIMIT, minAsks: MIN_ASKS });
      const multi = targets.length > 1;

      pages.push({
        kind: target.kind,
        dbName: target.dbName,
        empty: false,
        html: renderHtml(collectSections(d), {
          title: `${target.kind} · ${target.dbName}`,
          envLabel: `${target.kind.toUpperCase()} · ${target.dbName}`,
          envClass: target.kind,
          dbName: target.dbName,
          rangeLabel,
          generatedAt,
          days: DAYS,
          empty: null,
          multi,
          collectionNote: `${d.totals.questions} turns · ${d.totals.uniqueVisitors} visitors`,
        }),
      });

      console.log(
        `  ${target.kind.toUpperCase().padEnd(5)} ${target.dbName} - ` +
          `${d.totals.questions} question(s), ${d.unanswered.length} gap(s), ${d.disliked.length} disliked`
      );
    }

    // One file per database. Concatenating two <!doctype> documents into one
    // file is invalid HTML and browsers only render the first.
    const stamp = new Date().toISOString().slice(0, 10);
    const written = [];

    for (const page of pages) {
      const name = OUT
        ? OUT
        : `chat-insights-${page.kind}-${stamp}.html`;
      const outPath = path.resolve(name);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, page.html, "utf8");
      const kb = (Buffer.byteLength(page.html, "utf8") / 1024).toFixed(0);
      written.push({ path: outPath, kb });
      console.log(`  wrote ${path.relative(process.cwd(), outPath)} (${kb} KB)`);
    }

    if (OPEN && written.length) {
      const { spawn } = require("child_process");
      const opener = process.platform === "darwin" ? "open" : "xdg-open";
      for (const w of written) {
        spawn(opener, [w.path], { stdio: "ignore", detached: true }).unref();
      }
    }
  } finally {
    await client.close();
  }
})().catch((err) => {
  console.error("report failed:", err);
  process.exit(1);
});
