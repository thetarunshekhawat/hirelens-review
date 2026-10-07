import type { Metadata } from "next";
import { AskButton } from "@/components/agent/ask-button";
import { FairnessLab } from "@/components/review/fairness-lab";
import { Callout, PageHeader } from "@/components/review/ui";
import { runFairnessTest } from "@/lib/review/fairness";
import { POOL_SIZE } from "@/lib/review/pool";
import { VENDOR_CONFIG } from "@/lib/review/scoring";

export const metadata: Metadata = { title: "Fairness test" };

const ASSUMPTIONS = [
  "The aptitude test is equally distributed across every group. This is built in, so any gap comes from the vendor's signals, not from chance. Kestrel's aptitude test itself was not audited.",
  "Women more often keep accounts private, so less of their content is visible and the no-social-media penalty reaches them more often.",
  "The language people post in follows their home region; English posting is more common at tier-1 colleges.",
  "Network overlap with employees, follower reach and professional portfolios are higher at tier-1 colleges.",
  "The vendor's culture-fit model scores minority-faith festival content as dissimilar, and its attrition model applies the engagement-post penalty to women.",
];

export default function FairnessPage() {
  const vendor = runFairnessTest(VENDOR_CONFIG);
  const gender = vendor.attributes.find((a) => a.attribute === "gender")!;

  return (
    <div>
      <PageHeader
        eyebrow="Agent workspace · Fairness test"
        title="Who gets shortlisted, by group"
        lede={`The vendor's scoring rules are applied to ${POOL_SIZE.toLocaleString("en-IN")} synthetic applicants and the top half are shortlisted. Selection rates are then compared across groups. A group selected at less than 0.80 times the rate of the best group is flagged. That line is the US "four-fifths" rule of thumb, used here as a reference standard; India has no statutory equivalent.`}
      >
        <div className="mt-4">
          <AskButton question="Explain what the fairness test shows, what the impact ratio means, and what the test cannot tell us.">
            Ask the agent to explain this test
          </AskButton>
        </div>
      </PageHeader>

      <FairnessLab />

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Callout tone="restrict" title="A pass is not proof of fairness">
          Under the vendor configuration, gender&rsquo;s lowest ratio is {gender.worstRatio.toFixed(2)}, above the line. Yet
          signal S11 penalises women&rsquo;s engagement posts directly. Women&rsquo;s private accounts hide some negative signals,
          which offsets that penalty on average, so the group test passes while individual women, like Priya in the
          sample, are marked down for their marital plans. A group-level test can miss direct discrimination.
        </Callout>
        <Callout tone="brand" title="What this test cannot show">
          Whether the tool predicts who joins or stays. That needs real outcome data, and the vendor has provided no
          validation study. The pool is synthetic and the result depends on the assumptions below. It shows what the
          scoring rules do to a realistic mix of applicants, not what happened to real people.
        </Callout>
      </div>

      <section className="mt-8 hl-card hl-card--pad">
        <h2 className="hl-h3 mb-3">Modelling assumptions</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[13.5px] leading-relaxed">
          {ASSUMPTIONS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ol>
        <p className="mt-3 text-[12.5px] text-subtle">
          The pool is generated from a fixed seed, so it is identical in the browser, on the server and in the
          automated tests.
        </p>
      </section>
    </div>
  );
}
