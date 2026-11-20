import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getMediumPosts } from "./medium";
import { readingTime } from "./blog-content";


const BLOG_DIR = path.join(process.cwd(), "pages/content/blog");
console.log('BLOG_DIR', BLOG_DIR);

export async function getAllExternalPosts() {
  return await getMediumPosts();
}

export function getAllPosts() {
  const files = fs.readdirSync(BLOG_DIR);

  return files.flatMap((file) => {
    if (!file.endsWith(".md")) return [];
    const slug = file.replace(".md", "");
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
    const { data, content } = matter(raw);

    if (data.draft === true || data.published === false) return [];

    return [{
      slug,
      title: data.title,
      description: data.description,
      date: data.date,
      dateModified: data.dateModified || data.updatedAt || null,
      tags: data.tags || [],
      image: data.image || null,
      readTime: readingTime(content),
    }];
  });
}

export function getPost(slug: string) {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Blog post not found: ${slug}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  if (data.draft === true || data.published === false) {
    throw new Error(`Blog post is not published: ${slug}`);
  }

  let imageWidth: number | undefined;
  let imageHeight: number | undefined;
  if (typeof data.image === "string" && data.image.startsWith("/")) {
    const imagePath = path.join(process.cwd(), "public", data.image.replace(/^\/+/, ""));
    if (fs.existsSync(imagePath)) {
      const bytes = fs.readFileSync(imagePath);
      if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        let offset = 2;
        while (offset + 9 < bytes.length) {
          if (bytes[offset] !== 0xff) break;
          const marker = bytes[offset + 1];
          if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
            imageHeight = bytes.readUInt16BE(offset + 5);
            imageWidth = bytes.readUInt16BE(offset + 7);
            break;
          }
          if (offset + 2 + bytes.readUInt16BE(offset + 2) >= bytes.length) break;
          offset += 2 + bytes.readUInt16BE(offset + 2);
        }
      } else if (
        bytes.length >= 24 &&
        bytes.subarray(1, 4).toString("ascii") === "PNG"
      ) {
        imageWidth = bytes.readUInt32BE(16);
        imageHeight = bytes.readUInt32BE(20);
      }
    }
  }

  // Front matter is arbitrary YAML, so spell out the fields callers rely on.
  // Without this the inferred type is just the three literals above and
  // `post.tags` / `post.image` fail to typecheck at the call site.
  return {
    slug,
    content,
    readTime: readingTime(content),
    ...(data as {
      title?: string;
      description?: string;
      date?: string;
      dateModified?: string;
      author?: string;
      tags?: string[];
      image?: string | null;
      externalUrl?: string;
    }),
    imageWidth,
    imageHeight,
  };
}

export function getPostsByTag(tag: string) {
  return getAllPosts().filter(p => p.tags?.includes(tag));
}

export function getAllTags() {
  return Array.from(new Set(getAllPosts().flatMap(p => p.tags || [])));
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export async function getAllBlogEntries() {
  const local = getAllPosts().map(p => ({
    ...p,
    source: "local",
    url: `/blog/${p.slug}`,
    date: new Date(p.date).toISOString()
,
  }));

  const medium = (await getMediumPosts()).map((p: any) => ({
    title: p.title,
    description: p.snippet,
    source: "medium",
    url: `/blog/external/${slugify(p.title)}`,
    externalUrl: p.link,
    image: null,
    readTime: readingTime(p.snippet || ""),
    date: new Date(p.pubDate).toISOString(),
  }));

  // return [...local, ...medium].sort((a, b) => b.date.getTime() - a.date.getTime());
  return [...local, ...medium].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
