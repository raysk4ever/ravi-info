import type { NextApiRequest, NextApiResponse } from "next";
import {
  addComment,
  listComments,
  deleteComment,
  consumeRateLimit,
  ownsComment,
  COMMENT_LIMIT,
  COMMENT_WINDOW_MS,
  MAX_BODY,
  MAX_NAME,
} from "@/lib/blog-social";
import { getMongoClient, resolveDbName } from "@/lib/mongo-db";
import { hashIp } from "@/lib/analytics/context";
import { isConfigured } from "@/lib/analytics/db";

/** Reads a JSON body regardless of the content type the client chose. */
function readJson(req: NextApiRequest): any {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body ?? null;
}

function getIp(req: NextApiRequest): string | null {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0].trim();
  return req.socket?.remoteAddress ?? null;
}

function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && /^[a-z0-9-]{1,120}$/i.test(slug);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isConfigured()) {
    return res.status(503).json({ ok: false, error: "Comments are unavailable right now." });
  }

  const slug = (typeof req.query.slug === "string" ? req.query.slug : "").replace(
    /^\//,
    ""
  );
  if (!isValidSlug(slug)) {
    return res.status(400).json({ ok: false, error: "Invalid post." });
  }

  /* ── read ─────────────────────────────────────────────────────────── */
  if (req.method === "GET") {
    try {
      const viewer =
        typeof req.query.visitorId === "string" ? req.query.visitorId.slice(0, 64) : null;
      const comments = await listComments(slug, viewer);
      return res.status(200).json({ ok: true, comments, count: comments.length });
    } catch (err) {
      console.error("[blog] list comments failed:", (err as Error)?.message);
      return res.status(200).json({ ok: false, comments: [], count: 0 });
    }
  }

  /* ── create ───────────────────────────────────────────────────────── */
  if (req.method === "POST") {
    const payload = readJson(req);
    if (!payload) return res.status(400).json({ ok: false, error: "Invalid request." });

    // Honeypot: a field that is hidden from people and irresistible to bots.
    // Rejecting quietly is better than an error, so the bot does not learn.
    if (typeof payload.website === "string" && payload.website.trim() !== "") {
      return res.status(200).json({ ok: true, comment: null, filtered: true });
    }

    const ip = getIp(req);
    const ipHash = hashIp(ip);

    try {
      const client = await getMongoClient();
      const db = client.db(resolveDbName());
      const limit = await consumeRateLimit(
        db,
        `comment:${ipHash ?? "unknown"}`,
        COMMENT_LIMIT,
        COMMENT_WINDOW_MS
      );
      if (!limit.allowed) {
        return res.status(429).json({
          ok: false,
          error: "You are commenting a little too quickly. Try again in a few minutes.",
        });
      }
    } catch (err) {
      // If the limiter itself is down, do not block the comment.
      console.warn("[blog] rate limit check skipped:", (err as Error)?.message);
    }

    try {
      const result = await addComment({
        postSlug: slug,
        name: payload.name,
        body: payload.body,
        visitorId: typeof payload.visitorId === "string" ? payload.visitorId.slice(0, 64) : null,
        ipHash,
        userAgent: req.headers["user-agent"] ?? null,
      });

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }
      return res.status(201).json(result);
    } catch (err) {
      console.error("[blog] add comment failed:", (err as Error)?.message);
      return res.status(500).json({ ok: false, error: "Could not save the comment." });
    }
  }

  /* ── delete (author's own comment) ────────────────────────────────── */
  if (req.method === "DELETE") {
    const payload = readJson(req);
    const id = typeof payload?.id === "string" ? payload.id : "";
    const visitorId = typeof payload?.visitorId === "string" ? payload.visitorId : "";
    if (!id || !visitorId) {
      return res.status(400).json({ ok: false, error: "Missing fields." });
    }

    // Ownership is checked against the stored visitorId, not trusted from the
    // request alone.
    const owns = await ownsComment(id, visitorId);
    if (!owns) {
      return res.status(403).json({ ok: false, error: "Not your comment." });
    }
    const removed = await deleteComment(id);
    return res.status(200).json({ ok: removed });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

export const config = {
  api: { bodyParser: { sizeLimit: "16kb" } },
};

export { MAX_BODY, MAX_NAME };
