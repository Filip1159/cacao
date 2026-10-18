# Macau (Cacao) – Implementation Status

Scope: a **frontend-only, single-player-vs-bot** Macau game (Angular 21, standalone components). Multiplayer, history, accounts etc. are explicitly out of scope.

Rules assumed by the current code (and used as the target):

| Card | Effect |
|------|--------|
| 2 | Next player picks 2 cards |
| 3 | Next player picks 3 cards |
| 4 | Next player misses a turn |
| J | Player calls a rank (5–10); next player must play that rank or pick 1 card |
| K♥ / K♠ | Next player picks 5 cards |
| K♦ / K♣ | No effect |
| A | Player calls a suit *(not implemented)* |
| Q and 5–10 | No effect |

A card is playable if it matches the rank or suit of the top of the discard pile.

---

## 1. Already implemented

### Game model & services
- [x] Card, Rank, Suit models (`src/app/model`), 52-card deck creation and shuffling (`CardService`)
- [x] Dealing 5 cards to each player; starting discard card is always a "basic" (non-special) card
- [x] Turn management between human and bot (`GameService.turn`, `switchTurn`)
- [x] Per-player state machine: `WAITING_FOR_CARD`, `CARD_PICKING`, `CARD_CALLED`, `MISSING`
- [x] Legal-move check (rank/suit match, blocked while picking/missing, rank restriction after a Jack)
- [x] Effects of 2, 3, 4, J and K (see bugs below for K) applied to the next player
- [x] Bot plays the first legal card, otherwise draws one; bot acts after a 1 s delay
- [x] Bot handles being in `MISSING` and `CARD_PICKING` states (skips / draws the penalty cards)

### UI
- [x] Table layout: opponent hand (face down), discard pile, player hand
- [x] Card component (rank, suit, red/black colouring), disabled styling for unplayable cards
- [x] Click-to-play for the human; illegal cards disabled and ignored
- [x] "Pick card" button and "Miss turn" button (enabled only when the 4 effect applies)
- [x] Modal to choose the rank to call after playing a Jack
- [x] Opponent/player state shown as text

### Tests
- [x] A small `GameService` spec (initial deal, starting card, deck size, a few legal moves) in `src/app/test/game.service.spec.ts`

---

## 2. Bugs in the existing implementation (fix first)

1. **All kings pick 5.** `GameService.switchState` applies +5 to every King, but `CardService.isSpecialCard` (and the rules table) treat K♦/K♣ as plain cards. Check the suit.
2. **Human penalty draw is wrong.** `PlayerComponent.pickCardFromStack` draws exactly 1 card even when the player is in `CARD_PICKING` – the player should receive `cardsToPick` cards (or the human should reuse `Player.makeAction()`).
3. **Bot crash/misplay after a Jack.** In `Player.makeAction` the `CARD_CALLED` branch calls `removeCard(this.chosenMove)` instead of `removeCard(calledCardIndex)`; `chosenMove` is stale (or `-1`, which removes the *last* card).
4. **Bot never calls a rank when it plays a Jack.** `BotPlayer.playCard` calls `afterCardPlayed(card)` with no `cardCalled`, so `cardCalled` becomes `undefined` and the human cannot play anything.
5. **Rank modal can't select 5.** `CardCalledModal` emits only on `change`, but 5 is the pre-selected option, so choosing it does nothing.
6. **Rank comparison by reference.** `isLegalMove` uses `card.rank === top.rank` (object identity); it works only because ranks are shared instances in `createFullDeck`. Compare `rank.value`.
7. **Empty deck is unhandled.** `pickCardFromTop` returns `undefined` when the deck runs out (will crash UI / push `undefined` into a hand).
8. **Jack/state leakage.** Rank restriction (`CARD_CALLED`) only checks rank, not that the played card is otherwise allowed – confirm this is the intended rule and add tests.
9. Duplicate `getBestMove()` call in `BotPlayer.playCard` (cosmetic, but could differ if made non-deterministic later).

---

## 3. To do (needed for a complete player-vs-bot game)

### Core rules
- [x] **Win/lose condition**: game ends when a player's hand is empty (`GameService.winner` signal, checked after every play)
- [x] **Ace**: playing an Ace lets the player call a suit; next player must follow that suit (`SUIT_CALLED` state, `suitCalled` in `GameService`, suit-picker modal, called rank/suit shown under the discard pile)
- [x] **Counter-playing penalty cards**: while in `CARD_PICKING` a penalty card of the same rank (2, 3, K♥/K♠) can be played to pass the stacked penalty on (`penaltyOf` in `Card.ts`; pending count shown under the discard pile)
- [x] **Counter a 4** with another 4: a player who has to miss a turn can play a 4 on the 4 to pass the miss on; misses stack and are served in a row (`turnsToMiss` in `GameService`, shown under the discard pile)
- [x] **Reshuffle**: when the draw deck is empty, shuffle the discard pile (except top card) back into the deck
- [x] Prevent drawing more than the cards available (edge case when both deck and discard are exhausted)
- [x] Starting card handling: ensure starting card is never 2/3/4/J/Q/A/K♥/K♠ (currently excludes ≥ J, which matches)

### Bot
- [x] Choose the rank to call when playing a Jack (e.g. most-frequent rank in its hand, or random 5–10)
- [x] Choose the suit to call when playing an Ace (suit it holds most of)
- [ ] Basic strategy instead of "first legal card" (e.g. prefer attack cards when the human has few cards, save Jacks/Aces) – optional but cheap to add
- [x] Bot defends against penalty cards by countering when it can

### UI / UX
- [x] Game-over screen (win/lose message) and **New game** button (`GameService.restart()`, button in the header and in the game-over dialog)
- [x] Visible draw pile (face-down card with remaining count) – clicking it picks a card (`app-draw-pile`)
- [x] Show active effect on the table: called rank/suit, cards to pick and turns to miss under the discard pile, plus a status line ("You miss a turn", "Opponent called ♥ …")
- [x] Clear indication of whose turn it is: status line and highlighted hand label; controls are disabled on the bot's turn
- [x] Replace debug text (`WAITING_FOR_CARD` etc.) with friendly messages (`app-status`)
- [x] Remove placeholder content: header is now "Macau" with Rules / New game buttons, the "Lorem ipsum" nav is gone
- [x] Show opponent's card count ("Opponent · 5 cards")
- [ ] Basic animation for card play/draw (optional)
- [x] Responsive layout: hands wrap, cards shrink under 600 px; e2e check at 375 px
- [x] Rules/help dialog summarising card effects (`app-rules-modal`)

### Quality
- [ ] Remove `console.log` debugging from services and components
- [ ] Unit tests: each special card effect, state transitions, bot behaviour, win detection, deck reshuffle, Jack/Ace calls
- [ ] Component tests for hand rendering, disabled cards, modals
- [ ] Update `README.md` (still the Angular CLI boilerplate, mentions Angular 13) with game rules and run instructions
- [ ] Clean up `GameService` flow: `afterCardPlayed` does switch → reset → apply-state in one place; consider moving "pick penalty cards" logic into `GameService` so human and bot share it

### Optional (nice to have, still single-player)
- [ ] Playing multiple cards of the same rank in one turn
- [ ] "Macau" call when one card remains (with a draw penalty if forgotten)
- [ ] Difficulty levels for the bot
- [ ] Persist nothing – keep state in memory only (no backend)

---

## 4. Suggested order of work

1. Fix bugs 1–7 above (small, high value; add a test for each)
2. Win/lose detection + restart button
3. Deck reshuffle
4. Bot calls for Jack (and Ace once added) + Ace rule
5. Penalty counter-play (if desired)
6. UI polish: draw pile, effect indicators, remove placeholders/debug output
7. Test coverage and README
