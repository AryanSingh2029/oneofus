import { ArrowRight, MessageCircleQuestion, ShieldHalf, Smartphone } from "lucide-react";
import Link from "next/link";
import { GameModeCard } from "@/components/game-mode-card";
import { ProductPreview } from "@/components/product-preview";
import { gameModes } from "@/lib/game-modes";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <nav className="mx-auto flex h-14 max-w-content items-center justify-between px-5 text-sm text-ink-muted md:px-8">
        <Link className="flex items-center gap-2 font-medium text-ink" href="/">
          <span className="grid h-6 w-6 place-items-center rounded-sm bg-primary text-xs font-semibold text-white">
            O
          </span>
          One of Us
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          <a className="hover:text-ink" href="#games">Games</a>
          <a className="hover:text-ink" href="#modes">Play modes</a>
          <a className="hover:text-ink" href="#start">Start</a>
        </div>
        <a
          className="focus-ring inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-3.5 py-2 text-sm font-medium leading-none text-white transition-colors hover:bg-primary-hover"
          href="#games"
        >
          Play now
        </a>
      </nav>

      <section className="mx-auto grid max-w-content gap-10 px-5 pb-16 pt-14 md:grid-cols-[0.88fr_1.12fr] md:px-8 md:pb-24 md:pt-24">
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
            Social deduction, no table required
          </p>
          <h1 className="max-w-3xl font-display text-[44px] font-semibold leading-[1.05] tracking-[-1.6px] text-ink md:text-[72px] md:tracking-[-2.8px]">
            One room. One secret. One player does not match.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 tracking-[-0.1px] text-ink-muted">
            Play word match, picture match, question match, and Mafia from
            every phone in the room, or pass a single phone around when you want
            zero setup.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium leading-none text-white transition-colors hover:bg-primary-hover"
              href="#games"
            >
              Start a game
              <ArrowRight size={16} />
            </a>
            <a
              className="focus-ring inline-flex min-h-10 items-center justify-center rounded-md border border-hairline bg-surface-1 px-3.5 py-2 text-sm font-medium leading-none text-ink transition-colors hover:border-hairline-strong hover:bg-surface-2"
              href="#modes"
            >
              How it works
            </a>
          </div>
        </div>

        <ProductPreview />
      </section>

      <section id="games" className="mx-auto max-w-content px-5 py-16 md:px-8 md:py-24">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.4px] text-ink-subtle">
              Game modes
            </p>
            <h2 className="max-w-2xl font-display text-4xl font-semibold leading-tight tracking-[-1px] md:text-[56px] md:leading-[1.1] md:tracking-[-1.8px]">
              Built around the same satisfying suspicion loop.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink-subtle">
            Every mode starts private, moves into discussion, and ends with a
            vote. The structure stays simple so the table talk can do the work.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {gameModes.map((mode) => (
            <GameModeCard key={mode.id} mode={mode} />
          ))}
        </div>
      </section>

      <section id="modes" className="mx-auto max-w-content px-5 py-16 md:px-8 md:py-24">
        <div className="surface-panel grid gap-6 p-6 md:grid-cols-3 md:p-8">
          <Feature
            icon={<Smartphone size={18} />}
            title="Every-phone rooms"
            body="Host a room and let everyone join from their own phone when you want private screens for the whole group."
          />
          <Feature
            icon={<MessageCircleQuestion size={18} />}
            title="Single-phone pass"
            body="A local mode for quick groups: reveal, hide, pass, discuss, vote."
          />
          <Feature
            icon={<ShieldHalf size={18} />}
            title="Mafia-ready flow"
            body="The structure already accounts for roles, phases, voting, and result reveals."
          />
        </div>
      </section>

      <section id="start" className="mx-auto max-w-content px-5 pb-20 pt-12 md:px-8">
        <div className="rounded-lg border border-hairline bg-surface-1 p-8 md:flex md:items-center md:justify-between">
          <div>
            <p className="text-sm text-ink-subtle">Ready when the group is</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.6px]">
              Pick a mode, pass the phone, find the one who does not fit.
            </h2>
          </div>
          <div className="mt-6 flex gap-3 md:mt-0">
            <a
              className="focus-ring inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-3.5 py-2 text-sm font-medium leading-none text-white transition-colors hover:bg-primary-hover"
              href="#games"
            >
              Choose game
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-2 p-6">
      <div className="mb-5 grid h-9 w-9 place-items-center rounded-md border border-hairline-strong bg-surface-3 text-primary">
        {icon}
      </div>
      <h3 className="font-display text-[22px] font-medium leading-tight tracking-[-0.4px]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-ink-subtle">{body}</p>
    </div>
  );
}
