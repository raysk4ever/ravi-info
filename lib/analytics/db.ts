import type { Collection, Db } from "mongodb";
import { getMongoClient, resolveDbName } from "@/lib/mongo-db";
import type {
  ChatTurn,
  ChatQuestionStat,
  ChatFeedbackEvent,
} from "./types";

/**
 * Mongo access for chat analytics.
 *
 * Local dev and production live in separate databases - see lib/mongo-db.ts.
 * The client is a shared cached singleton so the serverless function does not
 * open a new connection pool per request.
 */

export const TURNS = "chat_turns";
export const STATS = "chat_question_stats";
export const FEEDBACK = "chat_feedback";

let indexesEnsured = false;

/** Which database the current process writes to. */
export function currentDbName(): string {
  return resolveDbName();
}

/** False when there is no URI, so callers can drop writes instead of throwing. */
export function isConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(currentDbName());
}

async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    await Promise.all([
      db.collection(TURNS).createIndexes([
        { key: { createdAt: -1 }, name: "createdAt_desc" },
        { key: { "text.exactKey": 1 }, name: "exactKey" },
        { key: { "text.signature": 1 }, name: "signature" },
        { key: { "feedback.rating": 1 }, name: "feedback_rating" },
        { key: { outcome: 1 }, name: "outcome" },
        { key: { "geo.countryCode": 1 }, name: "country" },
        { key: { "text.topics": 1 }, name: "topics" },
        { key: { visitorId: 1 }, name: "visitor" },
        { key: { sessionId: 1, turnIndex: 1 }, name: "session_turn" },
      ]),
      db.collection(STATS).createIndexes([
        { key: { askCount: -1 }, name: "askCount_desc" },
        { key: { lastAskedAt: -1 }, name: "lastAskedAt_desc" },
        { key: { signature: 1 }, name: "signature" },
        { key: { thumbsDown: -1 }, name: "thumbsDown_desc" },
        { key: { topics: 1 }, name: "topics" },
      ]),
      db.collection(FEEDBACK).createIndexes([
        { key: { turnId: 1 }, name: "turnId" },
        { key: { createdAt: -1 }, name: "createdAt_desc" },
        { key: { rating: 1 }, name: "rating" },
      ]),
    ]);
  } catch (err) {
    // Never let index creation break a request.
    console.warn("[analytics] index setup failed:", (err as Error)?.message);
  }
}

export async function turns(): Promise<Collection<ChatTurn>> {
  const db = await getDb();
  await ensureIndexes(db);
  return db.collection<ChatTurn>(TURNS);
}

export async function questionStats(): Promise<Collection<ChatQuestionStat>> {
  const db = await getDb();
  await ensureIndexes(db);
  return db.collection<ChatQuestionStat>(STATS);
}

export async function feedbackEvents(): Promise<Collection<ChatFeedbackEvent>> {
  const db = await getDb();
  await ensureIndexes(db);
  return db.collection<ChatFeedbackEvent>(FEEDBACK);
}
