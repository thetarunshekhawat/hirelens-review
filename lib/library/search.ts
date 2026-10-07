/**
 * Keyword search over the evidence library.
 *
 * The library is small and curated, so a transparent scorer beats a vector
 * index: every result can be explained by the words it matched, the same query
 * always returns the same ranking, and nothing needs an external service.
 * Field weights favour titles and tags, where an entry says what it is about.
 */
import { LIBRARY, type LibraryEntry } from "./entries";

const STOP = new Set(
  "a an and are as at be by can do does for from has have how i if in is it its of on or our should that the their them this to was we what when where which who why will with would about into than then there these they you your use using used".split(
    " "
  )
);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Light stemming so "tagged"/"tags" and "women"/"woman" meet. */
function stem(t: string): string {
  if (t === "women") return "woman";
  if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith("ed")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

const FIELDS: Array<[keyof LibraryEntry, number]> = [
  ["title", 3],
  ["tags", 3],
  ["summary", 1.5],
  ["keyPoints", 1],
  ["caveat", 0.5],
  ["citation", 1],
  ["jurisdiction", 0.5],
];

function fieldText(e: LibraryEntry, f: keyof LibraryEntry): string {
  const v = e[f];
  return Array.isArray(v) ? v.join(" ") : String(v ?? "");
}

export interface SearchHit {
  entry: LibraryEntry;
  score: number;
}

export function searchLibrary(query: string, limit = 5): SearchHit[] {
  const q = [...new Set(tokenize(query).map(stem))];
  if (q.length === 0) return [];

  const hits = LIBRARY.map((entry) => {
    let s = 0;
    for (const [f, w] of FIELDS) {
      const words = new Set(tokenize(fieldText(entry, f)).map(stem));
      for (const t of q) if (words.has(t)) s += w;
    }
    // Section numbers ("s.7", "section 8") are strong signals when asked for.
    const sec = query.match(/\b(?:s\.?|section)\s*(\d+)/i);
    if (sec && new RegExp(`\\b(s\\.?|section)\\s*${sec[1]}\\b`, "i").test(entry.citation + " " + entry.title)) s += 6;
    // Indian law first among equals: it is the governing law.
    if (s > 0 && entry.authority === "binding") s += 0.5;
    return { entry, score: s };
  })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));

  return hits.slice(0, limit);
}
