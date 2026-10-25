---
title: "Streaming SSR in Next.js with Suspense and the App Router"
description: "How to stream server-rendered HTML progressively in Next.js using React Suspense and the App Router — faster first paint, parallel data fetching, and graceful loading states without client-side waterfalls."
date: '2026-10-15'
tags: ["Next.js", "Web Development", "Performance", "React"]
image: "/blog-images/nextjs-streaming-ssr-suspense.jpg"
type: "blog"
---

Traditional server-side rendering waits for every data fetch to finish before sending a single byte of HTML. If one slow query sits on the critical path, the user stares at a blank screen even though ninety percent of the page was ready. Streaming SSR fixes this by sending the shell immediately and flushing each Suspense boundary as its data resolves.

React 18's Suspense and the Next.js App Router turn that behavior into ordinary component composition: wrap a slow subtree in `<Suspense>`, and the server streams the fallback first, then swaps in the resolved markup. No client-side waterfall, no manually orchestrated loaders.

![Streaming SSR in Next.js with Suspense](/blog-images/nextjs-streaming-ssr-suspense.jpg)

## What streaming changes about rendering

In a classic render, the server does this sequentially: resolve all data, render the full tree to a string, then send one response. Streaming flips the order: it sends the document shell and `<head>`, streams placeholder markup for pending boundaries, and then pushes chunks as each promise resolves.

Three things improve:

- **First byte arrives sooner.** The browser can parse CSS and start fetching assets while the slow data is still in flight.
- **Independent work happens in parallel by construction.** Each Suspense boundary resolves on its own clock; a slow sidebar no longer delays a fast hero.
- **Loading UI is declarative.** The fallback is JSX next to the component, so it cannot drift out of sync with the real markup.

The cost is that you design for partial HTML: styles must apply to fragments, and interactions that depend on server data need to wait for that boundary.

## A streaming page in the App Router

A page is just an async Server Component. Anything wrapped in `<Suspense>` streams independently:

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";
import { RevenueCard } from "./revenue-card";
import { ActivityFeed } from "./activity-feed";
import { CardSkeleton, FeedSkeleton } from "./skeletons";

export default function DashboardPage() {
  return (
    <main className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <section>
        <h1>Dashboard</h1>
        <Suspense fallback={<CardSkeleton />}>
          <RevenueCard />
        </Suspense>
      </section>
      <section>
        <Suspense fallback={<FeedSkeleton />}>
          <ActivityFeed />
        </Suspense>
      </section>
    </main>
  );
}
```

```tsx
// app/dashboard/revenue-card.tsx
import { db } from "@/lib/db";

export async function RevenueCard() {
  const revenue = await db.revenue.sumLast30Days();
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted">Last 30 days</p>
      <p className="text-2xl font-semibold">${revenue.toLocaleString()}</p>
    </div>
  );
}
```

`RevenueCard` is an async Server Component: the `await` runs on the server, and its resolved JSX is streamed into the boundary. The two cards fetch concurrently because each boundary starts its own data load when React reaches it during render. Nothing is blocked waiting for a sibling.

## Stream independent subtrees, not the whole page

The biggest mistake is marking the entire page as one boundary. The value comes from granular boundaries aligned to real data boundaries, plus a shell that is itself cheap. A good rule of thumb: put a `<Suspense>` around any subtree whose data has meaningfully different latency or cache lifetime.

Nested boundaries give you a loading waterfall that mirrors your component tree:

```tsx
<Suspense fallback={<ProfileSkeleton />}>
  <ProfileHeader />
  <Suspense fallback={<PostsSkeleton />}>
    <UserPosts />
  </Suspense>
</Suspense>
```

`ProfileHeader` must resolve before `UserPosts` starts fetching because the user id is not known until the profile returns. That is an honest dependency, not a framework limitation — streaming never hides a real data dependency, it just stops unrelated ones from coupling.

## Fetch caching and dynamic rendering

By default, `fetch` in a Server Component is cached. For streaming pages that need fresh data, opt into dynamic rendering per fetch:

```tsx
const res = await fetch("https://api.example.com/metrics", {
  cache: "no-store",
});
```

If any component reads request-time data (`cookies()`, `headers()`) or uses `no-store`, Next.js renders that route dynamically and streams the shell instead of serving a static file. Combine that with ISR selectively: keep marketing and list pages static, and stream auth-gated or personalized views.

For repeated server work across boundaries, share the promise rather than duplicating fetches. In Next.js you can deduplicate with `fetch`'s built-in cache, or memoize a loader with React's `cache()`:

```tsx
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
```

The first call runs once per request; every subsequent call for the same id reuses the in-flight or resolved promise. That matters on streamed pages where the same user is referenced from several boundaries.

## Error boundaries without losing the shell

Streaming makes partial failures common: a flaky widget should not 500 the whole document. Pair each Suspense boundary with a colocated error boundary via `error.tsx`, and prefer soft fallbacks:

```tsx
// app/dashboard/revenue-card.tsx
export async function RevenueCard() {
  try {
    const revenue = await db.revenue.sumLast30Days();
    return <div>${revenue.toLocaleString()}</div>;
  } catch {
    return <div className="text-muted">Revenue unavailable</div>;
  }
}
```

Because the shell has already shipped, a failed boundary can be retried on the next navigation without forcing a full reload. Set a global `error.tsx` only for catastrophic failures that need a retry button.
## Measuring the win

Do not trust "feels faster." Measure the streaming path directly:

- **TTFB** should drop because the shell ships without waiting for data.
- **FCP** should drop because the browser can paint the shell while streams are pending.
- **LCP** depends on the heaviest element — if it lives inside a streamed boundary, LCP moves to that boundary's resolution time, so put large media in the shell when you can.
- Watch the **response stream** in DevTools or with `curl -N` to see chunks arrive over time instead of one monolithic payload.

If TTFB barely moves, the bottleneck is probably upstream of rendering: slow middleware, an unoptimized database query, or a cold serverless function. Profile before adding more boundaries.

## When not to stream

Streaming is not free. Skip it when the response is tiny, when every byte depends on one slow fetch, or when SEO needs complete HTML up front. Streaming also complicates caching, since a streamed response cannot be stored as a single snapshot without buffering it. For content-heavy, rarely changing pages, static generation beats streaming.
## Conclusion

Streaming SSR is a change in mental model, not just a flag. Move from "render once when everything is ready" to "ship a cheap shell and let each subtree arrive on its own schedule." In Next.js that looks like async Server Components wrapped in granular Suspense boundaries, shared cached loaders, and per-boundary error handling. The result is a page that starts drawing instantly and keeps filling in, instead of one that appears whole and late. Keep the boundaries tied to real data boundaries and measure TTFB and FCP after the change — that is the difference between a streamed page that is actually faster and one that is merely more complex.