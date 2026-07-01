import { NextResponse } from "next/server";
import {
  redactRoom,
  redactRoomPlayer,
  redactRound,
  type Round,
} from "@/lib/rooms";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code)
      .gt("expires_at", now)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "This room does not exist or has expired." },
        { status: 404 },
      );
    }

    const { data: players, error: playersError } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });

    if (playersError) throw playersError;

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Round>();

    if (roundError) throw roundError;

    return NextResponse.json({
      room: redactRoom(room),
      players: (players ?? []).map(redactRoomPlayer),
      round: round ? redactRound(round) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load room." },
      { status: 500 },
    );
  }
}
