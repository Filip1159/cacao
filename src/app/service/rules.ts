import { Card, penaltyOf } from "../model/Card";
import { RANK_FOUR, RankCharacter } from "../model/Rank";
import { Suit } from "../model/Suit";
import {
	Shuffle,
	createDeck,
	shuffle as shuffleCards,
	takeStarter,
} from "../model/deck";
import { Turn } from "../model/enum/Turn";

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

export interface PendingMiss {
	player: Turn;
	left: number;
}

/** A complete snapshot of the game. The rule functions never modify one, they return the next. */
export interface GameState {
	hands: [Card[], Card[]];
	turn: Turn;
	obligation: Obligation;
	/** A player who still has turns to miss gets them back after the other player has moved. */
	pendingMiss: PendingMiss | null;
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
export function newGame(shuffle: Shuffle = shuffleCards): GameState {
	const { starter, deck } = takeStarter(shuffle(createDeck()));
	const hands: [Card[], Card[]] = [[], []];
	for (let i = 0; i < 5; i++)
		for (const hand of hands) hand.push(deck.pop()!);
	return initialState(hands, deck, [starter]);
}

/** A game that starts with the human's turn and nothing to deal with. */
export function initialState(
	hands: [Card[], Card[]],
	deck: Card[],
	discard: Card[],
): GameState {
	return {
		hands,
		turn: Turn.ME,
		obligation: NO_OBLIGATION,
		pendingMiss: null,
		chain: [],
		deck,
		discard,
		winner: null,
		macauPending: false,
	};
}

// --- legal moves ---

/** Whether the player whose turn it is may play the card now. */
export function isLegalMove(state: GameState, card: Card): boolean {
	if (state.winner !== null) return false;
	if (state.chain.length > 0)
		return card.rank.value === state.chain[0].rank.value;
	const top = topOf(state);
	const { obligation } = state;
	switch (obligation.kind) {
		case "pick":
			// a penalty card of the same rank passes (and adds to) the penalty
			return penaltyOf(card) > 0 && card.rank.value === top.rank.value;
		case "rank":
			return obligation.rank === card.rank.value;
		case "suit":
			return obligation.suit === card.suit;
		case "miss":
			// a 4 passes the miss on to the other player
			return (
				card.rank.value === RANK_FOUR && top.rank.value === RANK_FOUR
			);
		case "none":
			return card.rank.value === top.rank.value || card.suit === top.suit;
	}
}

/** Whether the player whose turn it is has any card to play. */
export function hasCounter(state: GameState): boolean {
	return state.hands[state.turn].some((card) => isLegalMove(state, card));
}

/** Whether the current player can add another card of the same rank this turn. */
export function canChain(state: GameState): boolean {
	if (state.chain.length === 0) return false;
	const rank = state.chain[0].rank.value;
	// Jacks and Aces need a call, so they are always played alone
	if (rank === RankCharacter.Jack || rank === RankCharacter.Ace) return false;
	return state.hands[state.turn].some((card) => card.rank.value === rank);
}

// --- moves ---

/**
 * Puts a card from the current player's hand on the discard pile. Cards of
 * the same rank can be added until the turn is ended; for the last one the
 * turn ends automatically.
 */
export function playCard(
	state: GameState,
	index: number,
	call: Call = {},
): GameState {
	if (state.winner !== null) return state;
	const hand = [...state.hands[state.turn]];
	const [card] = hand.splice(index, 1);
	const next: GameState = {
		...state,
		hands: withHand(state, state.turn, hand),
		chain: [...state.chain, card],
		discard: [...state.discard, card],
	};
	return canChain(next) ? next : endChain(next, call);
}

/** Ends the turn after the cards played so far. */
export function endChain(state: GameState, call: Call = {}): GameState {
	return finishTurn({ ...state, chain: [] }, state.chain, call);
}

/** The current player draws the pending penalty cards, or a single card, and the turn ends. */
export function pickCards(
	state: GameState,
	shuffle: Shuffle = shuffleCards,
): GameState {
	if (state.winner !== null) return state;
	const count = state.obligation.kind === "pick" ? state.obligation.count : 1;
	return finishTurn(drawTo(state, state.turn, count, shuffle), [], {});
}

/** The current player serves a turn to miss. */
export function missTurn(state: GameState): GameState {
	if (state.winner !== null) return state;
	return finishTurn(state, [], {});
}

/** The human forgot to say "Macau" and picks the penalty cards. */
export function punishMissingMacau(
	state: GameState,
	shuffle: Shuffle = shuffleCards,
): GameState {
	if (!state.macauPending) return state;
	return {
		...drawTo(state, Turn.ME, MACAU_PENALTY, shuffle),
		macauPending: false,
	};
}

export function callMacau(state: GameState): GameState {
	return { ...state, macauPending: false };
}

// --- ending a turn ---

/** What a player had pending before their turn ended and hands over to the next one. */
interface CarriedOver {
	cardsToPick: number;
	turnsToMiss: number;
	pendingMiss: PendingMiss | null;
}

function finishTurn(state: GameState, cards: Card[], call: Call): GameState {
	const current = state.turn;
	if (state.hands[current].length === 0) return { ...state, winner: current };
	const carried = collectCarriedOver(state, cards);
	const macauPending =
		current === Turn.ME
			? cards.length > 0 && state.hands[current].length === 1
			: state.macauPending;
	// the player whose turn it is now starts with a clean slate
	const next: GameState = {
		...state,
		turn: otherPlayer(current),
		obligation: NO_OBLIGATION,
		macauPending,
	};
	return applyCarriedOver(applyCards(next, cards, call), carried);
}

function collectCarriedOver(state: GameState, cards: Card[]): CarriedOver {
	const { obligation } = state;
	const passesOnMiss =
		cards.some((card) => card.rank.value === RANK_FOUR) &&
		obligation.kind === "miss";
	return {
		// a countered penalty adds up
		cardsToPick:
			cards.length > 0 && obligation.kind === "pick"
				? obligation.count
				: 0,
		turnsToMiss:
			passesOnMiss && obligation.kind === "miss" ? obligation.turns : 0,
		// a player who still has turns to miss gets them back after the
		// other player has moved
		pendingMiss:
			cards.length === 0 &&
			obligation.kind === "miss" &&
			obligation.turns > 1
				? { player: state.turn, left: obligation.turns - 1 }
				: null,
	};
}

/** Applies the effect of the cards just played to the player whose turn it is now. */
function applyCards(state: GameState, cards: Card[], call: Call): GameState {
	if (cards.length === 0) return state;
	const penalty = cards.reduce((sum, card) => sum + penaltyOf(card), 0);
	const fours = cards.filter((card) => card.rank.value === RANK_FOUR).length;
	const last = cards[cards.length - 1];
	if (penalty > 0)
		return withObligation(state, { kind: "pick", count: penalty });
	if (fours > 0) return withObligation(state, { kind: "miss", turns: fours });
	if (last.rank.value === RankCharacter.Jack)
		return withObligation(state, { kind: "rank", rank: call.rank! });
	if (last.rank.value === RankCharacter.Ace)
		return withObligation(state, { kind: "suit", suit: call.suit! });
	return state;
}

function applyCarriedOver(state: GameState, carried: CarriedOver): GameState {
	let { obligation, pendingMiss } = state;
	if (obligation.kind === "pick")
		obligation = {
			kind: "pick",
			count: obligation.count + carried.cardsToPick,
		};
	else if (obligation.kind === "miss")
		obligation = {
			kind: "miss",
			turns: obligation.turns + carried.turnsToMiss,
		};
	if (pendingMiss?.player === state.turn) {
		if (obligation.kind === "none")
			obligation = { kind: "miss", turns: pendingMiss.left };
		pendingMiss = null;
	}
	return {
		...state,
		obligation,
		pendingMiss: carried.pendingMiss ?? pendingMiss,
	};
}

// --- helpers ---

function withObligation(state: GameState, obligation: Obligation): GameState {
	return { ...state, obligation };
}

function withHand(
	state: GameState,
	player: Turn,
	hand: Card[],
): [Card[], Card[]] {
	const hands: [Card[], Card[]] = [state.hands[0], state.hands[1]];
	hands[player] = hand;
	return hands;
}

/**
 * Gives the player cards from the deck. When the deck runs out, the discard
 * pile (except its top card) is shuffled into a new one; with nothing left
 * to draw the player simply gets fewer cards.
 */
function drawTo(
	state: GameState,
	player: Turn,
	count: number,
	shuffle: Shuffle,
): GameState {
	let deck = [...state.deck];
	let discard = state.discard;
	const hand = [...state.hands[player]];
	for (let i = 0; i < count; i++) {
		if (deck.length === 0 && discard.length > 1) {
			deck = shuffle(discard.slice(0, -1));
			discard = [discard[discard.length - 1]];
		}
		const card = deck.pop();
		if (card) hand.push(card);
	}
	return { ...state, hands: withHand(state, player, hand), deck, discard };
}
