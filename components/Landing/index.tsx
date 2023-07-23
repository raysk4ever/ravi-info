import React from 'react'
import Image from 'next/image'
import styles from '@/styles/Home.module.css'
import { FaDocker, FaNodeJs, FaReact } from 'react-icons/fa'
import { SiFirebase, SiTypescript, SiMongodb, SiFfmpeg, SiAndroid, SiHtml5, SiCss3, SiKubernetes, SiNginx, SiNextdotjs, SiJavascript, SiMysql } from 'react-icons/si'
import { TbBrandThreejs, TbBrandSocketIo } from 'react-icons/tb'
import { useCallback, useState } from 'react'
import { styled } from 'styled-components'

const skills = [
  { icon: SiJavascript, name: 'Javascript', color: '#EFD81A' },
  { icon: SiNextdotjs, name: 'Next.js', color: '#111111' },
  { icon: FaReact, name: 'React', color: '#5ED2F3' },
  { icon: FaNodeJs, name: 'Nodejs', color: '#77B55C' },
  { icon: SiTypescript, name: 'Typescript', color: '#2F73BF' },
  { icon: SiMongodb, name: 'Mongodb', color: '#51A649' },
  { icon: SiMysql, name: 'MySql', color: '#035D85' },
  { icon: FaDocker, name: 'Docker', color: '#2491E5' },
  { icon: SiKubernetes, name: 'Kubernetes', color: '#3069DD' },
  { icon: SiFfmpeg, name: 'FFMPEG', color: '#008014' },
  { icon: SiNginx, name: 'Nginx', color: '#039137' },
  { icon: SiAndroid, name: 'Android', color: '#31DE83' },
  { icon: SiHtml5, name: 'HTML5', color: '#E96328' },
  { icon: SiCss3, name: 'CSS3', color: '#2662E9' },
  { icon: TbBrandThreejs, name: 'Three.js', color: '#000000' },
  { icon: SiFirebase, name: 'Firebase', color: '#F57C00' },
  { icon: TbBrandSocketIo, name: 'Socket.io', color: '#000000' },
  
]

const LandingPage = () => {
  const [iconName, setIconName] = useState('')
  const handleOnMouseEnter = useCallback((name: string) => () => {
    setIconName(name)
  }, [])
  const handleOnMouseLeave = useCallback(() => {
    setIconName('')
  }, [])
  return (
    <>
        <div className={styles.description}>
          <p>
            &nbsp;
            <code className={styles.code}>Software Engineer 💻</code>
          </p>
          <div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="https://avatars.githubusercontent.com/u/33181670?v=4"
                alt="Vercel Logo"
                className={styles.vercelLogo}
                width={100}
                height={100}
                priority
              />
            </a>
          </div>
        </div>

        <div className={styles.center}>
          <Name>Ravi Singh</Name>
          <div className={styles.icons}>
            {skills.map(({ icon: Icon, name, color = '#000' }) => <Icon onMouseEnter={handleOnMouseEnter(name)} onMouseLeave={handleOnMouseLeave} key={name} color={color} className={`${name.toLowerCase()}-icon`} />)}
          </div>
          <div className={styles.iconName}>
            {iconName}
          </div>
        </div>
    </>
  )
}
export default LandingPage

const Name = styled.h1`
  font-size: 3rem;
`
