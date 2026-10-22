import { Turn } from "../../model/enum/Turn";
import { Shuffle, shuffle as shuffleCards } from "../../model/deck";
import { Card } from "../../model/Card";
import { canChain, isLegalMove } from "./legal";
import { Call, GameState, MACAU_PENALTY } from "./state";
import { finishTurn } from "./turn";

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
		drawn: null,
		chain: [...state.chain, card],
		discard: [...state.discard, card],
	};
	return canChain(next) ? next : endChain(next, call);
}

/** Ends the turn after the cards played so far. */
export function endChain(state: GameState, call: Call = {}): GameState {
	return finishTurn({ ...state, chain: [] }, state.chain, call);
}

/**
 * The current player draws the pending penalty cards, or a single card, and
 * the turn ends. With `playAfterDraw` a single card that can be played is
 * kept open for the player to play it, or to end the turn with `keepDrawn`.
 */
export function pickCards(
	state: GameState,
	shuffle: Shuffle = shuffleCards,
): GameState {
	if (state.winner !== null || state.drawn) return state;
	const penalty = state.obligation.kind === "pick";
	const count = state.obligation.kind === "pick" ? state.obligation.count : 1;
	const drawn = drawTo(state, state.turn, count, shuffle);
	if (state.rules.playAfterDraw && !penalty) {
		const hand = drawn.hands[state.turn];
		const card = hand[hand.length - 1];
		if (hand.length > state.hands[state.turn].length && card) {
			const open = { ...drawn, drawn: card };
			if (isLegalMove(open, card)) return open;
		}
	}
	return finishTurn(drawn, [], {});
}

/** The current player keeps the card just picked and the turn ends. */
export function keepDrawn(state: GameState): GameState {
	if (state.winner !== null || !state.drawn) return state;
	return finishTurn({ ...state, drawn: null }, [], {});
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

// --- helpers ---

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
