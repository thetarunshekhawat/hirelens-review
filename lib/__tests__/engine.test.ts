import { describe, it, expect } from "vitest";
import { SIGNALS } from "@/lib/case/signals";
import type { SignalFacts } from "@/lib/case/types";
import {
  outcomeCounts,
  removedWeightShare,
  reviewAllSignals,
  reviewSignal,
  reviewSignalById,
  runChecks,
} from "@/lib/review/engine";

const BASE: SignalFacts = {
  jobLink: "direct",
  jobLinkReason: "r",
  proxies: [],
  identityRisk: "low",
  identityReason: "r",
  source: "self",
  audience: "professional",
  sourceReason: "r",
  coverage: "even",
  coverageReason: "r",
  alternative: null,
  alternativeEquivalent: false,
  legalQuestion: null,
};

function outcomeOf(f: Partial<SignalFacts>) {
  return reviewSignal({
    id: "T",
    name: "test",
    vendorClaim: "",
    feeds: "reliability",
    direction: -1,
    weight: 1,
    facts: { ...BASE, ...f },
    evidence: [],
  });
}

describe("the case-file outcomes", () => {
  // These are the review's published results. A change to a fact or a rule
  // that moves any of them must be deliberate, so they are pinned here.
  const expected: Record<string, string> = {
    S01: "remove",
    S02: "restrict",
    S03: "restrict",
    S04: "human",
    S05: "remove",
    S06: "remove",
    S07: "remove",
    S08: "remove",
    S09: "remove",
    S10: "remove",
    S11: "remove",
    S12: "remove",
    S13: "keep",
  };
  for (const [id, outcome] of Object.entries(expected)) {
    it(`${id} → ${outcome}`, () => {
      expect(reviewSignalById(id)?.outcome).toBe(outcome);
    });
  }

  it("covers every signal", () => {
    expect(Object.keys(expected).sort()).toEqual(SIGNALS.map((s) => s.id).sort());
  });

  it("counts outcomes", () => {
    expect(outcomeCounts()).toEqual({ keep: 1, restrict: 2, remove: 9, human: 1 });
  });

  it("removed signals carry most of the vendor's weight", () => {
    expect(removedWeightShare()).toBeGreaterThan(0.5);
  });

  it("is deterministic", () => {
    const a = JSON.stringify(reviewAllSignals().map((r) => [r.signal.id, r.outcome, r.rule.id]));
    const b = JSON.stringify(SIGNALS.map((s) => reviewSignal(s)).map((r) => [r.signal.id, r.outcome, r.rule.id]));
    expect(a).toBe(b);
  });
});

describe("the six checks", () => {
  it("returns six results in method order", () => {
    expect(runChecks(BASE).map((c) => c.check)).toEqual([
      "job_relevance",
      "proxy",
      "identity",
      "source_expectation",
      "coverage",
      "less_intrusive",
    ]);
  });

  it("a weak proxy is a concern, a strong one a failure", () => {
    const weak = runChecks({ ...BASE, proxies: [{ trait: "age", strength: "weak", basis: "" }] })[1];
    const strong = runChecks({ ...BASE, proxies: [{ trait: "gender", strength: "strong", basis: "" }] })[1];
    expect(weak.status).toBe("concern");
    expect(strong.status).toBe("fail");
  });

  it("content posted by others fails the source check", () => {
    expect(runChecks({ ...BASE, source: "third_party" })[3].status).toBe("fail");
    expect(runChecks({ ...BASE, source: "mixed" })[3].status).toBe("fail");
    expect(runChecks({ ...BASE, audience: "social" })[3].status).toBe("concern");
  });
});

describe("the outcome rules", () => {
  it("R1: a direct proxy removes the signal even if it is job-related", () => {
    const r = outcomeOf({ proxies: [{ trait: "religion", strength: "direct", basis: "" }] });
    expect(r.outcome).toBe("remove");
    expect(r.rule.id).toBe("R1");
  });

  it("R2: no job link removes the signal", () => {
    expect(outcomeOf({ jobLink: "none" }).rule.id).toBe("R2");
  });

  it("R1 takes precedence over a legal question", () => {
    const r = outcomeOf({ legalQuestion: "?", proxies: [{ trait: "gender", strength: "strong", basis: "" }] });
    expect(r.rule.id).toBe("R1");
  });

  it("R3: an open legal question sends it to a human", () => {
    expect(outcomeOf({ legalQuestion: "Is this lawful?" }).outcome).toBe("human");
  });

  it("R4: an equivalent less intrusive method restricts it", () => {
    const r = outcomeOf({ alternative: "Ask the candidate", alternativeEquivalent: true });
    expect(r.rule.id).toBe("R4");
    expect(r.conditions[0]).toContain("Ask the candidate");
  });

  it("R5: wrong-person risk restricts it", () => {
    expect(outcomeOf({ identityRisk: "high" }).rule.id).toBe("R5");
  });

  it("R6: three concerns restrict it", () => {
    const r = outcomeOf({ jobLink: "indirect", identityRisk: "medium", coverage: "uneven" });
    expect(r.rule.id).toBe("R6");
  });

  it("R7: a clean signal is kept, with a notice condition", () => {
    const r = outcomeOf({});
    expect(r.outcome).toBe("keep");
    expect(r.conditions.some((c) => /notice/i.test(c))).toBe(true);
  });

  it("removed signals carry no conditions", () => {
    expect(outcomeOf({ jobLink: "none" }).conditions).toEqual([]);
  });
});
