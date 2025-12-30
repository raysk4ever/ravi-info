"use client";

// import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// import { getInitialTheme, applyTheme, toggleTheme } from "@/lib/theme";

import styles from "@/styles/navbar.module.css";
import useRaggy from "@/hooks/use-raggy";

export default function Navbar() {
  const { pathname, push } = useRouter()
  const {callRagApi} = useRaggy()
  // const [theme, setTheme] = useState("system");

  // useEffect(() => {
  //   const t = getInitialTheme();
  //   setTheme(t);
  //   applyTheme(t);
  // }, []);;
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>Social Amigo</Link>

        <div className={styles.links}>
          <Link href="/" className={pathname === "/" ? styles.active : ""}>Home</Link>
          <Link href="/blog" className={pathname.startsWith("/blog") ? styles.active : ""}>Blog</Link>
          {/* <Link href="/projects" className={pathname === "/projects" ? styles.active : ""}>Projects</Link> */}
           {/* <button
            className="theme-toggle"
            onClick={() => setTheme(toggleTheme(theme))}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button> */}
           <button
            className={`${styles.resumeButton} ${styles.aiButton}`}
            onClick={() => {
              const message = [
                "Share me your Resume",
                "Get Resume",
                "Can you provide your Resume?",
                "I would like to see your Resume",
                "Please share your Resume"
              ]
              push('/');
              callRagApi(message[Math.floor(Math.random() * message.length)]);
              // focus ragggy container
               requestAnimationFrame(() => {
                const raggyContainer = document.getElementById("raggy-container");
                if (raggyContainer) {
                  raggyContainer.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              });
            }}
            aria-label="Get Resume"
          >
            Get Resume
          </button>
        </div>
      </div>
    </nav>
  );
}
