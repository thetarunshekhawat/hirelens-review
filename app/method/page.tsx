import type { Metadata } from "next";
import { AskButton } from "@/components/agent/ask-button";
import { Callout, PageHeader } from "@/components/review/ui";
import { CHECKS, RULES } from "@/lib/review/engine";

export const metadata: Metadata = { title: "Method and limits" };

const CHECK_DETAIL: Record<string, { fail: string; concern: string; grounded: string }> = {
  job_relevance: {
    fail: "No link to the work or to joining.",
    concern: "Some link, but weak or indirect.",
    grounded: "Proportionality (Puttaswamy); research on validity.",
  },
  proxy: {
    fail: "Strongly or directly tracks a personal characteristic.",
    concern: "Weakly tracks one.",
    grounded: "Code on Wages s.3, RPwD, Transgender Persons and HIV/AIDS Acts; GDPR Art. 9 as reference.",
  },
  identity: {
    fail: "Content often belongs to someone else.",
    concern: "Matching can go wrong unless the candidate supplies the link.",
    grounded: "DPDP s.8(3): accuracy of data used in decisions.",
  },
  source_expectation: {
    fail: "Content is often posted by others.",
    concern: "Self-posted, but for friends, not employers.",
    grounded: "DPDP s.3(c)(ii): exemption only for what the person made public.",
  },
  coverage: {
    fail: "Misreads or penalises some groups outright.",
    concern: "Works unevenly across groups.",
    grounded: "Impact ratio and the fairness test.",
  },
  less_intrusive: {
    fail: "A less intrusive method answers the same question.",
    concern: "A partial alternative exists.",
    grounded: "The necessity limb of the proportionality test.",
  },
};

const CAN = [
  "Read the case file, the vendor's documents and the sample reports",
  "Apply the six questions and the outcome rules, through its tools",
  "Run the fairness test under any configuration",
  "Search the approved evidence library and cite it",
  "Assess a signal the vendor did not list, marking its facts for human confirmation",
  "Explain, compare, recommend and draft the memo and candidate notice",
];
const CANNOT = [
  "Approve or reject the proposal",
  "Give a definitive legal opinion",
  "Decide anything about a candidate, sample or real",
  "Screen, score or look up a real person",
  "Change a rule, a score or an outcome produced by the tools",
];

const LIMITS = [
  "The case is fictional. The method is general; the facts and numbers are illustrative.",
  "The facts recorded for each signal are judgements. They are written down so they can be challenged, and the rules make the consequences of each judgement explicit.",
  "The fairness test uses a synthetic pool built on stated assumptions. It shows what the scoring rules do, not what happened to real applicants.",
  "No test here can show whether the vendor tool predicts joining or retention. That requires outcome data the vendor has not supplied.",
  "Kestrel's own aptitude test is assumed to be fair and was not audited.",
  "Legal summaries are for review purposes and are not legal advice. Untested points are marked as open.",
  "The agent's answers can be wrong. Its numbers come from the tools; its explanations should be checked against the cited source.",
];

export default function MethodPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Method and limits"
        title="How the agent reviews, and where it stops"
        lede="The agent follows a fixed method. Its judgement goes into recording the facts and explaining the results; the outcomes and the recommendation come from rules anyone can read below."
      >
        <div className="mt-4">
          <AskButton question="Review a new signal for me: whether candidates follow the company's competitors on LinkedIn. Use assessNewSignal and explain each check.">
            Try it: ask the agent to review a new signal
          </AskButton>
        </div>
      </PageHeader>

      <section>
        <h2 className="hl-h2 mb-3">The six questions</h2>
        <div className="hl-card hl-scroll-x">
          <table className="hl-table min-w-[720px]">
            <thead>
              <tr>
                <th>Question</th>
                <th>Fails when</th>
                <th>Concern when</th>
                <th>Grounded in</th>
              </tr>
            </thead>
            <tbody>
              {CHECKS.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">
                    {c.number}. {c.question}
                  </td>
                  <td>{CHECK_DETAIL[c.id].fail}</td>
                  <td>{CHECK_DETAIL[c.id].concern}</td>
                  <td className="text-subtle">{CHECK_DETAIL[c.id].grounded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="hl-h2 mb-1">Outcome rules</h2>
        <p className="mb-3 text-[13.5px] text-subtle">Applied in order. The first rule that fires decides the outcome.</p>
        <ol className="hl-card divide-y divide-line">
          {RULES.map((r) => (
            <li key={r.id} className="grid grid-cols-[48px_1fr] gap-2 px-4 py-3 text-[14px]">
              <span className="hl-num text-subtle">{r.id}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="hl-h2 mb-3">Decision rules</h2>
        <ol className="hl-card divide-y divide-line text-[14px]">
          <li className="grid grid-cols-[48px_1fr] gap-2 px-4 py-3">
            <span className="hl-num text-subtle">D1</span>
            <span>
              If removed signals carry more than half the scoring weight, or the vendor configuration fails the fairness
              test, or no signal survives in the automated score: <strong>do not adopt as proposed</strong>.
            </span>
          </li>
          <li className="grid grid-cols-[48px_1fr] gap-2 px-4 py-3">
            <span className="hl-num text-subtle">D2</span>
            <span>
              Otherwise, if there is no validation study: <strong>pilot with safeguards</strong> only.
            </span>
          </li>
          <li className="grid grid-cols-[48px_1fr] gap-2 px-4 py-3">
            <span className="hl-num text-subtle">D3</span>
            <span>
              Otherwise: <strong>adopt with conditions</strong>.
            </span>
          </li>
        </ol>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="hl-card hl-card--pad">
          <h2 className="hl-h3 mb-2 text-keep">The agent may</h2>
          <ul className="list-disc space-y-1.5 pl-4 text-[13.5px]">
            {CAN.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="hl-card hl-card--pad">
          <h2 className="hl-h3 mb-2 text-remove">The agent may not</h2>
          <ul className="list-disc space-y-1.5 pl-4 text-[13.5px]">
            {CANNOT.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <Callout tone="human" title="When a person must take over">
          The agent hands a matter to a named person, using its hand-off tool, whenever it meets a legal interpretation
          (for example, whether the DPDP exemption covers bulk collection), a business judgement (whether culture fit
          should be scored at all), a fact it cannot verify, or the final decision. Each hand-off appears in the run
          trace and on the decision sheet.
        </Callout>
      </section>

      <section className="mt-8">
        <h2 className="hl-h2 mb-3">Limits of this review</h2>
        <ul className="hl-card hl-card--pad list-disc space-y-2 pl-8 text-[14px] leading-relaxed">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
