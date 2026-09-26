import type { NextApiRequest, NextApiResponse } from "next";
import { recordTurn } from "@/lib/analytics/store";
import { isConfigured } from "@/lib/analytics/db";
import type { TrackTurnPayload } from "@/lib/analytics/types";

/**
 * Receives one completed chat turn.
 *
 * This is a separate endpoint from /api/raggy on purpose: the browser fires it
 * with sendBeacon *after* the answer has fully streamed, so it never competes
 * with the response for bandwidth or a connection slot.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // sendBeacon posts text/plain, so don't rely on the JSON body parser.
  const raw =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});

  let payload: TrackTurnPayload;
  try {
    payload = JSON.parse(raw) as TrackTurnPayload;
  } catch {
    return res.status(400).json({ ok: false, error: "invalid json" });
  }

  if (!payload?.turnId || !payload?.question) {
    return res.status(400).json({ ok: false, error: "missing fields" });
  }

  if (!isConfigured()) {
    // Not an error worth surfacing - just acknowledge and drop.
    return res.status(202).json({ ok: false, skipped: "no MONGODB_URI" });
  }

  try {
    const result = await recordTurn(req, payload);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[analytics] track failed:", (err as Error)?.message);
    // 200 so the browser treats it as delivered and stops retrying.
    return res.status(200).json({ ok: false, error: "write failed" });
  }
}
