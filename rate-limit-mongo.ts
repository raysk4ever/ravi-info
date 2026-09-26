import type { Collection } from "mongodb";
import { NextApiRequest } from "next";
import { getMongoClient, resolveDbName, isProduction } from "@/lib/mongo-db";

function getClientIp(req: NextApiRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") {
    return xff.split(",")[0].trim();
  }

  return (
    req.socket?.remoteAddress ??
    "unknown"
  );
}

// Window in which a visitor may send up to LIMIT messages.
const WINDOW_MS = 60_000;

let ttlIndexEnsured = false;

/**
 * Drop the counter once its window has elapsed.
 *
 * The original upsert filtered on nothing but `_id` and assumed `expiresAt` would
 * be cleaned up for us, but nothing ever read or expired that field - so `count`
 * was really a lifetime total, and anyone who hit the limit stayed locked out
 * permanently. Expiring the document ourselves makes the window real.
 */
async function resetIfExpired(col: Collection, key: string, now: Date) {
  await col.deleteMany({ _id: key as any, expiresAt: { $lte: now } });
}

async function ensureTtlIndex(col: Collection) {
  if (ttlIndexEnsured) return;
  ttlIndexEnsured = true;
  try {
    // Housekeeping only - correctness comes from resetIfExpired above.
    await col.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: "expiresAt_ttl" }
    );
  } catch (error) {
    console.log("TTL index setup skipped:", (error as Error)?.message);
  }
}

export async function rateLimit(req: NextApiRequest) {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }
    const ip = getClientIp(req);
    const key = `rate:${ip}`;
    const now = new Date();

    // Shared cached client: a fresh MongoClient per request means a fresh
    // connection pool and TLS handshake on every chat message.
    const client = await getMongoClient();
    // Separate dev/prod databases, so local testing never spends the
    // production quota for your own IP.
    const dbName = resolveDbName();
    const col = client.db(dbName).collection("rate_limits");

    await resetIfExpired(col, key, now);
    await ensureTtlIndex(col);

    const doc = await col.findOneAndUpdate(
      { _id: key as any },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          expiresAt: new Date(now.getTime() + WINDOW_MS),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    const LIMIT = isProduction() ? 15 : 200; // much higher limit locally
    console.log(`Rate limit [${dbName}] ${ip}: ${doc?.count}/${LIMIT}`);

    return { allowed: doc?.count <= LIMIT };
  } catch (error) {
    console.log('Rate Limit Error:', error);
    // In case of any error (e.g., DB connection issues), allow the request to proceed to avoid blocking users unnecessarily.
    return { allowed: true };
  }
}
