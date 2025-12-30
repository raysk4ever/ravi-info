import Link from "next/link";
import Head from "next/head";
import { getAllBlogEntries, getAllExternalPosts, getAllPosts } from "@/lib/blog";
import style from "@/styles/blog.module.css";

export async function getStaticProps() {
    const localPosts = getAllPosts();
    const mediumPosts = await getAllExternalPosts();
  // console.log('mediumPosts', mediumPosts);
  const entries = await getAllBlogEntries();
  return { props: { posts: localPosts, mediumPosts, entries }, revalidate: 3600 };
}

export default function Blog({ posts, mediumPosts, entries }: any) {
  console.log('posts', entries);
  
  return (
    <>
      <Head>
        <title>Blog | Ravi Singh</title>
        <meta name="description" content="Technical blogs on React, RAG, and AI" />
        <link rel="canonical" href="https://socialamigo.com/blog" />
      </Head>

      <main className={style.blogContainer}>
        <h1 className={style.blogIndexTitle}>Blog</h1>
        <div className={style.blogList}>

        {entries.map(post => (
          <article key={post.url} className={style.blogCard}>
            <Link href={post.url}>
              <h2 className={style.blogCardTitle}>{post.title}
              </h2>
            </Link>

            <p className={style.blogCardDesc}>{post.description}</p>
            <div className={style.blogCardFooter}>
              <span className={style.blogCardDate}>{new Date(post.date).toDateString()}</span>
              {post.source === "medium" && <span className={style.blogBadge}>Medium</span>}
              {/* tags */}
              <div className={style.blogTags}>
                {post.tags && post.tags.map((tag: string) => (
                  <a key={tag} href={`/tags/${tag}`} className={style.blogTag}>#{tag}</a>
                ))}
              </div>
            </div>
          </article>
        ))}
        </div>
      </main>
    </>
  );
}
