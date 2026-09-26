"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * The navbar is `position: sticky` but does not actually stick, because
 * globals.css sets `overflow-x: hidden` on `html, body`. So the section lands
 * flush with the top of the viewport — matching the native anchor jump the home
 * page already does. If the sticky bug is ever fixed, set this to the navbar
 * height so sections aren't hidden underneath it.
 */
const NAV_OFFSET = 0;

/**
 * Retry delays (ms). The target section may not exist yet when the route change
 * completes (page still streaming in), and late-loading images/fonts can shift
 * layout, so we re-aim a few times before settling.
 */
const RETRY_DELAYS = [0, 60, 180, 400];

/**
 * Scrolls to an element by id, retrying until it exists. Used by the navbar so
 * that `#section` links keep working when the user is on a page other than "/".
 */
export default function useHashScroll() {
  const router = useRouter();

  useEffect(() => {
    let timers: Array<ReturnType<typeof setTimeout>> = [];

    const scrollToHash = () => {
      const id = window.location.hash.replace(/^#/, "");
      timers.forEach(clearTimeout);
      timers = [];
      if (!id) return;

      timers = RETRY_DELAYS.map((delay) =>
        setTimeout(() => {
          const target = document.getElementById(id);
          if (!target) return;

          const top =
            target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
          const max = document.documentElement.scrollHeight - window.innerHeight;
          const next = Math.max(0, Math.min(top, max));

          // Already parked on the target — don't restart the animation.
          if (Math.abs(window.scrollY - next) < 2) return;

          window.scrollTo({ top: next, behavior: "smooth" });
        }, delay)
      );
    };

    router.events.on("routeChangeComplete", scrollToHash);
    router.events.on("hashChangeComplete", scrollToHash);
    // Covers browser back/forward across hashes, which Next doesn't always emit
    // router events for.
    window.addEventListener("hashchange", scrollToHash);
    // Handles direct deep links, e.g. socialamigo.in/#contact on a cold load.
    scrollToHash();

    return () => {
      router.events.off("routeChangeComplete", scrollToHash);
      router.events.off("hashChangeComplete", scrollToHash);
      window.removeEventListener("hashchange", scrollToHash);
      timers.forEach(clearTimeout);
    };
  }, [router.events]);
}
