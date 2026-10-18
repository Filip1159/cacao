import { GameService, SHUFFLE } from "../service/game.service";
import { GameState, initialState } from "../service/rules";
import { Card } from "../model/Card";
import { Shuffle } from "../model/deck";
import { Rank } from "../model/Rank";
import { Suit } from "../model/Suit";
import { Turn } from "../model/enum/Turn";

export const card = (rank: number, suit: Suit): Card => ({
	rank: new Rank(rank),
	suit,
});

/** Keeps the order, so a new game always deals the same cards (K♣ starts the discard pile). */
export const keepOrder: Shuffle = (items) => [...items];

/** Providers that make `GameService` deal an unshuffled deck. */
export const unshuffled = () => [{ provide: SHUFFLE, useValue: keepOrder }];

/**
 * A game state for rule tests: both hands are empty, the deck holds twenty
 * 6♦ and the 9♣ is on the discard pile (or `top`).
 */
export const makeState = ({
	top,
	...changes
}: Partial<GameState> & { top?: Card } = {}): GameState => ({
	...initialState(
		[[], []],
		Array.from({ length: 20 }, () => card(6, Suit.DIAMS)),
		[top ?? card(9, Suit.CLUBS)],
	),
	...changes,
});

/** Gives the players of a running game specific hands. */
export const setHands = (
	game: GameService,
	hands: { me?: Card[]; opponent?: Card[] },
) => {
	const current = game.state().hands;
	game.patch({
		hands: [
			hands.me ?? current[Turn.ME],
			hands.opponent ?? current[Turn.OPPONENT],
		],
	});
};

/** Replaces the discard pile of a running game with a single card. */
export const setTop = (game: GameService, top: Card) =>
	game.patch({ discard: [top] });
