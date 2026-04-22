import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import LandingPage from '@/components/Landing'
import About from '@/components/About'
import Skills from '@/components/Skills'
import Experience from '@/components/Experience'
import Projects from '@/components/Projects'
import Contact from '@/components/Contact'
import useScrollReveal from '@/hooks/use-scroll-reveal'

export default function Home() {
  useScrollReveal()

  return (
    <>
      <Head>
        <title>Ravi Singh | AI Engineer — Agentic AI, RAG, LangChain</title>
        <meta name="description" content="AI Engineer specializing in Agentic AI, RAG pipelines, LangChain, LangGraph, and MCP. Building intelligent multi-agent systems, LLM-powered applications, and full-stack solutions with Next.js, Node.js, and cloud infrastructure." />
        <meta name="keywords" content="AI Engineer, Agentic AI, RAG, Retrieval Augmented Generation, LangChain, LangGraph, MCP, Model Context Protocol, LLM, Large Language Models, OpenAI, Gemini, Ollama, LlamaIndex, FAISS, Vector Database, Multi-Agent Systems, Tool Calling, Software Engineer, Full-Stack Developer, React Developer, Next.js Developer, Node.js Developer, TypeScript, Python, Docker, Kubernetes, AWS, ravi, ravi kant singh, ravi singh, raysk4ever" />
        <meta name="author" content="Ravi Singh" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Canonical */}
        <link rel="canonical" href="https://www.socialamigo.in" />

        {/* Open Graph */}
        <meta property="og:title" content="Ravi Singh | AI Engineer — Agentic AI, RAG, LangChain" />
        <meta property="og:description" content="AI Engineer building Agentic AI systems, RAG pipelines, and LLM-powered applications with LangChain, LangGraph, and MCP." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.socialamigo.in" />

        {/* Twitter */}
        <meta name="twitter:title" content="Ravi Singh | AI Engineer" />
        <meta name="twitter:description" content="AI Engineer building Agentic AI systems, RAG pipelines, and LLM-powered applications." />

        {/* JSON-LD Person + WebSite Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://www.socialamigo.in/#website",
                  url: "https://www.socialamigo.in",
                  name: "Ravi Singh — AI Engineer",
                  description: "AI Engineer specializing in Agentic AI, RAG, LangChain, and LangGraph",
                  publisher: { "@id": "https://www.socialamigo.in/#person" },
                },
                {
                  "@type": "Person",
                  "@id": "https://www.socialamigo.in/#person",
                  name: "Ravi Singh",
                  url: "https://www.socialamigo.in",
                  jobTitle: "AI Engineer & Full-Stack Developer",
                  description: "AI Engineer specializing in Agentic AI, RAG pipelines, LangChain, LangGraph, and MCP",
                  image: "https://www.socialamigo.in/ravi.png",
                  sameAs: [
                    "https://github.com/raysk4ever",
                    "https://www.linkedin.com/in/ravi-ksingh/",
                    "https://stackoverflow.com/users/11216915/ravi-singh",
                    "https://techgama.medium.com/",
                  ],
                  knowsAbout: [
                    "Agentic AI", "RAG", "LangChain", "LangGraph", "MCP",
                    "LLM", "OpenAI", "React", "Next.js", "Node.js",
                    "TypeScript", "Python", "Docker", "Kubernetes", "AWS",
                  ],
                },
              ],
            }),
          }}
        />

        <link rel="icon" href="/cloud.png" />
      </Head>
      <main className={styles.main}>
        <LandingPage />
        <About />
        <Skills />
        <Experience />
        <Projects />

        <Contact />
      </main>
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Ravi Singh. All rights reserved.</p>
      </footer>
    </>
  )
}
