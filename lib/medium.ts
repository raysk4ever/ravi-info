import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: ["content:encoded"],
  },
});

export async function getMediumPosts() {
  const feed = await parser.parseURL("https://techgama.medium.com/feed");

  return feed.items.map(item => {
    const rawContent =
      item.contentSnippet ||
      item["content:encoded"] ||
      item.content ||
      "";

    const text = stripHtml(rawContent).slice(0, 180);

    return {
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      snippet: text + "...",
    };
  });
}

// Utility to remove HTML tags
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "");
}
