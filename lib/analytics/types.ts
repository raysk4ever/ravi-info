/** Shared shapes for chat analytics. Kept dependency-free so both the API
 *  routes and the CLI can import them. */

export interface DeviceInfo {
  ua?: string;
  browser?: string;
  os?: string;
  osVersion?: string | null;
  deviceType?: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  /** Values below come from the browser and are merged on top of UA parsing. */
  platform?: string;
  language?: string;
  languages?: string[];
  timezone?: string;
  timezoneOffsetMinutes?: number;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  devicePixelRatio?: number;
  colorDepth?: number;
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
  maxTouchPoints?: number;
  isTouch?: boolean;
  prefersDarkMode?: boolean;
  connectionType?: string;
}

export interface GeoInfo {
  ipHash?: string | null;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  source?: "vercel" | "ipapi.co" | "none";
}

export interface PageContext {
  path?: string;
  referrer?: string;
  referrerHost?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export type ChatOutcome =
  | "llm"
  | "resume_card"
  | "rate_limited"
  | "error"
  /** Retrieval found nothing relevant, so the bot declined to answer. These are
   *  the highest-value rows: they are questions the knowledge base is missing. */
  | "no_context";

export interface ChatTurn {
  _id: string;
  createdAt: Date;
  question: string;
  answer: string;
  questionChars: number;
  answerChars: number;
  model: string | null;
  outcome: ChatOutcome;
  httpStatus: number | null;

  timing: {
    ttftMs: number | null;
    totalMs: number;
    sentAt: string;
  };

  sessionId: string;
  visitorId: string;
  turnIndex: number;
  isNewVisitor: boolean;
  isNewSession: boolean;

  device: DeviceInfo;
  geo: GeoInfo;
  context: PageContext;

  text: {
    exactKey: string;
    signature: string;
    keywords: string[];
    wordCount: number;
    isQuestion: boolean;
    questionType: string;
    topics: string[];
    entities: string[];
    negativeSignals: string[];
  };

  feedback: {
    rating: 1 | -1;
    comment: string | null;
    ratedAt: Date;
  } | null;
}

export interface ChatQuestionStat {
  _id: string;
  question: string;
  signature: string;
  keywords: string[];
  topics: string[];
  entities: string[];
  askCount: number;
  thumbsUp: number;
  thumbsDown: number;
  firstAskedAt: Date;
  lastAskedAt: Date;
  /** Running totals - averages are derived on read so we never lose precision
   *  to a read-modify-write race. */
  ttftSumMs: number;
  ttftCount: number;
  totalSumMs: number;
  sampleAnswers: string[];
}

export interface ChatFeedbackEvent {
  _id: string;
  turnId: string;
  createdAt: Date;
  rating: 1 | -1;
  previousRating: 1 | -1 | null;
  comment: string | null;
  question: string;
  answerSnippet: string;
  sessionId: string;
  visitorId: string;
}

/** Payload the browser POSTs via sendBeacon. */
export interface TrackTurnPayload {
  turnId: string;
  sessionId: string;
  visitorId: string;
  turnIndex: number;
  isNewVisitor: boolean;
  isNewSession: boolean;
  question: string;
  answer: string;
  model: string | null;
  outcome: ChatOutcome;
  httpStatus: number | null;
  ttftMs: number | null;
  totalMs: number;
  sentAt: string;
  page: PageContext;
  device: DeviceInfo;
}

export interface FeedbackPayload {
  turnId: string;
  sessionId: string;
  visitorId: string;
  /** 1 = up, -1 = down, 0 = clear an existing vote. */
  rating: 1 | -1 | 0;
  comment?: string | null;
  /** Sent by the client so a vote still works even if the turn write failed. */
  question: string;
  answer: string;
  model?: string | null;
  page?: PageContext;
  device?: DeviceInfo;
}
