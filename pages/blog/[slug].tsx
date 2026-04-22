import Head from "next/head";
import { getPost, getAllPosts } from "@/lib/blog";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import style from "@/styles/blog.module.css";
import Link from "next/link";


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
  return (
    <>
      <Head>
        {/* Basic SEO */}
        <title>{post.title} | Ravi Singh</title>
        <meta name="description" content={post.description} />
        {/* Canonical */}
        <link
          rel="canonical"
          href={`https://www.socialamigo.in/blog/${post.slug}`}
        />

        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:type" content="article" />
        <meta
          property="og:url"
          content={`https://www.socialamigo.in/blog/${post.slug}`}
        />
        <meta property="og:image" content="https://www.socialamigo.in/ravi.png" />
         {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        {/* <meta name="twitter:image" content={`https://socialamigo.com/og/${post.slug}.png`} /> */}
        <meta name="twitter:image" content="https://www.socialamigo.in/ravi.png" />
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
                author: { "@type": "Person", name: "Ravi Singh" },
              }),
            }}
          />

          <div className={style.blogProse}>
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {post.content}
            </ReactMarkdown>
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
