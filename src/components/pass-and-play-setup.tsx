"use client";

import { CheckCircle2, Eye, EyeOff, RotateCcw, UserPlus, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

const picturePairs: PicturePair[] = [
  {
    civilian: "Mountain lake",
    civilianImage: "/images/picture-match/civilian-mountain.svg",
    impostor: "Pine forest",
    impostorImage: "/images/picture-match/impostor-forest.svg",
  },
  {
    civilian: "Camera",
    civilianImage: "/images/picture-match/civilian-camera.svg",
    impostor: "Binoculars",
    impostorImage: "/images/picture-match/impostor-binoculars.svg",
  },
  {
    civilian: "Rocket",
    civilianImage: "/images/picture-match/civilian-rocket.svg",
    impostor: "Paper airplane",
    impostorImage: "/images/picture-match/impostor-airplane.svg",
  },
];

const questionPairs: WordPair[] = questionMatchPairs;

export function PassAndPlaySetup({ mode }: { mode: GameMode }) {
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
