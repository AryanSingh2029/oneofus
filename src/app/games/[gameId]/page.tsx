import { notFound, redirect } from "next/navigation";
import { gameModes, getGameMode } from "@/lib/game-modes";

type GameSetupPageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export function generateStaticParams() {
  return gameModes
    .filter((mode) => mode.setupEnabled)
    .map((mode) => ({ gameId: mode.id }));
}

export default async function GameSetupPage({ params }: GameSetupPageProps) {
  const { gameId } = await params;
  const mode = getGameMode(gameId);

  if (!mode || !mode.setupEnabled) {
    notFound();
  }

  redirect(`/games/${mode.id}/pass-and-play`);
}
