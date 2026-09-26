import React, { useCallback, useState } from "react";
import styles from "@/styles/Home.module.css";
import { skillIcon } from "./icons";
import skillsData from "@/knowledge/skills.json";

export interface Skill {
  name: string;
  icon: string;
  color: string;
}

export interface SkillCategory {
  title: string;
  summary?: string;
  skills: Skill[];
}

// Single source of truth lives in knowledge/skills.json so the chatbot's RAG
// index and this page can never drift apart.
const skillCategories: SkillCategory[] =
  skillsData.categories as SkillCategory[];

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
                {cat.skills.map((skill) => (
                  <SkillTile
                    key={skill.name}
                    skill={skill}
                    hovered={hoveredSkill === skill.name}
                    onEnter={handleEnter}
                    onLeave={handleLeave}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

function SkillTile({
  skill,
  hovered,
  onEnter,
  onLeave,
}: {
  skill: Skill;
  hovered: boolean;
  onEnter: (name: string) => () => void;
  onLeave: () => void;
}) {
  const Icon = skillIcon(skill.icon);
  return (
    <div
      className={styles.skillItem}
      onMouseEnter={onEnter(skill.name)}
      onMouseLeave={onLeave}
    >
      <Icon
        color={skill.color}
        className={`${skill.name.toLowerCase().replace(/\./g, "\\.")}-icon`}
      />
      <span
        className={`${styles.skillTooltip} ${
          hovered ? styles.skillTooltipVisible : ""
        }`}
      >
        {skill.name}
      </span>
    </div>
  );
}

export default Skills;
