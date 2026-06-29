import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PassAndPlaySetup } from "@/components/pass-and-play-setup";
import { gameModes, getGameMode } from "@/lib/game-modes";

type PassAndPlayPageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export function generateStaticParams() {
  return gameModes
    .filter((mode) => mode.setupEnabled)
    .map((mode) => ({ gameId: mode.id }));
}

export default async function PassAndPlayPage({ params }: PassAndPlayPageProps) {
  const { gameId } = await params;
  const mode = getGameMode(gameId);

  if (!mode || !mode.setupEnabled) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <nav className="mx-auto flex h-14 max-w-content items-center justify-between px-5 text-sm text-ink-muted md:px-8">
        <Link className="flex items-center gap-2 hover:text-ink" href={`/games/${mode.id}`}>
          <ArrowLeft size={16} />
          Play style
        </Link>
        <Link className="font-medium text-ink" href="/">
          One of Us
        </Link>
      </nav>

      <section className="mx-auto max-w-content px-5 py-14 md:px-8 md:py-24">
        <PassAndPlaySetup mode={mode} />
      </section>
    </main>
  );
}
