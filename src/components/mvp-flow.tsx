import { Check, Clock3 } from "lucide-react";
import { mvpFlowSteps } from "@/lib/mvp-flow";

export function MvpFlow() {
  return (
    <div className="surface-panel p-5 md:p-6">
      <div className="mb-6 flex items-start justify-between gap-6 border-b border-hairline pb-5">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-ink-subtle">
            MVP flow
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.6px] text-ink">
            First playable: Word Match, pass-and-play.
          </h2>
        </div>
        <span className="hidden rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted md:inline-flex">
          No backend yet
        </span>
      </div>

      <ol className="grid gap-3 md:grid-cols-2">
        {mvpFlowSteps.map((step, index) => {
          const isPlanned = step.status === "planned";
          const Icon = isPlanned ? Clock3 : Check;

          return (
            <li
              className="rounded-lg border border-hairline bg-surface-2 p-4"
              key={step.id}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-md border border-hairline-strong bg-surface-3 font-mono text-xs text-ink-muted">
                    {index + 1}
                  </span>
                  <h3 className="font-display text-[18px] font-medium tracking-[-0.2px] text-ink">
                    {step.title}
                  </h3>
                </div>
                <span
                  className={[
                    "inline-flex h-7 w-7 items-center justify-center rounded-full border",
                    isPlanned
                      ? "border-hairline bg-canvas text-ink-tertiary"
                      : "border-primary/40 bg-primary/10 text-primary",
                  ].join(" ")}
                >
                  <Icon size={14} />
                </span>
              </div>
              <p className="text-sm leading-6 text-ink-subtle">{step.description}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
