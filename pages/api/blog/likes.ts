import type { NextApiRequest, NextApiResponse } from "next";
import { getLikeCounts, getLikeState, toggleLike } from "@/lib/blog-social";
import { isConfigured } from "@/lib/analytics/db";

/** Stable, non-identifying id so one visitor cannot inflate the count. */
function readVisitorId(req: NextApiRequest): string | null {
  const fromQuery = typeof req.query.visitorId === "string" ? req.query.visitorId : null;
  if (fromQuery) return fromQuery.slice(0, 64);
  if (typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body);
      if (typeof parsed?.visitorId === "string") return parsed.visitorId.slice(0, 64);
    } catch {
      return null;
    }
    return null;
  }
  // Next parses application/json into an object, so handle that shape too.
  const parsed = req.body as { visitorId?: unknown } | null;
  if (parsed && typeof parsed.visitorId === "string") {
    return parsed.visitorId.slice(0, 64);
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isConfigured()) {
    return res.status(200).json({ ok: false, count: 0, liked: false });
  }

  // Batch read for listing pages: ?slugs=a,b,c
  if (req.method === "GET") {
    const slugs = typeof req.query.slugs === "string" ? req.query.slugs.split(",") : null;
    try {
      if (slugs) {
        const clean = slugs.map((s) => s.trim()).filter(Boolean).slice(0, 50);
        return res.status(200).json({ ok: true, counts: await getLikeCounts(clean) });
      }
      const slug = typeof req.query.slug === "string" ? req.query.slug : "";
      if (!/^[a-z0-9-]{1,120}$/i.test(slug)) {
        return res.status(400).json({ ok: false, error: "Invalid post." });
      }
      const state = await getLikeState(slug, readVisitorId(req));
      return res.status(200).json({ ok: true, ...state });
    } catch (err) {
      console.error("[blog] like read failed:", (err as Error)?.message);
      return res.status(200).json({ ok: false, count: 0, liked: false });
    }
  }

  if (req.method === "POST") {
    let slug = typeof req.query.slug === "string" ? req.query.slug : "";
    const visitorId = readVisitorId(req);

    // slug may arrive in the body instead of the query, and Next hands back
    // either a parsed object or a raw string depending on the content type.
    let parsed: { slug?: unknown } | null = null;
    if (typeof req.body === "string") {
      try {
        parsed = JSON.parse(req.body);
      } catch {
        parsed = null;
      }
    } else if (req.body && typeof req.body === "object") {
      parsed = req.body as { slug?: unknown };
    }
    if (!slug && typeof parsed?.slug === "string") slug = parsed.slug;

    slug = slug.replace(/^\//, "");
    if (!/^[a-z0-9-]{1,120}$/i.test(slug) || !visitorId) {
      return res.status(400).json({ ok: false, error: "Invalid request." });
    }

    try {
      const state = await toggleLike(slug, visitorId);
      return res.status(200).json({ ok: true, ...state });
    } catch (err) {
      console.error("[blog] like write failed:", (err as Error)?.message);
      return res.status(500).json({ ok: false, error: "Could not save the like." });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

export const config = {
  api: { bodyParser: { sizeLimit: "8kb" } },
};
