# One of Us MVP Flow

This is the source of truth for the first playable version. The first MVP is pass-and-play on one phone, starting with Word Match. Supabase rooms come after this loop feels good.

## MVP Goal

Ship one complete social deduction loop that a group can play in person with one phone.

The MVP should answer one question: is the core reveal, discussion, vote, and result loop fun enough to repeat?

## First Playable Scope

- Game: Word Match
- Play style: Pass-and-play on one phone
- Players: 3 to 12
- Rounds: one round at a time, with rematch
- Backend: none
- Accounts: none
- Payments: none

## Core Flow

1. Choose game
   - Default selection is Word Match.
   - Picture Match, Question Match, and Mafia can be visible as upcoming modes or disabled cards until their loops are built.

2. Choose play style
   - Pass-and-play is the MVP path.
   - Every-phone room mode is shown as planned but does not block the MVP.

3. Add players
   - Host enters player names.
   - Minimum 3 players.
   - Maximum 12 players for Word Match.
   - Player order becomes reveal order.

4. Configure round
   - Choose word pack.
   - Choose impostor style:
     - Different word: one player receives a related but different word.
     - Blank: one player receives no word.
   - Optional discussion timer.

5. Private reveal
   - App shows whose turn it is.
   - Player taps and holds, or taps reveal, to see their secret.
   - Player hides the secret before passing the phone.
   - Repeat until all players have seen their secret.

6. Discussion
   - Everyone talks.
   - Timer can run if enabled.
   - No secrets are shown.

7. Vote
   - Each player votes for who they think is the impostor.
   - In the single-phone MVP, votes can be entered openly by the host.

8. Results
   - Reveal the impostor.
   - Reveal the majority vote.
   - Show whether the group won.
   - Offer rematch with same players.

## Word Match Rules

- Most players receive the same main word.
- One player is the impostor.
- In "different word" mode, the impostor receives a related word.
- In "blank" mode, the impostor receives no word and must blend in.
- Players discuss without saying the word directly.
- After discussion, everyone votes.
- Group wins if the impostor receives the most votes.
- Impostor wins if they avoid being the top vote.

## Question Match Rules

- Most players receive the same question about the friend group.
- One player is the impostor and receives a different question.
- Every player answers according to the question they saw.
- Answers are revealed to the group.
- Players discuss whose answer seems like it came from a different prompt.
- After discussion, everyone votes.
- Group wins if the impostor receives the most votes.
- Impostor wins if they avoid being the top vote.

## Later Scope

- Picture Match with local image packs.
- Question Match with prompt packs for friend groups, couples, office teams, and party nights.
- Mafia with role assignment and night/day phases.
- Supabase room creation, join codes, Realtime lobby, synced phase changes, and synced voting.
- Host controls for every-phone mode.
