import { Card } from "../../model/Card";
import { Suit } from "../../model/Suit";
import {
	Shuffle,
	createDeck,
	shuffle as shuffleCards,
	takeStarter,
} from "../../model/deck";
import { Turn } from "../../model/enum/Turn";
import { DEFAULT_RULES, RuleOptions } from "../../model/rule-options";

/** What the player calls with a Jack (a rank) or an Ace (a suit). */
export interface Call {
	rank?: number;
	suit?: Suit;
}

/** What the player whose turn it is has to deal with. */
export type Obligation =
	| { kind: "none" }
	/** Pick this many cards, or pass the penalty on with a card of the same rank. */
	| { kind: "pick"; count: number }
	/** Miss this many turns, or pass them on with a 4. */
	| { kind: "miss"; turns: number }
	/** A Jack was played: play this rank. */
	| { kind: "rank"; rank: number }
	/** An Ace was played: play this suit. */
	| { kind: "suit"; suit: Suit };

export const NO_OBLIGATION: Obligation = { kind: "none" };

/** A Jack's call that binds both players (rule `jackBindsBoth`): first the opponent, then the owner. */
export interface Demand {
	rank: number;
	/** The player who played the Jack. */
	owner: Turn;
	/** Whose turn it is to play the rank: the opponent of the owner first, then the owner. */
	stage: "opponent" | "owner";
}

export interface PendingMiss {
	player: Turn;
	left: number;
}

/** A complete snapshot of the game. The rule functions never modify one, they return the next. */
export interface GameState {
	/** The optional rules this game is played with. */
	rules: RuleOptions;
	hands: [Card[], Card[]];
	turn: Turn;
	obligation: Obligation;
	/** A player who still has turns to miss gets them back after the other player has moved. */
	pendingMiss: PendingMiss | null;
	/** The call of a Jack that still binds the owner after the opponent has answered it. */
	demand: Demand | null;
	/** The card the player has just picked and may still play (rule `playAfterDraw`). */
	drawn: Card | null;
	/** Cards of one rank played this turn, before the turn has been ended. */
	chain: Card[];
	/** Cards to draw from; the next one is the last. */
	deck: Card[];
	/** The discard pile; its last card is the top one. */
	discard: Card[];
	winner: Turn | null;
	/** The human has one card left and still has to say "Macau". */
	macauPending: boolean;
}

export const MACAU_PENALTY = 2;

export const otherPlayer = (player: Turn): Turn =>
	player === Turn.ME ? Turn.OPPONENT : Turn.ME;

export const topOf = (state: GameState): Card =>
	state.discard[state.discard.length - 1];

/** Shuffles a new deck, starts the discard pile and deals 5 cards to each player. */
export function newGame(
	shuffle: Shuffle = shuffleCards,
	rules: RuleOptions = DEFAULT_RULES,
): GameState {
	const { starter, deck } = takeStarter(shuffle(createDeck()));
	const hands: [Card[], Card[]] = [[], []];
	for (let i = 0; i < 5; i++)
		for (const hand of hands) hand.push(deck.pop()!);
	return initialState(hands, deck, [starter], rules);
}

/** A game that starts with the human's turn and nothing to deal with. */
export function initialState(
	hands: [Card[], Card[]],
	deck: Card[],
	discard: Card[],
	rules: RuleOptions = DEFAULT_RULES,
): GameState {
	return {
		rules,
		hands,
		turn: Turn.ME,
		obligation: NO_OBLIGATION,
		pendingMiss: null,
		demand: null,
		drawn: null,
		chain: [],
		deck,
		discard,
		winner: null,
		macauPending: false,
	};
}
