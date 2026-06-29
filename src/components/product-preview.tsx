const players = ["Aryan", "Meera", "Kabir", "Ira", "Dev", "Tara"];

export function ProductPreview() {
  return (
    <div className="surface-panel p-4 md:p-6">
      <div className="rounded-xl border border-hairline-strong bg-canvas p-4">
        <div className="mb-5 flex items-center justify-between border-b border-hairline pb-4">
          <div>
            <p className="text-xs text-ink-tertiary">ROOM</p>
            <p className="mt-1 font-mono text-lg tracking-normal text-ink">7429</p>
          </div>
          <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
            Word Match
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_0.8fr]">
          <div className="rounded-lg border border-hairline bg-surface-1 p-4">
            <p className="mb-4 text-xs uppercase tracking-[0.4px] text-ink-subtle">
              Players
            </p>
            <div className="grid gap-2">
              {players.map((player, index) => (
                <div
                  className="flex items-center justify-between rounded-md border border-hairline bg-surface-2 px-3 py-2"
                  key={player}
                >
                  <span className="text-sm text-ink">{player}</span>
                  <span className="font-mono text-xs text-ink-tertiary">
                    P{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-hairline bg-surface-1 p-4">
            <p className="mb-4 text-xs uppercase tracking-[0.4px] text-ink-subtle">
              Round flow
            </p>
            <ol className="space-y-3">
              {["Private reveal", "Discuss", "Vote", "Results"].map((step, index) => (
                <li className="flex items-center gap-3" key={step}>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 font-mono text-xs text-ink-muted">
                    {index + 1}
                  </span>
                  <span className="text-sm text-ink-muted">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
