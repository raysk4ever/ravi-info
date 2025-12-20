// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { runRag } from '@/langchain'
import { rateLimit } from '@/rate-limit-mongo'
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  name: string
}
export const config = {
  api: {
    bodyParser: false, // Important for streaming
  },
}
const writeEvent = (res: NextApiResponse<Data>, event: any) => {
  res.write(JSON.stringify(event) + "\n");
  (res as any).flush?.();  // imp: flush the response buffer to ensure immediate delivery
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  setStreamHeaders(res)
  const limit = await rateLimit(req)
  if (!limit.allowed) {
  // if (true) {
    console.log('😢 Limit exceeds.');
    // send message with contact details.
    // simulate streaming text response by words
    const staticMessages = [
      "Hey there 👋, looks like you’re asking a lot of questions really quickly. Let’s take a short pause and try again in a minute 😊.",
      "<br /></br>If you have urgent queries or need assistance, feel free to reach out to me directly at 📭 raysk7161@gmail.com | 📞 <a href='tel:+91-6396180310'>+91-6396180310</a>.",
      "<br /></br>Message me on <a target='_blank' href='https://www.linkedin.com/in/ravi-ksingh/'>LinkedIn</a> or connect with me on <a target='_blank' href='https://wa.me/916396180310'>whatsapp</a> for quicker responses!",
    ]
    for (const msg of staticMessages) {
      for await (const chunk of msg.split(" ")) {
        await new Promise(res => setTimeout(res, 10)) // simulate delay
        writeEvent(res, { type: "text", delta: chunk + " " });
      }
    }
    writeEvent(res, { type: "end" });
    return res.status(429).end()
    // return new Response("", { status: 429 });
  }
  const ready = (req.query.ready as string)
  if (ready) {
    res.end('Ready')
  }
  const question = (req.query.q as string) || "Hello"
  // res.setHeader("Content-Type", "text/plain; charset=utf-8")
  // res.setHeader("Transfer-Encoding", "chunked")
  try {
    const wantsResume = /resume|cv|profile|bio/i.test(question);
    if (wantsResume) {
      // Simulate streaming text for resume request

      writeEvent(res, { type: 'text', delta: "Sure, here is my resume ❤️" })

      writeEvent(res, {
        type: "resume_card",
        payload: {
          title: "Ravi Singh — Resume",
          description: "Senior Software Engineer | Full Stack Developer + AI",
          previewUrl: "/resume/preview.png",
          downloadUrl: "/resume/Ravi_Resume.pdf",
          fileType: "pdf",
          sizeKB: 171
        }
      });
      writeEvent(res, { type: "end" });
      return res.end()
    }

    for await (const chunk of runRag({ question })) {
      writeEvent(res, { type: 'text', delta: chunk })
    }
    writeEvent(res, { type: "end" });
    res.end()
  } catch (err) {
    console.error(err)
    res.status(500).end("Error running RAG pipeline")
  }
}


// response headers for streaming
function setStreamHeaders(res: NextApiResponse) {

  res.setHeader("Content-Type", "text/plain; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("Transfer-Encoding", "chunked")
}