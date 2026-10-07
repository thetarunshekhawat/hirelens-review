import type { Metadata } from "next";
import { EvidenceBrowser } from "@/components/review/evidence-browser";
import { PageHeader } from "@/components/review/ui";
import { LIBRARY } from "@/lib/library/entries";

export const metadata: Metadata = { title: "Evidence" };

export default function EvidencePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Agent workspace · Approved sources"
        title="The evidence library"
        lede={`The ${LIBRARY.length} sources the agent is allowed to rely on. Indian law comes first and governs; other jurisdictions are reference only. Where a source is contested, untested or limited, the entry says so. Summaries are written for this review; each title links to the source.`}
      />
      <EvidenceBrowser />
    </div>
  );
}
