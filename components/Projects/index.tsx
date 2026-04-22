import React from 'react'
import ProjectItem from './ProjectItem'
import styles from '@/styles/Home.module.css'
import { SiAndroid, SiFfmpeg, SiJavascript, SiMongodb, SiMysql, SiNextdotjs, SiNodedotjs, SiOpenai, SiPython, SiReact, SiTypescript, SiVite } from 'react-icons/si'
import { TbBrandReactNative, TbBrandSocketIo } from 'react-icons/tb'
import { GiArtificialHive } from 'react-icons/gi'
import { BsDiagram3 } from 'react-icons/bs'
import { RiRobot2Line } from 'react-icons/ri'
import { VscSymbolMisc } from 'react-icons/vsc'

const projects = [
  {
    name: 'Gamatron — AI App Builder',
    desc: 'Build apps without code using AI. A no-code platform powered by LLMs that lets you create full applications through natural language prompts.',
    demo: 'https://ai.socialamigo.in/',
    tech: [RiRobot2Line, GiArtificialHive, BsDiagram3, VscSymbolMisc, SiOpenai, SiNextdotjs, SiTypescript],
  },
  {
    name: 'Gama AI — RAG Chatbot',
    desc: 'Agentic RAG chatbot built with LangChain, FAISS vector store, and streaming responses. Uses retrieval-augmented generation to answer questions about my portfolio.',
    demo: '#raggy-container',
    tech: [GiArtificialHive, SiOpenai, SiNextdotjs, SiTypescript],
  },
  {
    name: 'Multi-Agent Orchestrator',
    desc: 'LangGraph-based multi-agent system with tool-calling, shared memory, and conditional routing across specialized AI agents.',
    isInternalTool: true,
    tech: [BsDiagram3, GiArtificialHive, SiPython, SiOpenai],
  },
  {
    name: 'MCP Tool Server',
    desc: 'Model Context Protocol server exposing custom tools for LLM agents — file search, code analysis, and data retrieval via standardized MCP interface.',
    isInternalTool: true,
    tech: [SiNodedotjs, SiTypescript, SiOpenai],
  },
  {
    name: 'Tesseract OCR + AI',
    desc: 'Multi-language document OCR pipeline enhanced with LLM post-processing for structured data extraction.',
    isInternalTool: true,
    tech: [SiNodedotjs, SiPython, SiTypescript, SiMysql, SiMongodb],
  },
  {
    name: 'Teasit PWA',
    desc: 'Full-featured social media PWA with real-time messaging and AI-assisted content moderation.',
    image: '/teasit.avif',
    demo: 'https://teasit.com',
    tech: [SiNextdotjs, SiReact, SiMongodb, SiTypescript],
  },
  {
    name: 'Video Editor Service',
    desc: 'AI-driven server-side video processing pipeline using FFmpeg with automated scene detection.',
    isInternalTool: true,
    tech: [SiNodedotjs, SiFfmpeg],
  },
  {
    name: 'Xpense Wala',
    desc: 'Personal expense tracker with AI-powered spending insights and category-based budgeting.',
    demo: 'https://xpense.socialamigo.in',
    tech: [SiVite, SiReact],
  },
  {
    name: 'Hio — AI Chat App',
    desc: 'Real-time chat app with Socket.io, message history, and LLM-powered smart replies.',
    isInternalTool: true,
    tech: [SiNodedotjs, SiReact, SiNextdotjs, TbBrandSocketIo],
  },
  {
    name: 'OkkJi Android App',
    desc: 'E-commerce customer app with order tracking and push notifications.',
    demo: 'https://play.google.com/store/apps/details?id=com.okkji.customer&hl=en_IN&gl=US',
    tech: [SiReact, SiAndroid],
  },
  {
    name: 'Quick Dial',
    desc: 'Speed dial app for instant calling your favorite contacts.',
    demo: 'https://play.google.com/store/apps/details?id=com.quickdialapp&hl=en_US',
    tech: [TbBrandReactNative, SiTypescript],
  },
  {
    name: 'Resume Builder',
    desc: 'Drag-and-drop resume builder with multiple templates.',
    isInternalTool: true,
    demo: 'https://easy-resume-builder-web.web.app',
    tech: [SiNodedotjs, SiReact],
  },
]

const Projects = () => {
  return (
    <section className={styles.section} id="projects">
      <div className={styles.sectionInner}>
        <h2 className={`${styles.sectionTitle} reveal`}>Projects</h2>
        <p className={`${styles.sectionSubtitle} reveal`}>
          AI-powered systems and applications I&apos;ve built
        </p>
        <div className={`${styles.projectsGrid} stagger-children`}>
          {projects.map((project) => (
            <ProjectItem key={project.name} {...project} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Projects