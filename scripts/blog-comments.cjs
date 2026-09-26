#!/usr/bin/env node
/**
 * Blog comment moderation.
 *
 * Comments auto-approve, so this is how you deal with spam without a database
 * GUI.
 *
 *   node scripts/blog-comments.cjs                    # list recent comments
 *   node scripts/blog-comments.cjs --post my-slug     # one post
 *   node scripts/blog-comments.cjs --search casino    # find spam by keyword
 *   node scripts/blog-comments.cjs --delete c_abc123  # remove one
 *   node scripts/blog-comments.cjs --delete-all --post my-slug
 *   node scripts/blog-comments.cjs --env prod         # production database
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config();
const { MongoClient } = require("mongodb");

// Must match lib/mongo-db.ts.
const PROD_DB_NAME = "prod";
const DEV_DB_NAME = "socialamigo_dev";
const COMMENTS = "blog_comments";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const val = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? null : argv[i + 1];
};

const runningAsProd = process.env.NODE_ENV === "production";
const explicitDb = process.env.MONGODB_DB_NAME || null;
const env = val("env");

let dbName;
if (env === "prod" || env === "production") dbName = PROD_DB_NAME;
else if (env === "local" || env === "dev") dbName = DEV_DB_NAME;
else dbName = explicitDb || (runningAsProd ? PROD_DB_NAME : DEV_DB_NAME);

const postSlug = val("post");
const search = val("search");
const deleteId = val("delete");
const deleteAll = has("delete-all");
const limit = Number(val("limit")) || 40;

const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const YEL = "\x1b[33m";
const OFF = "\x1b[0m";

(async () => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const col = client.db(dbName).collection(COMMENTS);

  console.log(`\ndatabase: \x1b[1m${dbName}\x1b[0m${DIM}  (${COMMENTS})${OFF}`);

  if (deleteId) {
    const res = await col.deleteOne({ _id: deleteId });
    console.log(
      res.deletedCount
        ? `${RED}deleted${OFF} ${deleteId}`
        : `no comment found with id ${deleteId}`
    );
    await client.close();
    return;
  }

  if (deleteAll) {
    if (!postSlug) {
      console.error("--delete-all needs --post <slug> so it cannot wipe everything by accident");
      process.exit(1);
    }
    const { deletedCount } = await col.deleteMany({ postSlug });
    console.log(`${RED}deleted${OFF} ${deletedCount} comment(s) on "${postSlug}"`);
    await client.close();
    return;
  }

  const filter = {};
  if (postSlug) filter.postSlug = postSlug;
  if (search) filter.body = { $regex: search, $options: "i" };

  const total = await col.countDocuments(filter);
  const rows = await col
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  if (rows.length === 0) {
    console.log("\nno comments found\n");
    await client.close();
    return;
  }

  console.log(`\n${rows.length} of ${total} comment(s)\n`);
  for (const c of rows) {
    const ago = Math.round((Date.now() - new Date(c.createdAt).getTime()) / 3600000);
    const when = ago < 1 ? "just now" : ago < 24 ? `${ago}h ago` : `${Math.round(ago / 24)}d ago`;
    console.log(
      `${DIM}${c._id}${OFF}  ${YEL}${c.name}${OFF}  ${DIM}${when}  ${c.postSlug}${OFF}`
    );
    console.log(`   ${c.body.replace(/\n/g, "\n   ")}`);
    if (c.userAgent) console.log(`${DIM}   ua: ${c.userAgent.slice(0, 90)}${OFF}`);
    console.log("");
  }

  console.log(`${DIM}delete one:  node scripts/blog-comments.cjs --delete <id>${OFF}`);
  console.log(`${DIM}clear post:  node scripts/blog-comments.cjs --delete-all --post <slug>${OFF}\n`);

  await client.close();
})().catch((err) => {
  console.error("failed:", err);
  process.exit(1);
});
