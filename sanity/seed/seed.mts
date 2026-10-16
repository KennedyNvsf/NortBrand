/**
 * Development seed for the blog (#59): `pnpm sanity:seed`.
 *
 * Writes test authors, categories and posts into the `development` dataset only, so the
 * listing, the post page, search, filters, pagination and translations can be built and
 * tested against real content. Never production: the dataset is fixed below.
 *
 * - Fixed document ids, so a re-run replaces the same documents (`--replace`).
 * - 10 English posts (titles from Figma 05 Blog), 6 Portuguese translations and 1
 *   Portuguese-only post: page 2 of the listing, linked and unlinked translations.
 * - Covers come from src/assets/images; the import needs absolute file paths, so the
 *   NDJSON is written to a temporary file at run time.
 * - Needs your Sanity login once (`pnpm exec sanity login`, in a normal terminal).
 *
 * This is test content: the launch posts are entered by the team in #63.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DATASET = "development";
const root = resolve(import.meta.dirname, "../..");

function image(file: string, alt: string) {
  const url = pathToFileURL(join(root, "src/assets/images", file)).href;
  return { _type: "image", _sanityAsset: `image@${url}`, alt };
}

let keySeq = 0;
const key = () => `k${(keySeq += 1).toString(36)}`;

function localized(
  en: string,
  pt: string,
  type = "internationalizedArrayStringValue",
) {
  return [
    { _key: key(), _type: type, language: "en", value: en },
    { _key: key(), _type: type, language: "pt", value: pt },
  ];
}

function block(text: string, style = "normal") {
  return {
    _key: key(),
    _type: "block",
    style,
    markDefs: [],
    children: [{ _key: key(), _type: "span", marks: [], text }],
  };
}

/** A body with two h2 sections, so the table of contents has entries. */
function body(lead: string, language: "en" | "pt", withImage = false) {
  const t =
    language === "en"
      ? {
          h1: "Start with what the business needs",
          p1: "A good website starts from the work it has to do: bring in the right enquiries, answer the questions people actually ask, and make the next step obvious.",
          h2: "Measure, then improve",
          p2: "Launch is the starting line. Watch what people do, fix what slows them down, and keep the content current.",
        }
      : {
          h1: "Comece pelo que o negócio precisa",
          p1: "Um bom site começa pelo trabalho que tem de fazer: trazer os pedidos certos, responder às perguntas que as pessoas fazem e tornar o próximo passo óbvio.",
          h2: "Medir e depois melhorar",
          p2: "O lançamento é o ponto de partida. Observe o que as pessoas fazem, corrija o que as atrasa e mantenha o conteúdo atual.",
        };
  return [
    block(lead),
    block(t.h1, "h2"),
    block(t.p1),
    ...(withImage
      ? [
          {
            ...image(
              "services-hero.jpg",
              language === "en"
                ? "A designer sketching page layouts on paper"
                : "Uma designer a esboçar layouts de página em papel",
            ),
            _key: key(),
            caption:
              language === "en"
                ? "Test image from the repository"
                : "Imagem de teste do repositório",
          },
        ]
      : []),
    block(t.h2, "h2"),
    block(t.p2),
  ];
}

const authors = [
  {
    _id: "seed-author-team",
    _type: "author",
    name: "NortBrand Team",
    role: localized("Studio", "Estúdio"),
    bio: localized(
      "Notes from the NortBrand studio.",
      "Notas do estúdio NortBrand.",
    ),
    image: image(
      "approach-brand-identity.jpg",
      "The NortBrand logomark on a dark panel",
    ),
  },
  {
    _id: "seed-author-ana",
    _type: "author",
    name: "Ana Ribeiro",
    role: localized("Design lead", "Diretora de design"),
    bio: localized(
      "Designs websites for local businesses.",
      "Desenha sites para negócios locais.",
    ),
  },
  {
    _id: "seed-author-tiago",
    _type: "author",
    name: "Tiago Costa",
    role: localized("Developer", "Programador"),
    bio: localized(
      "Builds fast, accessible websites.",
      "Constrói sites rápidos e acessíveis.",
    ),
  },
];

const categoryRows: [slug: string, en: string, pt: string][] = [
  ["design", "Design", "Design"],
  ["branding", "Branding", "Marca"],
  ["development", "Development", "Desenvolvimento"],
  ["content", "Content", "Conteúdo"],
  ["growth", "Growth", "Crescimento"],
];

const categories = categoryRows.map(([slug, en, pt]) => ({
  _id: `seed-category-${slug}`,
  _type: "category",
  name: localized(en, pt),
  slug: { _type: "slug", current: slug },
}));

const covers = [
  "sea-coast.jpg",
  "services-hero.jpg",
  "approach-brand-identity.jpg",
];

type Seed = {
  n: number;
  en: { title: string; excerpt: string };
  pt?: { title: string; excerpt: string };
  category: string;
  author: string;
  date: string;
};

const seeds: Seed[] = [
  {
    n: 1,
    category: "development",
    author: "team",
    date: "2026-09-29",
    en: {
      title: "Why Your Website Should Work Like a Product, Not a Brochure",
      excerpt:
        "Most small business websites are digital brochures: static, forgettable, and disconnected from what the business actually needs.",
    },
    pt: {
      title:
        "Porque é que o seu site deve funcionar como um produto, não como uma brochura",
      excerpt:
        "A maioria dos sites de pequenas empresas são brochuras digitais: estáticas, esquecíveis e desligadas do que o negócio precisa.",
    },
  },
  {
    n: 2,
    category: "branding",
    author: "ana",
    date: "2026-09-24",
    en: {
      title: "5 Signs Your Brand Needs a Refresh",
      excerpt:
        "Some signals are obvious. Most aren't. Here's how to tell the difference before it costs you customers.",
    },
    pt: {
      title: "5 sinais de que a sua marca precisa de ser renovada",
      excerpt:
        "Alguns sinais são óbvios. A maioria não. Veja como notar a diferença antes que lhe custe clientes.",
    },
  },
  {
    n: 3,
    category: "design",
    author: "ana",
    date: "2026-09-18",
    en: {
      title: "How to Choose Colors That Actually Convert",
      excerpt:
        "Color isn't decoration: it's a decision that shapes how people act on your site.",
    },
    pt: {
      title: "Como escolher cores que realmente convertem",
      excerpt:
        "A cor não é decoração: é uma decisão que molda o que as pessoas fazem no seu site.",
    },
  },
  {
    n: 4,
    category: "development",
    author: "tiago",
    date: "2026-09-12",
    en: {
      title: "The Real Cost of a Slow Website",
      excerpt:
        "Every extra second of load time is a customer quietly deciding to leave your site.",
    },
    pt: {
      title: "O verdadeiro custo de um site lento",
      excerpt:
        "Cada segundo a mais de carregamento é um cliente a decidir, em silêncio, sair do seu site.",
    },
  },
  {
    n: 5,
    category: "content",
    author: "team",
    date: "2026-09-05",
    en: {
      title: "Content That Converts for Local Businesses",
      excerpt:
        "Clarity beats cleverness every time. Here's how to write copy that works.",
    },
    pt: {
      title: "Conteúdo que converte para negócios locais",
      excerpt:
        "A clareza vence a esperteza sempre. Veja como escrever textos que funcionam.",
    },
  },
  {
    n: 6,
    category: "growth",
    author: "team",
    date: "2026-08-28",
    en: {
      title: "Why Consistency Beats Perfection in Social Media",
      excerpt:
        "A steady, average post beats a perfect one you never actually publish.",
    },
    pt: {
      title: "Porque é que a consistência vence a perfeição nas redes sociais",
      excerpt:
        "Uma publicação regular e mediana vale mais do que uma perfeita que nunca chega a sair.",
    },
  },
  {
    n: 7,
    category: "development",
    author: "tiago",
    date: "2026-08-20",
    en: {
      title: "What Happens After Launch? A Guide to Website Maintenance",
      excerpt:
        "Launch day isn't the finish line. Here's what real upkeep looks like.",
    },
  },
  {
    n: 8,
    category: "design",
    author: "ana",
    date: "2026-08-12",
    en: {
      title: "The Anatomy of a High-Converting Landing Page",
      excerpt:
        "A small handful of elements do almost all of the conversion work.",
    },
  },
  {
    n: 9,
    category: "growth",
    author: "team",
    date: "2026-08-04",
    en: {
      title: "SEO Basics Every Local Business Should Know",
      excerpt:
        "You don't need to be an expert. You just need to be consistent.",
    },
  },
  {
    n: 10,
    category: "content",
    author: "ana",
    date: "2026-07-27",
    en: {
      title:
        "A Deliberately Long Test Title That Checks How Cards, Headings and the Table of Contents Wrap Across Every Breakpoint",
      excerpt:
        "Test content: a long title and excerpt to check wrapping, line clamps and overflow at 390 px in both languages, which should never scroll sideways.",
    },
  },
];

/** One Portuguese post with no English version. */
const ptOnly = {
  n: 11,
  category: "branding",
  author: "team",
  date: "2026-10-02",
  title: "Uma marca pensada para o mercado local",
  excerpt:
    "Teste: um artigo que só existe em português, para o seletor de idioma voltar à lista do blog.",
};

function post(
  id: string,
  language: "en" | "pt",
  seed: { n: number; category: string; author: string; date: string },
  copy: { title: string; excerpt: string },
) {
  const slug = copy.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
  return {
    _id: id,
    _type: "post",
    language,
    title: copy.title,
    slug: { _type: "slug", current: slug },
    excerpt: copy.excerpt,
    cover: image(
      covers[seed.n % covers.length] ?? "sea-coast.jpg",
      language === "en"
        ? `Cover image for “${copy.title}”`
        : `Imagem de capa de “${copy.title}”`,
    ),
    category: { _type: "reference", _ref: `seed-category-${seed.category}` },
    author: { _type: "reference", _ref: `seed-author-${seed.author}` },
    publishedAt: `${seed.date}T09:00:00.000Z`,
    body: body(copy.excerpt, language, seed.n === 1),
  };
}

const posts: object[] = [];
const metadata: object[] = [];
for (const seed of seeds) {
  const enId = `seed-post-${seed.n}-en`;
  posts.push(post(enId, "en", seed, seed.en));
  if (seed.pt) {
    const ptId = `seed-post-${seed.n}-pt`;
    posts.push(post(ptId, "pt", seed, seed.pt));
    // The link @sanity/document-internationalization reads (its own document type).
    metadata.push({
      _id: `seed-translation-${seed.n}`,
      _type: "translation.metadata",
      schemaTypes: ["post"],
      translations: [
        {
          _key: key(),
          _type: "internationalizedArrayReferenceValue",
          language: "en",
          value: { _type: "reference", _ref: enId, _weak: true },
        },
        {
          _key: key(),
          _type: "internationalizedArrayReferenceValue",
          language: "pt",
          value: { _type: "reference", _ref: ptId, _weak: true },
        },
      ],
    });
  }
}
posts.push(post("seed-post-11-pt", "pt", ptOnly, ptOnly));

const documents = [...authors, ...categories, ...posts, ...metadata];
const file = join(
  mkdtempSync(join(tmpdir(), "nortbrand-seed-")),
  "seed.ndjson",
);
writeFileSync(
  file,
  documents.map((doc) => JSON.stringify(doc)).join("\n") + "\n",
);
console.log(`Seeding ${documents.length} documents into "${DATASET}"…`);

const result = spawnSync(
  process.execPath,
  [
    join(root, "node_modules/sanity/bin/sanity"),
    "dataset",
    "import",
    file,
    DATASET,
    "--replace",
  ],
  { cwd: root, stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
