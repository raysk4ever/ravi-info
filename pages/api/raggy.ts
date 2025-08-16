// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { runRag } from '@/langchain'
import type { NextApiRequest, NextApiResponse } from 'next'

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
