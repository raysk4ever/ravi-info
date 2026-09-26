#!/usr/bin/env node
/**
 * Builds the FAISS knowledge index from every content source.
 *
 *   node scripts/build-rag-index.cjs            # build both providers
 *   node scripts/build-rag-index.cjs --check    # report staleness, write nothing
 *   node scripts/build-rag-index.cjs --force    # re-embed even if unchanged
 *   node scripts/build-rag-index.cjs --only ollama
 *
 * Sources:
 *   1. Resume PDF            public/resume/Ravi_Resume.pdf
 *   2. knowledge/profile.yaml
 *   3. knowledge/projects.json
 *   4. knowledge/skills.json
 *   5. knowledge/notes/**    .md .txt .yaml .yml .json
 *
 * Freshness: every document gets a content hash. Hashes live in a manifest
 * next to the index, so an unchanged corpus costs zero embedding calls and a
 * changed corpus only re-embeds when something actually moved.
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });
require("dotenv").config();

const { Document } = require("@langchain/core/documents");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { OllamaEmbeddings } = require("@langchain/ollama");
const yaml = require("js-yaml");

const ROOT = process.cwd();
const KNOWLEDGE_DIR = path.join(ROOT, "knowledge");
const NOTES_DIR = path.join(KNOWLEDGE_DIR, "notes");
const RESUME_PDF = path.join(ROOT, "public/resume/Ravi_Resume.pdf");

const OUT = {
  openai: path.join(ROOT, "public/faiss_index_openai"),
  ollama: path.join(ROOT, "public/faiss_index_ollama"),
};

const EMBEDDING_MODEL = {
  openai: "text-embedding-3-small",
  ollama: "nomic-embed-text:latest",
};

const NOTE_EXTENSIONS = new Set([".md", ".markdown", ".txt", ".yaml", ".yml", ".json"]);

// Chunks are small on purpose: the prompt concatenates the top 4, so a huge
// chunk would crowd out the other results.
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 150;

const argv = process.argv.slice(2);
const CHECK_ONLY = argv.includes("--check");
const FORCE = argv.includes("--force");
const onlyIdx = argv.indexOf("--only");
const ONLY = onlyIdx !== -1 ? argv[onlyIdx + 1] : null;

const sha = (value) =>
  crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);

/* -- helpers ----------------------------------------------------------- */

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= size) return [clean];

  // Prefer paragraph boundaries, then sentence boundaries, then hard cuts.
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const para = window.lastIndexOf("\n\n");
      const sentence = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("\n")
      );
      const cut = para > size * 0.4 ? para : sentence > size * 0.4 ? sentence : end;
      end = start + cut + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Split optional `---` front matter off a markdown file. */
function splitFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: raw };
  let meta = {};
  try {
    meta = yaml.load(match[1]) || {};
  } catch {
    meta = {};
  }
  return { meta, body: raw.slice(match[0].length) };
}

/** Render arbitrary YAML/JSON as readable `Key: value` lines for embedding. */
function flatten(value, prefix = "", out = []) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      if (item && typeof item === "object") {
        flatten(item, `${prefix}[${i + 1}].`, out);
      } else if (item !== null && item !== undefined) {
        out.push(`${prefix.replace(/\.\[/g, " ").replace(/\]/g, "")} ${item}`);
      }
    });
    return out;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith("$")) continue; // skip JSON $comment keys
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
  }
  out.push(`${prefix} ${value}`);
  return out;
}

function walk(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full, exts));
    else if (exts.has(path.extname(entry.name).toLowerCase())) found.push(full);
  }
  return found.sort();
}

const rel = (p) => path.relative(ROOT, p);

/* -- document sources -------------------------------------------------- */

const today = () => new Date().toISOString().slice(0, 10);

/** 1. Resume PDF */
async function fromResumePdf() {
  if (!fs.existsSync(RESUME_PDF)) {
    console.warn(`  ! resume PDF missing at ${rel(RESUME_PDF)} - skipping`);
    return [];
  }
  const pdfParse = require("pdf-parse");
  const parsed = await pdfParse(fs.readFileSync(RESUME_PDF));
  const text = parsed.text
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const sections = {};
  let current = "Resume";
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (/^[A-Z][A-Z /&]{3,}$/.test(t) && t.length < 40) {
      current = t;
      sections[current] = [];
      continue;
    }
    (sections[current] ??= []).push(t);
  }

  const docs = [];
  for (const [heading, lines] of Object.entries(sections)) {
    const body = lines.join(" ").replace(/\s{2,}/g, " ").trim();
    if (body.length < 40) continue;
    docs.push(
      new Document({
        pageContent: `${heading}\n${body}`,
        metadata: {
          source: "resume",
          type: heading.toLowerCase().replace(/[^a-z]+/g, "-"),
          title: heading,
          tags: ["resume", heading.toLowerCase()],
          last_updated: today(),
        },
      })
    );
  }
  return docs;
}

/** 2. profile.yaml */
function fromProfile() {
  const file = path.join(KNOWLEDGE_DIR, "profile.yaml");
  if (!fs.existsSync(file)) return [];
  const data = yaml.load(fs.readFileSync(file, "utf8")) || {};
  const lines = flatten(data)
    .map((l) => l.trim())
    .filter(Boolean);

  return chunkText(lines.join("\n")).map(
    (pageContent, i) =>
      new Document({
        pageContent,
        metadata: {
          source: "profile",
          type: "profile",
          title: `Profile (part ${i + 1})`,
          tags: ["profile", "who is ravi", "contact", "availability"],
          last_updated: today(),
        },
      })
  );
}

/** 3. projects.json - one document per project, so retrieval stays precise. */
function fromProjects() {
  const file = path.join(KNOWLEDGE_DIR, "projects.json");
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const docs = [];

  for (const p of data.projects ?? []) {
    const lines = [
      `Project: ${p.name}`,
      `Description: ${p.desc}`,
      p.tech?.length ? `Tech stack: ${p.tech.join(", ")}` : null,
      p.highlights?.length
        ? `Highlights: ${p.highlights.join(" ")}`
        : null,
      p.demo ? `Link: ${p.demo}` : null,
      p.isInternalTool ? "Note: internal tool, not publicly released." : null,
    ].filter(Boolean);

    docs.push(
      new Document({
        pageContent: lines.join("\n"),
        metadata: {
          source: "website",
          type: "project",
          title: p.name,
          tags: ["project", ...(p.tech ?? []).map((t) => String(t).toLowerCase())],
          last_updated: today(),
        },
      })
    );
  }
  return docs;
}

/** 4. skills.json - one document per category. */
function fromSkills() {
  const file = path.join(KNOWLEDGE_DIR, "skills.json");
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const docs = [];

  for (const cat of data.categories ?? []) {
    const names = (cat.skills ?? []).map((s) => s.name);
    const lines = [
      `Skill category: ${cat.title}`,
      cat.summary ? `About: ${cat.summary}` : null,
      `Technologies: ${names.join(", ")}`,
    ].filter(Boolean);

    docs.push(
      new Document({
        pageContent: lines.join("\n"),
        metadata: {
          source: "website",
          type: "skills",
          title: cat.title,
          tags: ["skills", "stack", ...names.map((n) => n.toLowerCase())],
          last_updated: today(),
        },
      })
    );
  }
  return docs;
}

/** 5. knowledge/notes/** - the drop-in folder. */
function fromNotes() {
  const files = walk(NOTES_DIR, NOTE_EXTENSIONS);
  const docs = [];

  for (const file of files) {
    // The README explains the folder to humans, not to the retriever.
    if (path.basename(file).toLowerCase() === "readme.md") continue;

    const raw = fs.readFileSync(file, "utf8");
    const ext = path.extname(file).toLowerCase();
    let text;
    let meta = {};

    if (ext === ".md" || ext === ".markdown") {
      const split = splitFrontMatter(raw);
      meta = split.meta || {};
      text = stripMarkdown(split.body);
    } else if (ext === ".yaml" || ext === ".yml") {
      text = flatten(yaml.load(raw) || {}).join("\n");
    } else if (ext === ".json") {
      text = flatten(JSON.parse(raw)).join("\n");
    } else {
      text = raw;
    }

    text = text.trim();
    if (text.length < 20) continue;

    const title =
      meta.title || path.basename(file, path.extname(file)).replace(/[-_]/g, " ");
    const tags = Array.isArray(meta.tags)
      ? meta.tags.map(String)
      : typeof meta.tags === "string"
        ? [meta.tags]
        : [];

    chunkText(text).forEach((pageContent, i) => {
      docs.push(
        new Document({
          pageContent,
          metadata: {
            source: "note",
            type: meta.type || "note",
            title: i === 0 ? title : `${title} (part ${i + 1})`,
            file: rel(file),
            tags,
            last_updated: today(),
          },
        })
      );
    });
  }
  return docs;
}

/* -- manifest --------------------------------------------------------- */

function manifestPath(kind) {
  return path.join(OUT[kind], "manifest.json");
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** Stable id for a document, independent of its position in the list. */
function docId(doc) {
  const m = doc.metadata ?? {};
  return sha(
    [m.source ?? "", m.type ?? "", m.title ?? "", m.file ?? "", doc.pageContent].join("|")
  );
}

function collectAll() {
  console.log("Collecting documents...");
  const groups = [
    ["resume pdf", fromResumePdf], // async
  ];
  // Resume first (async), then the sync sources.
  return (async () => {
    const docs = [];
    for (const [label, fn] of groups) {
      const got = await fn();
      console.log(`  ${label.padEnd(14)} ${got.length} doc(s)`);
      docs.push(...got);
    }
    for (const [label, fn] of [
      ["profile.yaml", fromProfile],
      ["projects.json", fromProjects],
      ["skills.json", fromSkills],
      ["notes/**", fromNotes],
    ]) {
      const got = fn();
      console.log(`  ${label.padEnd(14)} ${got.length} doc(s)`);
      docs.push(...got);
    }
    return docs;
  })();
}

/* -- main -------------------------------------------------------------- */

async function build() {
  if (!fs.existsSync(RESUME_PDF)) {
    console.warn(`! resume PDF not found: ${rel(RESUME_PDF)}`);
  }

  const docs = await collectAll();
  if (docs.length === 0) {
    console.error("No documents found - refusing to write an empty index.");
    process.exit(1);
  }

  const bySource = {};
  for (const d of docs) {
    const s = d.metadata?.source ?? "unknown";
    bySource[s] = (bySource[s] ?? 0) + 1;
  }
  console.log(`\nTotal: ${docs.length} documents`, bySource);

  const kinds = ONLY ? [ONLY] : ["ollama", "openai"];
  let anyStale = false;

  for (const kind of kinds) {
    if (!OUT[kind]) {
      console.error(`Unknown provider "${kind}" (use ollama or openai)`);
      process.exit(1);
    }
    console.log(`\n=== ${kind} (${EMBEDDING_MODEL[kind]}) ===`);

    const manifest = readJson(manifestPath(kind), { docs: {}, model: null });
    const modelChanged = manifest.model !== EMBEDDING_MODEL[kind];

    const wanted = {};
    for (const doc of docs) wanted[docId(doc)] = doc;

    const added = [];
    const changed = [];
    const removed = [];
    for (const id of Object.keys(manifest.docs ?? {})) {
      if (!wanted[id]) removed.push(id);
    }
    for (const [id, doc] of Object.entries(wanted)) {
      if (modelChanged || FORCE) added.push(id);
      else if (!manifest.docs[id]) added.push(id);
      else if (manifest.docs[id] !== sha(doc.pageContent)) changed.push(id);
    }

    const unchanged = docs.length - added.length - changed.length;
    console.log(
      `  new ${added.length} | changed ${changed.length} | unchanged ${unchanged} | removed ${removed.length}` +
        (modelChanged ? "  (embedding model changed - re-embedding all)" : "")
    );

    if (added.length + changed.length + removed.length === 0) {
      console.log("  Index already up to date.");
      continue;
    }
    anyStale = true;

    if (CHECK_ONLY) {
      console.log("  --check: not writing.");
      continue;
    }

    const embeddings =
      kind === "openai"
        ? new OpenAIEmbeddings({ model: EMBEDDING_MODEL[kind] })
        : new OllamaEmbeddings({
            baseUrl: process.env.EMBEDDING_URL || "http://localhost:11434",
            model: EMBEDDING_MODEL[kind],
          });

    // Rebuild the whole index when anything changed. This version of
    // @langchain/community has no FaissStore.fromVectors, so vectors cannot be
    // injected from a cache - and at this corpus size (tens of short docs) a
    // full re-embed costs a fraction of a cent, so the hash check above is what
    // actually saves money: an unchanged corpus never reaches this point.
    console.log(`  embedding ${docs.length} document(s)...`);
    const store = await FaissStore.fromDocuments(docs, embeddings);
    await store.save(OUT[kind]);

    const nextManifest = { docs: {}, model: EMBEDDING_MODEL[kind] };
    for (const doc of docs) {
      const id = docId(doc);
      nextManifest.docs[id] = sha(doc.pageContent);
    }
    nextManifest.indexedAt = new Date().toISOString();
    nextManifest.docCount = docs.length;
    nextManifest.sources = bySource;

    fs.writeFileSync(manifestPath(kind), JSON.stringify(nextManifest, null, 2));
    console.log(`  saved -> ${rel(OUT[kind])} (${docs.length} docs)`);
  }

  if (CHECK_ONLY && anyStale) {
    console.log("\nIndex is STALE. Run: yarn rag:build");
    process.exit(2);
  }
  if (!CHECK_ONLY) {
    console.log("\nDone. Restart the dev server to pick up the new index.");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
