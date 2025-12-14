// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { runRag } from '@/langchain'
import { rateLimit } from '@/rate-limit-mongo'
import type { NextApiRequest, NextApiResponse } from 'next'
import { NextResponse } from 'next/server'

type Data = {
  name: string
}
export const config = {
  api: {
    bodyParser: false, // Important for streaming
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const limit = await rateLimit(req)
  if (!limit.allowed) {
    return res.status(429).end("Hey there 👋, looks like you’re asking a lot of questions really quickly. Let’s take a short pause and try again in a minute 😊")
    // return new Response("", { status: 429 });
  }
  const ready = (req.query.ready as string)
  if (ready) {
    res.end('Ready')
  }
  const question = (req.query.q as string) || "Hello"
  // res.setHeader("Content-Type", "text/plain; charset=utf-8")
  // res.setHeader("Transfer-Encoding", "chunked")
  res.setHeader("Content-Type", "text/plain; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("Transfer-Encoding", "chunked")
  try {
    for await (const chunk of runRag({ question })) {
      res.write(chunk)  // send chunk as it arrives
      res.flush?.()
    }
    res.end()
  } catch (err) {
    console.error(err)
    res.status(500).end("Error running RAG pipeline")
  }
}
