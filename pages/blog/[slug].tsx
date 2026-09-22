import Head from "next/head";
import { getPost, getAllPosts } from "@/lib/blog";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import style from "@/styles/blog.module.css";
import Link from "next/link";

const SITE_URL = "https://www.socialamigo.in";

export async function getStaticPaths() {
  const posts = getAllPosts();
  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: any) {
  return { props: { post: getPost(params.slug) } };
}

export default function BlogPost({ post }: any) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const image = post.image
    ? `${SITE_URL}${post.image}`
    : `${SITE_URL}/ravi.png`;
  const keywords = Array.isArray(post.tags) ? post.tags.join(", ") : post.tags;

  return (
    <>
      <Head>
        {/* Basic SEO */}
        <title>{post.title} | Ravi Singh</title>
        <meta name="description" content={post.description} />
        <meta name="keywords" content={keywords} />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta name="author" content="Ravi Singh" />
        {/* Canonical */}
        <link rel="canonical" href={url} />

        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={image} />
        <meta property="og:site_name" content="Ravi Singh — AI Engineer" />
        <meta property="og:published_time" content={new Date(post.date).toISOString()} />
         {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <meta name="twitter:image" content={image} />
      </Head>

       <main className={style.blogContainer}>
        <article>
          <h1 className={style.blogTitle}>{post.title}</h1>
          <p className={style.blogDate}>{post.date}</p>

          {/* Structured Data */}
          {/* This is a JSON-LD script for structured data will generated at the build time, so can use dangerouslySetInnerHTML. */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                headline: post.title,
                description: post.description,
                datePublished: post.date,
                dateModified: post.date,
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
                    "https://twitter.com/raysk4ever",
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

          <div className={style.blogProse}>
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Author bio for E-E-A-T */}
          <div className={style.blogAuthor}>
            <p className={style.blogAuthorName}>Written by Ravi Singh</p>
            <p className={style.blogAuthorBio}>
              AI engineer building production RAG and full-stack systems. More
              writing on{" "}
              <Link href="/blog" className={style.blogAuthorLink}>the blog</Link>{" "}
              ·{" "}
              <a href="https://www.linkedin.com/in/ravi-ksingh/" target="_blank" rel="noopener noreferrer" className={style.blogAuthorLink}>LinkedIn</a>{" "}
              ·{" "}
              <a href="https://github.com/raysk4ever" target="_blank" rel="noopener noreferrer" className={style.blogAuthorLink}>GitHub</a>
            </p>
          </div>
        </article>
                <div className={style.blogNav}>
          <Link href="/blog" className={style.blogBack}>
            ← Back to blog
          </Link>
        </div>
      </main>
    </>
  );
}
