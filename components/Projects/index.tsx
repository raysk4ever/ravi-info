import React from 'react'
import ProjectItem from './ProjectItem'
import styles from '@/styles/Home.module.css'
import { techIcon } from './icons'
import projectsData from '@/knowledge/projects.json'

export interface Project {
  name: string
  desc: string
  demo?: string
  image?: string
  isInternalTool?: boolean
  tech: string[]
  highlights?: string[]
}

// Single source of truth lives in knowledge/projects.json so the chatbot's RAG
// index and this page can never drift apart.
const projects: Project[] = (projectsData.projects as Project[]).map((p) => ({
  ...p,
  tech: p.tech ?? [],
}))

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
            <ProjectItem
              key={project.name}
              {...project}
              techIcons={project.tech.map(techIcon)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Projects