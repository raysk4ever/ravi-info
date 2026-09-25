"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { TocItem } from "@/lib/blog-content";

type TableOfContentsProps = {
  items: TocItem[];
};

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="not-prose">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block border-l-2 border-transparent py-1.5 pl-4 text-sm leading-snug text-muted-foreground transition-colors duration-200 hover:text-foreground",
                item.level === 3 && "pl-8 text-[13px]",
                activeId === item.id &&
                  "border-accent text-foreground font-medium"
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}