"use client";

import { MarkThinking } from "@/components/brand/logo";
import { motion } from "motion/react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useRotatingLabel } from "@/hooks/use-rotating-label";
import { Pipette } from "lucide-react";
import type { StatusCategory } from "@/lib/status-labels";

/**
 * Shows the animated mark and a rotating status label.
 * Used during the "submitted" phase (waiting for first response from model).
 * When isCompacting=true, shows compaction-specific labels with an archive icon.
 */
export function ThinkingIndicator({ isCompacting = false }: { isCompacting?: boolean }) {
  const category: StatusCategory = isCompacting ? "compacting" : "thinking";
  const label = useRotatingLabel(category, 3000);

  return (
    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
      {isCompacting ? (
        <Pipette className="size-4" />
      ) : (
        /* The mark animates its own signal bars: the busy state shows the agent examining signals. */
        <div className="relative flex-shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full bg-muted-foreground/15 blur-md"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <MarkThinking size={20} className="relative" />
        </div>
      )}

      <Shimmer className="text-sm" duration={1}>
        {label}
      </Shimmer>
    </div>
  );
}
