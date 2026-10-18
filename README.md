# Cacao – Macau card game

A single-player [Macau](<https://en.wikipedia.org/wiki/Macau_(card_game)>) game
against a bot. It is a frontend-only Angular app: no backend, nothing is
stored, and a page reload starts a new game.

## Rules

Get rid of all your cards. On your turn play a card that matches the rank or
the suit of the top card of the discard pile, or pick one from the deck.

| Card             | Effect                                                              |
| ---------------- | ------------------------------------------------------------------- |
| 2                | Next player picks 2 cards                                           |
| 3                | Next player picks 3 cards                                           |
| 4                | Next player misses a turn                                           |
| J                | You call a rank (5–10); the next player must play it or pick a card |
| A                | You call a suit; the next player must play it or pick a card        |
| K♥ / K♠          | Next player picks 5 cards                                           |
| K♦ / K♣, Q, 5–10 | No effect                                                           |

Extras:

- **Passing it back** – a player who has to pick cards can play a penalty
  card of the same rank (2 on 2, 3 on 3, K♥/K♠ on K♥/K♠) and the penalties add
  up. A player who has to miss a turn can play another 4; the misses add up
  and are served one after the other.
- **Several cards of one rank** – after playing a card you can add the other
  cards of that rank from your hand before ending your turn. Jacks and Aces are
  always played alone, because they need a call. Penalties and misses of all
  the cards add up.
- **Macau** – when you are down to one card press _Macau!_ before the
  opponent moves, or you pick 2 cards.
- **Bot difficulty** (header): _easy_ plays the first legal card, _normal_ plays
  plain cards first, saves Jacks and Aces and attacks when you are close to
  winning, _hard_ attacks right away.

## Development

Requires Node.js 22.

```sh
npm ci
npm start          # dev server on http://localhost:4200
npm run build      # production build into dist/
npm run format     # prettier
```

### Tests

```sh
npm run test:ci                      # unit tests (Karma + Jasmine, headless Chrome)
npm test                             # same, watching, in a Chrome window
npx playwright install chromium      # once, for the end-to-end tests
npm run e2e                          # end-to-end tests (Playwright)
```

The end-to-end tests start the dev server themselves. They replace
`Math.random` with a seeded generator so that every seed deals the same
cards, and they use Angular's dev-mode debug API (`window.ng`) to shorten
hands. The scenarios and seeds are described at the top of
`e2e/macau.spec.ts`.

CI (`.github/workflows/ci.yml`) checks formatting, builds the app and runs both
test suites on every push to `master` and on pull requests.

### Code layout

- `src/app/model` – cards, ranks, suits and the game enums
- `src/app/service/game.service.ts` – the game rules: turns, effects of the
  cards, penalties, winner, Macau, restart
- `src/app/service/card.service.ts` – deck and discard pile
- `src/app/service/player` – the human player and the bot
- `src/app/components` – table, hands, draw/discard pile, status line, dialogs
- `STATUS.md` – what is implemented
