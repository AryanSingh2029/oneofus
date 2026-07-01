import { NextResponse } from "next/server";
import { getGameMode, type GameMode } from "@/lib/game-modes";
import { nextRoomExpiry } from "@/lib/room-expiry";
import {
  createRoomCode,
  createToken,
  redactRoom,
  redactRoomPlayer,
  type LocalRoomSession,
} from "@/lib/rooms";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { gameId, hostName } = (await request.json()) as {
      gameId?: GameMode["id"];
      hostName?: string;
    };
    const trimmedHostName = hostName?.trim();

    if (!gameId || !getGameMode(gameId)) {
      return NextResponse.json({ error: "Choose a valid game." }, { status: 400 });
    }

    if (!trimmedHostName) {
      return NextResponse.json({ error: "Enter the host name." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const hostToken = createToken();
    const playerToken = createToken();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = createRoomCode();
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert({
          code,
          game_id: gameId,
          host_token: hostToken,
          settings: { showRoles: true },
          expires_at: nextRoomExpiry(),
        })
        .select("*")
        .single();

      if (roomError) {
        if (roomError.code === "23505") continue;
        throw roomError;
      }

      const { data: player, error: playerError } = await supabase
        .from("room_players")
        .insert({
          room_id: room.id,
          name: trimmedHostName,
          player_token: playerToken,
          is_host: true,
        })
        .select("*")
        .single();

      if (playerError) throw playerError;

      const { data: updatedRoom, error: updateError } = await supabase
        .from("rooms")
        .update({ expires_at: nextRoomExpiry(), host_player_id: player.id })
        .eq("id", room.id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        room: redactRoom(updatedRoom),
        player: redactRoomPlayer(player),
        session: {
          code,
          hostToken,
          playerId: player.id,
          playerToken,
        } satisfies LocalRoomSession,
      });
    }

    return NextResponse.json(
      { error: "Could not create a unique room code. Try again." },
      { status: 500 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create room." },
      { status: 500 },
    );
  }
}
