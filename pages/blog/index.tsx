import Head from "next/head";
import Link from "next/link";
import { Rss } from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa6";

import { getAllBlogEntries, getAllTags } from "@/lib/blog";
import PostCard, { type BlogPostView } from "@/components/blog/PostCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useScrollReveal from "@/hooks/use-scroll-reveal";
import style from "@/styles/blog.module.css";

export async function getStaticProps() {
  const entries: BlogPostView[] = await getAllBlogEntries();
  const tags = getAllTags();

  const featured =
    entries.find((e) => e.source === "local" && e.image) ?? entries[0];
  const rest = entries.filter((e) => e !== featured);

  return {
    props: { entries: rest, featured, tags },
    revalidate: 3600,
  };
}

export default function Blog({ entries, featured, tags }: any) {
  useScrollReveal();

  return (
    <>
      <Head>
        <title>AI, RAG &amp; Full-Stack Blog | Ravi Singh</title>
        <meta
          name="description"
          content="In-depth technical articles on Agentic AI, RAG pipelines, LangChain, LLMs, Linux, React, Node.js and full-stack engineering, written by Ravi Singh."
        />
        <link rel="canonical" href="https://www.socialamigo.in/blog" />

        <meta property="og:title" content="AI, RAG & Full-Stack Blog | Ravi Singh" />
        <meta
          property="og:description"
          content="In-depth technical articles on Agentic AI, RAG pipelines, LangChain, LLMs and full-stack engineering."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.socialamigo.in/blog" />
        <meta property="og:site_name" content="Ravi Singh — AI Engineer" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI, RAG & Full-Stack Blog | Ravi Singh" />
        <meta
          name="twitter:description"
          content="In-depth technical articles on Agentic AI, RAG pipelines, LangChain, LLMs and full-stack engineering."
        />
      </Head>

      <main className={style.blogPage}>
        <header className={`${style.blogPageHeader} reveal`}>
          <Badge
            variant="accent"
            className="mb-4 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest"
          >
            Developer notes
          </Badge>
          <h1 className={`${style.blogPageTitle} font-display`}>
            Writing on AI, RAG{" "}
            <span className="text-accent">&amp;</span> building software
          </h1>
          <p className={style.blogPageLed}>
            Practical, hands-on articles on Agentic AI, RAG pipelines,
            LangChain, LLMs and full-stack engineering — the things I ship and
            debug every day.
          </p>
          <div className={style.blogPageCta}>
            <Button variant="outline" asChild>
              <a href="/rss.xml" aria-label="Subscribe to the RSS feed">
                <Rss className="h-4 w-4" aria-hidden="true" />
                RSS feed
              </a>
            </Button>
            <Button variant="accent" asChild>
              <a
                href="https://www.linkedin.com/in/ravi-ksingh/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaLinkedinIn className="h-3.5 w-3.5" aria-hidden="true" />
                Follow on LinkedIn
              </a>
            </Button>
          </div>
        </header>

        {tags.length > 0 && (
          <nav
            className={`${style.blogCategories} reveal`}
            aria-label="Browse posts by topic"
          >
            {tags.map((tag: string) => (
              <Link key={tag} href={`/tags/${tag}`} className={style.blogCategoryChip}>
                #{tag}
              </Link>
            ))}
          </nav>
        )}

        {featured && (
          <section className={`${style.blogSection} reveal`} aria-label="Latest post">
            <PostCard post={featured} featured priority />
          </section>
        )}

        <section
          className={`${style.blogSection} reveal`}
          aria-label="All articles"
        >
          <div className={style.blogGrid + " stagger-children"}>
            {entries.map((post: BlogPostView) => (
              <PostCard key={post.url ?? post.title} post={post} />
            ))}
          </div>
        </section>

        <footer className={style.blogFooter}>
          <p>
            New articles are also posted on{" "}
            <a
              href="https://medium.com/@techgama"
              target="_blank"
              rel="noopener noreferrer"
              className={style.blogFooterLink}
            >
              Medium
            </a>
            . Subscribe via{" "}
            <a href="/rss.xml" className={style.blogFooterLink}>
              RSS
            </a>
            .
          </p>
        </footer>
      </main>
    </>
  );
}