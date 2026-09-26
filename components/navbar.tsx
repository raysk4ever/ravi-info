"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "sonner";

import styles from "@/styles/navbar.module.css";
import useRaggy from "@/hooks/use-raggy";
import useHashScroll from "@/hooks/use-hash-scroll";
import ThemeToggle from "@/components/ui/theme-toggle";

export default function Navbar() {
  const { pathname, push } = useRouter();
  const { callRagApi } = useRaggy();
  const [menuOpen, setMenuOpen] = useState(false);
  const lastResumeCallRef = useRef(0);
  const RESUME_DEBOUNCE_MS = 2000;

  // "#projects" / "#contact" only exist on "/", so these links always point at
  // the home page and the hook finishes the scroll once the section is mounted.
  useHashScroll();

  const handleResumeClick = () => {
    const now = Date.now();
    if (now - lastResumeCallRef.current < RESUME_DEBOUNCE_MS) return;
    lastResumeCallRef.current = now;

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
    toast("Resume request sent to Gama AI — check the chat to download!", {
      icon: "📄",
    });

    requestAnimationFrame(() => {
      const raggyContainer = document.getElementById("raggy-container");
      if (raggyContainer) {
        raggyContainer.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  return (
    <>
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
            <Link
              href="/chat"
              className={pathname.startsWith("/chat") ? styles.active : ""}
              onClick={() => setMenuOpen(false)}
            >
              Chat
            </Link>
            <Link
              href="/#projects"
              onClick={() => setMenuOpen(false)}
            >
              Projects
            </Link>
            <Link
              href="/#contact"
              onClick={() => setMenuOpen(false)}
            >
              Contact
            </Link>
            <ThemeToggle className={styles.themeToggle} />
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
    </>
  );
}
