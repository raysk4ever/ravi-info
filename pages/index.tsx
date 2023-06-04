import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import LandingPage from '@/components/Landing'
import Projects from '@/components/Projects'
import Links from '@/components/Links'

export default function Home() {
  return (
    <>
      <Head>
        <title>Ravi Singh | Software Engineer</title>
        <meta name="description" content="Ravi Singh | Software Engineer" />
        <meta name="keywords" content="ravi, ravi kant singh, ravi singh, raysk4ever, rudrapur, ravi kant singh rudrapur, bareilly software engineer, teasit, kimblytech, ray, React, Nodejs, Docker, Nextjs, Developer, Engineer, Typscript" />
        <meta name="author" content="Ravi Singh" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/cloud.png" />
      </Head>
      <main className={styles.main}>
        <Links />
        <LandingPage />
        {/* <Projects /> */}
      </main>
    </>
  )
}
