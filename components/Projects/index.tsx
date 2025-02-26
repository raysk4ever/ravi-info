import React from 'react'
import ProjectItem from './ProjectItem'
import { styled } from 'styled-components'
import { SiAndroid, SiFfmpeg, SiJavascript, SiMongodb, SiMysql, SiNextdotjs, SiNodedotjs, SiPython, SiReact, SiTypescript, SiVite } from 'react-icons/si'
import { TbBrandReactNative, TbBrandSocketIo } from 'react-icons/tb'

const projects = [
  {
    name: 'Xpense Wala',
    image: 'https://xpense.socialamigo.in/logo.svg',
    demo: 'https://xpense.socialamigo.in',
    tech: [
      SiVite,
      SiReact
    ]
  },
  {
    name: 'Quick Dial',
    image: '',
    demo: 'https://play.google.com/store/apps/details?id=com.quickdialapp&hl=en_US',
    tech: [
      TbBrandReactNative,
      SiTypescript
    ],
  },
  {
    name: 'Emergency Call INDIA',
    image: '',
    demo: 'https://play.google.com/store/apps/details?id=com.shail.raysk.emergencycall&hl=en_US',
    tech: [
      TbBrandReactNative,
      SiTypescript
    ],
  },
  {
    name: 'Base64 Panda',
    image: '',
    demo: 'https://base64.socialamigo.in',
    tech: [
      SiNextdotjs,
      SiTypescript
    ],
  },
  {
    name: 'Teasit PWA Application',
    image: '/teasit.avif',
    demo: 'https://teasit.com',
    tech: [
      SiNextdotjs,
      SiReact,
      SiMongodb,
      SiTypescript
    ],
  },
  {
    name: 'Video Editor Service',
    image: '/FFmpeg.webp',
    isInternalTool: true,
    tech: [SiNodedotjs, SiFfmpeg],
  },
  {
    name: 'Tesseract OCR',
    image: '/ocr.jpg',
    isInternalTool: true,
    tech: [SiNodedotjs, SiPython, SiTypescript, SiJavascript, SiMysql, SiMongodb]
  },
  {
    name: 'OkkJi Android App',
    image: '/okkji.png',
    demo: 'https://play.google.com/store/apps/details?id=com.okkji.customer&hl=en_IN&gl=US',
    tech: [SiReact, SiAndroid]
  },
  {
    name: 'Swati CMS - SIDBI',
    image: '/sidbi.jpeg',
    isInternalTool: true,
    tech: [SiNodedotjs, SiReact]
  },
  {
    name: 'Hio - The Chat App',
    image: '/sidbi.jpeg',
    isInternalTool: true,
    tech: [SiNodedotjs, SiReact, SiNextdotjs, TbBrandSocketIo]
  },
  {
    name: 'Resume Builder',
    isInternalTool: true,
    demo: 'https://easy-resume-builder-web.web.app',
    tech: [SiNodedotjs, SiReact]
  }
]

const Projects = () => {
  return (
    <ProjectsContainer>
      <h1>Projects</h1>
      <ProjectsWrapper>
        {projects.map((project) => <ProjectItem key={project.name} {...project} />)}
      </ProjectsWrapper>
    </ProjectsContainer>
  )
}

export default Projects

const ProjectsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  `

const ProjectsWrapper = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`