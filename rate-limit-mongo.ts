import { MongoClient } from "mongodb";
import { NextApiRequest } from "next";

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

const uri = process.env.MONGODB_URI!

export async function rateLimit(req: NextApiRequest) {
  try {
    const ip = getClientIp(req);
    console.log('ip', ip)
    const key = `rate:${ip}`;
    const now = new Date();
    if (!uri) throw new Error("MONGODB_URI is not defined in environment variables");
    const client = new MongoClient(uri);
    const dbName = process.env.MONGODB_DB_NAME! || "test";
    const col = client.db(dbName).collection("rate_limits");

    const doc = await col.findOneAndUpdate(
      { _id: key as any },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          expiresAt: new Date(now.getTime() + 60_000),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    const isDev = process.env.NODE_ENV === 'development';
    const LIMIT = isDev ? 200 : 5; // higher limit for development
    console.log(`Rate limit for ${ip}: ${doc?.count}/${LIMIT}`);
    
    return { allowed: doc?.count <= LIMIT }; 
  } catch (error) {
    console.log('Rate Limit Error:', error);
    // In case of any error (e.g., DB connection issues), allow the request to proceed to avoid blocking users unnecessarily.
    return { allowed: true };
  }
}
