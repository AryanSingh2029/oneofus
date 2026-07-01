import type { GameMode } from "@/lib/game-modes";

export type RoomStatus =
  | "lobby"
  | "reveal"
  | "discussion"
  | "voting"
  | "result"
  | "ended";

export type RoomSettings = {
  showRoles?: boolean;
  mafiaCount?: number;
  includeDoctor?: boolean;
  includeDetective?: boolean;
  revealRolesOnRemoval?: boolean;
};

export type Room = {
  id: string;
  code: string;
  game_id: GameMode["id"];
  status: RoomStatus;
  host_player_id: string | null;
  settings: RoomSettings;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

type PrivateRoom = Room & {
  host_token: string;
};

export type RoomPlayer = {
  id: string;
  room_id: string;
  name: string;
  is_host: boolean;
  is_connected: boolean;
  is_alive: boolean;
  joined_at: string;
  updated_at: string;
};

type PrivateRoomPlayer = RoomPlayer & {
  player_token: string;
};

export type Round = {
  id: string;
  room_id: string;
  round_number: number;
  phase:
    | "setup"
    | "reveal"
    | "discussion"
    | "voting"
    | "result"
    | "roleReveal"
    | "night"
    | "day"
    | "trialResult"
    | "gameOver";
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type RoundAssignment = {
  id: string;
  round_id: string;
  player_id: string;
  role: "civilian" | "impostor" | "mafia" | "doctor" | "detective";
  secret: string;
  secret_image: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type RoomSnapshot = {
  room: Room;
  players: RoomPlayer[];
  round: Round | null;
};

export type LocalRoomSession = {
  code: string;
  playerId: string;
  playerToken: string;
  hostToken?: string;
};

type RoomSessionResponse = {
  room: Room;
  player: RoomPlayer;
  session: LocalRoomSession;
};

export class RoomNotFoundError extends Error {
  constructor() {
    super("This room does not exist or has expired.");
    this.name = "RoomNotFoundError";
  }
}

export function createRoomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createToken() {
  return crypto.randomUUID();
}

export function roomSessionKey(code: string) {
  return `one-of-us-room-${code}`;
}

export function redactRoom(room: PrivateRoom): Room {
  const publicRoom = { ...room } as Partial<PrivateRoom>;
  delete publicRoom.host_token;
  return publicRoom as Room;
}

export function redactRoomPlayer(player: PrivateRoomPlayer): RoomPlayer {
  const publicPlayer = { ...player } as Partial<PrivateRoomPlayer>;
  delete publicPlayer.player_token;
  return publicPlayer as RoomPlayer;
}

export function redactRound(round: Round): Round {
  return {
    ...round,
    content: getPublicRoundContent(round),
  };
}

function getPublicRoundContent(round: Round) {
  const content = round.content ?? {};
  const publicContent: Record<string, unknown> = {};
  const copyKey = (key: string) => {
    if (key in content) publicContent[key] = content[key];
  };

  copyKey("settings");

  if (round.phase === "discussion" || round.phase === "voting" || round.phase === "result") {
    copyKey("answerReveal");
  }

  if (round.phase === "result") {
    copyKey("result");
  }

  if (
    round.phase === "roleReveal" ||
    round.phase === "night" ||
    round.phase === "day" ||
    round.phase === "voting" ||
    round.phase === "trialResult" ||
    round.phase === "gameOver"
  ) {
    copyKey("players");
    copyKey("dayNumber");
    copyKey("lastNightResult");
    copyKey("lastVoteResult");
    copyKey("winner");
  }

  return publicContent;
}

export function saveLocalRoomSession(session: LocalRoomSession) {
  window.localStorage.setItem(roomSessionKey(session.code), JSON.stringify(session));
}

export function readLocalRoomSession(code: string) {
  const rawSession = window.localStorage.getItem(roomSessionKey(code));

  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as LocalRoomSession;
  } catch {
    window.localStorage.removeItem(roomSessionKey(code));
    return null;
  }
}

export async function createRoom({
  gameId,
  hostName,
}: {
  gameId: GameMode["id"];
  hostName: string;
}) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId, hostName }),
  });
  const data = (await response.json()) as RoomSessionResponse | { error?: string };

  if (!response.ok) {
    throw new Error("error" in data && data.error ? data.error : "Could not create room.");
  }

  return data as RoomSessionResponse;
}

export async function getRoomByCode(code: string) {
  return (await getRoomSnapshot(code)).room;
}

export async function getRoomSnapshot(code: string) {
  const response = await fetch(`/api/rooms/${code}/snapshot`, {
    cache: "no-store",
  });

  if (response.status === 404 || response.status === 410) {
    throw new RoomNotFoundError();
  }

  const data = (await response.json()) as RoomSnapshot | { error?: string };

  if (!response.ok) {
    throw new Error("error" in data && data.error ? data.error : "Could not load room.");
  }

  return data as RoomSnapshot;
}

export async function getRoomPlayers(code: string) {
  return (await getRoomSnapshot(code)).players;
}

export async function getLatestRound(code: string) {
  return (await getRoomSnapshot(code)).round;
}

export async function joinRoom({
  code,
  gameId,
  name,
}: {
  code: string;
  gameId?: GameMode["id"];
  name: string;
}) {
  const response = await fetch(`/api/rooms/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId, name }),
  });
  const data = (await response.json()) as RoomSessionResponse | { error?: string };

  if (!response.ok) {
    throw new Error("error" in data && data.error ? data.error : "Could not join room.");
  }

  return data as RoomSessionResponse;
}
