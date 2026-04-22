import React from "react";
import styles from "@/styles/Home.module.css";

const experiences = [
  {
    role: "AI Engineer & Senior Software Engineer",
    company: "KimblyTech",
    period: "2022 — Present",
    description:
      "Architecting Agentic AI systems and RAG pipelines using LangChain, LangGraph, and MCP. Building multi-agent orchestration workflows with tool-calling, memory, and retrieval. Deploying LLM-powered features across production applications with Next.js, Node.js, and AWS.",
    highlights: ["LangChain", "LangGraph", "MCP", "RAG", "Agentic AI", "AWS"],
  },
  {
    role: "Software Engineer",
    company: "Teasit",
    period: "2020 — 2022",
    description:
      "Developed and maintained the Teasit PWA platform with real-time features using Socket.io. Built AI-assisted content moderation tools and integrated NLP-based search. Led mobile app development with React Native.",
    highlights: ["React", "Socket.io", "NLP", "React Native", "MongoDB"],
  },
  {
    role: "Junior Developer",
    company: "Freelance / Open Source",
    period: "2018 — 2020",
    description:
      "Started career building Android applications and web tools. Early exploration of ML models and chatbot integrations. Developed multiple apps published on Google Play Store and contributed to open-source projects.",
    highlights: ["Android", "JavaScript", "Firebase", "Chatbots"],
  },
];

const Experience = () => {
  return (
    <section className={styles.section} id="experience">
      <div className={styles.sectionInner}>
        <h2 className={`${styles.sectionTitle} reveal`}>Experience</h2>
        <p className={`${styles.sectionSubtitle} reveal`}>
          My professional journey so far
        </p>

        <div className={styles.timeline}>
          {experiences.map((exp, i) => (
            <div
              key={i}
              className={`${styles.timelineItem} ${i % 2 === 0 ? "reveal-left" : "reveal-right"}`}
            >
              <div className={styles.timelineDot} />
              <div className={styles.timelineCard}>
                <span className={styles.timelinePeriod}>{exp.period}</span>
                <h3 className={styles.timelineRole}>{exp.role}</h3>
                <h4 className={styles.timelineCompany}>{exp.company}</h4>
                <p className={styles.timelineDesc}>{exp.description}</p>
                <div className={styles.timelineTags}>
                  {exp.highlights.map((tag) => (
                    <span key={tag} className={styles.timelineTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;
