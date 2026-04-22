import fs from "fs";
import path from "path";
import matter from "gray-matter";
import RSS from "rss";

const siteUrl = "https://www.socialamigo.in";
const BLOG_DIR = path.join(process.cwd(), "pages/content/blog");

const feed = new RSS({
  title: "Ravi Singh Blog",
  site_url: siteUrl,
  feed_url: `${siteUrl}/rss.xml`,
});

const files = fs.readdirSync(BLOG_DIR);

files.forEach(file => {
  if (!file.endsWith(".md")) return;

  const slug = file.replace(".md", "");
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
  const { data } = matter(raw);

  feed.item({
    title: data.title,
    description: data.description,
    url: `${siteUrl}/blog/${slug}`,
    date: data.date,
  });
});

fs.writeFileSync("./public/rss.xml", feed.xml());
console.log("RSS feed generated at public/rss.xml");
