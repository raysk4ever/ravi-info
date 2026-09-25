"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { FaLinkedinIn, FaXTwitter } from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShareActionsProps = {
  postUrl: string;
  postTitle: string;
  className?: string;
};

export default function ShareActions({
  postUrl,
  postTitle,
  className,
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    postTitle
  )}&url=${encodeURIComponent(postUrl)}`;
  const linkedInUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
    postUrl
  )}&title=${encodeURIComponent(postTitle)}`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="mr-1 text-sm text-muted-foreground">Share</span>
      <Button
        variant="outline"
        size="icon"
        onClick={copyLink}
        aria-label="Copy link to clipboard"
        title="Copy link"
      >
        {copied ? (
          <Check className="h-4 w-4 text-accent" aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        asChild
        aria-label="Share on X"
        title="Share on X"
      >
        <a href={xUrl} target="_blank" rel="noopener noreferrer">
          <FaXTwitter className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </Button>
      <Button
        variant="outline"
        size="icon"
        asChild
        aria-label="Share on LinkedIn"
        title="Share on LinkedIn"
      >
        <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
          <FaLinkedinIn className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}