"use client";

import { useCallback } from "react";
import {
  getVisitorInfo,
  nextTurnIndex,
  collectDevice,
  collectPage,
  sendAnalytics,
} from "@/lib/analytics/client";
import type { ChatOutcome } from "@/lib/analytics/types";

const TRACK_URL = "/api/analytics/track";
const FEEDBACK_URL = "/api/analytics/feedback";

export type VoteValue = 1 | -1 | 0;

export interface TurnHandle {
  turnId: string;
  /** Called on the first streamed token so we can measure TTFT. */
  markFirstToken: () => void;
  setModel: (name: string) => void;
  setOutcome: (outcome: ChatOutcome) => void;
  /**
   * Called after the stream ends. Detaches immediately - the user already has
   * their answer at this point, so nothing here can make it feel slower.
   */
  finish: (answer: string, httpStatus: number | null) => void;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Instruments the chat with analytics.
 *
 * Design constraint: the /api/raggy response must not be slowed down at all.
 * So we never add a network call to the request path - the turn is reported on
 * a separate fire-and-forget request *after* streaming completes, via
 * sendBeacon on an idle callback.
 */
export function useChatAnalytics() {
  const startTurn = useCallback((question: string): TurnHandle => {
    const { visitorId, sessionId, isNewVisitor, isNewSession } = getVisitorInfo();
    const turnId = uuid();
    const sentAt = new Date().toISOString();
    // Claim the index now so interleaved turns keep their original order.
    const turnIndex = nextTurnIndex();
    const t0 = now();

    let ttftMs: number | null = null;
    let model: string | null = null;
    let outcome: ChatOutcome = "llm";

    return {
      turnId,
      markFirstToken() {
        if (ttftMs === null) ttftMs = Math.round(now() - t0);
      },
      setModel(name) {
        model = name;
      },
      setOutcome(next) {
        outcome = next;
      },
      finish(answer, httpStatus) {
        const totalMs = Math.round(now() - t0);
        const trimmed = answer.trim();
        if (!trimmed) outcome = "error";

        try {
          sendAnalytics(TRACK_URL, {
            turnId,
            sessionId,
            visitorId,
            turnIndex,
            isNewVisitor,
            isNewSession,
            question,
            answer: trimmed,
            model,
            outcome,
            httpStatus,
            ttftMs,
            totalMs,
            sentAt,
            page: collectPage(),
            device: collectDevice(),
          });
        } catch {
          /* never surface analytics errors to the user */
        }
      },
    };
  }, []);

  const vote = useCallback(
    (
      turnId: string,
      rating: VoteValue,
      question: string,
      answer: string
    ) => {
      try {
        const { visitorId, sessionId } = getVisitorInfo();
        sendAnalytics(FEEDBACK_URL, {
          turnId,
          sessionId,
          visitorId,
          rating,
          question,
          // Trim hard: the server already has the full text on the turn doc.
          answer: answer.slice(0, 2000),
          page: collectPage(),
        });
      } catch {
        /* ignore */
      }
    },
    []
  );

  return { startTurn, vote };
}

export default useChatAnalytics;
