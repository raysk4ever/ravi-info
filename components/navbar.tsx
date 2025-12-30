import Link from "next/link";
import { useRouter } from "next/router";
import styles from "@/styles/navbar.module.css";

export default function Navbar() {
  const { pathname } = useRouter();

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>Social Amigo</Link>

        <div className={styles.links}>
          <Link href="/" className={pathname === "/" ? styles.active : ""}>Home</Link>
          <Link href="/blog" className={pathname.startsWith("/blog") ? styles.active : ""}>Blog</Link>
          {/* <Link href="/projects" className={pathname === "/projects" ? styles.active : ""}>Projects</Link> */}
        </div>
      </div>
    </nav>
  );
}
