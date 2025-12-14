import { MongoClient } from "mongodb";
import { NextApiRequest } from "next";
import { NextRequest } from "next/server";

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

const client = new MongoClient(process.env.MONGODB_URI!);
const col = client.db().collection("rate_limits");

export async function rateLimit(req: NextApiRequest) {
  const ip = getClientIp(req);
  console.log('ip', ip)
  const key = `rate:${ip}`;
  const now = new Date();

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
  console.log(doc, 'doc')
  const isDev = process.env.NODE_ENV === 'development';
  const LIMIT = isDev ? 20 : 5; // higher limit for development
  return { allowed: doc?.count <= LIMIT };
}
