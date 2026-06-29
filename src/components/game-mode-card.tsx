import { Image, MessageCircleQuestion, ShieldHalf } from "lucide-react";
import Link from "next/link";
import type { GameMode } from "@/lib/game-modes";

const icons = {
  word: MessageCircleQuestion,
  picture: Image,
  question: MessageCircleQuestion,
  mafia: ShieldHalf,
};

export function GameModeCard({ mode }: { mode: GameMode }) {
  const Icon = icons[mode.icon];
  const content = (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-hairline bg-surface-2 text-primary">
          <Icon size={18} />
        </div>
        <span className="rounded-full bg-surface-2 px-2 py-1 text-xs leading-none text-ink-muted">
          {mode.setupEnabled ? mode.players : "Later"}
        </span>
      </div>
      <h3 className="font-display text-[22px] font-medium leading-tight tracking-[-0.4px]">
        {mode.title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-ink-subtle">{mode.description}</p>
      <div className="mt-6 border-t border-hairline pt-4">
        <p className="font-mono text-[13px] leading-6 text-ink-muted">{mode.flow}</p>
      </div>
    </>
  );

  if (!mode.setupEnabled) {
    return (
      <article className="rounded-lg border border-hairline bg-surface-1 p-6 opacity-70">
        {content}
      </article>
    );
  }

  return (
    <Link
      className="focus-ring block rounded-lg border border-hairline bg-surface-1 p-6 transition-colors hover:border-hairline-strong hover:bg-surface-2"
      href={`/games/${mode.id}`}
    >
      {content}
    </Link>
  );
}
