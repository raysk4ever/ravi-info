import { messagesAtom } from "@/state/atoms"
import { useAtom } from "jotai"
import { useChatAnalytics } from "@/hooks/use-chat-analytics"
import type { ChatOutcome } from "@/lib/analytics/types"

function useRaggy() {
  const [messages, setMessages] = useAtom(messagesAtom)
  const { startTurn, vote } = useChatAnalytics()
  // Hook implementation
  async function callRagApi(question: string) {
  const assistantMessageId = crypto.randomUUID()

  // Analytics is fire-and-forget: it never gates or delays the stream below.
  const turn = startTurn(question)

  setMessages(prev => [
    ...prev,
    {
      id: crypto.randomUUID(),
      message: question,
      role: "user",
      type: "text"
    },
    {
      id: assistantMessageId,
      message: "",
      role: "system",
      type: "text",
      isLoading: true,
      statusStep: "connecting",
      turnId: turn.turnId,
      question,
      feedback: 0 as const
    }
  ])

  const response = await fetch(`/api/raggy?q=${encodeURIComponent(question)}`)
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  let buffer = ""
  let streamedText = ""
  let outcome: ChatOutcome | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        // Update the final message to remove loading state
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, isLoading: false }
              : msg
          )
        )
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.trim()) continue

        let event: any
        try {
          event = JSON.parse(line)
        } catch {
          continue
        }

        switch (event.type) {
          case "status": {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, statusStep: event.step }
                  : msg
              )
            )
            break
          }

          case "text": {
            if (streamedText === "") turn.markFirstToken()
            streamedText += event.delta

            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, message: streamedText, isLoading: false, statusStep: undefined }
                  : msg
              )
            )
            break
          }

          case "model": {
            turn.setModel(event.name)
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, modelName: event.name }
                  : msg
              )
            )
            break
          }

          case "resume_card": {
            outcome = "resume_card"
            setMessages(prev => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "system",
                type: "resume_card",
                payload: event.payload
              }
            ])
            break
          }

          // Emitted by the server on its failure paths. The HTTP status is
          // unobservable once streaming headers are flushed, so these events
          // are the only reliable signal.
          case "error": {
            outcome = "error"
            break
          }

          case "rate_limited": {
            outcome = "rate_limited"
            break
          }

          // Nothing in the knowledge base matched - a coverage gap worth knowing.
          case "no_context": {
            outcome = "no_context"
            break
          }

          case "end": {
            console.log("Stream ended")
            break
          }
        }
      }
    }
  } catch (err) {
    // A broken stream still gets recorded - failed turns are exactly the ones
    // worth knowing about. The error text is already surfaced in the bubble.
    outcome = "error"
    console.error("[raggy] stream error", err)
  } finally {
    if (response.status === 429) outcome = "rate_limited"
    if (outcome) turn.setOutcome(outcome)
    turn.finish(streamedText, response.status)
  }
}
  return { callRagApi, vote };
}

export default useRaggy;
