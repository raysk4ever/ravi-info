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
    setMessages(prev => [...prev, {id: crypto.randomUUID(), message: question, role: 'user' }, { id: 111, message: 'Thinking...', role: 'system' }])
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
      endMessageRef.current?.scrollIntoView(false)
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
      Chat with Me!
    </section>
  )
}

const Messages = forwardRef<HTMLDivElement, any>(({ messages = [] }, endMessageRef) => {
  useEffect(() => {
    if (endMessageRef?.current) {
      endMessageRef.current?.scrollIntoView(false)
    }
  }, [messages.length, endMessageRef])

  return (
    <div className={styles.messageList}>
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
  return (
    <form onSubmit={handleOnClick} className={styles.inputContainer}>
      <input value={input} onChange={e => setInput(e.target.value)} type="text" placeholder="Ask me anything about Ravi.." />
      <button type='submit'>Send</button>
    </form>
  )
}