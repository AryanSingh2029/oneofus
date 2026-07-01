export type MafiaRole = "mafia" | "doctor" | "detective" | "civilian";
export type MafiaWinner = "mafia" | "town";

export type MafiaPublicPlayer = {
  id: string;
  name: string;
  alive: boolean;
};

export type MafiaSettings = {
  mafiaCount?: number;
  includeDoctor?: boolean;
  includeDetective?: boolean;
  revealRolesOnRemoval?: boolean;
};

export type MafiaNightChoice = {
  playerId: string;
  targetPlayerId: string;
};

export function defaultMafiaSettings(playerCount = 5): Required<MafiaSettings> {
  return {
    mafiaCount: 1,
    includeDoctor: playerCount >= 4,
    includeDetective: playerCount >= 5,
    revealRolesOnRemoval: true,
  };
}

export function mafiaRoleLabel(role: MafiaRole) {
  const labels: Record<MafiaRole, string> = {
    mafia: "Mafia",
    doctor: "Doctor",
    detective: "Detective",
    civilian: "Civilian",
  };

  return labels[role];
}

export function chooseMostCommonTarget(targetIds: string[]) {
  if (targetIds.length === 0) return null;

  const counts = targetIds.reduce<Record<string, number>>((currentCounts, id) => {
    currentCounts[id] = (currentCounts[id] ?? 0) + 1;
    return currentCounts;
  }, {});
  const highestCount = Math.max(...Object.values(counts));
  const tiedTargets = Object.entries(counts)
    .filter(([, count]) => count === highestCount)
    .map(([id]) => id);

  return tiedTargets[Math.floor(Math.random() * tiedTargets.length)];
}

export function getMafiaWinner(players: MafiaPublicPlayer[], roles: Record<string, MafiaRole>) {
  const alivePlayers = players.filter((player) => player.alive);
  const aliveMafiaCount = alivePlayers.filter((player) => roles[player.id] === "mafia")
    .length;
  const aliveTownCount = alivePlayers.length - aliveMafiaCount;

  if (aliveMafiaCount === 0) return "town" satisfies MafiaWinner;
  if (aliveMafiaCount >= aliveTownCount) return "mafia" satisfies MafiaWinner;

  return null;
}

export function shuffle<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}
