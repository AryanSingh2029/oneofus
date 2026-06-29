export type MvpFlowStep = {
  id: string;
  title: string;
  status: "mvp" | "planned";
  description: string;
};

export const mvpFlowSteps: MvpFlowStep[] = [
  {
    id: "choose-game",
    title: "Choose game",
    status: "mvp",
    description: "Start with Word Match as the first fully playable loop.",
  },
  {
    id: "play-style",
    title: "Choose play style",
    status: "mvp",
    description: "Use one-phone pass-and-play first; rooms come after Supabase.",
  },
  {
    id: "players",
    title: "Add players",
    status: "mvp",
    description: "Enter 3-12 names. The list order becomes private reveal order.",
  },
  {
    id: "configure",
    title: "Configure round",
    status: "mvp",
    description: "Pick a word pack, impostor style, and optional discussion timer.",
  },
  {
    id: "reveal",
    title: "Private reveal",
    status: "mvp",
    description: "Each player sees their secret, hides it, then passes the phone.",
  },
  {
    id: "discussion",
    title: "Discuss",
    status: "mvp",
    description: "The group talks without saying the secret word directly.",
  },
  {
    id: "vote",
    title: "Vote",
    status: "mvp",
    description: "Host records who each player suspects in the first version.",
  },
  {
    id: "results",
    title: "Results",
    status: "mvp",
    description: "Reveal the impostor, majority vote, winner, and rematch action.",
  },
  {
    id: "online-rooms",
    title: "Supabase rooms",
    status: "planned",
    description: "Add room codes, Realtime lobby sync, and synced voting later.",
  },
];
