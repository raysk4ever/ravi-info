import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { VoteValue } from "@/hooks/use-chat-analytics";
import styles from "./raggy.module.css";

interface Props {
  /** Null when the turn has no analytics id (e.g. a pre-upgrade history). */
  turnId?: string;
  question?: string;
  answer: string;
  rating?: VoteValue;
  onVote: (
    turnId: string,
    rating: VoteValue,
    question: string,
    answer: string
  ) => void;
}

/**
 * Thumbs up / down on an assistant answer.
 *
 * Optimistic on purpose: the icon flips on click and the network write is
 * fire-and-forget, so voting never makes the chat feel laggy or shows a spinner
 * the user has to wait on.
 */
export default function FeedbackButtons({
  turnId,
  question = "",
  answer,
  rating = 0,
  onVote,
}: Props) {
  const [localRating, setLocalRating] = useState<VoteValue>(rating);
  const [justVoted, setJustVoted] = useState(false);

  if (!turnId) return null;

  const handle = (next: Exclude<VoteValue, 0>) => {
    // Clicking the active thumb takes the vote back.
    const resolved: VoteValue = localRating === next ? 0 : next;
    setLocalRating(resolved);
    setJustVoted(true);
    window.setTimeout(() => setJustVoted(false), 1200);
    onVote(turnId, resolved, question, answer);
  };

  return (
    <div className={styles.feedbackRow}>
      <span className={styles.feedbackLabel}>
        {justVoted
          ? localRating === 0
            ? "Vote removed"
            : "Thanks for the feedback!"
          : "Was this helpful?"}
      </span>
      <div className={styles.feedbackButtons}>
        <button
          type="button"
          className={`${styles.feedbackBtn} ${
            localRating === 1 ? styles.feedbackBtnUp : ""
          }`}
          onClick={() => handle(1)}
          aria-label="This answer was helpful"
          aria-pressed={localRating === 1}
          title="Helpful"
        >
          <ThumbsUp size={13} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${styles.feedbackBtn} ${
            localRating === -1 ? styles.feedbackBtnDown : ""
          }`}
          onClick={() => handle(-1)}
          aria-label="This answer was not helpful"
          aria-pressed={localRating === -1}
          title="Not helpful"
        >
          <ThumbsDown size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
