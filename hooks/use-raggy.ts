import { messagesAtom } from "@/state/atoms"
import { useAtom } from "jotai"

function useRaggy() {
  const [messages, setMessages] = useAtom(messagesAtom)
  // Hook implementation
  async function callRagApi(question: string) {
  const assistantMessageId = crypto.randomUUID()

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
      message: "Thinking...",
      role: "system",
      type: "text",
      isLoading: true
    }
  ])

  const response = await fetch(`/api/raggy?q=${encodeURIComponent(question)}`)
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  let buffer = ""
  let streamedText = ""

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

      const event = JSON.parse(line)

      switch (event.type) {
        case "text": {
          streamedText += event.delta

          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, message: streamedText }
                : msg
            )
          )
          break
        }

        case "resume_card": {
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

        case "end":
          console.log("Stream ended")
          break
      }
    }
  }
}
  return { callRagApi };
}

export default useRaggy;