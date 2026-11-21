import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import { ArrowLeft } from "lucide-react";

import PostCard, { type BlogPostView } from "@/components/blog/PostCard";
import { Badge } from "@/components/ui/badge";
import { getAllPosts } from "@/lib/blog";
import style from "@/styles/blog.module.css";

type TagParams = {
  tag: string;
};

type TagPageProps = {
  tag: string;
  posts: BlogPostView[];
};

const SITE_URL = "https://www.socialamigo.in";

export const getStaticPaths: GetStaticPaths<TagParams> = async () => {
  const tags = Array.from(
    new Set(
      getAllPosts().flatMap((post) =>
        Array.isArray(post.tags) ? post.tags : []
      )
    )
  );

  return {
    paths: tags.map((tag) => ({ params: { tag } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<TagPageProps, TagParams> = async ({
  params,
}) => {
  const tag = params?.tag;
  if (!tag) return { notFound: true };

  const posts = getAllPosts()
    .filter((post) => Array.isArray(post.tags) && post.tags.includes(tag))
    .map((post) => ({
      slug: post.slug,
      title: post.title || "Untitled article",
      description: post.description || "",
      date: post.date || "",
      tags: Array.isArray(post.tags) ? post.tags : [],
      image: post.image || null,
      readTime: post.readTime,
      url: `/blog/${post.slug}`,
      source: "local",
    }));

  return { props: { tag, posts } };
};

export default function TagPage({ tag, posts }: TagPageProps) {
  const canonicalUrl = `${SITE_URL}/tags/${encodeURIComponent(tag)}`;

  return (
    <>
      <Head>
        <title>{`#${tag} Articles | Ravi Singh`}</title>
        <meta
          name="description"
          content={`Browse ${posts.length} articles tagged ${tag} by Ravi Singh — AI Engineer & Full-Stack Developer.`}
        />
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      <main className={style.blogPage}>
        <header className={style.blogPageHeader}>
          <div>
            <Link href="/blog" className={style.blogBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All articles
            </Link>
          </div>
          <Badge
            variant="accent"
            className="mt-6 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest"
          >
            Topic archive · {posts.length} {posts.length === 1 ? "article" : "articles"}
          </Badge>
          <h1 className={`${style.blogPageTitle} mt-4 font-display`}>
            Articles tagged <span className="text-accent">#{tag}</span>
          </h1>
          <p className={style.blogPageLed}>
            A collection of writing on {tag}, gathered from the blog archive.
          </p>
        </header>

        <section className={style.blogSection} aria-label={`Articles tagged ${tag}`}>
          {posts.length > 0 ? (
            <div className={style.blogGrid}>
              {posts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
              No published articles currently use this tag.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
