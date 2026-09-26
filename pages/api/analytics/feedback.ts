import type { NextApiRequest, NextApiResponse } from "next";
import { recordFeedback } from "@/lib/analytics/store";
import { isConfigured } from "@/lib/analytics/db";
import type { FeedbackPayload } from "@/lib/analytics/types";

/** Thumbs up / thumbs down on an assistant answer. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method not allowed" });
  }

  const raw =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});

  let payload: FeedbackPayload;
  try {
    payload = JSON.parse(raw) as FeedbackPayload;
  } catch {
    return res.status(400).json({ ok: false, error: "invalid json" });
  }

  if (
    !payload?.turnId ||
    (payload?.rating !== 1 && payload?.rating !== -1 && payload?.rating !== 0)
  ) {
    return res.status(400).json({ ok: false, error: "missing fields" });
  }

  if (!isConfigured()) {
    return res.status(202).json({ ok: false, skipped: "no MONGODB_URI" });
  }

  try {
    const result = await recordFeedback(req, payload);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[analytics] feedback failed:", (err as Error)?.message);
    return res.status(200).json({ ok: false, error: "write failed" });
  }
}
