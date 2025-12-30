import { forwardRef, useEffect, useRef, useState } from 'react'
import styles from './raggy.module.css'
import { marked } from 'marked';
import DOMPurify from "dompurify"
import { useAtom, useSetAtom } from 'jotai';
import { messagesAtom } from '@/state/atoms';


// type Message = {
//   id: number | string,
//   message: string;
//   role: 'user' | 'system'
// }

export type Message =
  | {
      id: string
      role: "user" | "system"
      type: "text"
      message: string
      isLoading?: boolean
    }
  | {
      id: string
      role: "system"
      type: "resume_card"
      payload: {
        description: string
        downloadUrl: string
        fileType: string
        previewUrl: string
        sizeKB: number
        title: string
      }
    }

export default function Raggy() {
  // const [messages, setMessages] = useState<Message[]>([
  // ])
  const [messages, setMessages] = useAtom(messagesAtom)

  // async function callRagApi(question: string) {
  //   setMessages(prev => [...prev, {id: crypto.randomUUID(), message: question, role: 'user' }, { id: crypto.randomUUID(), message: 'Thinking...', role: 'system' }])
  //   const response = await fetch(`/api/raggy?q=${encodeURIComponent(question)}`)
  //   const reader = response.body?.getReader()
  //   const decoder = new TextDecoder()
  //   let result = ""
  //   while (true) {
  //     const { done, value } = await reader!.read()
  //     if (done) break
  //     result += decoder.decode(value, { stream: true })
  //     console.log("Chunk:", decoder.decode(value)) // Each streamed piece
  //     setMessages(prev => {
  //       const updated = [...prev]
  //       updated[updated.length - 1] = { ...updated[updated.length - 1], message: result}
  //       return updated
  //     })
  //     setTimeout(() => {
  //       endMessageRef.current?.scrollIntoView({behavior: "smooth",  inline: "center", block: "nearest",})
  //     }, 10)
  //   }

  //   return result
  // }
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

    setTimeout(() => {
      endMessageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      })
    }, 10)
  }
}


  const endMessageRef = useRef<HTMLDivElement>()


  return (
    <div className={styles.raggyContainer}>
      <RaggyHeader/>
      <Messages messages={messages} ref={endMessageRef} />
      <RaggyInput callRagApi={callRagApi} />
    </div>
  )
}

function RaggyHeader () {
  const setMessages = useSetAtom(messagesAtom)
  const clearRaggyChat = () => {
    setMessages([])
  }
  return (
    <section className={styles.header}>
      <div>
        <span>😎 Gama AI - Chat with Me!</span>
        <span className={styles.desc}>⚠️ Disclaimer: Gama AI may make mistakes. Responses are AI-generated and based on pre-trained data.</span>
      </div>
      <div className={styles.actions} onClick={clearRaggyChat}>
        🌟 New Chat
      </div>
    </section>
  )
}


const Messages = forwardRef<HTMLDivElement, any>(({ messages = [] }, endMessageRef) => {
  // console.log('messages', messages);
  useEffect(() => {
    if (endMessageRef?.current) {
      endMessageRef.current?.scrollIntoView({behavior: "smooth",  inline: "center", block: "nearest",})
    }
  }, [messages.length, endMessageRef])

  return (
    <div className={styles.messageList}>
      {!messages.length && <div className={styles.raggyPlaceholder}>
        <h1 className={styles.raggyTitle}>Gama AI 🐸 </h1>
        <h3 className={styles.raggyDesc}>Ask me anything about Ravi!</h3>
      </div>}
      {messages.map(m => <MessageItem {...m} key={m.id} />)}
      <div ref={endMessageRef}></div>
    </div>
  )
})
Messages.displayName = 'Messages'

function MessageItem({ type, isLoading, payload, message = '', role = 'user' }: Message) {
  console.log('message', message);

  if (type === 'resume_card') {
    const { title, description, previewUrl, downloadUrl, fileType, sizeKB } = payload
    return (
      <div className={`${styles.messageItem} ${styles[role]}`}>
        <div className={styles.resumeCard}>
          <div className={styles.resumeDetails}>
            <h4>{title}</h4>
            <p>{description}</p>
            <span>{fileType.toUpperCase()} · {sizeKB} KB</span>
            <a role='button' href={downloadUrl} download className={styles.downloadButton}>Download Resume</a>
          </div>
        </div>
      </div>
    )
  }
  const html = marked.parse(message) as string
  console.log('html', html);
  return (
    <div
      className={`${styles.messageItem} ${styles[role]} ${isLoading ? styles.loading : ''}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify?.sanitize(html) }}
    >
    </div>
  )
}

function RaggyInput({ callRagApi }: any) {
  const [input, setInput] = useState('')
  const handleOnClick = (e) => {
    e.preventDefault()
    if (!input) return
    setInput('')
    if (input.length > 300) {
      alert('Please limit your question to 1000 characters.')
      return
    }
    callRagApi(input)
  }
  const suggestions = [
    'Hi there! Can you introduce yourself?',
    'What projects have you worked on recently?',
    'Share me your Resume',
    'Can you summarize your professional background?',
    'What kind of roles are you looking for next?',
    'Tell me something unique about yourself?',
    'What is your main tech stack?',
  ]
  return (
    <>
    <div className={styles.suggestions}>
      {suggestions.map(s => <span onClick={() => callRagApi(s)} key={s}>{s}</span>)}
    </div>
    <form onSubmit={handleOnClick} className={styles.inputContainer}>
      <input autoFocus value={input} onChange={e => setInput(e.target.value)} type="text" placeholder="Enter your question here.." />
      <button type='submit'>Send</button>
    </form>
    </>
  )
}