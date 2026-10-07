import { describe, it, expect } from "vitest";
import { CANDIDATE_BY_ID } from "@/lib/case/candidates";
import { checkIdentity, reviewAllCandidates, reviewCandidateById } from "@/lib/review/candidates";
import { runFairnessTest, IMPACT_RATIO_THRESHOLD } from "@/lib/review/fairness";
import { applicantPool, POOL_SIZE } from "@/lib/review/pool";
import { REVIEWED_CONFIG, VENDOR_CONFIG, reviewedConfigIsConsistent, score } from "@/lib/review/scoring";

describe("scoring", () => {
  it("adds and subtracts signal points from aptitude", () => {
    // S01 is −8 at full intensity, S13 is +12.
    expect(score(60, { S01: 1, S13: 0.5 }, new Set(["S01", "S13"]))).toBe(58);
  });

  it("ignores disabled signals", () => {
    expect(score(60, { S01: 1 }, new Set())).toBe(60);
  });

  it("clamps intensity to 0–1", () => {
    expect(score(60, { S01: 3 }, new Set(["S01"]))).toBe(52);
  });

  it("the reviewed configuration keeps no non-kept signal", () => {
    expect(reviewedConfigIsConsistent()).toBe(true);
  });
});

describe("candidate reviews", () => {
  it("the tool pushes eight candidates below the line and lifts one above it", () => {
    const all = reviewAllCandidates();
    const pushedDown = all.filter((r) => !r.vendor.shortlisted && r.reviewed.shortlisted);
    const liftedUp = all.filter((r) => r.vendor.shortlisted && !r.reviewed.shortlisted);
    expect(pushedDown.map((r) => r.candidate.id).sort()).toEqual(
      ["arjun", "dev", "fatima", "kavya", "meera", "priya", "rahul", "sandeep"].sort()
    );
    expect(liftedUp.map((r) => r.candidate.id)).toEqual(["aditya"]);
  });

  it("detects the wrong-person match", () => {
    const id = checkIdentity(CANDIDATE_BY_ID.rahul);
    expect(id.status).toBe("mismatch");
    expect(id.matched).toBe(0);
  });

  it("accepts a profile the candidate linked", () => {
    expect(checkIdentity(CANDIDATE_BY_ID.meera).status).toBe("verified");
  });

  it("flags content posted by someone else", () => {
    expect(reviewCandidateById("dev")!.findings.some((f) => f.kind === "tagged")).toBe(true);
    expect(reviewCandidateById("priya")!.findings.some((f) => f.kind === "tagged")).toBe(true);
  });

  it("flags posts misread by an English-only model", () => {
    expect(reviewCandidateById("arjun")!.findings.some((f) => f.kind === "language")).toBe(true);
  });

  it("flags the absence penalty", () => {
    expect(reviewCandidateById("kavya")!.findings.some((f) => f.kind === "absence")).toBe(true);
  });

  it("routes the restricted signal to a person for Sandeep", () => {
    expect(reviewCandidateById("sandeep")!.followUps.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown id", () => {
    expect(reviewCandidateById("nobody")).toBeNull();
  });
});

describe("fairness test", () => {
  it("builds the same pool every time", () => {
    const a = applicantPool();
    expect(a).toHaveLength(POOL_SIZE);
    expect(a[0].id).toBe("A0001");
    expect(JSON.stringify(runFairnessTest(VENDOR_CONFIG))).toBe(JSON.stringify(runFairnessTest(VENDOR_CONFIG)));
  });

  it("shortlists half the pool", () => {
    expect(runFairnessTest(VENDOR_CONFIG).shortlisted).toBe(POOL_SIZE / 2);
  });

  it("the vendor configuration falls below the line on tier, language, religion and presence", () => {
    const r = runFairnessTest(VENDOR_CONFIG);
    expect(r.flaggedAttributes).toEqual(
      expect.arrayContaining(["College tier", "Language of posts", "Religion (synthetic label)", "Social media presence"])
    );
  });

  it("gender passes at group level despite the direct penalty in S11", () => {
    const g = runFairnessTest(VENDOR_CONFIG).attributes.find((a) => a.attribute === "gender")!;
    expect(g.worstRatio).toBeGreaterThanOrEqual(IMPACT_RATIO_THRESHOLD);
    expect(g.worstRatio).toBeLessThan(0.95);
  });

  it("the reviewed configuration clears every flag", () => {
    expect(runFairnessTest(REVIEWED_CONFIG).flaggedAttributes).toEqual([]);
  });

  it("removing only the absence penalty lifts the no-social-media group", () => {
    const before = runFairnessTest(VENDOR_CONFIG).attributes.find((a) => a.attribute === "presence")!;
    const after = runFairnessTest(new Set([...VENDOR_CONFIG].filter((s) => s !== "S12"))).attributes.find(
      (a) => a.attribute === "presence"
    )!;
    const none = (x: typeof before) => x.groups.find((g) => g.group === "None")!.rate;
    expect(none(after)).toBeGreaterThan(none(before));
  });

  it("does not judge groups below the minimum size", () => {
    const tiny = applicantPool().slice(0, 30);
    const r = runFairnessTest(VENDOR_CONFIG, tiny);
    for (const a of r.attributes) for (const g of a.groups) if (g.n < 15) expect(g.flagged).toBe(false);
  });
});
