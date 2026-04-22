import React, { useCallback, useState } from "react";
import styles from "@/styles/Home.module.css";
import { FaAws, FaDocker, FaNodeJs, FaReact } from "react-icons/fa";
import {
  SiFirebase,
  SiTypescript,
  SiMongodb,
  SiFfmpeg,
  SiAndroid,
  SiHtml5,
  SiCss3,
  SiKubernetes,
  SiNginx,
  SiNextdotjs,
  SiJavascript,
  SiMysql,
  SiOpenai,
  SiGooglegemini,
  SiOllama,
  SiPython,
  SiRedis,
  SiGraphql,
  SiGit,
} from "react-icons/si";
import { TbBrandThreejs, TbBrandSocketIo } from "react-icons/tb";
import { VscSymbolMisc } from "react-icons/vsc";
import { GiArtificialHive } from "react-icons/gi";
import { BsDiagram3 } from "react-icons/bs";
import { RiRobot2Line } from "react-icons/ri";

const skillCategories = [
  {
    title: "Agentic AI & LLMs",
    skills: [
      { icon: SiOpenai, name: "OpenAI", color: "#272323" },
      { icon: SiGooglegemini, name: "Gemini", color: "#4285F4" },
      { icon: SiOllama, name: "Ollama", color: "#8c12b1" },
      { icon: GiArtificialHive, name: "LangChain", color: "#1C3C3C" },
      { icon: BsDiagram3, name: "LangGraph", color: "#3B82F6" },
      { icon: VscSymbolMisc, name: "MCP", color: "#10B981" },
      { icon: RiRobot2Line, name: "Agentic AI", color: "#F59E0B" },
    ],
  },
  {
    title: "RAG & Data",
    skills: [
      { icon: SiOllama, name: "LlamaIndex", color: "#8c12b1" },
      { icon: SiPython, name: "Python", color: "#3776AB" },
      { icon: SiMongodb, name: "MongoDB", color: "#51A649" },
      { icon: SiRedis, name: "Redis", color: "#DC382D" },
      { icon: SiMysql, name: "MySQL", color: "#035D85" },
      { icon: SiGraphql, name: "GraphQL", color: "#E10098" },
    ],
  },
  {
    title: "Frontend & Full-Stack",
    skills: [
      { icon: FaReact, name: "React", color: "#5ED2F3" },
      { icon: SiNextdotjs, name: "Next.js", color: "#111111" },
      { icon: SiTypescript, name: "TypeScript", color: "#2F73BF" },
      { icon: SiJavascript, name: "JavaScript", color: "#F7DF1E" },
      { icon: FaNodeJs, name: "Node.js", color: "#77B55C" },
      { icon: TbBrandSocketIo, name: "Socket.io", color: "#000000" },
      { icon: TbBrandThreejs, name: "Three.js", color: "#000000" },
    ],
  },
  {
    title: "DevOps & Cloud",
    skills: [
      { icon: FaDocker, name: "Docker", color: "#2491E5" },
      { icon: SiKubernetes, name: "Kubernetes", color: "#3069DD" },
      { icon: FaAws, name: "AWS", color: "#ff9900" },
      { icon: SiNginx, name: "Nginx", color: "#039137" },
      { icon: SiFirebase, name: "Firebase", color: "#F57C00" },
      { icon: SiGit, name: "Git", color: "#F05032" },
      { icon: SiAndroid, name: "Android", color: "#31DE83" },
    ],
  },
];

const Skills = () => {
  const [hoveredSkill, setHoveredSkill] = useState("");
  const handleEnter = useCallback(
    (name: string) => () => setHoveredSkill(name),
    []
  );
  const handleLeave = useCallback(() => setHoveredSkill(""), []);

  return (
    <section className={styles.section} id="skills">
      <div className={styles.sectionInner}>
        <h2 className={`${styles.sectionTitle} reveal`}>Skills & Technologies</h2>
        <p className={`${styles.sectionSubtitle} reveal`}>
          AI frameworks, LLM tooling, and full-stack technologies I work with daily
        </p>

        <div className={`${styles.skillsGrid} stagger-children`}>
          {skillCategories.map((cat) => (
            <div key={cat.title} className={styles.skillCategory}>
              <h3 className={styles.skillCategoryTitle}>{cat.title}</h3>
              <div className={styles.skillIcons}>
                {cat.skills.map(({ icon: Icon, name, color }) => (
                  <div
                    key={name}
                    className={styles.skillItem}
                    onMouseEnter={handleEnter(name)}
                    onMouseLeave={handleLeave}
                  >
                    <Icon
                      color={color}
                      className={`${name.toLowerCase().replace(/\./g, "\\.")}-icon`}
                    />
                    <span
                      className={`${styles.skillTooltip} ${
                        hoveredSkill === name ? styles.skillTooltipVisible : ""
                      }`}
                    >
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Skills;
