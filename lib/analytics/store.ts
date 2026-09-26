import { ObjectId } from "mongodb";
import { turns, questionStats, feedbackEvents } from "./db";
import type {
  ChatTurn,
  ChatFeedbackEvent,
  TrackTurnPayload,
  FeedbackPayload,
} from "./types";
import { parseDevice, getClientIp, resolveGeo, hashIp } from "./context";
import { analyzeQuestion } from "./text";
import type { NextApiRequest } from "next";

/** Mongo silently rejects strings longer than the BSON key/field limits. */
const MAX_ANSWER_CHARS = 8000;
const MAX_QUESTION_CHARS = 2000;
const MAX_SNIPPET_CHARS = 400;

function clamp(value: string | undefined | null, max: number): string {
  if (!value) return "";
  return value.length > max ? value.slice(0, max) : value;
}

function toOutcome(value: unknown): ChatTurn["outcome"] {
  const allowed = ["llm", "resume_card", "rate_limited", "error", "no_context"];
  return allowed.includes(value as string) ? (value as ChatTurn["outcome"]) : "llm";
}

/**
 * Persists one Q&A turn plus the aggregate counter for its question.
 *
 * This is called from a fire-and-forget beacon on a request of its own, so it
 * is deliberately NOT awaited by anything on the chat response path. Every
 * failure here is swallowed - analytics must never surface to a user.
 */
export async function recordTurn(
  req: NextApiRequest,
  payload: TrackTurnPayload
): Promise<{ ok: boolean; exactKey?: string }> {
  const question = clamp(payload.question, MAX_QUESTION_CHARS);
  const answer = clamp(payload.answer, MAX_ANSWER_CHARS);
  if (!question) return { ok: false };

  const analysis = analyzeQuestion(question);
  const ip = getClientIp(req);
  const geo = await resolveGeo(req, ip);
  const ua = req.headers["user-agent"];
  const device = {
    ...parseDevice(typeof ua === "string" ? ua : ""),
    // Browser-reported values override anything we guessed from the UA.
    ...(payload.device ?? {}),
  } as ChatTurn["device"];

  const now = new Date();
  const totalMs = Number(payload.totalMs) || 0;
  const ttftMs =
    payload.ttftMs === null || payload.ttftMs === undefined
      ? null
      : Math.max(0, Math.round(Number(payload.ttftMs)));

  const doc: ChatTurn = {
    _id: payload.turnId,
    createdAt: now,
    question,
    answer,
    questionChars: question.length,
    answerChars: answer.length,
    model: payload.model ?? null,
    outcome: toOutcome(payload.outcome),
    httpStatus: payload.httpStatus ?? null,
    timing: {
      ttftMs,
      totalMs,
      sentAt: payload.sentAt || now.toISOString(),
    },
    sessionId: payload.sessionId,
    visitorId: payload.visitorId,
    turnIndex: Number(payload.turnIndex) || 0,
    isNewVisitor: Boolean(payload.isNewVisitor),
    isNewSession: Boolean(payload.isNewSession),
    device,
    geo,
    context: payload.page ?? {},
    text: {
      exactKey: analysis.exactKey,
      signature: analysis.signature,
      keywords: analysis.keywords,
      wordCount: analysis.wordCount,
      isQuestion: analysis.isQuestion,
      questionType: analysis.questionType,
      topics: analysis.topics,
      entities: analysis.entities,
      negativeSignals: analysis.negativeSignals,
    },
    feedback: null,
  };

  const turnsCol = await turns();
  const statsCol = await questionStats();

  await turnsCol.insertOne(doc);

  // One atomic upsert keeps the "asked N times" counter correct even with
  // concurrent identical questions.
  // NOTE: a field may not appear in both $setOnInsert and $inc/$push - Mongo
  // rejects that with "would create a conflict". $inc and $push create their
  // own fields on insert, so $setOnInsert only carries the descriptive ones.
  await statsCol.updateOne(
    { _id: analysis.exactKey },
    {
      $inc: {
        askCount: 1,
        totalSumMs: totalMs,
        ...(ttftMs === null ? {} : { ttftSumMs: ttftMs, ttftCount: 1 }),
      },
      $set: { lastAskedAt: now },
      $setOnInsert: {
        question,
        signature: analysis.signature,
        keywords: analysis.keywords,
        topics: analysis.topics,
        entities: analysis.entities,
        firstAskedAt: now,
      },
      $push: {
        sampleAnswers: {
          $each: [clamp(answer, MAX_SNIPPET_CHARS)],
          $slice: -3,
        },
      } as never,
    },
    { upsert: true }
  );

  return { ok: true, exactKey: analysis.exactKey };
}

/**
 * Records a thumbs up/down. Idempotent: clicking the same thumb twice clears
 * the vote, and flipping a vote moves the counters rather than double-counting.
 */
export async function recordFeedback(
  req: NextApiRequest,
  payload: FeedbackPayload
): Promise<{ ok: boolean; changed: boolean; rating?: 1 | -1 | 0; reason?: string }> {
  const turnId = payload.turnId;
  if (!turnId) return { ok: false, changed: false, reason: "missing turnId" };

  const turnsCol = await turns();
  const existing = await turnsCol.findOne({ _id: turnId });
  const previousRating = existing?.feedback?.rating ?? null;

  const question = clamp(
    existing?.question ?? payload.question,
    MAX_QUESTION_CHARS
  );
  const answer = existing?.answer ?? payload.answer ?? "";

  // 0 means "take my vote back".
  const clearing = payload.rating === 0;
  const rating: 1 | -1 | 0 = clearing ? 0 : payload.rating === 1 ? 1 : -1;

  if (existing && previousRating === rating) {
    return { ok: true, changed: false, rating, reason: "already rated" };
  }
  // Clearing a vote that never existed is a no-op.
  if (clearing && !existing) {
    return { ok: true, changed: false, rating, reason: "nothing to clear" };
  }

  const now = new Date();
  const event: ChatFeedbackEvent = {
    _id: new ObjectId().toHexString(),
    turnId,
    createdAt: now,
    rating: rating === 0 ? previousRating ?? -1 : rating,
    previousRating,
    comment: payload.comment ? clamp(payload.comment, 1000) : null,
    question,
    answerSnippet: clamp(answer, MAX_SNIPPET_CHARS),
    sessionId: payload.sessionId,
    visitorId: payload.visitorId,
  };

  const eventsCol = await feedbackEvents();
  await eventsCol.insertOne(event);

  if (existing) {
    await turnsCol.updateOne(
      { _id: turnId },
      clearing
        ? { $set: { feedback: null } }
        : {
            $set: {
              feedback: {
                rating: rating as 1 | -1,
                comment: event.comment,
                ratedAt: now,
              },
            },
          }
    );
  }

  // Only touch the aggregate when we know which question bucket it belongs to.
  if (existing?.text?.exactKey) {
    const statsCol = await questionStats();
    const inc: Record<string, number> = {};
    if (previousRating === 1) inc.thumbsUp = -1;
    if (previousRating === -1) inc.thumbsDown = -1;
    if (!clearing) inc[rating === 1 ? "thumbsUp" : "thumbsDown"] = 1;

    if (Object.keys(inc).length > 0) {
      await statsCol.updateOne({ _id: existing.text.exactKey }, { $inc: inc });
    }
  }

  return { ok: true, changed: true, rating };
}

export { hashIp };
