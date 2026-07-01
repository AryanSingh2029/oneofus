"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  Moon,
  RotateCcw,
  ShieldHalf,
  Skull,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import pictureMatchPairs from "@/lib/content/picture-match-pairs.json";
import questionMatchPairs from "@/lib/content/question-match-pairs.json";
import wordMatchPairs from "@/lib/content/word-match-pairs.json";
import type { GameMode } from "@/lib/game-modes";

type RoundPhase =
  | "setup"
  | "reveal"
  | "answers"
  | "discussion"
  | "voting"
  | "result";

type PlayerAssignment = {
  id: string;
  name: string;
  role: "civilian" | "impostor";
  secret: string;
  secretImage?: string;
};

type WordPair = {
  civilian: string;
  impostor: string;
};

type PicturePair = WordPair & {
  civilianImage: string;
  impostorImage: string;
};

const wordPairs: WordPair[] = wordMatchPairs;
const picturePairs: PicturePair[] = pictureMatchPairs;
const questionPairs: WordPair[] = questionMatchPairs;

function preloadImage(src: string | undefined | null) {
  if (!src || typeof window === "undefined") return;

  const image = new window.Image();
  image.src = src;
}

export function PassAndPlaySetup({ mode }: { mode: GameMode }) {
  return mode.id === "mafia" ? (
    <MafiaPassAndPlaySetup mode={mode} />
  ) : (
    <MatchPassAndPlaySetup mode={mode} />
  );
}

function MatchPassAndPlaySetup({ mode }: { mode: GameMode }) {
  const supportsPlayableReveal =
    mode.id === "word-match" ||
    mode.id === "picture-match" ||
    mode.id === "question-match";
  const isPictureMatch = mode.id === "picture-match";
  const isQuestionMatch = mode.id === "question-match";
  const secretNoun = isPictureMatch
    ? "picture"
    : isQuestionMatch
      ? "question"
      : "word";
  const [phase, setPhase] = useState<RoundPhase>("setup");
  const [showRoles, setShowRoles] = useState(true);
  const [players, setPlayers] = useState<string[]>(
    Array.from({ length: mode.minPlayers }, (_, index) => `Player ${index + 1}`),
  );
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [hasSeenSecret, setHasSeenSecret] = useState(false);
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>(
    {},
  );

  const namedPlayers = useMemo(
    () => players.map((player) => player.trim()).filter(Boolean),
    [players],
  );
  const canAddPlayer = players.length < mode.maxPlayers;
  const canStart = namedPlayers.length >= mode.minPlayers;
  const currentAssignment = assignments[revealIndex];
  const isLastReveal = revealIndex === assignments.length - 1;
  const selectedAssignment = assignments.find(
    (assignment) => assignment.id === selectedVoteId,
  );
  const currentAnswerTargetId = currentAssignment
    ? questionAnswers[currentAssignment.id]
    : undefined;
  const impostorAssignment = assignments.find(
    (assignment) => assignment.role === "impostor",
  );

  function updatePlayer(index: number, value: string) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, playerIndex) =>
        playerIndex === index ? value : player,
      ),
    );
  }

  function addPlayer() {
    if (!canAddPlayer) return;
    setPlayers((currentPlayers) => [
      ...currentPlayers,
      `Player ${currentPlayers.length + 1}`,
    ]);
  }

  function removePlayer(index: number) {
    setPlayers((currentPlayers) =>
      currentPlayers.filter((_, playerIndex) => playerIndex !== index),
    );
  }

  function startRound() {
    if (!canStart || !supportsPlayableReveal) return;

    const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    const picturePair =
      picturePairs[Math.floor(Math.random() * picturePairs.length)];
    const questionPair =
      questionPairs[Math.floor(Math.random() * questionPairs.length)];
    const impostorIndex = Math.floor(Math.random() * namedPlayers.length);
    const nextAssignments = shuffle<PlayerAssignment>(
      namedPlayers.map((name, index) => {
        const role: PlayerAssignment["role"] =
          index === impostorIndex ? "impostor" : "civilian";
        const isImpostor = role === "impostor";
        const secret = isQuestionMatch
          ? isImpostor
            ? questionPair.impostor
            : questionPair.civilian
          : isPictureMatch
          ? isImpostor
            ? picturePair.impostor
            : picturePair.civilian
          : isImpostor
            ? wordPair.impostor
            : wordPair.civilian;
        const secretImage = isPictureMatch
          ? isImpostor
            ? picturePair.impostorImage
            : picturePair.civilianImage
          : undefined;

        return {
          id: `${index}-${name}`,
          name,
          role,
          secret,
          secretImage,
        };
      }),
    );

    if (isPictureMatch) {
      nextAssignments.forEach((assignment) => preloadImage(assignment.secretImage));
    }

    setAssignments(nextAssignments);
    setRevealIndex(0);
    setIsSecretVisible(false);
    setHasSeenSecret(false);
    setSelectedVoteId(null);
    setQuestionAnswers({});
    setPhase("reveal");
  }

  function goToNextPlayer() {
    setIsSecretVisible(false);
    setHasSeenSecret(false);
    if (isLastReveal) {
      setPhase(isQuestionMatch ? "answers" : "discussion");
      return;
    }

    setRevealIndex((currentIndex) => currentIndex + 1);
  }

  function resetRound() {
    setPhase("setup");
    setAssignments([]);
    setRevealIndex(0);
    setIsSecretVisible(false);
    setHasSeenSecret(false);
    setSelectedVoteId(null);
    setQuestionAnswers({});
  }

  function revealSecret() {
    setIsSecretVisible(true);
    setHasSeenSecret(true);
  }

  function submitVote() {
    if (!selectedVoteId) return;
    setPhase("result");
  }

  function selectQuestionAnswer(targetId: string) {
    if (!currentAssignment) return;

    setQuestionAnswers((answers) => ({
      ...answers,
      [currentAssignment.id]: targetId,
    }));
  }

  if (phase === "reveal" && currentAssignment) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
              Private reveal
            </p>
            <h1 className="mt-2 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
              Pass to {currentAssignment.name}.
            </h1>
          </div>
          <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
            {revealIndex + 1}/{assignments.length}
          </span>
        </div>

        <div className="mt-6 min-h-[320px] w-full rounded-xl border border-hairline-strong bg-canvas p-6 text-center">
          {isSecretVisible ? (
            <span className="flex h-full min-h-[268px] flex-col items-center justify-center">
              {showRoles ? (
                <span
                  className={[
                    "mb-4 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.4px]",
                    currentAssignment.role === "impostor"
                      ? "border-red-500/40 bg-red-500/12 text-red-300"
                      : "border-primary/40 bg-primary/15 text-primary-hover",
                  ].join(" ")}
                >
                  {currentAssignment.role === "impostor" ? "Impostor" : "Civilian"}
                </span>
              ) : null}
              <span className="text-sm uppercase tracking-[0.4px] text-ink-tertiary">
                Your {secretNoun}
              </span>
              {currentAssignment.secretImage ? (
                <Image
                  alt={currentAssignment.secret}
                  className="mt-4 aspect-[3/2] w-full max-w-[520px] rounded-xl border border-hairline object-cover"
                  height={347}
                  priority
                  src={currentAssignment.secretImage}
                  width={520}
                />
              ) : isQuestionMatch ? (
                <span className="mt-5 max-w-xl font-display text-[30px] font-semibold leading-tight tracking-[-0.8px] text-ink md:text-[44px] md:tracking-[-1.2px]">
                  {currentAssignment.secret}
                </span>
              ) : (
                <span className="mt-3 font-display text-[52px] font-semibold leading-none tracking-[-1.8px] text-ink md:text-[72px] md:tracking-[-2.6px]">
                  {currentAssignment.secret}
                </span>
              )}
              <span className="mt-6 max-w-md text-sm leading-6 text-ink-subtle">
                {isQuestionMatch
                  ? `Choose the player who fits this question, then hide it before passing the phone.`
                  : `Memorize it, then tap Hide ${secretNoun} before passing the phone.`}
              </span>
              {isQuestionMatch ? (
                <span className="mt-6 grid w-full max-w-xl gap-2">
                  {assignments.map((assignment) => {
                    const isSelected = currentAnswerTargetId === assignment.id;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={[
                          "focus-ring flex min-h-12 items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                          isSelected
                            ? "border-primary/60 bg-primary/15 text-ink"
                            : "border-hairline bg-surface-1 text-ink-muted hover:border-hairline-strong hover:text-ink",
                        ].join(" ")}
                        key={assignment.id}
                        onClick={() => selectQuestionAnswer(assignment.id)}
                        type="button"
                      >
                        <span>{assignment.name}</span>
                        {isSelected ? <CheckCircle2 size={16} /> : null}
                      </button>
                    );
                  })}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="flex h-full min-h-[268px] flex-col items-center justify-center">
              <span className="grid h-12 w-12 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
                <Eye size={20} />
              </span>
              <span className="mt-5 font-display text-[28px] font-semibold tracking-[-0.6px] text-ink">
                Ready for {currentAssignment.name}
              </span>
              <span className="mt-3 text-sm leading-6 text-ink-subtle">
                Only {currentAssignment.name} should tap See {secretNoun} and look at
                the next screen.
              </span>
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className="flex-1"
            disabled={isSecretVisible}
            onClick={revealSecret}
          >
            See {secretNoun}
          </Button>
          <Button
            disabled={
              !isSecretVisible || (isQuestionMatch && !currentAnswerTargetId)
            }
            onClick={() => setIsSecretVisible(false)}
            variant="secondary"
          >
            Hide {secretNoun}
          </Button>
          <Button
            disabled={
              !hasSeenSecret ||
              isSecretVisible ||
              (isQuestionMatch && !currentAnswerTargetId)
            }
            onClick={goToNextPlayer}
            variant="secondary"
          >
            {isLastReveal
              ? isQuestionMatch
                ? "Reveal answers"
                : "Start discussion"
              : "Next player"}
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "answers") {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
        <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
          Answers
        </p>
        <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
          Everyone chose someone.
        </h1>
        <p className="mt-5 text-base leading-7 text-ink-muted">
          Reveal the answers now. Look for the answer that feels like it came
          from a different question.
        </p>

        <div className="mt-8 grid gap-3">
          {assignments.map((assignment) => {
            const chosenPlayer = assignments.find(
              (candidate) => candidate.id === questionAnswers[assignment.id],
            );

            return (
              <div
                className="rounded-lg border border-hairline bg-surface-2 p-4"
                key={assignment.id}
              >
                <p className="text-sm text-ink-subtle">{assignment.name} chose</p>
                <p className="mt-1 font-display text-[24px] font-semibold tracking-[-0.5px] text-ink">
                  {chosenPlayer?.name ?? "No answer"}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setPhase("voting")}>Vote for impostor</Button>
          <Button onClick={resetRound} variant="secondary">
            <RotateCcw size={16} />
            New round
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "discussion") {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
        <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
          Discussion
        </p>
        <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
          Everyone has seen their card.
        </h1>
        <p className="mt-5 text-base leading-7 text-ink-muted">
          {isQuestionMatch
            ? "Everyone answers their question, then the group discusses whose answer seems like it came from a different prompt."
            : `Start talking. Ask careful questions, answer naturally, and try to find the one person whose ${secretNoun} does not match.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setPhase("voting")}>Start voting</Button>
          <Button onClick={resetRound} variant="secondary">
            <RotateCcw size={16} />
            New round
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "voting") {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
        <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
          Vote
        </p>
        <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
          Who is the impostor?
        </h1>
        <p className="mt-5 text-base leading-7 text-ink-muted">
          Discuss first, then select one player. The result will reveal whether
          they were civilian or impostor.
        </p>

        <div className="mt-8 grid gap-3">
          {assignments.map((assignment) => {
            const isSelected = selectedVoteId === assignment.id;

            return (
              <button
                aria-pressed={isSelected}
                className={[
                  "focus-ring flex min-h-14 items-center justify-between rounded-lg border p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary/60 bg-primary/15 text-ink"
                    : "border-hairline bg-surface-2 text-ink-muted hover:border-hairline-strong hover:text-ink",
                ].join(" ")}
                key={assignment.id}
                onClick={() => setSelectedVoteId(assignment.id)}
                type="button"
              >
                <span className="font-display text-[20px] font-medium tracking-[-0.3px]">
                  {assignment.name}
                </span>
                {isSelected ? (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white">
                    <CheckCircle2 size={16} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="flex-1" disabled={!selectedVoteId} onClick={submitVote}>
            Vote
          </Button>
          <Button onClick={() => setPhase("discussion")} variant="secondary">
            Back to discussion
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "result" && selectedAssignment && impostorAssignment) {
    const caughtImpostor = selectedAssignment.role === "impostor";

    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
        <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
          Result
        </p>
        <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
          {caughtImpostor ? "You found the impostor." : "They were civilian."}
        </h1>

        <div className="mt-8 rounded-xl border border-hairline-strong bg-canvas p-6 text-center">
          <p className="text-sm uppercase tracking-[0.4px] text-ink-tertiary">
            Voted player
          </p>
          <p className="mt-3 font-display text-[44px] font-semibold leading-none tracking-[-1.4px] text-ink">
            {selectedAssignment.name}
          </p>
          <RolePill className="mt-5" role={selectedAssignment.role} />
          <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-ink-subtle">
            The impostor was {impostorAssignment.name}. Their {secretNoun} was{" "}
            {impostorAssignment.secret}.
          </p>
          {impostorAssignment.secretImage ? (
            <Image
              alt={impostorAssignment.secret}
              className="mx-auto mt-5 aspect-[3/2] w-full max-w-sm rounded-xl border border-hairline object-cover"
              height={256}
              priority
              src={impostorAssignment.secretImage}
              width={384}
            />
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={resetRound}>Back to players</Button>
          <Button onClick={startRound} variant="secondary">
            <RotateCcw size={16} />
            New round same players
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
        <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
          One phone setup
        </p>
        <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
          Set up {mode.title}.
        </h1>
        <p className="mt-5 text-base leading-7 text-ink-muted">
          Choose whether players can see their team, add the players in pass
          order, then start the round from this phone.
        </p>

        <div className="mt-8 grid gap-3">
          <SettingToggle
            body={
              showRoles
                ? "Players will see whether they are the regular player or the impostor."
                : "Players only see their secret. No one is told if they are the impostor."
            }
            checked={showRoles}
            icon={showRoles ? <Eye size={18} /> : <EyeOff size={18} />}
            label="Show civilian / impostor role"
            onChange={setShowRoles}
          />
        </div>
      </section>

      <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-ink-subtle">
              Players
            </p>
            <h2 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.6px]">
              Add everyone playing.
            </h2>
          </div>
          <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
            {namedPlayers.length}/{mode.maxPlayers}
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {players.map((player, index) => (
            <div className="flex gap-2" key={index}>
              <label className="sr-only" htmlFor={`player-${index}`}>
                Player {index + 1}
              </label>
              <input
                className="focus-ring min-h-11 flex-1 rounded-md border border-hairline bg-surface-2 px-3 py-2 text-base text-ink placeholder:text-ink-tertiary"
                id={`player-${index}`}
                maxLength={24}
                onChange={(event) => updatePlayer(index, event.target.value)}
                placeholder={`Player ${index + 1}`}
                value={player}
              />
              <button
                aria-label={`Remove player ${index + 1}`}
                className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-md border border-hairline bg-surface-2 text-ink-subtle transition-colors hover:border-hairline-strong hover:text-ink disabled:cursor-not-allowed disabled:text-ink-tertiary"
                disabled={players.length <= mode.minPlayers}
                onClick={() => removePlayer(index)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className="border border-hairline bg-surface-2"
            disabled={!canAddPlayer}
            onClick={addPlayer}
            variant="secondary"
          >
            <UserPlus size={16} />
            Add player
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            disabled={!canStart || !supportsPlayableReveal}
            onClick={startRound}
          >
            Start round
          </Button>
        </div>

        <p className="mt-4 text-sm leading-6 text-ink-subtle">
          {!supportsPlayableReveal
            ? `${mode.title} reveal flow is coming after the match modes.`
            : canStart
              ? `${mode.title} is ready for ${namedPlayers.length} players.`
              : `Add at least ${mode.minPlayers} players to start.`}
        </p>
      </section>
    </div>
  );
}

type MafiaPhase =
  | "setup"
  | "roleReveal"
  | "night"
  | "nightFeedback"
  | "nightResult"
  | "day"
  | "vote"
  | "trialResult"
  | "gameOver";

type MafiaRole = "mafia" | "doctor" | "detective" | "civilian";

type MafiaPlayer = {
  id: string;
  name: string;
  role: MafiaRole;
  alive: boolean;
};

type NightResult = {
  message: string;
  eliminatedId: string | null;
  saved: boolean;
};

type TrialResult = {
  eliminatedId: string;
};

type MafiaWinner = "mafia" | "town";

function MafiaPassAndPlaySetup({ mode }: { mode: GameMode }) {
  const [phase, setPhase] = useState<MafiaPhase>("setup");
  const [players, setPlayers] = useState<string[]>(
    Array.from({ length: mode.minPlayers }, (_, index) => `Player ${index + 1}`),
  );
  const [mafiaCount, setMafiaCount] = useState(1);
  const [includeDoctor, setIncludeDoctor] = useState(true);
  const [includeDetective, setIncludeDetective] = useState(true);
  const [revealRolesOnRemoval, setRevealRolesOnRemoval] = useState(true);
  const [mafiaPlayers, setMafiaPlayers] = useState<MafiaPlayer[]>([]);
  const [roleRevealIndex, setRoleRevealIndex] = useState(0);
  const [nightIndex, setNightIndex] = useState(0);
  const [dayNumber, setDayNumber] = useState(1);
  const [isRoleVisible, setIsRoleVisible] = useState(false);
  const [hasSeenRole, setHasSeenRole] = useState(false);
  const [selectedNightTargetId, setSelectedNightTargetId] = useState<string | null>(
    null,
  );
  const [nightChoices, setNightChoices] = useState<Record<string, string>>({});
  const [nightFeedbackTargetId, setNightFeedbackTargetId] = useState<string | null>(
    null,
  );
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [nightResult, setNightResult] = useState<NightResult | null>(null);
  const [trialResult, setTrialResult] = useState<TrialResult | null>(null);
  const [winner, setWinner] = useState<MafiaWinner | null>(null);

  const namedPlayers = useMemo(
    () => players.map((player) => player.trim()).filter(Boolean),
    [players],
  );
  const maxMafiaCount = Math.max(1, Math.floor(namedPlayers.length / 3));
  const canAddPlayer = players.length < mode.maxPlayers;
  const canStart =
    namedPlayers.length >= mode.minPlayers &&
    mafiaCount <= maxMafiaCount &&
    namedPlayers.length - mafiaCount >=
      1 + Number(includeDoctor) + Number(includeDetective);
  const alivePlayers = mafiaPlayers.filter((player) => player.alive);
  const roleRevealPlayer = mafiaPlayers[roleRevealIndex];
  const nightPlayer = alivePlayers[nightIndex];
  const eligibleNightTargets = alivePlayers.filter(
    (player) => player.id !== nightPlayer?.id,
  );
  const nightFeedbackTarget = mafiaPlayers.find(
    (player) => player.id === nightFeedbackTargetId,
  );
  const selectedVotePlayer = alivePlayers.find(
    (player) => player.id === selectedVoteId,
  );
  const eliminatedNightPlayer = nightResult?.eliminatedId
    ? mafiaPlayers.find((player) => player.id === nightResult.eliminatedId)
    : null;
  const eliminatedTrialPlayer = trialResult
    ? mafiaPlayers.find((player) => player.id === trialResult.eliminatedId)
    : null;

  function updatePlayer(index: number, value: string) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, playerIndex) =>
        playerIndex === index ? value : player,
      ),
    );
  }

  function addPlayer() {
    if (!canAddPlayer) return;
    setPlayers((currentPlayers) => [
      ...currentPlayers,
      `Player ${currentPlayers.length + 1}`,
    ]);
  }

  function removePlayer(index: number) {
    setPlayers((currentPlayers) =>
      currentPlayers.filter((_, playerIndex) => playerIndex !== index),
    );
  }

  function changeMafiaCount(nextCount: number) {
    setMafiaCount(Math.min(Math.max(nextCount, 1), maxMafiaCount));
  }

  function startMafiaGame() {
    if (!canStart) return;

    const mafiaIndexes = new Set(
      shuffle(namedPlayers.map((_, index) => index)).slice(0, mafiaCount),
    );
    const doctorIndex = includeDoctor
      ? shuffle(
          namedPlayers
            .map((_, index) => index)
            .filter((index) => !mafiaIndexes.has(index)),
        )[0]
      : undefined;
    const detectiveIndex = includeDetective
      ? shuffle(
          namedPlayers
            .map((_, index) => index)
            .filter((index) => !mafiaIndexes.has(index) && index !== doctorIndex),
        )[0]
      : undefined;

    const nextPlayers = namedPlayers.map((name, index) => {
      const role: MafiaRole = mafiaIndexes.has(index)
        ? "mafia"
        : index === doctorIndex
          ? "doctor"
          : index === detectiveIndex
            ? "detective"
            : "civilian";

      return {
        id: `${index}-${name}`,
        name,
        role,
        alive: true,
      };
    });

    setMafiaPlayers(nextPlayers);
    setRoleRevealIndex(0);
    setNightIndex(0);
    setDayNumber(1);
    setIsRoleVisible(false);
    setHasSeenRole(false);
    setSelectedNightTargetId(null);
    setNightChoices({});
    setNightFeedbackTargetId(null);
    setSelectedVoteId(null);
    setNightResult(null);
    setTrialResult(null);
    setWinner(null);
    setPhase("roleReveal");
  }

  function resetMafiaGame() {
    setPhase("setup");
    setMafiaPlayers([]);
    setRoleRevealIndex(0);
    setNightIndex(0);
    setDayNumber(1);
    setIsRoleVisible(false);
    setHasSeenRole(false);
    setSelectedNightTargetId(null);
    setNightChoices({});
    setNightFeedbackTargetId(null);
    setSelectedVoteId(null);
    setNightResult(null);
    setTrialResult(null);
    setWinner(null);
  }

  function goToNextRoleReveal() {
    setIsRoleVisible(false);
    setHasSeenRole(false);

    if (roleRevealIndex === mafiaPlayers.length - 1) {
      startNight();
      return;
    }

    setRoleRevealIndex((currentIndex) => currentIndex + 1);
  }

  function startNight() {
    setNightIndex(0);
    setSelectedNightTargetId(null);
    setNightChoices({});
    setNightFeedbackTargetId(null);
    setPhase("night");
  }

  function submitNightChoice() {
    if (!nightPlayer || !selectedNightTargetId) return;

    const nextChoices = {
      ...nightChoices,
      [nightPlayer.id]: selectedNightTargetId,
    };

    setNightChoices(nextChoices);
    setNightFeedbackTargetId(selectedNightTargetId);
    setSelectedNightTargetId(null);
    setPhase("nightFeedback");
  }

  function continueAfterNightFeedback() {
    setNightFeedbackTargetId(null);

    if (nightIndex === alivePlayers.length - 1) {
      resolveNight(nightChoices);
      return;
    }

    setNightIndex((currentIndex) => currentIndex + 1);
    setPhase("night");
  }

  function resolveNight(choices: Record<string, string>) {
    const currentPlayers = mafiaPlayers;
    const livingPlayers = currentPlayers.filter((player) => player.alive);
    const mafiaKillChoices = livingPlayers
      .filter((player) => player.role === "mafia")
      .map((player) => choices[player.id])
      .filter(Boolean);
    const doctorSaveChoice = livingPlayers.find((player) => player.role === "doctor")
      ? choices[livingPlayers.find((player) => player.role === "doctor")!.id]
      : undefined;
    const killTargetId = chooseMostCommon(mafiaKillChoices);

    if (!killTargetId) {
      setNightResult({
        eliminatedId: null,
        message: "The night passed quietly. No one was killed.",
        saved: false,
      });
      setPhase("nightResult");
      return;
    }

    if (killTargetId === doctorSaveChoice) {
      setNightResult({
        eliminatedId: null,
        message: "An attempt was made, but no one was killed.",
        saved: true,
      });
      setPhase("nightResult");
      return;
    }

    const eliminatedPlayer = currentPlayers.find((player) => player.id === killTargetId);
    setMafiaPlayers((current) =>
      current.map((player) =>
        player.id === killTargetId ? { ...player, alive: false } : player,
      ),
    );
    setNightResult({
      eliminatedId: killTargetId,
      message: `${eliminatedPlayer?.name ?? "A player"} was killed during the night.`,
      saved: false,
    });
    setPhase("nightResult");
  }

  function continueAfterNight() {
    const nextWinner = getMafiaWinner(mafiaPlayers);

    if (nextWinner) {
      setWinner(nextWinner);
      setPhase("gameOver");
      return;
    }

    setSelectedVoteId(null);
    setPhase("vote");
  }

  function submitMafiaVote() {
    if (!selectedVoteId) return;

    const updatedPlayers = mafiaPlayers.map((player) =>
      player.id === selectedVoteId ? { ...player, alive: false } : player,
    );
    const nextWinner = getMafiaWinner(updatedPlayers);

    setMafiaPlayers(updatedPlayers);
    setTrialResult({ eliminatedId: selectedVoteId });
    setSelectedVoteId(null);

    if (nextWinner) {
      setWinner(nextWinner);
      setPhase("gameOver");
      return;
    }

    setPhase("trialResult");
  }

  function continueToNextNight() {
    setDayNumber((currentDay) => currentDay + 1);
    setTrialResult(null);
    startNight();
  }

  if (phase === "roleReveal" && roleRevealPlayer) {
    const isLastReveal = roleRevealIndex === mafiaPlayers.length - 1;

    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
              Private role
            </p>
            <h1 className="mt-2 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
              Pass to {roleRevealPlayer.name}.
            </h1>
          </div>
          <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
            {roleRevealIndex + 1}/{mafiaPlayers.length}
          </span>
        </div>

        <div className="mt-6 min-h-[320px] rounded-xl border border-hairline-strong bg-canvas p-6 text-center">
          {isRoleVisible ? (
            <span className="flex min-h-[268px] flex-col items-center justify-center">
              <MafiaRolePill role={roleRevealPlayer.role} />
              <span className="mt-5 text-sm uppercase tracking-[0.4px] text-ink-tertiary">
                Your role
              </span>
              <span className="mt-3 font-display text-[52px] font-semibold leading-none tracking-[-1.8px] text-ink md:text-[72px] md:tracking-[-2.6px]">
                {mafiaRoleLabel(roleRevealPlayer.role)}
              </span>
              <span className="mt-6 max-w-md text-sm leading-6 text-ink-subtle">
                Remember your role, then hide it before passing the phone.
              </span>
            </span>
          ) : (
            <span className="flex min-h-[268px] flex-col items-center justify-center">
              <span className="grid h-12 w-12 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
                <ShieldHalf size={20} />
              </span>
              <span className="mt-5 font-display text-[28px] font-semibold tracking-[-0.6px] text-ink">
                Ready for {roleRevealPlayer.name}
              </span>
              <span className="mt-3 text-sm leading-6 text-ink-subtle">
                Only {roleRevealPlayer.name} should tap See role.
              </span>
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className="flex-1"
            disabled={isRoleVisible}
            onClick={() => {
              setIsRoleVisible(true);
              setHasSeenRole(true);
            }}
          >
            See role
          </Button>
          <Button
            disabled={!isRoleVisible}
            onClick={() => setIsRoleVisible(false)}
            variant="secondary"
          >
            Hide role
          </Button>
          <Button
            disabled={!hasSeenRole || isRoleVisible}
            onClick={goToNextRoleReveal}
            variant="secondary"
          >
            {isLastReveal ? "Start night" : "Next player"}
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "night" && nightPlayer) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
              Night {dayNumber}
            </p>
            <h1 className="mt-2 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
              Pass to {nightPlayer.name}.
            </h1>
          </div>
          <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
            {nightIndex + 1}/{alivePlayers.length}
          </span>
        </div>

        <div className="mt-6 rounded-xl border border-hairline-strong bg-canvas p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
              <Moon size={18} />
            </span>
            <div>
              <p className="font-display text-[24px] font-semibold tracking-[-0.5px] text-ink">
                Choose one player.
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-subtle">
                Everyone gets this same screen. Some choices count, some choices do
                not.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {eligibleNightTargets.map((player) => (
              <PlayerChoiceButton
                key={player.id}
                name={player.name}
                onClick={() => setSelectedNightTargetId(player.id)}
                selected={selectedNightTargetId === player.id}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className="flex-1"
            disabled={!selectedNightTargetId}
            onClick={submitNightChoice}
          >
            Hide and pass
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "nightFeedback" && nightPlayer) {
    const isDetective = nightPlayer.role === "detective";

    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
              Private result
            </p>
            <h1 className="mt-2 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
              For {nightPlayer.name}.
            </h1>
          </div>
          <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
            {nightIndex + 1}/{alivePlayers.length}
          </span>
        </div>

        <div className="mt-6 min-h-[300px] rounded-xl border border-hairline-strong bg-canvas p-6 text-center">
          <span className="flex min-h-[248px] flex-col items-center justify-center">
            <span className="grid h-12 w-12 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
              {isDetective ? <Eye size={20} /> : <CheckCircle2 size={20} />}
            </span>
            <span className="mt-5 text-sm uppercase tracking-[0.4px] text-ink-tertiary">
              {isDetective ? "Detective check" : "Night choice"}
            </span>
            {isDetective && nightFeedbackTarget ? (
              <>
                <span className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-[-1px] text-ink md:text-[48px] md:tracking-[-1.4px]">
                  {nightFeedbackTarget.name} is {mafiaRoleLabel(nightFeedbackTarget.role)}.
                </span>
                <MafiaRolePill className="mt-5" role={nightFeedbackTarget.role} />
              </>
            ) : (
              <span className="mt-3 font-display text-[42px] font-semibold leading-tight tracking-[-1.2px] text-ink md:text-[56px] md:tracking-[-1.8px]">
                Choice saved.
              </span>
            )}
            <span className="mt-6 max-w-md text-sm leading-6 text-ink-subtle">
              Hide this screen before passing the phone.
            </span>
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button className="flex-1" onClick={continueAfterNightFeedback}>
            Hide and continue
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "nightResult" && nightResult) {
    return (
      <MafiaResultShell
        eyebrow={`Night ${dayNumber} result`}
        icon={nightResult.saved ? <HeartPulse size={22} /> : <Skull size={22} />}
        title={nightResult.message}
      >
        {eliminatedNightPlayer ? (
          <EliminatedPlayerSummary
            player={eliminatedNightPlayer}
            revealRole={revealRolesOnRemoval}
          />
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={continueAfterNight}>Discuss and vote</Button>
          <Button onClick={resetMafiaGame} variant="secondary">
            <RotateCcw size={16} />
            New game
          </Button>
        </div>
      </MafiaResultShell>
    );
  }

  if (phase === "day") {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
        <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
          Day {dayNumber}
        </p>
        <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
          Discuss who to remove.
        </h1>
        <p className="mt-5 text-base leading-7 text-ink-muted">
          Only alive players can act from now on. Talk through the night result,
          then vote one player out.
        </p>
        <AlivePlayerList players={mafiaPlayers} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setPhase("vote")}>Start voting</Button>
          <Button onClick={resetMafiaGame} variant="secondary">
            <RotateCcw size={16} />
            New game
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "vote") {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
        <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
          Vote
        </p>
        <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
          Who leaves the town?
        </h1>
        <p className="mt-5 text-base leading-7 text-ink-muted">
          Discuss first, then select one alive player. That player is removed after
          the vote.
        </p>

        <div className="mt-8 grid gap-3">
          {alivePlayers.map((player) => (
            <PlayerChoiceButton
              key={player.id}
              name={player.name}
              onClick={() => setSelectedVoteId(player.id)}
              selected={selectedVoteId === player.id}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            className="flex-1"
            disabled={!selectedVotePlayer}
            onClick={submitMafiaVote}
          >
            Remove player
          </Button>
          <Button onClick={resetMafiaGame} variant="secondary">
            <RotateCcw size={16} />
            New game
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "trialResult" && eliminatedTrialPlayer) {
    return (
      <MafiaResultShell
        eyebrow="Vote result"
        icon={<Users size={22} />}
        title={`${eliminatedTrialPlayer.name} was removed.`}
      >
        <EliminatedPlayerSummary
          player={eliminatedTrialPlayer}
          revealRole={revealRolesOnRemoval}
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={continueToNextNight}>Start next night</Button>
          <Button onClick={resetMafiaGame} variant="secondary">
            <RotateCcw size={16} />
            New game
          </Button>
        </div>
      </MafiaResultShell>
    );
  }

  if (phase === "gameOver" && winner) {
    return (
      <MafiaResultShell
        eyebrow="Game over"
        icon={winner === "mafia" ? <Skull size={22} /> : <ShieldHalf size={22} />}
        title={winner === "mafia" ? "Mafia wins." : "Civilians win."}
      >
        <AlivePlayerList players={mafiaPlayers} revealRoles />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={resetMafiaGame}>Back to players</Button>
          <Button onClick={startMafiaGame} variant="secondary">
            <RotateCcw size={16} />
            New game same players
          </Button>
        </div>
      </MafiaResultShell>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
        <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
          One phone setup
        </p>
        <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
          Set up Mafia.
        </h1>
        <p className="mt-5 text-base leading-7 text-ink-muted">
          Add players, choose the hidden-role mix, then pass the phone for private
          roles and night choices.
        </p>

        <div className="mt-8 grid gap-3">
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
                  disabled={mafiaCount <= 1}
                  onClick={() => changeMafiaCount(mafiaCount - 1)}
                  size="sm"
                  variant="secondary"
                >
                  -
                </Button>
                <span className="grid h-10 w-10 place-items-center rounded-md border border-hairline-strong bg-canvas text-sm text-ink">
                  {mafiaCount}
                </span>
                <Button
                  disabled={mafiaCount >= maxMafiaCount}
                  onClick={() => changeMafiaCount(mafiaCount + 1)}
                  size="sm"
                  variant="secondary"
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          <SettingToggle
            body={
              includeDoctor
                ? "One Doctor can save the same player targeted by Mafia."
                : "No save role. Mafia kills go through unless the town votes them out."
            }
            checked={includeDoctor}
            icon={<HeartPulse size={18} />}
            label="Include Doctor"
            onChange={setIncludeDoctor}
          />
          <SettingToggle
            body={
              includeDetective
                ? "One Detective privately learns the role of the player they choose at night."
                : "No investigation role. The town only has discussion and votes."
            }
            checked={includeDetective}
            icon={<Eye size={18} />}
            label="Include Detective"
            onChange={setIncludeDetective}
          />
          <SettingToggle
            body={
              revealRolesOnRemoval
                ? "The removed player's role is shown after kill or vote."
                : "Removed players leave without showing their role."
            }
            checked={revealRolesOnRemoval}
            icon={<Eye size={18} />}
            label="Reveal removed roles"
            onChange={setRevealRolesOnRemoval}
          />
        </div>
      </section>

      <section className="rounded-xl border border-hairline bg-surface-1 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-5">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-ink-subtle">
              Players
            </p>
            <h2 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.6px]">
              Add everyone playing.
            </h2>
          </div>
          <span className="rounded-full bg-surface-2 px-2 py-1 text-xs text-ink-muted">
            {namedPlayers.length}/{mode.maxPlayers}
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {players.map((player, index) => (
            <div className="flex gap-2" key={index}>
              <label className="sr-only" htmlFor={`mafia-player-${index}`}>
                Player {index + 1}
              </label>
              <input
                className="focus-ring min-h-11 flex-1 rounded-md border border-hairline bg-surface-2 px-3 py-2 text-base text-ink placeholder:text-ink-tertiary"
                id={`mafia-player-${index}`}
                maxLength={24}
                onChange={(event) => updatePlayer(index, event.target.value)}
                placeholder={`Player ${index + 1}`}
                value={player}
              />
              <button
                aria-label={`Remove player ${index + 1}`}
                className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-md border border-hairline bg-surface-2 text-ink-subtle transition-colors hover:border-hairline-strong hover:text-ink disabled:cursor-not-allowed disabled:text-ink-tertiary"
                disabled={players.length <= mode.minPlayers}
                onClick={() => removePlayer(index)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className="border border-hairline bg-surface-2"
            disabled={!canAddPlayer}
            onClick={addPlayer}
            variant="secondary"
          >
            <UserPlus size={16} />
            Add player
          </Button>
          <Button className="flex-1 sm:flex-none" disabled={!canStart} onClick={startMafiaGame}>
            Start game
          </Button>
        </div>

        <p className="mt-4 text-sm leading-6 text-ink-subtle">
          {canStart
            ? `${mode.title} is ready for ${namedPlayers.length} players.`
            : `Add at least ${mode.minPlayers} players and keep Mafia at ${maxMafiaCount} or fewer.`}
        </p>
      </section>
    </div>
  );
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function RolePill({
  className = "",
  role,
}: {
  className?: string;
  role: PlayerAssignment["role"];
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

function MafiaRolePill({
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

function PlayerChoiceButton({
  name,
  onClick,
  selected,
}: {
  name: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={[
        "focus-ring flex min-h-14 items-center justify-between rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary/60 bg-primary/15 text-ink"
          : "border-hairline bg-surface-2 text-ink-muted hover:border-hairline-strong hover:text-ink",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      <span className="font-display text-[20px] font-medium tracking-[-0.3px]">
        {name}
      </span>
      {selected ? (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white">
          <CheckCircle2 size={16} />
        </span>
      ) : null}
    </button>
  );
}

function MafiaResultShell({
  children,
  eyebrow,
  icon,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface-1 p-5 md:p-8">
      <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
        {eyebrow}
      </p>
      <div className="mt-6 rounded-xl border border-hairline-strong bg-canvas p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-hairline bg-surface-1 text-primary">
          {icon}
        </span>
        <h1 className="mx-auto mt-5 max-w-2xl font-display text-[38px] font-semibold leading-[1.08] tracking-[-1.2px] md:text-[56px] md:tracking-[-1.8px]">
          {title}
        </h1>
      </div>
      {children}
    </section>
  );
}

function EliminatedPlayerSummary({
  player,
  revealRole,
}: {
  player: MafiaPlayer;
  revealRole: boolean;
}) {
  return (
    <div className="mt-5 rounded-lg border border-hairline bg-surface-2 p-4">
      <p className="text-sm text-ink-subtle">Removed player</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[24px] font-semibold tracking-[-0.5px] text-ink">
          {player.name}
        </p>
        {revealRole ? <MafiaRolePill role={player.role} /> : null}
      </div>
    </div>
  );
}

function AlivePlayerList({
  players,
  revealRoles = false,
}: {
  players: MafiaPlayer[];
  revealRoles?: boolean;
}) {
  return (
    <div className="mt-8 grid gap-3">
      {players.map((player) => (
        <div
          className={[
            "flex items-center justify-between gap-3 rounded-lg border p-4",
            player.alive
              ? "border-hairline bg-surface-2"
              : "border-hairline bg-canvas text-ink-tertiary",
          ].join(" ")}
          key={player.id}
        >
          <div>
            <p className="font-display text-[20px] font-medium tracking-[-0.3px]">
              {player.name}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.4px] text-ink-tertiary">
              {player.alive ? "Alive" : "Removed"}
            </p>
          </div>
          {revealRoles ? <MafiaRolePill role={player.role} /> : null}
        </div>
      ))}
    </div>
  );
}

function mafiaRoleLabel(role: MafiaRole) {
  const labels: Record<MafiaRole, string> = {
    mafia: "Mafia",
    doctor: "Doctor",
    detective: "Detective",
    civilian: "Civilian",
  };

  return labels[role];
}

function chooseMostCommon(targetIds: string[]) {
  if (targetIds.length === 0) return null;

  const counts = targetIds.reduce<Record<string, number>>((currentCounts, id) => {
    currentCounts[id] = (currentCounts[id] ?? 0) + 1;
    return currentCounts;
  }, {});
  const highestCount = Math.max(...Object.values(counts));
  const tiedTargets = Object.entries(counts)
    .filter(([, count]) => count === highestCount)
    .map(([id]) => id);

  return tiedTargets[Math.floor(Math.random() * tiedTargets.length)];
}

function getMafiaWinner(players: MafiaPlayer[]): MafiaWinner | null {
  const alivePlayers = players.filter((player) => player.alive);
  const aliveMafiaCount = alivePlayers.filter((player) => player.role === "mafia")
    .length;
  const aliveTownCount = alivePlayers.length - aliveMafiaCount;

  if (aliveMafiaCount === 0) return "town";
  if (aliveMafiaCount >= aliveTownCount) return "mafia";

  return null;
}

function SettingToggle({
  body,
  checked,
  icon,
  label,
  onChange,
}: {
  body: string;
  checked: boolean;
  icon: React.ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className="focus-ring flex min-h-[112px] w-full items-start justify-between gap-4 rounded-lg border border-hairline bg-surface-2 p-4 text-left transition-colors hover:border-hairline-strong"
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
