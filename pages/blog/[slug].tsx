import Head from "next/head";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, FileText, MessageSquare } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { getPost, getAllPosts, getPostsByTag } from "@/lib/blog";
import {
  extractToc,
  slugifyHeading,
  wordCount,
} from "@/lib/blog-content";
import PostCard, { type BlogPostView } from "@/components/blog/PostCard";
import ReadingProgress from "@/components/blog/ReadingProgress";
import TableOfContents from "@/components/blog/TableOfContents";
import ShareActions from "@/components/blog/ShareActions";
import Comments from "@/components/blog/Comments";
import LikeButton from "@/components/blog/LikeButton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import useScrollReveal from "@/hooks/use-scroll-reveal";
import style from "@/styles/blog.module.css";

const SITE_URL = "https://www.socialamigo.in";

function headingText(children: any): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(headingText).join("");
  return "";
}

const markdownComponents: Components = {
  h2: ({ children, ...props }) => (
    <h2 id={slugifyHeading(headingText(children))} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 id={slugifyHeading(headingText(children))} {...props}>
      {children}
    </h3>
  ),
};

export async function getStaticPaths() {
  const posts = getAllPosts();
  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: any) {
  const post = getPost(params.slug);

  const toc = extractToc(post.content);
  const words = wordCount(post.content);
  const tags: string[] = Array.isArray(post.tags) ? post.tags : [];

  const primaryTag = tags[0];
  const byTag = primaryTag ? getPostsByTag(primaryTag) : [];
  const related = [
    ...byTag.filter((p: any) => p.slug !== post.slug),
    ...getAllPosts().filter(
      (p: any) => p.slug !== post.slug && !byTag.some((q: any) => q.slug === p.slug)
    ),
  ]
    .slice(0, 2)
    .map((p: any) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      date: p.date,
      tags: p.tags,
      image: p.image,
      readTime: p.readTime,
      url: `/blog/${p.slug}`,
    }));

  return { props: { post, toc, words, related } };
}

export default function BlogPost({ post, toc, words, related }: any) {
  useScrollReveal();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const image = post.image
    ? post.image.startsWith("http")
      ? post.image
      : `${SITE_URL}${post.image}`
    : `${SITE_URL}/ravi.png`;
  const keywords = Array.isArray(post.tags) ? post.tags.join(", ") : post.tags;
  const published = new Date(post.date).toISOString();

  return (
    <>
      <Head>
        <title>{post.title} | Ravi Singh</title>
        <meta name="description" content={post.description} />
        <meta name="keywords" content={keywords} />
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large"
        />
        <meta name="author" content="Ravi Singh" />
        <link rel="canonical" href={url} />

        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={image} />
        <meta property="og:site_name" content="Ravi Singh — AI Engineer" />
        <meta property="article:published_time" content={published} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <meta name="twitter:image" content={image} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.description,
              datePublished: published,
              dateModified: published,
              image: image,
              keywords: keywords,
              mainEntityOfPage: { "@type": "WebPage", "@id": url },
              author: {
                "@type": "Person",
                name: "Ravi Singh",
                url: "https://www.linkedin.com/in/ravi-ksingh/",
                sameAs: [
                  "https://www.linkedin.com/in/ravi-ksingh/",
                  "https://github.com/raysk4ever",
                  "https://x.com/raysk4ever",
                ],
              },
              publisher: {
                "@type": "Organization",
                name: "Ravi Singh",
                url: SITE_URL,
                logo: { "@type": "ImageObject", url: `${SITE_URL}/cloud.png` },
              },
            }),
          }}
        />
      </Head>

      <ReadingProgress />

      <main className={style.blogPost}>
        <article>
          <header className={`${style.blogPostHeader} reveal`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <Link href="/blog" className={style.blogBack}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to blog
              </Link>

              {Array.isArray(post.tags) && post.tags.length > 0 && (
                <Badge
                  variant="accent"
                  className="px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest"
                >
                  #{post.tags[0]}
                </Badge>
              )}
            </div>

            <h1 className={`${style.blogPostTitle} font-display`}>
              {post.title}
            </h1>

            <div className={style.blogPostMeta}>
              <div className={style.blogPostAuthor}>
                <Avatar className="h-9 w-9">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <AvatarImage src="/ravi.png" alt="Ravi Singh" />
                </Avatar>
                <span className={style.blogPostAuthorName}>Ravi Singh</span>
                <span aria-hidden="true" className={style.blogPostMetaDot}>·</span>
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>
              <div className={style.blogPostReadStats}>
                <LikeButton slug={post.slug} />
                <a href="#comments" className={style.commentCountLink}>
                  <MessageSquare size={13} aria-hidden="true" />
                  Comments
                </a>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {post.readTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {words.toLocaleString()} words
                </span>
                {post.externalUrl && (
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </div>
            </div>
          </header>

          {post.image && (
            <div className={`${style.blogPostHero} reveal`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.image} alt={post.title} className={style.blogPostHeroImg} />
            </div>
          )}

          <div className={style.blogPostBody}>
            <div
              className={`${style.blogArticleWrap} ${toc.length ? style.hasToc : ""}`}
            >
              <div className={`${style.blogProse} reveal`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={markdownComponents}
                >
                  {post.content}
                </ReactMarkdown>
              </div>

              <footer className={style.blogPostFooter}>
                <div className="flex flex-wrap items-center gap-2">
                  {Array.isArray(post.tags) &&
                    post.tags.map((tag: string) => (
                      <Link key={tag} href={`/tags/${tag}`}>
                        <Badge variant="outline" className="hover:border-accent hover:text-foreground transition-colors">
                          #{tag}
                        </Badge>
                      </Link>
                    ))}
                </div>

                <ShareActions postUrl={url} postTitle={post.title} className="mt-6" />

                <Separator className="my-8" />

                <div className={style.blogAuthorCard}>
                  <Avatar className="h-12 w-12">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <AvatarImage src="/ravi.png" alt="Ravi Singh" />
                  </Avatar>
                  <div>
                    <p className={style.blogAuthorCardName}>
                      Written by <span className="font-semibold">Ravi Singh</span>
                    </p>
                    <p className={style.blogAuthorCardBio}>
                      AI engineer building production RAG and full-stack systems.
                    </p>
                    <p className={style.blogAuthorCardLinks}>
                      <a
                        href="https://www.linkedin.com/in/ravi-ksingh/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        LinkedIn
                      </a>
                      {" · "}
                      <a
                        href="https://github.com/raysk4ever"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        GitHub
                      </a>
                      {" · "}
                      <Link href="/blog">Blog</Link>
                    </p>
                  </div>
                </div>
              </footer>

              {/* Inside the article column so comments align with the prose. */}
              <Comments slug={post.slug} />
            </div>

            {toc.length > 0 && (
              <aside className={style.blogToc}>
                <div className={style.blogTocInner}>
                  <TableOfContents items={toc} />
                </div>
              </aside>
            )}
          </div>
        </article>

        {related.length > 0 && (
          <section
            className={`${style.blogRelated} reveal`}
            aria-label="Keep reading"
          >
            <div className={style.blogRelatedHeader}>
              <h2 className={`${style.blogRelatedTitle} font-display`}>
                Keep reading
              </h2>
            </div>
            <div className={style.blogRelatedGrid}>
              {related.map((postView: BlogPostView) => (
                <PostCard key={postView.url} post={postView} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}