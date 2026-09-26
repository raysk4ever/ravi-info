import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import styles from "@/styles/blog.module.css";

/** Stable per-browser id, so "one like per visitor" survives reloads. */
function useVisitorId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const KEY = "blog-visitor-id";
      let v = window.localStorage.getItem(KEY);
      if (!v) {
        v =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem(KEY, v);
      }
      setId(v);
    } catch {
      setId(null);
    }
  }, []);
  return id;
}

export function useBlogVisitorId() {
  return useVisitorId();
}

interface Props {
  slug: string;
  /** Seeded server-side or from a parent so the count shows before fetch. */
  initialCount?: number;
  className?: string;
}

/**
 * Like button. Optimistic: the heart and count update on click and roll back if
 * the request fails, so the interaction never feels laggy.
 */
export default function LikeButton({ slug, initialCount = 0, className }: Props) {
  const visitorId = useVisitorId();
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visitorId) return;
    let cancelled = false;
    fetch(`/api/blog/likes?slug=${encodeURIComponent(slug)}&visitorId=${encodeURIComponent(visitorId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok) return;
        setCount(d.count ?? 0);
        setLiked(Boolean(d.liked));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, visitorId]);

  const onClick = async () => {
    if (!visitorId || busy) return;
    setBusy(true);

    const prevCount = count;
    const prevLiked = liked;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));

    try {
      const res = await fetch(`/api/blog/likes?slug=${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error("failed");
      setCount(data.count ?? prevCount);
      setLiked(Boolean(data.liked));
    } catch {
      setCount(prevCount);
      setLiked(prevLiked);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!ready || busy}
      aria-pressed={liked}
      aria-label={liked ? "Remove like" : "Like this post"}
      title={liked ? "Unlike" : "Like"}
      className={`${styles.likeButton} ${liked ? styles.likeButtonOn : ""} ${className ?? ""}`}
    >
      <Heart
        size={15}
        aria-hidden="true"
        className={liked ? styles.likeIconFilled : undefined}
        fill={liked ? "currentColor" : "none"}
      />
      <span>{count}</span>
      <span className="sr-only">likes</span>
    </button>
  );
}
