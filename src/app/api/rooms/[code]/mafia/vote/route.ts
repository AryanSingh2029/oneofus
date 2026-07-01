import { NextResponse } from "next/server";
import {
  chooseMostCommonTarget,
  getMafiaWinner,
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
    const players = getLivingPlayers(round.content);
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("voter_player_id")
      .eq("round_id", round.id);

    if (votesError) throw votesError;

    await refreshRoom(supabase, room.id);

    return NextResponse.json({
      hasVoted: votes.some((vote) => vote.voter_player_id === player.id),
      needed: players.length,
      votes: votes.length,
      votedPlayerIds: votes.map((vote) => vote.voter_player_id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load vote status." },
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
      return NextResponse.json({ error: "Missing vote request." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { room, player, round } = await getMafiaContext(
      supabase,
      code,
      playerId,
      playerToken,
    );

    if (room.status !== "voting" || round.phase !== "voting") {
      return NextResponse.json(
        { error: "Voting is not open." },
        { status: 400 },
      );
    }

    const publicPlayers = getPublicPlayers(round.content);
    const livingPlayers = publicPlayers.filter((candidate) => candidate.alive);
    const voter = livingPlayers.find((candidate) => candidate.id === player.id);
    const target = livingPlayers.find((candidate) => candidate.id === targetPlayerId);

    if (!voter) {
      return NextResponse.json({ error: "Removed players cannot vote." }, { status: 400 });
    }

    if (!target) {
      return NextResponse.json({ error: "Vote target is invalid." }, { status: 400 });
    }

    const { error: voteError } = await supabase.from("votes").upsert(
      {
        round_id: round.id,
        voter_player_id: player.id,
        target_player_id: targetPlayerId,
      },
      { onConflict: "round_id,voter_player_id" },
    );

    if (voteError) throw voteError;

    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("*")
      .eq("round_id", round.id);

    if (votesError) throw votesError;

    if (votes.length >= livingPlayers.length) {
      const selectedTargetId = chooseMostCommonTarget(
        votes.map((vote) => vote.target_player_id as string),
      );

      if (!selectedTargetId) throw new Error("Could not resolve vote.");

      const roles = await getRoles(supabase, round.id);
      const selectedPlayer = publicPlayers.find((candidate) => candidate.id === selectedTargetId);
      const nextPlayers = publicPlayers.map((candidate) =>
        candidate.id === selectedTargetId ? { ...candidate, alive: false } : candidate,
      );
      const winner = getMafiaWinner(nextPlayers, roles);
      const settings = (round.content.settings ?? {}) as {
        revealRolesOnRemoval?: boolean;
      };
      const dayNumber = Number(round.content.dayNumber ?? 1);
      const nextContent = {
        ...round.content,
        dayNumber: winner ? dayNumber : dayNumber + 1,
        players: nextPlayers,
        lastVoteResult: {
          eliminatedId: selectedTargetId,
          eliminatedName: selectedPlayer?.name,
          eliminatedRole:
            settings.revealRolesOnRemoval === false ? null : roles[selectedTargetId],
          message: `${selectedPlayer?.name ?? "A player"} was removed by vote.`,
        },
        winner,
      };

      const { error: roundUpdateError } = await supabase
        .from("rounds")
        .update({ phase: winner ? "gameOver" : "trialResult", content: nextContent })
        .eq("id", round.id);

      if (roundUpdateError) throw roundUpdateError;

      const { error: roomUpdateError } = await supabase
        .from("rooms")
        .update({
          expires_at: nextRoomExpiry(),
          status: winner ? "ended" : "result",
        })
        .eq("id", room.id);

      if (roomUpdateError) throw roomUpdateError;
    } else {
      await refreshRoom(supabase, room.id);
    }

    return NextResponse.json({
      hasVoted: true,
      votes: votes.length,
      needed: livingPlayers.length,
      votedPlayerIds: votes.map((vote) => vote.voter_player_id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not submit vote." },
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

  return { player, room, round };
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

function getLivingPlayers(content: Record<string, unknown>) {
  return getPublicPlayers(content).filter((player) => player.alive);
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
