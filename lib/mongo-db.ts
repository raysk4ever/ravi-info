import { MongoClient } from "mongodb";

/**
 * Single source of truth for which Mongo database we talk to.
 *
 * Local development and production previously shared one database, so local
 * test traffic and real visitor analytics ended up interleaved. They are now
 * separate:
 *
 *   production -> prod      (MONGODB_DB_NAME is already set to this on Vercel,
 *                            so deployed behaviour is unchanged)
 *   local dev  -> socialamigo_dev
 *
 * MONGODB_DB_NAME always wins when set, which is how the insights CLI forces a
 * specific database via `--env`. The names below are only fallbacks for when
 * that variable is missing, so they are kept aligned with the existing
 * convention rather than inventing a new one.
 */

export const PROD_DB_NAME = "prod";
export const DEV_DB_NAME = "socialamigo_dev";

export type DbEnvironment = "local" | "prod";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Resolve the database name.
 *
 * @param override  explicit name, e.g. from the CLI's `--env` flag
 * @param asProd    treat the process as production even if NODE_ENV says
 *                  otherwise (the CLI is run outside a Next.js runtime)
 */
export function resolveDbName(
  override?: string | null,
  asProd?: boolean
): string {
  if (override && override.trim()) return override.trim();
  const production = asProd ?? isProduction();
  return production ? PROD_DB_NAME : DEV_DB_NAME;
}

/** Which side of the split the current process is on. */
export function currentEnvironment(): DbEnvironment {
  return isProduction() ? "prod" : "local";
}

let clientPromise: Promise<MongoClient> | null = null;

type GlobalWithMongo = typeof globalThis & { __mongoClientPromise?: Promise<MongoClient> };

/**
 * Cached client.
 *
 * Reusing one client matters: MongoClient owns a connection pool, and opening a
 * new one per request means a fresh TLS handshake to Atlas on every call. On
 * serverless it also leaks sockets. Cached on globalThis so it survives dev HMR.
 */
export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  const g = globalThis as GlobalWithMongo;
  if (!g.__mongoClientPromise) {
    const client = new MongoClient(uri, {
      // Analytics and rate limiting are best-effort: fail fast rather than
      // stalling a request behind an unreachable database.
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    g.__mongoClientPromise = client.connect();
  }
  clientPromise = g.__mongoClientPromise;
  return clientPromise;
}

/** Test seam - lets the CLI and scripts pass a name without touching env. */
export function resetMongoClientForTests(): void {
  (globalThis as GlobalWithMongo).__mongoClientPromise = undefined;
  clientPromise = null;
}
