#!/bin/zsh
# Daily tech blog publisher for socialamigo.in.
# Writes + covers + deploys one new blog post per day by driving opencode headlessly.
set -u

LOG_DIR="$HOME/.daily-blog"
REPO="/Users/ravi/ravi/ravi-info"
TODAY="$(date +%F)"
STAMP="$(date '+%Y-%m-%d %H:%M:%S')"

mkdir -p "$LOG_DIR"

export HOME="$HOME"
export CI=1
export PATH="/Users/ravi/.opencode/bin:/Users/ravi/.nvm/versions/node/v20.9.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

source /Users/ravi/.nvm/nvm.sh >/dev/null 2>&1
nvm use 20.9.0 >/dev/null 2>&1

cd "$REPO" || { echo "[$STAMP] repo missing: $REPO" >> "$LOG_DIR/run.log"; exit 1; }

# Idempotency: if a post already dated today exists, do nothing.
if [ "${FORCE_RUN:-0}" != "1" ]; then
  if grep -rEl "date: *\"?$TODAY\"?" pages/content/blog/*.md >/dev/null 2>&1; then
    echo "[$STAMP] ALREADY PUBLISHED for $TODAY — skipping." >> "$LOG_DIR/run.log"
    exit 0
  fi
fi

echo "[$STAMP] Starting daily blog run for $TODAY" >> "$LOG_DIR/run.log"

cat > "$LOG_DIR/prompt-$TODAY.md" <<'PROMPTEOM'
You are the daily publishing agent for the portfolio site at /Users/ravi/ravi/ravi-info (Next.js 13, Pages Router, content in pages/content/blog/*.md). Your job: publish exactly ONE new original tech blog post dated TODAY, then deploy it.

Rules:
- Work autonomously. Never ask questions, never run interactive commands.
- Do not touch anything outside the repo. Do not touch Medium, the chat/RAG code, styles, or existing posts.
- The site is deployed via Vercel CLI only (no git). Deploy command is exact:
  CI=1 npx -y vercel@latest --prod --yes --build-env VERCEL_FORCE_NO_BUILD_CACHE=1
- Before writing, read 2-3 existing posts (pages/content/blog/*.md, e.g. building-rag.md, gama-portfolio-chatbot.md) to match the frontmatter schema, section style, images, and Prose conventions exactly.

Steps:

1. IDEMPOTENCY: list files in pages/content/blog/ whose frontmatter `date:` equals '<TODAY>'. If any exist, print "SKIP_ALREADY_PUBLISHED" and stop immediately.

2. TOPIC: propose 3 candidate titles never used before (check existing slugs in pages/content/blog/). Prefer original, practical, non-generic engineering topics (RAG/vector search, LangChain/LlamaIndex, edge inference on Cloudflare Workers AI, Next.js streaming/SSR, TypeScript, WebSockets, observability, perf). Pick the best one.

3. WRITE: create pages/content/blog/<slug>.md (slug: kebab-case, unique). Frontmatter must be exactly:
---
title: <SEO title>
description: <1-2 sentence meta description>
date: '<TODAY>'
tags: [<3-5 lowercase tags matching existing posts>]
image: "/blog-images/<slug>.jpg"
type: "blog"
---
Then 700-1000 words of accurate, specific content with code/architecture examples, h2 sections, and a conclusion. No emojis. Use the same Markdown conventions as the existing posts.

4. COVER: generate the hero image at public/blog-images/<slug>.jpg, 1600x900.
   - Study public/blog-images/*.jpg (e.g. gama-portfolio-chatbot.jpg) for visual style; build a matching HTML banner (title, subtitle, gradient, tag chip) in a temp file under /tmp.
   - Serve it: cd to the temp dir and run `python3 -m http.server 8123` in the background.
   - Use the Playwright MCP browser: set viewport 1600x900, open http://127.0.0.1:8123/banner.html, wait for render, screenshot the page element to the jpg, close page.
   - Kill the http server afterwards. Verify the jpg exists and is non-empty / 1600x900.

5. BUILD (must pass): pkill -9 -f "next start"; rm -rf .next; yarn build. If a build error is real, fix the post and rebuild. NOTE: Medium RSS is blocked by 429 — the snapshot fallback in lib/medium.ts is automatic; never fetch Medium.

6. DEPLOY: run the exact vercel command above; capture the deployment URL. If Vercel reports an interactive prompt, rerun with CI=1.

7. VERIFY: curl -s -o /dev/null -w "%{http_code}" https://www.socialamigo.in/blog/<slug> must return 200 after deploy propagation (retry a few times); and confirm the post appears in the /blog listing.

Finish with a concise report:
- POST: <title>
- SLUG: <slug>
- COVER: <path>
- BUILD: <exit> 
- DEPLOY: <url>
- LIVE: <status> /blog/<slug>
- WORD_COUNT: <n>
Keep the report to the last few lines of your reply only.
PROMPTEOM

# MAIN_TOPIC/date injection
sed -i '' "s|<TODAY>|$TODAY|g" "$LOG_DIR/prompt-$TODAY.md"

# FORCE_PUBLISH: strip the runbook's idempotency step so a new post is written anyway.
if [ "${FORCE_PUBLISH:-0}" = "1" ]; then
  sed -i '' '/^1\. IDEMPOTENCY:/d' "$LOG_DIR/prompt-$TODAY.md"
fi

echo "[$STAMP] Launching opencode..." >> "$LOG_DIR/run.log"

opencode run --auto "Execute the attached daily-blog runbook end-to-end. Work autonomously, never ask questions." \
  -f "$LOG_DIR/prompt-$TODAY.md" \
  >> "$LOG_DIR/run-$TODAY.log" 2>&1 &
OPID=$!

MAX_SEC=$((30 * 60))
elapsed=0
while kill -0 $OPID 2>/dev/null; do
  sleep 10
  elapsed=$((elapsed + 10))
  if [ $elapsed -ge $MAX_SEC ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Opencode run exceeded ${MAX_SEC}s — killed." >> "$LOG_DIR/run.log"
    kill -9 $OPID 2>/dev/null
    break
  fi
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Finished run for $TODAY (opencode exit wait done). See $LOG_DIR/run-$TODAY.log" >> "$LOG_DIR/run.log"
exit 0