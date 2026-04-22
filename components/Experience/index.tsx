import React from "react";
import styles from "@/styles/Home.module.css";

const experiences = [
  {
    role: "Senior Software Engineer",
    company: "EPAM Systems Inc.",
    location: "Gurgaon, India",
    period: "Oct 2023 — Present",
    description:
      "Building AI-driven internal tools for adidas, including 'Classy AI Assistant' — a conversational AI powered by LangChain and LlamaIndex for HTS code classification and operational intelligence. Enabled natural language workflows for reporting, analytics, task assignments, and job re-triggering. Implemented frontend caching, lazy loading, and code splitting achieving 10% performance improvement and 20% bundle size reduction.",
    highlights: ["LangChain", "LlamaIndex", "React", "Node.js", "AI Assistant", "Performance"],
  },
  {
    role: "Software Engineer",
    company: "Teasit Technologies Inc.",
    location: "Miami, Florida (Remote)",
    period: "Feb 2021 — Oct 2023",
    description:
      "Developed Teasit.com, a high-performance video-sharing PWA with 99% Lighthouse score and 100% SEO. Designed a scalable video processing microservice supporting 10,000+ users using FFmpeg and Node.js. Built AI-based video auto-tagging with AWS Kinesis. Containerized services with Docker and deployed on Kubernetes with auto-scaling.",
    highlights: ["Next.js", "React", "FFmpeg", "Docker", "Kubernetes", "AWS"],
  },
  {
    role: "Software Engineer",
    company: "Envirya Technologies",
    location: "Gurgaon, India",
    period: "Aug 2019 — Feb 2021",
    description:
      "Built a lightweight and customizable form builder using React Native. Led and mentored a team of 5 engineers across multiple projects. Developed an IVRS-based system mapping users to MSMEs. Created background services and cron-based automation tools using Node.js, MySQL, and MongoDB.",
    highlights: ["React Native", "Node.js", "MongoDB", "MySQL", "Team Lead"],
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
                <h4 className={styles.timelineCompany}>{exp.company} <span className={styles.timelineLocation}>· {exp.location}</span></h4>
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
