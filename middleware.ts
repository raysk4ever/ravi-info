// middleware.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getRedis } from "./redis";

export async function middleware(req: NextRequest) {
  try {
    const ip = req.ip ?? req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const key = `rate-limit:${ip}`;
    const redis = await getRedis()
    const count = (await redis.incr(key)) ?? 0;
    console.log('inside middleware', count);
    
    if (count === 1) {
      await redis.expire(key, 60); // reset after 60 seconds
    }

    if (count > 5) {
      return new Response("Hey there 👋, looks like you’re asking a lot of questions really quickly. Let’s take a short pause and try again in a minute 😊", { status: 429 });
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware Error: Redis is down...')
    // return new Response(
    //   "😕 Oops! Our chat service is having a little trouble right now. Please try again in a few minutes 💙",
    //   { status: 503 }
    // );
    return NextResponse.next()
  }

}

export const config = {
  matcher: "/api/raggy/:path*",
};
