import { create } from "zustand";
import type { GameMode } from "@/lib/game-modes";

type PlayMode = "room" | "pass-and-play";
type GamePhase = "setup" | "reveal" | "discussion" | "voting" | "results";

type GameState = {
  selectedGame: GameMode["id"] | null;
  playMode: PlayMode;
  phase: GamePhase;
  setSelectedGame: (game: GameMode["id"]) => void;
  setPlayMode: (mode: PlayMode) => void;
  setPhase: (phase: GamePhase) => void;
};

export const useGameStore = create<GameState>((set) => ({
  selectedGame: null,
  playMode: "room",
  phase: "setup",
  setSelectedGame: (selectedGame) => set({ selectedGame }),
  setPlayMode: (playMode) => set({ playMode }),
  setPhase: (phase) => set({ phase }),
}));
