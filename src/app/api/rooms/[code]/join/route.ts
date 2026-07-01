import { NextResponse } from "next/server";
import type { GameMode } from "@/lib/game-modes";
import { nextRoomExpiry } from "@/lib/room-expiry";
import {
  createToken,
  redactRoom,
  redactRoomPlayer,
  type LocalRoomSession,
} from "@/lib/rooms";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const { gameId, name } = (await request.json()) as {
      gameId?: GameMode["id"];
      name?: string;
    };
    const trimmedName = name?.trim();

    if (!trimmedName) {
      return NextResponse.json({ error: "Enter your name first." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "This room does not exist or has expired." },
        { status: 404 },
      );
    }

    if (gameId && room.game_id !== gameId) {
      return NextResponse.json(
        { error: "This code belongs to a different game." },
        { status: 400 },
      );
    }

    if (room.status !== "lobby") {
      return NextResponse.json(
        { error: "A round is in progress. Join when the room returns to lobby." },
        { status: 409 },
      );
    }

    const playerToken = createToken();
    const { data: player, error: playerError } = await supabase
      .from("room_players")
      .insert({
        room_id: room.id,
        name: trimmedName,
        player_token: playerToken,
        is_host: false,
      })
      .select("*")
      .single();

    if (playerError) throw playerError;

    const { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({ expires_at: nextRoomExpiry() })
      .eq("id", room.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      room: redactRoom(updatedRoom),
      player: redactRoomPlayer(player),
      session: {
        code,
        playerId: player.id,
        playerToken,
      } satisfies LocalRoomSession,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not join room." },
      { status: 500 },
    );
  }
}
