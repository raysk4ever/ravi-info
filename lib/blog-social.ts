import { getMongoClient, resolveDbName } from "@/lib/mongo-db";
import type { Db } from "mongodb";

/**
 * Blog comments and likes.
 *
 * Posts are statically generated, so everything here is fetched from the client
 * at runtime. Comments live in the same environment-split database as the chat
 * analytics (see lib/mongo-db.ts), so local testing never touches production.
 *
 * There is no login, which means this is an open write endpoint. Everything is
 * therefore treated as untrusted: rate limited per IP, length capped, and
 * rendered as plain text rather than HTML.
 */

export const COMMENTS = "blog_comments";
export const LIKES = "blog_post_likes";
export const LIKE_VOTES = "blog_like_votes";
export const LIMITS = "blog_rate_limits";

export const MAX_NAME = 40;
export const MAX_BODY = 2000;
export const MIN_BODY = 2;
/** Comments allowed per IP per window. Generous enough to be usable. */
export const COMMENT_LIMIT = 5;
export const COMMENT_WINDOW_MS = 10 * 60_000;

export const DEFAULT_NAME = "Anonymous";

export interface BlogComment {
  _id: string;
  postSlug: string;
  name: string;
  body: string;
  createdAt: Date;
  visitorId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  status: "approved" | "pending";
}

export interface BlogCommentView {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  /** True when the viewer is the author, so the client can offer delete. */
  mine: boolean;
}

let indexesEnsured = false;

async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(resolveDbName());
}

async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    await Promise.all([
      db.collection(COMMENTS).createIndexes([
        { key: { postSlug: 1, status: 1, createdAt: -1 }, name: "post_status_time" },
        { key: { ipHash: 1, createdAt: -1 }, name: "ip_time" },
      ]),
      db.collection(LIKES).createIndex({ postSlug: 1 }, { name: "post" }),
      db.collection(LIMITS).createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: "expiresAt_ttl" }
      ),
    ]);
  } catch (err) {
    console.warn("[blog-social] index setup failed:", (err as Error)?.message);
  }
}

/* ── rate limiting ───────────────────────────────────────────────────── */

/**
 * Fixed-window counter. The document expires itself, so a blocked visitor is
 * released without a sweeper.
 */
export async function consumeRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const col = db.collection(LIMITS);
  const now = new Date();
  const _id = `${key}:${Math.floor(now.getTime() / windowMs)}`;

  const doc = await col.findOneAndUpdate(
    { _id: _id as any },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + windowMs) } },
    { upsert: true, returnDocument: "after" }
  );

  const count = doc?.count ?? 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

/* ── comments ────────────────────────────────────────────────────────── */

export interface NewComment {
  postSlug: string;
  name?: string;
  body: string;
  visitorId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
}

/** Strips control characters and collapses runaway whitespace. */
function tidy(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateComment(input: {
  name?: unknown;
  body?: unknown;
}): { ok: true; name: string; body: string } | { ok: false; error: string } {
  const body = tidy(typeof input.body === "string" ? input.body : "");
  if (body.length < MIN_BODY) {
    return { ok: false, error: "Comment is too short." };
  }
  if (body.length > MAX_BODY) {
    return { ok: false, error: `Comment must be ${MAX_BODY} characters or fewer.` };
  }

  // Name is optional. Blank, whitespace-only or a non-string all fall back to
  // the default so the visitor never has to think about it.
  let name = typeof input.name === "string" ? tidy(input.name) : "";
  if (!name) name = DEFAULT_NAME;
  if (name.length > MAX_NAME) name = name.slice(0, MAX_NAME);

  return { ok: true, name, body };
}

export async function listComments(
  postSlug: string,
  viewerVisitorId: string | null
): Promise<BlogCommentView[]> {
  const db = await getDb();
  await ensureIndexes(db);
  const rows = await db
    .collection<BlogComment>(COMMENTS)
    .find({ postSlug, status: "approved" })
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  return rows.map((c) => ({
    id: c._id,
    name: c.name,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    mine: Boolean(viewerVisitorId && c.visitorId && c.visitorId === viewerVisitorId),
  }));
}

export async function addComment(
  input: NewComment
): Promise<{ ok: true; comment: BlogCommentView } | { ok: false; error: string }> {
  const db = await getDb();
  await ensureIndexes(db);

  const validated = validateComment(input);
  if (!validated.ok) return validated;

  const now = new Date();
  const doc: BlogComment = {
    // Random rather than sequential: a guessable id would let anyone edit or
    // delete somebody else's comment.
    _id: `c_${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 10)}`,
    postSlug: input.postSlug,
    name: validated.name,
    body: validated.body,
    createdAt: now,
    visitorId: input.visitorId ?? null,
    ipHash: input.ipHash ?? null,
    userAgent: input.userAgent ? input.userAgent.slice(0, 300) : null,
    status: "approved",
  };

  await db.collection<BlogComment>(COMMENTS).insertOne(doc);

  return {
    ok: true,
    comment: {
      id: doc._id,
      name: doc.name,
      body: doc.body,
      createdAt: doc.createdAt.toISOString(),
      mine: true,
    },
  };
}

/** Used by the moderation script. */
export async function deleteComment(id: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.collection<BlogComment>(COMMENTS).deleteOne({ _id: id });
  return (res.deletedCount ?? 0) > 0;
}

/**
 * Confirms a visitor owns a comment before allowing its deletion.
 *
 * Checked against the stored visitorId rather than trusting anything the
 * request claims, so a guessed id cannot be used to delete other people's
 * comments.
 */
export async function ownsComment(id: string, visitorId: string): Promise<boolean> {
  if (!id || !visitorId) return false;
  const db = await getDb();
  const doc = await db
    .collection<BlogComment>(COMMENTS)
    .findOne({ _id: id, visitorId }, { projection: { _id: 1 } });
  return Boolean(doc);
}

/* ── likes ───────────────────────────────────────────────────────────── */

/** Reads counts for many posts at once, so a listing page can show them. */
export async function getLikeCounts(slugs: string[]): Promise<Record<string, number>> {
  if (slugs.length === 0) return {};
  const db = await getDb();
  const rows = await db
    .collection(LIKES)
    .find({ postSlug: { $in: slugs } })
    .project<{ postSlug: string; count: number }>({ postSlug: 1, count: 1 })
    .toArray();
  const out: Record<string, number> = {};
  for (const s of slugs) out[s] = 0;
  for (const r of rows) out[r.postSlug] = r.count ?? 0;
  return out;
}

export async function getLikeState(
  postSlug: string,
  visitorId: string | null
): Promise<{ count: number; liked: boolean }> {
  const db = await getDb();
  const [doc, vote] = await Promise.all([
    db.collection(LIKES).findOne({ postSlug }),
    visitorId
      ? db.collection(LIKE_VOTES).findOne({ _id: `${postSlug}:${visitorId}` as any })
      : Promise.resolve(null),
  ]);
  return { count: doc?.count ?? 0, liked: Boolean(vote) };
}

/**
 * One like per visitor, toggled.
 *
 * The vote document's _id is what enforces the limit - a duplicate insert means
 * they already liked it, which becomes an unlike. No read-then-write race.
 */
export async function toggleLike(
  postSlug: string,
  visitorId: string
): Promise<{ count: number; liked: boolean }> {
  const db = await getDb();
  await ensureIndexes(db);

  const votes = db.collection(LIKE_VOTES);
  const counts = db.collection(LIKES);
  const voteId = `${postSlug}:${visitorId}` as any;

  try {
    await votes.insertOne({ _id: voteId, postSlug, createdAt: new Date() });
  } catch (err) {
    // Duplicate key: they had already liked it, so take it back.
    if ((err as { code?: number }).code === 11000) {
      await votes.deleteOne({ _id: voteId });
      const after = await counts.findOneAndUpdate(
        { postSlug },
        { $inc: { count: -1 }, $setOnInsert: { postSlug } },
        { returnDocument: "after" }
      );
      return { count: Math.max(0, after?.count ?? 0), liked: false };
    }
    throw err;
  }

  const after = await counts.findOneAndUpdate(
    { postSlug },
    { $inc: { count: 1 }, $setOnInsert: { postSlug } },
    { upsert: true, returnDocument: "after" }
  );
  return { count: after?.count ?? 1, liked: true };
}
