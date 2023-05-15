import Head from 'next/head'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'
import { FaDocker, FaNodeJs, FaReact } from 'react-icons/fa'
import { IoLogoJavascript } from 'react-icons/io'
import { SiTypescript, SiMongodb, SiFfmpeg, SiAndroid, SiHtml5, SiCss3, SiKubernetes, SiNginx } from 'react-icons/si'
import { useCallback, useState } from 'react'
const inter = Inter({ subsets: ['latin'] })

const skills = [
  { icon: IoLogoJavascript, name: 'Javascript', color: '#EFD81A' },
  { icon: FaReact, name: 'React', color: '#5ED2F3' },
  { icon: FaNodeJs, name: 'Nodejs', color: '#77B55C' },
  { icon: SiTypescript, name: 'Typescript', color: '#2F73BF' },
  { icon: SiMongodb, name: 'Mongodb', color: '#51A649' },
  { icon: FaDocker, name: 'Docker', color: '#2491E5' },
  { icon: SiKubernetes, name: 'Kubernetes', color: '#3069DD' },
  { icon: SiFfmpeg, name: 'FFMPEG', color: '#008014' },
  { icon: SiNginx, name: 'Nginx', color: '#039137' },
  { icon: SiAndroid, name: 'Android', color: '#31DE83' },
  { icon: SiHtml5, name: 'HTML5', color: '#E96328' },
  { icon: SiCss3, name: 'CSS3', color: '#2662E9' }
]

export default function Home() {
  const [iconName, setIconName] = useState('')
  const handleOnMouseEnter = useCallback((name: string) => () => {
    setIconName(name)
  }, [])
  const handleOnMouseLeave = useCallback(() => {
    setIconName('')
  }, [])
  return (
    <>
      <Head>
        <title>Ravi Singh | Software Engineer</title>
        <meta name="description" content="Ravi Singh | Software Engineer" />
        <meta name="keywords" content="ravi, ravi kant singh, ravi singh, raysk4ever, rudrapur, ravi kant singh rudrapur, bareilly software engineer, teasit, kimblytech, ray" />
        <meta name="author" content="Ravi Singh" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
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
          <h1>Ravi Singh</h1>
          <div className={styles.icons}>
            {skills.map(({ icon: Icon, name, color = '#000' }) => <Icon onMouseEnter={handleOnMouseEnter(name)} onMouseLeave={handleOnMouseLeave} key={name} color={color} />)}
          </div>
          <div className={styles.iconName}>
            {iconName}
          </div>
        </div>


        <div className={styles.grid}>
          {/* <a
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2 className={inter.className}>
              Docs <span>-&gt;</span>
            </h2>
            <p className={inter.className}>
              Find in-depth information about Next.js features and&nbsp;API.
            </p>
          </a>

          <a
            href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2 className={inter.className}>
              Learn <span>-&gt;</span>
            </h2>
            <p className={inter.className}>
              Learn about Next.js in an interactive course with&nbsp;quizzes!
            </p>
          </a>

          <a
            href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2 className={inter.className}>
              Templates <span>-&gt;</span>
            </h2>
            <p className={inter.className}>
              Discover and deploy boilerplate example Next.js&nbsp;projects.
            </p>
          </a>

          <a
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2 className={inter.className}>
              Deploy <span>-&gt;</span>
            </h2>
            <p className={inter.className}>
              Instantly deploy your Next.js site to a shareable URL
              with&nbsp;Vercel.
            </p>
          </a> */}
        </div>
      </main>
    </>
  )
}
