const WORDS_PER_MINUTE = 200

export function stripMarkdown(md: string): string {
  return (md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|\[\]()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function wordCount(md: string): number {
  const text = stripMarkdown(md)
  return text ? text.split(/\s+/).filter(Boolean).length : 0
}

export function readingTime(md: string): string {
  const words = wordCount(md)
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  return `${minutes} min read`
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export type TocItem = {
  id: string
  text: string
  level: number
}

export function extractToc(md: string): TocItem[] {
  const items: TocItem[] = []
  const lines = (md || '').split('\n')
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/)
    if (!match) continue
    const level = match[1].length
    const text = match[2].trim().replace(/[`*]/g, '')
    items.push({ id: slugifyHeading(text), text, level })
  }
  return items
}