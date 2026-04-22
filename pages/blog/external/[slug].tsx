import Head from "next/head";
import { getMediumPosts } from "@/lib/medium";
import style from "@/styles/blog.module.css";
import Link from "next/link";

export async function getStaticPaths() {
  const posts = await getMediumPosts();

  return {
    paths: posts.map(p => ({
      params: { slug: slugify(p.title) },
    })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const posts = await getMediumPosts();
  const post = posts.find(p => slugify(p.title) === params.slug);

  return { props: { post } };
}

export default function ExternalPost({ post }) {
  return (
    <>
      <Head>
        <title>{post.title} | Ravi Singh</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className={style.blogContainer}>
        <h1 className={style.blogTitle}>{post.title}</h1>
        <p className={style.blogDate}>{new Date(post.pubDate).toDateString()}</p>
        <p className={style.blogProse}>{post.snippet}</p>

        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          className={style.blogExternalLink}
        >
          Read full article on Medium →
        </a>
        <div className={style.blogNav}>
          <Link href="/blog" className={style.blogBack}>
            ← Back to blog
          </Link>
        </div>
      </main>
    </>
  );
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
