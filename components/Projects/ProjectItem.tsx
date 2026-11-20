import React from 'react'
import Image from 'next/image'
import { IconType } from 'react-icons/lib'
import styles from '@/styles/Home.module.css'
import { HiExternalLink } from 'react-icons/hi'

interface ProjectItemProps {
  name: string
  image?: string
  demo?: string
  /** Icons resolved from the tech names in knowledge/projects.json. */
  techIcons: IconType[]
  isInternalTool?: boolean
  desc?: string
}

const ProjectItem = ({ name, image, demo, techIcons, isInternalTool, desc }: ProjectItemProps) => {
  return (
    <div
      className={styles.projectCard}
      onClick={() => demo && window.open(demo, '_blank')}
      role={demo ? 'link' : undefined}
      style={{ cursor: demo ? 'pointer' : 'default' }}
    >
      <div className={styles.projectCardTop}>
        <div className={styles.projectHeading}>
          {image && <Image className={styles.projectImage} src={image} alt="" width={30} height={28} unoptimized />}
          <h3 className={styles.projectName}>{name}</h3>
        </div>
        {isInternalTool && (
          <span className={styles.projectBadge}>Internal</span>
        )}
        {demo && !isInternalTool && (
          <HiExternalLink className={styles.projectLinkIcon} />
        )}
      </div>
      {desc && <p className={styles.projectDesc}>{desc}</p>}
      <div className={styles.projectTech}>
        {techIcons.map((Icon, i) => (
          <Icon size={18} key={i} />
        ))}
      </div>
    </div>
  )
}

export default ProjectItem
