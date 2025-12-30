import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getMediumPosts } from "./medium";


const BLOG_DIR = path.join(process.cwd(), "pages/content/blog");
console.log('BLOG_DIR', BLOG_DIR);

export async function getAllExternalPosts() {
  return await getMediumPosts();
}

export function getAllPosts() {
  const files = fs.readdirSync(BLOG_DIR);

  return files.map((file) => {
    const slug = file.replace(".md", "");
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
    const { data } = matter(raw);

    return {
      slug,
      title: data.title,
      description: data.description,
      date: data.date,
      tags: data.tags || [],
    };
  });
}

export function getPost(slug: string) {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), "utf-8");
  const { data, content } = matter(raw);

  return {
    slug,
    content,
    ...data,
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
    date: new Date(p.pubDate).toISOString(),
  }));

  // return [...local, ...medium].sort((a, b) => b.date.getTime() - a.date.getTime());
  return [...local, ...medium].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
