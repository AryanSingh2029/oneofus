"use client";

import { Loader2, MonitorSmartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GameMode } from "@/lib/game-modes";
import { createRoom, saveLocalRoomSession } from "@/lib/rooms";

export function CreateRoomForm({ mode }: { mode: GameMode }) {
  const router = useRouter();
  const [hostName, setHostName] = useState("Host");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateRoom() {
    const trimmedName = hostName.trim();

    if (!trimmedName) {
      setError("Enter a host name first.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      fetch("/api/rooms/cleanup", { method: "POST" }).catch(() => undefined);
      const { session } = await createRoom({
        gameId: mode.id,
        hostName: trimmedName,
      });

      saveLocalRoomSession(session);
      router.push(`/rooms/${session.code}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create the room.",
      );
    } finally {
      setIsCreating(false);
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
            Create a {mode.title} room.
          </h1>
          <p className="mt-5 text-base leading-7 text-ink-muted">
            Friends join with a room code from their own phones. The host starts
            the round once everyone is in.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <label
          className="text-sm font-medium text-ink-muted"
          htmlFor="host-name"
        >
          Host name
        </label>
        <input
          className="focus-ring mt-2 min-h-11 w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-base text-ink placeholder:text-ink-tertiary"
          id="host-name"
          maxLength={24}
          onChange={(event) => setHostName(event.target.value)}
          placeholder="Host"
          value={hostName}
        />
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button disabled={isCreating} onClick={handleCreateRoom}>
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : null}
          Create room
        </Button>
      </div>
    </section>
  );
}
