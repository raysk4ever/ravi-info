import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useBlogVisitorId } from "./LikeButton";
import styles from "@/styles/blog.module.css";

interface Comment {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

const MAX_NAME = 40;
const MAX_BODY = 2000;

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Comments({ slug }: { slug: string }) {
  const visitorId = useBlogVisitorId();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    try {
      const qs = visitorId ? `&visitorId=${encodeURIComponent(visitorId)}` : "";
      const res = await fetch(`/api/blog/comments?slug=${encodeURIComponent(slug)}${qs}`);
      const data = await res.json();
      setComments(Array.isArray(data?.comments) ? data.comments : []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [slug, visitorId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Remember the name so it does not have to be typed on every comment. Only
  // remembered when the visitor actually chose one.
  useEffect(() => {
    if (!visitorId) return;
    try {
      const saved = window.localStorage.getItem("blog-comment-name");
      if (saved) setName(saved.slice(0, MAX_NAME));
    } catch {
      /* ignore */
    }
  }, [visitorId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const text = body.trim();
    if (text.length < 2) {
      setError("Write a little more before posting.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      if (name.trim()) {
        window.localStorage.setItem("blog-comment-name", name.trim().slice(0, MAX_NAME));
      }

      const res = await fetch(`/api/blog/comments?slug=${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // website is a honeypot: hidden from people, filled in by bots.
        body: JSON.stringify({
          name: name.trim(),
          body: text,
          visitorId,
          website: "",
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setError(data?.error ?? "Too many comments. Try again shortly.");
        return;
      }
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Could not post the comment.");
        return;
      }

      // Honeypot hit: the server accepts silently, so do not show anything.
      if (data.filtered) return;

      if (data.comment) {
        setComments((prev) => [data.comment, ...prev]);
        setBody("");
        setNotice("Comment posted.");
        window.setTimeout(() => setNotice(null), 4000);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    const snapshot = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/blog/comments?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, visitorId }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setComments(snapshot);
      setError("Could not delete the comment.");
    }
  };

  return (
    <section className={styles.comments} id="comments" aria-label="Comments">
      <header className={styles.commentsHeader}>
        <h2 className={`${styles.commentsTitle} font-display`}>
          <MessageSquare size={18} aria-hidden="true" />
          Comments
          <span className={styles.commentsCount}>{comments.length}</span>
        </h2>
      </header>

      <form ref={formRef} onSubmit={onSubmit} className={styles.commentForm}>
        <div className={styles.commentFormRow}>
          <label className={styles.commentField}>
            <span className={styles.commentLabel}>
              Name <span className={styles.commentOptional}>optional</span>
            </span>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
              placeholder="Anonymous"
              maxLength={MAX_NAME}
              autoComplete="nickname"
              className={styles.commentInput}
            />
          </label>

          {/* Honeypot. Off-screen and hidden from assistive tech, so only
              automated fillers see it. */}
          <div className={styles.commentHoneypot} aria-hidden="true">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        </div>

        <label className={styles.commentField}>
          <span className={styles.commentLabel}>
            Comment
            <span className={styles.commentCountHint}>
              {body.length}/{MAX_BODY}
            </span>
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
            placeholder="Share your thoughts…"
            rows={4}
            className={styles.commentTextarea}
          />
        </label>

        <div className={styles.commentActions}>
          <button
            type="submit"
            disabled={submitting || body.trim().length < 2}
            className={styles.commentSubmit}
          >
            <Send size={14} aria-hidden="true" />
            {submitting ? "Posting…" : "Post comment"}
          </button>
          {notice && (
            <p className={styles.commentNotice} role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className={styles.commentError} role="alert">
              {error}
            </p>
          )}
        </div>
      </form>

      {loading ? (
        <div className={styles.commentsLoading} aria-live="polite">
          Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <p className={styles.commentsEmpty}>
          No comments yet. Be the first to share what you think.
        </p>
      ) : (
        <ol className={styles.commentList}>
          {comments.map((c) => (
            <li key={c.id} className={styles.commentItem}>
              <div className={styles.commentAvatar} aria-hidden="true">
                {initials(c.name)}
              </div>
              <div className={styles.commentContent}>
                <p className={styles.commentMeta}>
                  <span className={styles.commentAuthor}>{c.name}</span>
                  <span className={styles.commentDot}>·</span>
                  <time dateTime={c.createdAt}>{timeAgo(c.createdAt)}</time>
                </p>
                {/* Rendered as text, never as HTML - this is untrusted input. */}
                <p className={styles.commentBody}>{c.body}</p>
              </div>
              {c.mine && (
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  className={styles.commentDelete}
                  aria-label="Delete your comment"
                  title="Delete"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
