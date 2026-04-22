import React from 'react'
import { IconType } from 'react-icons/lib'
import styles from '@/styles/Home.module.css'
import { HiExternalLink } from 'react-icons/hi'

interface ProjectItemProps {
  name: string
  image?: string
  demo?: string
  tech: IconType[]
  isInternalTool?: boolean
  desc?: string
}

const ProjectItem = ({ name, demo, tech, isInternalTool, desc }: ProjectItemProps) => {
  return (
    <div
      className={styles.projectCard}
      onClick={() => demo && window.open(demo, '_blank')}
      role={demo ? 'link' : undefined}
      style={{ cursor: demo ? 'pointer' : 'default' }}
    >
      <div className={styles.projectCardTop}>
        <h3 className={styles.projectName}>{name}</h3>
        {isInternalTool && (
          <span className={styles.projectBadge}>Internal</span>
        )}
        {demo && !isInternalTool && (
          <HiExternalLink className={styles.projectLinkIcon} />
        )}
      </div>
      {desc && <p className={styles.projectDesc}>{desc}</p>}
      <div className={styles.projectTech}>
        {tech.map((Icon, i) => (
          <Icon size={18} key={i} />
        ))}
      </div>
    </div>
  )
}

export default ProjectItem
