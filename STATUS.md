# Macau (Cacao) – Implementation Status

Scope: a **frontend-only, single-player-vs-bot** Macau game (Angular 21, standalone components). Multiplayer, history, accounts etc. are explicitly out of scope. The rules are described in `README.md`.

Everything planned for a simple player-vs-bot game is implemented. The checklists below record what exists and where.

## Game rules

- [x] Deck, shuffling, dealing 5 cards each, a plain card to start the discard pile (`model/deck.ts`, `newGame` in `rules.ts`)
- [x] Turns, what the player on turn has to deal with (`Obligation`: none, pick, miss, called rank, called suit) and legal-move check (`rules.ts`)
- [x] 2, 3, K♥/K♠ (pick 2/3/5 cards; `penaltyOf` in `Card.ts`), 4 (miss a turn), J (call a rank), A (call a suit)
- [x] Passing penalties back with a card of the same rank; penalties stack
- [x] Passing a 4 back; misses stack and are served in a row (`turnsToMiss`, `pendingMiss`)
- [x] Several cards of one rank in a turn (`chain`, `stageCard`, `endChain`); Jacks and Aces are played alone
- [x] Macau call when one card is left, penalty of 2 cards (`macauPending`)
- [x] Win/lose detection (`winner`) and restart (`restart()`)
- [x] Reshuffle of the discard pile when the deck runs out; nothing happens when no cards are left at all

## Bot

- [x] Plays legal cards, draws or misses a turn as needed, counters penalties and misses
- [x] Calls the rank / suit it holds most of
- [x] Difficulty levels: easy (first legal card, random calls, one card at a time), normal (plain cards first, saves Jacks/Aces, attacks when the human has ≤ 3 cards), hard (attacks right away) – `bot.ts`
- [x] Plays all its cards of a rank in one turn (not on easy)

## UI

- [x] Table: opponent hand (face down, card count, "Macau!"), draw pile with deck size, discard pile with active effects (cards to pick, turns to miss, called rank/suit), human hand
- [x] Status line explaining what to do, highlighted active hand, disabled controls on the bot's turn
- [x] Buttons: Pick card (or click the deck), Miss turn, End turn, Macau!, New game, Rules; bot difficulty select
- [x] Dialogs: rank picker, suit picker, game over, rules
- [x] Responsive layout (cards shrink under 600 px), card deal animation (disabled with `prefers-reduced-motion`)

## Quality

- [x] No debug logging
- [x] Unit tests (Karma/Jasmine): game rules, bot behaviour, components (`src/app/test`)
- [x] End-to-end tests (Playwright, seeded shuffle): `e2e/macau.spec.ts`
- [x] CI: formatting, production build, unit and e2e tests (`.github/workflows/ci.yml`)
- [x] README with rules and run instructions
- [x] Rules are pure functions over an immutable `GameState` (`rules.ts`), the bot's strategy is pure too (`bot.ts`); the deck and discard pile are part of the `GameState` too, so there is one source of truth; `GameService` is a thin signal store, so every view refreshes without zone.js workarounds
- [x] No persistence – the game lives in memory only

## Possible next steps

- Let the human catch the bot when it forgets to say Macau (the bot always says it).
- Hot-seat or networked play, game history and similar features are out of scope.
