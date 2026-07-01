import { NextResponse } from "next/server";
import { defaultMafiaSettings, shuffle, type MafiaRole } from "@/lib/mafia";
import { nextRoomExpiry } from "@/lib/room-expiry";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const { hostToken } = (await request.json()) as { hostToken?: string };

    if (!hostToken) {
      return NextResponse.json({ error: "Missing host token." }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    if (room.game_id !== "mafia") {
      return NextResponse.json({ error: "This room is not a Mafia room." }, { status: 400 });
    }

    if (room.host_token !== hostToken) {
      return NextResponse.json({ error: "Only the host can start." }, { status: 403 });
    }

    if (room.status !== "lobby") {
      return NextResponse.json(
        { error: "Start a new game from the lobby." },
        { status: 400 },
      );
    }

    const { data: players, error: playersError } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });

    if (playersError) throw playersError;

    if (!players || players.length < 5) {
      return NextResponse.json(
        { error: "Mafia needs at least 5 players." },
        { status: 400 },
      );
    }

    const settings = {
      ...defaultMafiaSettings(players.length),
      ...(room.settings ?? {}),
    };
    const maxMafiaCount = Math.max(1, Math.floor(players.length / 3));
    const mafiaCount = Math.min(
      Math.max(Number(settings.mafiaCount) || 1, 1),
      maxMafiaCount,
    );
    const roleSlots =
      mafiaCount + Number(settings.includeDoctor) + Number(settings.includeDetective);

    if (players.length - roleSlots < 1) {
      return NextResponse.json(
        { error: "Add more players or reduce special roles." },
        { status: 400 },
      );
    }

    const playerIndexes = players.map((_, index) => index);
    const mafiaIndexes = new Set(shuffle(playerIndexes).slice(0, mafiaCount));
    const doctorIndex = settings.includeDoctor
      ? shuffle(playerIndexes.filter((index) => !mafiaIndexes.has(index)))[0]
      : undefined;
    const detectiveIndex = settings.includeDetective
      ? shuffle(
          playerIndexes.filter(
            (index) => !mafiaIndexes.has(index) && index !== doctorIndex,
          ),
        )[0]
      : undefined;

    const assignments = players.map((player, index) => {
      const role: MafiaRole = mafiaIndexes.has(index)
        ? "mafia"
        : index === doctorIndex
          ? "doctor"
          : index === detectiveIndex
            ? "detective"
            : "civilian";

      return {
        player,
        role,
      };
    });

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        room_id: room.id,
        round_number: 1,
        phase: "roleReveal",
        content: {
          gameId: "mafia",
          dayNumber: 1,
          settings,
          players: players.map((player) => ({
            id: player.id,
            name: player.name,
            alive: true,
          })),
          nightChoices: [],
          result: null,
        },
      })
      .select()
      .single();

    if (roundError) throw roundError;

    const assignmentRows = assignments.map(({ player, role }) => ({
      round_id: round.id,
      player_id: player.id,
      role,
      secret: role,
      metadata: {},
    }));
    const { error: assignmentError } = await supabase
      .from("round_assignments")
      .insert(assignmentRows);

    if (assignmentError) throw assignmentError;

    const { error: roomUpdateError } = await supabase
      .from("rooms")
      .update({ expires_at: nextRoomExpiry(), settings, status: "reveal" })
      .eq("id", room.id);

    if (roomUpdateError) throw roomUpdateError;

    return NextResponse.json({ roundId: round.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start Mafia." },
      { status: 500 },
    );
  }
}
