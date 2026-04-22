import React from "react";
import styles from "@/styles/Home.module.css";
import { FaGithub, FaStackOverflow } from "react-icons/fa";
import { SiLinkedin, SiMedium } from "react-icons/si";
import Raggy from "@/components/Raggy";

const socials = [
  { icon: FaGithub, url: "https://github.com/raysk4ever/", label: "GitHub" },
  { icon: FaStackOverflow, url: "https://stackoverflow.com/users/11216915/ravi-singh", label: "StackOverflow", color: "#EC761E" },
  { icon: SiLinkedin, url: "https://www.linkedin.com/in/ravi-ksingh/", label: "LinkedIn", color: "#0177B5" },
  { icon: SiMedium, url: "https://techgama.medium.com/", label: "Medium" },
];

const floatingWords = [
  "LangChain", "RAG", "MCP", "LangGraph", "Agents",
  "LLM", "FAISS", "OpenAI", "Vector DB", "Next.js",
  "Python", "TypeScript", "Docker", "Kubernetes",
];

const LandingPage = () => {
  return (
    <section className={styles.hero} id="home">
      {/* Animated background elements */}
      <div className={styles.heroParticles}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`${styles.heroOrb} ${styles[`heroOrb${i + 1}`]}`} />
        ))}
      </div>
      <div className={styles.heroGrid} />
      <div className={styles.heroFloatingWords}>
        {floatingWords.map((word) => (
          <span
            key={word}
            className={styles.floatingWord}
          >
            {word}
          </span>
        ))}
      </div>

      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <span className={`${styles.heroBadge} ${styles.heroAnimItem}`} style={{ animationDelay: '0.1s' }}>
            Building Agentic AI Systems
          </span>
          <h1 className={`${styles.heroTitle} ${styles.heroAnimItem}`} style={{ animationDelay: '0.25s' }}>
            Hi, I&apos;m <span className={styles.heroName}>Ravi Singh</span>
          </h1>
          <p className={`${styles.heroRole} ${styles.heroAnimItem}`} style={{ animationDelay: '0.4s' }}>
            AI Engineer &amp; Full-Stack Developer
          </p>
          <p className={`${styles.heroDesc} ${styles.heroAnimItem}`} style={{ animationDelay: '0.55s' }}>
            I design and build Agentic AI systems, RAG pipelines, and
            AI-native applications using LangChain, LangGraph, MCP, and
            modern cloud infrastructure.
          </p>

          <div className={`${styles.heroActions} ${styles.heroAnimItem}`} style={{ animationDelay: '0.7s' }}>
            <a href="#projects" className={styles.heroPrimary}>
              View Projects
            </a>
            <a href="#contact" className={styles.heroSecondary}>
              Get In Touch
            </a>
          </div>

          <div className={`${styles.heroSocials} ${styles.heroAnimItem}`} style={{ animationDelay: '0.85s' }}>
            {socials.map(({ icon: Icon, url, label, color }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={styles.socialLink}
              >
                <Icon color={color} />
              </a>
            ))}
          </div>
        </div>

        <div className={styles.heroChat}>
          <Raggy />
        </div>
      </div>
    </section>
  );
};

export default LandingPage;
