import React from "react";
import styles from "@/styles/Home.module.css";
import { FaGithub, FaStackOverflow } from "react-icons/fa";
import { SiLinkedin, SiMedium } from "react-icons/si";
import { HiOutlineMail } from "react-icons/hi";

const contactLinks = [
  {
    icon: HiOutlineMail,
    label: "Email",
    value: "raysk4ever@gmail.com",
    href: "mailto:raysk4ever@gmail.com",
  },
  {
    icon: FaGithub,
    label: "GitHub",
    value: "@raysk4ever",
    href: "https://github.com/raysk4ever/",
  },
  {
    icon: SiLinkedin,
    label: "LinkedIn",
    value: "ravi-ksingh",
    href: "https://www.linkedin.com/in/ravi-ksingh/",
    color: "#0177B5",
  },
  {
    icon: FaStackOverflow,
    label: "Stack Overflow",
    value: "ravi-singh",
    href: "https://stackoverflow.com/users/11216915/ravi-singh",
    color: "#EC761E",
  },
  {
    icon: SiMedium,
    label: "Medium",
    value: "@techgama",
    href: "https://techgama.medium.com/",
  },
];

const Contact = () => {
  return (
    <section className={styles.section} id="contact">
      <div className={styles.sectionInner}>
        <h2 className={`${styles.sectionTitle} reveal`}>Get In Touch</h2>
        <p className={`${styles.sectionSubtitle} reveal`}>
          I&apos;m always open to new opportunities and collaborations
        </p>

        <div className={`${styles.contactGrid} stagger-children`}>
          {contactLinks.map(({ icon: Icon, label, value, href, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactCard}
            >
              <Icon size={28} color={color} />
              <div>
                <h4 className={styles.contactLabel}>{label}</h4>
                <span className={styles.contactValue}>{value}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Contact;
