import { NextResponse } from "next/server";
import {
  chooseMostCommonTarget,
  getMafiaWinner,
  mafiaRoleLabel,
  type MafiaNightChoice,
  type MafiaPublicPlayer,
  type MafiaRole,
} from "@/lib/mafia";
import { nextRoomExpiry } from "@/lib/room-expiry";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

type NightProgress = {
  hasChosen: boolean;
  needed: number;
  choices: number;
  chosenPlayerIds: string[];
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");
    const playerToken = url.searchParams.get("playerToken");

    if (!playerId || !playerToken) {
      return NextResponse.json({ error: "Missing player session." }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const { room, player, round } = await getMafiaContext(
      supabase,
      code,
      playerId,
      playerToken,
    );

    const progress = getNightProgress(round.content, player.id);
    await refreshRoom(supabase, room.id);

    return NextResponse.json(progress);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load night progress." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const { playerId, playerToken, targetPlayerId } = (await request.json()) as {
      playerId?: string;
      playerToken?: string;
      targetPlayerId?: string;
    };

    if (!playerId || !playerToken || !targetPlayerId) {
      return NextResponse.json({ error: "Missing night choice." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { room, player, round, assignment } = await getMafiaContext(
      supabase,
      code,
      playerId,
      playerToken,
    );

    if (room.status !== "reveal" || round.phase !== "night") {
      return NextResponse.json(
        { error: "Night choices are not open." },
        { status: 400 },
      );
    }

    const publicPlayers = getPublicPlayers(round.content);
    const actingPlayer = publicPlayers.find((candidate) => candidate.id === player.id);
    const targetPlayer = publicPlayers.find((candidate) => candidate.id === targetPlayerId);

    if (!actingPlayer?.alive) {
      return NextResponse.json({ error: "Removed players cannot act." }, { status: 400 });
    }

    if (!targetPlayer?.alive || targetPlayer.id === player.id) {
      return NextResponse.json({ error: "Choose a living player." }, { status: 400 });
    }

    const choices = getNightChoices(round.content)
      .filter((choice) => choice.playerId !== player.id)
      .concat({ playerId: player.id, targetPlayerId });
    const nextContent = {
      ...round.content,
      nightChoices: choices,
    };
    const progress = getNightProgress(nextContent, player.id);

    if (progress.choices >= progress.needed) {
      const resolved = await resolveNight(supabase, round.id, nextContent);

      const { error: updateRoundError } = await supabase
        .from("rounds")
        .update({ phase: resolved.winner ? "gameOver" : "day", content: resolved.content })
        .eq("id", round.id);

      if (updateRoundError) throw updateRoundError;

      const { error: updateRoomError } = await supabase
        .from("rooms")
        .update({
          expires_at: nextRoomExpiry(),
          status: resolved.winner ? "ended" : "discussion",
        })
        .eq("id", room.id);

      if (updateRoomError) throw updateRoomError;
    } else {
      const { error: updateRoundError } = await supabase
        .from("rounds")
        .update({ content: nextContent })
        .eq("id", round.id);

      if (updateRoundError) throw updateRoundError;
      await refreshRoom(supabase, room.id);
    }

    const role = assignment.role as MafiaRole;
    const detectiveResult =
      role === "detective"
        ? await getTargetRole(supabase, round.id, targetPlayerId)
        : null;

    return NextResponse.json({
      ...progress,
      hasChosen: true,
      detectiveResult,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not submit night choice." },
      { status: 500 },
    );
  }
}

async function getMafiaContext(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  code: string,
  playerId: string,
  playerToken: string,
) {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .single();

  if (roomError || !room) throw new Error("Room not found.");
  if (room.game_id !== "mafia") throw new Error("This room is not a Mafia room.");

  const { data: player, error: playerError } = await supabase
    .from("room_players")
    .select("*")
    .eq("id", playerId)
    .eq("room_id", room.id)
    .eq("player_token", playerToken)
    .single();

  if (playerError || !player) throw new Error("Player session is invalid.");

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select("*")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (roundError || !round) throw new Error("No active game.");

  const { data: assignment, error: assignmentError } = await supabase
    .from("round_assignments")
    .select("*")
    .eq("round_id", round.id)
    .eq("player_id", player.id)
    .single();

  if (assignmentError || !assignment) throw new Error("No assignment found.");

  return { assignment, player, room, round };
}

async function resolveNight(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  roundId: string,
  content: Record<string, unknown>,
) {
  const publicPlayers = getPublicPlayers(content);
  const roles = await getRoles(supabase, roundId);
  const choices = getNightChoices(content);
  const mafiaTargets = publicPlayers
    .filter((player) => player.alive && roles[player.id] === "mafia")
    .map((player) => choices.find((choice) => choice.playerId === player.id)?.targetPlayerId)
    .filter((targetId): targetId is string => Boolean(targetId));
  const doctor = publicPlayers.find(
    (player) => player.alive && roles[player.id] === "doctor",
  );
  const doctorSaveTargetId = doctor
    ? choices.find((choice) => choice.playerId === doctor.id)?.targetPlayerId
    : undefined;
  const killTargetId = chooseMostCommonTarget(mafiaTargets);
  const settings = (content.settings ?? {}) as { revealRolesOnRemoval?: boolean };

  if (!killTargetId) {
    return {
      content: {
        ...content,
        lastNightResult: {
          eliminatedId: null,
          message: "The night passed quietly. No one was killed.",
          saved: false,
        },
        nightChoices: [],
      },
      winner: null,
    };
  }

  if (killTargetId === doctorSaveTargetId) {
    return {
      content: {
        ...content,
        lastNightResult: {
          eliminatedId: null,
          message: "An attempt was made, but no one was killed.",
          saved: true,
        },
        nightChoices: [],
      },
      winner: null,
    };
  }

  const eliminatedPlayer = publicPlayers.find((player) => player.id === killTargetId);
  const nextPlayers = publicPlayers.map((player) =>
    player.id === killTargetId ? { ...player, alive: false } : player,
  );
  const winner = getMafiaWinner(nextPlayers, roles);
  const eliminatedRole = roles[killTargetId];

  return {
    content: {
      ...content,
      players: nextPlayers,
      lastNightResult: {
        eliminatedId: killTargetId,
        eliminatedName: eliminatedPlayer?.name,
        eliminatedRole: settings.revealRolesOnRemoval === false ? null : eliminatedRole,
        message: `${eliminatedPlayer?.name ?? "A player"} was killed during the night.`,
        saved: false,
      },
      nightChoices: [],
      winner,
    },
    winner,
  };
}

async function getTargetRole(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  roundId: string,
  targetPlayerId: string,
) {
  const { data, error } = await supabase
    .from("round_assignments")
    .select("role")
    .eq("round_id", roundId)
    .eq("player_id", targetPlayerId)
    .single();

  if (error || !data) throw new Error("Could not inspect target.");

  return {
    role: data.role,
    label: mafiaRoleLabel(data.role as MafiaRole),
  };
}

async function getRoles(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  roundId: string,
) {
  const { data, error } = await supabase
    .from("round_assignments")
    .select("player_id,role")
    .eq("round_id", roundId);

  if (error) throw error;

  return Object.fromEntries(
    data.map((assignment) => [assignment.player_id as string, assignment.role as MafiaRole]),
  );
}

function getPublicPlayers(content: Record<string, unknown>) {
  return (content.players ?? []) as MafiaPublicPlayer[];
}

function getNightChoices(content: Record<string, unknown>) {
  return (content.nightChoices ?? []) as MafiaNightChoice[];
}

function getNightProgress(content: Record<string, unknown>, playerId: string): NightProgress {
  const livingPlayers = getPublicPlayers(content).filter((player) => player.alive);
  const choices = getNightChoices(content);

  return {
    hasChosen: choices.some((choice) => choice.playerId === playerId),
    needed: livingPlayers.length,
    choices: choices.length,
    chosenPlayerIds: choices.map((choice) => choice.playerId),
  };
}

async function refreshRoom(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  roomId: string,
) {
  const { error } = await supabase
    .from("rooms")
    .update({ expires_at: nextRoomExpiry() })
    .eq("id", roomId);

  if (error) throw error;
}
