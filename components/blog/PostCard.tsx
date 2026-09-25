import { ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type BlogPostView = {
  slug?: string;
  title: string;
  description: string;
  date: string;
  tags?: string[];
  image?: string | null;
  readTime?: string;
  url?: string;
  source?: string;
  externalUrl?: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type PostCardProps = {
  post: BlogPostView;
  featured?: boolean;
  priority?: boolean;
};

export default function PostCard({
  post,
  featured = false,
  priority = false,
}: PostCardProps) {
  const href = post.externalUrl ?? post.url ?? "/blog";
  const isExternal = Boolean(post.externalUrl);

  const linkProps = isExternal
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href };

  const content = (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border-border bg-card transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-accent hover:shadow-lg hover:shadow-accent/10",
        featured && "border-border/80 md:grid md:grid-cols-2"
      )}
    >
      {post.image ? (
        <div
          className={cn(
            "relative overflow-hidden",
            featured ? "aspect-[16/10] md:aspect-[16/10]" : "aspect-[16/9]"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image}
            alt={post.title}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          {isExternal && (
            <span className="absolute left-3 top-3">
              <Badge
                variant="outline"
                className="border-border/60 bg-background/80 px-3 py-1 text-[11px] uppercase tracking-wide backdrop-blur-md"
              >
                Medium
              </Badge>
            </span>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center justify-center bg-muted text-4xl text-muted-foreground/40",
            featured ? "aspect-[16/9] h-full w-full" : "aspect-[16/9] w-full"
          )}
        >
          {"</>"}
        </div>
      )}

      <CardContent
        className={cn(
          "flex flex-1 flex-col p-6",
          featured && "md:p-9"
        )}
      >
        <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
          {post.tags?.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="px-2.5 py-[5px] text-[11px] leading-none"
            >
              #{tag}
            </Badge>
          ))}
          {!post.tags?.length && isExternal && (
            <Badge
              variant="outline"
              className="px-2.5 py-[5px] text-[11px] leading-none"
            >
              #backend
            </Badge>
          )}
        </div>

        <CardTitle
          className={cn(
            "font-display font-semibold leading-snug tracking-tight text-foreground",
            featured
              ? "text-2xl md:text-[1.75rem]"
              : "text-lg md:text-xl"
          )}
        >
          {post.title}
        </CardTitle>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {post.description}
        </p>
      </CardContent>

      <CardFooter
        className={cn(
          "mt-auto gap-4 px-6 pb-5 text-xs text-muted-foreground",
          featured && "md:px-9 md:pb-9"
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </span>
        {post.readTime && (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {post.readTime}
          </span>
        )}
        <span
          aria-hidden="true"
          className="ml-auto inline-flex translate-x-0 items-center gap-1 text-foreground transition-all duration-300 ease-out group-hover:translate-x-1"
        >
          <span className="sr-only">Read</span>
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </CardFooter>
    </Card>
  );

  return isExternal ? (
    <a {...linkProps} className="block h-full">
      {content}
    </a>
  ) : (
    <Link {...linkProps} className="block h-full" aria-label={post.title}>
      {content}
    </Link>
  );
}