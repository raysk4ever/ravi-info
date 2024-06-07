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
        <meta name="description" content="Experienced software engineer specializing in JavaScript frameworks such as React, Angular, and Vue.js. Skilled in full-stack and mobile app development using Node.js and modern technologies. Available for hire for custom software development and comprehensive technology solutions. Explore my portfolio and contact me for professional software development services." />
        <meta name="keywords" content="Software Engineer, JavaScript Developer, Full-Stack Developer, Front-End Developer, Back-End Developer, JavaScript Frameworks, React Developer, Angular Developer, Vue.js Developer, Node.js Developer, Web Developer, Mobile App Developer, Custom Software Development, Hire Software Engineer, Software Development Services, Professional Developer, Freelance Developer, Technology Expert, Web Application Development, Mobile Application Development, Full-Stack Development, Modern Tech Solutions, Freelance Software Engineer, Software Engineering Services, Software Developer for Hire, ravi, ravi kant singh, ravi singh, raysk4ever, rudrapur, ravi kant singh rudrapur, bareilly software engineer, teasit, kimblytech, ray, React, Nodejs, Docker, Nextjs, Developer, Engineer, Typscript" />
        <meta name="author" content="Ravi Singh" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/cloud.png" />
      </Head>
      <main className={styles.main}>
        <Links />
        <LandingPage />
        <Projects />
      </main>
    </>
  )
}
