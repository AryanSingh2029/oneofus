import { ArrowLeft, MonitorSmartphone, Smartphone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gameModes, getGameMode } from "@/lib/game-modes";

type GameSetupPageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

const setupCopy = {
  "word-match": {
    eyebrow: "Word Match setup",
    title: "Choose how this word round should be played.",
    body: "One player will receive a different secret. First choose whether secrets are revealed on this phone or on each player's own device.",
  },
  "picture-match": {
    eyebrow: "Picture Match setup",
    title: "Choose how this picture round should be played.",
    body: "Most players will see the same image while one player sees a different one. Keep reveals private before the discussion starts.",
  },
  "question-match": {
    eyebrow: "Question Match setup",
    title: "Choose how this question round should be played.",
    body: "Most players answer the same prompt. One player answers a different prompt and tries to make their answer sound natural.",
  },
  mafia: {
    eyebrow: "Mafia setup",
    title: "Choose how this Mafia game should be played.",
    body: "Pass one phone around for private roles, night choices, day discussion, voting, and eliminations.",
  },
} as const;

export function generateStaticParams() {
  return gameModes
    .filter((mode) => mode.setupEnabled)
    .map((mode) => ({ gameId: mode.id }));
}

export default async function GameSetupPage({ params }: GameSetupPageProps) {
  const { gameId } = await params;
  const mode = getGameMode(gameId);

  if (!mode || !mode.setupEnabled || !(mode.id in setupCopy)) {
    notFound();
  }

  const copy = setupCopy[mode.id as keyof typeof setupCopy];

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <nav className="mx-auto flex h-14 max-w-content items-center justify-between px-5 text-sm text-ink-muted md:px-8">
        <Link className="flex items-center gap-2 hover:text-ink" href="/#games">
          <ArrowLeft size={16} />
          Games
        </Link>
        <Link className="font-medium text-ink" href="/">
          One of Us
        </Link>
      </nav>

      <section className="mx-auto max-w-content px-5 py-14 md:px-8 md:py-24">
        <div className="max-w-3xl">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
            {copy.eyebrow}
          </p>
          <h1 className="font-display text-[44px] font-semibold leading-[1.05] tracking-[-1.6px] md:text-[64px] md:tracking-[-2.2px]">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-muted">
            {copy.body}
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <PlayModeCard
            body="Pass the phone around. Each player privately reveals their secret, hides it, and hands the device to the next person."
            cta="Continue"
            href={`/games/${mode.id}/pass-and-play`}
            icon={<Smartphone size={20} />}
            status="Available now"
            title="One phone"
          />
          <PlayModeCard
            body="Host creates a room code and everyone joins from their own phone. This will use Supabase Realtime later."
            icon={<MonitorSmartphone size={20} />}
            status="Coming soon"
            title="Separate phones"
          />
        </div>
      </section>
    </main>
  );
}

function PlayModeCard({
  body,
  cta,
  href,
  icon,
  status,
  title,
}: {
  body: string;
  cta?: string;
  href?: string;
  icon: React.ReactNode;
  status: string;
  title: string;
}) {
  const content = (
    <>
      <div className="mb-10 flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-md border border-hairline-strong bg-surface-3 text-primary">
          {icon}
        </div>
        <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
          {status}
        </span>
      </div>
      <h2 className="font-display text-[28px] font-semibold tracking-[-0.6px]">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-6 text-ink-subtle">{body}</p>
      {cta ? (
        <span className="mt-8 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white transition-colors group-hover:bg-primary-hover">
          {cta}
        </span>
      ) : (
        <span className="mt-8 inline-flex min-h-10 items-center justify-center rounded-md border border-hairline bg-surface-1 px-3.5 py-2 text-sm font-medium text-ink-tertiary">
          Room mode later
        </span>
      )}
    </>
  );

  if (!href) {
    return (
      <article className="rounded-xl border border-hairline bg-surface-1 p-6 opacity-75">
        {content}
      </article>
    );
  }

  return (
    <Link
      className="focus-ring group rounded-xl border border-hairline bg-surface-1 p-6 transition-colors hover:border-hairline-strong hover:bg-surface-2"
      href={href}
    >
      {content}
    </Link>
  );
}
