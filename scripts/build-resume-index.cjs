const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const pdfParse = require('pdf-parse');
const { Document } = require('@langchain/core/documents');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { OllamaEmbeddings } = require('@langchain/ollama');

const RESUME_PDF = process.env.RESUME_PDF || '/Users/ravi/Downloads/Ravi Resume.pdf';
const DIMS = { openai: 1536, ollama: 768 };
const OUT = {
  openai: path.join(process.cwd(), 'public/faiss_index_openai'),
  ollama: path.join(process.cwd(), 'public/faiss_index_ollama'),
};

function clean(text) {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitSections(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const headers = ['SUMARRY', 'SUMMARY', 'EXPERIENCE', 'SKILLS', 'EDUCATION'];
  const sections = {};
  let current = 'preamble';
  sections[current] = [];
  for (const line of lines) {
    if (/^[A-Z][A-Z ]{2,}$/.test(line) && headers.includes(line)) {
      current = line;
      sections[current] = [];
      continue;
    }
    sections[current].push(line);
  }
  return sections;
}

function splitExperience(expText) {
  const blocks = [];
  const re = /^([A-Za-z][A-Za-z .&'-]+?)\s{2,}([\w –\u2013-]+)\s*$/gm;
  let last = null;
  const lines = expText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (re.test(line)) {
      if (last) blocks.push(last.join('\n'));
      last = [line];
      continue;
    }
    (last ?? (last = [])).push(line);
  }
  if (last) blocks.push(last.join('\n'));
  return blocks;
}

const COMPANY_TAGS = { EPAM: 'EPAM', Tesit: 'Tesit', Envirya: 'Envirya' };

function buildDocs(sections) {
  const docs = [];

  const name = (sections.preamble || [])
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');
  const summary = (sections['SUMMARY'] || []).join(' ').trim();
  docs.push(
    new Document({
      pageContent: clean(`Name: ${name}\n\nProfessional Summary: ${summary}\n\nOnline: YouTube channel @classietime — https://www.youtube.com/@classietime`),
      metadata: {
        type: 'profile',
        tags: ['Who is Ravi Singh?', 'personal', 'summary', 'Ravi Singh', 'youtube'],
        last_updated: '2026-09-26',
      },
    })
  );

  for (const block of splitExperience((sections['EXPERIENCE'] || []).join('\n'))) {
    const company = Object.keys(COMPANY_TAGS).find((c) => block.toLowerCase().includes(c.toLowerCase()));
    const content = clean(block);
    if (!content) continue;
    docs.push(
      new Document({
        pageContent: content,
        metadata: {
          type: 'experience',
          tags: [company ?? 'work', 'work', 'experience'],
          last_updated: '2026-09-26',
        },
      })
    );
  }

  docs.push(
    new Document({
      pageContent: clean(`Ravi's Technical Skills:\n${(sections['SKILLS'] || []).join('\n')}`),
      metadata: {
        type: 'skills',
        tags: ['technical', 'skills', 'stack', 'technologies'],
        last_updated: '2026-09-26',
      },
    })
  );

  docs.push(
    new Document({
      pageContent: clean(`Education: ${(sections['EDUCATION'] || []).join(' ')}`),
      metadata: {
        type: 'education',
        tags: ['education', 'degree', 'university'],
        last_updated: '2026-09-26',
      },
    })
  );

  docs.push(
    new Document({
      pageContent: clean(
        `Side Projects & Hobbies: Ravi runs a YouTube channel called Classie Time (@classietime, https://www.youtube.com/@classietime) where he shares tech content, tutorials, and AI/LLM topics.`
      ),
      metadata: {
        type: 'other',
        tags: ['youtube', 'channel', 'classietime', 'side project', 'hobby', 'videos'],
        last_updated: '2026-09-26',
      },
    })
  );

  return docs;
}

async function main() {
  const buf = fs.readFileSync(RESUME_PDF);
  const parsed = await pdfParse(buf);
  const sections = splitSections(parsed.text);
  const docs = buildDocs(sections);

  console.log('PDF pages:', parsed.numpages);
  console.log('Docs built:', docs.length);
  for (const d of docs) {
    console.log(' -', d.metadata.type, '|', d.metadata.tags.map(String).join(','), '|', d.pageContent.length, 'chars');
  }

  for (const kind of ['openai', 'ollama']) {
    const embeddings = kind === 'openai'
      ? new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
      : new OllamaEmbeddings({ baseUrl: 'http://localhost:11434', model: 'nomic-embed-text:latest' });

    console.log(`\nEmbedding (${kind})...`);
    const store = await FaissStore.fromDocuments(docs, embeddings);
    await store.save(OUT[kind]);
    console.log('Saved ->', OUT[kind]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});