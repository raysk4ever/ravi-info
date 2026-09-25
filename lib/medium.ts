import * as fs from "fs";
import * as path from "path";
import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: ["content:encoded"],
  },
});

type MediumPost = {
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
};

const CACHE_FILE = path.join(process.cwd(), ".next", "medium-feed.json");
const LOCK_FILE = path.join(process.cwd(), ".next", "medium-feed.lock");
const SNAPSHOT_FILE = path.join(process.cwd(), "lib", "medium-feed.snapshot.json");

async function fetchFeed(retries = 4): Promise<MediumPost[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const feed = await parser.parseURL("https://techgama.medium.com/feed");
      return feed.items.map((item) => {
        const rawContent =
          item.contentSnippet ||
          item["content:encoded"] ||
          item.content ||
          "";
        return {
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          snippet: stripHtml(rawContent).slice(0, 180) + "...",
        };
      });
    } catch (err) {
      lastError = err;
      await new Promise((resolve) =>
        setTimeout(resolve, 1500 * (attempt + 1)),
      );
    }
  }
  throw lastError;
}

function readCache(): MediumPost[] | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    return JSON.parse(raw) as MediumPost[];
  } catch {
    return null;
  }
}

function writeCache(posts: MediumPost[]) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(posts));
  } catch {
    // ignore cache write failures
  }
}

async function acquireLock(timeoutMs = 15000): Promise<() => void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const fd = fs.openSync(LOCK_FILE, "wx");
      return () => {
        try {
          fs.closeSync(fd);
          fs.unlinkSync(LOCK_FILE);
        } catch {
          // ignore
        }
      };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("Timed out waiting for medium feed lock");
}

function readSnapshot(): MediumPost[] | null {
  try {
    const raw = fs.readFileSync(SNAPSHOT_FILE, "utf8");
    return JSON.parse(raw) as MediumPost[];
  } catch {
    return null;
  }
}

export async function getMediumPosts(force = false) {
  if (!force) {
    const cached = readCache();
    if (cached) return cached;
  }

  const release = await acquireLock();
  try {
    if (!force) {
      const cached = readCache();
      if (cached) return cached;
    }
    let posts: MediumPost[];
    try {
      posts = await fetchFeed();
    } catch (err) {
      console.warn(
        "Medium feed unavailable, falling back to snapshot:",
        String(err),
      );
      posts = readSnapshot() ?? [];
    }
    writeCache(posts);
    return posts;
  } finally {
    release();
  }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "");
}