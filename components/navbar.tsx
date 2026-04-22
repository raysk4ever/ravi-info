"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import styles from "@/styles/navbar.module.css";
import useRaggy from "@/hooks/use-raggy";

export default function Navbar() {
  const { pathname, push } = useRouter();
  const { callRagApi } = useRaggy();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleResumeClick = () => {
    const message = [
      "Share me your Resume",
      "Get Resume",
      "Can you provide your Resume?",
      "I would like to see your Resume",
      "Please share your Resume",
    ];
    push("/");
    callRagApi(message[Math.floor(Math.random() * message.length)]);
    setMenuOpen(false);
    requestAnimationFrame(() => {
      const raggyContainer = document.getElementById("raggy-container");
      if (raggyContainer) {
        raggyContainer.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          Ravi Singh
        </Link>

        <button
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`${styles.links} ${menuOpen ? styles.linksOpen : ""}`}>
          <Link
            href="/"
            className={pathname === "/" ? styles.active : ""}
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/blog"
            className={pathname.startsWith("/blog") ? styles.active : ""}
            onClick={() => setMenuOpen(false)}
          >
            Blog
          </Link>
          <a
            href="#projects"
            onClick={() => setMenuOpen(false)}
          >
            Projects
          </a>
          <a
            href="#contact"
            onClick={() => setMenuOpen(false)}
          >
            Contact
          </a>
          <button
            className={styles.aiButton}
            onClick={handleResumeClick}
            aria-label="Get Resume"
          >
            Get Resume
          </button>
        </div>
      </div>
    </nav>
  );
}
