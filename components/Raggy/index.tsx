import { useEffect, useRef, useState } from 'react'
import styles from './raggy.module.css'
import { marked } from 'marked';
import DOMPurify from "dompurify"
import { useAtom, useSetAtom } from 'jotai';
import { messagesAtom } from '@/state/atoms';
import useRaggy from '@/hooks/use-raggy';
import { ArrowDown, ArrowLeft, Expand, Star } from 'lucide-react';
import Link from 'next/link';

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "@cf/ibm-granite/granite-4.0-h-micro": "IBM Granite 4.0",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "llama3.1:8b": "Llama 3.1 8B",
};

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
      statusStep?: string
      modelName?: string
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

export default function Raggy({ expanded = false }: { expanded?: boolean }) {
  // const [messages, setMessages] = useState<Message[]>([
  // ])
  const [messages, setMessages] = useAtom(messagesAtom)

  // drop orphaned loading stubs left over from interrupted streams on mount
  useEffect(() => {
    setMessages(prev => prev.filter(m => !(m.type === 'text' && m.isLoading && m.statusStep)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  const { callRagApi: handleCallRagApi } = useRaggy()

  async function callRagApi(question: string) {
    await handleCallRagApi(question)
  }

  return (
    <div id='raggy-container' className={styles.raggyContainer}>
      <RaggyHeader expanded={expanded}/>
      <Messages messages={messages} />
      <RaggyInput callRagApi={callRagApi} />
    </div>
  )
}

function RaggyHeader ({ expanded = false }: { expanded?: boolean }) {
  const setMessages = useSetAtom(messagesAtom)
  const clearRaggyChat = () => {
    setMessages([])
  }
  return (
    <section className={styles.header}>
      <div className={styles.headerInfo}>
        <span className={styles.headerTitle}>😎 Gama AI - Chat with Me!</span>
        <span className={styles.desc}>⚠️ Disclaimer: Gama AI may make mistakes. Responses are AI-generated and based on pre-trained data.</span>
      </div>
      <div className={styles.actions}>
        {!expanded && (
          <Link href="/chat" className={styles.expandChat} aria-label="Open full chat">
            <span className={styles.expandIcon}><Expand size={14} aria-hidden="true" /></span>
            Full Chat
          </Link>
        )}
        {expanded && (
          <Link href="/" className={styles.backChat} aria-label="Back to homepage">
            <span className={styles.backIcon}><ArrowLeft size={14} aria-hidden="true" /></span>
            Back
          </Link>
        )}
        <div className={styles.newChat} onClick={clearRaggyChat}>
          <span className={styles.newChatIcon}><Star size={14} aria-hidden="true" /></span>
          New Chat
        </div>
      </div>
    </section>
  )
}


function Messages({ messages = [] }: { messages: Message[] }) {
  const [showGoBottom, setShowGoBottom] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const isNearBottom = (el: HTMLDivElement, tolerance = 80) =>
    el.scrollHeight - el.scrollTop - el.clientHeight < tolerance

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    setShowGoBottom(!isNearBottom(el))
  }

  // on mount: jump straight to the last message (no smooth scroll)
  useEffect(() => {
    const el = listRef.current
    if (!el || !messages.length) return
    const jump = () => { el.scrollTop = el.scrollHeight }
    const raf = requestAnimationFrame(() => {
      jump()
      requestAnimationFrame(jump)
    })
    const t = setTimeout(jump, 250)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const last = messages[messages.length - 1]
  const lastMsgLen = last?.message?.length ?? 0

  // while a message is streaming / updating: keep pinned to bottom,
  // but only if the user hasn't scrolled up to read older messages
  useEffect(() => {
    const el = listRef.current
    if (!el || !last) return
    if (!isNearBottom(el)) {
      setShowGoBottom(true)
      return
    }
    el.scrollTop = el.scrollHeight
    setShowGoBottom(false)
  }, [last?.id, lastMsgLen, last?.statusStep, messages.length])

  // new message appended (user send / resume card): smooth scroll to bottom
  useEffect(() => {
    if (!messages.length) return
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  const goToBottom = () => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }

  return (
    <div className={styles.messagesWrap}>
      <div ref={listRef} onScroll={handleScroll} className={styles.messageList}>
        {!messages.length && <div className={styles.raggyPlaceholder}>
          <h1 className={styles.raggyTitle}>Gama AI 🐸 </h1>
          <h3 className={styles.raggyDesc}>Ask me anything about Ravi!</h3>
        </div>}
        {messages.map(m => <MessageItem {...m} key={m.id} />)}
      </div>
      {showGoBottom && messages.length > 0 && (
        <button
          className={styles.goBottomBtn}
          onClick={goToBottom}
          aria-label="Go to bottom"
        >
          <ArrowDown size={14} aria-hidden="true" />
          Go to bottom
        </button>
      )}
    </div>
  )
}

function MessageItem({ type, isLoading, payload, message = '', role = 'user', statusStep, modelName }: Message & { modelName?: string }) {
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

  if (isLoading && statusStep) {
    return (
      <div className={`${styles.messageItem} ${styles[role]} ${styles.statusLoader}`}>
        <StatusSteps currentStep={statusStep} />
      </div>
    )
  }

  const html = marked.parse(message) as string
  return (
    <div className={`${styles.messageItem} ${styles[role]} ${isLoading ? styles.loading : ''}`}>
      <div dangerouslySetInnerHTML={{ __html: DOMPurify?.sanitize(html) }} />
      {modelName && role === 'system' && !isLoading && (
        <span className={styles.modelBadge}>{MODEL_DISPLAY_NAMES[modelName] || modelName}</span>
      )}
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

const STATUS_STEPS = [
  { key: 'connecting',    label: 'Waking up my AI server',   icon: '☕' },
  { key: 'loading_model', label: 'Loading my knowledge',     icon: '🧠' },
  { key: 'searching',     label: 'Scanning my background',   icon: '🔎' },
  { key: 'generating',    label: 'Writing my reply',         icon: '✨' },
]

function StatusSteps({ currentStep }: { currentStep: string }) {
  const step = STATUS_STEPS.find(s => s.key === currentStep) || STATUS_STEPS[0]

  return (
    <div className={styles.statusSteps}>
      <div className={`${styles.statusStep} ${styles.statusActive}`}>
        <span className={styles.statusIcon}>{step.icon}</span>
        <span className={styles.statusLabel}>{step.label}</span>
        <span className={styles.statusDots}><span>.</span><span>.</span><span>.</span></span>
      </div>
    </div>
  )
}