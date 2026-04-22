import React from "react";
import styles from "@/styles/Home.module.css";
import Image from "next/image";

const About = () => {
  return (
    <section className={styles.section} id="about">
      <div className={styles.sectionInner}>
        <h2 className={`${styles.sectionTitle} reveal`}>About Me</h2>
        <p className={`${styles.sectionSubtitle} reveal`}>
          A little background on who I am
        </p>

        <div className={styles.aboutGrid}>
          <div className={`${styles.aboutImage} reveal-left`}>
            <Image
              src="/ravi.png"
              alt="Ravi Singh — AI Engineer specializing in Agentic AI and RAG"
              width={320}
              height={320}
              className={styles.aboutAvatar}
              loading="lazy"
            />
          </div>
          <div className={`${styles.aboutContent} reveal-right`}>
            <p>
              I&apos;m an <strong>AI Engineer &amp; Full-Stack Developer</strong> focused
              on building intelligent, production-grade applications. I specialize
              in Agentic AI architectures, RAG systems, and LLM-powered
              workflows using LangChain, LangGraph, and the Model Context
              Protocol (MCP).
            </p>
            <p>
              My work spans designing multi-agent orchestration pipelines,
              building retrieval-augmented generation systems with vector
              databases (FAISS, Pinecone), and deploying AI-native applications
              on scalable cloud infrastructure with Docker, Kubernetes, and AWS.
            </p>
            <p>
              From fine-tuning embedding models and building tool-calling agents
              to crafting full-stack UIs with React and Next.js &mdash; I bridge
              the gap between cutting-edge AI research and production software.
              I share what I learn through my blog and open-source work.
            </p>
            <div className={styles.aboutStats}>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{new Date().getFullYear() - 2019}+</span>
                <span className={styles.statLabel}>Years Exp.</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>20+</span>
                <span className={styles.statLabel}>AI &amp; Web Projects</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>3</span>
                <span className={styles.statLabel}>Companies</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
