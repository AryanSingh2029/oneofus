"use client";

import { Loader2, LogIn, MonitorSmartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GameMode } from "@/lib/game-modes";
import { joinRoom, saveLocalRoomSession } from "@/lib/rooms";

export function JoinRoomForm({ mode }: { mode: GameMode }) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoinRoom() {
    const trimmedCode = roomCode.trim();
    const trimmedName = playerName.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      setError("Enter the 6-digit room code.");
      return;
    }

    if (!trimmedName) {
      setError("Enter your name first.");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const joinedRoom = await joinRoom({
        code: trimmedCode,
        gameId: mode.id,
        name: trimmedName,
      });

      saveLocalRoomSession(joinedRoom.session);
      router.push(`/rooms/${joinedRoom.session.code}`);
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Could not join room.",
      );
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-hairline-strong bg-surface-3 text-primary">
          <MonitorSmartphone size={20} />
        </span>
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
            Separate phones
          </p>
          <h1 className="mt-2 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
            Join a {mode.title} room.
          </h1>
          <p className="mt-5 text-base leading-7 text-ink-muted">
            Enter the code from the host, add your name, and your phone becomes
            your private game screen.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5">
        <div>
          <label
            className="text-sm font-medium text-ink-muted"
            htmlFor="room-code"
          >
            Room code
          </label>
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-base text-ink placeholder:text-ink-tertiary"
            id="room-code"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) =>
              setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            value={roomCode}
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-ink-muted"
            htmlFor="player-name"
          >
            Your name
          </label>
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-base text-ink placeholder:text-ink-tertiary"
            id="player-name"
            maxLength={24}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Enter name"
            value={playerName}
          />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button disabled={isJoining} onClick={handleJoinRoom}>
          {isJoining ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}
          Join room
        </Button>
      </div>
    </section>
  );
}
