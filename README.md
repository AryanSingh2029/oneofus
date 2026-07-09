# One of Us

A mobile-first social deduction games website built with Next.js, React, TypeScript, and Tailwind CSS.

The visual system follows `DESIGN.md`: near-black canvas, charcoal lifted surfaces, compact lavender CTAs, hairline borders, restrained motion, and product-style UI panels.

## Games

- Word Match: everyone gets the same word except one player.
- Picture Match: everyone gets the same image except one player.
- Question Match: everyone answers the same question except one impostor gets a different question.
- Mafia: classic hidden-role night/day social deduction.
- GIF Match : everyone gets same gif except one 

## Planned Modes
- Every-phone room mode with Supabase Realtime.(removed it thought to keep it simple , but if you wanna do it u have to create realtime sessions (websocket) , ITS EASY)
- Single-phone pass-and-play mode.

## MVP Flow

The first playable version is documented in `docs/MVP_FLOW.md`.

Build order:

1. Word Match
2. Pass-and-play on one phone
3. Add players
4. Private reveal
5. Discussion
6. Vote
7. Results and rematch

## Setup

```bash
npm install
npm run dev
```

Supabase is intentionally only scaffolded for now. Add these values when we start the backend integration:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

# oneofus
This project is entirely out of Curiosity which i got when i played the same game , I wanted to understand how its works so i build it, hope you will like it..
