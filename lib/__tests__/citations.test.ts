import { describe, it, expect } from "vitest";
import {
  normUrl,
  rewriteCitations,
  rewriteCitationsInParts,
  hostnameOf,
  kbKey,
  quoteAppearsIn,
  claimSupported,
} from "@/lib/citations";

describe("normUrl", () => {
  it("lowercases and strips trailing slashes", () => {
    expect(normUrl("https://Example.com/Path/")).toBe("https://example.com/path");
    expect(normUrl("https://example.com///")).toBe("https://example.com");
    expect(normUrl("https://example.com/a")).toBe("https://example.com/a");
  });
});

describe("rewriteCitations", () => {
  it("renumbers sequentially by first appearance, ignoring the model's numbers", () => {
    const input =
      "A [[3]](https://a.com/x). B [[7]](https://b.com/y). A again [[3]](https://a.com/x).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe(
      "A [[1]](https://a.com/x). B [[2]](https://b.com/y). A again [[1]](https://a.com/x)."
    );
    expect(orderedUrls).toEqual(["https://a.com/x", "https://b.com/y"]);
  });

  it("gives the same number to case/slash variants of the same URL", () => {
    const input =
      "One [[1]](https://Example.com/Page/). Two [[2]](https://example.com/page).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe(
      "One [[1]](https://Example.com/Page/). Two [[1]](https://example.com/page)."
    );
    expect(orderedUrls).toEqual(["https://Example.com/Page/"]);
  });

  it("strips bare [[N]] citations without a link, swallowing one space", () => {
    const input = "[[2]] The vendor's claim is untested [[5]] and broad.";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe("The vendor's claim is untested and broad.");
    expect(orderedUrls).toEqual([]);
  });

  it("leaves no stray space before punctuation when stripping debris", () => {
    const input =
      "Signal S04 is held [[2]] , pending advice. Weight (8 points, 13 signals) [[4]] .";
    const { text } = rewriteCitations(input);
    expect(text).toBe(
      "Signal S04 is held, pending advice. Weight (8 points, 13 signals)."
    );
  });

  it("collapses placeholder citations before punctuation cleanly", () => {
    const input = "The tool scored her [[3]](no URL available) .";
    const { text } = rewriteCitations(input);
    expect(text).toBe("The tool scored her.");
  });

  it("strips malformed citations with placeholder link targets", () => {
    const input =
      "Scored her low. [[1]](no URL available) It flagged two posts. [[3]](no URL available)";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe("Scored her low. It flagged two posts. ");
    expect(orderedUrls).toEqual([]);
  });

  it("keeps valid citations while stripping placeholder-target ones", () => {
    const input =
      "Real [[2]](https://a.com) and fake [[1]](no URL available) here.";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe("Real [[1]](https://a.com) and fake here.");
    expect(orderedUrls).toEqual(["https://a.com"]);
  });

  it("keeps valid citations while stripping bare ones", () => {
    const input = "Real [[9]](https://a.com) but debris [[4]] here.";
    const { text } = rewriteCitations(input);
    expect(text).toBe("Real [[1]](https://a.com) but debris here.");
  });

  it("preserves original URL casing (URLs can be case-sensitive)", () => {
    const input = "See [[1]](https://example.org/Reports/CaseId42).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toContain("https://example.org/Reports/CaseId42");
    expect(orderedUrls[0]).toBe(
      "https://example.org/Reports/CaseId42"
    );
  });

  it("does not renumber non-http(s) schemes and never lists them", () => {
    const input = "Bad [[1]](javascript:alert(1)). Good [[2]](https://a.com).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(orderedUrls).toEqual(["https://a.com"]);
    expect(text).toContain("[[1]](https://a.com)");
  });

  it("accepts single-bracket citation drift [N](url) and canonicalizes it", () => {
    const input = "Finding [2](https://b.com/x) and [7](https://a.com/y).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe(
      "Finding [[1]](https://b.com/x) and [[2]](https://a.com/y)."
    );
    expect(orderedUrls).toEqual(["https://b.com/x", "https://a.com/y"]);
  });

  it("accepts a space between [[N]] and the URL parens", () => {
    const input = "Claim [[3]] (https://a.com).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe("Claim [[1]](https://a.com).");
    expect(orderedUrls).toEqual(["https://a.com"]);
  });

  it("leaves plain markdown links and images untouched", () => {
    const input =
      "Plain [link text](https://a.com) and image ![1](https://img.example.com/f.png).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe(input);
    expect(orderedUrls).toEqual([]);
  });

  it("returns text unchanged when there are no citations", () => {
    const input = "No citations here.";
    expect(rewriteCitations(input)).toEqual({
      text: input,
      orderedUrls: [],
      citations: [],
    });
  });
});

describe("citation quotes (verification support)", () => {
  it("captures quotes and strips them from the displayed text", () => {
    const input =
      'Claim one [[1]](https://a.com "exact words from source"). Claim two [[2]](https://b.com "other words").';
    const { text, citations } = rewriteCitations(input);
    expect(text).toBe(
      "Claim one [[1]](https://a.com). Claim two [[2]](https://b.com)."
    );
    expect(citations).toEqual([
      { url: "https://a.com", quotes: ["exact words from source"], claims: [] },
      { url: "https://b.com", quotes: ["other words"], claims: [] },
    ]);
  });

  it("gathers multiple quotes for repeat citations of one source", () => {
    const input =
      'A [[1]](https://a.com "first quote"). B [[1]](https://a.com "second quote").';
    const { citations } = rewriteCitations(input);
    expect(citations).toEqual([
      { url: "https://a.com", quotes: ["first quote", "second quote"], claims: [] },
    ]);
  });

  it("captures quotes on kb: citations and renders them unlinked", () => {
    const input = 'KB fact [[2]](kb:Signal-List "absence counts as risk").';
    const { text, citations } = rewriteCitations(input);
    expect(text).toBe("KB fact [1].");
    expect(citations).toEqual([
      { url: "kb:Signal-List", quotes: ["absence counts as risk"], claims: [] },
    ]);
  });

  it("citations without quotes still parse, with empty quote lists", () => {
    const input = "Old style [[1]](https://a.com).";
    const { citations } = rewriteCitations(input);
    expect(citations).toEqual([{ url: "https://a.com", quotes: [], claims: [] }]);
  });

  it("parses comma-separated multi-quote drift (the leaked-citation case)", () => {
    const input =
      'Described as [[1]](kb:Vendor-Brochure-2027 "fast", "accurate", "objective") in sales material.';
    const { text, citations } = rewriteCitations(input);
    expect(text).toBe("Described as [1] in sales material.");
    expect(citations).toEqual([
      {
        url: "kb:Vendor-Brochure-2027",
        quotes: ["fast", "accurate", "objective"],
        claims: [],
      },
    ]);
  });

  it("tolerates stray extra brackets around the citation number", () => {
    const input =
      'A [[[2]]](https://a.com "quote one"). B [[3]]](kb:Brochure "quote two").';
    const { text, citations } = rewriteCitations(input);
    expect(text).toBe("A [[1]](https://a.com). B [2].");
    expect(citations).toEqual([
      { url: "https://a.com", quotes: ["quote one"], claims: [] },
      { url: "kb:Brochure", quotes: ["quote two"], claims: [] },
    ]);
  });

  it("surfaces the quote as visible text when a citation is the payload after a colon", () => {
    const input =
      'The candidate concluded: [[1]](kb:Candidate-Survey "overall a fair process") And moved on.';
    const { text, citations } = rewriteCitations(input);
    expect(text).toBe(
      'The candidate concluded: "overall a fair process" [1] And moved on.'
    );
    expect(citations[0].quotes).toEqual(["overall a fair process"]);
  });

  it("colon-payload restoration also works for web citations", () => {
    const input = 'It states: [[1]](https://a.com "the exact finding") clearly.';
    const { text } = rewriteCitations(input);
    expect(text).toBe('It states: "the exact finding" [[1]](https://a.com) clearly.');
  });

  it("does not surface quotes for mid-sentence citations", () => {
    const input = 'Flagged for [[1]](kb:Report "late night posts") her hours.';
    const { text } = rewriteCitations(input);
    expect(text).toBe("Flagged for [1] her hours.");
  });

  it("parses a quote glued to the URL without a space", () => {
    const input = 'Fact [[1]](https://a.com"tight quote").';
    const { text, citations } = rewriteCitations(input);
    expect(text).toBe("Fact [[1]](https://a.com).");
    expect(citations).toEqual([{ url: "https://a.com", quotes: ["tight quote"], claims: [] }]);
  });
});

describe("claim capture and verification", () => {
  it("captures the sentence preceding a citation as its claim", () => {
    const input =
      "The vendor reported strong accuracy for predicting joining at campus level [[1]](kb:Vendor-Brochure). Short [[2]](https://a.com).";
    const { citations } = rewriteCitations(input);
    expect(citations[0].claims).toEqual([
      "The vendor reported strong accuracy for predicting joining at campus level",
    ]);
    // "Short" is below the minimum claim length — nothing captured.
    expect(citations[1].claims).toEqual([]);
  });

  it("claimSupported accepts a claim whose significant words are in the source", () => {
    const source =
      "Brochure: strong accuracy predicting joining, measured at campus level in 2025; the vendor reported results.";
    expect(
      claimSupported(
        "The vendor reported strong accuracy for predicting joining at campus level",
        source
      )
    ).toBe(true);
  });

  it("claimSupported rejects a claim about facts the source lacks", () => {
    expect(
      claimSupported(
        "The vendor published an independent bias audit of selection rates by gender",
        "The brochure lists thirteen signals and the platforms the tool reads."
      )
    ).toBe(false);
  });
});

describe("quoteAppearsIn", () => {
  it("matches verbatim quotes despite markdown, case, and whitespace noise", () => {
    const source =
      "The Act exempts **personal data made public** by\nthe Data Principal — a narrow exemption.";
    expect(
      quoteAppearsIn("exempts personal data made public by the Data Principal", source)
    ).toBe(true);
  });

  it("tolerates punctuation drift (D.P.D.P. vs DPDP)", () => {
    expect(
      quoteAppearsIn(
        "S.3(c)(ii) of the D.P.D.P. Act exempts public data",
        "S3(c)(ii) of the DPDP Act exempts public data (2023)"
      )
    ).toBe(true);
  });

  it("tolerates light paraphrase via word containment", () => {
    const source =
      "Reviewers consistently found the signal unrelated to job performance and unevenly applied across groups.";
    expect(
      quoteAppearsIn("consistently found unrelated to job performance", source)
    ).toBe(true);
  });

  it("rejects quotes about facts the source does not contain", () => {
    expect(
      quoteAppearsIn(
        "vendor supplied a validation study",
        "Documents received as of January 2027: brochure and sample reports only."
      )
    ).toBe(false);
  });

  it("rejects trivially short quotes", () => {
    expect(quoteAppearsIn("a", "a long source text")).toBe(false);
  });
});

describe("kb: citation targets (URL-less knowledge-base sources)", () => {
  it("kbKey slugifies source names", () => {
    expect(kbKey("Vendor Brochure (Jan 2027)")).toBe(
      "kb:Vendor-Brochure-Jan-2027"
    );
    expect(kbKey("  Signal List  ")).toBe("kb:Signal-List");
  });

  it("renders kb citations as unlinked [N] markers, sharing the numbering", () => {
    const input =
      "Web fact [[1]](https://a.com). KB fact [[2]](kb:Signal-List). Web again [[5]](https://a.com).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe(
      "Web fact [[1]](https://a.com). KB fact [2]. Web again [[1]](https://a.com)."
    );
    expect(orderedUrls).toEqual(["https://a.com", "kb:Signal-List"]);
  });

  it("reuses the same number for repeat kb citations", () => {
    const input = "First [[3]](kb:Brochure). Later again [[7]](kb:Brochure).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe("First [1]. Later again [1].");
    expect(orderedUrls).toEqual(["kb:Brochure"]);
  });

  it("still strips placeholder targets but keeps kb targets", () => {
    const input =
      "Good [[1]](kb:Candidate-Survey) but bad [[2]](no URL available).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe("Good [1] but bad.");
    expect(orderedUrls).toEqual(["kb:Candidate-Survey"]);
  });
});

describe("wiki-style phrase brackets", () => {
  it("unwraps [[phrase]] without a target to plain text", () => {
    const input = "The note on [[Signal Weights]] [[4]](kb:Weights-Table), Table 3.";
    const { text } = rewriteCitations(input);
    expect(text).toBe("The note on Signal Weights [1], Table 3.");
  });

  it("converts [[phrase]](http url) to a normal markdown link", () => {
    const input = "See the [[DPDP Act text]](https://example.org/dpdp-act).";
    const { text, orderedUrls } = rewriteCitations(input);
    expect(text).toBe("See the [DPDP Act text](https://example.org/dpdp-act).");
    expect(orderedUrls).toEqual([]);
  });

  it("unwraps [[phrase]](kb target) to the plain phrase", () => {
    const input = "Discussed in [[the signal list]](kb:Signal-List).";
    const { text } = rewriteCitations(input);
    expect(text).toBe("Discussed in the signal list.");
  });

  it("leaves numeric citations untouched by the unwrap", () => {
    const input = "Claim [[2]](https://a.com) stands.";
    const { text } = rewriteCitations(input);
    expect(text).toBe("Claim [[1]](https://a.com) stands.");
  });
});

describe("broken list marker repair", () => {
  it("rejoins a numbered marker left alone on its line with its content", () => {
    const input = "Phases: [[1]](https://a.com)\n\n1.\n**Input Preparation** — build the matrix.\n2.\n**Identification** — cluster.";
    const { text } = rewriteCitations(input);
    expect(text).toContain("1. **Input Preparation** — build the matrix.");
    expect(text).toContain("2. **Identification** — cluster.");
  });

  it("rejoins a bullet marker left alone on its line", () => {
    const input = "-\nFirst point\n-\nSecond point";
    const { text } = rewriteCitations(input);
    expect(text).toBe("- First point\n- Second point");
  });

  it("repairs a marker orphaned by citation-debris stripping", () => {
    const input = "1. [[2]] \n**Input Preparation** — details.";
    const { text } = rewriteCitations(input);
    expect(text).toBe("1. **Input Preparation** — details.");
  });

  it("does not join a marker with a following list marker or heading", () => {
    const input = "1.\n2. Real item\n\n-\n# Heading";
    const { text } = rewriteCitations(input);
    expect(text).toContain("1.\n2. Real item");
    expect(text).toContain("-\n# Heading");
  });

  it("leaves normal lists untouched", () => {
    const input = "1. First item\n2. Second item\n- Bullet one\n- Bullet two";
    const { text } = rewriteCitations(input);
    expect(text).toBe(input);
  });

  it("joins across the marker line even when content starts with bold", () => {
    const input = "3.\n**Transformation** of memberships.";
    const { text } = rewriteCitations(input);
    expect(text).toBe("3. **Transformation** of memberships.");
  });

  it("joins across blank lines that contain whitespace", () => {
    const input = "1. \n \n**Input Preparation** — details.";
    const { text } = rewriteCitations(input);
    expect(text).toBe("1. **Input Preparation** — details.");
  });

  it("handles CRLF line endings", () => {
    const input = "1.\r\n**Input Preparation** — details.";
    const { text } = rewriteCitations(input);
    expect(text).toBe("1. **Input Preparation** — details.");
  });

  it("repairs unicode bullet markers", () => {
    const input = "•\nFirst point\n•\nSecond point";
    const { text } = rewriteCitations(input);
    expect(text).toBe("• First point\n• Second point");
  });
});

describe("rewriteCitationsInParts", () => {
  it("continues numbering across text parts (matches the server's joined pass)", () => {
    const parts = [
      "First finding [[5]](https://a.com).",
      "Later [[1]](https://b.com) and again [[9]](https://a.com).",
    ];
    const rewritten = rewriteCitationsInParts(parts);
    expect(rewritten[0]).toBe("First finding [[1]](https://a.com).");
    expect(rewritten[1]).toBe(
      "Later [[2]](https://b.com) and again [[1]](https://a.com)."
    );
    // Server-side equivalent on the joined text yields the same mapping
    const { orderedUrls } = rewriteCitations(parts.join("\n"));
    expect(orderedUrls).toEqual(["https://a.com", "https://b.com"]);
  });
});

describe("hostnameOf", () => {
  it("extracts hostname without www, empty for junk", () => {
    expect(hostnameOf("https://www.example.org/reports/case-42/")).toBe("example.org");
    expect(hostnameOf("https://orcid.org/0000-0000-0000-0001")).toBe("orcid.org");
    expect(hostnameOf("not a url")).toBe("");
  });
});
