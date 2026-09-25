import Head from 'next/head'
import styles from '@/styles/Chat.module.css'
import Raggy from '@/components/Raggy'

export default function ChatPage() {
  return (
    <>
      <Head>
        <title>Chat with Gama AI | Ravi Singh</title>
        <meta name="description" content="Chat with Gama AI, Ravi Singh's AI assistant. Ask anything about his experience, skills, projects, and background — powered by RAG over his resume." />
        <meta name="author" content="Ravi Singh" />
        <link rel="canonical" href="https://www.socialamigo.in/chat" />
        <meta property="og:title" content="Chat with Gama AI | Ravi Singh" />
        <meta property="og:description" content="Ask anything about Ravi Singh's experience, skills, projects, and background." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.socialamigo.in/chat" />
        <link rel="icon" href="/cloud.png" />
      </Head>
      <main className={styles.chatPage}>
        <div className={styles.chatPanel}>
          <Raggy expanded />
        </div>
      </main>
    </>
  )
}