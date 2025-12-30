import Head from "next/head";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import style from "@/styles/blog.module.css";

export async function getStaticPaths() {
  const tags = Array.from(new Set(getAllPosts().flatMap(p => p.tags)));

  return {
    paths: tags.map(tag => ({ params: { tag } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const posts = getAllPosts().filter(p => p.tags.includes(params.tag));

  return { props: { tag: params.tag, posts } };
}

export default function TagPage({ tag, posts }) {
  return (
    <>
      <Head>
        <title>#{tag} | Ravi Singh</title>
      </Head>

      <main className={style.blogContainer}>
        <h1 className={style.blogIndexTitle}>#{tag}</h1>

        {posts.map(post => (
          <article key={post.slug} className={style.blogCard}>
            <Link href={`/blog/${post.slug}`} className={style.blogCardTitle}>
              {post.title}
            </Link>
          </article>
        ))}
      </main>
    </>
  );
}
