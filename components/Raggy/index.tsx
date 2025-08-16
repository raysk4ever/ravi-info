import { ForwardedRef, forwardRef, useEffect, useRef, useState } from 'react'
import styles from './raggy.module.css'
import { marked } from 'marked';
import DOMPurify from "dompurify"


type Message = {
  id: number | string,
  message: string;
  role: 'user' | 'system'
}

export default function Raggy() {
  const [messages, setMessages] = useState<Message[]>([
  ])

  async function callRagApi(question: string) {
    setMessages(prev => [...prev, {id: crypto.randomUUID(), message: question, role: 'user' }, { id: crypto.randomUUID(), message: 'Thinking...', role: 'system' }])
    const response = await fetch(`/api/raggy?q=${encodeURIComponent(question)}`)
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let result = ""
    while (true) {
      const { done, value } = await reader!.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
      console.log("Chunk:", decoder.decode(value)) // Each streamed piece
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], message: result}
        return updated
      })
      setTimeout(() => {
        endMessageRef.current?.scrollIntoView({behavior: "smooth",  inline: "center", block: "nearest",})
      }, 10)
    }

    return result
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
  return (
    <section className={styles.header}>
      <span>😎 Gama AI - Chat with Me!</span>
      <span className={styles.desc}>⚠️ Disclaimer: Gama AI may make mistakes. Responses are AI-generated and based on pre-trained data.</span>
    </section>
  )
}

const Messages = forwardRef<HTMLDivElement, any>(({ messages = [] }, endMessageRef) => {
  useEffect(() => {
    if (endMessageRef?.current) {
      endMessageRef.current?.scrollIntoView({behavior: "smooth",  inline: "center", block: "nearest",})
    }
  }, [messages.length, endMessageRef])

  return (
    <div className={styles.messageList}>
      {!messages.length && <div className={styles.raggyPlaceholder}>
        <h1>Gama AI 🐸</h1>
        <h3>Ask me anything about Ravi</h3>
      </div>}
      {messages.map(m => <MessageItem {...m} key={m.id} />)}
      <div ref={endMessageRef}></div>
    </div>
  )
})
Messages.displayName = 'Messages'

function MessageItem({ message = '', role = 'user' }: Message) {
  const html = marked.parse(message) as string
  return (
    <div
      className={`${styles.messageItem} ${styles[role]}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
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
    callRagApi(input)
  }
  const suggestions = [
    'Who is Ravi Singh?',
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