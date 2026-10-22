import { GameService, SHUFFLE } from "../service/game.service";
import { GameState, initialState } from "../service/rules";
import { Card } from "../model/Card";
import { Shuffle } from "../model/deck";
import { Rank } from "../model/Rank";
import { Suit } from "../model/Suit";
import { Turn } from "../model/enum/Turn";
import { DEFAULT_RULES, RuleId, RuleOptions } from "../model/rule-options";

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

/** The default rules with these optional rules switched on. */
export const withRules = (...ids: RuleId[]): RuleOptions => ({
	...DEFAULT_RULES,
	...Object.fromEntries(ids.map((id) => [id, true])),
});

/** The hands of both players, the human's first. */
export const hands = (me: Card[], opponent: Card[] = []): [Card[], Card[]] => [
	me,
	opponent,
];

/** The bot's turn, with the given cards in its hand and some (default 5) in the human's. */
export const botTurn = (
	botHand: Card[],
	top: Card,
	changes: Partial<GameState> = {},
	humanCards = 5,
): GameState =>
	makeState({
		turn: Turn.OPPONENT,
		top,
		hands: [
			Array.from({ length: humanCards }, () => card(9, Suit.HEARTS)),
			botHand,
		],
		...changes,
	});
