/**
 * The Sources box under an answer.
 *
 * Built from the answer text by the same citation canonicalisation the client
 * applies when rendering (lib/citations.ts), so the numbers in the box always
 * match the numbers in the text. Uncited sources never appear. A citation is
 * marked verified when the sentence it supports is found in the text the
 * agent actually retrieved for that source.
 */
import {
  claimSupported,
  hostnameOf,
  normUrl,
  quoteAppearsIn,
  rewriteCitations,
} from "@/lib/citations";
import type { UISource } from "@/types/data";

export interface SourceCollector {
  sources: UISource[];
  contentByUrl: Map<string, string>;
  collect: (s: UISource, content?: string) => void;
}

/** A request-scoped collector the tools push retrieved sources into. */
export function createSourceCollector(): SourceCollector {
  const sources: UISource[] = [];
  const seen = new Set<string>();
  const contentByUrl = new Map<string, string>();
  return {
    sources,
    contentByUrl,
    collect(s, content) {
      const key = s.url ? s.url.toLowerCase() : `${s.kind}|${s.title}`;
      if (content && s.url) {
        const n = normUrl(s.url);
        contentByUrl.set(n, (contentByUrl.get(n) || "") + "\n" + content);
      }
      if (seen.has(key)) return;
      seen.add(key);
      sources.push(s);
    },
  };
}

export function buildSourcesBox(
  answerText: string,
  collector: SourceCollector,
  priorSourcesByUrl: Map<string, UISource> = new Map()
): UISource[] {
  const { orderedUrls, citations } = rewriteCitations(answerText);
  if (orderedUrls.length === 0 && collector.sources.length > 0) {
    console.warn(`CITATIONS: model cited no URLs (${collector.sources.length} sources retrieved)`);
  }
  const byUrl = new Map<string, UISource>();
  for (const s of collector.sources) if (s.url) byUrl.set(normUrl(s.url), s);

  const isVerified = (url: string, quotes: string[], claims: string[]): boolean | undefined => {
    const content = collector.contentByUrl.get(normUrl(url));
    if (!content) return undefined;
    if (quotes.some((q) => quoteAppearsIn(q, content))) return true;
    if (claims.some((c) => claimSupported(c, content))) return true;
    return quotes.length > 0 || claims.length > 0 ? false : undefined;
  };

  const box: UISource[] = citations.map(({ url, quotes, claims }, i) => {
    const source = byUrl.get(normUrl(url));
    if (source) return { ...source, number: i + 1, verified: isVerified(url, quotes, claims) };
    const prior = priorSourcesByUrl.get(normUrl(url));
    if (prior) {
      return { kind: prior.kind, title: prior.title, url: prior.url, site: prior.site, number: i + 1 };
    }
    if (url.startsWith("kb:")) {
      return { kind: "kb" as const, title: url.slice(3).replace(/-/g, " "), url: "", site: "Library", number: i + 1 };
    }
    return { kind: "web" as const, title: hostnameOf(url) || url, url, site: "", number: i + 1 };
  });

  // Sources linked as plain markdown links rather than numbered citations are still used sources.
  const numbered = new Set(orderedUrls.map((u) => normUrl(u)));
  const lower = answerText.toLowerCase();
  for (const s of collector.sources) {
    if (!s.url) continue;
    const n = normUrl(s.url);
    if (numbered.has(n)) continue;
    if (lower.includes(n)) {
      box.push({ ...s, number: box.length + 1 });
      numbered.add(n);
    }
  }
  return box;
}
