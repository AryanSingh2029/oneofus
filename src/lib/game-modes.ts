export type GameMode = {
  id: "word-match" | "picture-match" | "question-match" | "mafia";
  title: string;
  description: string;
  flow: string;
  players: string;
  minPlayers: number;
  maxPlayers: number;
  icon: "word" | "picture" | "question" | "mafia";
  setupEnabled: boolean;
};

export const gameModes: GameMode[] = [
  {
    id: "word-match",
    title: "Word Match",
    description:
      "Everyone receives the same word except one player. The table has to find who does not belong.",
    flow: "Reveal -> talk -> accuse -> vote",
    players: "3-12 players",
    minPlayers: 3,
    maxPlayers: 12,
    icon: "word",
    setupEnabled: true,
  },
  {
    id: "picture-match",
    title: "Picture Match",
    description:
      "The same deduction loop, but with images. Describe carefully without giving the whole picture away.",
    flow: "Reveal -> describe -> suspect -> vote",
    players: "3-10 players",
    minPlayers: 3,
    maxPlayers: 10,
    icon: "picture",
    setupEnabled: true,
  },
  {
    id: "question-match",
    title: "Question Match",
    description:
      "Everyone answers the same question about the group, except one player gets a different question and has to blend in.",
    flow: "Prompt -> answer -> compare -> discuss",
    players: "3-12 players",
    minPlayers: 3,
    maxPlayers: 12,
    icon: "question",
    setupEnabled: true,
  },
  {
    id: "mafia",
    title: "Mafia",
    description:
      "Classic night and day phases with hidden teams, accusations, eliminations, and tense reveals.",
    flow: "Night -> day -> vote -> eliminate",
    players: "5-16 players",
    minPlayers: 5,
    maxPlayers: 16,
    icon: "mafia",
    setupEnabled: true,
  },
];

export function getGameMode(gameId: string) {
  return gameModes.find((mode) => mode.id === gameId);
}
