"use client";

// import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// import { getInitialTheme, applyTheme, toggleTheme } from "@/lib/theme";

import styles from "@/styles/navbar.module.css";

export default function Navbar() {
  const { pathname } = useRouter()
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
        </div>
      </div>
    </nav>
  );
}
