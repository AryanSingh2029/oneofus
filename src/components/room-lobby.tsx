"use client";

import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  LogIn,
  Minus,
  Moon,
  Plus,
  ShieldHalf,
  Skull,
  Users,
} from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getGameMode } from "@/lib/game-modes";
import {
  defaultMafiaSettings,
  mafiaRoleLabel,
  type MafiaPublicPlayer,
  type MafiaRole,
  type MafiaSettings,
  type MafiaWinner,
} from "@/lib/mafia";
import {
  getRoomSnapshot,
  joinRoom,
  readLocalRoomSession,
  type LocalRoomSession,
  RoomNotFoundError,
  type Room,
  type RoomPlayer,
  type Round,
  type RoundAssignment,
  saveLocalRoomSession,
} from "@/lib/rooms";

type LoadState = "loading" | "ready" | "missing" | "error";
type VoteProgress = {
  hasVoted: boolean;
  needed: number;
  votes: number;
  votedPlayerIds: string[];
};
type AnswerProgress = {
  hasAnswered: boolean;
  needed: number;
  answers: number;
  answeredPlayerIds: string[];
};
type QuestionAnswerReveal = {
  playerId: string;
  playerName: string;
  targetPlayerId: string;
  targetPlayerName: string;
};
type NightProgress = {
  hasChosen: boolean;
  needed: number;
  choices: number;
  chosenPlayerIds: string[];
};
type DetectiveResult = {
  role: MafiaRole;
  label: string;
} | null;

function preloadImage(src: string | undefined | null) {
  if (!src || typeof window === "undefined") return;

  const image = new window.Image();
  image.src = src;
}

export function RoomLobby({ code }: { code: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [assignment, setAssignment] = useState<RoundAssignment | null>(null);
  const [session, setSession] = useState<LocalRoomSession | null>(null);
  const [joinName, setJoinName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [selectedNightTargetId, setSelectedNightTargetId] = useState<string | null>(
    null,
  );
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [answerProgress, setAnswerProgress] = useState<AnswerProgress | null>(null);
  const [nightProgress, setNightProgress] = useState<NightProgress | null>(null);
  const [detectiveResult, setDetectiveResult] = useState<DetectiveResult>(null);
  const [voteProgress, setVoteProgress] = useState<VoteProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mode = room ? getGameMode(room.game_id) : undefined;
  const showRoles = room ? getShowRoles(room, round) : true;
  const isMatchRoom =
    room?.game_id === "word-match" || room?.game_id === "picture-match";
  const isQuestionRoom = room?.game_id === "question-match";
  const isMafiaRoom = room?.game_id === "mafia";
  const isRoomRoundGame = isMatchRoom || isQuestionRoom || isMafiaRoom;
  const mafiaSettings = getMafiaSettings(room?.settings, players.length);
  const roomCode = room?.code;
  const roomGameId = room?.game_id;
  const roomId = room?.id;
  const roomStatus = room?.status;
  const secretNoun = isQuestionRoom
    ? "question"
    : room?.game_id === "picture-match"
      ? "picture"
      : "word";
  const currentPlayer = useMemo(
    () => players.find((player) => player.id === session?.playerId),
    [players, session],
  );
  const isHost = Boolean(currentPlayer?.is_host && session?.hostToken);

  useEffect(() => {
    let isMounted = true;

    async function loadRoom() {
      try {
        const snapshot = await getRoomSnapshot(code);
        const nextSession = readLocalRoomSession(code);

        if (!isMounted) return;

        setRoom(snapshot.room);
        setPlayers(snapshot.players);
        setSession(nextSession);
        setRound(snapshot.round);
        setLoadState("ready");
      } catch (loadError) {
        if (!isMounted) return;

        setLoadState("missing");
        setError(getRoomLoadError(loadError));
      }
    }

    loadRoom();

    return () => {
      isMounted = false;
    };
  }, [code]);

  useEffect(() => {
    if (!roomId) return;
    let isMounted = true;

    async function refreshRoom() {
      try {
        const snapshot = await getRoomSnapshot(code);
        if (!isMounted) return;

        setRoom((previousRoom) => {
          if (previousRoom && previousRoom.status !== snapshot.room.status) {
            setIsSecretVisible(false);
            setSelectedAnswerId(null);
            setSelectedNightTargetId(null);
            setSelectedVoteId(null);
            setAnswerProgress(null);
            setNightProgress(null);
            setDetectiveResult(null);
            setVoteProgress(null);
          }

          return snapshot.room;
        });
        setPlayers(snapshot.players);
        setRound(snapshot.round);
      } catch (roomError) {
        if (!isMounted) return;

        if (roomError instanceof RoomNotFoundError) {
          setLoadState("missing");
          setRoom(null);
          setPlayers([]);
          setRound(null);
          setAssignment(null);
          setError(roomError.message);
        } else {
          setError(getRoomLoadError(roomError));
        }
      }
    }

    const intervalId = window.setInterval(refreshRoom, 2500);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [code, roomId]);

  useEffect(() => {
    if (!session || !roomCode || !roomGameId || roomStatus === "lobby") {
      return;
    }

    let isMounted = true;

    async function loadAssignment() {
      try {
        const params = new URLSearchParams({
          playerId: session!.playerId,
          playerToken: session!.playerToken,
        });
        const response = await fetch(
          `/api/rooms/${roomCode}/${roomGameId}/assignment?${params}`,
        );

        if (!response.ok) return;

        const data = (await response.json()) as {
          round: Round;
          assignment: RoundAssignment;
        };

        if (!isMounted) return;

        setRound(data.round);
        setAssignment(data.assignment);
        preloadImage(data.assignment.secret_image);
      } catch {
        if (isMounted) setAssignment(null);
      }
    }

    if (
      roomGameId === "word-match" ||
      roomGameId === "picture-match" ||
      roomGameId === "question-match" ||
      roomGameId === "mafia"
    ) {
      loadAssignment();
    }

    return () => {
      isMounted = false;
    };
  }, [roomCode, roomGameId, roomStatus, session]);

  useEffect(() => {
    if (!session || !room || !isRoomRoundGame || room.status !== "voting") {
      return;
    }

    let isMounted = true;

    async function loadVoteProgress() {
      try {
        const params = new URLSearchParams({
          playerId: session!.playerId,
          playerToken: session!.playerToken,
        });
        const response = await fetch(
          `/api/rooms/${room!.code}/${room!.game_id}/vote?${params}`,
        );

        if (!response.ok) return;

        const data = (await response.json()) as VoteProgress;

        if (isMounted) setVoteProgress(data);
      } catch {
        if (isMounted) setVoteProgress(null);
      }
    }

    loadVoteProgress();
    const intervalId = window.setInterval(loadVoteProgress, 2500);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isRoomRoundGame, room, session]);

  useEffect(() => {
    if (!session || !room || !isQuestionRoom || room.status !== "reveal") {
      return;
    }

    let isMounted = true;

    async function loadAnswerProgress() {
      try {
        const params = new URLSearchParams({
          playerId: session!.playerId,
          playerToken: session!.playerToken,
        });
        const response = await fetch(
          `/api/rooms/${room!.code}/${room!.game_id}/answer?${params}`,
        );

        if (!response.ok) return;

        const data = (await response.json()) as AnswerProgress;

        if (isMounted) setAnswerProgress(data);
      } catch {
        if (isMounted) setAnswerProgress(null);
      }
    }

    loadAnswerProgress();
    const intervalId = window.setInterval(loadAnswerProgress, 2500);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isQuestionRoom, room, session]);

  useEffect(() => {
    if (!session || !room || !isMafiaRoom || room.status !== "reveal") {
      return;
    }

    const roundPhase = round?.phase;
    if (roundPhase !== "night") return;

    let isMounted = true;

    async function loadNightProgress() {
      try {
        const params = new URLSearchParams({
          playerId: session!.playerId,
          playerToken: session!.playerToken,
        });
        const response = await fetch(
          `/api/rooms/${room!.code}/${room!.game_id}/night?${params}`,
        );

        if (!response.ok) return;

        const data = (await response.json()) as NightProgress;

        if (isMounted) setNightProgress(data);
      } catch {
        if (isMounted) setNightProgress(null);
      }
    }

    loadNightProgress();
    const intervalId = window.setInterval(loadNightProgress, 2500);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isMafiaRoom, room, round?.phase, session]);

  async function handleJoinRoom() {
    const trimmedName = joinName.trim();

    if (!trimmedName) {
      setError("Enter your name first.");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const joinedRoom = await joinRoom({ code, name: trimmedName });
      saveLocalRoomSession(joinedRoom.session);
      setSession(joinedRoom.session);
      const snapshot = await getRoomSnapshot(code);
      setRoom(snapshot.room);
      setPlayers(snapshot.players);
      setRound(snapshot.round);
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Could not join room.",
      );
    } finally {
      setIsJoining(false);
    }
  }

  async function copyRoomCode() {
    await window.navigator.clipboard.writeText(code);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1200);
  }

  async function startRoomRound() {
    if (
      !session?.hostToken ||
      !room ||
      !isRoomRoundGame ||
      players.length < (mode?.minPlayers ?? 3)
    ) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${code}/${room.game_id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken: session.hostToken }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Could not start round.");

      const snapshot = await getRoomSnapshot(code);
      setRoom(snapshot.room);
      setPlayers(snapshot.players);
      setRound(snapshot.round);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "Could not start round.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function updateShowRoles(nextShowRoles: boolean) {
    if (!session?.hostToken || !room) return;

    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${code}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostToken: session.hostToken,
          settings: { showRoles: nextShowRoles },
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update settings.");
      }

      setRoom(data.room);
    } catch (settingsError) {
      setError(
        settingsError instanceof Error
          ? settingsError.message
          : "Could not update settings.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function updateRoomSettings(settings: MafiaSettings) {
    if (!session?.hostToken || !room) return;

    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${code}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostToken: session.hostToken,
          settings,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update settings.");
      }

      setRoom(data.room);
    } catch (settingsError) {
      setError(
        settingsError instanceof Error
          ? settingsError.message
          : "Could not update settings.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function setRoomPhase(phase: "lobby" | "voting" | "reveal") {
    if (!session?.hostToken || !room || !isRoomRoundGame) return;

    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${code}/${room.game_id}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken: session.hostToken, phase }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Could not change phase.");

      const snapshot = await getRoomSnapshot(code);
      setRoom(snapshot.room);
      setPlayers(snapshot.players);
      setRound(snapshot.round);
      setAnswerProgress(null);
      setVoteProgress(null);
    } catch (phaseError) {
      setError(
        phaseError instanceof Error ? phaseError.message : "Could not change phase.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function setMafiaPhase(phase: "night" | "voting" | "lobby") {
    if (!session?.hostToken || !room || !isMafiaRoom) return;

    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${code}/${room.game_id}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken: session.hostToken, phase }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Could not change phase.");

      const snapshot = await getRoomSnapshot(code);
      setRoom(snapshot.room);
      setPlayers(snapshot.players);
      setRound(snapshot.round);
      setNightProgress(null);
      setVoteProgress(null);
    } catch (phaseError) {
      setError(
        phaseError instanceof Error ? phaseError.message : "Could not change phase.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function submitVote() {
    if (!session || !room || !isRoomRoundGame || !selectedVoteId) return;

    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${code}/${room.game_id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: session.playerId,
          playerToken: session.playerToken,
          targetPlayerId: selectedVoteId,
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Could not submit vote.");

      setVoteProgress(data);
      const snapshot = await getRoomSnapshot(code);
      setRoom(snapshot.room);
      setPlayers(snapshot.players);
      setRound(snapshot.round);
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Could not submit vote.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submitQuestionAnswer() {
    if (!session || !room || !isQuestionRoom || !selectedAnswerId) return;

    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${code}/${room.game_id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: session.playerId,
          playerToken: session.playerToken,
          targetPlayerId: selectedAnswerId,
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Could not submit answer.");

      setAnswerProgress(data);
      const snapshot = await getRoomSnapshot(code);
      setRoom(snapshot.room);
      setPlayers(snapshot.players);
      setRound(snapshot.round);
    } catch (answerError) {
      setError(
        answerError instanceof Error
          ? answerError.message
          : "Could not submit answer.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function submitMafiaNightChoice() {
    if (!session || !room || !isMafiaRoom || !selectedNightTargetId) return;

    setIsBusy(true);
    setError(null);
    setDetectiveResult(null);

    try {
      const response = await fetch(`/api/rooms/${code}/${room.game_id}/night`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: session.playerId,
          playerToken: session.playerToken,
          targetPlayerId: selectedNightTargetId,
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Could not submit choice.");

      setNightProgress(data);
      setDetectiveResult(data.detectiveResult ?? null);
      setSelectedNightTargetId(null);
      const snapshot = await getRoomSnapshot(code);
      setRoom(snapshot.room);
      setPlayers(snapshot.players);
      setRound(snapshot.round);
    } catch (nightError) {
      setError(
        nightError instanceof Error ? nightError.message : "Could not submit choice.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  if (loadState === "loading") {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-hairline bg-surface-1 p-8 text-center">
        <Loader2 className="mx-auto animate-spin text-primary" size={24} />
        <p className="mt-4 text-sm text-ink-muted">Loading room...</p>
      </section>
    );
  }

  if (loadState !== "ready" || !room || !mode) {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-hairline bg-surface-1 p-8">
        <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
          Room unavailable
        </p>
        <h1 className="mt-3 font-display text-[38px] font-semibold tracking-[-1.2px]">
          This room is no longer active.
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink-subtle">
          {error ??
            "It may have expired after being inactive, or the room code may be wrong."}
        </p>
        <Button className="mt-6" onClick={() => window.location.assign("/#games")}>
          Create or join another room
        </Button>
      </section>
    );
  }

  if (isRoomRoundGame && room.status !== "lobby" && !currentPlayer) {
    return (
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
          <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
            {mode.title} room
          </p>
          <h1 className="mt-3 font-display text-[42px] font-semibold leading-none tracking-[-1.4px] md:text-[64px] md:tracking-[-2.2px]">
            {code}
          </h1>
          <p className="mt-5 text-base leading-7 text-ink-muted">
            A round is already in progress. You can join when the host returns
            the room to lobby after the result.
          </p>

          <div className="mt-8 rounded-lg border border-hairline bg-surface-2 p-4">
            <p className="font-display text-[20px] font-medium tracking-[-0.3px] text-ink">
              Waiting for lobby.
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-subtle">
              Keep this page open. It will become joinable after the current
              round ends.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-ink-subtle">
                Current players
              </p>
              <h2 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.6px]">
                Round in progress.
              </h2>
            </div>
            <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
              {players.length}
            </span>
          </div>

          <PlayerList players={players} />
        </section>
      </div>
    );
  }

  if (isMafiaRoom && room.status !== "lobby" && currentPlayer) {
    const publicPlayers = ((round?.content?.players ?? []) as MafiaPublicPlayer[]);
    const alivePlayers = publicPlayers.filter((player) => player.alive);
    const currentMafiaPlayer = publicPlayers.find(
      (player) => player.id === currentPlayer.id,
    );
    const mafiaRole = (assignment?.role ?? "civilian") as MafiaRole;
    const isAlive = currentMafiaPlayer?.alive !== false;
    const eligibleNightTargets = alivePlayers.filter(
      (player) => player.id !== currentPlayer.id,
    );
    const lastNightResult = round?.content?.lastNightResult as
      | {
          eliminatedName?: string;
          eliminatedRole?: MafiaRole | null;
          message: string;
          saved: boolean;
        }
      | null
      | undefined;
    const lastVoteResult = round?.content?.lastVoteResult as
      | {
          eliminatedName?: string;
          eliminatedRole?: MafiaRole | null;
          message: string;
        }
      | null
      | undefined;
    const winner = (round?.content?.winner ?? null) as MafiaWinner | null;
    const dayNumber = Number(round?.content?.dayNumber ?? 1);

    return (
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
          <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
            Mafia room
          </p>
          <h1 className="mt-3 font-display text-[42px] font-semibold leading-none tracking-[-1.4px] md:text-[64px] md:tracking-[-2.2px]">
            {code}
          </h1>
          <p className="mt-5 text-base leading-7 text-ink-muted">
            {round?.phase === "roleReveal"
              ? "Open your private role. Keep it hidden."
              : round?.phase === "night"
                ? "Night is open. Everyone chooses one living player; only role actions count."
                : round?.phase === "day"
                  ? "Discuss the night result, then the host can start voting."
                  : round?.phase === "voting"
                    ? "Vote for one living player to remove."
                    : round?.phase === "trialResult"
                      ? "The vote result is ready. The host can start the next night."
                      : "The game is over."}
          </p>

          {round?.phase === "roleReveal" ? (
            <div className="mt-8 rounded-xl border border-hairline-strong bg-canvas p-6 text-center">
              {isSecretVisible ? (
                <>
                  <MafiaRoleBadge role={mafiaRole} />
                  <p className="mt-5 text-sm uppercase tracking-[0.4px] text-ink-tertiary">
                    Your role
                  </p>
                  <p className="mt-3 font-display text-[52px] font-semibold leading-none tracking-[-1.8px] text-ink md:text-[72px] md:tracking-[-2.6px]">
                    {mafiaRoleLabel(mafiaRole)}
                  </p>
                </>
              ) : (
                <>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
                    <ShieldHalf size={20} />
                  </span>
                  <p className="mt-5 font-display text-[28px] font-semibold tracking-[-0.6px] text-ink">
                    Ready for {currentPlayer.name}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ink-subtle">
                    Tap to see your private role.
                  </p>
                </>
              )}
              <Button
                className="mt-6 w-full"
                onClick={() => setIsSecretVisible((visible) => !visible)}
                variant={isSecretVisible ? "secondary" : "primary"}
              >
                {isSecretVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                {isSecretVisible ? "Hide role" : "See role"}
              </Button>
            </div>
          ) : null}

          {round?.phase === "night" ? (
            <div className="mt-8 rounded-xl border border-hairline-strong bg-canvas p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
                  <Moon size={18} />
                </span>
                <div>
                  <p className="font-display text-[24px] font-semibold tracking-[-0.5px] text-ink">
                    Night {dayNumber}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink-subtle">
                    {isAlive
                      ? "Choose one player, then submit privately."
                      : "You have been removed. Wait for the next result."}
                  </p>
                </div>
              </div>

              {isAlive ? (
                <div className="mt-6 grid gap-3">
                  {eligibleNightTargets.map((player) => (
                    <button
                      aria-pressed={selectedNightTargetId === player.id}
                      className={[
                        "focus-ring flex min-h-14 items-center justify-between rounded-lg border p-4 text-left transition-colors",
                        selectedNightTargetId === player.id
                          ? "border-primary/60 bg-primary/15 text-ink"
                          : "border-hairline bg-surface-2 text-ink-muted hover:border-hairline-strong hover:text-ink",
                      ].join(" ")}
                      disabled={nightProgress?.hasChosen}
                      key={player.id}
                      onClick={() => setSelectedNightTargetId(player.id)}
                      type="button"
                    >
                      <span className="font-display text-[20px] font-medium tracking-[-0.3px]">
                        {player.name}
                      </span>
                      {selectedNightTargetId === player.id ? (
                        <CheckCircle2 size={16} />
                      ) : null}
                    </button>
                  ))}
                  <Button
                    disabled={
                      !selectedNightTargetId || isBusy || nightProgress?.hasChosen
                    }
                    onClick={submitMafiaNightChoice}
                  >
                    {isBusy ? <Loader2 className="animate-spin" size={16} /> : null}
                    {nightProgress?.hasChosen ? "Choice saved" : "Submit choice"}
                  </Button>
                  {detectiveResult ? (
                    <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
                      <p className="text-sm leading-6 text-primary-hover">
                        Detective result: selected player is {detectiveResult.label}.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {round?.phase === "day" && lastNightResult ? (
            <MafiaResultPanel
              icon={lastNightResult.saved ? <HeartPulse size={20} /> : <Skull size={20} />}
              resultRole={lastNightResult.eliminatedRole}
              title={lastNightResult.message}
            />
          ) : null}

          {round?.phase === "trialResult" && lastVoteResult ? (
            <MafiaResultPanel
              icon={<Users size={20} />}
              resultRole={lastVoteResult.eliminatedRole}
              title={lastVoteResult.message}
            />
          ) : null}

          {round?.phase === "voting" ? (
            <div className="mt-8 grid gap-3">
              <VoteProgressCard
                playerCount={alivePlayers.length}
                progress={voteProgress}
              />
              {alivePlayers.map((player) => (
                <button
                  aria-pressed={selectedVoteId === player.id}
                  className={[
                    "focus-ring flex min-h-14 items-center justify-between rounded-lg border p-4 text-left transition-colors",
                    selectedVoteId === player.id
                      ? "border-primary/60 bg-primary/15 text-ink"
                      : "border-hairline bg-surface-2 text-ink-muted hover:border-hairline-strong hover:text-ink",
                  ].join(" ")}
                  disabled={voteProgress?.hasVoted || !isAlive}
                  key={player.id}
                  onClick={() => setSelectedVoteId(player.id)}
                  type="button"
                >
                  <span className="font-display text-[20px] font-medium tracking-[-0.3px]">
                    {player.name}
                  </span>
                  {selectedVoteId === player.id ? <CheckCircle2 size={16} /> : null}
                </button>
              ))}
              <Button
                disabled={!selectedVoteId || isBusy || voteProgress?.hasVoted || !isAlive}
                onClick={submitVote}
              >
                {isBusy ? <Loader2 className="animate-spin" size={16} /> : null}
                {voteProgress?.hasVoted ? "Vote recorded" : "Submit vote"}
              </Button>
            </div>
          ) : null}

          {round?.phase === "gameOver" && winner ? (
            <div className="mt-8 rounded-xl border border-hairline-strong bg-canvas p-6 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
                {winner === "mafia" ? <Skull size={20} /> : <ShieldHalf size={20} />}
              </span>
              <p className="mt-5 font-display text-[44px] font-semibold leading-none tracking-[-1.4px] text-ink">
                {winner === "mafia" ? "Mafia wins." : "Civilians win."}
              </p>
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        </section>

        <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-ink-subtle">
                Host controls
              </p>
              <h2 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.6px]">
                Alive players.
              </h2>
            </div>
            <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
              {alivePlayers.length}/{publicPlayers.length}
            </span>
          </div>

          <MafiaPlayerList players={publicPlayers} />

          {round?.phase === "night" ? (
            <NightProgressList players={alivePlayers} progress={nightProgress} />
          ) : null}

          {round?.phase === "voting" ? (
            <VoteProgressList players={alivePlayers} progress={voteProgress} />
          ) : null}

          {isHost && round?.phase === "roleReveal" ? (
            <Button
              className="mt-6 w-full"
              disabled={isBusy}
              onClick={() => setMafiaPhase("night")}
            >
              {isBusy ? <Loader2 className="animate-spin" size={16} /> : <Moon size={16} />}
              Start night
            </Button>
          ) : null}

          {isHost && round?.phase === "day" ? (
            <Button
              className="mt-6 w-full"
              disabled={isBusy}
              onClick={() => setMafiaPhase("voting")}
            >
              {isBusy ? <Loader2 className="animate-spin" size={16} /> : null}
              Start voting
            </Button>
          ) : null}

          {isHost && round?.phase === "trialResult" ? (
            <Button
              className="mt-6 w-full"
              disabled={isBusy}
              onClick={() => setMafiaPhase("night")}
            >
              {isBusy ? <Loader2 className="animate-spin" size={16} /> : <Moon size={16} />}
              Start next night
            </Button>
          ) : null}

          {isHost && round?.phase === "gameOver" ? (
            <Button
              className="mt-6 w-full"
              disabled={isBusy}
              onClick={() => setMafiaPhase("lobby")}
            >
              {isBusy ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
              Back to lobby
            </Button>
          ) : null}
        </section>
      </div>
    );
  }

  if (isRoomRoundGame && room.status !== "lobby" && currentPlayer) {
    const result = round?.content?.result as
      | {
          impostorPlayerName?: string;
          selectedPlayerName: string;
          selectedRole: "civilian" | "impostor";
          caughtImpostor: boolean;
        }
      | undefined;
    const answerReveal = (round?.content?.answerReveal ?? []) as
      QuestionAnswerReveal[];

    return (
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
          <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
            {mode.title} room
          </p>
          <h1 className="mt-3 font-display text-[42px] font-semibold leading-none tracking-[-1.4px] md:text-[64px] md:tracking-[-2.2px]">
            {code}
          </h1>
          <p className="mt-5 text-base leading-7 text-ink-muted">
            {room.status === "reveal"
              ? isQuestionRoom
                ? "Open your private question, choose the player who fits it, then submit privately."
                : "Open your private card. Keep it hidden from everyone else."
              : room.status === "discussion"
                ? "Answers are revealed. Discuss whose question may have been different."
              : room.status === "voting"
                ? "Discuss first, then each player votes from their own phone."
                : "Round result is ready."}
          </p>

          {assignment && room.status === "reveal" ? (
            <div className="mt-8 rounded-xl border border-hairline-strong bg-canvas p-6 text-center">
              {isSecretVisible ? (
                <>
                  {showRoles ? (
                    <RoleBadge
                      role={assignment.role === "impostor" ? "impostor" : "civilian"}
                    />
                  ) : null}
                  <p className="mt-5 text-sm uppercase tracking-[0.4px] text-ink-tertiary">
                    Your {secretNoun}
                  </p>
                  {room.game_id === "picture-match" && assignment.secret_image ? (
                    <Image
                      alt={assignment.secret}
                      className="mx-auto mt-4 aspect-[4/3] w-full max-w-md rounded-lg border border-hairline object-cover"
                      height={384}
                      priority
                      src={assignment.secret_image}
                      width={512}
                    />
                  ) : (
                    <p
                      className={[
                        "mt-3 font-display font-semibold text-ink",
                        isQuestionRoom
                          ? "text-[28px] leading-tight tracking-[-0.8px] md:text-[36px] md:tracking-[-1.1px]"
                          : "text-[52px] leading-none tracking-[-1.8px] md:text-[72px] md:tracking-[-2.6px]",
                      ].join(" ")}
                    >
                      {assignment.secret}
                    </p>
                  )}
                  {isQuestionRoom ? (
                    <div className="mt-6 grid gap-3 text-left">
                      <p className="text-sm leading-6 text-ink-subtle">
                        Pick one player as your answer. Nobody sees choices until
                        everyone has submitted.
                      </p>
                      {players.map((player) => (
                        <button
                          aria-pressed={selectedAnswerId === player.id}
                          className={[
                            "focus-ring flex min-h-12 items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                            selectedAnswerId === player.id
                              ? "border-primary/60 bg-primary/15 text-ink"
                              : "border-hairline bg-surface-2 text-ink-muted hover:border-hairline-strong hover:text-ink",
                          ].join(" ")}
                          disabled={answerProgress?.hasAnswered}
                          key={player.id}
                          onClick={() => setSelectedAnswerId(player.id)}
                          type="button"
                        >
                          <span className="font-display text-[18px] font-medium tracking-[-0.2px]">
                            {player.name}
                          </span>
                          {selectedAnswerId === player.id ? (
                            <CheckCircle2 size={16} />
                          ) : null}
                        </button>
                      ))}
                      <Button
                        disabled={
                          !selectedAnswerId || isBusy || answerProgress?.hasAnswered
                        }
                        onClick={submitQuestionAnswer}
                      >
                        {isBusy ? <Loader2 className="animate-spin" size={16} /> : null}
                        {answerProgress?.hasAnswered
                          ? "Answer recorded"
                          : "Submit answer"}
                      </Button>
                      {answerProgress?.hasAnswered ? (
                        <p className="rounded-lg border border-primary/25 bg-primary/10 p-4 text-sm leading-6 text-primary-hover">
                          Your answer is in. Waiting for{" "}
                          {Math.max(answerProgress.needed - answerProgress.answers, 0)}{" "}
                          more{" "}
                          {answerProgress.needed - answerProgress.answers === 1
                            ? "player"
                            : "players"}.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
                    <Eye size={20} />
                  </span>
                  <p className="mt-5 font-display text-[28px] font-semibold tracking-[-0.6px] text-ink">
                    Ready for {currentPlayer.name}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ink-subtle">
                    Tap to see your private {secretNoun}.
                  </p>
                </>
              )}
              <Button
                className="mt-6 w-full"
                onClick={() => setIsSecretVisible((visible) => !visible)}
                variant={isSecretVisible ? "secondary" : "primary"}
              >
                {isSecretVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                {isSecretVisible ? `Hide ${secretNoun}` : `See ${secretNoun}`}
              </Button>
            </div>
          ) : null}

          {isQuestionRoom && room.status === "discussion" ? (
            <div className="mt-8 rounded-xl border border-hairline-strong bg-canvas p-6">
              <p className="text-sm uppercase tracking-[0.4px] text-ink-tertiary">
                Answers
              </p>
              <h2 className="mt-2 font-display text-[30px] font-semibold tracking-[-0.7px] text-ink">
                Compare the choices.
              </h2>
              <AnswerRevealList answers={answerReveal} />
            </div>
          ) : null}

          {room.status === "voting" ? (
            <div className="mt-8 grid gap-3">
              <VoteProgressCard playerCount={players.length} progress={voteProgress} />
              {players.map((player) => (
                <button
                  aria-pressed={selectedVoteId === player.id}
                  className={[
                    "focus-ring flex min-h-14 items-center justify-between rounded-lg border p-4 text-left transition-colors",
                    selectedVoteId === player.id
                      ? "border-primary/60 bg-primary/15 text-ink"
                      : "border-hairline bg-surface-2 text-ink-muted hover:border-hairline-strong hover:text-ink",
                  ].join(" ")}
                  disabled={voteProgress?.hasVoted}
                  key={player.id}
                  onClick={() => setSelectedVoteId(player.id)}
                  type="button"
                >
                  <span className="font-display text-[20px] font-medium tracking-[-0.3px]">
                    {player.name}
                  </span>
                  {selectedVoteId === player.id ? <CheckCircle2 size={16} /> : null}
                </button>
              ))}
              <Button
                disabled={!selectedVoteId || isBusy || voteProgress?.hasVoted}
                onClick={submitVote}
              >
                {isBusy ? <Loader2 className="animate-spin" size={16} /> : null}
                {voteProgress?.hasVoted ? "Vote recorded" : "Submit vote"}
              </Button>
              {voteProgress?.hasVoted ? (
                <p className="rounded-lg border border-primary/25 bg-primary/10 p-4 text-sm leading-6 text-primary-hover">
                  Your vote is in. Waiting for{" "}
                  {Math.max(voteProgress.needed - voteProgress.votes, 0)} more{" "}
                  {voteProgress.needed - voteProgress.votes === 1 ? "player" : "players"}.
                </p>
              ) : null}
            </div>
          ) : null}

          {room.status === "result" && result ? (
            <div className="mt-8 rounded-xl border border-hairline-strong bg-canvas p-6 text-center">
              <p className="text-sm uppercase tracking-[0.4px] text-ink-tertiary">
                Voted player
              </p>
              <p className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-1.4px] text-ink">
                {result.selectedPlayerName}
              </p>
              <RoleBadge className="mt-5" role={result.selectedRole} />
              <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-ink-subtle">
                {result.caughtImpostor
                  ? "The group found the impostor."
                  : "That player was a civilian."}
              </p>
              {result.impostorPlayerName ? (
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-subtle">
                  The impostor was {result.impostorPlayerName}.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        </section>

        <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-ink-subtle">
                Host controls
              </p>
              <h2 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.6px]">
                Players in round.
              </h2>
            </div>
            <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
              {players.length}
            </span>
          </div>

          <PlayerList players={players} />

          {isQuestionRoom && room.status === "reveal" ? (
            <AnswerProgressList players={players} progress={answerProgress} />
          ) : null}

          {room.status === "voting" ? (
            <VoteProgressList players={players} progress={voteProgress} />
          ) : null}

          {isHost && isMatchRoom && room.status === "reveal" ? (
            <Button
              className="mt-6 w-full"
              disabled={isBusy}
              onClick={() => setRoomPhase("voting")}
            >
              {isBusy ? <Loader2 className="animate-spin" size={16} /> : null}
              Start voting
            </Button>
          ) : null}

          {isHost && isQuestionRoom && room.status === "discussion" ? (
            <Button
              className="mt-6 w-full"
              disabled={isBusy}
              onClick={() => setRoomPhase("voting")}
            >
              {isBusy ? <Loader2 className="animate-spin" size={16} /> : null}
              Start voting
            </Button>
          ) : null}

          {isHost && room.status === "result" ? (
            <div className="mt-6 grid gap-3">
              <Button
                className="w-full"
                disabled={isBusy}
                onClick={() => setRoomPhase("lobby")}
              >
                {isBusy ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
                Back to lobby
              </Button>
              <p className="text-sm leading-6 text-ink-subtle">
                Wait for new players here, then start the next round from the lobby.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
        <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
          {mode.title} room
        </p>
        <h1 className="mt-3 font-display text-[42px] font-semibold leading-none tracking-[-1.4px] md:text-[64px] md:tracking-[-2.2px]">
          {code}
        </h1>
        <p className="mt-5 text-base leading-7 text-ink-muted">
          Share this code with friends. The player list updates live as they join.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={copyRoomCode} variant="secondary">
            {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {isCopied ? "Copied" : "Copy code"}
          </Button>
        </div>

        {currentPlayer ? (
          <div className="mt-8 rounded-lg border border-hairline bg-surface-2 p-4">
            <p className="text-sm text-ink-subtle">You joined as</p>
            <p className="mt-1 font-display text-[24px] font-semibold tracking-[-0.5px] text-ink">
              {currentPlayer.name}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.4px] text-ink-tertiary">
              {isHost ? "Host" : "Player"}
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-hairline bg-surface-2 p-4">
            <label className="text-sm font-medium text-ink-muted" htmlFor="join-name">
              Your name
            </label>
            <input
              className="focus-ring mt-2 min-h-11 w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-base text-ink placeholder:text-ink-tertiary"
              id="join-name"
              maxLength={24}
              onChange={(event) => setJoinName(event.target.value)}
              placeholder="Enter name"
              value={joinName}
            />
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
            <Button
              className="mt-4 w-full"
              disabled={isJoining}
              onClick={handleJoinRoom}
            >
              {isJoining ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}
              Join room
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-ink-subtle">
              Lobby
            </p>
            <h2 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.6px]">
              Players joined.
            </h2>
          </div>
          <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
            {players.length}
          </span>
        </div>

        <PlayerList players={players} />

        {isHost ? (
          <>
            {isMafiaRoom ? (
              <div className="mt-6 grid gap-3">
                <div className="rounded-lg border border-hairline bg-surface-2 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-[20px] font-medium tracking-[-0.3px] text-ink">
                        Mafia players
                      </p>
                      <p className="mt-2 text-sm leading-6 text-ink-subtle">
                        Keep this low so the town has room to investigate.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={isBusy || mafiaSettings.mafiaCount <= 1}
                        onClick={() =>
                          updateRoomSettings({
                            mafiaCount: mafiaSettings.mafiaCount - 1,
                          })
                        }
                        size="sm"
                        variant="secondary"
                      >
                        <Minus size={16} />
                      </Button>
                      <span className="grid h-10 w-10 place-items-center rounded-md border border-hairline-strong bg-canvas text-sm text-ink">
                        {mafiaSettings.mafiaCount}
                      </span>
                      <Button
                        disabled={
                          isBusy ||
                          mafiaSettings.mafiaCount >=
                            Math.max(1, Math.floor(players.length / 3))
                        }
                        onClick={() =>
                          updateRoomSettings({
                            mafiaCount: mafiaSettings.mafiaCount + 1,
                          })
                        }
                        size="sm"
                        variant="secondary"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
                <SettingToggle
                  body={
                    mafiaSettings.includeDoctor
                      ? "One Doctor can save the same player targeted by Mafia."
                      : "No save role. Mafia kills go through unless the town votes them out."
                  }
                  checked={mafiaSettings.includeDoctor}
                  disabled={isBusy}
                  icon={<HeartPulse size={18} />}
                  label="Include Doctor"
                  onChange={(includeDoctor) => updateRoomSettings({ includeDoctor })}
                />
                <SettingToggle
                  body={
                    mafiaSettings.includeDetective
                      ? "One Detective privately learns the role of the player they choose at night."
                      : "No investigation role. The town only has discussion and votes."
                  }
                  checked={mafiaSettings.includeDetective}
                  disabled={isBusy}
                  icon={<Eye size={18} />}
                  label="Include Detective"
                  onChange={(includeDetective) =>
                    updateRoomSettings({ includeDetective })
                  }
                />
                <SettingToggle
                  body={
                    mafiaSettings.revealRolesOnRemoval
                      ? "Removed players show their role after night kill or vote."
                      : "Removed players leave without showing their role."
                  }
                  checked={mafiaSettings.revealRolesOnRemoval}
                  disabled={isBusy}
                  icon={<Eye size={18} />}
                  label="Reveal removed roles"
                  onChange={(revealRolesOnRemoval) =>
                    updateRoomSettings({ revealRolesOnRemoval })
                  }
                />
              </div>
            ) : isRoomRoundGame ? (
              <div className="mt-6 grid gap-3">
                <SettingToggle
                  body={
                    showRoles
                      ? "Players will see whether they are civilian or impostor."
                      : `Players only see their ${secretNoun}. No one is told if they are the impostor.`
                  }
                  checked={showRoles}
                  disabled={isBusy}
                  icon={showRoles ? <Eye size={18} /> : <EyeOff size={18} />}
                  label="Show civilian / impostor role"
                  onChange={updateShowRoles}
                />
              </div>
            ) : null}

            <div className="mt-6 rounded-lg border border-hairline bg-canvas p-4">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
                  <Users size={18} />
                </span>
                <div>
                  <p className="font-display text-[20px] font-medium tracking-[-0.3px] text-ink">
                    {isRoomRoundGame
                      ? `Ready to start ${mode.title}.`
                      : "Round controls are next."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-subtle">
                    {isRoomRoundGame
                      ? "Start a separate-phone round once everyone has joined."
                      : "This lobby proves create, join, and live player sync."}
                  </p>
                </div>
              </div>
              {isRoomRoundGame ? (
                <Button
                  className="mt-5 w-full"
                  disabled={players.length < mode.minPlayers || isBusy}
                  onClick={startRoomRound}
                >
                  {isBusy ? <Loader2 className="animate-spin" size={16} /> : null}
                  Start round
                </Button>
              ) : null}
            </div>
          </>
        ) : isMafiaRoom ? (
          <div className="mt-6 rounded-lg border border-hairline bg-canvas p-4">
            <p className="font-display text-[20px] font-medium tracking-[-0.3px] text-ink">
              Mafia setup is ready.
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-subtle">
              Wait for the host to start. Your role will appear privately on this
              phone.
            </p>
          </div>
        ) : isRoomRoundGame ? (
          <div className="mt-6 rounded-lg border border-hairline bg-canvas p-4">
            <p className="font-display text-[20px] font-medium tracking-[-0.3px] text-ink">
              Role reveal is {showRoles ? "on" : "off"}.
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-subtle">
              {showRoles
                ? "Your private card will show whether you are civilian or impostor."
                : `Your private card will only show your ${secretNoun}.`}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function getShowRoles(room: Room, round: Round | null) {
  const roundSettings = round?.content?.settings;

  if (
    roundSettings &&
    typeof roundSettings === "object" &&
    "showRoles" in roundSettings
  ) {
    return (roundSettings as { showRoles?: unknown }).showRoles !== false;
  }

  return room.settings?.showRoles !== false;
}

function getMafiaSettings(settings: MafiaSettings | undefined, playerCount: number) {
  return {
    ...defaultMafiaSettings(playerCount),
    ...(settings ?? {}),
  };
}

function getRoomLoadError(error: unknown) {
  if (error instanceof RoomNotFoundError) return error.message;
  if (error instanceof Error) return error.message;
  return "It may have expired after being inactive, or the room code may be wrong.";
}

function PlayerList({ players }: { players: RoomPlayer[] }) {
  return (
    <div className="mt-5 grid gap-3">
      {players.map((player) => (
        <div
          className="flex min-h-14 items-center justify-between rounded-lg border border-hairline bg-surface-2 p-4"
          key={player.id}
        >
          <span className="font-display text-[20px] font-medium tracking-[-0.3px]">
            {player.name}
          </span>
          {player.is_host ? (
            <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-1 text-xs uppercase tracking-[0.4px] text-primary-hover">
              Host
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MafiaPlayerList({ players }: { players: MafiaPublicPlayer[] }) {
  return (
    <div className="mt-5 grid gap-3">
      {players.map((player) => (
        <div
          className={[
            "flex min-h-14 items-center justify-between rounded-lg border p-4",
            player.alive
              ? "border-hairline bg-surface-2"
              : "border-hairline bg-canvas text-ink-tertiary",
          ].join(" ")}
          key={player.id}
        >
          <span className="font-display text-[20px] font-medium tracking-[-0.3px]">
            {player.name}
          </span>
          <span className="rounded-full border border-hairline-strong bg-canvas px-2 py-1 text-xs uppercase tracking-[0.4px] text-ink-tertiary">
            {player.alive ? "Alive" : "Removed"}
          </span>
        </div>
      ))}
    </div>
  );
}

function MafiaResultPanel({
  icon,
  resultRole,
  title,
}: {
  icon: ReactNode;
  resultRole?: MafiaRole | null;
  title: string;
}) {
  return (
    <div className="mt-8 rounded-xl border border-hairline-strong bg-canvas p-6 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
        {icon}
      </span>
      <p className="mx-auto mt-5 max-w-md font-display text-[34px] font-semibold leading-tight tracking-[-1px] text-ink md:text-[44px] md:tracking-[-1.4px]">
        {title}
      </p>
      {resultRole ? <MafiaRoleBadge className="mt-5" role={resultRole} /> : null}
    </div>
  );
}

function MafiaRoleBadge({
  className = "",
  role,
}: {
  className?: string;
  role: MafiaRole;
}) {
  const classes: Record<MafiaRole, string> = {
    mafia: "border-red-500/40 bg-red-500/12 text-red-300",
    doctor: "border-primary/40 bg-primary/15 text-primary-hover",
    detective: "border-primary/40 bg-primary/15 text-primary-hover",
    civilian: "border-hairline-strong bg-surface-2 text-ink-muted",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.4px]",
        classes[role],
        className,
      ].join(" ")}
    >
      {mafiaRoleLabel(role)}
    </span>
  );
}

function NightProgressList({
  players,
  progress,
}: {
  players: { id: string; name: string }[];
  progress: NightProgress | null;
}) {
  const chosenPlayerIds = new Set(progress?.chosenPlayerIds ?? []);
  const choices = progress?.choices ?? 0;
  const needed = progress?.needed ?? players.length;
  const percent = needed > 0 ? Math.round((choices / needed) * 100) : 0;

  return (
    <div className="mt-6 rounded-lg border border-hairline bg-canvas p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-display text-[20px] font-medium tracking-[-0.3px] text-ink">
          {choices}/{needed || "-"} chosen
        </p>
        {progress?.hasChosen ? (
          <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-1 text-xs uppercase tracking-[0.4px] text-primary-hover">
            Your choice is in
          </span>
        ) : null}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-4 grid gap-2">
        {players.map((player) => {
          const hasChosen = chosenPlayerIds.has(player.id);

          return (
            <div
              className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-hairline bg-surface-2 px-3 py-2"
              key={player.id}
            >
              <span className="text-sm text-ink-muted">{player.name}</span>
              <span
                className={[
                  "rounded-full border px-2 py-1 text-xs uppercase tracking-[0.4px]",
                  hasChosen
                    ? "border-primary/40 bg-primary/15 text-primary-hover"
                    : "border-hairline-strong bg-canvas text-ink-tertiary",
                ].join(" ")}
              >
                {hasChosen ? "Chosen" : "Waiting"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnswerRevealList({ answers }: { answers: QuestionAnswerReveal[] }) {
  return (
    <div className="mt-5 grid gap-3">
      {answers.map((answer) => (
        <div
          className="rounded-lg border border-hairline bg-surface-2 p-4"
          key={answer.playerId}
        >
          <p className="text-sm text-ink-subtle">{answer.playerName} answered</p>
          <p className="mt-1 font-display text-[24px] font-semibold tracking-[-0.5px] text-ink">
            {answer.targetPlayerName}
          </p>
        </div>
      ))}
    </div>
  );
}

function AnswerProgressList({
  players,
  progress,
}: {
  players: RoomPlayer[];
  progress: AnswerProgress | null;
}) {
  const answeredPlayerIds = new Set(progress?.answeredPlayerIds ?? []);
  const answers = progress?.answers ?? 0;
  const needed = progress?.needed ?? players.length;
  const percent = needed > 0 ? Math.round((answers / needed) * 100) : 0;

  return (
    <div className="mt-6 rounded-lg border border-hairline bg-canvas p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-display text-[20px] font-medium tracking-[-0.3px] text-ink">
          {answers}/{needed || "-"} answered
        </p>
        {progress?.hasAnswered ? (
          <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-1 text-xs uppercase tracking-[0.4px] text-primary-hover">
            Your answer is in
          </span>
        ) : null}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-4 grid gap-2">
        {players.map((player) => {
          const hasAnswered = answeredPlayerIds.has(player.id);

          return (
            <div
              className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-hairline bg-surface-2 px-3 py-2"
              key={player.id}
            >
              <span className="text-sm text-ink-muted">{player.name}</span>
              <span
                className={[
                  "rounded-full border px-2 py-1 text-xs uppercase tracking-[0.4px]",
                  hasAnswered
                    ? "border-primary/40 bg-primary/15 text-primary-hover"
                    : "border-hairline-strong bg-canvas text-ink-tertiary",
                ].join(" ")}
              >
                {hasAnswered ? "Answered" : "Waiting"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VoteProgressCard({
  playerCount,
  progress,
}: {
  playerCount: number;
  progress: VoteProgress | null;
}) {
  const votes = progress?.votes ?? 0;
  const needed = progress?.needed ?? playerCount;
  const percent = needed > 0 ? Math.round((votes / needed) * 100) : 0;

  return (
    <div className="rounded-lg border border-hairline bg-canvas p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-display text-[20px] font-medium tracking-[-0.3px] text-ink">
          {votes}/{needed || "-"} voted
        </p>
        {progress?.hasVoted ? (
          <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-1 text-xs uppercase tracking-[0.4px] text-primary-hover">
            Your vote is in
          </span>
        ) : null}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-subtle">
        Result appears automatically when everyone has voted.
      </p>
    </div>
  );
}

function VoteProgressList({
  players,
  progress,
}: {
  players: { id: string; name: string }[];
  progress: VoteProgress | null;
}) {
  const votedPlayerIds = new Set(progress?.votedPlayerIds ?? []);

  return (
    <div className="mt-6 rounded-lg border border-hairline bg-canvas p-4">
      <p className="font-display text-[20px] font-medium tracking-[-0.3px] text-ink">
        Voting progress
      </p>
      <div className="mt-4 grid gap-2">
        {players.map((player) => {
          const hasVoted = votedPlayerIds.has(player.id);

          return (
            <div
              className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-hairline bg-surface-2 px-3 py-2"
              key={player.id}
            >
              <span className="text-sm text-ink-muted">{player.name}</span>
              <span
                className={[
                  "rounded-full border px-2 py-1 text-xs uppercase tracking-[0.4px]",
                  hasVoted
                    ? "border-primary/40 bg-primary/15 text-primary-hover"
                    : "border-hairline-strong bg-canvas text-ink-tertiary",
                ].join(" ")}
              >
                {hasVoted ? "Voted" : "Waiting"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleBadge({
  className = "",
  role,
}: {
  className?: string;
  role: "civilian" | "impostor";
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.4px]",
        role === "impostor"
          ? "border-red-500/40 bg-red-500/12 text-red-300"
          : "border-primary/40 bg-primary/15 text-primary-hover",
        className,
      ].join(" ")}
    >
      {role === "impostor" ? "Impostor" : "Civilian"}
    </span>
  );
}

function SettingToggle({
  body,
  checked,
  disabled = false,
  icon,
  label,
  onChange,
}: {
  body: string;
  checked: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className={[
        "focus-ring flex min-h-[112px] w-full items-start justify-between gap-4 rounded-lg border border-hairline bg-surface-2 p-4 text-left transition-colors hover:border-hairline-strong",
        disabled ? "cursor-not-allowed opacity-70" : "",
      ].join(" ")}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-hairline-strong bg-surface-3 text-primary">
          {icon}
        </span>
        <span>
          <span className="block font-display text-[20px] font-medium tracking-[-0.3px] text-ink">
            {label}
          </span>
          <span className="mt-2 block text-sm leading-6 text-ink-subtle">
            {body}
          </span>
        </span>
      </span>
      <span
        className={[
          "relative mt-1 h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked
            ? "border-primary/50 bg-primary"
            : "border-hairline-strong bg-canvas",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-5" : "translate-x-1",
          ].join(" ")}
        />
      </span>
    </button>
  );
}
